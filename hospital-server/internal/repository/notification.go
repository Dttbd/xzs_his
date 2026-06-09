package repository

import (
	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type NotificationRepo struct {
	db *gorm.DB
}

func NewNotificationRepo(db *gorm.DB) *NotificationRepo {
	return &NotificationRepo{db: db}
}

func (r *NotificationRepo) ListByUser(userID uuid.UUID, q *dto.NotificationFilterQuery) ([]models.Notification, int64, error) {
	var notifications []models.Notification
	var total int64

	query := r.db.Model(&models.Notification{}).Where("user_id = ?", userID)

	if q.Type != "" {
		query = query.Where("type = ?", q.Type)
	}
	if q.IsRead != nil {
		query = query.Where("is_read = ?", *q.IsRead)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Order("created_at DESC").Offset(q.Offset()).Limit(q.PageSize).Find(&notifications).Error; err != nil {
		return nil, 0, err
	}

	return notifications, total, nil
}

func (r *NotificationRepo) MarkRead(id, userID uuid.UUID) error {
	return r.db.Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("is_read", true).Error
}

func (r *NotificationRepo) MarkAllRead(userID uuid.UUID) error {
	return r.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Update("is_read", true).Error
}

func (r *NotificationRepo) UnreadCount(userID uuid.UUID) (int64, error) {
	var count int64
	if err := r.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *NotificationRepo) Create(notification *models.Notification) error {
	return r.db.Create(notification).Error
}

func (r *NotificationRepo) BatchCreate(notifications []models.Notification) error {
	if len(notifications) == 0 {
		return nil
	}
	return r.db.CreateInBatches(notifications, 500).Error
}
