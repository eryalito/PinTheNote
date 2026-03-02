package services

import (
	"fmt"
	"log"
	"runtime"
	"strconv"
	"sync"
	"time"

	"github.com/eryalito/pinthenote/internal/models"
	"github.com/eryalito/pinthenote/internal/repository"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

type WindowService struct {
	app            *application.App
	mu             sync.RWMutex
	windowsByNote  map[uint]*application.WebviewWindow
	noteByWindow   map[*application.WebviewWindow]uint
	stateByNote    map[uint]*models.WindowState
	persistTimers  map[uint]*time.Timer
	noteRepository *repository.NoteRepository
}

func NewWindowService(app *application.App, noteRepository *repository.NoteRepository) *WindowService {
	return &WindowService{
		app:            app,
		noteRepository: noteRepository,
		windowsByNote:  make(map[uint]*application.WebviewWindow),
		noteByWindow:   make(map[*application.WebviewWindow]uint),
		stateByNote:    make(map[uint]*models.WindowState),
		persistTimers:  make(map[uint]*time.Timer),
	}
}

func (s *WindowService) CreateWindowForNote(note models.Note) *application.WebviewWindow {
	s.mu.RLock()
	existingWindow, exists := s.windowsByNote[note.ID]
	s.mu.RUnlock()
	if exists && existingWindow != nil {
		if err := s.setNoteVisibility(note.ID, true); err != nil {
			log.Println("failed to set note visible:", err)
		}
		return existingWindow
	}

	width := 325
	height := 200
	x := 0
	y := 0
	pinned := false
	hexColor := "#ffffff"
	if note.Color != "" {
		hexColor = note.Color
	}
	r, g, b := hexToRGB(hexColor)

	if note.WindowState != nil {
		width = note.WindowState.Width
		height = note.WindowState.Height
		x = note.WindowState.X
		y = note.WindowState.Y
		pinned = note.WindowState.Pinned
	}

	x, y, width, height = s.normaliseWindowBounds(x, y, width, height)

	// On Linux, frameless windows don't support --wails-resize CSS property properly
	// So we use native window decorations for proper resize functionality
	isFrameless := runtime.GOOS != "linux"

	w := s.app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:              note.Title,
		Width:              width,
		Height:             height,
		InitialPosition:    application.WindowXY,
		X:                  x,
		Y:                  y,
		AlwaysOnTop:        pinned,
		Frameless:          isFrameless,
		MinWidth:           325,
		MinHeight:          200,
		ZoomControlEnabled: false,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		Linux:            application.LinuxWindow{},
		BackgroundColour: application.NewRGB(r, g, b),
		URL:              "/#/note/" + strconv.FormatUint(uint64(note.ID), 10),
	})

	// Register event handlers immediately after window creation
	// NOTE: On Linux (Wails v3.0.0-alpha.74), WindowDidMove events don't fire due to a bug
	// where window.Bounds() doesn't update X/Y coordinates when the window is moved.
	// Window positions won't be persisted when moved until this is fixed upstream.
	w.OnWindowEvent(events.Common.WindowDidMove, func(event *application.WindowEvent) {
		s.scheduleWindowStatePersist(note.ID, w)
	})

	w.OnWindowEvent(events.Common.WindowDidResize, func(event *application.WindowEvent) {
		s.scheduleWindowStatePersist(note.ID, w)
	})

	w.OnWindowEvent(events.Common.WindowClosing, func(event *application.WindowEvent) {
		s.handleWindowClosing(note.ID)
	})

	s.mu.Lock()
	s.windowsByNote[note.ID] = w
	s.noteByWindow[w] = note.ID
	if note.WindowState == nil {
		note.WindowState = &models.WindowState{}
	}
	note.WindowState.Visible = true
	if note.WindowState != nil {
		s.stateByNote[note.ID] = note.WindowState
	} else {
		s.stateByNote[note.ID] = &models.WindowState{}
	}
	s.mu.Unlock()

	if err := s.setNoteVisibility(note.ID, true); err != nil {
		log.Println("failed to persist note visibility:", err)
	}

	return w
}

func (s *WindowService) normaliseWindowBounds(x, y, width, height int) (int, int, int, int) {
	primary := s.app.Screen.GetPrimary()
	if primary == nil {
		return x, y, width, height
	}

	bounds := primary.Bounds
	maxWidth := bounds.Width
	maxHeight := bounds.Height

	if maxWidth <= 0 {
		maxWidth = primary.WorkArea.Width
	}
	if maxHeight <= 0 {
		maxHeight = primary.WorkArea.Height
	}

	if maxWidth <= 0 || maxHeight <= 0 {
		return x, y, width, height
	}

	isOutOfScreen := width <= 0 ||
		height <= 0 ||
		x < bounds.X ||
		y < bounds.Y ||
		x+width > bounds.X+bounds.Width ||
		y+height > bounds.Y+bounds.Height

	if isOutOfScreen {
		return 0, 0, maxWidth, maxHeight
	}

	return x, y, width, height
}

func (s *WindowService) RegisterEventHandlers() {
	s.app.Event.On("note:window-action", func(event *application.CustomEvent) {
		action, noteID, err := parseWindowActionEventData(event.Data)
		if err != nil {
			log.Println("invalid note:window-action payload:", err)
			return
		}

		if err := s.HandleWindowAction(action, noteID); err != nil {
			log.Println("failed to handle note window action:", err)
		}
	})
}

func (s *WindowService) HandleWindowAction(action string, noteID uint) error {
	switch action {
	case "show":
		note, err := s.noteRepository.GetByIDWithWindowState(noteID)
		if err != nil {
			return err
		}
		s.CreateWindowForNote(*note)
		return nil
	case "close":
		s.mu.RLock()
		w, ok := s.windowsByNote[noteID]
		s.mu.RUnlock()
		if !ok || w == nil {
			return s.setNoteVisibility(noteID, false)
		}
		w.Close()
		return nil
	case "pin":
		s.mu.Lock()
		w, ok := s.windowsByNote[noteID]
		if !ok || w == nil {
			s.mu.Unlock()
			return fmt.Errorf("window not found for note %d", noteID)
		}

		ws, ok := s.stateByNote[noteID]
		if !ok || ws == nil {
			ws = &models.WindowState{}
			s.stateByNote[noteID] = ws
		}
		s.mu.Unlock()

		ws.Pinned = !ws.Pinned
		w.SetAlwaysOnTop(ws.Pinned)
		if err := s.noteRepository.UpdateWindowState(noteID, ws); err != nil {
			return err
		}
		s.emitPinChanged(noteID, ws.Pinned)
		return nil
	default:
		return fmt.Errorf("unsupported action %q", action)
	}
}

func (s *WindowService) handleWindowClosing(noteID uint) {
	if err := s.setNoteVisibility(noteID, false); err != nil {
		log.Println("failed to set note invisible on close:", err)
	}
	s.unregisterNoteWindow(noteID)
}

func (s *WindowService) setNoteVisibility(noteID uint, visible bool) error {
	s.mu.Lock()
	ws, ok := s.stateByNote[noteID]
	if !ok || ws == nil {
		ws = &models.WindowState{}
		s.stateByNote[noteID] = ws
	}
	ws.Visible = visible
	stateCopy := *ws
	s.mu.Unlock()

	if err := s.noteRepository.UpdateWindowState(noteID, &stateCopy); err != nil {
		return err
	}

	s.emitVisibilityChanged(noteID, visible)
	return nil
}

func (s *WindowService) emitVisibilityChanged(noteID uint, visible bool) {
	s.app.Event.Emit("note:visibility-changed", map[string]any{
		"noteId":  noteID,
		"visible": visible,
	})
}

func (s *WindowService) emitPinChanged(noteID uint, pinned bool) {
	s.app.Event.Emit("note:pin-changed", map[string]any{
		"noteId": noteID,
		"pinned": pinned,
	})
}

func (s *WindowService) GetWindowByNoteID(noteID uint) (*application.WebviewWindow, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	w, ok := s.windowsByNote[noteID]
	return w, ok
}

func (s *WindowService) GetNoteIDByWindow(window *application.WebviewWindow) (uint, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	noteID, ok := s.noteByWindow[window]
	return noteID, ok
}

func (s *WindowService) scheduleWindowStatePersist(noteID uint, w *application.WebviewWindow) {
	const persistDebounce = 300 * time.Millisecond

	s.mu.Lock()
	if timer, ok := s.persistTimers[noteID]; ok {
		timer.Stop()
	}

	s.persistTimers[noteID] = time.AfterFunc(persistDebounce, func() {
		bounds := w.Bounds()

		s.mu.Lock()
		ws, ok := s.stateByNote[noteID]
		if !ok || ws == nil {
			ws = &models.WindowState{}
			s.stateByNote[noteID] = ws
		}
		ws.X = bounds.X
		ws.Y = bounds.Y
		ws.Width = bounds.Width
		ws.Height = bounds.Height
		delete(s.persistTimers, noteID)
		s.mu.Unlock()

		if err := s.noteRepository.UpdateWindowState(noteID, ws); err != nil {
			log.Println("failed to update window state:", err)
		}
	})
	s.mu.Unlock()
}

func (s *WindowService) unregisterNoteWindow(noteID uint) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if timer, ok := s.persistTimers[noteID]; ok {
		timer.Stop()
		delete(s.persistTimers, noteID)
	}

	if w, ok := s.windowsByNote[noteID]; ok {
		delete(s.noteByWindow, w)
	}

	delete(s.windowsByNote, noteID)
	delete(s.stateByNote, noteID)
}

func parseWindowActionEventData(data any) (action string, noteID uint, err error) {
	payload, ok := data.(map[string]any)
	if !ok {
		return "", 0, fmt.Errorf("unexpected payload type %T", data)
	}

	actionValue, ok := payload["action"].(string)
	if !ok || actionValue == "" {
		return "", 0, fmt.Errorf("missing or invalid action")
	}

	noteIDRaw, exists := payload["noteId"]
	if !exists {
		return "", 0, fmt.Errorf("missing noteId")
	}

	noteIDValue, ok := noteIDRaw.(float64)
	if !ok || noteIDValue < 0 {
		return "", 0, fmt.Errorf("invalid noteId")
	}

	return actionValue, uint(noteIDValue), nil
}

func hexToRGB(hex string) (r, g, b uint8) {
	if len(hex) != 7 || hex[0] != '#' {
		return 255, 255, 255
	}
	rVal, err := strconv.ParseInt(hex[1:3], 16, 0)
	if err != nil {
		return 255, 255, 255
	}
	gVal, err := strconv.ParseInt(hex[3:5], 16, 0)
	if err != nil {
		return 255, 255, 255
	}
	bVal, err := strconv.ParseInt(hex[5:7], 16, 0)
	if err != nil {
		return 255, 255, 255
	}
	return uint8(rVal), uint8(gVal), uint8(bVal)
}
