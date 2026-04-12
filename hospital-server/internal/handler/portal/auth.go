package portal

import (
	"net/http"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/middleware"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AuthHandler struct {
	svc *service.AuthService
}

func NewAuthHandler(svc *service.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

// Login godoc
// @Summary      门户登录
// @Tags         portal-auth
// @Accept       json
// @Produce      json
// @Param        body  body      dto.LoginReq  true  "登录信息"
// @Success      200   {object}  dto.Response{data=dto.LoginResp}
// @Failure      401   {object}  dto.Response
// @Router       /api/portal/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}
	resp, err := h.svc.Login(&req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, dto.Fail(401, err.Error()))
		return
	}
	c.JSON(http.StatusOK, dto.OK(resp))
}

// Refresh godoc
// @Summary      刷新 Token（门户）
// @Tags         portal-auth
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  dto.Response{data=dto.LoginResp}
// @Router       /api/portal/v1/auth/refresh [post]
func (h *AuthHandler) Refresh(c *gin.Context) {
	userID := c.MustGet(middleware.CtxUserID).(uuid.UUID)
	username := c.MustGet(middleware.CtxUsername).(string)
	resp, err := h.svc.RefreshToken(userID, username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, "failed to refresh token"))
		return
	}
	c.JSON(http.StatusOK, dto.OK(resp))
}
