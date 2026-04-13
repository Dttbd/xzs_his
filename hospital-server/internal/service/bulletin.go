package service

import (
	"errors"
	"time"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/internal/repository"
	"github.com/google/uuid"
)

type BulletinService struct {
	repo *repository.BulletinRepo
}

func NewBulletinService(repo *repository.BulletinRepo) *BulletinService {
	return &BulletinService{repo: repo}
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

	now := time.Now()
	bulletin.Status = 1
	bulletin.PublishedAt = &now

	if err := s.repo.Update(bulletin); err != nil {
		return nil, err
	}
	return bulletin, nil
}
