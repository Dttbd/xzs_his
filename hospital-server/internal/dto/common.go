package dto

type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type PageQuery struct {
	Page     int    `form:"page,default=1" binding:"min=1"`
	PageSize int    `form:"page_size,default=20" binding:"min=1,max=100"`
	Keyword  string `form:"keyword"`
}

type PageResult struct {
	List     interface{} `json:"list"`
	Total    int64       `json:"total"`
	Page     int         `json:"page"`
	PageSize int         `json:"page_size"`
}

func (q *PageQuery) Offset() int {
	return (q.Page - 1) * q.PageSize
}

func OK(data interface{}) Response {
	return Response{Code: 0, Message: "ok", Data: data}
}

func OKMsg(msg string) Response {
	return Response{Code: 0, Message: msg}
}

func Fail(code int, msg string) Response {
	return Response{Code: code, Message: msg}
}

func PageOK(list interface{}, total int64, page, pageSize int) Response {
	return OK(PageResult{
		List:     list,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}
