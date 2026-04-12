package admin

import (
	"net/http"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type HospitalHandler struct {
	svc *service.HospitalService
}

func NewHospitalHandler(svc *service.HospitalService) *HospitalHandler {
	return &HospitalHandler{svc: svc}
}

// ---------- Hospital ----------

// ListHospitals godoc
// @Summary      医院列表
// @Tags         hospitals
// @Produce      json
// @Security     BearerAuth
// @Param        page       query     int     false  "页码"
// @Param        page_size  query     int     false  "每页数量"
// @Success      200        {object}  dto.Response{data=dto.PageResult}
// @Router       /api/admin/v1/hospitals [get]
func (h *HospitalHandler) ListHospitals(c *gin.Context) {
	var q dto.HospitalFilterQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	hospitals, total, err := h.svc.ListHospitals(&q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.PageOK(hospitals, total, q.Page, q.PageSize))
}

// GetHospital godoc
// @Summary      获取医院
// @Tags         hospitals
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "医院 ID"
// @Success      200  {object}  dto.Response
// @Router       /api/admin/v1/hospitals/{id} [get]
func (h *HospitalHandler) GetHospital(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	hospital, err := h.svc.GetHospital(id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Fail(404, "hospital not found"))
		return
	}

	c.JSON(http.StatusOK, dto.OK(hospital))
}

// CreateHospital godoc
// @Summary      新建医院
// @Tags         hospitals
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      dto.CreateHospitalReq  true  "医院信息"
// @Success      201   {object}  dto.Response
// @Router       /api/admin/v1/hospitals [post]
func (h *HospitalHandler) CreateHospital(c *gin.Context) {
	var req dto.CreateHospitalReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	hospital, err := h.svc.CreateHospital(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusCreated, dto.OK(hospital))
}

// UpdateHospital godoc
// @Summary      更新医院
// @Tags         hospitals
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      string                 true  "医院 ID"
// @Param        body  body      dto.UpdateHospitalReq  true  "医院信息"
// @Success      200   {object}  dto.Response
// @Router       /api/admin/v1/hospitals/{id} [put]
func (h *HospitalHandler) UpdateHospital(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	var req dto.UpdateHospitalReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	hospital, err := h.svc.UpdateHospital(id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.OK(hospital))
}

// DeleteHospital godoc
// @Summary      删除医院
// @Tags         hospitals
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "医院 ID"
// @Success      200  {object}  dto.Response
// @Router       /api/admin/v1/hospitals/{id} [delete]
func (h *HospitalHandler) DeleteHospital(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	if err := h.svc.DeleteHospital(id); err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.OKMsg("deleted"))
}

func (h *HospitalHandler) Summary(c *gin.Context) {
	var q dto.HospitalSummaryQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	items, err := h.svc.Summary(&q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.OK(items))
}

func (h *HospitalHandler) ExportExcel(c *gin.Context) {
	var q dto.HospitalFilterQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=hospitals.xlsx")

	if err := h.svc.ExportExcel(&q, c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}
}

// ---------- HospitalCategory ----------

func (h *HospitalHandler) ListCategories(c *gin.Context) {
	var q dto.PageQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	categories, total, err := h.svc.ListCategories(&q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.PageOK(categories, total, q.Page, q.PageSize))
}

func (h *HospitalHandler) GetCategory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	category, err := h.svc.GetCategory(id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Fail(404, "category not found"))
		return
	}

	c.JSON(http.StatusOK, dto.OK(category))
}

func (h *HospitalHandler) CreateCategory(c *gin.Context) {
	var req dto.CreateCategoryReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	category, err := h.svc.CreateCategory(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusCreated, dto.OK(category))
}

func (h *HospitalHandler) UpdateCategory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	var req dto.UpdateCategoryReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	category, err := h.svc.UpdateCategory(id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.OK(category))
}

func (h *HospitalHandler) DeleteCategory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	if err := h.svc.DeleteCategory(id); err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.OKMsg("deleted"))
}

// ---------- FieldDefinition ----------

func (h *HospitalHandler) ListFieldDefs(c *gin.Context) {
	var q dto.PageQuery
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	defs, total, err := h.svc.ListFieldDefs(&q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.PageOK(defs, total, q.Page, q.PageSize))
}

func (h *HospitalHandler) GetFieldDef(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	def, err := h.svc.GetFieldDef(id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Fail(404, "field definition not found"))
		return
	}

	c.JSON(http.StatusOK, dto.OK(def))
}

func (h *HospitalHandler) CreateFieldDef(c *gin.Context) {
	var req dto.CreateFieldDefReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	def, err := h.svc.CreateFieldDef(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusCreated, dto.OK(def))
}

func (h *HospitalHandler) UpdateFieldDef(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	var req dto.UpdateFieldDefReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, err.Error()))
		return
	}

	def, err := h.svc.UpdateFieldDef(id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.OK(def))
}

func (h *HospitalHandler) DeleteFieldDef(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail(400, "invalid id"))
		return
	}

	if err := h.svc.DeleteFieldDef(id); err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail(500, err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.OKMsg("deleted"))
}
