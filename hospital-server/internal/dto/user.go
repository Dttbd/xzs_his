package dto

import "github.com/google/uuid"

type CreateUserReq struct {
	Username   string      `json:"username" binding:"required,max=100"`
	Password   string      `json:"password" binding:"required,min=6,max=100"`
	RealName   string      `json:"real_name" binding:"required,max=100"`
	Phone      string      `json:"phone" binding:"omitempty,max=20"`
	Email      string      `json:"email" binding:"omitempty,email,max=255"`
	RegionID   *uuid.UUID  `json:"region_id"`
	ProvinceID *uuid.UUID  `json:"province_id"`
	RoleIDs    []uuid.UUID `json:"role_ids"`
}

type UpdateUserReq struct {
	RealName   *string    `json:"real_name" binding:"omitempty,max=100"`
	Phone      *string    `json:"phone" binding:"omitempty,max=20"`
	Email      *string    `json:"email" binding:"omitempty,email,max=255"`
	AvatarURL  *string    `json:"avatar_url"`
	RegionID   *uuid.UUID `json:"region_id"`
	ProvinceID *uuid.UUID `json:"province_id"`
	Status     *int8      `json:"status" binding:"omitempty,oneof=0 1"`
}

type SetUserRolesReq struct {
	RoleIDs []uuid.UUID `json:"role_ids" binding:"required"`
}

type ChangePasswordReq struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6,max=100"`
}
