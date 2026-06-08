package wechatadapter

import (
	"testing"

	"github.com/google/uuid"
)

type recordingNotifier struct {
	userIDs []uuid.UUID
	title   string
	content string
	nType   string
}

func (r *recordingNotifier) SendNotification(userIDs []uuid.UUID, title, content, nType, refType string, refID *uuid.UUID) error {
	r.userIDs = userIDs
	r.title = title
	r.content = content
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
	if n.content != "内容" {
		t.Fatalf("content not forwarded: %s", n.content)
	}
	if n.title != "[企微Mock] 标题" {
		t.Fatalf("title prefix not applied: %s", n.title)
	}
}
