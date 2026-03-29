package service

import (
	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/repository"
)

type ReportService struct {
	repo *repository.ReportRepo
}

func NewReportService(repo *repository.ReportRepo) *ReportService {
	return &ReportService{repo: repo}
}

func (s *ReportService) Overview(q *dto.ReportQuery) (*dto.OverviewStats, error) {
	return s.repo.Overview(q)
}

func (s *ReportService) HospitalStats(q *dto.StatsQuery) ([]dto.ChartDataItem, error) {
	return s.repo.HospitalStats(q)
}

func (s *ReportService) TicketStats(q *dto.StatsQuery) ([]dto.ChartDataItem, error) {
	return s.repo.TicketStats(q)
}

func (s *ReportService) TicketTrend(q *dto.TrendQuery) ([]dto.TrendItem, error) {
	return s.repo.TicketTrend(q)
}

func (s *ReportService) SalesStats(q *dto.ReportQuery) ([]dto.SalesStatsItem, error) {
	return s.repo.SalesStats(q)
}
