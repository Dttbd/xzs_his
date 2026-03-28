package integration

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRegionCRUD(t *testing.T) {
	r, _ := setupTestServer(t)
	token := loginAdmin(t, r)

	// Create
	w := httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPost, "/api/admin/v1/regions",
		map[string]string{"name": "华东大区", "code": "east_china"}, token))
	require.Equal(t, http.StatusCreated, w.Code)

	var createResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &createResp)
	data := createResp["data"].(map[string]interface{})
	regionID := data["id"].(string)

	// List
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/regions", nil, token))
	assert.Equal(t, http.StatusOK, w.Code)

	// Get
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/regions/"+regionID, nil, token))
	assert.Equal(t, http.StatusOK, w.Code)

	// Update
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPut, "/api/admin/v1/regions/"+regionID,
		map[string]string{"name": "华东大区-更新"}, token))
	assert.Equal(t, http.StatusOK, w.Code)

	// Delete
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodDelete, "/api/admin/v1/regions/"+regionID, nil, token))
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestProvinceCRUD(t *testing.T) {
	r, _ := setupTestServer(t)
	token := loginAdmin(t, r)

	// Create region first
	w := httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPost, "/api/admin/v1/regions",
		map[string]string{"name": "华东", "code": "east"}, token))
	require.Equal(t, http.StatusCreated, w.Code)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	regionID := resp["data"].(map[string]interface{})["id"].(string)

	// Create province
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodPost, "/api/admin/v1/provinces",
		map[string]interface{}{"name": "上海", "code": "shanghai", "region_id": regionID}, token))
	require.Equal(t, http.StatusCreated, w.Code)

	json.Unmarshal(w.Body.Bytes(), &resp)
	provinceID := resp["data"].(map[string]interface{})["id"].(string)

	// List with region filter
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/provinces?region_id="+regionID, nil, token))
	assert.Equal(t, http.StatusOK, w.Code)

	// Get
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodGet, "/api/admin/v1/provinces/"+provinceID, nil, token))
	assert.Equal(t, http.StatusOK, w.Code)

	// Delete
	w = httptest.NewRecorder()
	r.ServeHTTP(w, authReq(http.MethodDelete, "/api/admin/v1/provinces/"+provinceID, nil, token))
	assert.Equal(t, http.StatusOK, w.Code)
}
