package integration

import (
	"bytes"
	"encoding/json"
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

	gin.SetMode(gin.TestMode)
	r := gin.Default()
	router.Setup(r, db, enforcer, testJWTSecret, 24)

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
