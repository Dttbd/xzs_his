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

// ListTickets godoc
// @Summary      工单列表
// @Tags         tickets
// @Produce      json
// @Security     BearerAuth
// @Param        page       query     int     false  "页码"
// @Param        page_size  query     int     false  "每页数量"
// @Success      200        {object}  dto.Response{data=dto.PageResult}
// @Router       /api/admin/v1/tickets [get]
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

// GetTicket godoc
// @Summary      获取工单
// @Tags         tickets
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "工单 ID"
// @Success      200  {object}  dto.Response
// @Router       /api/admin/v1/tickets/{id} [get]
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

// CreateTicket godoc
// @Summary      创建工单
// @Tags         tickets
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      dto.CreateTicketReq  true  "工单信息"
// @Success      201   {object}  dto.Response
// @Router       /api/admin/v1/tickets [post]
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

// TransitionTicket godoc
// @Summary      工单状态流转
// @Tags         tickets
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      string                   true  "工单 ID"
// @Param        body  body      dto.TransitionTicketReq  true  "流转信息"
// @Success      200   {object}  dto.Response
// @Router       /api/admin/v1/tickets/{id}/transition [put]
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

// AssignTicket godoc
// @Summary      工单派单
// @Tags         tickets
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      string               true  "工单 ID"
// @Param        body  body      dto.AssignTicketReq  true  "派单信息"
// @Success      200   {object}  dto.Response
// @Router       /api/admin/v1/tickets/{id}/assign [put]
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

// AddComment godoc
// @Summary      添加评论
// @Tags         tickets
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      string                true  "工单 ID"
// @Param        body  body      dto.CreateCommentReq  true  "评论内容"
// @Success      201   {object}  dto.Response
// @Router       /api/admin/v1/tickets/{id}/comments [post]
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
