package admin

import (
	"net/http"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/gin-gonic/gin"
)

type ReportHandler struct {
	svc *service.ReportService
}

func NewReportHandler(svc *service.ReportService) *ReportHandler {
	return &ReportHandler{svc: svc}
}

// Overview godoc
// GET /reports/overview
func (h *ReportHandler) Overview(c *gin.Context) {
	var q dto.ReportQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	stats, err := h.svc.Overview(&q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.OK(stats))
}

// HospitalStats godoc
// GET /reports/hospital-stats
func (h *ReportHandler) HospitalStats(c *gin.Context) {
	var q dto.StatsQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	items, err := h.svc.HospitalStats(&q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.OK(items))
}

// TicketStats godoc
// GET /reports/ticket-stats
func (h *ReportHandler) TicketStats(c *gin.Context) {
	var q dto.StatsQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	items, err := h.svc.TicketStats(&q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.OK(items))
}

// TicketTrend godoc
// GET /reports/ticket-trend
func (h *ReportHandler) TicketTrend(c *gin.Context) {
	var q dto.TrendQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	items, err := h.svc.TicketTrend(&q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.OK(items))
}

// SalesStats godoc
// GET /reports/sales-stats
func (h *ReportHandler) SalesStats(c *gin.Context) {
	var q dto.ReportQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	items, err := h.svc.SalesStats(&q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.OK(items))
}
