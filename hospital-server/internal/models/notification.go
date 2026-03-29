package models

import "github.com/google/uuid"

type Notification struct {
	BaseModel
	UserID  uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	Title   string     `gorm:"size:200;not null" json:"title"`
	Content string     `gorm:"type:text" json:"content"`
	Type    string     `gorm:"size:50;not null" json:"type"` // ticket, bulletin, system
	RefType string     `gorm:"size:50" json:"ref_type"`
	RefID   *uuid.UUID `gorm:"type:uuid" json:"ref_id"`
	IsRead  bool       `gorm:"default:false;index" json:"is_read"`
}
