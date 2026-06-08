package wechat

import (
	"context"
	"errors"
	"log"

	"github.com/google/uuid"
)

type mockClient struct {
	sink MockSink
}

func newMockClient(sink MockSink) *mockClient {
	return &mockClient{sink: sink}
}

func (m *mockClient) Enabled() bool { return false }

func (m *mockClient) AuthURL(state string) string {
	// In mock mode there is no real OAuth; dev-login endpoint is used instead.
	return ""
}

func (m *mockClient) CodeToUserID(ctx context.Context, code string) (string, error) {
	return "", errors.New("wechat SSO unavailable in mock mode; use /api/auth/wechat/dev-login")
}

func (m *mockClient) SendTextCard(ctx context.Context, userIDs []uuid.UUID, title, content, url string) error {
	if m.sink == nil {
		log.Printf("[wechat-mock] would send to %v: %s", userIDs, title)
		return nil
	}
	if err := m.sink.RecordMockPush(userIDs, title, content); err != nil {
		log.Printf("[wechat-mock] record mock push failed: %v", err)
	}
	return nil
}
