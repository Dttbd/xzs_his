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

type TicketService struct {
	repo        *repository.TicketRepo
	asynqClient *queue.Client
}

func NewTicketService(repo *repository.TicketRepo, asynqClient *queue.Client) *TicketService {
	return &TicketService{repo: repo, asynqClient: asynqClient}
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

// --- Ticket Operations ---

func (s *TicketService) ListTickets(q *dto.TicketFilterQuery) ([]models.Ticket, int64, error) {
	return s.repo.ListTickets(q)
}

func (s *TicketService) GetTicket(id uuid.UUID) (*models.Ticket, error) {
	return s.repo.GetTicket(id)
}

func (s *TicketService) CreateTicket(creatorID uuid.UUID, req *dto.CreateTicketReq) (*models.Ticket, error) {
	// 1. Get initial status
	initialStatus, err := s.repo.GetInitialStatus()
	if err != nil {
		return nil, errors.New("no initial ticket status configured")
	}

	// 2. Generate ticket number
	ticketNo := s.repo.GenerateTicketNo()

	// 3. Create ticket
	ticket := &models.Ticket{
		TicketNo:    ticketNo,
		Title:       req.Title,
		Description: req.Description,
		TypeID:      req.TypeID,
		StatusID:    initialStatus.ID,
		Priority:    req.Priority,
		HospitalID:  req.HospitalID,
		CreatorID:   creatorID,
		AssigneeID:  req.AssigneeID,
	}

	if err := s.repo.CreateTicket(ticket); err != nil {
		return nil, err
	}

	// 4. Create log
	_ = s.repo.CreateLog(&models.TicketLog{
		TicketID: ticket.ID,
		UserID:   creatorID,
		Action:   "create",
		ToStatus: initialStatus.Name,
	})

	// 5. Notify assignee if set
	if s.asynqClient != nil && ticket.AssigneeID != nil {
		assigneeID := *ticket.AssigneeID
		ticketID := ticket.ID
		ticketTitle := ticket.Title
		go func() {
			err := s.asynqClient.EnqueueNotification(&queue.NotificationPayload{
				UserIDs: []uuid.UUID{assigneeID},
				Title:   "新工单分配给您",
				Content: ticketTitle,
				Type:    "ticket",
				RefType: "ticket",
				RefID:   &ticketID,
			})
			if err != nil {
				log.Printf("failed to enqueue notification: %v", err)
			}
			if werr := s.asynqClient.EnqueueWechatMsg(&queue.WechatMsgPayload{
				UserIDs: []uuid.UUID{assigneeID},
				Title:   "新工单分配给您",
				Content: ticketTitle,
			}); werr != nil {
				log.Printf("failed to enqueue wechat msg: %v", werr)
			}
		}()
	}

	// 6. Return with preloads
	return s.repo.GetTicket(ticket.ID)
}

func (s *TicketService) TransitionTicket(ticketID, userID uuid.UUID, req *dto.TransitionTicketReq) (*models.Ticket, error) {
	// 1. Get current ticket
	ticket, err := s.repo.GetTicket(ticketID)
	if err != nil {
		return nil, errors.New("ticket not found")
	}

	// 2. Get allowed transitions from current status
	transitions, err := s.repo.GetTransitionsByFromStatus(ticket.StatusID)
	if err != nil {
		return nil, err
	}

	// 3. Check if requested to_status_id is allowed
	var matchedTransition *models.TicketTransition
	for i := range transitions {
		if transitions[i].ToStatusID == req.ToStatusID {
			matchedTransition = &transitions[i]
			break
		}
	}

	if matchedTransition == nil {
		return nil, errors.New("invalid transition")
	}

	// 4. Record old status name for the log
	fromStatusName := ticket.Status.Name

	// 5. Update ticket status
	ticket.StatusID = req.ToStatusID

	// 6. If new status is terminal, set resolved_at
	if matchedTransition.ToStatus.IsTerminal {
		now := time.Now()
		ticket.ResolvedAt = &now
	}

	if err := s.repo.UpdateTicket(ticket); err != nil {
		return nil, err
	}

	// 7. Create log
	_ = s.repo.CreateLog(&models.TicketLog{
		TicketID:   ticket.ID,
		UserID:     userID,
		Action:     "transition",
		FromStatus: fromStatusName,
		ToStatus:   matchedTransition.ToStatus.Name,
	})

	// 8. Notify ticket creator about status change
	if s.asynqClient != nil {
		creatorID := ticket.CreatorID
		ticketID := ticket.ID
		toStatusName := matchedTransition.ToStatus.Name
		go func() {
			err := s.asynqClient.EnqueueNotification(&queue.NotificationPayload{
				UserIDs: []uuid.UUID{creatorID},
				Title:   "工单状态已更新",
				Content: "工单「" + ticket.Title + "」已流转至：" + toStatusName,
				Type:    "ticket",
				RefType: "ticket",
				RefID:   &ticketID,
			})
			if err != nil {
				log.Printf("failed to enqueue notification: %v", err)
			}
			if werr := s.asynqClient.EnqueueWechatMsg(&queue.WechatMsgPayload{
				UserIDs: []uuid.UUID{creatorID},
				Title:   "工单状态已更新",
				Content: "工单「" + ticket.Title + "」已流转至：" + toStatusName,
			}); werr != nil {
				log.Printf("failed to enqueue wechat msg: %v", werr)
			}
		}()
	}

	// 9. Return updated ticket
	return s.repo.GetTicket(ticket.ID)
}

func (s *TicketService) AssignTicket(ticketID, userID uuid.UUID, req *dto.AssignTicketReq) (*models.Ticket, error) {
	// 1. Get ticket
	ticket, err := s.repo.GetTicket(ticketID)
	if err != nil {
		return nil, errors.New("ticket not found")
	}

	// 2. Update assignee
	ticket.AssigneeID = &req.AssigneeID

	if err := s.repo.UpdateTicket(ticket); err != nil {
		return nil, err
	}

	// 3. Create log
	_ = s.repo.CreateLog(&models.TicketLog{
		TicketID: ticket.ID,
		UserID:   userID,
		Action:   "assign",
		Detail:   `{"assignee_id":"` + req.AssigneeID.String() + `"}`,
	})

	// 4. Notify new assignee
	if s.asynqClient != nil {
		assigneeID := req.AssigneeID
		ticketID := ticket.ID
		ticketTitle := ticket.Title
		go func() {
			err := s.asynqClient.EnqueueNotification(&queue.NotificationPayload{
				UserIDs: []uuid.UUID{assigneeID},
				Title:   "工单已分配给您",
				Content: ticketTitle,
				Type:    "ticket",
				RefType: "ticket",
				RefID:   &ticketID,
			})
			if err != nil {
				log.Printf("failed to enqueue notification: %v", err)
			}
			if werr := s.asynqClient.EnqueueWechatMsg(&queue.WechatMsgPayload{
				UserIDs: []uuid.UUID{assigneeID},
				Title:   "工单已分配给您",
				Content: ticketTitle,
			}); werr != nil {
				log.Printf("failed to enqueue wechat msg: %v", werr)
			}
		}()
	}

	// 5. Return updated ticket
	return s.repo.GetTicket(ticket.ID)
}

func (s *TicketService) AddComment(ticketID, userID uuid.UUID, req *dto.CreateCommentReq) (*models.TicketComment, error) {
	comment := &models.TicketComment{
		TicketID:   ticketID,
		UserID:     userID,
		Content:    req.Content,
		IsInternal: req.IsInternal,
	}

	if err := s.repo.CreateComment(comment); err != nil {
		return nil, err
	}

	// Create log
	_ = s.repo.CreateLog(&models.TicketLog{
		TicketID: ticketID,
		UserID:   userID,
		Action:   "comment",
	})

	// Notify the other party: if commenter is creator, notify assignee; if commenter is assignee, notify creator
	if s.asynqClient != nil {
		ticket, err := s.repo.GetTicket(ticketID)
		if err == nil {
			var recipientIDs []uuid.UUID
			if userID == ticket.CreatorID {
				// commenter is creator, notify assignee
				if ticket.AssigneeID != nil {
					recipientIDs = []uuid.UUID{*ticket.AssigneeID}
				}
			} else {
				// commenter is assignee (or other), notify creator
				recipientIDs = []uuid.UUID{ticket.CreatorID}
			}
			if len(recipientIDs) > 0 {
				ticketRef := ticketID
				go func() {
					err := s.asynqClient.EnqueueNotification(&queue.NotificationPayload{
						UserIDs: recipientIDs,
						Title:   "工单有新评论",
						Content: req.Content,
						Type:    "ticket",
						RefType: "ticket",
						RefID:   &ticketRef,
					})
					if err != nil {
						log.Printf("failed to enqueue notification: %v", err)
					}
					if werr := s.asynqClient.EnqueueWechatMsg(&queue.WechatMsgPayload{
						UserIDs: recipientIDs,
						Title:   "工单有新评论",
						Content: req.Content,
					}); werr != nil {
						log.Printf("failed to enqueue wechat msg: %v", werr)
					}
				}()
			}
		}
	}

	return comment, nil
}

func (s *TicketService) AddAttachment(ticketID, userID uuid.UUID, att *models.TicketAttachment) (*models.TicketAttachment, error) {
	att.TicketID = ticketID
	att.UploaderID = userID

	if err := s.repo.CreateAttachment(att); err != nil {
		return nil, err
	}

	return att, nil
}
