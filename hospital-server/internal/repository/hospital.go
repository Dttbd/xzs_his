package repository

import (
	"fmt"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type HospitalRepo struct {
	db *gorm.DB
}

func NewHospitalRepo(db *gorm.DB) *HospitalRepo {
	return &HospitalRepo{db: db}
}

// ---------- Hospital ----------

func (r *HospitalRepo) ListHospitals(q *dto.HospitalFilterQuery) ([]models.Hospital, int64, error) {
	var hospitals []models.Hospital
	var total int64

	query := r.db.Model(&models.Hospital{})

	if q.RegionID != nil {
		query = query.Joins("JOIN provinces ON hospitals.province_id = provinces.id").
			Where("provinces.region_id = ?", *q.RegionID)
	}
	if q.ProvinceID != nil {
		query = query.Where("hospitals.province_id = ?", *q.ProvinceID)
	}
	if q.CategoryID != nil {
		query = query.Where("hospitals.category_id = ?", *q.CategoryID)
	}
	if q.Level != "" {
		query = query.Where("hospitals.level = ?", q.Level)
	}
	if q.City != "" {
		query = query.Where("hospitals.city = ?", q.City)
	}
	if q.IsSpecialized != nil {
		query = query.Where("hospitals.is_specialized = ?", *q.IsSpecialized)
	}
	if q.OwnerUserID != nil {
		query = query.Where("hospitals.owner_user_id = ?", *q.OwnerUserID)
	}
	if q.Status != nil {
		query = query.Where("hospitals.status = ?", *q.Status)
	}
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		query = query.Where("hospitals.name LIKE ? OR hospitals.code LIKE ? OR hospitals.contact_name LIKE ? OR hospitals.contact_phone LIKE ?",
			like, like, like, like)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.
		Preload("Category").
		Preload("Province").
		Preload("Province.Region").
		Preload("OwnerUser").
		Preload("Fields").
		Order("hospitals.created_at DESC").
		Offset(q.Offset()).Limit(q.PageSize).
		Find(&hospitals).Error; err != nil {
		return nil, 0, err
	}

	return hospitals, total, nil
}

func (r *HospitalRepo) ListAllHospitals(q *dto.HospitalFilterQuery) ([]models.Hospital, error) {
	var hospitals []models.Hospital

	query := r.db.Model(&models.Hospital{})

	if q.RegionID != nil {
		query = query.Joins("JOIN provinces ON hospitals.province_id = provinces.id").
			Where("provinces.region_id = ?", *q.RegionID)
	}
	if q.ProvinceID != nil {
		query = query.Where("hospitals.province_id = ?", *q.ProvinceID)
	}
	if q.CategoryID != nil {
		query = query.Where("hospitals.category_id = ?", *q.CategoryID)
	}
	if q.Level != "" {
		query = query.Where("hospitals.level = ?", q.Level)
	}
	if q.City != "" {
		query = query.Where("hospitals.city = ?", q.City)
	}
	if q.IsSpecialized != nil {
		query = query.Where("hospitals.is_specialized = ?", *q.IsSpecialized)
	}
	if q.OwnerUserID != nil {
		query = query.Where("hospitals.owner_user_id = ?", *q.OwnerUserID)
	}
	if q.Status != nil {
		query = query.Where("hospitals.status = ?", *q.Status)
	}
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		query = query.Where("hospitals.name LIKE ? OR hospitals.code LIKE ? OR hospitals.contact_name LIKE ? OR hospitals.contact_phone LIKE ?",
			like, like, like, like)
	}

	if err := query.
		Preload("Category").
		Preload("Province").
		Preload("Province.Region").
		Preload("OwnerUser").
		Preload("Fields").
		Order("hospitals.created_at DESC").
		Find(&hospitals).Error; err != nil {
		return nil, err
	}

	return hospitals, nil
}

func (r *HospitalRepo) GetHospital(id uuid.UUID) (*models.Hospital, error) {
	var hospital models.Hospital
	if err := r.db.
		Preload("Category").
		Preload("Province").
		Preload("Province.Region").
		Preload("OwnerUser").
		Preload("Fields").
		First(&hospital, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &hospital, nil
}

func (r *HospitalRepo) CreateHospital(hospital *models.Hospital) error {
	return r.db.Create(hospital).Error
}

func (r *HospitalRepo) UpdateHospital(hospital *models.Hospital) error {
	return r.db.Save(hospital).Error
}

func (r *HospitalRepo) DeleteHospital(id uuid.UUID) error {
	return r.db.Delete(&models.Hospital{}, "id = ?", id).Error
}

func (r *HospitalRepo) SaveFields(hospitalID uuid.UUID, fields map[string]string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("hospital_id = ?", hospitalID).Delete(&models.HospitalField{}).Error; err != nil {
			return err
		}

		if len(fields) == 0 {
			return nil
		}

		var rows []models.HospitalField
		for key, val := range fields {
			rows = append(rows, models.HospitalField{
				HospitalID: hospitalID,
				FieldKey:   key,
				FieldValue: val,
			})
		}
		return tx.Create(&rows).Error
	})
}

func (r *HospitalRepo) Summary(q *dto.HospitalSummaryQuery) ([]dto.HospitalSummaryItem, error) {
	var items []dto.HospitalSummaryItem
	var query *gorm.DB

	switch q.GroupBy {
	case "province":
		query = r.db.Model(&models.Hospital{}).
			Select("hospitals.province_id::text AS group_key, COALESCE(provinces.name, '') AS group_name, COUNT(*) AS count").
			Joins("LEFT JOIN provinces ON hospitals.province_id = provinces.id").
			Group("hospitals.province_id, provinces.name")
	case "region":
		query = r.db.Model(&models.Hospital{}).
			Select("provinces.region_id::text AS group_key, COALESCE(regions.name, '') AS group_name, COUNT(*) AS count").
			Joins("LEFT JOIN provinces ON hospitals.province_id = provinces.id").
			Joins("LEFT JOIN regions ON provinces.region_id = regions.id").
			Group("provinces.region_id, regions.name")
	case "category":
		query = r.db.Model(&models.Hospital{}).
			Select("hospitals.category_id::text AS group_key, COALESCE(hospital_categories.name, '') AS group_name, COUNT(*) AS count").
			Joins("LEFT JOIN hospital_categories ON hospitals.category_id = hospital_categories.id").
			Group("hospitals.category_id, hospital_categories.name")
	case "specialty_type":
		query = r.db.Model(&models.Hospital{}).
			Select("hospitals.specialty_type AS group_key, hospitals.specialty_type AS group_name, COUNT(*) AS count").
			Group("hospitals.specialty_type")
	default:
		return nil, fmt.Errorf("unsupported group_by: %s", q.GroupBy)
	}

	if q.ProvinceID != nil {
		query = query.Where("hospitals.province_id = ?", *q.ProvinceID)
	}
	if q.RegionID != nil {
		if q.GroupBy != "region" {
			query = query.Joins("JOIN provinces p_filter ON hospitals.province_id = p_filter.id").
				Where("p_filter.region_id = ?", *q.RegionID)
		} else {
			query = query.Where("provinces.region_id = ?", *q.RegionID)
		}
	}

	if err := query.Scan(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

// ---------- HospitalCategory ----------

func (r *HospitalRepo) ListCategories(q *dto.PageQuery) ([]models.HospitalCategory, int64, error) {
	var categories []models.HospitalCategory
	var total int64

	query := r.db.Model(&models.HospitalCategory{})
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		query = query.Where("name LIKE ? OR code LIKE ?", like, like)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Preload("Children").Order("sort_order ASC").Offset(q.Offset()).Limit(q.PageSize).Find(&categories).Error; err != nil {
		return nil, 0, err
	}

	return categories, total, nil
}

func (r *HospitalRepo) GetCategory(id uuid.UUID) (*models.HospitalCategory, error) {
	var category models.HospitalCategory
	if err := r.db.Preload("Children").First(&category, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *HospitalRepo) CreateCategory(category *models.HospitalCategory) error {
	return r.db.Create(category).Error
}

func (r *HospitalRepo) UpdateCategory(category *models.HospitalCategory) error {
	return r.db.Save(category).Error
}

func (r *HospitalRepo) DeleteCategory(id uuid.UUID) error {
	return r.db.Delete(&models.HospitalCategory{}, "id = ?", id).Error
}

// ---------- FieldDefinition ----------

func (r *HospitalRepo) ListFieldDefs(q *dto.PageQuery) ([]models.FieldDefinition, int64, error) {
	var defs []models.FieldDefinition
	var total int64

	query := r.db.Model(&models.FieldDefinition{})
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		query = query.Where("field_key LIKE ? OR field_name LIKE ?", like, like)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Order("sort_order ASC").Offset(q.Offset()).Limit(q.PageSize).Find(&defs).Error; err != nil {
		return nil, 0, err
	}

	return defs, total, nil
}

func (r *HospitalRepo) GetFieldDef(id uuid.UUID) (*models.FieldDefinition, error) {
	var def models.FieldDefinition
	if err := r.db.First(&def, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &def, nil
}

func (r *HospitalRepo) CreateFieldDef(def *models.FieldDefinition) error {
	return r.db.Create(def).Error
}

func (r *HospitalRepo) UpdateFieldDef(def *models.FieldDefinition) error {
	return r.db.Save(def).Error
}

func (r *HospitalRepo) DeleteFieldDef(id uuid.UUID) error {
	return r.db.Delete(&models.FieldDefinition{}, "id = ?", id).Error
}

func (r *HospitalRepo) GetAllFieldDefs() ([]models.FieldDefinition, error) {
	var defs []models.FieldDefinition
	if err := r.db.Order("sort_order ASC").Find(&defs).Error; err != nil {
		return nil, err
	}
	return defs, nil
}
