package router

import (
	"github.com/casbin/casbin/v2"
	"github.com/dttbd/hospital-server/internal/handler/admin"
	"github.com/dttbd/hospital-server/internal/middleware"
	"github.com/dttbd/hospital-server/internal/repository"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Setup(r *gin.Engine, db *gorm.DB, enforcer *casbin.Enforcer, jwtSecret string, jwtExpireH int) {
	// Repositories
	userRepo := repository.NewUserRepo(db)
	orgRepo := repository.NewOrganizationRepo(db)

	// Services
	authSvc := service.NewAuthService(db, jwtSecret, jwtExpireH)
	userSvc := service.NewUserService(userRepo)
	orgSvc := service.NewOrganizationService(orgRepo)

	// Handlers
	authH := admin.NewAuthHandler(authSvc)
	userH := admin.NewUserHandler(userSvc)
	orgH := admin.NewOrganizationHandler(orgSvc)

	// Global middleware
	r.Use(middleware.CORS())
	r.Use(middleware.RequestLogger())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Auth routes (no auth required)
	authGroup := r.Group("/api/auth")
	{
		authGroup.POST("/login", authH.Login)
		authGroup.POST("/logout", authH.Logout)
	}

	// Admin API (auth required)
	adminV1 := r.Group("/api/admin/v1")
	adminV1.Use(middleware.JWTAuth(jwtSecret))
	{
		// Auth
		adminV1.POST("/auth/refresh", authH.Refresh)

		// Users
		adminV1.GET("/users", userH.List)
		adminV1.POST("/users", userH.Create)
		adminV1.GET("/users/:id", userH.Get)
		adminV1.PUT("/users/:id", userH.Update)
		adminV1.DELETE("/users/:id", userH.Delete)
		adminV1.PUT("/users/:id/roles", userH.SetRoles)

		// Regions
		adminV1.GET("/regions", orgH.ListRegions)
		adminV1.POST("/regions", orgH.CreateRegion)
		adminV1.GET("/regions/:id", orgH.GetRegion)
		adminV1.PUT("/regions/:id", orgH.UpdateRegion)
		adminV1.DELETE("/regions/:id", orgH.DeleteRegion)

		// Provinces
		adminV1.GET("/provinces", orgH.ListProvinces)
		adminV1.POST("/provinces", orgH.CreateProvince)
		adminV1.GET("/provinces/:id", orgH.GetProvince)
		adminV1.PUT("/provinces/:id", orgH.UpdateProvince)
		adminV1.DELETE("/provinces/:id", orgH.DeleteProvince)
	}
}
