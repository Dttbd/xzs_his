package integration

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReportOverview(t *testing.T) {
	r, _ := setupTestServer(t)
	token := loginAdmin(t, r)

	// --- Create test data: category + hospital + ticket ---
	// Category
	w := httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPost, "/api/admin/v1/hospital-categories",
		map[string]string{"name": "综合医院", "code": "general_report"}, token))
	require.Equal(t, http.StatusCreated, w.Code, "create category: %s", w.Body.String())

	var catResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &catResp)
	categoryID := catResp["data"].(map[string]interface{})["id"].(string)

	// Hospital
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPost, "/api/admin/v1/hospitals",
		map[string]interface{}{
			"name":        "报表测试医院",
			"code":        "report_test_hosp",
			"level":       "三甲",
			"city":        "上海",
			"category_id": categoryID,
		}, token))
	require.Equal(t, http.StatusCreated, w.Code, "create hospital: %s", w.Body.String())

	var hospResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &hospResp)
	hospitalID := hospResp["data"].(map[string]interface{})["id"].(string)

	// Get ticket type ID
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/ticket-types", nil, token))
	require.Equal(t, http.StatusOK, w.Code)

	var ttResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &ttResp)
	ttData := ttResp["data"].(map[string]interface{})
	ttItems := ttData["list"].([]interface{})
	require.NotEmpty(t, ttItems, "should have ticket types")
	ticketTypeID := ttItems[0].(map[string]interface{})["id"].(string)

	// Ticket
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPost, "/api/admin/v1/tickets",
		map[string]interface{}{
			"title":       "报表测试工单",
			"description": "用于报表统计测试的工单",
			"hospital_id": hospitalID,
			"type_id":     ticketTypeID,
			"priority":    1,
		}, token))
	require.Equal(t, http.StatusCreated, w.Code, "create ticket: %s", w.Body.String())

	// --- Report: Overview ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/reports/overview", nil, token))
	assert.Equal(t, http.StatusOK, w.Code, "overview: %s", w.Body.String())

	var overviewResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &overviewResp)
	overviewData := overviewResp["data"].(map[string]interface{})
	assert.GreaterOrEqual(t, overviewData["hospital_count"].(float64), float64(1))
	assert.GreaterOrEqual(t, overviewData["ticket_total"].(float64), float64(1))

	// --- Report: Hospital Stats ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/reports/hospital-stats?group_by=category", nil, token))
	assert.Equal(t, http.StatusOK, w.Code, "hospital stats: %s", w.Body.String())

	// --- Report: Ticket Stats ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/reports/ticket-stats?group_by=type", nil, token))
	assert.Equal(t, http.StatusOK, w.Code, "ticket stats: %s", w.Body.String())

	// --- Report: Ticket Trend ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/reports/ticket-trend?interval=day", nil, token))
	assert.Equal(t, http.StatusOK, w.Code, "ticket trend: %s", w.Body.String())
}
