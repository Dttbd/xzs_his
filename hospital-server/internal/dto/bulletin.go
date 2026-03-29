package dto

import (
	"time"

	"github.com/google/uuid"
)

type CreateBulletinReq struct {
	Title     string     `json:"title" binding:"required,max=200"`
	Content   string     `json:"content" binding:"required"`
	ScopeType string     `json:"scope_type" binding:"required,oneof=region province"`
	ScopeID   uuid.UUID  `json:"scope_id" binding:"required"`
	IsPinned  bool       `json:"is_pinned"`
	ExpiresAt *time.Time `json:"expires_at"`
}

type UpdateBulletinReq struct {
	Title     *string    `json:"title"`
	Content   *string    `json:"content"`
	ScopeType *string    `json:"scope_type"`
	ScopeID   *uuid.UUID `json:"scope_id"`
	IsPinned  *bool      `json:"is_pinned"`
	ExpiresAt *time.Time `json:"expires_at"`
	Status    *int8      `json:"status"`
}

type BulletinFilterQuery struct {
	PageQuery
	ScopeType  string     `form:"scope_type"`
	ScopeID    *uuid.UUID `form:"scope_id"`
	Status     *int8      `form:"status"`
	RegionID   *uuid.UUID `form:"region_id"`   // show bulletins visible to this region
	ProvinceID *uuid.UUID `form:"province_id"` // show bulletins visible to this province
}
