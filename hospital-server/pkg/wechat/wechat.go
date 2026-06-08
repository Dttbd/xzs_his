// Package wechat provides a pluggable Enterprise WeChat integration:
// real HTTP client when enabled, mock (no network) otherwise.
// It depends only on stdlib + injected interfaces, never on internal/*.
package wechat

import (
	"context"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// Config holds the WeChat integration settings. Defined here (not imported
// from internal/config) so pkg/wechat stays free of internal dependencies,
// matching the primitives-only convention of pkg/storage and pkg/auth.
// The caller (cmd/*/main.go) maps config.WeChatConfig -> wechat.Config.
type Config struct {
	Enabled  bool
	CorpID   string
	AgentID  int
	Secret   string
	Callback string
}

// SSOClient is consumed by the auth layer.
type SSOClient interface {
	// AuthURL builds the WeChat OAuth authorize redirect URL.
	AuthURL(state string) string
	// CodeToUserID exchanges an OAuth code for an Enterprise WeChat UserID.
	CodeToUserID(ctx context.Context, code string) (string, error)
}

// Messenger is consumed by the worker.
type Messenger interface {
	// SendTextCard pushes a text-card message to the given system users.
	SendTextCard(ctx context.Context, userIDs []uuid.UUID, title, content, url string) error
}

// Client implements both capabilities.
type Client interface {
	SSOClient
	Messenger
	Enabled() bool
}

// UserResolver maps system user UUIDs to their Enterprise WeChat UserIDs.
// Empty/unbound users are omitted from the result. Implemented in internal.
type UserResolver interface {
	WechatUserIDs(ctx context.Context, userIDs []uuid.UUID) (map[uuid.UUID]string, error)
}

// MockSink records "what would have been pushed" as a visible in-app notice.
// Implemented in internal. Used only in mock mode.
type MockSink interface {
	RecordMockPush(userIDs []uuid.UUID, title, content string) error
}

// New returns a real client when cfg.Enabled, otherwise a mock client.
// real uses resolver + rdb; mock uses sink.
func New(cfg Config, resolver UserResolver, sink MockSink, rdb *redis.Client) Client {
	if cfg.Enabled {
		return newRealClient(cfg, resolver, rdb)
	}
	return newMockClient(sink)
}
