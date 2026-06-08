package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	BaseModel
	Username     string     `gorm:"size:100;uniqueIndex;not null" json:"username"`
	PasswordHash string     `gorm:"size:255;not null" json:"-"`
	RealName     string     `gorm:"size:100;not null" json:"real_name"`
	Phone        string     `gorm:"size:20" json:"phone"`
	Email        string     `gorm:"size:255" json:"email"`
	AvatarURL    string     `gorm:"size:500" json:"avatar_url"`
	RegionID     *uuid.UUID `gorm:"type:uuid;index" json:"region_id"`
	ProvinceID   *uuid.UUID `gorm:"type:uuid;index" json:"province_id"`
	WechatUserID string     `gorm:"size:100;index" json:"wechat_userid"`
	Status       int8       `gorm:"default:1;not null" json:"status"`
	LastLoginAt  *time.Time `json:"last_login_at"`

	Region   *Region   `gorm:"foreignKey:RegionID" json:"region,omitempty"`
	Province *Province `gorm:"foreignKey:ProvinceID" json:"province,omitempty"`
	Roles    []Role    `gorm:"many2many:user_roles" json:"roles,omitempty"`
}

type Role struct {
	BaseModel
	Name        string `gorm:"size:100;not null" json:"name"`
	Code        string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Description string `gorm:"size:500" json:"description"`
	IsSystem    bool   `gorm:"default:false" json:"is_system"`
	Status      int8   `gorm:"default:1;not null" json:"status"`
}
