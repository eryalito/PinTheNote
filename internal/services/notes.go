package services

import (
	"github.com/eryalito/pinthenote/internal/models"
	"github.com/eryalito/pinthenote/internal/repository"
)

type NotesService struct {
	NotesRepository    *repository.NoteRepository
	CategoryRepository *repository.CategoryRepository
	WindowService      *WindowService
}

func (s *NotesService) CreateNote(title, content string) error {
	note := &models.Note{
		Title:   title,
		Content: content,
		WindowState: &models.WindowState{
			Width:  0,
			Height: 0,
			X:      0,
			Y:      0,
		},
	}

	if err := s.NotesRepository.CreateWithDeps(note); err != nil {
		return err
	}

	if s.WindowService != nil {
		s.WindowService.CreateWindowForNote(*note)
	}

	return nil
}

func (s *NotesService) CreateNoteInCategory(categoryID uint, color string) (*models.Note, error) {
	note := &models.Note{
		Title:      "New note",
		Content:    "",
		CategoryID: &categoryID,
		Color:      color,
		WindowState: &models.WindowState{
			Width:  200,
			Height: 200,
			X:      0,
			Y:      0,
		},
	}

	if err := s.NotesRepository.CreateWithDeps(note); err != nil {
		return nil, err
	}

	if s.WindowService != nil {
		s.WindowService.CreateWindowForNote(*note)
	}

	return note, nil
}

func (s *NotesService) UpdateNote(note *models.Note) error {
	return s.NotesRepository.Update(note)
}

func (s *NotesService) RetrieveNote(id uint) (*models.Note, error) {
	return s.NotesRepository.GetByIDWithWindowState(id)
}

func (s *NotesService) CreateCategory(name, color string) (*models.Category, error) {
	category := &models.Category{
		Name:  name,
		Color: color,
	}

	if err := s.CategoryRepository.Create(category); err != nil {
		return nil, err
	}

	return category, nil
}

func (s *NotesService) RetrieveCategories() ([]models.Category, error) {
	return s.CategoryRepository.GetAll()
}

func (s *NotesService) RetrieveCategory(id uint) (*models.Category, error) {
	return s.CategoryRepository.GetByID(id)
}

func (s *NotesService) DeleteCategory(id uint) error {
	return s.CategoryRepository.Delete(id)
}

func (s *NotesService) RetrieveNotesByCategory(categoryID uint) ([]models.Note, error) {
	return s.NotesRepository.GetAllByCategory(&categoryID)
}
