package models

import "gorm.io/gorm"

type Category struct {
	gorm.Model
	Name  string `gorm:"column:name;size:100;not null;uniqueIndex" json:"name"`
	Color string `gorm:"column:color;size:20;not null" json:"color"`
}
