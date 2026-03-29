package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/dttbd/hospital-server/internal/queue"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/hibiken/asynq"
)

type NotificationHandler struct {
	notifSvc *service.NotificationService
}

func NewNotificationHandler(notifSvc *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{notifSvc: notifSvc}
}

func (h *NotificationHandler) HandleSendNotification(ctx context.Context, t *asynq.Task) error {
	var payload queue.NotificationPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("unmarshal payload: %w", err)
	}

	log.Printf("[worker] sending notification to %d users: %s", len(payload.UserIDs), payload.Title)

	return h.notifSvc.SendNotification(
		payload.UserIDs,
		payload.Title,
		payload.Content,
		payload.Type,
		payload.RefType,
		payload.RefID,
	)
}

func HandleSendWechatMsg(ctx context.Context, t *asynq.Task) error {
	var payload queue.WechatMsgPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("unmarshal payload: %w", err)
	}

	// Stub: log the message, actual WeChat API integration in future
	log.Printf("[worker] would send WeChat message to %v: %s", payload.UserIDs, payload.Title)
	return nil
}
