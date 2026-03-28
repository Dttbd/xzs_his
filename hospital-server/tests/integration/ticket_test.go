package integration

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTicketWorkflow(t *testing.T) {
	r, _ := setupTestServer(t)
	token := loginAdmin(t, r)

	// --- List ticket types (should have seeded data) ---
	w := httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/ticket-types", nil, token))
	require.Equal(t, http.StatusOK, w.Code, "list ticket types: %s", w.Body.String())

	var typesResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &typesResp)
	typesData := typesResp["data"].(map[string]interface{})
	typesList := typesData["list"].([]interface{})
	require.Greater(t, len(typesList), 0, "should have seeded ticket types")
	firstType := typesList[0].(map[string]interface{})
	typeID := firstType["id"].(string)

	// --- Create ticket ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPost, "/api/admin/v1/tickets",
		map[string]interface{}{
			"title":       "CT设备故障",
			"description": "CT设备无法启动",
			"type_id":     typeID,
			"priority":    1,
		}, token))
	require.Equal(t, http.StatusCreated, w.Code, "create ticket: %s", w.Body.String())

	var ticketResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &ticketResp)
	ticketData := ticketResp["data"].(map[string]interface{})
	ticketID := ticketData["id"].(string)

	// --- Get ticket — verify initial status is "open" ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/tickets/"+ticketID, nil, token))
	require.Equal(t, http.StatusOK, w.Code, "get ticket: %s", w.Body.String())

	var getResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &getResp)
	getData := getResp["data"].(map[string]interface{})
	status := getData["status"].(map[string]interface{})
	assert.Equal(t, "open", status["code"])

	// --- Get statuses to find in_progress and resolved status IDs ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/ticket-statuses", nil, token))
	require.Equal(t, http.StatusOK, w.Code, "list statuses: %s", w.Body.String())

	var statusesResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &statusesResp)
	statusesData := statusesResp["data"].(map[string]interface{})
	statusesList := statusesData["list"].([]interface{})

	var inProgressStatusID, resolvedStatusID string
	for _, s := range statusesList {
		st := s.(map[string]interface{})
		switch st["code"].(string) {
		case "in_progress":
			inProgressStatusID = st["id"].(string)
		case "resolved":
			resolvedStatusID = st["id"].(string)
		}
	}
	require.NotEmpty(t, inProgressStatusID, "in_progress status should exist")
	require.NotEmpty(t, resolvedStatusID, "resolved status should exist")

	// --- Transition: open -> in_progress ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPut, "/api/admin/v1/tickets/"+ticketID+"/transition",
		map[string]interface{}{"to_status_id": inProgressStatusID}, token))
	require.Equal(t, http.StatusOK, w.Code, "transition open->in_progress: %s", w.Body.String())

	// --- Add comment ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPost, "/api/admin/v1/tickets/"+ticketID+"/comments",
		map[string]interface{}{"content": "正在处理中", "is_internal": false}, token))
	assert.Equal(t, http.StatusCreated, w.Code, "add comment: %s", w.Body.String())

	// --- Transition: in_progress -> resolved ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPut, "/api/admin/v1/tickets/"+ticketID+"/transition",
		map[string]interface{}{"to_status_id": resolvedStatusID}, token))
	assert.Equal(t, http.StatusOK, w.Code, "transition in_progress->resolved: %s", w.Body.String())

	// --- Verify ticket has resolved_at set ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/tickets/"+ticketID, nil, token))
	require.Equal(t, http.StatusOK, w.Code)

	var resolvedResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resolvedResp)
	resolvedData := resolvedResp["data"].(map[string]interface{})
	assert.NotNil(t, resolvedData["resolved_at"], "resolved_at should be set after resolving")

	resolvedStatus := resolvedData["status"].(map[string]interface{})
	assert.Equal(t, "resolved", resolvedStatus["code"])

	// --- List tickets ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/tickets", nil, token))
	assert.Equal(t, http.StatusOK, w.Code, "list tickets: %s", w.Body.String())

	var listResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &listResp)
	listData := listResp["data"].(map[string]interface{})
	assert.GreaterOrEqual(t, listData["total"].(float64), float64(1))
}

func TestTicketInvalidTransition(t *testing.T) {
	r, _ := setupTestServer(t)
	token := loginAdmin(t, r)

	// Get typeID
	w := httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/ticket-types", nil, token))
	require.Equal(t, http.StatusOK, w.Code)

	var typesResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &typesResp)
	typesData := typesResp["data"].(map[string]interface{})
	typesList := typesData["list"].([]interface{})
	require.Greater(t, len(typesList), 0)
	typeID := typesList[0].(map[string]interface{})["id"].(string)

	// Create ticket (starts at open)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPost, "/api/admin/v1/tickets",
		map[string]interface{}{
			"title":       "无效转换测试",
			"description": "测试无效状态转换",
			"type_id":     typeID,
			"priority":    0,
		}, token))
	require.Equal(t, http.StatusCreated, w.Code, "create ticket: %s", w.Body.String())

	var ticketResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &ticketResp)
	ticketData := ticketResp["data"].(map[string]interface{})
	ticketID := ticketData["id"].(string)

	// Get resolved status ID
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/ticket-statuses", nil, token))
	require.Equal(t, http.StatusOK, w.Code)

	var statusesResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &statusesResp)
	statusesData := statusesResp["data"].(map[string]interface{})
	statusesList := statusesData["list"].([]interface{})

	var resolvedStatusID string
	for _, s := range statusesList {
		st := s.(map[string]interface{})
		if st["code"].(string) == "resolved" {
			resolvedStatusID = st["id"].(string)
			break
		}
	}
	require.NotEmpty(t, resolvedStatusID)

	// Try to transition directly open -> resolved (should fail, no such transition defined)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPut, "/api/admin/v1/tickets/"+ticketID+"/transition",
		map[string]interface{}{"to_status_id": resolvedStatusID}, token))
	assert.Equal(t, http.StatusBadRequest, w.Code, "invalid transition should fail: %s", w.Body.String())
}
