package service

import (
	"errors"
	"log"
	"time"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/internal/queue"
	"github.com/dttbd/hospital-server/internal/repository"
	"github.com/google/uuid"
)

type BulletinService struct {
	repo        *repository.BulletinRepo
	asynqClient *queue.Client
}

func NewBulletinService(repo *repository.BulletinRepo, asynqClient *queue.Client) *BulletinService {
	return &BulletinService{repo: repo, asynqClient: asynqClient}
}

func (s *BulletinService) List(q *dto.BulletinFilterQuery) ([]models.Bulletin, int64, error) {
	return s.repo.List(q)
}

func (s *BulletinService) GetByID(id uuid.UUID) (*models.Bulletin, error) {
	return s.repo.GetByID(id)
}

func (s *BulletinService) Create(req *dto.CreateBulletinReq, authorID uuid.UUID) (*models.Bulletin, error) {
	if req.ScopeType != "all" && req.ScopeID == nil {
		return nil, errors.New("scope_id is required when scope_type is region or province")
	}
	bulletin := &models.Bulletin{
		Title:     req.Title,
		Content:   req.Content,
		ScopeType: req.ScopeType,
		ScopeID:   req.ScopeID,
		AuthorID:  authorID,
		IsPinned:  req.IsPinned,
		ExpiresAt: req.ExpiresAt,
		Status:    0, // draft
	}
	if err := s.repo.Create(bulletin); err != nil {
		return nil, err
	}
	return bulletin, nil
}

func (s *BulletinService) Update(id uuid.UUID, req *dto.UpdateBulletinReq) (*models.Bulletin, error) {
	bulletin, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if req.Title != nil {
		bulletin.Title = *req.Title
	}
	if req.Content != nil {
		bulletin.Content = *req.Content
	}
	if req.ScopeType != nil {
		bulletin.ScopeType = *req.ScopeType
		if *req.ScopeType == "all" {
			bulletin.ScopeID = nil
		}
	}
	if req.ScopeID != nil {
		bulletin.ScopeID = req.ScopeID
	}
	if req.IsPinned != nil {
		bulletin.IsPinned = *req.IsPinned
	}
	if req.ExpiresAt != nil {
		bulletin.ExpiresAt = req.ExpiresAt
	}
	if req.Status != nil {
		bulletin.Status = *req.Status
	}

	if err := s.repo.Update(bulletin); err != nil {
		return nil, err
	}
	return bulletin, nil
}

func (s *BulletinService) Delete(id uuid.UUID) error {
	return s.repo.Delete(id)
}

func (s *BulletinService) Publish(id uuid.UUID) (*models.Bulletin, error) {
	bulletin, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	wasPublished := bulletin.Status == 1
	now := time.Now()
	bulletin.Status = 1
	bulletin.PublishedAt = &now

	if err := s.repo.Update(bulletin); err != nil {
		return nil, err
	}

	// Notify in-scope users only on the first draft->published transition.
	if !wasPublished && s.asynqClient != nil {
		s.notifyPublish(bulletin)
	}
	return bulletin, nil
}

// notifyPublish resolves recipients synchronously, then enqueues in-app +
// WeChat notifications asynchronously (mirrors the ticket notification pattern).
func (s *BulletinService) notifyPublish(b *models.Bulletin) {
	recipients, err := s.repo.ResolveRecipients(b.ScopeType, b.ScopeID, b.AuthorID)
	if err != nil {
		log.Printf("failed to resolve bulletin recipients: %v", err)
		return
	}
	if len(recipients) == 0 {
		return
	}
	bid := b.ID
	title := "新公告：" + b.Title
	content := b.Title // use title as preview; bulletin body can be long HTML
	go func() {
		if err := s.asynqClient.EnqueueNotification(&queue.NotificationPayload{
			UserIDs: recipients,
			Title:   title,
			Content: content,
			Type:    "bulletin",
			RefType: "bulletin",
			RefID:   &bid,
		}); err != nil {
			log.Printf("failed to enqueue bulletin notification: %v", err)
		}
		if werr := s.asynqClient.EnqueueWechatMsg(&queue.WechatMsgPayload{
			UserIDs: recipients,
			Title:   title,
			Content: content,
		}); werr != nil {
			log.Printf("failed to enqueue bulletin wechat msg: %v", werr)
		}
	}()
}
