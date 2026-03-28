package repository

import (
	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RoleRepo struct {
	db *gorm.DB
}

func NewRoleRepo(db *gorm.DB) *RoleRepo {
	return &RoleRepo{db: db}
}

func (r *RoleRepo) List(q *dto.PageQuery) ([]models.Role, int64, error) {
	var roles []models.Role
	var total int64

	query := r.db.Model(&models.Role{})
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		query = query.Where("name LIKE ? OR code LIKE ?", like, like)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Offset(q.Offset()).Limit(q.PageSize).Find(&roles).Error; err != nil {
		return nil, 0, err
	}

	return roles, total, nil
}

func (r *RoleRepo) GetByID(id uuid.UUID) (*models.Role, error) {
	var role models.Role
	if err := r.db.First(&role, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &role, nil
}

func (r *RoleRepo) Create(role *models.Role) error {
	return r.db.Create(role).Error
}

func (r *RoleRepo) Update(role *models.Role) error {
	return r.db.Save(role).Error
}

func (r *RoleRepo) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Role{}, "id = ?", id).Error
}
