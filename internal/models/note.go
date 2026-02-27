package models

import (
	"gorm.io/gorm"
)

type Note struct {
	gorm.Model
	Title       string       `gorm:"column:title;size:255;not null" json:"title"`
	Content     string       `gorm:"column:content;not null" json:"content"`
	Color       string       `gorm:"column:color;size:20;not null;default:'#FFEBA1'" json:"color"`
	TextColor   string       `gorm:"column:text_color;size:20;not null;default:'#000000'" json:"text_color"`
	CategoryID  *uint        `gorm:"column:category_id" json:"category_id"`
	Category    *Category    `gorm:"foreignKey:CategoryID;constraint:OnDelete:SET NULL" json:"category"`
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
