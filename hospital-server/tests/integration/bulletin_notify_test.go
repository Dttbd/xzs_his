package integration

import (
	"testing"

	"github.com/dttbd/hospital-server/internal/models"
	"github.com/dttbd/hospital-server/internal/repository"
	"github.com/google/uuid"
)

func contains(ids []uuid.UUID, id uuid.UUID) bool {
	for _, x := range ids {
		if x == id {
			return true
		}
	}
	return false
}

func TestBulletinResolveRecipients(t *testing.T) {
	_, db := setupTestServer(t)

	region := models.Region{Name: "华东", Code: "EAST", Status: 1}
	if err := db.Create(&region).Error; err != nil {
		t.Fatalf("region: %v", err)
	}
	otherRegion := models.Region{Name: "华南", Code: "SOUTH", Status: 1}
	db.Create(&otherRegion)

	p1 := models.Province{Name: "江苏", Code: "JS", RegionID: region.ID, Status: 1}
	p2 := models.Province{Name: "浙江", Code: "ZJ", RegionID: region.ID, Status: 1}
	pOther := models.Province{Name: "广东", Code: "GD", RegionID: otherRegion.ID, Status: 1}
	db.Create(&p1)
	db.Create(&p2)
	db.Create(&pOther)

	// customer role (exclude these users)
	var customerRole models.Role
	db.Where("code = ?", "customer").FirstOrCreate(&customerRole, models.Role{Code: "customer", Name: "客户", Status: 1})

	mk := func(name string, regionID *uuid.UUID, provinceID *uuid.UUID, asCustomer bool) models.User {
		u := models.User{
			Username:     name,
			RealName:     name,
			PasswordHash: "x",
			Status:       1,
			RegionID:     regionID,
			ProvinceID:   provinceID,
		}
		if err := db.Create(&u).Error; err != nil {
			t.Fatalf("user %s: %v", name, err)
		}
		if asCustomer {
			db.Model(&u).Association("Roles").Append(&customerRole)
		}
		return u
	}

	author := mk("author", &region.ID, nil, false)
	uRegion := mk("u_region", &region.ID, nil, false) // region-level only
	uP1 := mk("u_p1", nil, &p1.ID, false)             // province p1
	uP2 := mk("u_p2", nil, &p2.ID, false)             // province p2
	uOther := mk("u_other", nil, &pOther.ID, false)   // different region
	uCust := mk("u_cust", nil, &p1.ID, true)           // customer in p1

	repo := repository.NewBulletinRepo(db)

	// region scope: region users + both provinces under the region; exclude author/customer/other-region
	ids, err := repo.ResolveRecipients("region", &region.ID, author.ID)
	if err != nil {
		t.Fatalf("region resolve: %v", err)
	}
	if !contains(ids, uRegion.ID) || !contains(ids, uP1.ID) || !contains(ids, uP2.ID) {
		t.Fatalf("region scope missing expected users: %v", ids)
	}
	if contains(ids, uOther.ID) || contains(ids, uCust.ID) || contains(ids, author.ID) {
		t.Fatalf("region scope included excluded users: %v", ids)
	}

	// province p1: only uP1; not uP2, not customer, not author
	ids, err = repo.ResolveRecipients("province", &p1.ID, author.ID)
	if err != nil {
		t.Fatalf("province resolve: %v", err)
	}
	if !contains(ids, uP1.ID) {
		t.Fatalf("province scope missing uP1: %v", ids)
	}
	if contains(ids, uP2.ID) || contains(ids, uCust.ID) || contains(ids, author.ID) {
		t.Fatalf("province scope included excluded users: %v", ids)
	}

	// all: all non-customer except author (uRegion, uP1, uP2, uOther); not customer, not author
	ids, err = repo.ResolveRecipients("all", nil, author.ID)
	if err != nil {
		t.Fatalf("all resolve: %v", err)
	}
	if !contains(ids, uRegion.ID) || !contains(ids, uP1.ID) || !contains(ids, uP2.ID) || !contains(ids, uOther.ID) {
		t.Fatalf("all scope missing expected users: %v", ids)
	}
	if contains(ids, uCust.ID) || contains(ids, author.ID) {
		t.Fatalf("all scope included excluded users: %v", ids)
	}
}
