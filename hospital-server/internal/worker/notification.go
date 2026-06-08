package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/dttbd/hospital-server/internal/queue"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/dttbd/hospital-server/pkg/wechat"
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

type WechatHandler struct {
	messenger wechat.Messenger
}

func NewWechatHandler(messenger wechat.Messenger) *WechatHandler {
	return &WechatHandler{messenger: messenger}
}

func (h *WechatHandler) HandleSendWechatMsg(ctx context.Context, t *asynq.Task) error {
	var payload queue.WechatMsgPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("unmarshal payload: %w", err)
	}
	log.Printf("[worker] sending wechat msg to %d users: %s", len(payload.UserIDs), payload.Title)
	return h.messenger.SendTextCard(ctx, payload.UserIDs, payload.Title, payload.Content, payload.URL)
}
