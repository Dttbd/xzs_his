# 企业微信集成抽象层 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 HIS 后端建立可插拔的企业微信集成抽象层（SSO + 消息推送），`WECHAT_ENABLED` 开关在真实实现与 Mock 之间切换，使周边逻辑现在就全部写完测完，拿到凭证后只需填配置即可上线。

**Architecture:** 方案 A「接口 + 工厂」。`pkg/wechat` 是纯工具包（不依赖 `internal/*`），定义 `SSOClient`/`Messenger`/`Client` 接口，通过注入的 `UserResolver`/`MockSink`/`*redis.Client` 完成依赖反转。工厂 `New(cfg, resolver, sink, rdb)` 按 `cfg.Enabled` 返回 real 或 mock 实现，消费方（Auth/Worker）只依赖小接口、不判断 enabled。access_token 用 Redis 共享缓存 + SETNX 单飞避免双进程 token 抖动。

**Tech Stack:** Go 1.26 + Gin + GORM + Redis(go-redis v9) + Asynq + 企业微信 API。测试用 `httptest`（伪造企微）+ `miniredis`（内存 Redis）。

**Spec:** `docs/superpowers/specs/2026-06-08-wechat-integration-abstraction-design.md`

---

## 文件结构

**新增**
- `pkg/wechat/wechat.go` — 接口（SSOClient/Messenger/Client）+ 注入接口（UserResolver/MockSink）+ 工厂 New()
- `pkg/wechat/mock.go` — mockClient
- `pkg/wechat/token.go` — Redis 共享 access_token 缓存
- `pkg/wechat/real.go` — realClient（AuthURL/CodeToUserID/SendTextCard）
- `pkg/wechat/wechat_test.go` — 单元测试
- `internal/wechatadapter/adapter.go` — UserResolver + MockSink 的 internal 实现（避免 service/repo 直接依赖 pkg/wechat 的反向约束）

**修改**
- `internal/config/config.go` + `.env.example` — WeChatConfig + 5 env var + 条件校验
- `internal/queue/tasks.go` — WechatMsgPayload 改型为 []uuid.UUID
- `internal/queue/client.go` — 新增 EnqueueWechatMsg
- `internal/service/ticket.go` — 4 处并排入队推送
- `internal/service/auth.go` — LoginByWechatCode / LoginByWechatUserID + SSOClient 字段
- `internal/worker/notification.go` — WechatHandler 方法化
- `internal/dto/auth.go` — WechatCallbackReq / WechatDevLoginReq
- `internal/handler/admin/auth.go` — WechatURL / WechatCallback / WechatDevLogin
- `internal/router/router.go` — 注入 wechat client、注册路由（条件 dev-login）
- `cmd/server/main.go` + `cmd/worker/main.go` — 构造 redis client + wechat client + 装配
- `hospital-web/packages/shared/src/api/auth.ts` + 管理端登录页/回调页 — 前端按钮

---

## Task 1: 配置 — WeChatConfig + 环境变量 + 条件校验

**Files:**
- Modify: `hospital-server/internal/config/config.go`
- Modify: `hospital-server/.env.example`
- Test: `hospital-server/internal/config/config_test.go` (create)

- [ ] **Step 1: 写失败测试**

Create `hospital-server/internal/config/config_test.go`:

```go
package config

import "testing"

func TestValidateWeChat_EnabledRequiresCreds(t *testing.T) {
	cfg := &Config{WeChat: WeChatConfig{Enabled: true}}
	if err := cfg.validateWeChat(); err == nil {
		t.Fatal("expected error when enabled but creds missing, got nil")
	}
}

func TestValidateWeChat_DisabledOK(t *testing.T) {
	cfg := &Config{WeChat: WeChatConfig{Enabled: false}}
	if err := cfg.validateWeChat(); err != nil {
		t.Fatalf("expected nil when disabled, got %v", err)
	}
}

func TestValidateWeChat_EnabledWithCredsOK(t *testing.T) {
	cfg := &Config{WeChat: WeChatConfig{
		Enabled: true, CorpID: "c", AgentID: 1, Secret: "s", Callback: "https://x/cb",
	}}
	if err := cfg.validateWeChat(); err != nil {
		t.Fatalf("expected nil with full creds, got %v", err)
	}
}
```

- [ ] **Step 2: 运行确认失败**

Run: `cd hospital-server && go test ./internal/config/ -run TestValidateWeChat -v`
Expected: FAIL — `WeChatConfig`/`validateWeChat` undefined（编译错误）

- [ ] **Step 3: 实现**

In `hospital-server/internal/config/config.go`, add to the `Config` struct (after `MinIO MinIOConfig`):

```go
	WeChat   WeChatConfig
```

Add the struct (near other config structs):

```go
type WeChatConfig struct {
	Enabled  bool
	CorpID   string
	AgentID  int
	Secret   string
	Callback string // OAuth 回调 URL
}
```

Add validation method (anywhere at file scope):

```go
// validateWeChat ensures credentials are present when WeChat integration is enabled.
func (c *Config) validateWeChat() error {
	if !c.WeChat.Enabled {
		return nil
	}
	var missing []string
	if c.WeChat.CorpID == "" {
		missing = append(missing, "WECHAT_CORP_ID")
	}
	if c.WeChat.AgentID == 0 {
		missing = append(missing, "WECHAT_AGENT_ID")
	}
	if c.WeChat.Secret == "" {
		missing = append(missing, "WECHAT_SECRET")
	}
	if c.WeChat.Callback == "" {
		missing = append(missing, "WECHAT_CALLBACK")
	}
	if len(missing) > 0 {
		return fmt.Errorf("WECHAT_ENABLED=true but missing: %s", strings.Join(missing, ", "))
	}
	return nil
}
```

Add the 5 env vars to the `envVars` slice (after the existing entries):

```go
	{Key: "WECHAT_ENABLED", Default: "false", Desc: "启用企业微信集成；false=mock 模式"},
	{Key: "WECHAT_CORP_ID", Default: "", Desc: "企业微信 CorpID（enabled 时必填）"},
	{Key: "WECHAT_AGENT_ID", Default: "0", Desc: "应用 AgentId"},
	{Key: "WECHAT_SECRET", Default: "", Desc: "应用 Secret"},
	{Key: "WECHAT_CALLBACK", Default: "", Desc: "OAuth 回调 URL"},
```

In `Load()`, after the `Config` struct is assembled and before `return`, populate WeChat and validate. Find the `return &Config{...}` / `cfg := &Config{...}` assembly and add WeChat field plus a call to `validateWeChat()`. Concretely, locate where vals are read (e.g. `vals["PORT"]`) and add:

```go
	agentID, _ := strconv.Atoi(vals["WECHAT_AGENT_ID"])
	cfg.WeChat = WeChatConfig{
		Enabled:  vals["WECHAT_ENABLED"] == "true",
		CorpID:   vals["WECHAT_CORP_ID"],
		AgentID:  agentID,
		Secret:   vals["WECHAT_SECRET"],
		Callback: vals["WECHAT_CALLBACK"],
	}
	if err := cfg.validateWeChat(); err != nil {
		return nil, err
	}
```

> Note: `cfg` must be the assembled `*Config` variable. If `Load()` currently returns a composite literal directly, refactor to assign `cfg := &Config{...}` first, then the block above, then `return cfg, nil`.

- [ ] **Step 4: 运行确认通过**

Run: `cd hospital-server && go test ./internal/config/ -run TestValidateWeChat -v`
Expected: PASS (3 tests)

- [ ] **Step 5: 更新 .env.example**

Append to `hospital-server/.env.example`:

```
# 企业微信集成（默认关闭，开发用 mock 模式）
WECHAT_ENABLED=false
WECHAT_CORP_ID=
WECHAT_AGENT_ID=0
WECHAT_SECRET=
WECHAT_CALLBACK=
```

- [ ] **Step 6: 提交**

```bash
cd hospital-server && go build ./... && cd ..
git add hospital-server/internal/config/config.go hospital-server/internal/config/config_test.go hospital-server/.env.example
git commit -m "feat(config): 新增 WeChatConfig 与条件必填校验"
```

---

## Task 2: pkg/wechat 接口 + 工厂 + mock 客户端

**Files:**
- Create: `hospital-server/pkg/wechat/wechat.go`
- Create: `hospital-server/pkg/wechat/mock.go`
- Test: `hospital-server/pkg/wechat/wechat_test.go`

- [ ] **Step 1: 写失败测试**

Create `hospital-server/pkg/wechat/wechat_test.go`:

```go
package wechat

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

type fakeSink struct {
	gotUserIDs []uuid.UUID
	gotTitle   string
	gotContent string
}

func (f *fakeSink) RecordMockPush(userIDs []uuid.UUID, title, content string) error {
	f.gotUserIDs = userIDs
	f.gotTitle = title
	f.gotContent = content
	return nil
}

func TestNew_DisabledReturnsMock(t *testing.T) {
	c := New(Config{Enabled: false}, nil, &fakeSink{}, nil)
	if c.Enabled() {
		t.Fatal("expected mock client Enabled()==false")
	}
}

func TestMock_SendTextCardRecordsToSink(t *testing.T) {
	sink := &fakeSink{}
	c := New(Config{Enabled: false}, nil, sink, nil)
	id := uuid.New()
	if err := c.SendTextCard(context.Background(), []uuid.UUID{id}, "标题", "内容", ""); err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if len(sink.gotUserIDs) != 1 || sink.gotUserIDs[0] != id {
		t.Fatalf("sink did not receive user id, got %v", sink.gotUserIDs)
	}
	if sink.gotTitle != "标题" {
		t.Fatalf("title mismatch: %s", sink.gotTitle)
	}
}

func TestMock_CodeToUserIDErrors(t *testing.T) {
	c := New(Config{Enabled: false}, nil, &fakeSink{}, nil)
	if _, err := c.CodeToUserID(context.Background(), "any"); err == nil {
		t.Fatal("expected error from mock CodeToUserID")
	}
}
```

- [ ] **Step 2: 运行确认失败**

Run: `cd hospital-server && go test ./pkg/wechat/ -v`
Expected: FAIL — package/types undefined

- [ ] **Step 3: 实现接口与工厂**

Create `hospital-server/pkg/wechat/wechat.go`:

```go
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
```

Create `hospital-server/pkg/wechat/mock.go`:

```go
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
```

- [ ] **Step 4: 加临时 stub 使包可编译**

`wechat.go` 的工厂 `New` 引用了 `newRealClient`（在 Task 4 才实现）。为让本任务独立可编译可测，创建一个临时 stub 文件，**Task 4 Step 3 会删除它**。

Create `hospital-server/pkg/wechat/realstub.go`:

```go
package wechat

import "github.com/redis/go-redis/v9"

// TEMP: replaced by real.go in Task 4. Delete this file in Task 4 Step 3.
func newRealClient(cfg Config, resolver UserResolver, rdb *redis.Client) Client {
	panic("real client implemented in Task 4")
}
```

- [ ] **Step 5: 运行确认通过**

Run: `cd hospital-server && go test ./pkg/wechat/ -v`
Expected: PASS (TestNew_DisabledReturnsMock, TestMock_SendTextCardRecordsToSink, TestMock_CodeToUserIDErrors)

- [ ] **Step 6: 提交**

```bash
git add hospital-server/pkg/wechat/wechat.go hospital-server/pkg/wechat/mock.go hospital-server/pkg/wechat/realstub.go hospital-server/pkg/wechat/wechat_test.go
git commit -m "feat(wechat): 接口、工厂与 mock 客户端"
```

---

## Task 3: pkg/wechat token 缓存（Redis 共享 + SETNX 单飞）

**Files:**
- Create: `hospital-server/pkg/wechat/token.go`
- Test: append to `hospital-server/pkg/wechat/wechat_test.go`

- [ ] **Step 1: 添加 miniredis 测试依赖**

Run:
```bash
cd hospital-server && go get github.com/alicebob/miniredis/v2@latest
```
Expected: go.mod 增加 miniredis 依赖

- [ ] **Step 2: 写失败测试**

Append to `hospital-server/pkg/wechat/wechat_test.go`:

```go
import (
	// add to existing import block:
	"net/http"
	"net/http/httptest"
	"sync/atomic"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func newTestRedis(t *testing.T) *redis.Client {
	t.Helper()
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("miniredis: %v", err)
	}
	t.Cleanup(mr.Close)
	return redis.NewClient(&redis.Options{Addr: mr.Addr()})
}

func TestTokenCache_FetchesThenCaches(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.Write([]byte(`{"errcode":0,"errmsg":"ok","access_token":"TOK123","expires_in":7200}`))
	}))
	t.Cleanup(srv.Close)

	tc := &tokenCache{
		rdb: newTestRedis(t), corpID: "c", secret: "s",
		httpClient: srv.Client(), baseURL: srv.URL,
	}

	tok, err := tc.get(context.Background())
	if err != nil || tok != "TOK123" {
		t.Fatalf("first get: tok=%q err=%v", tok, err)
	}
	tok2, _ := tc.get(context.Background())
	if tok2 != "TOK123" {
		t.Fatalf("second get: tok=%q", tok2)
	}
	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Fatalf("expected 1 gettoken HTTP call (cached), got %d", got)
	}
}

func TestTokenCache_InvalidateForcesRefetch(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.Write([]byte(`{"errcode":0,"access_token":"TOK","expires_in":7200}`))
	}))
	t.Cleanup(srv.Close)
	tc := &tokenCache{rdb: newTestRedis(t), corpID: "c", secret: "s", httpClient: srv.Client(), baseURL: srv.URL}

	tc.get(context.Background())
	tc.invalidate(context.Background())
	tc.get(context.Background())
	if got := atomic.LoadInt32(&calls); got != 2 {
		t.Fatalf("expected 2 calls after invalidate, got %d", got)
	}
}
```

- [ ] **Step 3: 运行确认失败**

Run: `cd hospital-server && go test ./pkg/wechat/ -run TestTokenCache -v`
Expected: FAIL — `tokenCache` undefined

- [ ] **Step 4: 实现 token.go**

Create `hospital-server/pkg/wechat/token.go`:

```go
package wechat

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	tokenKey      = "wechat:access_token"
	tokenLockKey  = "wechat:token:lock"
	tokenLockTTL  = 10 * time.Second
	tokenMargin   = 60 * time.Second // refresh this long before expiry
	tokenLockWait = 300 * time.Millisecond
)

// tokenCache fetches and shares the Enterprise WeChat access_token via Redis,
// so the server and worker processes never invalidate each other's token.
type tokenCache struct {
	rdb        *redis.Client
	corpID     string
	secret     string
	httpClient *http.Client
	baseURL    string // e.g. https://qyapi.weixin.qq.com
}

type gettokenResp struct {
	ErrCode     int    `json:"errcode"`
	ErrMsg      string `json:"errmsg"`
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

// get returns a valid token, fetching+caching it if absent.
func (t *tokenCache) get(ctx context.Context) (string, error) {
	if v, err := t.rdb.Get(ctx, tokenKey).Result(); err == nil && v != "" {
		return v, nil
	}
	// Single-flight: only one process refreshes at a time.
	ok, _ := t.rdb.SetNX(ctx, tokenLockKey, "1", tokenLockTTL).Result()
	if !ok {
		time.Sleep(tokenLockWait)
		if v, err := t.rdb.Get(ctx, tokenKey).Result(); err == nil && v != "" {
			return v, nil
		}
		// fall through and fetch anyway (lock holder may have failed)
	} else {
		defer t.rdb.Del(ctx, tokenLockKey)
	}

	token, expiresIn, err := t.fetch(ctx)
	if err != nil {
		return "", err
	}
	ttl := time.Duration(expiresIn)*time.Second - tokenMargin
	if ttl < time.Second {
		ttl = time.Second
	}
	t.rdb.Set(ctx, tokenKey, token, ttl)
	return token, nil
}

// invalidate drops the cached token (used after errcode 42001).
func (t *tokenCache) invalidate(ctx context.Context) {
	t.rdb.Del(ctx, tokenKey)
}

func (t *tokenCache) fetch(ctx context.Context) (string, int, error) {
	u := fmt.Sprintf("%s/cgi-bin/gettoken?corpid=%s&corpsecret=%s",
		t.baseURL, url.QueryEscape(t.corpID), url.QueryEscape(t.secret))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return "", 0, err
	}
	resp, err := t.httpClient.Do(req)
	if err != nil {
		return "", 0, fmt.Errorf("gettoken: %w", err)
	}
	defer resp.Body.Close()

	var r gettokenResp
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return "", 0, fmt.Errorf("gettoken decode: %w", err)
	}
	if r.ErrCode != 0 {
		return "", 0, fmt.Errorf("gettoken errcode=%d errmsg=%s", r.ErrCode, r.ErrMsg)
	}
	return r.AccessToken, r.ExpiresIn, nil
}
```

- [ ] **Step 5: 运行确认通过**

Run: `cd hospital-server && go test ./pkg/wechat/ -run TestTokenCache -v`
Expected: PASS (2 tests)

- [ ] **Step 6: 提交**

```bash
git add hospital-server/pkg/wechat/token.go hospital-server/pkg/wechat/wechat_test.go hospital-server/go.mod hospital-server/go.sum
git commit -m "feat(wechat): Redis 共享 access_token 缓存与单飞刷新"
```

---

## Task 4: pkg/wechat real 客户端（AuthURL / CodeToUserID / SendTextCard）

**Files:**
- Create: `hospital-server/pkg/wechat/real.go`
- Test: append to `hospital-server/pkg/wechat/wechat_test.go`

- [ ] **Step 1: 写失败测试**

Append to `hospital-server/pkg/wechat/wechat_test.go`:

```go
import (
	// add to existing import block:
	"strings"
)

type fakeResolver struct{ m map[uuid.UUID]string }

func (f fakeResolver) WechatUserIDs(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]string, error) {
	return f.m, nil
}

func newTestReal(t *testing.T, baseURL string, resolver UserResolver) *realClient {
	t.Helper()
	return &realClient{
		cfg:        Config{Enabled: true, CorpID: "corp", AgentID: 7, Secret: "sec", Callback: "https://app/cb"},
		resolver:   resolver,
		httpClient: &http.Client{},
		baseURL:    baseURL,
		token:      &tokenCache{rdb: newTestRedis(t), corpID: "corp", secret: "sec", httpClient: &http.Client{}, baseURL: baseURL},
	}
}

func TestReal_AuthURL(t *testing.T) {
	rc := newTestReal(t, "https://qyapi.weixin.qq.com", nil)
	got := rc.AuthURL("xyz")
	for _, want := range []string{"appid=corp", "agentid=7", "state=xyz", "response_type=code", "redirect_uri=https%3A%2F%2Fapp%2Fcb"} {
		if !strings.Contains(got, want) {
			t.Fatalf("AuthURL missing %q in %s", want, got)
		}
	}
}

func TestReal_CodeToUserID(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.Contains(r.URL.Path, "gettoken"):
			w.Write([]byte(`{"errcode":0,"access_token":"T","expires_in":7200}`))
		case strings.Contains(r.URL.Path, "auth/getuserinfo"):
			if r.URL.Query().Get("code") != "CODE1" {
				t.Errorf("code not forwarded: %s", r.URL.RawQuery)
			}
			w.Write([]byte(`{"errcode":0,"userid":"zhangsan"}`))
		}
	}))
	t.Cleanup(srv.Close)
	rc := newTestReal(t, srv.URL, nil)
	rc.httpClient = srv.Client()
	rc.token.httpClient = srv.Client()

	uid, err := rc.CodeToUserID(context.Background(), "CODE1")
	if err != nil || uid != "zhangsan" {
		t.Fatalf("got uid=%q err=%v", uid, err)
	}
}

func TestReal_SendTextCard_ResolvesAndPosts(t *testing.T) {
	var gotTouser string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.Contains(r.URL.Path, "gettoken"):
			w.Write([]byte(`{"errcode":0,"access_token":"T","expires_in":7200}`))
		case strings.Contains(r.URL.Path, "message/send"):
			var body map[string]any
			json.NewDecoder(r.Body).Decode(&body)
			gotTouser, _ = body["touser"].(string)
			w.Write([]byte(`{"errcode":0,"errmsg":"ok"}`))
		}
	}))
	t.Cleanup(srv.Close)

	id1, id2 := uuid.New(), uuid.New()
	resolver := fakeResolver{m: map[uuid.UUID]string{id1: "wx1", id2: "wx2"}}
	rc := newTestReal(t, srv.URL, resolver)
	rc.httpClient = srv.Client()
	rc.token.httpClient = srv.Client()

	if err := rc.SendTextCard(context.Background(), []uuid.UUID{id1, id2}, "标题", "内容", ""); err != nil {
		t.Fatalf("send err: %v", err)
	}
	if !strings.Contains(gotTouser, "wx1") || !strings.Contains(gotTouser, "wx2") {
		t.Fatalf("touser missing resolved ids: %q", gotTouser)
	}
}

func TestReal_SendTextCard_NoRecipientsSkips(t *testing.T) {
	resolver := fakeResolver{m: map[uuid.UUID]string{}} // none bound
	rc := newTestReal(t, "https://unused", resolver)
	if err := rc.SendTextCard(context.Background(), []uuid.UUID{uuid.New()}, "t", "c", ""); err != nil {
		t.Fatalf("expected nil when no recipients, got %v", err)
	}
}
```

- [ ] **Step 2: 运行确认失败**

Run: `cd hospital-server && go test ./pkg/wechat/ -run TestReal -v`
Expected: FAIL — `realClient` undefined

- [ ] **Step 3: 实现 real.go**

First, delete the temporary stub file from Task 2:

```bash
rm hospital-server/pkg/wechat/realstub.go
```

Create `hospital-server/pkg/wechat/real.go`:

```go
package wechat

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

const qyAPIBase = "https://qyapi.weixin.qq.com"

// defaultCardURL is used when no deep-link URL is supplied, because the
// textcard message type requires a non-empty url. Deep-linking to specific
// tickets is a future enhancement once a public web base URL is configured.
const defaultCardURL = "https://work.weixin.qq.com"

type realClient struct {
	cfg        Config
	resolver   UserResolver
	httpClient *http.Client
	baseURL    string
	token      *tokenCache
}

func newRealClient(cfg Config, resolver UserResolver, rdb *redis.Client) *realClient {
	hc := &http.Client{}
	return &realClient{
		cfg:        cfg,
		resolver:   resolver,
		httpClient: hc,
		baseURL:    qyAPIBase,
		token: &tokenCache{
			rdb: rdb, corpID: cfg.CorpID, secret: cfg.Secret,
			httpClient: hc, baseURL: qyAPIBase,
		},
	}
}

func (c *realClient) Enabled() bool { return true }

func (c *realClient) AuthURL(state string) string {
	return fmt.Sprintf(
		"https://open.weixin.qq.com/connect/oauth2/authorize?appid=%s&redirect_uri=%s&response_type=code&scope=snsapi_base&state=%s&agentid=%d#wechat_redirect",
		url.QueryEscape(c.cfg.CorpID), url.QueryEscape(c.cfg.Callback), url.QueryEscape(state), c.cfg.AgentID,
	)
}

type getUserInfoResp struct {
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
	UserID  string `json:"userid"`
}

func (c *realClient) CodeToUserID(ctx context.Context, code string) (string, error) {
	token, err := c.token.get(ctx)
	if err != nil {
		return "", err
	}
	u := fmt.Sprintf("%s/cgi-bin/auth/getuserinfo?access_token=%s&code=%s",
		c.baseURL, url.QueryEscape(token), url.QueryEscape(code))
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("getuserinfo: %w", err)
	}
	defer resp.Body.Close()

	var r getUserInfoResp
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return "", fmt.Errorf("getuserinfo decode: %w", err)
	}
	if r.ErrCode == 42001 { // token expired: refresh once and retry
		c.token.invalidate(ctx)
		return c.codeToUserIDRetry(ctx, code)
	}
	if r.ErrCode != 0 {
		return "", fmt.Errorf("getuserinfo errcode=%d errmsg=%s", r.ErrCode, r.ErrMsg)
	}
	if r.UserID == "" {
		return "", fmt.Errorf("getuserinfo returned empty userid (external/non-member?)")
	}
	return r.UserID, nil
}

func (c *realClient) codeToUserIDRetry(ctx context.Context, code string) (string, error) {
	token, err := c.token.get(ctx)
	if err != nil {
		return "", err
	}
	u := fmt.Sprintf("%s/cgi-bin/auth/getuserinfo?access_token=%s&code=%s",
		c.baseURL, url.QueryEscape(token), url.QueryEscape(code))
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("getuserinfo retry: %w", err)
	}
	defer resp.Body.Close()
	var r getUserInfoResp
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return "", err
	}
	if r.ErrCode != 0 {
		return "", fmt.Errorf("getuserinfo retry errcode=%d errmsg=%s", r.ErrCode, r.ErrMsg)
	}
	return r.UserID, nil
}

type sendResp struct {
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
}

func (c *realClient) SendTextCard(ctx context.Context, userIDs []uuid.UUID, title, content, link string) error {
	if len(userIDs) == 0 {
		return nil
	}
	resolved, err := c.resolver.WechatUserIDs(ctx, userIDs)
	if err != nil {
		return fmt.Errorf("resolve wechat userids: %w", err)
	}
	wxIDs := make([]string, 0, len(resolved))
	for _, wx := range resolved {
		if wx != "" {
			wxIDs = append(wxIDs, wx)
		}
	}
	if len(wxIDs) == 0 {
		return nil // no recipients bound to WeChat
	}
	if link == "" {
		link = defaultCardURL
	}
	return c.send(ctx, wxIDs, title, content, link, true)
}

func (c *realClient) send(ctx context.Context, wxIDs []string, title, content, link string, allowRetry bool) error {
	token, err := c.token.get(ctx)
	if err != nil {
		return err
	}
	payload := map[string]any{
		"touser":  strings.Join(wxIDs, "|"),
		"msgtype": "textcard",
		"agentid": c.cfg.AgentID,
		"textcard": map[string]string{
			"title":       title,
			"description": content,
			"url":         link,
			"btntxt":      "详情",
		},
	}
	body, _ := json.Marshal(payload)
	u := fmt.Sprintf("%s/cgi-bin/message/send?access_token=%s", c.baseURL, url.QueryEscape(token))
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, u, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("message/send: %w", err)
	}
	defer resp.Body.Close()
	var r sendResp
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return fmt.Errorf("message/send decode: %w", err)
	}
	if r.ErrCode == 42001 && allowRetry {
		c.token.invalidate(ctx)
		return c.send(ctx, wxIDs, title, content, link, false)
	}
	if r.ErrCode != 0 {
		return fmt.Errorf("message/send errcode=%d errmsg=%s", r.ErrCode, r.ErrMsg)
	}
	return nil
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd hospital-server && go test ./pkg/wechat/ -v`
Expected: PASS (all tests in package, mock + token + real)

- [ ] **Step 5: 提交**

```bash
git add -A hospital-server/pkg/wechat/   # includes real.go add + realstub.go removal
git commit -m "feat(wechat): 真实客户端 AuthURL/CodeToUserID/SendTextCard"
```

---

## Task 5: queue — WechatMsgPayload 改型 + EnqueueWechatMsg

**Files:**
- Modify: `hospital-server/internal/queue/tasks.go`
- Modify: `hospital-server/internal/queue/client.go`

- [ ] **Step 1: 改 WechatMsgPayload 类型**

In `hospital-server/internal/queue/tasks.go`, replace the `WechatMsgPayload` struct:

```go
type WechatMsgPayload struct {
	UserIDs []uuid.UUID `json:"user_ids"`
	Title   string      `json:"title"`
	Content string      `json:"content"`
	URL     string      `json:"url"`
}
```

(The file already imports `github.com/google/uuid` for `NotificationPayload`; no new import.)

- [ ] **Step 2: 新增 EnqueueWechatMsg**

In `hospital-server/internal/queue/client.go`, add after `EnqueueNotification`:

```go
func (c *Client) EnqueueWechatMsg(payload *WechatMsgPayload) error {
	task, err := NewWechatMsgTask(payload)
	if err != nil {
		return err
	}
	info, err := c.client.Enqueue(task)
	if err != nil {
		return fmt.Errorf("enqueue wechat msg: %w", err)
	}
	log.Printf("[asynq] enqueued wechat msg task: %s", info.ID)
	return nil
}
```

- [ ] **Step 3: 运行确认编译**

Run: `cd hospital-server && go build ./internal/queue/`
Expected: 成功（无输出）

> Note: `internal/worker/notification.go` currently unmarshals `WechatMsgPayload` with `UserIDs []string` semantics — it will be rewritten in Task 7. The build of the whole module may break until Task 7; building only `./internal/queue/` here is intentional.

- [ ] **Step 4: 提交**

```bash
git add hospital-server/internal/queue/tasks.go hospital-server/internal/queue/client.go
git commit -m "feat(queue): WechatMsgPayload 改用 UUID + EnqueueWechatMsg"
```

---

## Task 6: internal 适配器 — UserResolver + MockSink

**Files:**
- Create: `hospital-server/internal/wechatadapter/adapter.go`
- Test: `hospital-server/internal/wechatadapter/adapter_test.go`

> Why a separate package: keeps `pkg/wechat` free of `internal` imports while giving the factory concrete implementations. `UserResolver` is backed by a GORM query; `MockSink` reuses `NotificationService.SendNotification`.

- [ ] **Step 1: 写失败测试（resolver 用 sqlmock-free 真实 DB 在集成层验证；此处仅测 MockSink 适配）**

Create `hospital-server/internal/wechatadapter/adapter_test.go`:

```go
package wechatadapter

import (
	"testing"

	"github.com/google/uuid"
)

type recordingNotifier struct {
	userIDs []uuid.UUID
	title   string
	nType   string
}

func (r *recordingNotifier) SendNotification(userIDs []uuid.UUID, title, content, nType, refType string, refID *uuid.UUID) error {
	r.userIDs = userIDs
	r.title = title
	r.nType = nType
	return nil
}

func TestMockSink_RecordsAsWechatMockNotice(t *testing.T) {
	n := &recordingNotifier{}
	sink := NewMockSink(n)
	id := uuid.New()
	if err := sink.RecordMockPush([]uuid.UUID{id}, "标题", "内容"); err != nil {
		t.Fatalf("err: %v", err)
	}
	if n.nType != "wechat_mock" {
		t.Fatalf("expected type wechat_mock, got %s", n.nType)
	}
	if len(n.userIDs) != 1 || n.userIDs[0] != id {
		t.Fatalf("user ids not forwarded: %v", n.userIDs)
	}
}
```

- [ ] **Step 2: 运行确认失败**

Run: `cd hospital-server && go test ./internal/wechatadapter/ -v`
Expected: FAIL — package/types undefined

- [ ] **Step 3: 实现 adapter.go**

Create `hospital-server/internal/wechatadapter/adapter.go`:

```go
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
```

> Verify the DB column name: the spec/model uses field `WechatUserID`. Confirm the actual column with `grep -n "WechatUserID" internal/models/user.go` — GORM default snake_cases it to `wechat_user_id`. If the model tag pins a different column (e.g. `column:wechat_userid`), use that name in the `Select`/`Where` above. **This is critical — adjust before running.**

- [ ] **Step 4: 校正列名并运行通过**

Run:
```bash
cd hospital-server && grep -n "WechatUserID" internal/models/user.go
```
Adjust `wechat_user_id` in adapter.go if needed, then:
```bash
go test ./internal/wechatadapter/ -v
```
Expected: PASS (TestMockSink_RecordsAsWechatMockNotice)

- [ ] **Step 5: 提交**

```bash
git add hospital-server/internal/wechatadapter/
git commit -m "feat(wechatadapter): UserResolver 与 MockSink 内部适配器"
```

---

## Task 7: worker — WechatHandler 方法化 + worker main 装配

**Files:**
- Modify: `hospital-server/internal/worker/notification.go`
- Modify: `hospital-server/cmd/worker/main.go`

- [ ] **Step 1: 重写 HandleSendWechatMsg 为 WechatHandler 方法**

In `hospital-server/internal/worker/notification.go`, replace the free function `HandleSendWechatMsg` with:

```go
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
	return h.messenger.SendTextCard(ctx, payload.UserIDs, payload.Title, payload.Content, payload.URL)
}
```

Add the import `"github.com/dttbd/hospital-server/pkg/wechat"` to the file's import block.

- [ ] **Step 2: 更新 worker main 装配**

In `hospital-server/cmd/worker/main.go`:

Add imports:
```go
	"github.com/dttbd/hospital-server/internal/wechatadapter"
	"github.com/dttbd/hospital-server/pkg/wechat"
	"github.com/redis/go-redis/v9"
```

After `notifSvc := service.NewNotificationService(notifRepo)`, add:

```go
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
```

Replace the handler registration line:
```go
	mux.HandleFunc(worker.TaskSendWechatMsg, worker.HandleSendWechatMsg)
```
with:
```go
	wechatHandler := worker.NewWechatHandler(wechatClient)
	mux.HandleFunc(worker.TaskSendWechatMsg, wechatHandler.HandleSendWechatMsg)
```

- [ ] **Step 3: 运行确认编译 + 现有 worker 测试**

Run: `cd hospital-server && go build ./...`
Expected: 成功（whole module now compiles again）

- [ ] **Step 4: 提交**

```bash
git add hospital-server/internal/worker/notification.go hospital-server/cmd/worker/main.go
git commit -m "feat(worker): WechatHandler 注入 Messenger，装配 mock/real"
```

---

## Task 8: ticket 服务 — 4 处并排入队企微推送

**Files:**
- Modify: `hospital-server/internal/service/ticket.go`

> At each of the 4 sites that call `EnqueueNotification`, add a parallel `EnqueueWechatMsg` with the same recipients/title/content inside the same goroutine, so 站内信 and WeChat push become equal dual channels.

- [ ] **Step 1: 站点1 — 创建工单通知处理人（~line 240）**

After the `EnqueueNotification` call's error handling block inside the create-notify goroutine, add:

```go
			if werr := s.asynqClient.EnqueueWechatMsg(&queue.WechatMsgPayload{
				UserIDs: []uuid.UUID{assigneeID},
				Title:   "新工单分配给您",
				Content: ticketTitle,
			}); werr != nil {
				log.Printf("failed to enqueue wechat msg: %v", werr)
			}
```

- [ ] **Step 2: 站点2 — 状态流转通知创建人（~line 315）**

Inside that goroutine, after the notification enqueue error block, add (note this site builds `Content` with `toStatusName`):

```go
			if werr := s.asynqClient.EnqueueWechatMsg(&queue.WechatMsgPayload{
				UserIDs: []uuid.UUID{creatorID},
				Title:   "工单状态已更新",
				Content: "工单「" + ticket.Title + "」已流转至：" + toStatusName,
			}); werr != nil {
				log.Printf("failed to enqueue wechat msg: %v", werr)
			}
```

- [ ] **Step 3: 站点3 — 转派通知新处理人（~line 361）**

```go
			if werr := s.asynqClient.EnqueueWechatMsg(&queue.WechatMsgPayload{
				UserIDs: []uuid.UUID{assigneeID},
				Title:   "工单已分配给您",
				Content: ticketTitle,
			}); werr != nil {
				log.Printf("failed to enqueue wechat msg: %v", werr)
			}
```

- [ ] **Step 4: 站点4 — 评论通知相关人（~line 415）**

```go
				if werr := s.asynqClient.EnqueueWechatMsg(&queue.WechatMsgPayload{
					UserIDs: recipientIDs,
					Title:   "工单有新评论",
					Content: req.Content,
				}); werr != nil {
					log.Printf("failed to enqueue wechat msg: %v", werr)
				}
```

> Verify each insertion is inside the existing `if s.asynqClient != nil { ... go func() { ... }() }` block and uses the same captured local variables (`assigneeID`, `creatorID`, `toStatusName`, `ticketTitle`, `recipientIDs`, `req.Content`) already present at each site. Do not introduce new captures.

- [ ] **Step 5: 运行确认编译 + ticket 集成测试**

Run: `cd hospital-server && go build ./... && go test ./internal/service/ 2>&1 | tail -5`
Expected: 编译成功；现有 service 单测（若有）通过

- [ ] **Step 6: 提交**

```bash
git add hospital-server/internal/service/ticket.go
git commit -m "feat(ticket): 工单事件并排入队企微推送（双通道）"
```

---

## Task 9: auth 服务 — LoginByWechatCode / LoginByWechatUserID + SSOClient

**Files:**
- Modify: `hospital-server/internal/service/auth.go`
- Test: `hospital-server/tests/integration/wechat_test.go` (created in Task 12; service logic verified there)

- [ ] **Step 1: 给 AuthService 增加 SSOClient 字段**

In `hospital-server/internal/service/auth.go`, update struct + constructor:

```go
type AuthService struct {
	db        *gorm.DB
	jwtSecret string
	expireH   int
	sso       wechat.SSOClient
}

func NewAuthService(db *gorm.DB, jwtSecret string, expireH int, sso wechat.SSOClient) *AuthService {
	return &AuthService{db: db, jwtSecret: jwtSecret, expireH: expireH, sso: sso}
}
```

Add import `"github.com/dttbd/hospital-server/pkg/wechat"`.

- [ ] **Step 2: 加 LoginByWechatCode / LoginByWechatUserID**

Add to `auth.go`:

```go
// LoginByWechatCode exchanges an OAuth code for a WeChat UserID, then logs in.
func (s *AuthService) LoginByWechatCode(ctx context.Context, code string) (*dto.LoginResp, error) {
	wechatUserID, err := s.sso.CodeToUserID(ctx, code)
	if err != nil {
		return nil, err
	}
	return s.LoginByWechatUserID(ctx, wechatUserID)
}

// LoginByWechatUserID matches a system user by wechat_userid and issues a JWT.
// Shared by the real OAuth callback and the dev-login endpoint.
func (s *AuthService) LoginByWechatUserID(ctx context.Context, wechatUserID string) (*dto.LoginResp, error) {
	if wechatUserID == "" {
		return nil, errors.New("empty wechat userid")
	}
	var user models.User
	if err := s.db.WithContext(ctx).Preload("Roles").Preload("Region").Preload("Province").
		Where("wechat_user_id = ? AND status = 1", wechatUserID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("该企业微信未绑定系统账号")
		}
		return nil, err
	}

	token, err := auth.GenerateToken(s.jwtSecret, user.ID, user.Username, s.expireH)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	s.db.Model(&user).Update("last_login_at", &now)

	return &dto.LoginResp{
		Token:     token,
		ExpiresIn: s.expireH * 3600,
		User:      user,
	}, nil
}
```

Add `"context"` to imports.

> Use the same column name (`wechat_user_id`) confirmed in Task 6. Adjust if the model pins a different column.

- [ ] **Step 3: 运行确认编译**

Run: `cd hospital-server && go build ./internal/service/`
Expected: FAIL — `NewAuthService` callers (router) pass 3 args, now needs 4. This is expected; fixed in Task 11.

Run instead: `cd hospital-server && go vet ./internal/service/ 2>&1 | head`
Expected: only the in-package code compiles; callers updated in Task 11.

- [ ] **Step 4: 提交**

```bash
git add hospital-server/internal/service/auth.go
git commit -m "feat(auth): 企微登录 LoginByWechatCode/LoginByWechatUserID"
```

---

## Task 10: DTO + 管理端 auth handler 的企微方法

**Files:**
- Modify: `hospital-server/internal/dto/auth.go`
- Modify: `hospital-server/internal/handler/admin/auth.go`

- [ ] **Step 1: 加 DTO**

Append to `hospital-server/internal/dto/auth.go`:

```go
type WechatCallbackReq struct {
	Code  string `json:"code" binding:"required"`
	State string `json:"state"`
}

type WechatDevLoginReq struct {
	WechatUserID string `json:"wechat_userid" binding:"required"`
}
```

- [ ] **Step 2: handler 持有 SSOClient + 三个方法**

In `hospital-server/internal/handler/admin/auth.go`, update struct + constructor:

```go
type AuthHandler struct {
	svc    *service.AuthService
	wechat wechat.SSOClient
}

func NewAuthHandler(svc *service.AuthService, wc wechat.SSOClient) *AuthHandler {
	return &AuthHandler{svc: svc, wechat: wc}
}
```

Add imports `"github.com/dttbd/hospital-server/pkg/wechat"`.

Add methods:

```go
// WechatURL returns the Enterprise WeChat OAuth authorize URL.
func (h *AuthHandler) WechatURL(c *gin.Context) {
	state := c.Query("state")
	c.JSON(http.StatusOK, dto.OK(gin.H{"url": h.wechat.AuthURL(state)}))
}

// WechatCallback handles the OAuth callback (code -> login).
func (h *AuthHandler) WechatCallback(c *gin.Context) {
	var req dto.WechatCallbackReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}
	resp, err := h.svc.LoginByWechatCode(c.Request.Context(), req.Code)
	if err != nil {
		c.JSON(http.StatusUnauthorized, dto.Fail(401, err.Error()))
		return
	}
	c.JSON(http.StatusOK, dto.OK(resp))
}

// WechatDevLogin is a development-only endpoint (registered only when WeChat
// is disabled) that logs in directly by wechat_userid, bypassing OAuth.
func (h *AuthHandler) WechatDevLogin(c *gin.Context) {
	var req dto.WechatDevLoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}
	resp, err := h.svc.LoginByWechatUserID(c.Request.Context(), req.WechatUserID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, dto.Fail(401, err.Error()))
		return
	}
	c.JSON(http.StatusOK, dto.OK(resp))
}
```

- [ ] **Step 3: 运行确认编译（包内）**

Run: `cd hospital-server && go vet ./internal/handler/admin/ 2>&1 | head`
Expected: in-package compiles; router caller updated in Task 11

- [ ] **Step 4: 提交**

```bash
git add hospital-server/internal/dto/auth.go hospital-server/internal/handler/admin/auth.go
git commit -m "feat(admin): 企微登录 URL/Callback/DevLogin 处理器"
```

---

## Task 11: router + server main 装配，注册路由（条件 dev-login）

**Files:**
- Modify: `hospital-server/internal/router/router.go`
- Modify: `hospital-server/cmd/server/main.go`

- [ ] **Step 1: router.Setup 增加 wechatClient 参数**

In `hospital-server/internal/router/router.go`, update the signature:

```go
func Setup(r *gin.Engine, db *gorm.DB, enforcer *casbin.Enforcer, store *storage.Storage, jwtSecret string, jwtExpireH int, asynqClient *queue.Client, wechatClient wechat.Client) {
```

Add import `"github.com/dttbd/hospital-server/pkg/wechat"`.

Update auth service + handler construction:

```go
	authSvc := service.NewAuthService(db, jwtSecret, jwtExpireH, wechatClient)
	...
	authH := admin.NewAuthHandler(authSvc, wechatClient)
```

In the public `authGroup := r.Group("/api/auth")` block, add routes:

```go
		authGroup.GET("/wechat/url", authH.WechatURL)
		authGroup.POST("/wechat/callback", authH.WechatCallback)
		// dev-login exists ONLY when WeChat is disabled (mock mode)
		if !wechatClient.Enabled() {
			authGroup.POST("/wechat/dev-login", authH.WechatDevLogin)
		}
```

> Note: `portal.NewAuthHandler(authSvc)` (line ~187) still takes only `authSvc` — unchanged, since portal uses password login. Confirm it compiles with the new `authSvc`.

- [ ] **Step 2: server main 构造 redis + wechat client，传入 router**

In `hospital-server/cmd/server/main.go`:

Add imports:
```go
	"github.com/dttbd/hospital-server/internal/wechatadapter"
	"github.com/dttbd/hospital-server/pkg/wechat"
	"github.com/dttbd/hospital-server/internal/repository"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/redis/go-redis/v9"
```
(`repository`/`service` may already be imported — dedupe.)

After `asynqClient := queue.NewClient(...)`, add:

```go
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Addr(),
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})
	defer rdb.Close()

	notifSvc := service.NewNotificationService(repository.NewNotificationRepo(db))
	wechatClient := wechat.New(
		wechat.Config{
			Enabled:  cfg.WeChat.Enabled,
			CorpID:   cfg.WeChat.CorpID,
			AgentID:  cfg.WeChat.AgentID,
			Secret:   cfg.WeChat.Secret,
			Callback: cfg.WeChat.Callback,
		},
		wechatadapter.NewUserResolver(db),
		wechatadapter.NewMockSink(notifSvc),
		rdb,
	)
```

Update the router call:

```go
	router.Setup(r, db, enforcer, store, cfg.JWT.Secret, cfg.JWT.ExpireHour, asynqClient, wechatClient)
```

- [ ] **Step 3: 运行确认整体编译 + 全部单测**

Run: `cd hospital-server && go build ./... && go test ./pkg/... ./internal/config/ ./internal/wechatadapter/ -v 2>&1 | tail -20`
Expected: 编译成功；所有非 DB 单测通过

- [ ] **Step 4: 提交**

```bash
git add hospital-server/internal/router/router.go hospital-server/cmd/server/main.go
git commit -m "feat(router): 装配 wechat client 并注册 SSO 路由（dev-login 条件注册）"
```

---

## Task 12: 集成测试 — dev-login + wechat_mock 站内信

**Files:**
- Create: `hospital-server/tests/integration/wechat_test.go`

> Requires PostgreSQL (per CLAUDE.md integration test convention). Follow the existing `tests/integration/setup_test.go` harness for DB/router setup.

- [ ] **Step 1: 检视现有集成测试脚手架**

Run: `cd hospital-server && sed -n '1,80p' tests/integration/setup_test.go`
Expected: 了解 test server / router 构造方式（如 `setupTestRouter()` 或类似 helper 名称）

- [ ] **Step 2: 写 dev-login 测试**

Create `hospital-server/tests/integration/wechat_test.go` (adapt helper names to those found in Step 1):

```go
package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/dttbd/hospital-server/internal/models"
)

func TestWechatDevLogin_Success(t *testing.T) {
	// setupTestServer / db come from setup_test.go; adjust names accordingly.
	db := setupTestDB(t)
	router := setupTestRouter(t, db) // mock mode (WECHAT_ENABLED unset -> false)

	// seed a user bound to a wechat_userid
	u := models.User{Username: "wxuser", RealName: "企微用户", WechatUserID: "zhangsan", Status: 1}
	if err := db.Create(&u).Error; err != nil {
		t.Fatalf("seed user: %v", err)
	}

	body, _ := json.Marshal(map[string]string{"wechat_userid": "zhangsan"})
	req := httptest.NewRequest(http.MethodPost, "/api/auth/wechat/dev-login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", w.Code, w.Body.String())
	}
	var resp struct {
		Data struct {
			Token string `json:"token"`
		} `json:"data"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Data.Token == "" {
		t.Fatalf("expected non-empty token, body=%s", w.Body.String())
	}
}

func TestWechatDevLogin_UnboundUser(t *testing.T) {
	db := setupTestDB(t)
	router := setupTestRouter(t, db)

	body, _ := json.Marshal(map[string]string{"wechat_userid": "nobody"})
	req := httptest.NewRequest(http.MethodPost, "/api/auth/wechat/dev-login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for unbound user, got %d", w.Code)
	}
}
```

- [ ] **Step 3: 写 wechat_mock 站内信测试**

Append to `wechat_test.go`:

```go
import (
	// add:
	"context"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/dttbd/hospital-server/internal/repository"
	"github.com/dttbd/hospital-server/internal/wechatadapter"
	"github.com/dttbd/hospital-server/pkg/wechat"
	"github.com/google/uuid"
)

func TestWechatMock_RecordsInAppNotice(t *testing.T) {
	db := setupTestDB(t)

	u := models.User{Username: "mu", RealName: "M", Status: 1}
	if err := db.Create(&u).Error; err != nil {
		t.Fatalf("seed: %v", err)
	}

	notifSvc := service.NewNotificationService(repository.NewNotificationRepo(db))
	client := wechat.New(wechat.Config{Enabled: false}, nil, wechatadapter.NewMockSink(notifSvc), nil)

	if err := client.SendTextCard(context.Background(), []uuid.UUID{u.ID}, "推送标题", "推送内容", ""); err != nil {
		t.Fatalf("send: %v", err)
	}

	var n models.Notification
	if err := db.Where("user_id = ? AND type = ?", u.ID, "wechat_mock").First(&n).Error; err != nil {
		t.Fatalf("expected wechat_mock notification, got err %v", err)
	}
	if n.Title != "[企微Mock] 推送标题" {
		t.Fatalf("unexpected title: %s", n.Title)
	}
}
```

- [ ] **Step 4: 运行集成测试**

Run:
```bash
cd hospital-server && docker compose -f deploy/docker-compose.yml up -d postgres redis minio
go test ./tests/integration/ -run TestWechat -v
```
Expected: PASS (TestWechatDevLogin_Success, TestWechatDevLogin_UnboundUser, TestWechatMock_RecordsInAppNotice)

> If helper names differ (Step 1), fix the test to match before running. The assertions stay the same.

- [ ] **Step 5: 提交**

```bash
git add hospital-server/tests/integration/wechat_test.go
git commit -m "test(wechat): dev-login 与 wechat_mock 站内信集成测试"
```

---

## Task 13: 前端 — 管理端登录页企微按钮 + 回调页 + shared api

**Files:**
- Modify: `hospital-web/packages/shared/src/api/auth.ts`
- Modify: 管理端登录页（如 `hospital-web/packages/admin/src/pages/Login.tsx`）
- Create: 管理端回调页 + 路由（如 `hospital-web/packages/admin/src/pages/WechatCallback.tsx`）

- [ ] **Step 1: 定位前端文件**

Run:
```bash
cd hospital-web && ls packages/shared/src/api/ && ls packages/admin/src/pages/ && grep -rn "createBrowserRouter\|<Routes\|path=\"/login\"" packages/admin/src | head
```
Expected: 确认登录页路径、路由定义文件、shared api 模式

- [ ] **Step 2: shared api 增加企微方法**

In `hospital-web/packages/shared/src/api/auth.ts`, add (adapt to the file's existing axios client + ApiResponse types):

```ts
export function getWechatLoginUrl(state: string) {
  return apiClient.get<ApiResponse<{ url: string }>>(`/api/auth/wechat/url`, { params: { state } })
}

export function wechatCallback(code: string, state: string) {
  return apiClient.post<ApiResponse<LoginResp>>(`/api/auth/wechat/callback`, { code, state })
}

// dev-only; backend returns 404 when WeChat is enabled
export function wechatDevLogin(wechat_userid: string) {
  return apiClient.post<ApiResponse<LoginResp>>(`/api/auth/wechat/dev-login`, { wechat_userid })
}
```

> Match the existing exported login function's client/type names in this file (e.g. `apiClient`, `ApiResponse`, `LoginResp`). If names differ, use the file's conventions.

- [ ] **Step 3: 登录页加「企业微信登录」按钮**

In the admin Login page, add a button below the password form. On click, fetch the URL and redirect:

```tsx
import { getWechatLoginUrl } from '@hospital/shared/api/auth'

async function handleWechatLogin() {
  const state = Math.random().toString(36).slice(2)
  sessionStorage.setItem('wechat_oauth_state', state)
  const res = await getWechatLoginUrl(state)
  const url = res.data.data.url
  if (url) window.location.href = url
}

// in JSX, below the login form:
<button type="button" onClick={handleWechatLogin}
  className="mt-3 w-full rounded-lg border border-border py-2 text-sm text-muted hover:text-foreground">
  企业微信登录
</button>
```

> Follow the page's existing styling tokens (border/muted/foreground per design system). Keep it flat, no shadow, rounded.

- [ ] **Step 4: 回调接收页**

Create `hospital-web/packages/admin/src/pages/WechatCallback.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { wechatCallback } from '@hospital/shared/api/auth'
import { useAuthStore } from '../stores/auth' // adapt to actual store path/name

export default function WechatCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth) // adapt to actual setter
  const [error, setError] = useState('')

  useEffect(() => {
    const code = params.get('code') || ''
    const state = params.get('state') || ''
    const saved = sessionStorage.getItem('wechat_oauth_state')
    if (!code || (saved && state && saved !== state)) {
      setError('登录校验失败，请重试')
      return
    }
    wechatCallback(code, state)
      .then((res) => {
        const { token, user } = res.data.data
        setAuth(token, user) // adapt to store signature
        navigate('/', { replace: true })
      })
      .catch(() => setError('企业微信登录失败，请确认账号已绑定'))
  }, [params, navigate, setAuth])

  return <div className="flex h-screen items-center justify-center text-muted">
    {error || '正在登录…'}
  </div>
}
```

Register the route (in the admin router file from Step 1), e.g.:

```tsx
{ path: '/wechat/callback', element: <WechatCallback /> }
```

> Adapt `useAuthStore`, `setAuth` signature, and route registration to the project's actual Zustand store and router. Confirm via Step 1 output.

- [ ] **Step 5: 前端构建验证**

Run:
```bash
cd hospital-web && pnpm --filter admin build
```
Expected: 构建成功，无类型错误

- [ ] **Step 6: 提交**

```bash
git add hospital-web/packages/shared/src/api/auth.ts hospital-web/packages/admin/src/
git commit -m "feat(web): 管理端企业微信登录按钮与回调页"
```

---

## 完成验收

- [ ] `cd hospital-server && go build ./...` 成功
- [ ] `go test ./pkg/wechat/ ./internal/config/ ./internal/wechatadapter/ -v` 全绿
- [ ] `go test ./tests/integration/ -run TestWechat -v` 全绿（需 PostgreSQL/Redis）
- [ ] `cd hospital-web && pnpm --filter admin build` 成功
- [ ] 手动：mock 模式下 `POST /api/auth/wechat/dev-login {wechat_userid}` 返回 token；工单事件后管理端通知列表出现 `[企微Mock]` 站内信
- [ ] `WECHAT_ENABLED=true` 缺凭证时启动 fail-fast

## 拿到凭证后的上线步骤（无需改代码）

1. 配置 `WECHAT_ENABLED=true` + `WECHAT_CORP_ID/AGENT_ID/SECRET/CALLBACK`
2. 重启 server + worker
3. dev-login 路由自动消失；真实 OAuth 与真实推送生效
4. 按 §6.2 用官方文档复核三个 API 端点与 textcard 报文，联调验证
```
