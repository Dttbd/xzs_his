package integration

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLogin_Success(t *testing.T) {
	r, _ := setupTestServer(t)
	token := loginAdmin(t, r)
	assert.NotEmpty(t, token)
}

func TestLogin_WrongPassword(t *testing.T) {
	r, _ := setupTestServer(t)

	req := authReq(http.MethodPost, "/api/auth/login",
		map[string]string{"username": "admin", "password": "wrong"}, "")
	req.Header.Del("Authorization")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestProtectedRoute_NoToken(t *testing.T) {
	r, _ := setupTestServer(t)

	req := httptest.NewRequest(http.MethodGet, "/api/admin/v1/users", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
