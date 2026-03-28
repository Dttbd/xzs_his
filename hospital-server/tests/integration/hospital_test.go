package integration

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHospitalCRUD(t *testing.T) {
	r, _ := setupTestServer(t)
	token := loginAdmin(t, r)

	// --- Create category ---
	w := httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPost, "/api/admin/v1/hospital-categories",
		map[string]string{"name": "综合医院", "code": "general"}, token))
	require.Equal(t, http.StatusCreated, w.Code, "create category: %s", w.Body.String())

	var catResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &catResp)
	catData := catResp["data"].(map[string]interface{})
	categoryID := catData["id"].(string)

	// --- Create hospital ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPost, "/api/admin/v1/hospitals",
		map[string]interface{}{
			"name":         "北京协和医院",
			"code":         "pkuh",
			"level":        "三甲",
			"city":         "北京",
			"category_id":  categoryID,
			"contact_name": "张医生",
			"bed_count":    2000,
		}, token))
	require.Equal(t, http.StatusCreated, w.Code, "create hospital: %s", w.Body.String())

	var hospResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &hospResp)
	hospData := hospResp["data"].(map[string]interface{})
	hospitalID := hospData["id"].(string)

	// --- List hospitals ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/hospitals", nil, token))
	assert.Equal(t, http.StatusOK, w.Code, "list hospitals: %s", w.Body.String())

	var listResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &listResp)
	listData := listResp["data"].(map[string]interface{})
	assert.GreaterOrEqual(t, listData["total"].(float64), float64(1))

	// --- Get hospital ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/hospitals/"+hospitalID, nil, token))
	assert.Equal(t, http.StatusOK, w.Code, "get hospital: %s", w.Body.String())

	var getResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &getResp)
	getData := getResp["data"].(map[string]interface{})
	assert.Equal(t, "北京协和医院", getData["name"])
	assert.Equal(t, "北京", getData["city"])

	// --- Update hospital ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPut, "/api/admin/v1/hospitals/"+hospitalID,
		map[string]interface{}{"city": "北京市"}, token))
	assert.Equal(t, http.StatusOK, w.Code, "update hospital: %s", w.Body.String())

	// Verify update
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/hospitals/"+hospitalID, nil, token))
	assert.Equal(t, http.StatusOK, w.Code)
	var updatedResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &updatedResp)
	updatedData := updatedResp["data"].(map[string]interface{})
	assert.Equal(t, "北京市", updatedData["city"])

	// --- Summary ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/hospitals/summary?group_by=category", nil, token))
	assert.Equal(t, http.StatusOK, w.Code, "summary: %s", w.Body.String())

	// --- Delete ---
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodDelete, "/api/admin/v1/hospitals/"+hospitalID, nil, token))
	assert.Equal(t, http.StatusOK, w.Code, "delete hospital: %s", w.Body.String())

	// Verify deleted — get should return 404
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/hospitals/"+hospitalID, nil, token))
	assert.Equal(t, http.StatusNotFound, w.Code, "get deleted hospital should 404")
}

func TestHospitalCategoryCRUD(t *testing.T) {
	r, _ := setupTestServer(t)
	token := loginAdmin(t, r)

	// Create
	w := httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPost, "/api/admin/v1/hospital-categories",
		map[string]string{"name": "专科医院", "code": "specialist"}, token))
	require.Equal(t, http.StatusCreated, w.Code)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	data := resp["data"].(map[string]interface{})
	catID := data["id"].(string)

	// List
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/hospital-categories", nil, token))
	assert.Equal(t, http.StatusOK, w.Code)

	// Get
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, fmt.Sprintf("/api/admin/v1/hospital-categories/%s", catID), nil, token))
	assert.Equal(t, http.StatusOK, w.Code)

	// Update
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPut, fmt.Sprintf("/api/admin/v1/hospital-categories/%s", catID),
		map[string]interface{}{"name": "专科医院(更新)"}, token))
	assert.Equal(t, http.StatusOK, w.Code)

	// Delete
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodDelete, fmt.Sprintf("/api/admin/v1/hospital-categories/%s", catID), nil, token))
	assert.Equal(t, http.StatusOK, w.Code)
}
