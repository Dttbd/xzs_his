package models

import "github.com/google/uuid"

type Region struct {
	BaseModel
	Name      string `gorm:"size:100;not null" json:"name"`
	Code      string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Status    int8   `gorm:"default:1;not null" json:"status"`
	SortOrder int    `gorm:"default:0" json:"sort_order"`
}

type Province struct {
	BaseModel
	RegionID       uuid.UUID  `gorm:"type:uuid;not null;index" json:"region_id"`
	Name           string     `gorm:"size:100;not null" json:"name"`
	Code           string     `gorm:"size:50;uniqueIndex;not null" json:"code"`
	DefaultHandler *uuid.UUID `gorm:"type:uuid" json:"default_handler"`
	Status         int8       `gorm:"default:1;not null" json:"status"`
	SortOrder      int        `gorm:"default:0" json:"sort_order"`

	Region Region `gorm:"foreignKey:RegionID" json:"region,omitempty"`
}
