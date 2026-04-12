package admin

import (
	"net/http"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/middleware"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UserHandler struct {
	svc *service.UserService
}

func NewUserHandler(svc *service.UserService) *UserHandler {
	return &UserHandler{svc: svc}
}

// List godoc
// @Summary      用户列表
// @Tags         users
// @Produce      json
// @Security     BearerAuth
// @Param        page       query     int     false  "页码"
// @Param        page_size  query     int     false  "每页数量"
// @Success      200        {object}  dto.Response{data=dto.PageResult}
// @Router       /api/admin/v1/users [get]
func (h *UserHandler) List(c *gin.Context) {
	var q dto.PageQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	users, total, err := h.svc.List(&q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.PageOK(users, total, q.Page, q.PageSize))
}

// Get godoc
// @Summary      获取用户
// @Tags         users
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "用户 ID"
// @Success      200  {object}  dto.Response
// @Router       /api/admin/v1/users/{id} [get]
func (h *UserHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid user id"))
		return
	}

	user, err := h.svc.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Fail(404, "user not found"))
		return
	}

	c.JSON(http.StatusOK, dto.OK(user))
}

// Create godoc
// @Summary      创建用户
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      dto.CreateUserReq  true  "用户信息"
// @Success      201   {object}  dto.Response
// @Router       /api/admin/v1/users [post]
func (h *UserHandler) Create(c *gin.Context) {
	var req dto.CreateUserReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	user, err := h.svc.Create(&req)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	c.JSON(http.StatusCreated, dto.OK(user))
}

// Update godoc
// @Summary      更新用户
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      string             true  "用户 ID"
// @Param        body  body      dto.UpdateUserReq  true  "用户信息"
// @Success      200   {object}  dto.Response
// @Router       /api/admin/v1/users/{id} [put]
func (h *UserHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid user id"))
		return
	}

	var req dto.UpdateUserReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	user, err := h.svc.Update(id, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.OK(user))
}

// Delete godoc
// @Summary      删除用户
// @Tags         users
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "用户 ID"
// @Success      200  {object}  dto.Response
// @Router       /api/admin/v1/users/{id} [delete]
func (h *UserHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid user id"))
		return
	}

	if err := h.svc.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.OKMsg("deleted"))
}

// ChangePassword godoc
// @Summary      修改密码
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      dto.ChangePasswordReq  true  "密码信息"
// @Success      200   {object}  dto.Response
// @Router       /api/admin/v1/users/change-password [put]
func (h *UserHandler) ChangePassword(c *gin.Context) {
	userID := c.MustGet(middleware.CtxUserID).(uuid.UUID)
	var req dto.ChangePasswordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}
	if err := h.svc.ChangePassword(userID, &req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}
	c.JSON(http.StatusOK, dto.OKMsg("密码修改成功"))
}

// SetRoles godoc
// @Summary      设置用户角色
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      string               true  "用户 ID"
// @Param        body  body      dto.SetUserRolesReq  true  "角色列表"
// @Success      200   {object}  dto.Response
// @Router       /api/admin/v1/users/{id}/roles [put]
func (h *UserHandler) SetRoles(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid user id"))
		return
	}

	var req dto.SetUserRolesReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	if err := h.svc.SetRoles(id, &req); err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.OKMsg("roles updated"))
}
