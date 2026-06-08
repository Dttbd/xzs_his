package service

import (
	"context"
	"errors"
	"time"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/pkg/auth"
	"github.com/dttbd/hospital-server/pkg/wechat"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	db        *gorm.DB
	jwtSecret string
	expireH   int
	sso       wechat.SSOClient
}

func NewAuthService(db *gorm.DB, jwtSecret string, expireH int, sso wechat.SSOClient) *AuthService {
	return &AuthService{db: db, jwtSecret: jwtSecret, expireH: expireH, sso: sso}
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

// LoginByWechatCode exchanges an OAuth code for a WeChat UserID, then logs in.
func (s *AuthService) LoginByWechatCode(ctx context.Context, code string) (*dto.LoginResp, error) {
	wechatUserID, err := s.sso.CodeToUserID(ctx, code)
	if err != nil {
		return nil, err
	}
	return s.LoginByWechatUserID(ctx, wechatUserID)
}

// LoginByWechatUserID matches a system user by wechat_userid and issues a JWT.
// Shared by the real OAuth callback and the dev-login endpoint.
func (s *AuthService) LoginByWechatUserID(ctx context.Context, wechatUserID string) (*dto.LoginResp, error) {
	if wechatUserID == "" {
		return nil, errors.New("empty wechat userid")
	}
	var user models.User
	if err := s.db.WithContext(ctx).Preload("Roles").Preload("Region").Preload("Province").
		Where("wechat_user_id = ? AND status = 1", wechatUserID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("该企业微信未绑定系统账号")
		}
		return nil, err
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
