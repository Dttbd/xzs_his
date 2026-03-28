package service

import (
	"fmt"
	"io"

	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/internal/repository"
	"github.com/dttbd/hospital-server/pkg/export"
	"github.com/google/uuid"
)

type HospitalService struct {
	repo *repository.HospitalRepo
}

func NewHospitalService(repo *repository.HospitalRepo) *HospitalService {
	return &HospitalService{repo: repo}
}

// ---------- Hospital ----------

func (s *HospitalService) ListHospitals(q *dto.HospitalFilterQuery) ([]models.Hospital, int64, error) {
	return s.repo.ListHospitals(q)
}

func (s *HospitalService) GetHospital(id uuid.UUID) (*models.Hospital, error) {
	return s.repo.GetHospital(id)
}

func (s *HospitalService) CreateHospital(req *dto.CreateHospitalReq) (*models.Hospital, error) {
	hospital := &models.Hospital{
		Name:            req.Name,
		Code:            req.Code,
		CategoryID:      req.CategoryID,
		Level:           req.Level,
		ProvinceID:      req.ProvinceID,
		City:            req.City,
		Address:         req.Address,
		ContactName:     req.ContactName,
		ContactPhone:    req.ContactPhone,
		ContactEmail:    req.ContactEmail,
		BedCount:        req.BedCount,
		DepartmentCount: req.DepartmentCount,
		IsSpecialized:   req.IsSpecialized,
		SpecialtyType:   req.SpecialtyType,
		OwnerUserID:     req.OwnerUserID,
		Remark:          req.Remark,
	}

	if err := s.repo.CreateHospital(hospital); err != nil {
		return nil, err
	}

	if len(req.Fields) > 0 {
		if err := s.repo.SaveFields(hospital.ID, req.Fields); err != nil {
			return nil, err
		}
	}

	return s.repo.GetHospital(hospital.ID)
}

func (s *HospitalService) UpdateHospital(id uuid.UUID, req *dto.UpdateHospitalReq) (*models.Hospital, error) {
	hospital, err := s.repo.GetHospital(id)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		hospital.Name = *req.Name
	}
	if req.CategoryID != nil {
		hospital.CategoryID = req.CategoryID
	}
	if req.Level != nil {
		hospital.Level = *req.Level
	}
	if req.ProvinceID != nil {
		hospital.ProvinceID = req.ProvinceID
	}
	if req.City != nil {
		hospital.City = *req.City
	}
	if req.Address != nil {
		hospital.Address = *req.Address
	}
	if req.ContactName != nil {
		hospital.ContactName = *req.ContactName
	}
	if req.ContactPhone != nil {
		hospital.ContactPhone = *req.ContactPhone
	}
	if req.ContactEmail != nil {
		hospital.ContactEmail = *req.ContactEmail
	}
	if req.BedCount != nil {
		hospital.BedCount = *req.BedCount
	}
	if req.DepartmentCount != nil {
		hospital.DepartmentCount = *req.DepartmentCount
	}
	if req.IsSpecialized != nil {
		hospital.IsSpecialized = *req.IsSpecialized
	}
	if req.SpecialtyType != nil {
		hospital.SpecialtyType = *req.SpecialtyType
	}
	if req.OwnerUserID != nil {
		hospital.OwnerUserID = req.OwnerUserID
	}
	if req.Status != nil {
		hospital.Status = *req.Status
	}
	if req.Remark != nil {
		hospital.Remark = *req.Remark
	}

	if err := s.repo.UpdateHospital(hospital); err != nil {
		return nil, err
	}

	if req.Fields != nil {
		if err := s.repo.SaveFields(hospital.ID, req.Fields); err != nil {
			return nil, err
		}
	}

	return s.repo.GetHospital(hospital.ID)
}

func (s *HospitalService) DeleteHospital(id uuid.UUID) error {
	return s.repo.DeleteHospital(id)
}

func (s *HospitalService) Summary(q *dto.HospitalSummaryQuery) ([]dto.HospitalSummaryItem, error) {
	return s.repo.Summary(q)
}

func (s *HospitalService) ExportExcel(q *dto.HospitalFilterQuery, w io.Writer) error {
	hospitals, err := s.repo.ListAllHospitals(q)
	if err != nil {
		return err
	}

	fieldDefs, err := s.repo.GetAllFieldDefs()
	if err != nil {
		return err
	}

	ew := export.NewExcelWriter("Hospitals")
	defer ew.Close()

	// Build headers: fixed columns + dynamic fields
	headers := []string{
		"Name", "Code", "Category", "Level", "Province", "Region",
		"City", "Address", "Contact Name", "Contact Phone", "Contact Email",
		"Bed Count", "Department Count", "Is Specialized", "Specialty Type",
		"Owner", "Status", "Remark",
	}
	for _, fd := range fieldDefs {
		headers = append(headers, fd.FieldName)
	}

	if err := ew.WriteHeader(headers); err != nil {
		return err
	}

	for _, h := range hospitals {
		// Build dynamic field lookup
		fieldMap := make(map[string]string)
		for _, f := range h.Fields {
			fieldMap[f.FieldKey] = f.FieldValue
		}

		categoryName := ""
		if h.Category != nil {
			categoryName = h.Category.Name
		}
		provinceName := ""
		regionName := ""
		if h.Province != nil {
			provinceName = h.Province.Name
			if h.Province.Region.Name != "" {
				regionName = h.Province.Region.Name
			}
		}
		ownerName := ""
		if h.OwnerUser != nil {
			ownerName = h.OwnerUser.RealName
		}

		specialized := "No"
		if h.IsSpecialized {
			specialized = "Yes"
		}

		row := []interface{}{
			h.Name, h.Code, categoryName, h.Level, provinceName, regionName,
			h.City, h.Address, h.ContactName, h.ContactPhone, h.ContactEmail,
			h.BedCount, h.DepartmentCount, specialized, h.SpecialtyType,
			ownerName, fmt.Sprintf("%d", h.Status), h.Remark,
		}

		for _, fd := range fieldDefs {
			row = append(row, fieldMap[fd.FieldKey])
		}

		ew.WriteRow(row)
	}

	return ew.WriteTo(w)
}

// ---------- HospitalCategory ----------

func (s *HospitalService) ListCategories(q *dto.PageQuery) ([]models.HospitalCategory, int64, error) {
	return s.repo.ListCategories(q)
}

func (s *HospitalService) GetCategory(id uuid.UUID) (*models.HospitalCategory, error) {
	return s.repo.GetCategory(id)
}

func (s *HospitalService) CreateCategory(req *dto.CreateCategoryReq) (*models.HospitalCategory, error) {
	category := &models.HospitalCategory{
		Name:      req.Name,
		Code:      req.Code,
		ParentID:  req.ParentID,
		SortOrder: req.SortOrder,
	}
	if err := s.repo.CreateCategory(category); err != nil {
		return nil, err
	}
	return category, nil
}

func (s *HospitalService) UpdateCategory(id uuid.UUID, req *dto.UpdateCategoryReq) (*models.HospitalCategory, error) {
	category, err := s.repo.GetCategory(id)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		category.Name = *req.Name
	}
	if req.Code != nil {
		category.Code = *req.Code
	}
	if req.ParentID != nil {
		category.ParentID = req.ParentID
	}
	if req.SortOrder != nil {
		category.SortOrder = *req.SortOrder
	}

	if err := s.repo.UpdateCategory(category); err != nil {
		return nil, err
	}
	return category, nil
}

func (s *HospitalService) DeleteCategory(id uuid.UUID) error {
	return s.repo.DeleteCategory(id)
}

// ---------- FieldDefinition ----------

func (s *HospitalService) ListFieldDefs(q *dto.PageQuery) ([]models.FieldDefinition, int64, error) {
	return s.repo.ListFieldDefs(q)
}

func (s *HospitalService) GetFieldDef(id uuid.UUID) (*models.FieldDefinition, error) {
	return s.repo.GetFieldDef(id)
}

func (s *HospitalService) CreateFieldDef(req *dto.CreateFieldDefReq) (*models.FieldDefinition, error) {
	def := &models.FieldDefinition{
		FieldKey:     req.FieldKey,
		FieldName:    req.FieldName,
		FieldType:    req.FieldType,
		Options:      req.Options,
		IsRequired:   req.IsRequired,
		IsFilterable: req.IsFilterable,
		SortOrder:    req.SortOrder,
	}
	if err := s.repo.CreateFieldDef(def); err != nil {
		return nil, err
	}
	return def, nil
}

func (s *HospitalService) UpdateFieldDef(id uuid.UUID, req *dto.UpdateFieldDefReq) (*models.FieldDefinition, error) {
	def, err := s.repo.GetFieldDef(id)
	if err != nil {
		return nil, err
	}

	if req.FieldName != nil {
		def.FieldName = *req.FieldName
	}
	if req.FieldType != nil {
		def.FieldType = *req.FieldType
	}
	if req.Options != nil {
		def.Options = *req.Options
	}
	if req.IsRequired != nil {
		def.IsRequired = *req.IsRequired
	}
	if req.IsFilterable != nil {
		def.IsFilterable = *req.IsFilterable
	}
	if req.SortOrder != nil {
		def.SortOrder = *req.SortOrder
	}

	if err := s.repo.UpdateFieldDef(def); err != nil {
		return nil, err
	}
	return def, nil
}

func (s *HospitalService) DeleteFieldDef(id uuid.UUID) error {
	return s.repo.DeleteFieldDef(id)
}
