package services

import (
	"fmt"
	"log"
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
	width := 200
	height := 200
	x := 0
	y := 0
	pinned := false

	if note.WindowState != nil {
		width = note.WindowState.Width
		height = note.WindowState.Height
		x = note.WindowState.X
		y = note.WindowState.Y
		pinned = note.WindowState.Pinned
	}

	w := s.app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:           note.Title,
		Width:           width,
		Height:          height,
		InitialPosition: application.WindowXY,
		X:               x,
		Y:               y,
		AlwaysOnTop:     pinned,
		Frameless:       true,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/note/" + strconv.FormatUint(uint64(note.ID), 10),
	})

	s.mu.Lock()
	s.windowsByNote[note.ID] = w
	s.noteByWindow[w] = note.ID
	if note.WindowState != nil {
		s.stateByNote[note.ID] = note.WindowState
	} else {
		s.stateByNote[note.ID] = &models.WindowState{}
	}
	s.mu.Unlock()

	w.OnWindowEvent(events.Common.WindowDidMove, func(event *application.WindowEvent) {
		s.scheduleWindowStatePersist(note.ID, w)
	})

	w.OnWindowEvent(events.Common.WindowDidResize, func(event *application.WindowEvent) {
		s.scheduleWindowStatePersist(note.ID, w)
	})

	w.OnWindowEvent(events.Common.WindowClosing, func(event *application.WindowEvent) {
		s.unregisterNoteWindow(note.ID)
	})

	return w
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

	switch action {
	case "close":
		w.Close()
		return nil
	case "pin":
		ws.Pinned = !ws.Pinned
		w.SetAlwaysOnTop(ws.Pinned)
		if err := s.noteRepository.UpdateWindowState(noteID, ws); err != nil {
			return err
		}
		return nil
	default:
		return fmt.Errorf("unsupported action %q", action)
	}
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
