package admin

import (
	"net/http"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/middleware"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/dttbd/hospital-server/pkg/wechat"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AuthHandler struct {
	svc    *service.AuthService
	wechat wechat.SSOClient
}

func NewAuthHandler(svc *service.AuthService, wc wechat.SSOClient) *AuthHandler {
	return &AuthHandler{svc: svc, wechat: wc}
}

// Login godoc
// @Summary      用户登录
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      dto.LoginReq  true  "登录信息"
// @Success      200   {object}  dto.Response{data=dto.LoginResp}
// @Failure      400   {object}  dto.Response
// @Failure      401   {object}  dto.Response
// @Router       /api/auth/login [post]
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

// WechatURL godoc
// @Summary      获取企业微信登录授权URL
// @Tags         auth
// @Produce      json
// @Param        state  query     string  false  "状态参数"
// @Success      200    {object}  dto.Response
// @Router       /api/auth/wechat/url [get]
func (h *AuthHandler) WechatURL(c *gin.Context) {
	state := c.Query("state")
	c.JSON(http.StatusOK, dto.OK(gin.H{"url": h.wechat.AuthURL(state)}))
}

// WechatCallback godoc
// @Summary      企业微信登录回调
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      dto.WechatCallbackReq  true  "回调参数"
// @Success      200   {object}  dto.Response{data=dto.LoginResp}
// @Failure      401   {object}  dto.Response
// @Router       /api/auth/wechat/callback [post]
func (h *AuthHandler) WechatCallback(c *gin.Context) {
	var req dto.WechatCallbackReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}
	resp, err := h.svc.LoginByWechatCode(c.Request.Context(), req.Code)
	if err != nil {
		c.JSON(http.StatusUnauthorized, dto.Fail(401, err.Error()))
		return
	}
	c.JSON(http.StatusOK, dto.OK(resp))
}

// WechatDevLogin godoc
// @Summary      企业微信开发模拟登录（仅 mock 模式可用）
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      dto.WechatDevLoginReq  true  "开发登录参数"
// @Success      200   {object}  dto.Response{data=dto.LoginResp}
// @Failure      401   {object}  dto.Response
// @Router       /api/auth/wechat/dev-login [post]
func (h *AuthHandler) WechatDevLogin(c *gin.Context) {
	var req dto.WechatDevLoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}
	resp, err := h.svc.LoginByWechatUserID(c.Request.Context(), req.WechatUserID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, dto.Fail(401, err.Error()))
		return
	}
	c.JSON(http.StatusOK, dto.OK(resp))
}

// Refresh godoc
// @Summary      刷新 Token
// @Tags         auth
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  dto.Response{data=dto.LoginResp}
// @Router       /api/admin/v1/auth/refresh [post]
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

// Logout godoc
// @Summary      用户登出
// @Tags         auth
// @Produce      json
// @Success      200  {object}  dto.Response
// @Router       /api/auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	c.JSON(http.StatusOK, dto.OKMsg("logged out"))
}
