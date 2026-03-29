package integration

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/dttbd/hospital-server/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNotificationWorkflow(t *testing.T) {
	r, db := setupTestServer(t)
	token := loginAdmin(t, r)

	// --- Get admin user ID from DB ---
	var adminUser models.User
	err := db.Where("username = ?", "admin").First(&adminUser).Error
	require.NoError(t, err, "admin user should exist")
	adminUserID := adminUser.ID

	// --- Insert test notifications directly in DB ---
	notif1 := models.Notification{
		UserID: adminUserID, Title: "测试通知1", Content: "系统维护通知", Type: "system", IsRead: false,
	}
	notif2 := models.Notification{
		UserID: adminUserID, Title: "测试通知2", Content: "工单更新通知", Type: "ticket", IsRead: false,
	}
	require.NoError(t, db.Create(&notif1).Error)
	require.NoError(t, db.Create(&notif2).Error)

	// --- Unread count (should be 2) ---
	w := httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/notifications/unread-count", nil, token))
	assert.Equal(t, http.StatusOK, w.Code, "unread count: %s", w.Body.String())

	var countResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &countResp)
	countData := countResp["data"].(map[string]interface{})
	assert.Equal(t, float64(2), countData["count"])

	// --- List notifications ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/notifications", nil, token))
	assert.Equal(t, http.StatusOK, w.Code, "list notifications: %s", w.Body.String())

	var listResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &listResp)
	listData := listResp["data"].(map[string]interface{})
	assert.GreaterOrEqual(t, listData["total"].(float64), float64(2))

	// --- Mark single notification as read ---
	notifID := notif1.ID.String()
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPut, "/api/admin/v1/notifications/"+notifID+"/read", nil, token))
	assert.Equal(t, http.StatusOK, w.Code, "mark read: %s", w.Body.String())

	// Unread count should now be 1
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/notifications/unread-count", nil, token))
	assert.Equal(t, http.StatusOK, w.Code)

	var count2Resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &count2Resp)
	count2Data := count2Resp["data"].(map[string]interface{})
	assert.Equal(t, float64(1), count2Data["count"])

	// --- Mark all read ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPut, "/api/admin/v1/notifications/read-all", nil, token))
	assert.Equal(t, http.StatusOK, w.Code, "mark all read: %s", w.Body.String())

	// Verify unread count is 0
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/notifications/unread-count", nil, token))
	assert.Equal(t, http.StatusOK, w.Code)

	var count3Resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &count3Resp)
	count3Data := count3Resp["data"].(map[string]interface{})
	assert.Equal(t, float64(0), count3Data["count"])
}
