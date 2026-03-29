package worker

import (
	"fmt"
	"log"

	"github.com/hibiken/asynq"
)

type Client struct {
	client *asynq.Client
}

func NewClient(redisAddr, password string, db int) *Client {
	client := asynq.NewClient(asynq.RedisClientOpt{
		Addr:     redisAddr,
		Password: password,
		DB:       db,
	})
	return &Client{client: client}
}

func (c *Client) EnqueueNotification(payload *NotificationPayload) error {
	task, err := NewNotificationTask(payload)
	if err != nil {
		return err
	}
	info, err := c.client.Enqueue(task)
	if err != nil {
		return fmt.Errorf("enqueue notification: %w", err)
	}
	log.Printf("[asynq] enqueued notification task: %s", info.ID)
	return nil
}

func (c *Client) Close() error {
	return c.client.Close()
}
