package repository

import (
	"fmt"
	"time"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func parseUUID(s string) (uuid.UUID, error) {
	return uuid.Parse(s)
}

type ReportRepo struct {
	db *gorm.DB
}

func NewReportRepo(db *gorm.DB) *ReportRepo {
	return &ReportRepo{db: db}
}

// applyHospitalFilters appends WHERE clauses for region/province on the hospitals table.
func applyHospitalFilters(q *dto.ReportQuery, where string, args []interface{}) (string, []interface{}) {
	if q.ProvinceID != nil {
		where += " AND h.province_id = ?"
		args = append(args, *q.ProvinceID)
	}
	if q.RegionID != nil {
		where += " AND p.region_id = ?"
		args = append(args, *q.RegionID)
	}
	return where, args
}

// applyTicketFilters appends WHERE clauses for date range, region, and province on the tickets table.
func applyTicketFilters(q *dto.ReportQuery, where string, args []interface{}) (string, []interface{}) {
	if q.DateFrom != "" {
		where += " AND t.created_at >= ?"
		args = append(args, q.DateFrom)
	}
	if q.DateTo != "" {
		where += " AND t.created_at <= ?"
		args = append(args, q.DateTo+" 23:59:59")
	}
	if q.ProvinceID != nil {
		where += " AND t.province_id = ?"
		args = append(args, *q.ProvinceID)
	}
	if q.RegionID != nil {
		where += " AND t.region_id = ?"
		args = append(args, *q.RegionID)
	}
	return where, args
}

// Overview returns aggregated platform-wide statistics.
func (r *ReportRepo) Overview(q *dto.ReportQuery) (*dto.OverviewStats, error) {
	stats := &dto.OverviewStats{}

	// Hospital count (with optional province/region filter)
	hWhere := "h.deleted_at IS NULL"
	var hArgs []interface{}
	if q.ProvinceID != nil {
		hWhere += " AND h.province_id = ?"
		hArgs = append(hArgs, *q.ProvinceID)
	}
	if q.RegionID != nil {
		hWhere += " AND p.region_id = ?"
		hArgs = append(hArgs, *q.RegionID)
	}

	var hospitalCount int64
	hQuery := fmt.Sprintf(`
		SELECT COUNT(h.id)
		FROM hospitals h
		LEFT JOIN provinces p ON p.id = h.province_id
		WHERE %s`, hWhere)
	if err := r.db.Raw(hQuery, hArgs...).Scan(&hospitalCount).Error; err != nil {
		return nil, err
	}
	stats.HospitalCount = hospitalCount

	// Month new hospitals
	firstOfMonthDate := time.Now().AddDate(0, 0, -time.Now().Day()+1).Format("2006-01-02")
	var monthNew int64
	mQuery := fmt.Sprintf(`
		SELECT COUNT(h.id)
		FROM hospitals h
		LEFT JOIN provinces p ON p.id = h.province_id
		WHERE %s AND h.created_at >= ?`, hWhere)
	mArgs := append(append([]interface{}{}, hArgs...), firstOfMonthDate)
	if err := r.db.Raw(mQuery, mArgs...).Scan(&monthNew).Error; err != nil {
		return nil, err
	}
	stats.MonthNewHospitals = monthNew

	// Ticket stats
	tWhere := "t.deleted_at IS NULL"
	var tArgs []interface{}
	tWhere, tArgs = applyTicketFilters(q, tWhere, tArgs)

	type ticketAgg struct {
		Total    int64
		Pending  int64
		Resolved int64
		AvgHours float64
	}
	var agg ticketAgg
	tQuery := fmt.Sprintf(`
		SELECT
			COUNT(t.id) AS total,
			SUM(CASE WHEN ts.code = 'open' THEN 1 ELSE 0 END) AS pending,
			SUM(CASE WHEN ts.code = 'resolved' THEN 1 ELSE 0 END) AS resolved,
			COALESCE(AVG(CASE WHEN t.resolved_at IS NOT NULL
				THEN EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 3600
				ELSE NULL END), 0) AS avg_hours
		FROM tickets t
		LEFT JOIN ticket_statuses ts ON ts.id = t.status_id
		WHERE %s`, tWhere)
	if err := r.db.Raw(tQuery, tArgs...).Scan(&agg).Error; err != nil {
		return nil, err
	}
	stats.TicketTotal = agg.Total
	stats.TicketPending = agg.Pending
	stats.TicketResolved = agg.Resolved
	stats.AvgResponseHours = agg.AvgHours

	return stats, nil
}

// HospitalStats returns hospital counts grouped by province, region, category, or specialty_type.
func (r *ReportRepo) HospitalStats(q *dto.StatsQuery) ([]dto.ChartDataItem, error) {
	var rows []struct {
		Label string
		Value int64
	}

	baseWhere := "h.deleted_at IS NULL"
	var args []interface{}
	baseWhere, args = applyHospitalFilters(&q.ReportQuery, baseWhere, args)

	var query string
	switch q.GroupBy {
	case "region":
		query = fmt.Sprintf(`
			SELECT r.name AS label, COUNT(h.id) AS value
			FROM hospitals h
			LEFT JOIN provinces p ON p.id = h.province_id
			LEFT JOIN regions r ON r.id = p.region_id
			WHERE %s
			GROUP BY r.name
			ORDER BY value DESC`, baseWhere)
	case "category":
		query = fmt.Sprintf(`
			SELECT hc.name AS label, COUNT(h.id) AS value
			FROM hospitals h
			LEFT JOIN provinces p ON p.id = h.province_id
			LEFT JOIN hospital_categories hc ON hc.id = h.category_id
			WHERE %s
			GROUP BY hc.name
			ORDER BY value DESC`, baseWhere)
	case "specialty_type":
		query = fmt.Sprintf(`
			SELECT COALESCE(NULLIF(h.specialty_type, ''), 'Unknown') AS label, COUNT(h.id) AS value
			FROM hospitals h
			LEFT JOIN provinces p ON p.id = h.province_id
			WHERE %s
			GROUP BY h.specialty_type
			ORDER BY value DESC`, baseWhere)
	default: // province
		query = fmt.Sprintf(`
			SELECT p.name AS label, COUNT(h.id) AS value
			FROM hospitals h
			LEFT JOIN provinces p ON p.id = h.province_id
			WHERE %s
			GROUP BY p.name
			ORDER BY value DESC`, baseWhere)
	}

	if err := r.db.Raw(query, args...).Scan(&rows).Error; err != nil {
		return nil, err
	}

	items := make([]dto.ChartDataItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, dto.ChartDataItem{Label: row.Label, Value: row.Value})
	}
	return items, nil
}

// TicketStats returns ticket counts grouped by type, status, or assignee.
func (r *ReportRepo) TicketStats(q *dto.StatsQuery) ([]dto.ChartDataItem, error) {
	var rows []struct {
		Label string
		Value int64
	}

	baseWhere := "t.deleted_at IS NULL"
	var args []interface{}
	baseWhere, args = applyTicketFilters(&q.ReportQuery, baseWhere, args)

	var query string
	switch q.GroupBy {
	case "status":
		query = fmt.Sprintf(`
			SELECT ts.name AS label, COUNT(t.id) AS value
			FROM tickets t
			LEFT JOIN ticket_statuses ts ON ts.id = t.status_id
			WHERE %s
			GROUP BY ts.name
			ORDER BY value DESC`, baseWhere)
	case "assignee":
		query = fmt.Sprintf(`
			SELECT COALESCE(u.real_name, u.username) AS label, COUNT(t.id) AS value
			FROM tickets t
			LEFT JOIN users u ON u.id = t.assignee_id
			WHERE %s
			GROUP BY u.id, u.real_name, u.username
			ORDER BY value DESC`, baseWhere)
	default: // type
		query = fmt.Sprintf(`
			SELECT tt.name AS label, COUNT(t.id) AS value
			FROM tickets t
			LEFT JOIN ticket_types tt ON tt.id = t.type_id
			WHERE %s
			GROUP BY tt.name
			ORDER BY value DESC`, baseWhere)
	}

	if err := r.db.Raw(query, args...).Scan(&rows).Error; err != nil {
		return nil, err
	}

	items := make([]dto.ChartDataItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, dto.ChartDataItem{Label: row.Label, Value: row.Value})
	}
	return items, nil
}

// TicketTrend returns ticket creation counts over time grouped by day, week, or month.
func (r *ReportRepo) TicketTrend(q *dto.TrendQuery) ([]dto.TrendItem, error) {
	interval := q.Interval
	if interval == "" {
		interval = "day"
	}
	// Whitelist to avoid SQL injection
	switch interval {
	case "day", "week", "month":
	default:
		interval = "day"
	}

	where := "t.deleted_at IS NULL"
	var args []interface{}
	where, args = applyTicketFilters(&q.ReportQuery, where, args)

	var rows []struct {
		Date  string
		Count int64
	}

	query := fmt.Sprintf(`
		SELECT TO_CHAR(DATE_TRUNC('%s', t.created_at), 'YYYY-MM-DD') AS date,
		       COUNT(t.id) AS count
		FROM tickets t
		WHERE %s
		GROUP BY DATE_TRUNC('%s', t.created_at)
		ORDER BY DATE_TRUNC('%s', t.created_at) ASC`,
		interval, where, interval, interval)

	if err := r.db.Raw(query, args...).Scan(&rows).Error; err != nil {
		return nil, err
	}

	items := make([]dto.TrendItem, 0, len(rows))
	for _, row := range rows {
		items = append(items, dto.TrendItem{Date: row.Date, Count: row.Count})
	}
	return items, nil
}

// SalesStats returns per-assignee ticket statistics.
func (r *ReportRepo) SalesStats(q *dto.ReportQuery) ([]dto.SalesStatsItem, error) {
	where := "t.deleted_at IS NULL AND t.assignee_id IS NOT NULL"
	var args []interface{}
	where, args = applyTicketFilters(q, where, args)

	var rows []struct {
		UserID   string
		UserName string
		Total    int64
		Resolved int64
		AvgHours float64
	}

	query := fmt.Sprintf(`
		SELECT
			t.assignee_id::text AS user_id,
			COALESCE(u.real_name, u.username) AS user_name,
			COUNT(t.id) AS total,
			SUM(CASE WHEN ts.code = 'resolved' THEN 1 ELSE 0 END) AS resolved,
			COALESCE(AVG(CASE WHEN t.resolved_at IS NOT NULL
				THEN EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 3600
				ELSE NULL END), 0) AS avg_hours
		FROM tickets t
		LEFT JOIN users u ON u.id = t.assignee_id
		LEFT JOIN ticket_statuses ts ON ts.id = t.status_id
		WHERE %s
		GROUP BY t.assignee_id, u.real_name, u.username
		ORDER BY total DESC`, where)

	if err := r.db.Raw(query, args...).Scan(&rows).Error; err != nil {
		return nil, err
	}

	items := make([]dto.SalesStatsItem, 0, len(rows))
	for _, row := range rows {
		uid, _ := parseUUID(row.UserID)
		items = append(items, dto.SalesStatsItem{
			UserID:         uid,
			UserName:       row.UserName,
			TicketTotal:    row.Total,
			TicketResolved: row.Resolved,
			AvgHours:       row.AvgHours,
		})
	}
	return items, nil
}
