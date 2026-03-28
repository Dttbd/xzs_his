package dto

import "github.com/google/uuid"

// --- Hospital ---

type CreateHospitalReq struct {
	Name            string            `json:"name" binding:"required,max=200"`
	Code            string            `json:"code" binding:"required,max=50"`
	CategoryID      *uuid.UUID        `json:"category_id"`
	Level           string            `json:"level"`
	ProvinceID      *uuid.UUID        `json:"province_id"`
	City            string            `json:"city"`
	Address         string            `json:"address"`
	ContactName     string            `json:"contact_name"`
	ContactPhone    string            `json:"contact_phone"`
	ContactEmail    string            `json:"contact_email"`
	BedCount        int               `json:"bed_count"`
	DepartmentCount int               `json:"department_count"`
	IsSpecialized   bool              `json:"is_specialized"`
	SpecialtyType   string            `json:"specialty_type"`
	OwnerUserID     *uuid.UUID        `json:"owner_user_id"`
	Remark          string            `json:"remark"`
	Fields          map[string]string `json:"fields"` // dynamic field key->value
}

type UpdateHospitalReq struct {
	Name            *string           `json:"name"`
	CategoryID      *uuid.UUID        `json:"category_id"`
	Level           *string           `json:"level"`
	ProvinceID      *uuid.UUID        `json:"province_id"`
	City            *string           `json:"city"`
	Address         *string           `json:"address"`
	ContactName     *string           `json:"contact_name"`
	ContactPhone    *string           `json:"contact_phone"`
	ContactEmail    *string           `json:"contact_email"`
	BedCount        *int              `json:"bed_count"`
	DepartmentCount *int              `json:"department_count"`
	IsSpecialized   *bool             `json:"is_specialized"`
	SpecialtyType   *string           `json:"specialty_type"`
	OwnerUserID     *uuid.UUID        `json:"owner_user_id"`
	Status          *int8             `json:"status"`
	Remark          *string           `json:"remark"`
	Fields          map[string]string `json:"fields"`
}

type HospitalFilterQuery struct {
	PageQuery
	ProvinceID    *uuid.UUID `form:"province_id"`
	RegionID      *uuid.UUID `form:"region_id"`
	CategoryID    *uuid.UUID `form:"category_id"`
	Level         string     `form:"level"`
	IsSpecialized *bool      `form:"is_specialized"`
	OwnerUserID   *uuid.UUID `form:"owner_user_id"`
	City          string     `form:"city"`
	Status        *int8      `form:"status"`
}

type HospitalSummaryQuery struct {
	GroupBy    string     `form:"group_by" binding:"required,oneof=province region category specialty_type"`
	ProvinceID *uuid.UUID `form:"province_id"`
	RegionID   *uuid.UUID `form:"region_id"`
}

type HospitalSummaryItem struct {
	GroupKey  string `json:"group_key"`
	GroupName string `json:"group_name"`
	Count    int64  `json:"count"`
}

// --- HospitalCategory ---

type CreateCategoryReq struct {
	Name      string     `json:"name" binding:"required,max=100"`
	Code      string     `json:"code" binding:"required,max=50"`
	ParentID  *uuid.UUID `json:"parent_id"`
	SortOrder int        `json:"sort_order"`
}

type UpdateCategoryReq struct {
	Name      *string    `json:"name"`
	Code      *string    `json:"code"`
	ParentID  *uuid.UUID `json:"parent_id"`
	SortOrder *int       `json:"sort_order"`
}

// --- FieldDefinition ---

type CreateFieldDefReq struct {
	FieldKey     string `json:"field_key" binding:"required,max=100"`
	FieldName    string `json:"field_name" binding:"required,max=100"`
	FieldType    string `json:"field_type" binding:"required,oneof=text number select date"`
	Options      string `json:"options"` // JSON
	IsRequired   bool   `json:"is_required"`
	IsFilterable bool   `json:"is_filterable"`
	SortOrder    int    `json:"sort_order"`
}

type UpdateFieldDefReq struct {
	FieldName    *string `json:"field_name"`
	FieldType    *string `json:"field_type"`
	Options      *string `json:"options"`
	IsRequired   *bool   `json:"is_required"`
	IsFilterable *bool   `json:"is_filterable"`
	SortOrder    *int    `json:"sort_order"`
}
