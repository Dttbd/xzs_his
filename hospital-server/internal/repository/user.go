package repository

import (
	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRepo struct {
	db *gorm.DB
}

func NewUserRepo(db *gorm.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) List(q *dto.PageQuery) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	tx := r.db.Model(&models.User{})
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		tx = tx.Where("username LIKE ? OR real_name LIKE ? OR phone LIKE ?", like, like, like)
	}

	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := tx.Preload("Roles").Preload("Region").Preload("Province").
		Offset(q.Offset()).Limit(q.PageSize).Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func (r *UserRepo) GetByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	if err := r.db.Preload("Roles").Preload("Region").Preload("Province").
		First(&user, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepo) GetByUsername(username string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("username = ?", username).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepo) Create(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *UserRepo) Update(user *models.User) error {
	return r.db.Save(user).Error
}

func (r *UserRepo) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.User{}, "id = ?", id).Error
}

func (r *UserRepo) SetRoles(userID uuid.UUID, roles []models.Role) error {
	var user models.User
	user.ID = userID
	return r.db.Model(&user).Association("Roles").Replace(roles)
}

func (r *UserRepo) GetRolesByIDs(ids []uuid.UUID) ([]models.Role, error) {
	var roles []models.Role
	if err := r.db.Where("id IN ?", ids).Find(&roles).Error; err != nil {
		return nil, err
	}
	return roles, nil
}
