package dto

type LoginReq struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResp struct {
	Token     string      `json:"token"`
	ExpiresIn int         `json:"expires_in"`
	User      interface{} `json:"user"`
}

type RefreshResp struct {
	Token     string `json:"token"`
	ExpiresIn int    `json:"expires_in"`
}

type WechatCallbackReq struct {
	Code  string `json:"code" binding:"required"`
	State string `json:"state"`
}

type WechatDevLoginReq struct {
	WechatUserID string `json:"wechat_userid" binding:"required"`
}
