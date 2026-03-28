package repository

import (
	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrganizationRepo struct {
	db *gorm.DB
}

func NewOrganizationRepo(db *gorm.DB) *OrganizationRepo {
	return &OrganizationRepo{db: db}
}

// Region methods

func (r *OrganizationRepo) ListRegions(q *dto.PageQuery) ([]models.Region, int64, error) {
	var regions []models.Region
	var total int64

	query := r.db.Model(&models.Region{})
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		query = query.Where("name LIKE ? OR code LIKE ?", like, like)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Order("sort_order ASC").Offset(q.Offset()).Limit(q.PageSize).Find(&regions).Error; err != nil {
		return nil, 0, err
	}

	return regions, total, nil
}

func (r *OrganizationRepo) GetRegion(id uuid.UUID) (*models.Region, error) {
	var region models.Region
	if err := r.db.First(&region, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &region, nil
}

func (r *OrganizationRepo) CreateRegion(region *models.Region) error {
	return r.db.Create(region).Error
}

func (r *OrganizationRepo) UpdateRegion(region *models.Region) error {
	return r.db.Save(region).Error
}

func (r *OrganizationRepo) DeleteRegion(id uuid.UUID) error {
	return r.db.Delete(&models.Region{}, "id = ?", id).Error
}

// Province methods

func (r *OrganizationRepo) ListProvinces(q *dto.PageQuery, regionID *uuid.UUID) ([]models.Province, int64, error) {
	var provinces []models.Province
	var total int64

	query := r.db.Model(&models.Province{})
	if regionID != nil {
		query = query.Where("region_id = ?", *regionID)
	}
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		query = query.Where("name LIKE ? OR code LIKE ?", like, like)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Preload("Region").Order("sort_order ASC").Offset(q.Offset()).Limit(q.PageSize).Find(&provinces).Error; err != nil {
		return nil, 0, err
	}

	return provinces, total, nil
}

func (r *OrganizationRepo) GetProvince(id uuid.UUID) (*models.Province, error) {
	var province models.Province
	if err := r.db.Preload("Region").First(&province, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &province, nil
}

func (r *OrganizationRepo) CreateProvince(province *models.Province) error {
	return r.db.Create(province).Error
}

func (r *OrganizationRepo) UpdateProvince(province *models.Province) error {
	return r.db.Save(province).Error
}

func (r *OrganizationRepo) DeleteProvince(id uuid.UUID) error {
	return r.db.Delete(&models.Province{}, "id = ?", id).Error
}
