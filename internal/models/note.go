package models

import (
	"gorm.io/gorm"
)

type Note struct {
	gorm.Model
	Title       string       `gorm:"column:title;size:255;not null" json:"title"`
	Content     string       `gorm:"column:content;not null" json:"content"`
	WindowState *WindowState `gorm:"foreignKey:NoteID;constraint:OnDelete:CASCADE" json:"window_state"`
}

type WindowState struct {
	gorm.Model
	NoteID  *uint `gorm:"column:note_id;unique" json:"note_id"`
	Width   int   `gorm:"column:width;not null" json:"width"`
	Height  int   `gorm:"column:height;not null" json:"height"`
	X       int   `gorm:"column:x;not null" json:"x"`
	Y       int   `gorm:"column:y;not null" json:"y"`
	Pinned  bool  `gorm:"column:pinned;not null;default:false" json:"pinned"`
	Visible bool  `gorm:"column:visible;not null;default:true" json:"visible"`
}
