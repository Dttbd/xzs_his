package integration

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/internal/router"
	"github.com/dttbd/hospital-server/internal/service"
	casbinpkg "github.com/dttbd/hospital-server/pkg/casbin"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

const testDSN = "host=localhost port=5432 user=hospital password=hospital123 dbname=hospital_db_test sslmode=disable"
const testJWTSecret = "test-jwt-secret"

func setupTestServer(t *testing.T) (*gin.Engine, *gorm.DB) {
	t.Helper()

	db, err := gorm.Open(postgres.Open(testDSN), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Skipf("skipping integration test: DB not available: %v", err)
	}

	sqlDB, _ := db.DB()
	t.Cleanup(func() { sqlDB.Close() })

	// Clean and migrate
	db.Exec("DROP SCHEMA public CASCADE")
	db.Exec("CREATE SCHEMA public")
	models.AutoMigrate(db)

	enforcer, err := casbinpkg.NewEnforcer(db)
	if err != nil {
		t.Fatalf("failed to init casbin: %v", err)
	}

	// Seed admin
	adminRole := models.Role{Name: "系统管理员", Code: "admin", IsSystem: true, Status: 1}
	db.Create(&adminRole)

	hash, _ := service.HashPassword("admin123")
	adminUser := models.User{Username: "admin", PasswordHash: hash, RealName: "Admin", Status: 1}
	db.Create(&adminUser)
	db.Model(&adminUser).Association("Roles").Append(&adminRole)

	casbinpkg.SetupDefaultPolicies(enforcer)

	// Seed ticket defaults
	if err := seedTicketDefaults(db); err != nil {
		t.Fatalf("failed to seed ticket defaults: %v", err)
	}

	gin.SetMode(gin.TestMode)
	r := gin.Default()
	router.Setup(r, db, enforcer, nil, testJWTSecret, 24, nil)

	return r, db
}

func loginAdmin(t *testing.T, r *gin.Engine) string {
	t.Helper()

	body, _ := json.Marshal(map[string]string{"username": "admin", "password": "admin123"})
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("login failed: %d %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	data := resp["data"].(map[string]interface{})
	return data["token"].(string)
}

func authReq(method, path string, body interface{}, token string) *http.Request {
	var reqBody *bytes.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		reqBody = bytes.NewReader(b)
	} else {
		reqBody = bytes.NewReader(nil)
	}

	req := httptest.NewRequest(method, path, reqBody)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	return req
}

func seedTicketDefaults(db *gorm.DB) error {
	// Default ticket types
	ticketTypes := []models.TicketType{
		{Name: "故障处理", Code: "fault"},
		{Name: "功能需求", Code: "feature"},
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
		{"suspended", "in_progress", "恢复处理"},
	}

	for _, tr := range transitions {
		fromStatus, ok := statusMap[tr.From]
		if !ok {
			log.Printf("WARNING: status %s not found, skipping transition %s->%s", tr.From, tr.From, tr.To)
			continue
		}
		toStatus, ok := statusMap[tr.To]
		if !ok {
			log.Printf("WARNING: status %s not found, skipping transition %s->%s", tr.To, tr.From, tr.To)
			continue
		}

		var existing models.TicketTransition
		err := db.Where("from_status_id = ? AND to_status_id = ?", fromStatus.ID, toStatus.ID).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			transition := models.TicketTransition{
				FromStatusID: fromStatus.ID,
				ToStatusID:   toStatus.ID,
				Name:         tr.Name,
				AllowedRoles: "[]",
			}
			if err := db.Create(&transition).Error; err != nil {
				return fmt.Errorf("failed to create transition %s->%s: %w", tr.From, tr.To, err)
			}
			log.Printf("created ticket transition: %s -> %s (%s)", tr.From, tr.To, tr.Name)
		} else if err != nil {
			return fmt.Errorf("failed to query transition %s->%s: %w", tr.From, tr.To, err)
		}
	}

	return nil
}
