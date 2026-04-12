package portal

import (
	"net/http"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/middleware"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type TicketHandler struct {
	svc *service.TicketService
}

func NewTicketHandler(svc *service.TicketService) *TicketHandler {
	return &TicketHandler{svc: svc}
}

func (h *TicketHandler) ListTickets(c *gin.Context) {
	var q dto.TicketFilterQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	userID, ok := c.Get(middleware.CtxUserID)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail(401, "invalid user context"))
		return
	}
	uid := userID.(uuid.UUID)

	// Customers can only see their own tickets
	q.CreatorID = &uid

	tickets, total, err := h.svc.ListTickets(&q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.PageOK(tickets, total, q.Page, q.PageSize))
}

func (h *TicketHandler) GetTicket(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	userID, ok := c.Get(middleware.CtxUserID)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail(401, "invalid user context"))
		return
	}
	uid := userID.(uuid.UUID)

	ticket, err := h.svc.GetTicket(id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Fail(404, "ticket not found"))
		return
	}

	// Verify ownership
	if ticket.CreatorID != uid {
		c.JSON(http.StatusForbidden, dto.Fail(403, "access denied"))
		return
	}

	// Filter out internal comments
	var publicComments []models.TicketComment
	for _, comment := range ticket.Comments {
		if !comment.IsInternal {
			publicComments = append(publicComments, comment)
		}
	}
	ticket.Comments = publicComments

	c.JSON(http.StatusOK, dto.OK(ticket))
}

func (h *TicketHandler) CreateTicket(c *gin.Context) {
	var req dto.CreateTicketReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	creatorID, ok := c.Get(middleware.CtxUserID)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail(401, "invalid user context"))
		return
	}
	uid := creatorID.(uuid.UUID)

	ticket, err := h.svc.CreateTicket(uid, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusCreated, dto.OK(ticket))
}

func (h *TicketHandler) AddComment(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	userID, ok := c.Get(middleware.CtxUserID)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail(401, "invalid user context"))
		return
	}
	uid := userID.(uuid.UUID)

	// Verify ownership
	ticket, err := h.svc.GetTicket(id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Fail(404, "ticket not found"))
		return
	}
	if ticket.CreatorID != uid {
		c.JSON(http.StatusForbidden, dto.Fail(403, "access denied"))
		return
	}

	var req dto.CreateCommentReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	// Force is_internal=false for portal users
	req.IsInternal = false

	comment, err := h.svc.AddComment(id, uid, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusCreated, dto.OK(comment))
}

func (h *TicketHandler) AddAttachment(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	userID, ok := c.Get(middleware.CtxUserID)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail(401, "invalid user context"))
		return
	}
	uid := userID.(uuid.UUID)

	// Verify ownership
	ticket, err := h.svc.GetTicket(id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Fail(404, "ticket not found"))
		return
	}
	if ticket.CreatorID != uid {
		c.JSON(http.StatusForbidden, dto.Fail(403, "access denied"))
		return
	}

	var req dto.CreateAttachmentReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	att := &models.TicketAttachment{
		FileName: req.FileName,
		FileURL:  req.FileURL,
		FileSize: req.FileSize,
		FileType: req.FileType,
	}

	result, err := h.svc.AddAttachment(id, uid, att)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusCreated, dto.OK(result))
}
