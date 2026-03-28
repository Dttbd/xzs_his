package repository

import (
	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TicketRepo struct {
	db *gorm.DB
}

func NewTicketRepo(db *gorm.DB) *TicketRepo {
	return &TicketRepo{db: db}
}

// TicketType methods

func (r *TicketRepo) ListTicketTypes(q *dto.PageQuery) ([]models.TicketType, int64, error) {
	var types []models.TicketType
	var total int64

	query := r.db.Model(&models.TicketType{})
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		query = query.Where("name LIKE ? OR code LIKE ?", like, like)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Order("sort_order ASC").Offset(q.Offset()).Limit(q.PageSize).Find(&types).Error; err != nil {
		return nil, 0, err
	}

	return types, total, nil
}

func (r *TicketRepo) GetTicketType(id uuid.UUID) (*models.TicketType, error) {
	var t models.TicketType
	if err := r.db.First(&t, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *TicketRepo) CreateTicketType(t *models.TicketType) error {
	return r.db.Create(t).Error
}

func (r *TicketRepo) UpdateTicketType(t *models.TicketType) error {
	return r.db.Save(t).Error
}

func (r *TicketRepo) DeleteTicketType(id uuid.UUID) error {
	return r.db.Delete(&models.TicketType{}, "id = ?", id).Error
}

// TicketStatus methods

func (r *TicketRepo) ListTicketStatuses(q *dto.PageQuery) ([]models.TicketStatus, int64, error) {
	var statuses []models.TicketStatus
	var total int64

	query := r.db.Model(&models.TicketStatus{})
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		query = query.Where("name LIKE ? OR code LIKE ?", like, like)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Order("sort_order ASC").Offset(q.Offset()).Limit(q.PageSize).Find(&statuses).Error; err != nil {
		return nil, 0, err
	}

	return statuses, total, nil
}

func (r *TicketRepo) GetTicketStatus(id uuid.UUID) (*models.TicketStatus, error) {
	var s models.TicketStatus
	if err := r.db.First(&s, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *TicketRepo) CreateTicketStatus(s *models.TicketStatus) error {
	return r.db.Create(s).Error
}

func (r *TicketRepo) UpdateTicketStatus(s *models.TicketStatus) error {
	return r.db.Save(s).Error
}

func (r *TicketRepo) DeleteTicketStatus(id uuid.UUID) error {
	return r.db.Delete(&models.TicketStatus{}, "id = ?", id).Error
}

func (r *TicketRepo) GetInitialStatus() (*models.TicketStatus, error) {
	var s models.TicketStatus
	if err := r.db.Where("is_initial = ?", true).First(&s).Error; err != nil {
		return nil, err
	}
	return &s, nil
}

// TicketTransition methods

func (r *TicketRepo) ListTransitions(q *dto.PageQuery) ([]models.TicketTransition, int64, error) {
	var transitions []models.TicketTransition
	var total int64

	query := r.db.Model(&models.TicketTransition{})
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		query = query.Where("name LIKE ?", like)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Preload("FromStatus").Preload("ToStatus").Offset(q.Offset()).Limit(q.PageSize).Find(&transitions).Error; err != nil {
		return nil, 0, err
	}

	return transitions, total, nil
}

func (r *TicketRepo) GetTransition(id uuid.UUID) (*models.TicketTransition, error) {
	var t models.TicketTransition
	if err := r.db.Preload("FromStatus").Preload("ToStatus").First(&t, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *TicketRepo) CreateTransition(t *models.TicketTransition) error {
	return r.db.Create(t).Error
}

func (r *TicketRepo) UpdateTransition(t *models.TicketTransition) error {
	return r.db.Save(t).Error
}

func (r *TicketRepo) DeleteTransition(id uuid.UUID) error {
	return r.db.Delete(&models.TicketTransition{}, "id = ?", id).Error
}

func (r *TicketRepo) GetTransitionsByFromStatus(fromStatusID uuid.UUID) ([]models.TicketTransition, error) {
	var transitions []models.TicketTransition
	if err := r.db.Where("from_status_id = ?", fromStatusID).Preload("ToStatus").Find(&transitions).Error; err != nil {
		return nil, err
	}
	return transitions, nil
}
