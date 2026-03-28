package middleware

import (
	"net/http"

	"github.com/casbin/casbin/v2"
	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func CasbinRBAC(enforcer *casbin.Enforcer) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get(CtxUserID)
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, dto.Fail(401, "unauthorized"))
			return
		}

		sub := userID.(uuid.UUID).String()
		obj := c.Request.URL.Path
		act := c.Request.Method

		allowed, err := enforcer.Enforce(sub, obj, act)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, dto.Fail(500, "permission check failed"))
			return
		}

		if !allowed {
			c.AbortWithStatusJSON(http.StatusForbidden, dto.Fail(403, "permission denied"))
			return
		}

		c.Next()
	}
}
