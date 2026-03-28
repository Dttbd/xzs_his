package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateAndParseToken(t *testing.T) {
	secret := "test-secret-key"
	userID := uuid.New()
	username := "testuser"

	token, err := GenerateToken(secret, userID, username, 24)
	require.NoError(t, err)
	assert.NotEmpty(t, token)

	claims, err := ParseToken(secret, token)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, username, claims.Username)
}

func TestParseToken_Invalid(t *testing.T) {
	_, err := ParseToken("secret", "invalid-token")
	assert.Error(t, err)
}

func TestParseToken_WrongSecret(t *testing.T) {
	userID := uuid.New()
	token, err := GenerateToken("secret-1", userID, "user", 24)
	require.NoError(t, err)

	_, err = ParseToken("secret-2", token)
	assert.Error(t, err)
}

func TestParseToken_Expired(t *testing.T) {
	secret := "test-secret"
	userID := uuid.New()

	token, err := GenerateToken(secret, userID, "user", 0)
	require.NoError(t, err)

	time.Sleep(time.Second)
	_, err = ParseToken(secret, token)
	assert.Error(t, err)
}
