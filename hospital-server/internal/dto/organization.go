package dto

import "github.com/google/uuid"

type CreateRegionReq struct {
	Name      string `json:"name" binding:"required,max=100"`
	Code      string `json:"code" binding:"required,max=50"`
	SortOrder int    `json:"sort_order"`
}

type UpdateRegionReq struct {
	Name      *string `json:"name" binding:"omitempty,max=100"`
	Code      *string `json:"code" binding:"omitempty,max=50"`
	Status    *int8   `json:"status" binding:"omitempty,oneof=0 1"`
	SortOrder *int    `json:"sort_order"`
}

type CreateProvinceReq struct {
	RegionID       uuid.UUID  `json:"region_id" binding:"required"`
	Name           string     `json:"name" binding:"required,max=100"`
	Code           string     `json:"code" binding:"required,max=50"`
	DefaultHandler *uuid.UUID `json:"default_handler"`
	SortOrder      int        `json:"sort_order"`
}

type UpdateProvinceReq struct {
	RegionID       *uuid.UUID `json:"region_id"`
	Name           *string    `json:"name" binding:"omitempty,max=100"`
	Code           *string    `json:"code" binding:"omitempty,max=50"`
	DefaultHandler *uuid.UUID `json:"default_handler"`
	Status         *int8      `json:"status" binding:"omitempty,oneof=0 1"`
	SortOrder      *int       `json:"sort_order"`
}
