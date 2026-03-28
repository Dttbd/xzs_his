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
