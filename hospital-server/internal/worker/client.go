package worker

import (
	"github.com/dttbd/hospital-server/internal/queue"
)

// Client re-exports queue.Client for backward compatibility.
type Client = queue.Client

// NewClient creates a new async task client.
func NewClient(redisAddr, password string, db int) *Client {
	return queue.NewClient(redisAddr, password, db)
}
