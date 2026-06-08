package main

import (
	"log"

	"github.com/dttbd/hospital-server/internal/config"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/internal/repository"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/dttbd/hospital-server/internal/wechatadapter"
	"github.com/dttbd/hospital-server/internal/worker"
	"github.com/dttbd/hospital-server/pkg/wechat"
	"github.com/hibiken/asynq"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	// Database
	db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}
	if err := models.AutoMigrate(db); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	// Services
	notifRepo := repository.NewNotificationRepo(db)
	notifSvc := service.NewNotificationService(notifRepo)

	// Redis client for shared WeChat token cache
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Addr(),
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})
	defer rdb.Close()

	// WeChat client (real if enabled, else mock that records to in-app notices)
	resolver := wechatadapter.NewUserResolver(db)
	mockSink := wechatadapter.NewMockSink(notifSvc)
	wechatClient := wechat.New(wechat.Config{
		Enabled:  cfg.WeChat.Enabled,
		CorpID:   cfg.WeChat.CorpID,
		AgentID:  cfg.WeChat.AgentID,
		Secret:   cfg.WeChat.Secret,
		Callback: cfg.WeChat.Callback,
	}, resolver, mockSink, rdb)

	// Asynq server
	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: cfg.Redis.Addr(), Password: cfg.Redis.Password, DB: cfg.Redis.DB},
		asynq.Config{Concurrency: 10},
	)

	// Register handlers
	notifHandler := worker.NewNotificationHandler(notifSvc)
	mux := asynq.NewServeMux()
	mux.HandleFunc(worker.TaskSendNotification, notifHandler.HandleSendNotification)
	wechatHandler := worker.NewWechatHandler(wechatClient)
	mux.HandleFunc(worker.TaskSendWechatMsg, wechatHandler.HandleSendWechatMsg)

	log.Println("worker starting...")
	if err := srv.Run(mux); err != nil {
		log.Fatalf("worker failed: %v", err)
	}
}
