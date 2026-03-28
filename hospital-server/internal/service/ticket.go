package service

import (
	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/internal/repository"
	"github.com/google/uuid"
)

type TicketService struct {
	repo *repository.TicketRepo
}

func NewTicketService(repo *repository.TicketRepo) *TicketService {
	return &TicketService{repo: repo}
}

// TicketType methods

func (s *TicketService) ListTicketTypes(q *dto.PageQuery) ([]models.TicketType, int64, error) {
	return s.repo.ListTicketTypes(q)
}

func (s *TicketService) GetTicketType(id uuid.UUID) (*models.TicketType, error) {
	return s.repo.GetTicketType(id)
}

func (s *TicketService) CreateTicketType(req *dto.CreateTicketTypeReq) (*models.TicketType, error) {
	t := &models.TicketType{
		Name:        req.Name,
		Code:        req.Code,
		Icon:        req.Icon,
		Description: req.Description,
		SortOrder:   req.SortOrder,
	}
	if err := s.repo.CreateTicketType(t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *TicketService) UpdateTicketType(id uuid.UUID, req *dto.UpdateTicketTypeReq) (*models.TicketType, error) {
	t, err := s.repo.GetTicketType(id)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		t.Name = *req.Name
	}
	if req.Code != nil {
		t.Code = *req.Code
	}
	if req.Icon != nil {
		t.Icon = *req.Icon
	}
	if req.Description != nil {
		t.Description = *req.Description
	}
	if req.IsActive != nil {
		t.IsActive = *req.IsActive
	}
	if req.SortOrder != nil {
		t.SortOrder = *req.SortOrder
	}

	if err := s.repo.UpdateTicketType(t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *TicketService) DeleteTicketType(id uuid.UUID) error {
	return s.repo.DeleteTicketType(id)
}

// TicketStatus methods

func (s *TicketService) ListTicketStatuses(q *dto.PageQuery) ([]models.TicketStatus, int64, error) {
	return s.repo.ListTicketStatuses(q)
}

func (s *TicketService) GetTicketStatus(id uuid.UUID) (*models.TicketStatus, error) {
	return s.repo.GetTicketStatus(id)
}

func (s *TicketService) CreateTicketStatus(req *dto.CreateTicketStatusReq) (*models.TicketStatus, error) {
	s_ := &models.TicketStatus{
		Name:       req.Name,
		Code:       req.Code,
		Color:      req.Color,
		IsInitial:  req.IsInitial,
		IsTerminal: req.IsTerminal,
		SortOrder:  req.SortOrder,
	}
	if err := s.repo.CreateTicketStatus(s_); err != nil {
		return nil, err
	}
	return s_, nil
}

func (s *TicketService) UpdateTicketStatus(id uuid.UUID, req *dto.UpdateTicketStatusReq) (*models.TicketStatus, error) {
	st, err := s.repo.GetTicketStatus(id)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		st.Name = *req.Name
	}
	if req.Code != nil {
		st.Code = *req.Code
	}
	if req.Color != nil {
		st.Color = *req.Color
	}
	if req.IsInitial != nil {
		st.IsInitial = *req.IsInitial
	}
	if req.IsTerminal != nil {
		st.IsTerminal = *req.IsTerminal
	}
	if req.SortOrder != nil {
		st.SortOrder = *req.SortOrder
	}

	if err := s.repo.UpdateTicketStatus(st); err != nil {
		return nil, err
	}
	return st, nil
}

func (s *TicketService) DeleteTicketStatus(id uuid.UUID) error {
	return s.repo.DeleteTicketStatus(id)
}

// TicketTransition methods

func (s *TicketService) ListTransitions(q *dto.PageQuery) ([]models.TicketTransition, int64, error) {
	return s.repo.ListTransitions(q)
}

func (s *TicketService) GetTransition(id uuid.UUID) (*models.TicketTransition, error) {
	return s.repo.GetTransition(id)
}

func (s *TicketService) CreateTransition(req *dto.CreateTransitionReq) (*models.TicketTransition, error) {
	t := &models.TicketTransition{
		FromStatusID: req.FromStatusID,
		ToStatusID:   req.ToStatusID,
		Name:         req.Name,
		AllowedRoles: req.AllowedRoles,
	}
	if err := s.repo.CreateTransition(t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *TicketService) UpdateTransition(id uuid.UUID, req *dto.UpdateTransitionReq) (*models.TicketTransition, error) {
	t, err := s.repo.GetTransition(id)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		t.Name = *req.Name
	}
	if req.AllowedRoles != nil {
		t.AllowedRoles = *req.AllowedRoles
	}

	if err := s.repo.UpdateTransition(t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *TicketService) DeleteTransition(id uuid.UUID) error {
	return s.repo.DeleteTransition(id)
}
