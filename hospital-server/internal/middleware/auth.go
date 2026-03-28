package middleware

import (
	"net/http"
	"strings"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/pkg/auth"
	"github.com/gin-gonic/gin"
)

const (
	CtxUserID   = "user_id"
	CtxUsername = "username"
)

func JWTAuth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, dto.Fail(401, "missing authorization header"))
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, dto.Fail(401, "invalid authorization format"))
			return
		}

		claims, err := auth.ParseToken(secret, parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, dto.Fail(401, "invalid or expired token"))
			return
		}

		c.Set(CtxUserID, claims.UserID)
		c.Set(CtxUsername, claims.Username)
		c.Next()
	}
}
