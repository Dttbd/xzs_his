package wechat

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

const qyAPIBase = "https://qyapi.weixin.qq.com"

// defaultCardURL is used when no deep-link URL is supplied, because the
// textcard message type requires a non-empty url. Deep-linking to specific
// tickets is a future enhancement once a public web base URL is configured.
const defaultCardURL = "https://work.weixin.qq.com"

type realClient struct {
	cfg        Config
	resolver   UserResolver
	httpClient *http.Client
	baseURL    string
	token      *tokenCache
}

func newRealClient(cfg Config, resolver UserResolver, rdb *redis.Client) *realClient {
	hc := &http.Client{}
	return &realClient{
		cfg:        cfg,
		resolver:   resolver,
		httpClient: hc,
		baseURL:    qyAPIBase,
		token: &tokenCache{
			rdb: rdb, corpID: cfg.CorpID, secret: cfg.Secret,
			httpClient: hc, baseURL: qyAPIBase,
		},
	}
}

func (c *realClient) Enabled() bool { return true }

func (c *realClient) AuthURL(state string) string {
	return fmt.Sprintf(
		"https://open.weixin.qq.com/connect/oauth2/authorize?appid=%s&redirect_uri=%s&response_type=code&scope=snsapi_base&state=%s&agentid=%d#wechat_redirect",
		url.QueryEscape(c.cfg.CorpID), url.QueryEscape(c.cfg.Callback), url.QueryEscape(state), c.cfg.AgentID,
	)
}

type getUserInfoResp struct {
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
	UserID  string `json:"userid"`
}

func (c *realClient) CodeToUserID(ctx context.Context, code string) (string, error) {
	return c.codeToUserID(ctx, code, true)
}

func (c *realClient) codeToUserID(ctx context.Context, code string, allowRetry bool) (string, error) {
	token, err := c.token.get(ctx)
	if err != nil {
		return "", err
	}
	u := fmt.Sprintf("%s/cgi-bin/auth/getuserinfo?access_token=%s&code=%s",
		c.baseURL, url.QueryEscape(token), url.QueryEscape(code))
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("getuserinfo: %w", err)
	}
	defer resp.Body.Close()

	var r getUserInfoResp
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return "", fmt.Errorf("getuserinfo decode: %w", err)
	}
	if r.ErrCode == 42001 && allowRetry { // token expired: refresh once and retry
		c.token.invalidate(ctx)
		return c.codeToUserID(ctx, code, false)
	}
	if r.ErrCode != 0 {
		return "", fmt.Errorf("getuserinfo errcode=%d errmsg=%s", r.ErrCode, r.ErrMsg)
	}
	if r.UserID == "" {
		return "", fmt.Errorf("getuserinfo returned empty userid (external/non-member?)")
	}
	return r.UserID, nil
}

type sendResp struct {
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
}

func (c *realClient) SendTextCard(ctx context.Context, userIDs []uuid.UUID, title, content, link string) error {
	if len(userIDs) == 0 {
		return nil
	}
	resolved, err := c.resolver.WechatUserIDs(ctx, userIDs)
	if err != nil {
		return fmt.Errorf("resolve wechat userids: %w", err)
	}
	wxIDs := make([]string, 0, len(resolved))
	for _, wx := range resolved {
		if wx != "" {
			wxIDs = append(wxIDs, wx)
		}
	}
	if len(wxIDs) == 0 {
		return nil // no recipients bound to WeChat
	}
	if link == "" {
		link = defaultCardURL
	}
	return c.send(ctx, wxIDs, title, content, link, true)
}

func (c *realClient) send(ctx context.Context, wxIDs []string, title, content, link string, allowRetry bool) error {
	token, err := c.token.get(ctx)
	if err != nil {
		return err
	}
	payload := map[string]any{
		"touser":  strings.Join(wxIDs, "|"),
		"msgtype": "textcard",
		"agentid": c.cfg.AgentID,
		"textcard": map[string]string{
			"title":       title,
			"description": content,
			"url":         link,
			"btntxt":      "详情",
		},
	}
	body, _ := json.Marshal(payload) // cannot fail: payload holds only JSON-safe values
	u := fmt.Sprintf("%s/cgi-bin/message/send?access_token=%s", c.baseURL, url.QueryEscape(token))
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, u, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("message/send: %w", err)
	}
	defer resp.Body.Close()
	var r sendResp
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return fmt.Errorf("message/send decode: %w", err)
	}
	if r.ErrCode == 42001 && allowRetry {
		c.token.invalidate(ctx)
		return c.send(ctx, wxIDs, title, content, link, false)
	}
	if r.ErrCode != 0 {
		return fmt.Errorf("message/send errcode=%d errmsg=%s", r.ErrCode, r.ErrMsg)
	}
	return nil
}
