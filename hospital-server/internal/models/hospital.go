package models

import "github.com/google/uuid"

type Hospital struct {
	BaseModel
	Name            string     `gorm:"size:200;not null" json:"name"`
	Code            string     `gorm:"size:50;uniqueIndex;not null" json:"code"`
	CategoryID      *uuid.UUID `gorm:"type:uuid;index" json:"category_id"`
	Level           string     `gorm:"size:50" json:"level"`
	ProvinceID      *uuid.UUID `gorm:"type:uuid;index" json:"province_id"`
	City            string     `gorm:"size:100" json:"city"`
	Address         string     `gorm:"size:500" json:"address"`
	ContactName     string     `gorm:"size:100" json:"contact_name"`
	ContactPhone    string     `gorm:"size:20" json:"contact_phone"`
	ContactEmail    string     `gorm:"size:255" json:"contact_email"`
	BedCount        int        `gorm:"default:0" json:"bed_count"`
	DepartmentCount int        `gorm:"default:0" json:"department_count"`
	IsSpecialized   bool       `gorm:"default:false" json:"is_specialized"`
	SpecialtyType   string     `gorm:"size:100" json:"specialty_type"`
	OwnerUserID     *uuid.UUID `gorm:"type:uuid;index" json:"owner_user_id"`
	Status          int8       `gorm:"default:1;not null" json:"status"`
	Remark          string     `gorm:"type:text" json:"remark"`

	Category  *HospitalCategory `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Province  *Province         `gorm:"foreignKey:ProvinceID" json:"province,omitempty"`
	OwnerUser *User             `gorm:"foreignKey:OwnerUserID" json:"owner_user,omitempty"`
	Fields    []HospitalField   `gorm:"foreignKey:HospitalID" json:"fields,omitempty"`
}

type HospitalCategory struct {
	BaseModel
	Name      string     `gorm:"size:100;not null" json:"name"`
	Code      string     `gorm:"size:50;uniqueIndex;not null" json:"code"`
	ParentID  *uuid.UUID `gorm:"type:uuid;index" json:"parent_id"`
	SortOrder int        `gorm:"default:0" json:"sort_order"`

	Parent   *HospitalCategory  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children []HospitalCategory `gorm:"foreignKey:ParentID" json:"children,omitempty"`
}

type FieldDefinition struct {
	BaseModel
	FieldKey     string `gorm:"size:100;uniqueIndex;not null" json:"field_key"`
	FieldName    string `gorm:"size:100;not null" json:"field_name"`
	FieldType    string `gorm:"size:50;not null" json:"field_type"`
	Options      string `gorm:"type:jsonb" json:"options"`
	IsRequired   bool   `gorm:"default:false" json:"is_required"`
	IsFilterable bool   `gorm:"default:true" json:"is_filterable"`
	SortOrder    int    `gorm:"default:0" json:"sort_order"`
}

type HospitalField struct {
	ID         uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	HospitalID uuid.UUID `gorm:"type:uuid;not null;index" json:"hospital_id"`
	FieldKey   string    `gorm:"size:100;not null" json:"field_key"`
	FieldValue string    `gorm:"type:text" json:"field_value"`
}
