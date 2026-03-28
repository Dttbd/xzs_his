package repository

import (
	"fmt"
	"time"

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

// --- Ticket CRUD ---

func (r *TicketRepo) ListTickets(q *dto.TicketFilterQuery) ([]models.Ticket, int64, error) {
	var tickets []models.Ticket
	var total int64

	query := r.db.Model(&models.Ticket{})

	if q.TypeID != nil {
		query = query.Where("type_id = ?", *q.TypeID)
	}
	if q.StatusID != nil {
		query = query.Where("status_id = ?", *q.StatusID)
	}
	if q.AssigneeID != nil {
		query = query.Where("assignee_id = ?", *q.AssigneeID)
	}
	if q.CreatorID != nil {
		query = query.Where("creator_id = ?", *q.CreatorID)
	}
	if q.HospitalID != nil {
		query = query.Where("hospital_id = ?", *q.HospitalID)
	}
	if q.ProvinceID != nil {
		query = query.Where("province_id = ?", *q.ProvinceID)
	}
	if q.RegionID != nil {
		query = query.Where("region_id = ?", *q.RegionID)
	}
	if q.Priority != nil {
		query = query.Where("priority = ?", *q.Priority)
	}
	if q.DateFrom != "" {
		query = query.Where("created_at >= ?", q.DateFrom)
	}
	if q.DateTo != "" {
		query = query.Where("created_at <= ?", q.DateTo+" 23:59:59")
	}
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		query = query.Where("title LIKE ? OR ticket_no LIKE ?", like, like)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.
		Preload("Type").Preload("Status").Preload("Creator").Preload("Assignee").Preload("Hospital").
		Order("created_at DESC").
		Offset(q.Offset()).Limit(q.PageSize).
		Find(&tickets).Error; err != nil {
		return nil, 0, err
	}

	return tickets, total, nil
}

func (r *TicketRepo) GetTicket(id uuid.UUID) (*models.Ticket, error) {
	var ticket models.Ticket
	if err := r.db.
		Preload("Type").Preload("Status").Preload("Creator").Preload("Assignee").
		Preload("Hospital").Preload("Province").
		Preload("Comments", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC")
		}).
		Preload("Comments.User").
		Preload("Attachments").Preload("Attachments.Uploader").
		Preload("Logs", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC")
		}).
		Preload("Logs.User").
		First(&ticket, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &ticket, nil
}

func (r *TicketRepo) CreateTicket(ticket *models.Ticket) error {
	return r.db.Create(ticket).Error
}

func (r *TicketRepo) UpdateTicket(ticket *models.Ticket) error {
	return r.db.Model(ticket).
		Select("status_id", "assignee_id", "resolved_at", "title", "description", "priority", "hospital_id", "province_id", "region_id").
		Updates(ticket).Error
}

func (r *TicketRepo) GenerateTicketNo() string {
	today := time.Now().Format("20060102")
	var count int64
	r.db.Model(&models.Ticket{}).
		Where("ticket_no LIKE ?", "TK-"+today+"-%").
		Count(&count)
	return fmt.Sprintf("TK-%s-%04d", today, count+1)
}

func (r *TicketRepo) CreateComment(comment *models.TicketComment) error {
	return r.db.Create(comment).Error
}

func (r *TicketRepo) CreateAttachment(att *models.TicketAttachment) error {
	return r.db.Create(att).Error
}

func (r *TicketRepo) CreateLog(log *models.TicketLog) error {
	return r.db.Create(log).Error
}
