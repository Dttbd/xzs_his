package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Redis    RedisConfig    `mapstructure:"redis"`
	JWT      JWTConfig      `mapstructure:"jwt"`
	MinIO    MinIOConfig    `mapstructure:"minio"`
}

type ServerConfig struct {
	Port int    `mapstructure:"port"`
	Mode string `mapstructure:"mode"`
}

type DatabaseConfig struct {
	Host           string `mapstructure:"host"`
	Port           int    `mapstructure:"port"`
	User           string `mapstructure:"user"`
	Password       string `mapstructure:"password"`
	DBName         string `mapstructure:"dbname"`
	SSLMode        string `mapstructure:"sslmode"`
	MigrationsPath string `mapstructure:"migrations_path"`
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

type MinIOConfig struct {
	Endpoint  string `mapstructure:"endpoint"`
	AccessKey string `mapstructure:"access_key"`
	SecretKey string `mapstructure:"secret_key"`
	Bucket    string `mapstructure:"bucket"`
	UseSSL    bool   `mapstructure:"use_ssl"`
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

// RedisAddr returns host:port for Redis client.
func (r *RedisConfig) Addr() string {
	return fmt.Sprintf("%s:%d", r.Host, r.Port)
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

	// URL-style env vars override config.yaml fields
	applyEnvOverrides(&cfg)

	return &cfg, nil
}

// applyEnvOverrides parses URL-style environment variables and overrides config fields.
//
// Supported env vars:
//   DATABASE_URL=postgres://user:pass@host:5432/dbname?sslmode=disable
//   REDIS_URL=redis://:password@host:6379/0
//   MINIO_URL=minio://accesskey:secretkey@host:9000/bucket
//   JWT_SECRET=my-secret
//   PORT=8080
func applyEnvOverrides(cfg *Config) {
	if v := os.Getenv("PORT"); v != "" {
		if port, err := strconv.Atoi(v); err == nil {
			cfg.Server.Port = port
		}
	}

	if v := os.Getenv("JWT_SECRET"); v != "" {
		cfg.JWT.Secret = v
	}

	if v := os.Getenv("DATABASE_URL"); v != "" {
		parseDatabaseURL(v, &cfg.Database)
	}

	if v := os.Getenv("REDIS_URL"); v != "" {
		parseRedisURL(v, &cfg.Redis)
	}

	if v := os.Getenv("MINIO_URL"); v != "" {
		parseMinIOURL(v, &cfg.MinIO)
	}
}

// parseDatabaseURL parses: postgres://user:pass@host:5432/dbname?sslmode=disable
// Also accepts postgresql:// and postgresql+asyncpg:// prefixes.
func parseDatabaseURL(raw string, cfg *DatabaseConfig) {
	// Normalize scheme — strip driver suffixes like +asyncpg
	raw = strings.Replace(raw, "postgresql+asyncpg://", "postgres://", 1)
	raw = strings.Replace(raw, "postgresql://", "postgres://", 1)

	u, err := url.Parse(raw)
	if err != nil {
		return
	}

	cfg.Host = u.Hostname()
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
}

// parseRedisURL parses: redis://:password@host:6379/0
func parseRedisURL(raw string, cfg *RedisConfig) {
	u, err := url.Parse(raw)
	if err != nil {
		return
	}

	cfg.Host = u.Hostname()
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
}

// parseMinIOURL parses: minio://accesskey:secretkey@host:9000/bucket?ssl=true
func parseMinIOURL(raw string, cfg *MinIOConfig) {
	u, err := url.Parse(raw)
	if err != nil {
		return
	}

	cfg.Endpoint = u.Host // host:port
	if u.User != nil {
		cfg.AccessKey = u.User.Username()
		if sk, ok := u.User.Password(); ok {
			cfg.SecretKey = sk
		}
	}
	cfg.Bucket = strings.TrimPrefix(u.Path, "/")
	if ssl := u.Query().Get("ssl"); ssl == "true" {
		cfg.UseSSL = true
	}
	if u.Scheme == "minios" {
		cfg.UseSSL = true
	}
}
