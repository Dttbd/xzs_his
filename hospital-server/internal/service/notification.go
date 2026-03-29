package service

import (
	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/internal/repository"
	"github.com/google/uuid"
)

type NotificationService struct {
	repo *repository.NotificationRepo
}

func NewNotificationService(repo *repository.NotificationRepo) *NotificationService {
	return &NotificationService{repo: repo}
}

func (s *NotificationService) List(userID uuid.UUID, q *dto.NotificationFilterQuery) ([]models.Notification, int64, error) {
	return s.repo.ListByUser(userID, q)
}

func (s *NotificationService) MarkRead(id, userID uuid.UUID) error {
	return s.repo.MarkRead(id, userID)
}

func (s *NotificationService) MarkAllRead(userID uuid.UUID) error {
	return s.repo.MarkAllRead(userID)
}

func (s *NotificationService) UnreadCount(userID uuid.UUID) (int64, error) {
	return s.repo.UnreadCount(userID)
}

// SendNotification creates a Notification record for each userID in the given list.
func (s *NotificationService) SendNotification(userIDs []uuid.UUID, title, content, nType, refType string, refID *uuid.UUID) error {
	if len(userIDs) == 0 {
		return nil
	}

	notifications := make([]models.Notification, 0, len(userIDs))
	for _, uid := range userIDs {
		notifications = append(notifications, models.Notification{
			UserID:  uid,
			Title:   title,
			Content: content,
			Type:    nType,
			RefType: refType,
			RefID:   refID,
		})
	}

	return s.repo.BatchCreate(notifications)
}
