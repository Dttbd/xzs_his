package dto

import "github.com/google/uuid"

type ReportQuery struct {
	DateFrom   string     `form:"date_from"`   // YYYY-MM-DD
	DateTo     string     `form:"date_to"`
	RegionID   *uuid.UUID `form:"region_id"`
	ProvinceID *uuid.UUID `form:"province_id"`
}

type OverviewStats struct {
	HospitalCount     int64   `json:"hospital_count"`
	TicketTotal       int64   `json:"ticket_total"`
	TicketPending     int64   `json:"ticket_pending"`
	TicketResolved    int64   `json:"ticket_resolved"`
	AvgResponseHours  float64 `json:"avg_response_hours"`
	MonthNewHospitals int64   `json:"month_new_hospitals"`
}

type ChartDataItem struct {
	Label string      `json:"label"`
	Value interface{} `json:"value"`
}

type StatsQuery struct {
	ReportQuery
	GroupBy string `form:"group_by"` // type, status, assignee, province, region
}

type TrendQuery struct {
	ReportQuery
	Interval string `form:"interval,default=day"` // day, week, month
}

type TrendItem struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

type SalesStatsItem struct {
	UserID         uuid.UUID `json:"user_id"`
	UserName       string    `json:"user_name"`
	TicketTotal    int64     `json:"ticket_total"`
	TicketResolved int64     `json:"ticket_resolved"`
	AvgHours       float64   `json:"avg_hours"`
}
