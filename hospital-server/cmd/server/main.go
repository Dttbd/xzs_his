package main

import (
	"errors"
	"flag"
	"fmt"
	"log"

	"github.com/casbin/casbin/v2"
	"github.com/dttbd/hospital-server/internal/config"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/internal/router"
	"github.com/dttbd/hospital-server/internal/service"
	casbinpkg "github.com/dttbd/hospital-server/pkg/casbin"
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

	if err := seedDefaults(db, enforcer); err != nil {
		log.Fatalf("failed to seed defaults: %v", err)
	}
	log.Println("seed data applied")

	gin.SetMode(cfg.Server.Mode)
	r := gin.New()

	router.Setup(r, db, enforcer, cfg.JWT.Secret, cfg.JWT.ExpireHour)

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

	return nil
}
