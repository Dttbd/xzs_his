package wechat

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
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
