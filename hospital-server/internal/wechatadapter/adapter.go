// Package wechatadapter wires internal services/repos to the pkg/wechat
// injection interfaces (UserResolver, MockSink), keeping pkg/wechat free of
// internal dependencies.
package wechatadapter

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// --- UserResolver ---

// UserResolver maps system user UUIDs to Enterprise WeChat UserIDs via the DB.
type UserResolver struct {
	db *gorm.DB
}

func NewUserResolver(db *gorm.DB) *UserResolver {
	return &UserResolver{db: db}
}

func (r *UserResolver) WechatUserIDs(ctx context.Context, userIDs []uuid.UUID) (map[uuid.UUID]string, error) {
	out := make(map[uuid.UUID]string, len(userIDs))
	if len(userIDs) == 0 {
		return out, nil
	}
	var rows []struct {
		ID           uuid.UUID
		WechatUserID string
	}
	if err := r.db.WithContext(ctx).
		Table("users").
		Select("id, wechat_user_id").
		Where("id IN ? AND wechat_user_id <> ''", userIDs).
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	for _, row := range rows {
		out[row.ID] = row.WechatUserID
	}
	return out, nil
}

// --- MockSink ---

// notifier is the subset of NotificationService that MockSink needs.
type notifier interface {
	SendNotification(userIDs []uuid.UUID, title, content, nType, refType string, refID *uuid.UUID) error
}

// MockSink records "would-be" WeChat pushes as visible in-app notices.
type MockSink struct {
	notifier notifier
}

func NewMockSink(n notifier) *MockSink {
	return &MockSink{notifier: n}
}

func (s *MockSink) RecordMockPush(userIDs []uuid.UUID, title, content string) error {
	return s.notifier.SendNotification(userIDs, "[企微Mock] "+title, content, "wechat_mock", "wechat_mock", nil)
}
