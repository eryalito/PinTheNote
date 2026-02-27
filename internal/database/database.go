package database

import (
	"log"
	"os"
	"path/filepath"

	"github.com/eryalito/pinthenote/internal/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// InitDB initializes the SQLite database and runs migrations
func InitDB(dbPath string) (*gorm.DB, error) {
	var err error

	// Create directory if it doesn't exist
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}

	// Open SQLite database
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}

	log.Println("Database connected successfully")

	// Auto-migrate models (order matters for foreign keys)
	err = db.AutoMigrate(&models.Category{}, &models.WindowState{}, &models.Note{})
	if err != nil {
		return nil, err
	}

	log.Println("Database migrations completed")

	return db, nil
}

// CloseDB closes the database connection
func CloseDB(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
