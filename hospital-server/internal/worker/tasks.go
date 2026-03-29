package worker

import (
	"encoding/json"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
)

const (
	TaskSendNotification = "notification:send"
	TaskSendWechatMsg    = "wechat:send"
)

type NotificationPayload struct {
	UserIDs []uuid.UUID `json:"user_ids"`
	Title   string      `json:"title"`
	Content string      `json:"content"`
	Type    string      `json:"type"`
	RefType string      `json:"ref_type"`
	RefID   *uuid.UUID  `json:"ref_id"`
}

func NewNotificationTask(payload *NotificationPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TaskSendNotification, data), nil
}

type WechatMsgPayload struct {
	UserIDs []string `json:"user_ids"`
	Title   string   `json:"title"`
	Content string   `json:"content"`
	URL     string   `json:"url"`
}

func NewWechatMsgTask(payload *WechatMsgPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TaskSendWechatMsg, data), nil
}
