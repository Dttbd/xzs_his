package portal

import (
	"net/http"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/middleware"
	"github.com/dttbd/hospital-server/internal/repository"
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
}

func NewProfileHandler(userRepo *repository.UserRepo) *ProfileHandler {
	return &ProfileHandler{userRepo: userRepo}
}

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
