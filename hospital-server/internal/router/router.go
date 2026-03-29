package router

import (
	"github.com/casbin/casbin/v3"
	"github.com/dttbd/hospital-server/internal/handler/admin"
	"github.com/dttbd/hospital-server/internal/middleware"
	"github.com/dttbd/hospital-server/internal/queue"
	"github.com/dttbd/hospital-server/internal/repository"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/dttbd/hospital-server/pkg/storage"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Setup(r *gin.Engine, db *gorm.DB, enforcer *casbin.Enforcer, store *storage.Storage, jwtSecret string, jwtExpireH int, asynqClient *queue.Client) {
	// Repositories
	userRepo := repository.NewUserRepo(db)
	orgRepo := repository.NewOrganizationRepo(db)
	roleRepo := repository.NewRoleRepo(db)
	hospitalRepo := repository.NewHospitalRepo(db)
	ticketRepo := repository.NewTicketRepo(db)
	bulletinRepo := repository.NewBulletinRepo(db)
	notificationRepo := repository.NewNotificationRepo(db)
	reportRepo := repository.NewReportRepo(db)

	// Services
	authSvc := service.NewAuthService(db, jwtSecret, jwtExpireH)
	userSvc := service.NewUserService(userRepo)
	orgSvc := service.NewOrganizationService(orgRepo)
	roleSvc := service.NewRoleService(roleRepo, enforcer)
	hospitalSvc := service.NewHospitalService(hospitalRepo)
	ticketSvc := service.NewTicketService(ticketRepo, asynqClient)
	bulletinSvc := service.NewBulletinService(bulletinRepo)
	notificationSvc := service.NewNotificationService(notificationRepo)
	reportSvc := service.NewReportService(reportRepo)

	// Handlers
	authH := admin.NewAuthHandler(authSvc)
	userH := admin.NewUserHandler(userSvc)
	orgH := admin.NewOrganizationHandler(orgSvc)
	roleH := admin.NewRoleHandler(roleSvc)
	hospitalH := admin.NewHospitalHandler(hospitalSvc)
	ticketH := admin.NewTicketHandler(ticketSvc)
	ticketConfigH := admin.NewTicketConfigHandler(ticketSvc)
	bulletinH := admin.NewBulletinHandler(bulletinSvc)
	notificationH := admin.NewNotificationHandler(notificationSvc)
	reportH := admin.NewReportHandler(reportSvc)

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

		// Roles
		adminV1.GET("/roles", roleH.List)
		adminV1.POST("/roles", roleH.Create)
		adminV1.GET("/roles/:id", roleH.Get)
		adminV1.PUT("/roles/:id", roleH.Update)
		adminV1.DELETE("/roles/:id", roleH.Delete)
		adminV1.PUT("/roles/:id/permissions", roleH.SetPermissions)

		// Hospitals — static routes before :id to avoid conflicts
		adminV1.GET("/hospitals/summary", hospitalH.Summary)
		adminV1.GET("/hospitals/export", hospitalH.ExportExcel)
		adminV1.GET("/hospitals", hospitalH.ListHospitals)
		adminV1.POST("/hospitals", hospitalH.CreateHospital)
		adminV1.GET("/hospitals/:id", hospitalH.GetHospital)
		adminV1.PUT("/hospitals/:id", hospitalH.UpdateHospital)
		adminV1.DELETE("/hospitals/:id", hospitalH.DeleteHospital)

		// Hospital Categories
		adminV1.GET("/hospital-categories", hospitalH.ListCategories)
		adminV1.POST("/hospital-categories", hospitalH.CreateCategory)
		adminV1.GET("/hospital-categories/:id", hospitalH.GetCategory)
		adminV1.PUT("/hospital-categories/:id", hospitalH.UpdateCategory)
		adminV1.DELETE("/hospital-categories/:id", hospitalH.DeleteCategory)

		// Field Definitions
		adminV1.GET("/field-definitions", hospitalH.ListFieldDefs)
		adminV1.POST("/field-definitions", hospitalH.CreateFieldDef)
		adminV1.GET("/field-definitions/:id", hospitalH.GetFieldDef)
		adminV1.PUT("/field-definitions/:id", hospitalH.UpdateFieldDef)
		adminV1.DELETE("/field-definitions/:id", hospitalH.DeleteFieldDef)

		// Tickets
		adminV1.GET("/tickets", ticketH.ListTickets)
		adminV1.POST("/tickets", ticketH.CreateTicket)
		adminV1.GET("/tickets/:id", ticketH.GetTicket)
		adminV1.PUT("/tickets/:id/transition", ticketH.TransitionTicket)
		adminV1.PUT("/tickets/:id/assign", ticketH.AssignTicket)
		adminV1.POST("/tickets/:id/comments", ticketH.AddComment)
		adminV1.POST("/tickets/:id/attachments", ticketH.UploadAttachment)

		// Ticket Types
		adminV1.GET("/ticket-types", ticketConfigH.ListTicketTypes)
		adminV1.POST("/ticket-types", ticketConfigH.CreateTicketType)
		adminV1.GET("/ticket-types/:id", ticketConfigH.GetTicketType)
		adminV1.PUT("/ticket-types/:id", ticketConfigH.UpdateTicketType)
		adminV1.DELETE("/ticket-types/:id", ticketConfigH.DeleteTicketType)

		// Ticket Statuses
		adminV1.GET("/ticket-statuses", ticketConfigH.ListTicketStatuses)
		adminV1.POST("/ticket-statuses", ticketConfigH.CreateTicketStatus)
		adminV1.GET("/ticket-statuses/:id", ticketConfigH.GetTicketStatus)
		adminV1.PUT("/ticket-statuses/:id", ticketConfigH.UpdateTicketStatus)
		adminV1.DELETE("/ticket-statuses/:id", ticketConfigH.DeleteTicketStatus)

		// Ticket Transitions
		adminV1.GET("/ticket-transitions", ticketConfigH.ListTransitions)
		adminV1.POST("/ticket-transitions", ticketConfigH.CreateTransition)
		adminV1.GET("/ticket-transitions/:id", ticketConfigH.GetTransition)
		adminV1.PUT("/ticket-transitions/:id", ticketConfigH.UpdateTransition)
		adminV1.DELETE("/ticket-transitions/:id", ticketConfigH.DeleteTransition)

		// Bulletins
		adminV1.GET("/bulletins", bulletinH.List)
		adminV1.POST("/bulletins", bulletinH.Create)
		adminV1.GET("/bulletins/:id", bulletinH.Get)
		adminV1.PUT("/bulletins/:id", bulletinH.Update)
		adminV1.DELETE("/bulletins/:id", bulletinH.Delete)
		adminV1.PUT("/bulletins/:id/publish", bulletinH.Publish)

		// Notifications (current user)
		adminV1.GET("/notifications", notificationH.List)
		adminV1.GET("/notifications/unread-count", notificationH.UnreadCount)
		adminV1.PUT("/notifications/read-all", notificationH.MarkAllRead)
		adminV1.PUT("/notifications/:id/read", notificationH.MarkRead)

		// Reports
		adminV1.GET("/reports/overview", reportH.Overview)
		adminV1.GET("/reports/hospital-stats", reportH.HospitalStats)
		adminV1.GET("/reports/ticket-stats", reportH.TicketStats)
		adminV1.GET("/reports/ticket-trend", reportH.TicketTrend)
		adminV1.GET("/reports/sales-stats", reportH.SalesStats)
	}

	// Common file endpoints (no admin auth group required for GetFile)
	commonV1 := r.Group("/api/common/v1")
	if store != nil {
		uploadH := admin.NewUploadHandler(store)
		commonV1.POST("/upload", middleware.JWTAuth(jwtSecret), uploadH.Upload)
		commonV1.GET("/files/:id", uploadH.GetFile)
	}
}
