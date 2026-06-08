package wechat

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	tokenKey      = "wechat:access_token"
	tokenLockKey  = "wechat:token:lock"
	tokenLockTTL  = 10 * time.Second
	tokenMargin   = 60 * time.Second // refresh this long before expiry
	tokenLockWait = 300 * time.Millisecond
)

// tokenCache fetches and shares the Enterprise WeChat access_token via Redis,
// so the server and worker processes never invalidate each other's token.
type tokenCache struct {
	rdb        *redis.Client
	corpID     string
	secret     string
	httpClient *http.Client
	baseURL    string // e.g. https://qyapi.weixin.qq.com
}

type gettokenResp struct {
	ErrCode     int    `json:"errcode"`
	ErrMsg      string `json:"errmsg"`
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

// get returns a valid token, fetching+caching it if absent.
func (t *tokenCache) get(ctx context.Context) (string, error) {
	if v, err := t.rdb.Get(ctx, tokenKey).Result(); err == nil && v != "" {
		return v, nil
	}
	// Single-flight: only one process refreshes at a time.
	ok, _ := t.rdb.SetNX(ctx, tokenLockKey, "1", tokenLockTTL).Result()
	if !ok {
		select {
		case <-time.After(tokenLockWait):
		case <-ctx.Done():
			return "", ctx.Err()
		}
		if v, err := t.rdb.Get(ctx, tokenKey).Result(); err == nil && v != "" {
			return v, nil
		}
		// fall through and fetch anyway (lock holder may have failed)
	} else {
		defer t.rdb.Del(ctx, tokenLockKey)
	}

	token, expiresIn, err := t.fetch(ctx)
	if err != nil {
		return "", err
	}
	ttl := time.Duration(expiresIn)*time.Second - tokenMargin
	if ttl < time.Second {
		ttl = time.Second
	}
	if err := t.rdb.Set(ctx, tokenKey, token, ttl).Err(); err != nil {
		log.Printf("[wechat] cache access_token failed: %v", err)
	}
	return token, nil
}

// invalidate drops the cached token (used after errcode 42001).
func (t *tokenCache) invalidate(ctx context.Context) {
	if err := t.rdb.Del(ctx, tokenKey).Err(); err != nil {
		log.Printf("[wechat] invalidate access_token failed: %v", err)
	}
}

func (t *tokenCache) fetch(ctx context.Context) (string, int, error) {
	u := fmt.Sprintf("%s/cgi-bin/gettoken?corpid=%s&corpsecret=%s",
		t.baseURL, url.QueryEscape(t.corpID), url.QueryEscape(t.secret))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return "", 0, err
	}
	resp, err := t.httpClient.Do(req)
	if err != nil {
		return "", 0, fmt.Errorf("gettoken: %w", err)
	}
	defer resp.Body.Close()

	var r gettokenResp
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return "", 0, fmt.Errorf("gettoken decode: %w", err)
	}
	if r.ErrCode != 0 {
		return "", 0, fmt.Errorf("gettoken errcode=%d errmsg=%s", r.ErrCode, r.ErrMsg)
	}
	return r.AccessToken, r.ExpiresIn, nil
}
