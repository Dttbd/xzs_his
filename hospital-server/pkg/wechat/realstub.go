package wechat

import "github.com/redis/go-redis/v9"

// TEMP: replaced by real.go in Task 4. Delete this file in Task 4 Step 3.
func newRealClient(cfg Config, resolver UserResolver, rdb *redis.Client) Client {
	panic("real client implemented in Task 4")
}
