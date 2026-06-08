package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/internal/repository"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/dttbd/hospital-server/internal/wechatadapter"
	"github.com/dttbd/hospital-server/pkg/wechat"
	"github.com/google/uuid"
)

func TestWechatDevLogin_Success(t *testing.T) {
	r, db := setupTestServer(t)

	u := models.User{Username: "wxuser", RealName: "企微用户", WechatUserID: "zhangsan", Status: 1}
	if err := db.Create(&u).Error; err != nil {
		t.Fatalf("seed user: %v", err)
	}

	body, _ := json.Marshal(map[string]string{"wechat_userid": "zhangsan"})
	req := httptest.NewRequest(http.MethodPost, "/api/auth/wechat/dev-login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

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
	r, _ := setupTestServer(t)

	body, _ := json.Marshal(map[string]string{"wechat_userid": "nobody"})
	req := httptest.NewRequest(http.MethodPost, "/api/auth/wechat/dev-login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for unbound user, got %d body=%s", w.Code, w.Body.String())
	}
}

func TestWechatMock_RecordsInAppNotice(t *testing.T) {
	_, db := setupTestServer(t)

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
