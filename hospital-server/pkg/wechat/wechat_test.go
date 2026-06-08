package wechat

import (
	"context"
	"net/http"
	"net/http/httptest"
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
