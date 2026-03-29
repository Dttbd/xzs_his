package integration

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBulletinCRUD(t *testing.T) {
	r, _ := setupTestServer(t)
	token := loginAdmin(t, r)

	// --- Create a region (bulletin scope target) ---
	w := httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPost, "/api/admin/v1/regions",
		map[string]string{"name": "华东", "code": "east_bulletin"}, token))
	require.Equal(t, http.StatusCreated, w.Code, "create region: %s", w.Body.String())

	var regionResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &regionResp)
	regionData := regionResp["data"].(map[string]interface{})
	regionID := regionData["id"].(string)

	// --- Create bulletin (draft) ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPost, "/api/admin/v1/bulletins",
		map[string]interface{}{
			"title":      "收费标准调整通知",
			"content":    "自下月起，收费标准将进行调整。",
			"scope_type": "region",
			"scope_id":   regionID,
		}, token))
	require.Equal(t, http.StatusCreated, w.Code, "create bulletin: %s", w.Body.String())

	var bulResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &bulResp)
	bulData := bulResp["data"].(map[string]interface{})
	bulletinID := bulData["id"].(string)

	// Verify draft status
	assert.Equal(t, float64(0), bulData["status"])

	// --- List bulletins ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/bulletins", nil, token))
	assert.Equal(t, http.StatusOK, w.Code, "list bulletins: %s", w.Body.String())

	var listResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &listResp)
	listData := listResp["data"].(map[string]interface{})
	assert.GreaterOrEqual(t, listData["total"].(float64), float64(1))

	// --- Update bulletin ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPut, "/api/admin/v1/bulletins/"+bulletinID,
		map[string]interface{}{"title": "收费标准调整通知（更新）"}, token))
	assert.Equal(t, http.StatusOK, w.Code, "update bulletin: %s", w.Body.String())

	// --- Publish bulletin ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPut, "/api/admin/v1/bulletins/"+bulletinID+"/publish", nil, token))
	assert.Equal(t, http.StatusOK, w.Code, "publish bulletin: %s", w.Body.String())

	// --- Get and verify published ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/bulletins/"+bulletinID, nil, token))
	assert.Equal(t, http.StatusOK, w.Code, "get bulletin: %s", w.Body.String())

	var getResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &getResp)
	getData := getResp["data"].(map[string]interface{})
	assert.Equal(t, float64(1), getData["status"])
	assert.Equal(t, "收费标准调整通知（更新）", getData["title"])

	// --- Delete ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodDelete, "/api/admin/v1/bulletins/"+bulletinID, nil, token))
	assert.Equal(t, http.StatusOK, w.Code, "delete bulletin: %s", w.Body.String())

	// Verify deleted
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/bulletins/"+bulletinID, nil, token))
	assert.Equal(t, http.StatusNotFound, w.Code, "get deleted bulletin should 404")
}
