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
	MinIO    MinIOConfig
	WeChat   WeChatConfig
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

type WeChatConfig struct {
	Enabled  bool
	CorpID   string
	AgentID  int
	Secret   string
	Callback string // OAuth 回调 URL
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

// envVar defines an environment variable with its metadata.
type envVar struct {
	Key      string // env var name
	Required bool   // if true, startup fails when missing
	Default  string // default value when not required and not set
	Desc     string // human-readable description
}

// All environment variables used by the application, declared in one place.
var envVars = []envVar{
	{Key: "DATABASE_URL", Required: true, Desc: "postgres://user:pass@host:5432/dbname?sslmode=disable"},
	{Key: "JWT_SECRET", Required: true, Desc: "signing key for JWT tokens"},
	{Key: "REDIS_URL", Required: true, Desc: "redis://:pass@host:6379/0"},
	{Key: "MINIO_URL", Required: true, Desc: "minio://key:secret@host:9000/bucket"},
	{Key: "PORT", Default: "8080", Desc: "server port"},
	{Key: "SERVER_MODE", Default: "debug", Desc: "debug / release / test"},
	{Key: "JWT_EXPIRE_HOUR", Default: "24", Desc: "token expiry in hours"},
	{Key: "WECHAT_ENABLED", Default: "false", Desc: "启用企业微信集成；false=mock 模式"},
	{Key: "WECHAT_CORP_ID", Default: "", Desc: "企业微信 CorpID（enabled 时必填）"},
	{Key: "WECHAT_AGENT_ID", Default: "0", Desc: "应用 AgentId"},
	{Key: "WECHAT_SECRET", Default: "", Desc: "应用 Secret"},
	{Key: "WECHAT_CALLBACK", Default: "", Desc: "OAuth 回调 URL"},
}

// loadEnvVars validates all required vars and returns a map of key→value.
// Missing required vars cause an error with full usage info.
func loadEnvVars() (map[string]string, error) {
	_ = godotenv.Load()

	vals := make(map[string]string, len(envVars))
	var missing []string

	for _, v := range envVars {
		val := os.Getenv(v.Key)
		if val == "" {
			if v.Required {
				missing = append(missing, v.Key)
			} else {
				val = v.Default
			}
		}
		vals[v.Key] = val
	}

	if len(missing) > 0 {
		return nil, fmt.Errorf("missing required environment variables: %s\n\nAll env vars:\n%s",
			strings.Join(missing, ", "), envVarUsage())
	}

	return vals, nil
}

// Load reads environment variables (auto-loads .env if present) and returns Config.
func Load() (*Config, error) {
	env, err := loadEnvVars()
	if err != nil {
		return nil, err
	}

	// Parse URL-style vars
	dbCfg, err := parseDatabaseURL(env["DATABASE_URL"])
	if err != nil {
		return nil, fmt.Errorf("invalid DATABASE_URL: %w", err)
	}

	redisCfg, err := parseRedisURL(env["REDIS_URL"])
	if err != nil {
		return nil, fmt.Errorf("invalid REDIS_URL: %w", err)
	}

	minioCfg, err := parseMinIOURL(env["MINIO_URL"])
	if err != nil {
		return nil, fmt.Errorf("invalid MINIO_URL: %w", err)
	}

	port, _ := strconv.Atoi(env["PORT"])
	expireHour, _ := strconv.Atoi(env["JWT_EXPIRE_HOUR"])

	cfg := &Config{
		Server:   ServerConfig{Port: port, Mode: env["SERVER_MODE"]},
		Database: *dbCfg,
		Redis:    *redisCfg,
		JWT:      JWTConfig{Secret: env["JWT_SECRET"], ExpireHour: expireHour},
		MinIO:    *minioCfg,
	}

	agentID, _ := strconv.Atoi(env["WECHAT_AGENT_ID"])
	cfg.WeChat = WeChatConfig{
		Enabled:  env["WECHAT_ENABLED"] == "true",
		CorpID:   env["WECHAT_CORP_ID"],
		AgentID:  agentID,
		Secret:   env["WECHAT_SECRET"],
		Callback: env["WECHAT_CALLBACK"],
	}
	if err := cfg.validateWeChat(); err != nil {
		return nil, err
	}

	return cfg, nil
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

// validateWeChat ensures credentials are present when WeChat integration is enabled.
func (c *Config) validateWeChat() error {
	if !c.WeChat.Enabled {
		return nil
	}
	var missing []string
	if c.WeChat.CorpID == "" {
		missing = append(missing, "WECHAT_CORP_ID")
	}
	if c.WeChat.AgentID == 0 {
		missing = append(missing, "WECHAT_AGENT_ID")
	}
	if c.WeChat.Secret == "" {
		missing = append(missing, "WECHAT_SECRET")
	}
	if c.WeChat.Callback == "" {
		missing = append(missing, "WECHAT_CALLBACK")
	}
	if len(missing) > 0 {
		return fmt.Errorf("WECHAT_ENABLED=true but missing: %s", strings.Join(missing, ", "))
	}
	return nil
}

// envVarUsage returns a formatted list of all env vars for error messages.
func envVarUsage() string {
	var b strings.Builder
	for _, v := range envVars {
		req := "optional"
		if v.Required {
			req = "REQUIRED"
		}
		def := ""
		if v.Default != "" {
			def = fmt.Sprintf(" (default: %s)", v.Default)
		}
		fmt.Fprintf(&b, "  %-20s [%s]%s  %s\n", v.Key, req, def, v.Desc)
	}
	return b.String()
}

