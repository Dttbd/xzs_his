package service

import (
	"errors"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/internal/repository"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserService struct {
	repo *repository.UserRepo
}

func NewUserService(repo *repository.UserRepo) *UserService {
	return &UserService{repo: repo}
}

func (s *UserService) List(q *dto.PageQuery) ([]models.User, int64, error) {
	return s.repo.List(q)
}

func (s *UserService) GetByID(id uuid.UUID) (*models.User, error) {
	return s.repo.GetByID(id)
}

func (s *UserService) Create(req *dto.CreateUserReq) (*models.User, error) {
	_, err := s.repo.GetByUsername(req.Username)
	if err == nil {
		return nil, errors.New("username already exists")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	hash, err := HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Username:     req.Username,
		PasswordHash: hash,
		RealName:     req.RealName,
		Phone:        req.Phone,
		Email:        req.Email,
		RegionID:     req.RegionID,
		ProvinceID:   req.ProvinceID,
	}

	if err := s.repo.Create(user); err != nil {
		return nil, err
	}

	if len(req.RoleIDs) > 0 {
		roles, err := s.repo.GetRolesByIDs(req.RoleIDs)
		if err != nil {
			return nil, err
		}
		if err := s.repo.SetRoles(user.ID, roles); err != nil {
			return nil, err
		}
		user.Roles = roles
	}

	return user, nil
}

func (s *UserService) Update(id uuid.UUID, req *dto.UpdateUserReq) (*models.User, error) {
	user, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if req.RealName != nil {
		user.RealName = *req.RealName
	}
	if req.Phone != nil {
		user.Phone = *req.Phone
	}
	if req.Email != nil {
		user.Email = *req.Email
	}
	if req.AvatarURL != nil {
		user.AvatarURL = *req.AvatarURL
	}
	if req.RegionID != nil {
		user.RegionID = req.RegionID
	}
	if req.ProvinceID != nil {
		user.ProvinceID = req.ProvinceID
	}
	if req.Status != nil {
		user.Status = *req.Status
	}

	if err := s.repo.Update(user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserService) Delete(id uuid.UUID) error {
	return s.repo.Delete(id)
}

func (s *UserService) SetRoles(userID uuid.UUID, req *dto.SetUserRolesReq) error {
	roles, err := s.repo.GetRolesByIDs(req.RoleIDs)
	if err != nil {
		return err
	}
	return s.repo.SetRoles(userID, roles)
}

func (s *UserService) ChangePassword(userID uuid.UUID, req *dto.ChangePasswordReq) error {
	user, err := s.repo.GetByID(userID)
	if err != nil {
		return errors.New("user not found")
	}
	// Verify old password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		return errors.New("旧密码不正确")
	}
	// Hash new password
	hash, err := HashPassword(req.NewPassword)
	if err != nil {
		return err
	}
	user.PasswordHash = hash
	return s.repo.Update(user)
}
