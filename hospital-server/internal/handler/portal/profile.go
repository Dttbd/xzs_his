package portal

import (
	"net/http"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/middleware"
	"github.com/dttbd/hospital-server/internal/repository"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UpdateProfileReq struct {
	RealName  *string `json:"real_name"`
	Phone     *string `json:"phone"`
	Email     *string `json:"email"`
	AvatarURL *string `json:"avatar_url"`
}

type ProfileHandler struct {
	userRepo *repository.UserRepo
	userSvc  *service.UserService
}

func NewProfileHandler(userRepo *repository.UserRepo) *ProfileHandler {
	return &ProfileHandler{userRepo: userRepo, userSvc: service.NewUserService(userRepo)}
}

// GetProfile godoc
// @Summary      获取个人资料
// @Tags         portal-profile
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  dto.Response
// @Router       /api/portal/v1/profile [get]
func (h *ProfileHandler) GetProfile(c *gin.Context) {
	userID, ok := c.Get(middleware.CtxUserID)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail(401, "invalid user context"))
		return
	}
	uid := userID.(uuid.UUID)

	user, err := h.userRepo.GetByID(uid)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Fail(404, "user not found"))
		return
	}

	c.JSON(http.StatusOK, dto.OK(user))
}

// UpdateProfile godoc
// @Summary      更新个人资料
// @Tags         portal-profile
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      UpdateProfileReq  true  "资料信息"
// @Success      200   {object}  dto.Response
// @Router       /api/portal/v1/profile [put]
func (h *ProfileHandler) UpdateProfile(c *gin.Context) {
	userID, ok := c.Get(middleware.CtxUserID)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail(401, "invalid user context"))
		return
	}
	uid := userID.(uuid.UUID)

	user, err := h.userRepo.GetByID(uid)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Fail(404, "user not found"))
		return
	}

	var req UpdateProfileReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	// Only allow updating restricted fields
	if req.RealName != nil {
		user.RealName = *req.RealName
	}
	if req.Phone != nil {
		user.Phone = *req.Phone
	}
	if req.Email != nil {
		user.Email = *req.Email
	}
	if req.AvatarURL != nil {
		user.AvatarURL = *req.AvatarURL
	}

	if err := h.userRepo.Update(user); err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.OK(user))
}

// ChangePassword godoc
// @Summary      修改密码
// @Tags         portal-profile
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      dto.ChangePasswordReq  true  "密码信息"
// @Success      200   {object}  dto.Response
// @Router       /api/portal/v1/change-password [put]
func (h *ProfileHandler) ChangePassword(c *gin.Context) {
	userID, ok := c.Get(middleware.CtxUserID)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail(401, "invalid user context"))
		return
	}
	uid := userID.(uuid.UUID)

	var req dto.ChangePasswordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}
	if err := h.userSvc.ChangePassword(uid, &req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}
	c.JSON(http.StatusOK, dto.OKMsg("密码修改成功"))
}
