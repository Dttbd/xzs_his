# Phase 1: Backend Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Go backend foundation with auth, user management, RBAC, and organization management — all fully tested and deployable via Docker Compose.

**Architecture:** Single Go service (Gin), Clean Architecture layers (handler → service → repository), PostgreSQL via GORM v2, Redis for cache/session, Casbin for RBAC, JWT for auth. Docker Compose for local development.

**Tech Stack:** Go 1.22+, Gin, GORM v2, PostgreSQL 16, Redis 7, Casbin v2, Viper (config), Swaggo (API docs), testify (testing), Docker Compose

---

## File Structure

```
hospital-server/
├── cmd/
│   └── server/
│       └── main.go                          # Entry point: load config, init DB, start Gin
├── internal/
│   ├── config/
│   │   └── config.go                        # Viper config loading, Config struct
│   ├── middleware/
│   │   ├── auth.go                          # JWT auth middleware
│   │   ├── casbin.go                        # Casbin RBAC middleware
│   │   ├── cors.go                          # CORS middleware
│   │   └── logger.go                        # Request logging middleware
│   ├── router/
│   │   └── router.go                        # Route registration
│   ├── models/
│   │   ├── base.go                          # BaseModel (ID, timestamps, soft delete)
│   │   ├── user.go                          # User, Role, UserRole models
│   │   ├── organization.go                  # Region, Province models
│   │   └── migrate.go                       # AutoMigrate all models
│   ├── dto/
│   │   ├── auth.go                          # Login request/response DTOs
│   │   ├── user.go                          # User CRUD DTOs
│   │   ├── organization.go                  # Region/Province DTOs
│   │   └── common.go                        # Pagination, API response wrapper
│   ├── repository/
│   │   ├── user.go                          # User repository
│   │   └── organization.go                  # Region/Province repository
│   ├── service/
│   │   ├── auth.go                          # Auth service (login, token refresh)
│   │   ├── user.go                          # User service
│   │   └── organization.go                  # Region/Province service
│   └── handler/
│       └── admin/
│           ├── auth.go                      # Auth handlers (login, refresh, logout)
│           ├── user.go                      # User CRUD handlers
│           └── organization.go              # Region/Province CRUD handlers
├── pkg/
│   ├── auth/
│   │   └── jwt.go                           # JWT token generation/validation
│   └── casbin/
│       └── casbin.go                        # Casbin enforcer setup
├── deploy/
│   ├── docker-compose.yml                   # PostgreSQL + Redis + API
│   ├── Dockerfile                           # Multi-stage Go build
│   └── nginx.conf                           # Nginx reverse proxy config (placeholder)
├── configs/
│   └── config.yaml                          # Default config file
├── .gitignore
├── go.mod
└── go.sum
```

---

### Task 1: Project Scaffold + Go Module + Config

**Files:**
- Create: `hospital-server/go.mod`
- Create: `hospital-server/cmd/server/main.go`
- Create: `hospital-server/internal/config/config.go`
- Create: `hospital-server/configs/config.yaml`
- Create: `hospital-server/.gitignore`

- [ ] **Step 1: Initialize Go module and install core dependencies**

```bash
cd /home/dttbd/dttbd/hospital
mkdir -p hospital-server && cd hospital-server
go mod init github.com/dttbd/hospital-server
go get github.com/gin-gonic/gin@latest
go get gorm.io/gorm@latest
go get gorm.io/driver/postgres@latest
go get github.com/spf13/viper@latest
go get github.com/redis/go-redis/v9@latest
go get github.com/google/uuid@latest
go get golang.org/x/crypto@latest
```

- [ ] **Step 2: Create config struct and loader**

Create `hospital-server/internal/config/config.go`:

```go
package config

import (
	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Redis    RedisConfig    `mapstructure:"redis"`
	JWT      JWTConfig      `mapstructure:"jwt"`
}

type ServerConfig struct {
	Port int    `mapstructure:"port"`
	Mode string `mapstructure:"mode"` // debug, release, test
}

type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	DBName   string `mapstructure:"dbname"`
	SSLMode  string `mapstructure:"sslmode"`
}

type RedisConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
}

type JWTConfig struct {
	Secret     string `mapstructure:"secret"`
	ExpireHour int    `mapstructure:"expire_hour"`
}

func (d *DatabaseConfig) DSN() string {
	return "host=" + d.Host +
		" port=" + itoa(d.Port) +
		" user=" + d.User +
		" password=" + d.Password +
		" dbname=" + d.DBName +
		" sslmode=" + d.SSLMode
}

func itoa(i int) string {
	return fmt.Sprintf("%d", i)
}

func Load(path string) (*Config, error) {
	viper.SetConfigFile(path)
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}

	return &cfg, nil
}
```

Add missing import `"fmt"` at the top.

- [ ] **Step 3: Create default config file**

Create `hospital-server/configs/config.yaml`:

```yaml
server:
  port: 8080
  mode: debug

database:
  host: localhost
  port: 5432
  user: hospital
  password: hospital123
  dbname: hospital_db
  sslmode: disable

redis:
  host: localhost
  port: 6379
  password: ""
  db: 0

jwt:
  secret: "change-me-in-production-use-a-long-random-string"
  expire_hour: 24
```

- [ ] **Step 4: Create minimal main.go**

Create `hospital-server/cmd/server/main.go`:

```go
package main

import (
	"flag"
	"fmt"
	"log"

	"github.com/dttbd/hospital-server/internal/config"
	"github.com/gin-gonic/gin"
)

func main() {
	configPath := flag.String("config", "configs/config.yaml", "config file path")
	flag.Parse()

	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	gin.SetMode(cfg.Server.Mode)
	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
```

- [ ] **Step 5: Create .gitignore**

Create `hospital-server/.gitignore`:

```
# Binaries
/bin/
*.exe
*.exe~
*.dll
*.so
*.dylib

# Test
*.test
*.out
coverage.txt

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Config overrides
configs/config.local.yaml

# Vendor (if not committing)
# vendor/

# Tmp
tmp/
```

- [ ] **Step 6: Verify it compiles and runs**

```bash
cd /home/dttbd/dttbd/hospital/hospital-server
go mod tidy
go build ./cmd/server/
```

Expected: builds successfully with no errors.

- [ ] **Step 7: Commit**

```bash
git add hospital-server/
git commit -m "feat: project scaffold with Go module, config, and health endpoint"
```

---

### Task 2: Docker Compose + Dockerfile

**Files:**
- Create: `hospital-server/deploy/docker-compose.yml`
- Create: `hospital-server/deploy/Dockerfile`
- Create: `hospital-server/deploy/nginx.conf`

- [ ] **Step 1: Create Docker Compose file**

Create `hospital-server/deploy/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: his-postgres
    environment:
      POSTGRES_USER: hospital
      POSTGRES_PASSWORD: hospital123
      POSTGRES_DB: hospital_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hospital -d hospital_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: his-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: his-minio
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ..
      dockerfile: deploy/Dockerfile
    container_name: his-api
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      - HIS_DATABASE_HOST=postgres
      - HIS_REDIS_HOST=redis
    volumes:
      - ../configs:/app/configs:ro

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

- [ ] **Step 2: Create multi-stage Dockerfile**

Create `hospital-server/deploy/Dockerfile`:

```dockerfile
# Build stage
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /build/server ./cmd/server/

# Run stage
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /build/server .
COPY configs/config.yaml configs/config.yaml

EXPOSE 8080

CMD ["./server", "-config", "configs/config.yaml"]
```

- [ ] **Step 3: Create placeholder nginx.conf**

Create `hospital-server/deploy/nginx.conf`:

```nginx
upstream api {
    server api:8080;
}

server {
    listen 80;
    server_name localhost;

    # API proxy
    location /api/ {
        proxy_pass http://api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin SPA (will be added later)
    location / {
        root /usr/share/nginx/html/admin;
        try_files $uri $uri/ /index.html;
    }

    # Portal SPA (will be added later)
    location /portal/ {
        alias /usr/share/nginx/html/portal/;
        try_files $uri $uri/ /portal/index.html;
    }
}
```

- [ ] **Step 4: Start infrastructure services and verify**

```bash
cd /home/dttbd/dttbd/hospital/hospital-server
docker compose -f deploy/docker-compose.yml up -d postgres redis minio
```

Wait for healthy, then verify:
```bash
docker compose -f deploy/docker-compose.yml ps
```

Expected: postgres, redis, minio all running and healthy.

- [ ] **Step 5: Commit**

```bash
git add hospital-server/deploy/
git commit -m "infra: add Docker Compose with PostgreSQL, Redis, MinIO, and Dockerfile"
```

---

### Task 3: Base Model + Database Connection + Migration

**Files:**
- Create: `hospital-server/internal/models/base.go`
- Create: `hospital-server/internal/models/migrate.go`
- Modify: `hospital-server/cmd/server/main.go`

- [ ] **Step 1: Create base model**

Create `hospital-server/internal/models/base.go`:

```go
package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BaseModel is the common fields for all models.
type BaseModel struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CreatedAt time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate generates a UUID if not set.
func (b *BaseModel) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}
```

- [ ] **Step 2: Create migration function**

Create `hospital-server/internal/models/migrate.go`:

```go
package models

import "gorm.io/gorm"

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
	// Models will be added here as they are created
	)
}
```

- [ ] **Step 3: Add DB connection to main.go**

Replace `hospital-server/cmd/server/main.go` with:

```go
package main

import (
	"flag"
	"fmt"
	"log"

	"github.com/dttbd/hospital-server/internal/config"
	"github.com/dttbd/hospital-server/internal/models"
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

	// Database
	gormCfg := &gorm.Config{}
	if cfg.Server.Mode != "debug" {
		gormCfg.Logger = logger.Default.LogMode(logger.Silent)
	}

	db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), gormCfg)
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	if err := models.AutoMigrate(db); err != nil {
		log.Fatalf("failed to migrate: %v", err)
	}
	log.Println("database migrated successfully")

	// Router
	gin.SetMode(cfg.Server.Mode)
	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
```

- [ ] **Step 4: Verify it compiles**

```bash
cd /home/dttbd/dttbd/hospital/hospital-server
go mod tidy && go build ./cmd/server/
```

Expected: builds successfully.

- [ ] **Step 5: Commit**

```bash
git add hospital-server/internal/models/ hospital-server/cmd/server/main.go
git commit -m "feat: add base model, DB connection, and auto-migration"
```

---

### Task 4: Common DTOs + API Response Wrapper

**Files:**
- Create: `hospital-server/internal/dto/common.go`

- [ ] **Step 1: Create common DTOs**

Create `hospital-server/internal/dto/common.go`:

```go
package dto

// Response is the standard API response wrapper.
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// PageQuery is the common pagination query params.
type PageQuery struct {
	Page     int    `form:"page,default=1" binding:"min=1"`
	PageSize int    `form:"page_size,default=20" binding:"min=1,max=100"`
	Keyword  string `form:"keyword"`
}

// PageResult is the paginated response data.
type PageResult struct {
	List     interface{} `json:"list"`
	Total    int64       `json:"total"`
	Page     int         `json:"page"`
	PageSize int         `json:"page_size"`
}

func (q *PageQuery) Offset() int {
	return (q.Page - 1) * q.PageSize
}

// OK returns a success response.
func OK(data interface{}) Response {
	return Response{Code: 0, Message: "ok", Data: data}
}

// OKMsg returns a success response with custom message.
func OKMsg(msg string) Response {
	return Response{Code: 0, Message: msg}
}

// Fail returns an error response.
func Fail(code int, msg string) Response {
	return Response{Code: code, Message: msg}
}

// PageOK returns a paginated success response.
func PageOK(list interface{}, total int64, page, pageSize int) Response {
	return OK(PageResult{
		List:     list,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}
```

- [ ] **Step 2: Commit**

```bash
git add hospital-server/internal/dto/common.go
git commit -m "feat: add common DTOs and API response wrapper"
```

---

### Task 5: JWT Token Package

**Files:**
- Create: `hospital-server/pkg/auth/jwt.go`
- Create: `hospital-server/pkg/auth/jwt_test.go`

- [ ] **Step 1: Install JWT dependency**

```bash
cd /home/dttbd/dttbd/hospital/hospital-server
go get github.com/golang-jwt/jwt/v5@latest
```

- [ ] **Step 2: Write JWT tests**

Create `hospital-server/pkg/auth/jwt_test.go`:

```go
package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateAndParseToken(t *testing.T) {
	secret := "test-secret-key"
	userID := uuid.New()
	username := "testuser"

	token, err := GenerateToken(secret, userID, username, 24)
	require.NoError(t, err)
	assert.NotEmpty(t, token)

	claims, err := ParseToken(secret, token)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, username, claims.Username)
}

func TestParseToken_Invalid(t *testing.T) {
	_, err := ParseToken("secret", "invalid-token")
	assert.Error(t, err)
}

func TestParseToken_WrongSecret(t *testing.T) {
	userID := uuid.New()
	token, err := GenerateToken("secret-1", userID, "user", 24)
	require.NoError(t, err)

	_, err = ParseToken("secret-2", token)
	assert.Error(t, err)
}

func TestParseToken_Expired(t *testing.T) {
	secret := "test-secret"
	userID := uuid.New()

	// Generate token that expires immediately (0 hours = already expired)
	token, err := GenerateToken(secret, userID, "user", 0)
	require.NoError(t, err)

	time.Sleep(time.Second)
	_, err = ParseToken(secret, token)
	assert.Error(t, err)
}
```

- [ ] **Step 3: Install testify and run test to verify it fails**

```bash
cd /home/dttbd/dttbd/hospital/hospital-server
go get github.com/stretchr/testify@latest
go test ./pkg/auth/ -v
```

Expected: FAIL — `GenerateToken` and `ParseToken` not defined.

- [ ] **Step 4: Implement JWT package**

Create `hospital-server/pkg/auth/jwt.go`:

```go
package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Claims is the JWT claims payload.
type Claims struct {
	UserID   uuid.UUID `json:"user_id"`
	Username string    `json:"username"`
	jwt.RegisteredClaims
}

// GenerateToken creates a JWT token for the given user.
func GenerateToken(secret string, userID uuid.UUID, username string, expireHours int) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(expireHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "hospital-server",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ParseToken validates and parses a JWT token string.
func ParseToken(secret string, tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /home/dttbd/dttbd/hospital/hospital-server
go test ./pkg/auth/ -v
```

Expected: all 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add hospital-server/pkg/auth/
git commit -m "feat: add JWT token generation and parsing with tests"
```

---

### Task 6: User + Role + Organization Models

**Files:**
- Create: `hospital-server/internal/models/user.go`
- Create: `hospital-server/internal/models/organization.go`
- Modify: `hospital-server/internal/models/migrate.go`

- [ ] **Step 1: Create organization models**

Create `hospital-server/internal/models/organization.go`:

```go
package models

import "github.com/google/uuid"

type Region struct {
	BaseModel
	Name      string `gorm:"size:100;not null" json:"name"`
	Code      string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Status    int8   `gorm:"default:1;not null" json:"status"` // 1=active, 0=disabled
	SortOrder int    `gorm:"default:0" json:"sort_order"`
}

type Province struct {
	BaseModel
	RegionID       uuid.UUID `gorm:"type:uuid;not null;index" json:"region_id"`
	Name           string    `gorm:"size:100;not null" json:"name"`
	Code           string    `gorm:"size:50;uniqueIndex;not null" json:"code"`
	DefaultHandler *uuid.UUID `gorm:"type:uuid" json:"default_handler"`
	Status         int8      `gorm:"default:1;not null" json:"status"`
	SortOrder      int       `gorm:"default:0" json:"sort_order"`

	Region  Region `gorm:"foreignKey:RegionID" json:"region,omitempty"`
}
```

- [ ] **Step 2: Create user models**

Create `hospital-server/internal/models/user.go`:

```go
package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	BaseModel
	Username     string     `gorm:"size:100;uniqueIndex;not null" json:"username"`
	PasswordHash string     `gorm:"size:255;not null" json:"-"`
	RealName     string     `gorm:"size:100;not null" json:"real_name"`
	Phone        string     `gorm:"size:20" json:"phone"`
	Email        string     `gorm:"size:255" json:"email"`
	AvatarURL    string     `gorm:"size:500" json:"avatar_url"`
	RegionID     *uuid.UUID `gorm:"type:uuid;index" json:"region_id"`
	ProvinceID   *uuid.UUID `gorm:"type:uuid;index" json:"province_id"`
	WechatUserID string     `gorm:"size:100" json:"wechat_userid"`
	Status       int8       `gorm:"default:1;not null" json:"status"` // 1=active, 0=disabled
	LastLoginAt  *time.Time `json:"last_login_at"`

	Region   *Region   `gorm:"foreignKey:RegionID" json:"region,omitempty"`
	Province *Province `gorm:"foreignKey:ProvinceID" json:"province,omitempty"`
	Roles    []Role    `gorm:"many2many:user_roles" json:"roles,omitempty"`
}

type Role struct {
	BaseModel
	Name        string `gorm:"size:100;not null" json:"name"`
	Code        string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Description string `gorm:"size:500" json:"description"`
	IsSystem    bool   `gorm:"default:false" json:"is_system"`
	Status      int8   `gorm:"default:1;not null" json:"status"`
}
```

- [ ] **Step 3: Register models in AutoMigrate**

Replace `hospital-server/internal/models/migrate.go`:

```go
package models

import "gorm.io/gorm"

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&Region{},
		&Province{},
		&User{},
		&Role{},
	)
}
```

- [ ] **Step 4: Verify it compiles**

```bash
cd /home/dttbd/dttbd/hospital/hospital-server
go mod tidy && go build ./cmd/server/
```

Expected: builds successfully.

- [ ] **Step 5: Commit**

```bash
git add hospital-server/internal/models/
git commit -m "feat: add User, Role, Region, Province models with auto-migration"
```

---

### Task 7: Auth Middleware

**Files:**
- Create: `hospital-server/internal/middleware/auth.go`
- Create: `hospital-server/internal/middleware/cors.go`
- Create: `hospital-server/internal/middleware/logger.go`

- [ ] **Step 1: Create JWT auth middleware**

Create `hospital-server/internal/middleware/auth.go`:

```go
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

// JWTAuth returns a middleware that validates JWT tokens.
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
```

- [ ] **Step 2: Create CORS middleware**

Create `hospital-server/internal/middleware/cors.go`:

```go
package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
```

- [ ] **Step 3: Create logger middleware**

Create `hospital-server/internal/middleware/logger.go`:

```go
package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		log.Printf("[%d] %s %s %v", status, c.Request.Method, path, latency)
	}
}
```

- [ ] **Step 4: Verify it compiles**

```bash
cd /home/dttbd/dttbd/hospital/hospital-server
go mod tidy && go build ./cmd/server/
```

- [ ] **Step 5: Commit**

```bash
git add hospital-server/internal/middleware/
git commit -m "feat: add JWT auth, CORS, and request logger middleware"
```

---

### Task 8: Casbin RBAC Setup

**Files:**
- Create: `hospital-server/pkg/casbin/casbin.go`
- Create: `hospital-server/internal/middleware/casbin.go`

- [ ] **Step 1: Install Casbin dependencies**

```bash
cd /home/dttbd/dttbd/hospital/hospital-server
go get github.com/casbin/casbin/v2@latest
go get github.com/casbin/gorm-adapter/v3@latest
```

- [ ] **Step 2: Create Casbin enforcer setup**

Create `hospital-server/pkg/casbin/casbin.go`:

```go
package casbin

import (
	"github.com/casbin/casbin/v2"
	"github.com/casbin/casbin/v2/model"
	gormadapter "github.com/casbin/gorm-adapter/v3"
	"gorm.io/gorm"
)

const modelConf = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && keyMatch2(r.obj, p.obj) && r.act == p.act
`

// NewEnforcer creates a Casbin enforcer backed by the database.
func NewEnforcer(db *gorm.DB) (*casbin.Enforcer, error) {
	adapter, err := gormadapter.NewAdapterByDB(db)
	if err != nil {
		return nil, err
	}

	m, err := model.NewModelFromString(modelConf)
	if err != nil {
		return nil, err
	}

	e, err := casbin.NewEnforcer(m, adapter)
	if err != nil {
		return nil, err
	}

	if err := e.LoadPolicy(); err != nil {
		return nil, err
	}

	return e, nil
}

// SetupDefaultPolicies creates initial RBAC policies for the admin role.
func SetupDefaultPolicies(e *casbin.Enforcer) error {
	// Admin has access to all admin APIs
	policies := [][]string{
		{"admin", "/api/admin/*", "GET"},
		{"admin", "/api/admin/*", "POST"},
		{"admin", "/api/admin/*", "PUT"},
		{"admin", "/api/admin/*", "DELETE"},
	}

	for _, p := range policies {
		if _, err := e.AddPolicy(p); err != nil {
			return err
		}
	}

	return e.SavePolicy()
}
```

- [ ] **Step 3: Create Casbin middleware**

Create `hospital-server/internal/middleware/casbin.go`:

```go
package middleware

import (
	"net/http"

	"github.com/casbin/casbin/v2"
	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CasbinRBAC returns a middleware that checks Casbin permissions.
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
```

- [ ] **Step 4: Verify it compiles**

```bash
cd /home/dttbd/dttbd/hospital/hospital-server
go mod tidy && go build ./cmd/server/
```

- [ ] **Step 5: Commit**

```bash
git add hospital-server/pkg/casbin/ hospital-server/internal/middleware/casbin.go
git commit -m "feat: add Casbin RBAC enforcer and middleware"
```

---

### Task 9: Organization Repository + Service + Handler

**Files:**
- Create: `hospital-server/internal/dto/organization.go`
- Create: `hospital-server/internal/repository/organization.go`
- Create: `hospital-server/internal/service/organization.go`
- Create: `hospital-server/internal/handler/admin/organization.go`

- [ ] **Step 1: Create organization DTOs**

Create `hospital-server/internal/dto/organization.go`:

```go
package dto

import "github.com/google/uuid"

// --- Region ---

type CreateRegionReq struct {
	Name      string `json:"name" binding:"required,max=100"`
	Code      string `json:"code" binding:"required,max=50"`
	SortOrder int    `json:"sort_order"`
}

type UpdateRegionReq struct {
	Name      *string `json:"name" binding:"omitempty,max=100"`
	Code      *string `json:"code" binding:"omitempty,max=50"`
	Status    *int8   `json:"status" binding:"omitempty,oneof=0 1"`
	SortOrder *int    `json:"sort_order"`
}

// --- Province ---

type CreateProvinceReq struct {
	RegionID       uuid.UUID  `json:"region_id" binding:"required"`
	Name           string     `json:"name" binding:"required,max=100"`
	Code           string     `json:"code" binding:"required,max=50"`
	DefaultHandler *uuid.UUID `json:"default_handler"`
	SortOrder      int        `json:"sort_order"`
}

type UpdateProvinceReq struct {
	RegionID       *uuid.UUID `json:"region_id"`
	Name           *string    `json:"name" binding:"omitempty,max=100"`
	Code           *string    `json:"code" binding:"omitempty,max=50"`
	DefaultHandler *uuid.UUID `json:"default_handler"`
	Status         *int8      `json:"status" binding:"omitempty,oneof=0 1"`
	SortOrder      *int       `json:"sort_order"`
}
```

- [ ] **Step 2: Create organization repository**

Create `hospital-server/internal/repository/organization.go`:

```go
package repository

import (
	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrganizationRepo struct {
	db *gorm.DB
}

func NewOrganizationRepo(db *gorm.DB) *OrganizationRepo {
	return &OrganizationRepo{db: db}
}

// --- Region ---

func (r *OrganizationRepo) ListRegions(q *dto.PageQuery) ([]models.Region, int64, error) {
	var regions []models.Region
	var total int64

	query := r.db.Model(&models.Region{})
	if q.Keyword != "" {
		query = query.Where("name LIKE ? OR code LIKE ?", "%"+q.Keyword+"%", "%"+q.Keyword+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Order("sort_order ASC, created_at ASC").
		Offset(q.Offset()).Limit(q.PageSize).
		Find(&regions).Error
	return regions, total, err
}

func (r *OrganizationRepo) GetRegion(id uuid.UUID) (*models.Region, error) {
	var region models.Region
	err := r.db.First(&region, "id = ?", id).Error
	return &region, err
}

func (r *OrganizationRepo) CreateRegion(region *models.Region) error {
	return r.db.Create(region).Error
}

func (r *OrganizationRepo) UpdateRegion(region *models.Region) error {
	return r.db.Save(region).Error
}

func (r *OrganizationRepo) DeleteRegion(id uuid.UUID) error {
	return r.db.Delete(&models.Region{}, "id = ?", id).Error
}

// --- Province ---

func (r *OrganizationRepo) ListProvinces(q *dto.PageQuery, regionID *uuid.UUID) ([]models.Province, int64, error) {
	var provinces []models.Province
	var total int64

	query := r.db.Model(&models.Province{}).Preload("Region")
	if regionID != nil {
		query = query.Where("region_id = ?", *regionID)
	}
	if q.Keyword != "" {
		query = query.Where("name LIKE ? OR code LIKE ?", "%"+q.Keyword+"%", "%"+q.Keyword+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Order("sort_order ASC, created_at ASC").
		Offset(q.Offset()).Limit(q.PageSize).
		Find(&provinces).Error
	return provinces, total, err
}

func (r *OrganizationRepo) GetProvince(id uuid.UUID) (*models.Province, error) {
	var province models.Province
	err := r.db.Preload("Region").First(&province, "id = ?", id).Error
	return &province, err
}

func (r *OrganizationRepo) CreateProvince(province *models.Province) error {
	return r.db.Create(province).Error
}

func (r *OrganizationRepo) UpdateProvince(province *models.Province) error {
	return r.db.Save(province).Error
}

func (r *OrganizationRepo) DeleteProvince(id uuid.UUID) error {
	return r.db.Delete(&models.Province{}, "id = ?", id).Error
}
```

- [ ] **Step 3: Create organization service**

Create `hospital-server/internal/service/organization.go`:

```go
package service

import (
	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/internal/repository"
	"github.com/google/uuid"
)

type OrganizationService struct {
	repo *repository.OrganizationRepo
}

func NewOrganizationService(repo *repository.OrganizationRepo) *OrganizationService {
	return &OrganizationService{repo: repo}
}

// --- Region ---

func (s *OrganizationService) ListRegions(q *dto.PageQuery) ([]models.Region, int64, error) {
	return s.repo.ListRegions(q)
}

func (s *OrganizationService) GetRegion(id uuid.UUID) (*models.Region, error) {
	return s.repo.GetRegion(id)
}

func (s *OrganizationService) CreateRegion(req *dto.CreateRegionReq) (*models.Region, error) {
	region := &models.Region{
		Name:      req.Name,
		Code:      req.Code,
		Status:    1,
		SortOrder: req.SortOrder,
	}
	if err := s.repo.CreateRegion(region); err != nil {
		return nil, err
	}
	return region, nil
}

func (s *OrganizationService) UpdateRegion(id uuid.UUID, req *dto.UpdateRegionReq) (*models.Region, error) {
	region, err := s.repo.GetRegion(id)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		region.Name = *req.Name
	}
	if req.Code != nil {
		region.Code = *req.Code
	}
	if req.Status != nil {
		region.Status = *req.Status
	}
	if req.SortOrder != nil {
		region.SortOrder = *req.SortOrder
	}

	if err := s.repo.UpdateRegion(region); err != nil {
		return nil, err
	}
	return region, nil
}

func (s *OrganizationService) DeleteRegion(id uuid.UUID) error {
	return s.repo.DeleteRegion(id)
}

// --- Province ---

func (s *OrganizationService) ListProvinces(q *dto.PageQuery, regionID *uuid.UUID) ([]models.Province, int64, error) {
	return s.repo.ListProvinces(q, regionID)
}

func (s *OrganizationService) GetProvince(id uuid.UUID) (*models.Province, error) {
	return s.repo.GetProvince(id)
}

func (s *OrganizationService) CreateProvince(req *dto.CreateProvinceReq) (*models.Province, error) {
	province := &models.Province{
		RegionID:       req.RegionID,
		Name:           req.Name,
		Code:           req.Code,
		DefaultHandler: req.DefaultHandler,
		Status:         1,
		SortOrder:      req.SortOrder,
	}
	if err := s.repo.CreateProvince(province); err != nil {
		return nil, err
	}
	return province, nil
}

func (s *OrganizationService) UpdateProvince(id uuid.UUID, req *dto.UpdateProvinceReq) (*models.Province, error) {
	province, err := s.repo.GetProvince(id)
	if err != nil {
		return nil, err
	}

	if req.RegionID != nil {
		province.RegionID = *req.RegionID
	}
	if req.Name != nil {
		province.Name = *req.Name
	}
	if req.Code != nil {
		province.Code = *req.Code
	}
	if req.DefaultHandler != nil {
		province.DefaultHandler = req.DefaultHandler
	}
	if req.Status != nil {
		province.Status = *req.Status
	}
	if req.SortOrder != nil {
		province.SortOrder = *req.SortOrder
	}

	if err := s.repo.UpdateProvince(province); err != nil {
		return nil, err
	}
	return province, nil
}

func (s *OrganizationService) DeleteProvince(id uuid.UUID) error {
	return s.repo.DeleteProvince(id)
}
```

- [ ] **Step 4: Create organization handler**

Create `hospital-server/internal/handler/admin/organization.go`:

```go
package admin

import (
	"net/http"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type OrganizationHandler struct {
	svc *service.OrganizationService
}

func NewOrganizationHandler(svc *service.OrganizationService) *OrganizationHandler {
	return &OrganizationHandler{svc: svc}
}

// --- Region ---

func (h *OrganizationHandler) ListRegions(c *gin.Context) {
	var q dto.PageQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	regions, total, err := h.svc.ListRegions(&q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, "failed to list regions"))
		return
	}

	c.JSON(http.StatusOK, dto.PageOK(regions, total, q.Page, q.PageSize))
}

func (h *OrganizationHandler) GetRegion(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	region, err := h.svc.GetRegion(id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Fail(404, "region not found"))
		return
	}

	c.JSON(http.StatusOK, dto.OK(region))
}

func (h *OrganizationHandler) CreateRegion(c *gin.Context) {
	var req dto.CreateRegionReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	region, err := h.svc.CreateRegion(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, "failed to create region"))
		return
	}

	c.JSON(http.StatusCreated, dto.OK(region))
}

func (h *OrganizationHandler) UpdateRegion(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	var req dto.UpdateRegionReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	region, err := h.svc.UpdateRegion(id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, "failed to update region"))
		return
	}

	c.JSON(http.StatusOK, dto.OK(region))
}

func (h *OrganizationHandler) DeleteRegion(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	if err := h.svc.DeleteRegion(id); err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, "failed to delete region"))
		return
	}

	c.JSON(http.StatusOK, dto.OKMsg("region deleted"))
}

// --- Province ---

func (h *OrganizationHandler) ListProvinces(c *gin.Context) {
	var q dto.PageQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	var regionID *uuid.UUID
	if rid := c.Query("region_id"); rid != "" {
		parsed, err := uuid.Parse(rid)
		if err != nil {
			c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid region_id"))
			return
		}
		regionID = &parsed
	}

	provinces, total, err := h.svc.ListProvinces(&q, regionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, "failed to list provinces"))
		return
	}

	c.JSON(http.StatusOK, dto.PageOK(provinces, total, q.Page, q.PageSize))
}

func (h *OrganizationHandler) GetProvince(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	province, err := h.svc.GetProvince(id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Fail(404, "province not found"))
		return
	}

	c.JSON(http.StatusOK, dto.OK(province))
}

func (h *OrganizationHandler) CreateProvince(c *gin.Context) {
	var req dto.CreateProvinceReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	province, err := h.svc.CreateProvince(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, "failed to create province"))
		return
	}

	c.JSON(http.StatusCreated, dto.OK(province))
}

func (h *OrganizationHandler) UpdateProvince(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	var req dto.UpdateProvinceReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	province, err := h.svc.UpdateProvince(id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, "failed to update province"))
		return
	}

	c.JSON(http.StatusOK, dto.OK(province))
}

func (h *OrganizationHandler) DeleteProvince(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	if err := h.svc.DeleteProvince(id); err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, "failed to delete province"))
		return
	}

	c.JSON(http.StatusOK, dto.OKMsg("province deleted"))
}
```

- [ ] **Step 5: Verify it compiles**

```bash
cd /home/dttbd/dttbd/hospital/hospital-server
go mod tidy && go build ./cmd/server/
```

- [ ] **Step 6: Commit**

```bash
git add hospital-server/internal/dto/organization.go hospital-server/internal/repository/organization.go hospital-server/internal/service/organization.go hospital-server/internal/handler/admin/organization.go
git commit -m "feat: add organization (region/province) CRUD — repository, service, handler"
```

---

### Task 10: Auth Service + Handler (Login, Refresh, Logout)

**Files:**
- Create: `hospital-server/internal/dto/auth.go`
- Create: `hospital-server/internal/service/auth.go`
- Create: `hospital-server/internal/handler/admin/auth.go`

- [ ] **Step 1: Create auth DTOs**

Create `hospital-server/internal/dto/auth.go`:

```go
package dto

type LoginReq struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResp struct {
	Token     string      `json:"token"`
	ExpiresIn int         `json:"expires_in"` // seconds
	User      interface{} `json:"user"`
}

type RefreshResp struct {
	Token     string `json:"token"`
	ExpiresIn int    `json:"expires_in"`
}
```

- [ ] **Step 2: Create auth service**

Create `hospital-server/internal/service/auth.go`:

```go
package service

import (
	"errors"
	"time"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/pkg/auth"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	db        *gorm.DB
	jwtSecret string
	expireH   int
}

func NewAuthService(db *gorm.DB, jwtSecret string, expireH int) *AuthService {
	return &AuthService{db: db, jwtSecret: jwtSecret, expireH: expireH}
}

func (s *AuthService) Login(req *dto.LoginReq) (*dto.LoginResp, error) {
	var user models.User
	if err := s.db.Preload("Roles").Preload("Region").Preload("Province").
		Where("username = ? AND status = 1", req.Username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid username or password")
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid username or password")
	}

	token, err := auth.GenerateToken(s.jwtSecret, user.ID, user.Username, s.expireH)
	if err != nil {
		return nil, err
	}

	// Update last login time
	now := time.Now()
	s.db.Model(&user).Update("last_login_at", &now)

	return &dto.LoginResp{
		Token:     token,
		ExpiresIn: s.expireH * 3600,
		User:      user,
	}, nil
}

func (s *AuthService) RefreshToken(userID uuid.UUID, username string) (*dto.RefreshResp, error) {
	token, err := auth.GenerateToken(s.jwtSecret, userID, username, s.expireH)
	if err != nil {
		return nil, err
	}

	return &dto.RefreshResp{
		Token:     token,
		ExpiresIn: s.expireH * 3600,
	}, nil
}

// HashPassword generates a bcrypt hash for the given password.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}
```

- [ ] **Step 3: Create auth handler**

Create `hospital-server/internal/handler/admin/auth.go`:

```go
package admin

import (
	"net/http"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/middleware"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AuthHandler struct {
	svc *service.AuthService
}

func NewAuthHandler(svc *service.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

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

func (h *AuthHandler) Logout(c *gin.Context) {
	// Stateless JWT — client discards token. Could add token blacklist with Redis later.
	c.JSON(http.StatusOK, dto.OKMsg("logged out"))
}
```

- [ ] **Step 4: Verify it compiles**

```bash
cd /home/dttbd/dttbd/hospital/hospital-server
go mod tidy && go build ./cmd/server/
```

- [ ] **Step 5: Commit**

```bash
git add hospital-server/internal/dto/auth.go hospital-server/internal/service/auth.go hospital-server/internal/handler/admin/auth.go
git commit -m "feat: add auth service and handler (login, refresh, logout)"
```

---

### Task 11: User CRUD — Repository + Service + Handler

**Files:**
- Create: `hospital-server/internal/dto/user.go`
- Create: `hospital-server/internal/repository/user.go`
- Create: `hospital-server/internal/service/user.go`
- Create: `hospital-server/internal/handler/admin/user.go`

- [ ] **Step 1: Create user DTOs**

Create `hospital-server/internal/dto/user.go`:

```go
package dto

import "github.com/google/uuid"

type CreateUserReq struct {
	Username  string     `json:"username" binding:"required,max=100"`
	Password  string     `json:"password" binding:"required,min=6,max=100"`
	RealName  string     `json:"real_name" binding:"required,max=100"`
	Phone     string     `json:"phone" binding:"omitempty,max=20"`
	Email     string     `json:"email" binding:"omitempty,email,max=255"`
	RegionID  *uuid.UUID `json:"region_id"`
	ProvinceID *uuid.UUID `json:"province_id"`
	RoleIDs   []uuid.UUID `json:"role_ids"`
}

type UpdateUserReq struct {
	RealName   *string    `json:"real_name" binding:"omitempty,max=100"`
	Phone      *string    `json:"phone" binding:"omitempty,max=20"`
	Email      *string    `json:"email" binding:"omitempty,email,max=255"`
	AvatarURL  *string    `json:"avatar_url"`
	RegionID   *uuid.UUID `json:"region_id"`
	ProvinceID *uuid.UUID `json:"province_id"`
	Status     *int8      `json:"status" binding:"omitempty,oneof=0 1"`
}

type SetUserRolesReq struct {
	RoleIDs []uuid.UUID `json:"role_ids" binding:"required"`
}

type ChangePasswordReq struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6,max=100"`
}
```

- [ ] **Step 2: Create user repository**

Create `hospital-server/internal/repository/user.go`:

```go
package repository

import (
	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRepo struct {
	db *gorm.DB
}

func NewUserRepo(db *gorm.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) List(q *dto.PageQuery) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	query := r.db.Model(&models.User{})
	if q.Keyword != "" {
		query = query.Where("username LIKE ? OR real_name LIKE ? OR phone LIKE ?",
			"%"+q.Keyword+"%", "%"+q.Keyword+"%", "%"+q.Keyword+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Preload("Roles").Preload("Region").Preload("Province").
		Order("created_at DESC").
		Offset(q.Offset()).Limit(q.PageSize).
		Find(&users).Error
	return users, total, err
}

func (r *UserRepo) GetByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.Preload("Roles").Preload("Region").Preload("Province").
		First(&user, "id = ?", id).Error
	return &user, err
}

func (r *UserRepo) GetByUsername(username string) (*models.User, error) {
	var user models.User
	err := r.db.First(&user, "username = ?", username).Error
	return &user, err
}

func (r *UserRepo) Create(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *UserRepo) Update(user *models.User) error {
	return r.db.Save(user).Error
}

func (r *UserRepo) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.User{}, "id = ?", id).Error
}

func (r *UserRepo) SetRoles(userID uuid.UUID, roles []models.Role) error {
	var user models.User
	user.ID = userID
	return r.db.Model(&user).Association("Roles").Replace(roles)
}

func (r *UserRepo) GetRolesByIDs(ids []uuid.UUID) ([]models.Role, error) {
	var roles []models.Role
	err := r.db.Where("id IN ?", ids).Find(&roles).Error
	return roles, err
}
```

- [ ] **Step 3: Create user service**

Create `hospital-server/internal/service/user.go`:

```go
package service

import (
	"errors"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/internal/repository"
	"github.com/google/uuid"
)

type UserService struct {
	repo *repository.UserRepo
}

func NewUserService(repo *repository.UserRepo) *UserService {
	return &UserService{repo: repo}
}

func (s *UserService) List(q *dto.PageQuery) ([]models.User, int64, error) {
	return s.repo.List(q)
}

func (s *UserService) GetByID(id uuid.UUID) (*models.User, error) {
	return s.repo.GetByID(id)
}

func (s *UserService) Create(req *dto.CreateUserReq) (*models.User, error) {
	// Check username uniqueness
	if _, err := s.repo.GetByUsername(req.Username); err == nil {
		return nil, errors.New("username already exists")
	}

	hash, err := HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Username:     req.Username,
		PasswordHash: hash,
		RealName:     req.RealName,
		Phone:        req.Phone,
		Email:        req.Email,
		RegionID:     req.RegionID,
		ProvinceID:   req.ProvinceID,
		Status:       1,
	}

	if err := s.repo.Create(user); err != nil {
		return nil, err
	}

	// Set roles if provided
	if len(req.RoleIDs) > 0 {
		roles, err := s.repo.GetRolesByIDs(req.RoleIDs)
		if err != nil {
			return nil, err
		}
		if err := s.repo.SetRoles(user.ID, roles); err != nil {
			return nil, err
		}
	}

	return s.repo.GetByID(user.ID)
}

func (s *UserService) Update(id uuid.UUID, req *dto.UpdateUserReq) (*models.User, error) {
	user, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

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
	if req.RegionID != nil {
		user.RegionID = req.RegionID
	}
	if req.ProvinceID != nil {
		user.ProvinceID = req.ProvinceID
	}
	if req.Status != nil {
		user.Status = *req.Status
	}

	if err := s.repo.Update(user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *UserService) Delete(id uuid.UUID) error {
	return s.repo.Delete(id)
}

func (s *UserService) SetRoles(userID uuid.UUID, req *dto.SetUserRolesReq) error {
	roles, err := s.repo.GetRolesByIDs(req.RoleIDs)
	if err != nil {
		return err
	}
	return s.repo.SetRoles(userID, roles)
}
```

- [ ] **Step 4: Create user handler**

Create `hospital-server/internal/handler/admin/user.go`:

```go
package admin

import (
	"net/http"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UserHandler struct {
	svc *service.UserService
}

func NewUserHandler(svc *service.UserService) *UserHandler {
	return &UserHandler{svc: svc}
}

func (h *UserHandler) List(c *gin.Context) {
	var q dto.PageQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	users, total, err := h.svc.List(&q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, "failed to list users"))
		return
	}

	c.JSON(http.StatusOK, dto.PageOK(users, total, q.Page, q.PageSize))
}

func (h *UserHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	user, err := h.svc.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Fail(404, "user not found"))
		return
	}

	c.JSON(http.StatusOK, dto.OK(user))
}

func (h *UserHandler) Create(c *gin.Context) {
	var req dto.CreateUserReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	user, err := h.svc.Create(&req)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	c.JSON(http.StatusCreated, dto.OK(user))
}

func (h *UserHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	var req dto.UpdateUserReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	user, err := h.svc.Update(id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, "failed to update user"))
		return
	}

	c.JSON(http.StatusOK, dto.OK(user))
}

func (h *UserHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	if err := h.svc.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, "failed to delete user"))
		return
	}

	c.JSON(http.StatusOK, dto.OKMsg("user deleted"))
}

func (h *UserHandler) SetRoles(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	var req dto.SetUserRolesReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	if err := h.svc.SetRoles(id, &req); err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, "failed to set roles"))
		return
	}

	c.JSON(http.StatusOK, dto.OKMsg("roles updated"))
}
```

- [ ] **Step 5: Verify it compiles**

```bash
cd /home/dttbd/dttbd/hospital/hospital-server
go mod tidy && go build ./cmd/server/
```

- [ ] **Step 6: Commit**

```bash
git add hospital-server/internal/dto/user.go hospital-server/internal/repository/user.go hospital-server/internal/service/user.go hospital-server/internal/handler/admin/user.go
git commit -m "feat: add user CRUD — repository, service, handler with role assignment"
```

---

### Task 12: Router + Dependency Wiring + Seed Data

**Files:**
- Create: `hospital-server/internal/router/router.go`
- Modify: `hospital-server/cmd/server/main.go`

- [ ] **Step 1: Create router with all route registration**

Create `hospital-server/internal/router/router.go`:

```go
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
```

- [ ] **Step 2: Update main.go with full wiring + seed admin user**

Replace `hospital-server/cmd/server/main.go`:

```go
package main

import (
	"errors"
	"flag"
	"fmt"
	"log"

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

	// Database
	gormCfg := &gorm.Config{}
	if cfg.Server.Mode != "debug" {
		gormCfg.Logger = logger.Default.LogMode(logger.Silent)
	}

	db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), gormCfg)
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	if err := models.AutoMigrate(db); err != nil {
		log.Fatalf("failed to migrate: %v", err)
	}
	log.Println("database migrated successfully")

	// Casbin
	enforcer, err := casbinpkg.NewEnforcer(db)
	if err != nil {
		log.Fatalf("failed to init casbin: %v", err)
	}

	// Seed default data
	seedDefaults(db, enforcer)

	// Router
	gin.SetMode(cfg.Server.Mode)
	r := gin.Default()

	router.Setup(r, db, enforcer, cfg.JWT.Secret, cfg.JWT.ExpireHour)

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

func seedDefaults(db *gorm.DB, enforcer *casbin.Enforcer) {
	// Seed admin role
	var adminRole models.Role
	result := db.Where("code = ?", "admin").First(&adminRole)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		adminRole = models.Role{
			Name:        "系统管理员",
			Code:        "admin",
			Description: "系统管理员，拥有所有权限",
			IsSystem:    true,
			Status:      1,
		}
		db.Create(&adminRole)
		log.Println("seeded admin role")
	}

	// Seed other default roles
	defaultRoles := []models.Role{
		{Name: "大区负责人", Code: "region_manager", Description: "大区负责人", IsSystem: true, Status: 1},
		{Name: "省负责人", Code: "province_manager", Description: "省负责人", IsSystem: true, Status: 1},
		{Name: "销售", Code: "sales", Description: "销售人员", IsSystem: true, Status: 1},
		{Name: "售前", Code: "presales", Description: "售前人员", IsSystem: true, Status: 1},
		{Name: "售后", Code: "aftersales", Description: "售后人员", IsSystem: true, Status: 1},
		{Name: "支持人员", Code: "support", Description: "技术支持人员", IsSystem: true, Status: 1},
		{Name: "客户", Code: "customer", Description: "外部客户", IsSystem: true, Status: 1},
	}
	for _, role := range defaultRoles {
		db.Where("code = ?", role.Code).FirstOrCreate(&role)
	}

	// Seed admin user (password: admin123)
	var adminUser models.User
	result = db.Where("username = ?", "admin").First(&adminUser)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		hash, _ := service.HashPassword("admin123")
		adminUser = models.User{
			Username:     "admin",
			PasswordHash: hash,
			RealName:     "系统管理员",
			Status:       1,
		}
		db.Create(&adminUser)
		db.Model(&adminUser).Association("Roles").Append(&adminRole)
		log.Println("seeded admin user (admin / admin123)")
	}

	// Setup Casbin policies for admin
	casbinpkg.SetupDefaultPolicies(enforcer)
}
```

Note: add the casbin import — `"github.com/casbin/casbin/v2"` at the top.

- [ ] **Step 3: Verify it compiles**

```bash
cd /home/dttbd/dttbd/hospital/hospital-server
go mod tidy && go build ./cmd/server/
```

- [ ] **Step 4: Test the full API (requires Docker services running)**

```bash
# Start DB
cd /home/dttbd/dttbd/hospital/hospital-server
docker compose -f deploy/docker-compose.yml up -d postgres redis

# Run server
go run ./cmd/server/ &
sleep 2

# Test health
curl -s http://localhost:8080/health

# Test login
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Save token and test authenticated endpoint
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

# Test create region
curl -s -X POST http://localhost:8080/api/admin/v1/regions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"华东大区","code":"east_china"}'

# Test list regions
curl -s http://localhost:8080/api/admin/v1/regions \
  -H "Authorization: Bearer $TOKEN"

# Kill background server
kill %1
```

Expected: all requests return 200 with proper JSON responses.

- [ ] **Step 5: Commit**

```bash
git add hospital-server/internal/router/ hospital-server/cmd/server/main.go
git commit -m "feat: add router wiring, dependency injection, and seed data (admin user + default roles)"
```

---

### Task 13: Role CRUD Handler

**Files:**
- Create: `hospital-server/internal/repository/role.go`
- Create: `hospital-server/internal/service/role.go`
- Create: `hospital-server/internal/handler/admin/role.go`
- Modify: `hospital-server/internal/router/router.go`

- [ ] **Step 1: Create role repository**

Create `hospital-server/internal/repository/role.go`:

```go
package repository

import (
	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RoleRepo struct {
	db *gorm.DB
}

func NewRoleRepo(db *gorm.DB) *RoleRepo {
	return &RoleRepo{db: db}
}

func (r *RoleRepo) List(q *dto.PageQuery) ([]models.Role, int64, error) {
	var roles []models.Role
	var total int64

	query := r.db.Model(&models.Role{})
	if q.Keyword != "" {
		query = query.Where("name LIKE ? OR code LIKE ?", "%"+q.Keyword+"%", "%"+q.Keyword+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Order("created_at ASC").
		Offset(q.Offset()).Limit(q.PageSize).
		Find(&roles).Error
	return roles, total, err
}

func (r *RoleRepo) GetByID(id uuid.UUID) (*models.Role, error) {
	var role models.Role
	err := r.db.First(&role, "id = ?", id).Error
	return &role, err
}

func (r *RoleRepo) Create(role *models.Role) error {
	return r.db.Create(role).Error
}

func (r *RoleRepo) Update(role *models.Role) error {
	return r.db.Save(role).Error
}

func (r *RoleRepo) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Role{}, "id = ?", id).Error
}
```

- [ ] **Step 2: Create role service**

Create `hospital-server/internal/service/role.go`:

```go
package service

import (
	"github.com/casbin/casbin/v2"
	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/internal/repository"
	"github.com/google/uuid"
)

type RoleService struct {
	repo     *repository.RoleRepo
	enforcer *casbin.Enforcer
}

func NewRoleService(repo *repository.RoleRepo, enforcer *casbin.Enforcer) *RoleService {
	return &RoleService{repo: repo, enforcer: enforcer}
}

func (s *RoleService) List(q *dto.PageQuery) ([]models.Role, int64, error) {
	return s.repo.List(q)
}

func (s *RoleService) GetByID(id uuid.UUID) (*models.Role, error) {
	return s.repo.GetByID(id)
}

func (s *RoleService) Create(name, code, description string) (*models.Role, error) {
	role := &models.Role{
		Name:        name,
		Code:        code,
		Description: description,
		Status:      1,
	}
	if err := s.repo.Create(role); err != nil {
		return nil, err
	}
	return role, nil
}

func (s *RoleService) Update(id uuid.UUID, name, code, description *string, status *int8) (*models.Role, error) {
	role, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if name != nil {
		role.Name = *name
	}
	if code != nil {
		role.Code = *code
	}
	if description != nil {
		role.Description = *description
	}
	if status != nil {
		role.Status = *status
	}
	if err := s.repo.Update(role); err != nil {
		return nil, err
	}
	return role, nil
}

func (s *RoleService) Delete(id uuid.UUID) error {
	return s.repo.Delete(id)
}

// GetPermissions returns the Casbin policies for a role.
func (s *RoleService) GetPermissions(roleCode string) [][]string {
	return s.enforcer.GetFilteredPolicy(0, roleCode)
}

// SetPermissions replaces all policies for a role.
func (s *RoleService) SetPermissions(roleCode string, permissions [][]string) error {
	// Remove old policies
	s.enforcer.RemoveFilteredPolicy(0, roleCode)

	// Add new policies
	for _, p := range permissions {
		if _, err := s.enforcer.AddPolicy(roleCode, p[0], p[1]); err != nil {
			return err
		}
	}
	return s.enforcer.SavePolicy()
}
```

- [ ] **Step 3: Create role handler**

Create `hospital-server/internal/handler/admin/role.go`:

```go
package admin

import (
	"net/http"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type RoleHandler struct {
	svc *service.RoleService
}

func NewRoleHandler(svc *service.RoleService) *RoleHandler {
	return &RoleHandler{svc: svc}
}

type CreateRoleReq struct {
	Name        string `json:"name" binding:"required"`
	Code        string `json:"code" binding:"required"`
	Description string `json:"description"`
}

type UpdateRoleReq struct {
	Name        *string `json:"name"`
	Code        *string `json:"code"`
	Description *string `json:"description"`
	Status      *int8   `json:"status"`
}

type SetPermissionsReq struct {
	Permissions []PermissionItem `json:"permissions" binding:"required"`
}

type PermissionItem struct {
	Path   string `json:"path" binding:"required"`   // e.g. "/api/admin/v1/users"
	Method string `json:"method" binding:"required"` // e.g. "GET"
}

func (h *RoleHandler) List(c *gin.Context) {
	var q dto.PageQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}
	roles, total, err := h.svc.List(&q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, "failed to list roles"))
		return
	}
	c.JSON(http.StatusOK, dto.PageOK(roles, total, q.Page, q.PageSize))
}

func (h *RoleHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}
	role, err := h.svc.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Fail(404, "role not found"))
		return
	}
	c.JSON(http.StatusOK, dto.OK(role))
}

func (h *RoleHandler) Create(c *gin.Context) {
	var req CreateRoleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}
	role, err := h.svc.Create(req.Name, req.Code, req.Description)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}
	c.JSON(http.StatusCreated, dto.OK(role))
}

func (h *RoleHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}
	var req UpdateRoleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}
	role, err := h.svc.Update(id, req.Name, req.Code, req.Description, req.Status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, "failed to update role"))
		return
	}
	c.JSON(http.StatusOK, dto.OK(role))
}

func (h *RoleHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}
	if err := h.svc.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, "failed to delete role"))
		return
	}
	c.JSON(http.StatusOK, dto.OKMsg("role deleted"))
}

func (h *RoleHandler) SetPermissions(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}
	role, err := h.svc.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Fail(404, "role not found"))
		return
	}

	var req SetPermissionsReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	permissions := make([][]string, len(req.Permissions))
	for i, p := range req.Permissions {
		permissions[i] = []string{p.Path, p.Method}
	}

	if err := h.svc.SetPermissions(role.Code, permissions); err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, "failed to set permissions"))
		return
	}
	c.JSON(http.StatusOK, dto.OKMsg("permissions updated"))
}
```

- [ ] **Step 4: Add role routes to router**

Add to `hospital-server/internal/router/router.go` — in the `Setup` function, add role repo/service/handler creation and routes.

After the existing handler declarations, add:
```go
	roleRepo := repository.NewRoleRepo(db)
	roleSvc := service.NewRoleService(roleRepo, enforcer)
	roleH := admin.NewRoleHandler(roleSvc)
```

Inside the `adminV1` group, add:
```go
		// Roles
		adminV1.GET("/roles", roleH.List)
		adminV1.POST("/roles", roleH.Create)
		adminV1.GET("/roles/:id", roleH.Get)
		adminV1.PUT("/roles/:id", roleH.Update)
		adminV1.DELETE("/roles/:id", roleH.Delete)
		adminV1.PUT("/roles/:id/permissions", roleH.SetPermissions)
```

- [ ] **Step 5: Verify it compiles**

```bash
cd /home/dttbd/dttbd/hospital/hospital-server
go mod tidy && go build ./cmd/server/
```

- [ ] **Step 6: Commit**

```bash
git add hospital-server/internal/repository/role.go hospital-server/internal/service/role.go hospital-server/internal/handler/admin/role.go hospital-server/internal/router/router.go
git commit -m "feat: add role CRUD with Casbin permission management"
```

---

### Task 14: End-to-End Integration Test

**Files:**
- Create: `hospital-server/tests/integration/setup_test.go`
- Create: `hospital-server/tests/integration/auth_test.go`
- Create: `hospital-server/tests/integration/organization_test.go`

- [ ] **Step 1: Create test setup helper**

Create `hospital-server/tests/integration/setup_test.go`:

```go
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

	// Clean and migrate
	sqlDB, _ := db.DB()
	t.Cleanup(func() { sqlDB.Close() })

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
```

- [ ] **Step 2: Create auth integration test**

Create `hospital-server/tests/integration/auth_test.go`:

```go
package integration

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLogin_Success(t *testing.T) {
	r, _ := setupTestServer(t)
	token := loginAdmin(t, r)
	assert.NotEmpty(t, token)
}

func TestLogin_WrongPassword(t *testing.T) {
	r, _ := setupTestServer(t)

	req := authReq(http.MethodPost, "/api/auth/login",
		map[string]string{"username": "admin", "password": "wrong"}, "")
	req.Header.Del("Authorization")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestProtectedRoute_NoToken(t *testing.T) {
	r, _ := setupTestServer(t)

	req := httptest.NewRequest(http.MethodGet, "/api/admin/v1/users", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
```

- [ ] **Step 3: Create organization integration test**

Create `hospital-server/tests/integration/organization_test.go`:

```go
package integration

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRegionCRUD(t *testing.T) {
	r, _ := setupTestServer(t)
	token := loginAdmin(t, r)

	// Create
	w := httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPost, "/api/admin/v1/regions",
		map[string]string{"name": "华东大区", "code": "east_china"}, token))
	require.Equal(t, http.StatusCreated, w.Code)

	var createResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &createResp)
	data := createResp["data"].(map[string]interface{})
	regionID := data["id"].(string)

	// List
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/regions", nil, token))
	assert.Equal(t, http.StatusOK, w.Code)

	// Get
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/regions/"+regionID, nil, token))
	assert.Equal(t, http.StatusOK, w.Code)

	// Update
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPut, "/api/admin/v1/regions/"+regionID,
		map[string]string{"name": "华东大区-更新"}, token))
	assert.Equal(t, http.StatusOK, w.Code)

	// Delete
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodDelete, "/api/admin/v1/regions/"+regionID, nil, token))
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestProvinceCRUD(t *testing.T) {
	r, _ := setupTestServer(t)
	token := loginAdmin(t, r)

	// Create region first
	w := httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPost, "/api/admin/v1/regions",
		map[string]string{"name": "华东", "code": "east"}, token))
	require.Equal(t, http.StatusCreated, w.Code)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	regionID := resp["data"].(map[string]interface{})["id"].(string)

	// Create province
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPost, "/api/admin/v1/provinces",
		map[string]interface{}{"name": "上海", "code": "shanghai", "region_id": regionID}, token))
	require.Equal(t, http.StatusCreated, w.Code)

	json.Unmarshal(w.Body.Bytes(), &resp)
	provinceID := resp["data"].(map[string]interface{})["id"].(string)

	// List with region filter
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/provinces?region_id="+regionID, nil, token))
	assert.Equal(t, http.StatusOK, w.Code)

	// Get
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/provinces/"+provinceID, nil, token))
	assert.Equal(t, http.StatusOK, w.Code)

	// Delete
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodDelete, "/api/admin/v1/provinces/"+provinceID, nil, token))
	assert.Equal(t, http.StatusOK, w.Code)
}
```

- [ ] **Step 4: Create test database and run tests**

```bash
# Create test database (requires postgres running via docker-compose)
docker exec his-postgres psql -U hospital -c "CREATE DATABASE hospital_db_test;" 2>/dev/null || true

cd /home/dttbd/dttbd/hospital/hospital-server
go test ./tests/integration/ -v -count=1
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add hospital-server/tests/
git commit -m "test: add integration tests for auth, region, and province CRUD"
```

---

## Phase 1 Complete

At this point the backend foundation is working:
- Go project scaffold with config loading
- Docker Compose with PostgreSQL, Redis, MinIO
- JWT authentication (login/refresh/logout)
- User CRUD with role assignment
- Organization CRUD (regions/provinces)
- Casbin RBAC (role-based access control with Casbin policies)
- Seed data (admin user + 8 default roles)
- Integration tests

**Next:** Phase 2 will cover Hospital CRUD (with dynamic fields), Ticket system (state machine), and MinIO file upload.
