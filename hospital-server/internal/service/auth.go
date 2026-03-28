package service

import (
	"errors"
	"time"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/pkg/auth"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	db        *gorm.DB
	jwtSecret string
	expireH   int
}

func NewAuthService(db *gorm.DB, jwtSecret string, expireH int) *AuthService {
	return &AuthService{db: db, jwtSecret: jwtSecret, expireH: expireH}
}

func (s *AuthService) Login(req *dto.LoginReq) (*dto.LoginResp, error) {
	var user models.User
	if err := s.db.Preload("Roles").Preload("Region").Preload("Province").
		Where("username = ? AND status = 1", req.Username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid username or password")
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid username or password")
	}

	token, err := auth.GenerateToken(s.jwtSecret, user.ID, user.Username, s.expireH)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	s.db.Model(&user).Update("last_login_at", &now)

	return &dto.LoginResp{
		Token:     token,
		ExpiresIn: s.expireH * 3600,
		User:      user,
	}, nil
}

func (s *AuthService) RefreshToken(userID uuid.UUID, username string) (*dto.RefreshResp, error) {
	token, err := auth.GenerateToken(s.jwtSecret, userID, username, s.expireH)
	if err != nil {
		return nil, err
	}

	return &dto.RefreshResp{
		Token:     token,
		ExpiresIn: s.expireH * 3600,
	}, nil
}

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}
