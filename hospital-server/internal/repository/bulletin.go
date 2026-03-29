package repository

import (
	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BulletinRepo struct {
	db *gorm.DB
}

func NewBulletinRepo(db *gorm.DB) *BulletinRepo {
	return &BulletinRepo{db: db}
}

func (r *BulletinRepo) List(q *dto.BulletinFilterQuery) ([]models.Bulletin, int64, error) {
	var bulletins []models.Bulletin
	var total int64

	query := r.db.Model(&models.Bulletin{})

	// Keyword search on title
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		query = query.Where("title LIKE ?", like)
	}

	// Direct scope filter (admin use: filter by exact scope)
	if q.ScopeType != "" {
		query = query.Where("scope_type = ?", q.ScopeType)
	}
	if q.ScopeID != nil {
		query = query.Where("scope_id = ?", *q.ScopeID)
	}

	// Status filter
	if q.Status != nil {
		query = query.Where("status = ?", *q.Status)
	}

	// Scope-based visibility filters (portal use):
	// RegionID: show region-scoped bulletins for that specific region
	if q.RegionID != nil && q.ProvinceID == nil {
		query = query.Where("scope_type = 'region' AND scope_id = ?", *q.RegionID)
	}

	// ProvinceID: show province-scoped bulletins for that province
	// plus region-scoped bulletins for its parent region.
	// To find the parent region, we do a subquery on the provinces table.
	if q.ProvinceID != nil {
		query = query.Where(
			"(scope_type = 'province' AND scope_id = ?) OR "+
				"(scope_type = 'region' AND scope_id = (SELECT region_id FROM provinces WHERE id = ? AND deleted_at IS NULL))",
			*q.ProvinceID, *q.ProvinceID,
		)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Preload("Author").
		Order("is_pinned DESC, created_at DESC").
		Offset(q.Offset()).
		Limit(q.PageSize).
		Find(&bulletins).Error; err != nil {
		return nil, 0, err
	}

	return bulletins, total, nil
}

func (r *BulletinRepo) GetByID(id uuid.UUID) (*models.Bulletin, error) {
	var bulletin models.Bulletin
	if err := r.db.Preload("Author").First(&bulletin, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &bulletin, nil
}

func (r *BulletinRepo) Create(bulletin *models.Bulletin) error {
	return r.db.Create(bulletin).Error
}

func (r *BulletinRepo) Update(bulletin *models.Bulletin) error {
	return r.db.Save(bulletin).Error
}

func (r *BulletinRepo) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Bulletin{}, "id = ?", id).Error
}
