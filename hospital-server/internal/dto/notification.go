package dto

type NotificationFilterQuery struct {
	PageQuery
	Type   string `form:"type"`
	IsRead *bool  `form:"is_read"`
}
