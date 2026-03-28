package dto

import "github.com/google/uuid"

// --- Ticket Type ---
type CreateTicketTypeReq struct {
	Name        string `json:"name" binding:"required,max=100"`
	Code        string `json:"code" binding:"required,max=50"`
	Icon        string `json:"icon"`
	Description string `json:"description"`
	SortOrder   int    `json:"sort_order"`
}

type UpdateTicketTypeReq struct {
	Name        *string `json:"name"`
	Code        *string `json:"code"`
	Icon        *string `json:"icon"`
	Description *string `json:"description"`
	IsActive    *bool   `json:"is_active"`
	SortOrder   *int    `json:"sort_order"`
}

// --- Ticket Status ---
type CreateTicketStatusReq struct {
	Name       string `json:"name" binding:"required,max=100"`
	Code       string `json:"code" binding:"required,max=50"`
	Color      string `json:"color"`
	IsInitial  bool   `json:"is_initial"`
	IsTerminal bool   `json:"is_terminal"`
	SortOrder  int    `json:"sort_order"`
}

type UpdateTicketStatusReq struct {
	Name       *string `json:"name"`
	Code       *string `json:"code"`
	Color      *string `json:"color"`
	IsInitial  *bool   `json:"is_initial"`
	IsTerminal *bool   `json:"is_terminal"`
	SortOrder  *int    `json:"sort_order"`
}

// --- Ticket Transition ---
type CreateTransitionReq struct {
	FromStatusID uuid.UUID `json:"from_status_id" binding:"required"`
	ToStatusID   uuid.UUID `json:"to_status_id" binding:"required"`
	Name         string    `json:"name" binding:"required,max=100"`
	AllowedRoles string    `json:"allowed_roles"` // JSON array string
}

type UpdateTransitionReq struct {
	Name         *string `json:"name"`
	AllowedRoles *string `json:"allowed_roles"`
}

// --- Ticket (for Task 6, define now so repo/service can reference) ---
type CreateTicketReq struct {
	Title       string     `json:"title" binding:"required,max=200"`
	Description string     `json:"description"`
	TypeID      uuid.UUID  `json:"type_id" binding:"required"`
	Priority    int8       `json:"priority"`
	HospitalID  *uuid.UUID `json:"hospital_id"`
	AssigneeID  *uuid.UUID `json:"assignee_id"`
}

type TicketFilterQuery struct {
	PageQuery
	TypeID     *uuid.UUID `form:"type_id"`
	StatusID   *uuid.UUID `form:"status_id"`
	AssigneeID *uuid.UUID `form:"assignee_id"`
	CreatorID  *uuid.UUID `form:"creator_id"`
	HospitalID *uuid.UUID `form:"hospital_id"`
	ProvinceID *uuid.UUID `form:"province_id"`
	RegionID   *uuid.UUID `form:"region_id"`
	Priority   *int8      `form:"priority"`
	DateFrom   string     `form:"date_from"` // YYYY-MM-DD
	DateTo     string     `form:"date_to"`
}

type TransitionTicketReq struct {
	ToStatusID uuid.UUID `json:"to_status_id" binding:"required"`
}

type AssignTicketReq struct {
	AssigneeID uuid.UUID `json:"assignee_id" binding:"required"`
}

type CreateCommentReq struct {
	Content    string `json:"content" binding:"required"`
	IsInternal bool   `json:"is_internal"`
}

type CreateAttachmentReq struct {
	FileName string `json:"file_name" binding:"required"`
	FileURL  string `json:"file_url" binding:"required"`
	FileSize int64  `json:"file_size"`
	FileType string `json:"file_type"`
}
