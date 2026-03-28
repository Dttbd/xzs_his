package admin

import (
	"net/http"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/middleware"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// TicketHandler handles ticket operations (not config — that's in ticket_config.go)
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

	ticket, err := h.svc.GetTicket(id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Fail(404, "ticket not found"))
		return
	}

	c.JSON(http.StatusOK, dto.OK(ticket))
}

func (h *TicketHandler) CreateTicket(c *gin.Context) {
	var req dto.CreateTicketReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	creatorID, _ := c.Get(middleware.CtxUserID)
	uid, ok := creatorID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail(401, "invalid user context"))
		return
	}

	ticket, err := h.svc.CreateTicket(uid, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusCreated, dto.OK(ticket))
}

func (h *TicketHandler) TransitionTicket(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	var req dto.TransitionTicketReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	userID, _ := c.Get(middleware.CtxUserID)
	uid, ok := userID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail(401, "invalid user context"))
		return
	}

	ticket, err := h.svc.TransitionTicket(id, uid, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.OK(ticket))
}

func (h *TicketHandler) AssignTicket(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	var req dto.AssignTicketReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	userID, _ := c.Get(middleware.CtxUserID)
	uid, ok := userID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail(401, "invalid user context"))
		return
	}

	ticket, err := h.svc.AssignTicket(id, uid, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.OK(ticket))
}

func (h *TicketHandler) AddComment(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	var req dto.CreateCommentReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	userID, _ := c.Get(middleware.CtxUserID)
	uid, ok := userID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail(401, "invalid user context"))
		return
	}

	comment, err := h.svc.AddComment(id, uid, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusCreated, dto.OK(comment))
}

func (h *TicketHandler) UploadAttachment(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	var req dto.CreateAttachmentReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	userID, _ := c.Get(middleware.CtxUserID)
	uid, ok := userID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail(401, "invalid user context"))
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
