package worker

import (
	"github.com/dttbd/hospital-server/internal/queue"
)

// Re-export constants and types from queue package for backward compatibility.
const (
	TaskSendNotification = queue.TaskSendNotification
	TaskSendWechatMsg    = queue.TaskSendWechatMsg
)

type NotificationPayload = queue.NotificationPayload
type WechatMsgPayload = queue.WechatMsgPayload

var NewNotificationTask = queue.NewNotificationTask
var NewWechatMsgTask = queue.NewWechatMsgTask
