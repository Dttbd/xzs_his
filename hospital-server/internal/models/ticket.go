package models

import (
	"time"

	"github.com/google/uuid"
)

type TicketType struct {
	BaseModel
	Name        string `gorm:"size:100;not null" json:"name"`
	Code        string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Icon        string `gorm:"size:100" json:"icon"`
	Description string `gorm:"size:500" json:"description"`
	IsActive    bool   `gorm:"default:true" json:"is_active"`
	SortOrder   int    `gorm:"default:0" json:"sort_order"`
}

type TicketStatus struct {
	BaseModel
	Name       string `gorm:"size:100;not null" json:"name"`
	Code       string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Color      string `gorm:"size:50" json:"color"`
	IsInitial  bool   `gorm:"default:false" json:"is_initial"`
	IsTerminal bool   `gorm:"default:false" json:"is_terminal"`
	SortOrder  int    `gorm:"default:0" json:"sort_order"`
}

type TicketTransition struct {
	BaseModel
	FromStatusID uuid.UUID `gorm:"type:uuid;not null;index" json:"from_status_id"`
	ToStatusID   uuid.UUID `gorm:"type:uuid;not null;index" json:"to_status_id"`
	Name         string    `gorm:"size:100;not null" json:"name"`
	AllowedRoles string    `gorm:"type:jsonb" json:"allowed_roles"`

	FromStatus TicketStatus `gorm:"foreignKey:FromStatusID" json:"from_status,omitempty"`
	ToStatus   TicketStatus `gorm:"foreignKey:ToStatusID" json:"to_status,omitempty"`
}

type Ticket struct {
	BaseModel
	TicketNo    string     `gorm:"size:50;uniqueIndex;not null" json:"ticket_no"`
	Title       string     `gorm:"size:200;not null" json:"title"`
	Description string     `gorm:"type:text" json:"description"`
	TypeID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"type_id"`
	StatusID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"status_id"`
	Priority    int8       `gorm:"default:0" json:"priority"`
	HospitalID  *uuid.UUID `gorm:"type:uuid;index" json:"hospital_id"`
	CreatorID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"creator_id"`
	AssigneeID  *uuid.UUID `gorm:"type:uuid;index" json:"assignee_id"`
	ProvinceID  *uuid.UUID `gorm:"type:uuid;index" json:"province_id"`
	RegionID    *uuid.UUID `gorm:"type:uuid;index" json:"region_id"`
	ResolvedAt  *time.Time `json:"resolved_at"`

	Type        TicketType         `gorm:"foreignKey:TypeID" json:"type,omitempty"`
	Status      TicketStatus       `gorm:"foreignKey:StatusID" json:"status,omitempty"`
	Hospital    *Hospital          `gorm:"foreignKey:HospitalID" json:"hospital,omitempty"`
	Creator     User               `gorm:"foreignKey:CreatorID" json:"creator,omitempty"`
	Assignee    *User              `gorm:"foreignKey:AssigneeID" json:"assignee,omitempty"`
	Province    *Province          `gorm:"foreignKey:ProvinceID" json:"province,omitempty"`
	Comments    []TicketComment    `gorm:"foreignKey:TicketID" json:"comments,omitempty"`
	Attachments []TicketAttachment `gorm:"foreignKey:TicketID" json:"attachments,omitempty"`
	Logs        []TicketLog        `gorm:"foreignKey:TicketID" json:"logs,omitempty"`
}

type TicketComment struct {
	BaseModel
	TicketID   uuid.UUID `gorm:"type:uuid;not null;index" json:"ticket_id"`
	UserID     uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Content    string    `gorm:"type:text;not null" json:"content"`
	IsInternal bool      `gorm:"default:false" json:"is_internal"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type TicketAttachment struct {
	BaseModel
	TicketID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"ticket_id"`
	CommentID  *uuid.UUID `gorm:"type:uuid;index" json:"comment_id"`
	FileName   string     `gorm:"size:255;not null" json:"file_name"`
	FileURL    string     `gorm:"size:500;not null" json:"file_url"`
	FileSize   int64      `json:"file_size"`
	FileType   string     `gorm:"size:100" json:"file_type"`
	UploaderID uuid.UUID  `gorm:"type:uuid;not null" json:"uploader_id"`

	Uploader User `gorm:"foreignKey:UploaderID" json:"uploader,omitempty"`
}

type TicketLog struct {
	BaseModel
	TicketID   uuid.UUID `gorm:"type:uuid;not null;index" json:"ticket_id"`
	UserID     uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Action     string    `gorm:"size:50;not null" json:"action"`
	FromStatus string    `gorm:"size:50" json:"from_status"`
	ToStatus   string    `gorm:"size:50" json:"to_status"`
	Detail     string    `gorm:"type:jsonb" json:"detail"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
