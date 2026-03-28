package service

import (
	"github.com/casbin/casbin/v3"
	"github.com/dttbd/hospital-server/internal/dto"
	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/internal/repository"
	"github.com/google/uuid"
)

type RoleService struct {
	repo     *repository.RoleRepo
	enforcer *casbin.Enforcer
}

func NewRoleService(repo *repository.RoleRepo, enforcer *casbin.Enforcer) *RoleService {
	return &RoleService{repo: repo, enforcer: enforcer}
}

func (s *RoleService) List(q *dto.PageQuery) ([]models.Role, int64, error) {
	return s.repo.List(q)
}

func (s *RoleService) GetByID(id uuid.UUID) (*models.Role, error) {
	return s.repo.GetByID(id)
}

func (s *RoleService) Create(name, code, description string) (*models.Role, error) {
	role := &models.Role{
		Name:        name,
		Code:        code,
		Description: description,
	}
	if err := s.repo.Create(role); err != nil {
		return nil, err
	}
	return role, nil
}

func (s *RoleService) Update(id uuid.UUID, name, code, description *string, status *int8) (*models.Role, error) {
	role, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if name != nil {
		role.Name = *name
	}
	if code != nil {
		role.Code = *code
	}
	if description != nil {
		role.Description = *description
	}
	if status != nil {
		role.Status = *status
	}

	if err := s.repo.Update(role); err != nil {
		return nil, err
	}
	return role, nil
}

func (s *RoleService) Delete(id uuid.UUID) error {
	return s.repo.Delete(id)
}

func (s *RoleService) GetPermissions(roleCode string) [][]string {
	policies, _ := s.enforcer.GetFilteredPolicy(0, roleCode)
	return policies
}

func (s *RoleService) SetPermissions(roleCode string, permissions [][]string) error {
	_, err := s.enforcer.RemoveFilteredPolicy(0, roleCode)
	if err != nil {
		return err
	}

	for _, perm := range permissions {
		if len(perm) >= 2 {
			_, err := s.enforcer.AddPolicy(roleCode, perm[0], perm[1])
			if err != nil {
				return err
			}
		}
	}

	return s.enforcer.SavePolicy()
}
