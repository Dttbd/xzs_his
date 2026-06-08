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
