package models

import (
	"time"

	"github.com/google/uuid"
)

type Bulletin struct {
	BaseModel
	Title       string     `gorm:"size:200;not null" json:"title"`
	Content     string     `gorm:"type:text" json:"content"`
	ScopeType   string     `gorm:"size:20;not null" json:"scope_type"` // region / province
	ScopeID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"scope_id"`
	AuthorID    uuid.UUID  `gorm:"type:uuid;not null" json:"author_id"`
	IsPinned    bool       `gorm:"default:false" json:"is_pinned"`
	PublishedAt *time.Time `json:"published_at"`
	ExpiresAt   *time.Time `json:"expires_at"`
	Status      int8       `gorm:"default:0;not null" json:"status"` // 0=draft,1=published,2=archived

	Author User `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
}
