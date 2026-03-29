package main

import (
	"errors"
	"flag"
	"fmt"
	"log"

	"github.com/casbin/casbin/v3"
	"github.com/dttbd/hospital-server/internal/config"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/internal/queue"
	"github.com/dttbd/hospital-server/internal/router"
	"github.com/dttbd/hospital-server/internal/service"
	casbinpkg "github.com/dttbd/hospital-server/pkg/casbin"
	"github.com/dttbd/hospital-server/pkg/storage"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	configPath := flag.String("config", "configs/config.yaml", "config file path")
	flag.Parse()

	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	log.Println("database connected")

	if err := models.AutoMigrate(db); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}
	log.Println("database migrated")

	enforcer, err := casbinpkg.NewEnforcer(db)
	if err != nil {
		log.Fatalf("failed to init casbin enforcer: %v", err)
	}
	log.Println("casbin enforcer initialized")

	// MinIO (optional - skip if not available)
	var store *storage.Storage
	store, err = storage.NewStorage(
		cfg.MinIO.Endpoint,
		cfg.MinIO.AccessKey,
		cfg.MinIO.SecretKey,
		cfg.MinIO.Bucket,
		cfg.MinIO.UseSSL,
	)
	if err != nil {
		log.Printf("WARNING: MinIO not available: %v (file upload disabled)", err)
		store = nil
	}

	// Asynq client (for async tasks)
	redisAddr := fmt.Sprintf("%s:%d", cfg.Redis.Host, cfg.Redis.Port)
	asynqClient := queue.NewClient(redisAddr, cfg.Redis.Password, cfg.Redis.DB)
	defer asynqClient.Close()

	if err := seedDefaults(db, enforcer); err != nil {
		log.Fatalf("failed to seed defaults: %v", err)
	}
	log.Println("seed data applied")

	gin.SetMode(cfg.Server.Mode)
	r := gin.New()

	router.Setup(r, db, enforcer, store, cfg.JWT.Secret, cfg.JWT.ExpireHour, asynqClient)

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

func seedDefaults(db *gorm.DB, enforcer *casbin.Enforcer) error {
	// Default roles to create
	defaultRoles := []models.Role{
		{Code: "admin", Name: "Administrator", IsSystem: true, Status: 1},
		{Code: "region_manager", Name: "Region Manager", IsSystem: false, Status: 1},
		{Code: "province_manager", Name: "Province Manager", IsSystem: false, Status: 1},
		{Code: "sales", Name: "Sales", IsSystem: false, Status: 1},
		{Code: "presales", Name: "Pre-Sales", IsSystem: false, Status: 1},
		{Code: "aftersales", Name: "After-Sales", IsSystem: false, Status: 1},
		{Code: "support", Name: "Support", IsSystem: false, Status: 1},
		{Code: "customer", Name: "Customer", IsSystem: false, Status: 1},
	}

	for _, role := range defaultRoles {
		var existing models.Role
		err := db.Where("code = ?", role.Code).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if err := db.Create(&role).Error; err != nil {
				return fmt.Errorf("failed to create role %s: %w", role.Code, err)
			}
			log.Printf("created role: %s", role.Code)
		} else if err != nil {
			return fmt.Errorf("failed to query role %s: %w", role.Code, err)
		}
	}

	// Create admin user if not exists
	var adminUser models.User
	err := db.Where("username = ?", "admin").First(&adminUser).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		hashedPwd, err := service.HashPassword("admin123")
		if err != nil {
			return fmt.Errorf("failed to hash admin password: %w", err)
		}

		adminUser = models.User{
			Username:     "admin",
			PasswordHash: hashedPwd,
			RealName:     "Administrator",
			Status:       1,
		}
		if err := db.Create(&adminUser).Error; err != nil {
			return fmt.Errorf("failed to create admin user: %w", err)
		}
		log.Println("created admin user")

		// Associate admin user with admin role
		var adminRole models.Role
		if err := db.Where("code = ?", "admin").First(&adminRole).Error; err != nil {
			return fmt.Errorf("failed to find admin role: %w", err)
		}
		if err := db.Model(&adminUser).Association("Roles").Replace([]models.Role{adminRole}); err != nil {
			return fmt.Errorf("failed to assign admin role to admin user: %w", err)
		}
		log.Println("assigned admin role to admin user")
	} else if err != nil {
		return fmt.Errorf("failed to query admin user: %w", err)
	}

	// Setup default Casbin policies
	if err := casbinpkg.SetupDefaultPolicies(enforcer); err != nil {
		return fmt.Errorf("failed to setup default casbin policies: %w", err)
	}
	log.Println("casbin default policies applied")

	// Seed ticket defaults
	if err := seedTicketDefaults(db); err != nil {
		return fmt.Errorf("failed to seed ticket defaults: %w", err)
	}

	return nil
}

func seedTicketDefaults(db *gorm.DB) error {
	// Default ticket types
	ticketTypes := []models.TicketType{
		{Name: "故障处理", Code: "fault"},
		{Name: "功能需求", Code: "feature"},
		{Name: "市场反馈", Code: "market_feedback"},
		{Name: "客户之声", Code: "customer_voice"},
		{Name: "内部支持", Code: "internal_support"},
		{Name: "售前调研", Code: "presales_research"},
	}

	for _, tt := range ticketTypes {
		var existing models.TicketType
		err := db.Where("code = ?", tt.Code).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if err := db.Create(&tt).Error; err != nil {
				return fmt.Errorf("failed to create ticket type %s: %w", tt.Code, err)
			}
			log.Printf("created ticket type: %s", tt.Code)
		} else if err != nil {
			return fmt.Errorf("failed to query ticket type %s: %w", tt.Code, err)
		}
	}

	// Default ticket statuses
	ticketStatuses := []models.TicketStatus{
		{Name: "待处理", Code: "open", IsInitial: true, IsTerminal: false, Color: "#818cf8"},
		{Name: "处理中", Code: "in_progress", IsInitial: false, IsTerminal: false, Color: "#fb923c"},
		{Name: "已完结", Code: "resolved", IsInitial: false, IsTerminal: true, Color: "#34d399"},
		{Name: "已挂起", Code: "suspended", IsInitial: false, IsTerminal: false, Color: "#fbbf24"},
		{Name: "已转派", Code: "reassigned", IsInitial: false, IsTerminal: false, Color: "#a78bfa"},
		{Name: "已关闭", Code: "closed", IsInitial: false, IsTerminal: true, Color: "#64748b"},
	}

	for _, ts := range ticketStatuses {
		var existing models.TicketStatus
		err := db.Where("code = ?", ts.Code).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if err := db.Create(&ts).Error; err != nil {
				return fmt.Errorf("failed to create ticket status %s: %w", ts.Code, err)
			}
			log.Printf("created ticket status: %s", ts.Code)
		} else if err != nil {
			return fmt.Errorf("failed to query ticket status %s: %w", ts.Code, err)
		}
	}

	// Look up status IDs by code for transitions
	statusMap := make(map[string]models.TicketStatus)
	var allStatuses []models.TicketStatus
	if err := db.Find(&allStatuses).Error; err != nil {
		return fmt.Errorf("failed to fetch ticket statuses: %w", err)
	}
	for _, s := range allStatuses {
		statusMap[s.Code] = s
	}

	// Default transitions
	transitions := []struct {
		From string
		To   string
		Name string
	}{
		{"open", "in_progress", "接单"},
		{"in_progress", "resolved", "完结"},
		{"in_progress", "suspended", "挂起"},
		{"in_progress", "reassigned", "转派"},
		{"suspended", "in_progress", "恢复处理"},
		{"suspended", "closed", "关闭"},
		{"reassigned", "in_progress", "接单处理"},
	}

	for _, t := range transitions {
		fromStatus, ok := statusMap[t.From]
		if !ok {
			log.Printf("WARNING: status %s not found, skipping transition %s->%s", t.From, t.From, t.To)
			continue
		}
		toStatus, ok := statusMap[t.To]
		if !ok {
			log.Printf("WARNING: status %s not found, skipping transition %s->%s", t.To, t.From, t.To)
			continue
		}

		var existing models.TicketTransition
		err := db.Where("from_status_id = ? AND to_status_id = ?", fromStatus.ID, toStatus.ID).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			transition := models.TicketTransition{
				FromStatusID: fromStatus.ID,
				ToStatusID:   toStatus.ID,
				Name:         t.Name,
			}
			if err := db.Create(&transition).Error; err != nil {
				return fmt.Errorf("failed to create transition %s->%s: %w", t.From, t.To, err)
			}
			log.Printf("created ticket transition: %s -> %s (%s)", t.From, t.To, t.Name)
		} else if err != nil {
			return fmt.Errorf("failed to query transition %s->%s: %w", t.From, t.To, err)
		}
	}

	return nil
}
