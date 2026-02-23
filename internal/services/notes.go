package services

import (
	"github.com/eryalito/pinthenote/internal/models"
	"github.com/eryalito/pinthenote/internal/repository"
)

type NotesService struct {
	NotesRepository *repository.NoteRepository
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
	return s.NotesRepository.CreateWithDeps(note)
}

func (s *NotesService) RetrieveNote(id uint) (*models.Note, error) {
	return s.NotesRepository.GetByIDWithWindowState(id)
}
