package repository

import (
	"github.com/eryalito/pinthenote/internal/models"

	"gorm.io/gorm"
)

type NoteRepository struct {
	db *gorm.DB
}

// NewNoteRepository creates a new note repository
func NewNoteRepository(db *gorm.DB) *NoteRepository {
	return &NoteRepository{
		db: db,
	}
}

// Create adds a new note to the database
func (r *NoteRepository) Create(note *models.Note) error {
	return r.db.Create(note).Error
}

// CreateWithDeps adds a new note and saves provided associations
func (r *NoteRepository) CreateWithDeps(note *models.Note) error {
	return r.db.Session(&gorm.Session{FullSaveAssociations: true}).Create(note).Error
}

// GetByID retrieves a note by its ID
func (r *NoteRepository) GetByID(id uint) (*models.Note, error) {
	var note models.Note
	err := r.db.First(&note, id).Error
	if err != nil {
		return nil, err
	}
	return &note, nil
}

// GetAll retrieves all notes
func (r *NoteRepository) GetAll() ([]models.Note, error) {
	var notes []models.Note
	err := r.db.Find(&notes).Error
	if err != nil {
		return nil, err
	}
	return notes, nil
}

// Update updates an existing note
func (r *NoteRepository) Update(note *models.Note) error {
	return r.db.Save(note).Error
}

// Delete removes a note by its ID
func (r *NoteRepository) Delete(id uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("note_id = ?", id).Delete(&models.WindowState{}).Error; err != nil {
			return err
		}

		if err := tx.Delete(&models.Note{}, id).Error; err != nil {
			return err
		}

		return nil
	})
}

// DeleteAll removes all notes (soft delete)
func (r *NoteRepository) DeleteAll() error {
	return r.db.Delete(&models.Note{}).Error
}

// Count returns the total number of notes
func (r *NoteRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&models.Note{}).Count(&count).Error
	if err != nil {
		return 0, err
	}
	return count, nil
}

// GetByIDWithWindowState retrieves a note with its associated WindowState
func (r *NoteRepository) GetByIDWithWindowState(id uint) (*models.Note, error) {
	var note models.Note
	err := r.db.Preload("WindowState").Preload("Category").First(&note, id).Error
	if err != nil {
		return nil, err
	}
	return &note, nil
}

// GetAllWithWindowState retrieves all notes with their associated WindowStates
func (r *NoteRepository) GetAllWithWindowState() ([]models.Note, error) {
	var notes []models.Note
	err := r.db.Preload("WindowState").Preload("Category").Find(&notes).Error
	if err != nil {
		return nil, err
	}
	return notes, nil
}

// GetAllByCategory retrieves all notes that belong to a category.
// If categoryID is nil, it returns uncategorized notes.
func (r *NoteRepository) GetAllByCategory(categoryID *uint) ([]models.Note, error) {
	var notes []models.Note

	query := r.db.Preload("WindowState").Preload("Category")
	if categoryID == nil {
		query = query.Where("category_id IS NULL")
	} else {
		query = query.Where("category_id = ?", *categoryID)
	}

	err := query.Find(&notes).Error
	if err != nil {
		return nil, err
	}

	return notes, nil
}

// UpdateWindowState creates or updates the WindowState for a note
func (r *NoteRepository) UpdateWindowState(noteID uint, windowState *models.WindowState) error {
	windowState.NoteID = &noteID
	return r.db.Save(windowState).Error
}
