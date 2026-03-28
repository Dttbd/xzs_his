package service

import (
	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/internal/repository"
	"github.com/google/uuid"
)

type OrganizationService struct {
	repo *repository.OrganizationRepo
}

func NewOrganizationService(repo *repository.OrganizationRepo) *OrganizationService {
	return &OrganizationService{repo: repo}
}

// Region methods

func (s *OrganizationService) ListRegions(q *dto.PageQuery) ([]models.Region, int64, error) {
	return s.repo.ListRegions(q)
}

func (s *OrganizationService) GetRegion(id uuid.UUID) (*models.Region, error) {
	return s.repo.GetRegion(id)
}

func (s *OrganizationService) CreateRegion(req *dto.CreateRegionReq) (*models.Region, error) {
	region := &models.Region{
		Name:      req.Name,
		Code:      req.Code,
		SortOrder: req.SortOrder,
	}
	if err := s.repo.CreateRegion(region); err != nil {
		return nil, err
	}
	return region, nil
}

func (s *OrganizationService) UpdateRegion(id uuid.UUID, req *dto.UpdateRegionReq) (*models.Region, error) {
	region, err := s.repo.GetRegion(id)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		region.Name = *req.Name
	}
	if req.Code != nil {
		region.Code = *req.Code
	}
	if req.Status != nil {
		region.Status = *req.Status
	}
	if req.SortOrder != nil {
		region.SortOrder = *req.SortOrder
	}

	if err := s.repo.UpdateRegion(region); err != nil {
		return nil, err
	}
	return region, nil
}

func (s *OrganizationService) DeleteRegion(id uuid.UUID) error {
	return s.repo.DeleteRegion(id)
}

// Province methods

func (s *OrganizationService) ListProvinces(q *dto.PageQuery, regionID *uuid.UUID) ([]models.Province, int64, error) {
	return s.repo.ListProvinces(q, regionID)
}

func (s *OrganizationService) GetProvince(id uuid.UUID) (*models.Province, error) {
	return s.repo.GetProvince(id)
}

func (s *OrganizationService) CreateProvince(req *dto.CreateProvinceReq) (*models.Province, error) {
	province := &models.Province{
		RegionID:       req.RegionID,
		Name:           req.Name,
		Code:           req.Code,
		DefaultHandler: req.DefaultHandler,
		SortOrder:      req.SortOrder,
	}
	if err := s.repo.CreateProvince(province); err != nil {
		return nil, err
	}
	return province, nil
}

func (s *OrganizationService) UpdateProvince(id uuid.UUID, req *dto.UpdateProvinceReq) (*models.Province, error) {
	province, err := s.repo.GetProvince(id)
	if err != nil {
		return nil, err
	}

	if req.RegionID != nil {
		province.RegionID = *req.RegionID
	}
	if req.Name != nil {
		province.Name = *req.Name
	}
	if req.Code != nil {
		province.Code = *req.Code
	}
	if req.DefaultHandler != nil {
		province.DefaultHandler = req.DefaultHandler
	}
	if req.Status != nil {
		province.Status = *req.Status
	}
	if req.SortOrder != nil {
		province.SortOrder = *req.SortOrder
	}

	if err := s.repo.UpdateProvince(province); err != nil {
		return nil, err
	}
	return province, nil
}

func (s *OrganizationService) DeleteProvince(id uuid.UUID) error {
	return s.repo.DeleteProvince(id)
}
