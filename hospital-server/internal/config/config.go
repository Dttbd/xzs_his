package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	JWT      JWTConfig
	MinIO    *MinIOConfig // nil if MINIO_URL not set
}

type ServerConfig struct {
	Port int
	Mode string // debug / release / test
}

type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
}

type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
}

type JWTConfig struct {
	Secret     string
	ExpireHour int
}

type MinIOConfig struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
	UseSSL    bool
}

// DSN returns a GORM-compatible connection string.
func (d *DatabaseConfig) DSN() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		d.Host, d.Port, d.User, d.Password, d.DBName, d.SSLMode)
}

// PostgresURL returns a postgres:// URL for golang-migrate.
func (d *DatabaseConfig) PostgresURL() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=%s",
		d.User, d.Password, d.Host, d.Port, d.DBName, d.SSLMode)
}

// Addr returns host:port for Redis client.
func (r *RedisConfig) Addr() string {
	return fmt.Sprintf("%s:%d", r.Host, r.Port)
}

// Load reads environment variables (auto-loads .env if present) and returns Config.
//
// Required env vars (startup fails without these):
//
//	DATABASE_URL  — postgres://user:pass@host:5432/dbname?sslmode=disable
//	JWT_SECRET    — signing key for JWT tokens
//
// Optional env vars (have sensible defaults):
//
//	REDIS_URL     — redis://:pass@host:6379/0           (default: redis://@localhost:6379/0)
//	MINIO_URL     — minio://key:secret@host:9000/bucket (default: not set, file upload disabled)
//	PORT          — server port                          (default: 8080)
//	SERVER_MODE   — debug / release / test               (default: debug)
//	JWT_EXPIRE_HOUR — token expiry in hours              (default: 24)
func Load() (*Config, error) {
	// Auto-load .env if present
	_ = godotenv.Load()

	var missing []string

	// --- Required ---
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		missing = append(missing, "DATABASE_URL")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		missing = append(missing, "JWT_SECRET")
	}

	if len(missing) > 0 {
		return nil, fmt.Errorf("missing required environment variables: %s", strings.Join(missing, ", "))
	}

	// --- Optional ---
	port := envInt("PORT", 8080)
	mode := envStr("SERVER_MODE", "debug")
	expireHour := envInt("JWT_EXPIRE_HOUR", 24)
	redisURL := envStr("REDIS_URL", "redis://@localhost:6379/0")
	minioURL := os.Getenv("MINIO_URL")

	// --- Parse ---
	dbCfg, err := parseDatabaseURL(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("invalid DATABASE_URL: %w", err)
	}

	redisCfg, err := parseRedisURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("invalid REDIS_URL: %w", err)
	}

	var minioCfg *MinIOConfig
	if minioURL != "" {
		mc, err := parseMinIOURL(minioURL)
		if err != nil {
			return nil, fmt.Errorf("invalid MINIO_URL: %w", err)
		}
		minioCfg = mc
	}

	return &Config{
		Server:   ServerConfig{Port: port, Mode: mode},
		Database: *dbCfg,
		Redis:    *redisCfg,
		JWT:      JWTConfig{Secret: jwtSecret, ExpireHour: expireHour},
		MinIO:    minioCfg,
	}, nil
}

// parseDatabaseURL parses postgres://user:pass@host:5432/dbname?sslmode=disable
func parseDatabaseURL(raw string) (*DatabaseConfig, error) {
	raw = strings.Replace(raw, "postgresql+asyncpg://", "postgres://", 1)
	raw = strings.Replace(raw, "postgresql://", "postgres://", 1)

	u, err := url.Parse(raw)
	if err != nil {
		return nil, err
	}

	cfg := &DatabaseConfig{
		Host:    u.Hostname(),
		Port:    5432,
		SSLMode: "disable",
	}

	if p := u.Port(); p != "" {
		if port, err := strconv.Atoi(p); err == nil {
			cfg.Port = port
		}
	}
	if u.User != nil {
		cfg.User = u.User.Username()
		if pw, ok := u.User.Password(); ok {
			cfg.Password = pw
		}
	}
	cfg.DBName = strings.TrimPrefix(u.Path, "/")
	if sslmode := u.Query().Get("sslmode"); sslmode != "" {
		cfg.SSLMode = sslmode
	}

	if cfg.DBName == "" {
		return nil, fmt.Errorf("database name is required in URL")
	}

	return cfg, nil
}

// parseRedisURL parses redis://:password@host:6379/0
func parseRedisURL(raw string) (*RedisConfig, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return nil, err
	}

	cfg := &RedisConfig{
		Host: u.Hostname(),
		Port: 6379,
	}

	if cfg.Host == "" {
		cfg.Host = "localhost"
	}
	if p := u.Port(); p != "" {
		if port, err := strconv.Atoi(p); err == nil {
			cfg.Port = port
		}
	}
	if u.User != nil {
		if pw, ok := u.User.Password(); ok {
			cfg.Password = pw
		}
	}
	db := strings.TrimPrefix(u.Path, "/")
	if db != "" {
		if d, err := strconv.Atoi(db); err == nil {
			cfg.DB = d
		}
	}

	return cfg, nil
}

// parseMinIOURL parses minio://accesskey:secretkey@host:9000/bucket?ssl=true
func parseMinIOURL(raw string) (*MinIOConfig, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return nil, err
	}

	cfg := &MinIOConfig{
		Endpoint: u.Host,
	}

	if u.User != nil {
		cfg.AccessKey = u.User.Username()
		if sk, ok := u.User.Password(); ok {
			cfg.SecretKey = sk
		}
	}
	cfg.Bucket = strings.TrimPrefix(u.Path, "/")
	if u.Query().Get("ssl") == "true" || u.Scheme == "minios" {
		cfg.UseSSL = true
	}

	if cfg.Bucket == "" {
		return nil, fmt.Errorf("bucket name is required in URL")
	}

	return cfg, nil
}

func envStr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}
