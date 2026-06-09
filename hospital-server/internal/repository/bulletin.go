package repository

import (
	"errors"
	"fmt"

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
	// RegionID: show all-scoped + region-scoped bulletins for that specific region
	if q.RegionID != nil && q.ProvinceID == nil {
		query = query.Where("scope_type = 'all' OR (scope_type = 'region' AND scope_id = ?)", *q.RegionID)
	}

	// ProvinceID: show all-scoped + province-scoped bulletins for that province
	// plus region-scoped bulletins for its parent region.
	if q.ProvinceID != nil {
		query = query.Where(
			"scope_type = 'all' OR (scope_type = 'province' AND scope_id = ?) OR "+
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

// ResolveRecipients returns the user IDs that should be notified for a bulletin
// of the given scope, excluding the author and any external customer-role users.
// Only active (status=1), non-soft-deleted users are returned.
//
//	scope_type "province" -> users whose province_id = scopeID
//	scope_type "region"   -> users whose region_id = scopeID OR whose province_id
//	                         belongs to a province under that region
//	scope_type "all"      -> all eligible users
func (r *BulletinRepo) ResolveRecipients(scopeType string, scopeID *uuid.UUID, excludeUserID uuid.UUID) ([]uuid.UUID, error) {
	q := r.db.Model(&models.User{}).
		Where("status = ?", 1).
		Where("id <> ?", excludeUserID).
		Where("id NOT IN (?)",
			r.db.Table("user_roles AS ur").
				Select("ur.user_id").
				Joins("JOIN roles ro ON ro.id = ur.role_id AND ro.deleted_at IS NULL").
				Where("ro.code = ?", "customer"))

	switch scopeType {
	case "all":
		// no extra scope filter
	case "province":
		if scopeID == nil {
			return nil, errors.New("scope_id required for province scope")
		}
		q = q.Where("province_id = ?", *scopeID)
	case "region":
		if scopeID == nil {
			return nil, errors.New("scope_id required for region scope")
		}
		q = q.Where("region_id = ? OR province_id IN (?)", *scopeID,
			r.db.Model(&models.Province{}).Select("id").Where("region_id = ?", *scopeID))
	default:
		return nil, fmt.Errorf("unknown scope_type: %s", scopeType)
	}

	var ids []uuid.UUID
	if err := q.Pluck("id", &ids).Error; err != nil {
		return nil, err
	}
	return ids, nil
}
