package models

import "gorm.io/gorm"

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&Region{},
		&Province{},
		&User{},
		&Role{},
		&Hospital{}, &HospitalCategory{}, &FieldDefinition{}, &HospitalField{},
		&TicketType{}, &TicketStatus{}, &TicketTransition{},
		&Ticket{}, &TicketComment{}, &TicketAttachment{}, &TicketLog{},
	)
}
