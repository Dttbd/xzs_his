# Phase 2: Core Business Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Hospital CRUD (with dynamic fields, multi-condition filtering, export), Ticket system (configurable state machine, comments, attachments, logs), and MinIO file upload.

**Architecture:** Extends Phase 1's Clean Architecture. New models/repos/services/handlers for hospital and ticket modules. MinIO integration via `pkg/storage`. Excel export via excelize.

**Tech Stack:** Same as Phase 1 + excelize (Excel export), MinIO Go SDK, Asynq (async task placeholder)

---

## File Structure (New/Modified)

```
hospital-server/
├── internal/
│   ├── models/
│   │   ├── hospital.go          # Hospital, HospitalCategory, FieldDefinition, HospitalField
│   │   ├── ticket.go            # Ticket, TicketType, TicketStatus, TicketTransition,
│   │   │                        #   TicketComment, TicketAttachment, TicketLog
│   │   └── migrate.go           # (modify) register new models
│   ├── dto/
│   │   ├── hospital.go          # Hospital CRUD + filter + export DTOs
│   │   └── ticket.go            # Ticket CRUD + transition + comment DTOs
│   ├── repository/
│   │   ├── hospital.go          # Hospital repo with dynamic field filtering
│   │   └── ticket.go            # Ticket repo with status/type/assignee filtering
│   ├── service/
│   │   ├── hospital.go          # Hospital service with summary/export
│   │   └── ticket.go            # Ticket service with state machine validation
│   ├── handler/admin/
│   │   ├── hospital.go          # Hospital CRUD + summary + export handlers
│   │   ├── ticket.go            # Ticket CRUD + transition + comment + attachment handlers
│   │   └── ticket_config.go     # Ticket type/status/transition config handlers
│   └── router/
│       └── router.go            # (modify) add new routes
├── pkg/
│   ├── storage/
│   │   └── minio.go             # MinIO client wrapper (upload, presign URL, delete)
│   └── export/
│       └── excel.go             # Excel export helper using excelize
└── configs/
    └── config.yaml              # (modify) add minio config section
```

---

### Task 1: MinIO Storage Package + Config

**Files:**
- Create: `hospital-server/pkg/storage/minio.go`
- Modify: `hospital-server/internal/config/config.go` — add MinIO config
- Modify: `hospital-server/configs/config.yaml` — add minio section

- [ ] **Step 1: Install MinIO SDK**

```bash
cd /home/dttbd/dttbd/hospital/hospital-server
go get github.com/minio/minio-go/v7@latest
```

- [ ] **Step 2: Add MinIO config to config.go**

Add to Config struct:
```go
MinIO MinIOConfig `mapstructure:"minio"`
```

Add MinIOConfig:
```go
type MinIOConfig struct {
	Endpoint  string `mapstructure:"endpoint"`
	AccessKey string `mapstructure:"access_key"`
	SecretKey string `mapstructure:"secret_key"`
	Bucket    string `mapstructure:"bucket"`
	UseSSL    bool   `mapstructure:"use_ssl"`
}
```

- [ ] **Step 3: Add minio section to config.yaml**

```yaml
minio:
  endpoint: localhost:9000
  access_key: minioadmin
  secret_key: minioadmin123
  bucket: hospital
  use_ssl: false
```

- [ ] **Step 4: Create MinIO storage package**

Create `hospital-server/pkg/storage/minio.go`:
```go
package storage

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Storage struct {
	client *minio.Client
	bucket string
}

func NewStorage(endpoint, accessKey, secretKey, bucket string, useSSL bool) (*Storage, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("minio client: %w", err)
	}

	ctx := context.Background()
	exists, err := client.BucketExists(ctx, bucket)
	if err != nil {
		return nil, fmt.Errorf("check bucket: %w", err)
	}
	if !exists {
		if err := client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
			return nil, fmt.Errorf("create bucket: %w", err)
		}
	}

	return &Storage{client: client, bucket: bucket}, nil
}

func (s *Storage) Upload(ctx context.Context, objectName string, reader io.Reader, size int64, contentType string) error {
	_, err := s.client.PutObject(ctx, s.bucket, objectName, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	return err
}

func (s *Storage) PresignedURL(ctx context.Context, objectName string, expires time.Duration) (string, error) {
	url, err := s.client.PresignedGetObject(ctx, s.bucket, objectName, expires, nil)
	if err != nil {
		return "", err
	}
	return url.String(), nil
}

func (s *Storage) Delete(ctx context.Context, objectName string) error {
	return s.client.RemoveObject(ctx, s.bucket, objectName, minio.RemoveObjectOptions{})
}
```

- [ ] **Step 5: Verify build and commit**

```bash
go mod tidy && go build ./cmd/server/
git add pkg/storage/ internal/config/ configs/
git commit -m "feat: add MinIO storage package and config"
```

---

### Task 2: Excel Export Package

**Files:**
- Create: `hospital-server/pkg/export/excel.go`

- [ ] **Step 1: Install excelize**

```bash
go get github.com/xuri/excelize/v2@latest
```

- [ ] **Step 2: Create Excel export helper**

Create `hospital-server/pkg/export/excel.go`:
```go
package export

import (
	"fmt"
	"io"

	"github.com/xuri/excelize/v2"
)

// ExcelWriter helps build Excel files with headers and rows.
type ExcelWriter struct {
	file  *excelize.File
	sheet string
	row   int
}

func NewExcelWriter(sheetName string) *ExcelWriter {
	f := excelize.NewFile()
	f.SetSheetName("Sheet1", sheetName)
	return &ExcelWriter{file: f, sheet: sheetName, row: 1}
}

// WriteHeader writes the header row with bold style.
func (w *ExcelWriter) WriteHeader(headers []string) error {
	style, _ := w.file.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#E2E8F0"}, Pattern: 1},
	})

	for i, h := range headers {
		cell := fmt.Sprintf("%s%d", colName(i), w.row)
		w.file.SetCellValue(w.sheet, cell, h)
		w.file.SetCellStyle(w.sheet, cell, cell, style)
	}
	w.row++
	return nil
}

// WriteRow writes a data row.
func (w *ExcelWriter) WriteRow(values []interface{}) {
	for i, v := range values {
		cell := fmt.Sprintf("%s%d", colName(i), w.row)
		w.file.SetCellValue(w.sheet, cell, v)
	}
	w.row++
}

// WriteTo writes the Excel file to a writer.
func (w *ExcelWriter) WriteTo(writer io.Writer) error {
	return w.file.Write(writer)
}

// Close closes the file.
func (w *ExcelWriter) Close() error {
	return w.file.Close()
}

func colName(index int) string {
	name := ""
	for index >= 0 {
		name = string(rune('A'+index%26)) + name
		index = index/26 - 1
	}
	return name
}
```

- [ ] **Step 3: Verify and commit**

```bash
go mod tidy && go build ./cmd/server/
git add pkg/export/
git commit -m "feat: add Excel export helper using excelize"
```

---

### Task 3: Hospital + Ticket Models

**Files:**
- Create: `hospital-server/internal/models/hospital.go`
- Create: `hospital-server/internal/models/ticket.go`
- Modify: `hospital-server/internal/models/migrate.go`

- [ ] **Step 1: Create hospital models**

Create `hospital-server/internal/models/hospital.go`:
```go
package models

import "github.com/google/uuid"

type Hospital struct {
	BaseModel
	Name            string     `gorm:"size:200;not null" json:"name"`
	Code            string     `gorm:"size:50;uniqueIndex;not null" json:"code"`
	CategoryID      *uuid.UUID `gorm:"type:uuid;index" json:"category_id"`
	Level           string     `gorm:"size:50" json:"level"`
	ProvinceID      *uuid.UUID `gorm:"type:uuid;index" json:"province_id"`
	City            string     `gorm:"size:100" json:"city"`
	Address         string     `gorm:"size:500" json:"address"`
	ContactName     string     `gorm:"size:100" json:"contact_name"`
	ContactPhone    string     `gorm:"size:20" json:"contact_phone"`
	ContactEmail    string     `gorm:"size:255" json:"contact_email"`
	BedCount        int        `gorm:"default:0" json:"bed_count"`
	DepartmentCount int        `gorm:"default:0" json:"department_count"`
	IsSpecialized   bool       `gorm:"default:false" json:"is_specialized"`
	SpecialtyType   string     `gorm:"size:100" json:"specialty_type"`
	OwnerUserID     *uuid.UUID `gorm:"type:uuid;index" json:"owner_user_id"`
	Status          int8       `gorm:"default:1;not null" json:"status"`
	Remark          string     `gorm:"type:text" json:"remark"`

	Category  *HospitalCategory `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Province  *Province         `gorm:"foreignKey:ProvinceID" json:"province,omitempty"`
	OwnerUser *User             `gorm:"foreignKey:OwnerUserID" json:"owner_user,omitempty"`
	Fields    []HospitalField   `gorm:"foreignKey:HospitalID" json:"fields,omitempty"`
}

type HospitalCategory struct {
	BaseModel
	Name      string     `gorm:"size:100;not null" json:"name"`
	Code      string     `gorm:"size:50;uniqueIndex;not null" json:"code"`
	ParentID  *uuid.UUID `gorm:"type:uuid;index" json:"parent_id"`
	SortOrder int        `gorm:"default:0" json:"sort_order"`

	Parent   *HospitalCategory  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children []HospitalCategory `gorm:"foreignKey:ParentID" json:"children,omitempty"`
}

type FieldDefinition struct {
	BaseModel
	FieldKey     string `gorm:"size:100;uniqueIndex;not null" json:"field_key"`
	FieldName    string `gorm:"size:100;not null" json:"field_name"`
	FieldType    string `gorm:"size:50;not null" json:"field_type"` // text, number, select, date
	Options      string `gorm:"type:jsonb" json:"options"`          // JSON array for select type
	IsRequired   bool   `gorm:"default:false" json:"is_required"`
	IsFilterable bool   `gorm:"default:true" json:"is_filterable"`
	SortOrder    int    `gorm:"default:0" json:"sort_order"`
}

type HospitalField struct {
	ID         uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	HospitalID uuid.UUID `gorm:"type:uuid;not null;index" json:"hospital_id"`
	FieldKey   string    `gorm:"size:100;not null" json:"field_key"`
	FieldValue string    `gorm:"type:text" json:"field_value"`
}
```

- [ ] **Step 2: Create ticket models**

Create `hospital-server/internal/models/ticket.go`:
```go
package models

import (
	"time"

	"github.com/google/uuid"
)

type TicketType struct {
	BaseModel
	Name        string `gorm:"size:100;not null" json:"name"`
	Code        string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Icon        string `gorm:"size:100" json:"icon"`
	Description string `gorm:"size:500" json:"description"`
	IsActive    bool   `gorm:"default:true" json:"is_active"`
	SortOrder   int    `gorm:"default:0" json:"sort_order"`
}

type TicketStatus struct {
	BaseModel
	Name       string `gorm:"size:100;not null" json:"name"`
	Code       string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Color      string `gorm:"size:50" json:"color"`
	IsInitial  bool   `gorm:"default:false" json:"is_initial"`
	IsTerminal bool   `gorm:"default:false" json:"is_terminal"`
	SortOrder  int    `gorm:"default:0" json:"sort_order"`
}

type TicketTransition struct {
	BaseModel
	FromStatusID uuid.UUID `gorm:"type:uuid;not null;index" json:"from_status_id"`
	ToStatusID   uuid.UUID `gorm:"type:uuid;not null;index" json:"to_status_id"`
	Name         string    `gorm:"size:100;not null" json:"name"`
	AllowedRoles string    `gorm:"type:jsonb" json:"allowed_roles"` // JSON array of role codes

	FromStatus TicketStatus `gorm:"foreignKey:FromStatusID" json:"from_status,omitempty"`
	ToStatus   TicketStatus `gorm:"foreignKey:ToStatusID" json:"to_status,omitempty"`
}

type Ticket struct {
	BaseModel
	TicketNo   string     `gorm:"size:50;uniqueIndex;not null" json:"ticket_no"`
	Title      string     `gorm:"size:200;not null" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	TypeID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"type_id"`
	StatusID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"status_id"`
	Priority   int8       `gorm:"default:0" json:"priority"`
	HospitalID *uuid.UUID `gorm:"type:uuid;index" json:"hospital_id"`
	CreatorID  uuid.UUID  `gorm:"type:uuid;not null;index" json:"creator_id"`
	AssigneeID *uuid.UUID `gorm:"type:uuid;index" json:"assignee_id"`
	ProvinceID *uuid.UUID `gorm:"type:uuid;index" json:"province_id"`
	RegionID   *uuid.UUID `gorm:"type:uuid;index" json:"region_id"`
	ResolvedAt *time.Time `json:"resolved_at"`

	Type       TicketType     `gorm:"foreignKey:TypeID" json:"type,omitempty"`
	Status     TicketStatus   `gorm:"foreignKey:StatusID" json:"status,omitempty"`
	Hospital   *Hospital      `gorm:"foreignKey:HospitalID" json:"hospital,omitempty"`
	Creator    User           `gorm:"foreignKey:CreatorID" json:"creator,omitempty"`
	Assignee   *User          `gorm:"foreignKey:AssigneeID" json:"assignee,omitempty"`
	Province   *Province      `gorm:"foreignKey:ProvinceID" json:"province,omitempty"`
	Comments   []TicketComment    `gorm:"foreignKey:TicketID" json:"comments,omitempty"`
	Attachments []TicketAttachment `gorm:"foreignKey:TicketID" json:"attachments,omitempty"`
	Logs       []TicketLog    `gorm:"foreignKey:TicketID" json:"logs,omitempty"`
}

type TicketComment struct {
	BaseModel
	TicketID   uuid.UUID `gorm:"type:uuid;not null;index" json:"ticket_id"`
	UserID     uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Content    string    `gorm:"type:text;not null" json:"content"`
	IsInternal bool      `gorm:"default:false" json:"is_internal"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type TicketAttachment struct {
	BaseModel
	TicketID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"ticket_id"`
	CommentID  *uuid.UUID `gorm:"type:uuid;index" json:"comment_id"`
	FileName   string     `gorm:"size:255;not null" json:"file_name"`
	FileURL    string     `gorm:"size:500;not null" json:"file_url"`
	FileSize   int64      `json:"file_size"`
	FileType   string     `gorm:"size:100" json:"file_type"`
	UploaderID uuid.UUID  `gorm:"type:uuid;not null" json:"uploader_id"`

	Uploader User `gorm:"foreignKey:UploaderID" json:"uploader,omitempty"`
}

type TicketLog struct {
	BaseModel
	TicketID   uuid.UUID `gorm:"type:uuid;not null;index" json:"ticket_id"`
	UserID     uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Action     string    `gorm:"size:50;not null" json:"action"` // create, assign, transition, comment
	FromStatus string    `gorm:"size:50" json:"from_status"`
	ToStatus   string    `gorm:"size:50" json:"to_status"`
	Detail     string    `gorm:"type:jsonb" json:"detail"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
```

- [ ] **Step 3: Register all models in migrate.go**

Add to AutoMigrate: Hospital, HospitalCategory, FieldDefinition, HospitalField, TicketType, TicketStatus, TicketTransition, Ticket, TicketComment, TicketAttachment, TicketLog

- [ ] **Step 4: Verify and commit**

```bash
go mod tidy && go build ./cmd/server/
git add internal/models/
git commit -m "feat: add Hospital and Ticket domain models"
```

---

### Task 4: Hospital DTOs + Repository + Service + Handler

**Files:**
- Create: `hospital-server/internal/dto/hospital.go`
- Create: `hospital-server/internal/repository/hospital.go`
- Create: `hospital-server/internal/service/hospital.go`
- Create: `hospital-server/internal/handler/admin/hospital.go`

- [ ] **Step 1: Create hospital DTOs**

Key DTOs:
- `CreateHospitalReq` — all hospital fields + `Fields map[string]string` for dynamic fields
- `UpdateHospitalReq` — pointer fields for partial update + `Fields map[string]string`
- `HospitalFilterQuery` — extends PageQuery with: province_id, region_id, category_id, level, is_specialized, owner_user_id, city, status, and `Filters map[string]string` for dynamic field filtering
- `HospitalSummaryQuery` — group_by (province/region/category/specialty_type), with optional filters
- `HospitalSummaryItem` — GroupKey, GroupName, Count
- CRUD DTOs for HospitalCategory and FieldDefinition

- [ ] **Step 2: Create hospital repository**

Key methods:
- `List(q *HospitalFilterQuery) ([]Hospital, int64, error)` — builds dynamic WHERE clauses from all filter fields + joins hospital_fields for dynamic field filtering. Preloads Category, Province, OwnerUser, Fields.
- `GetByID(id) (*Hospital, error)` — full preload
- `Create/Update/Delete` — standard GORM
- `SaveFields(hospitalID, fields map[string]string)` — upsert hospital_fields
- `Summary(q *HospitalSummaryQuery) ([]HospitalSummaryItem, error)` — GROUP BY query with count
- Category CRUD, FieldDefinition CRUD

- [ ] **Step 3: Create hospital service**

Wraps repo. Create/Update also saves dynamic fields. Summary delegates to repo. Export builds Excel from filtered list.

Key method `ExportExcel(q *HospitalFilterQuery) (*ExcelWriter, error)`:
- Gets field definitions for headers
- Queries all matching hospitals (no pagination)
- Writes headers + rows including dynamic field values
- Returns ExcelWriter

- [ ] **Step 4: Create hospital handler**

Handlers:
- `List` — bind HospitalFilterQuery, call service
- `Get/Create/Update/Delete` — standard
- `Summary` — bind SummaryQuery, return chart-ready data
- `Export` — call service.ExportExcel, set Content-Disposition header, write to response
- `ListCategories/CreateCategory/UpdateCategory/DeleteCategory`
- `ListFieldDefinitions/CreateFieldDefinition/UpdateFieldDefinition/DeleteFieldDefinition`

- [ ] **Step 5: Verify and commit**

```bash
go mod tidy && go build ./cmd/server/
git add internal/dto/hospital.go internal/repository/hospital.go internal/service/hospital.go internal/handler/admin/hospital.go
git commit -m "feat: add hospital CRUD with dynamic fields, filtering, summary, and Excel export"
```

---

### Task 5: Ticket Config (Type/Status/Transition) CRUD

**Files:**
- Create: `hospital-server/internal/dto/ticket.go`
- Create: `hospital-server/internal/repository/ticket.go` (config part)
- Create: `hospital-server/internal/service/ticket.go` (config part)
- Create: `hospital-server/internal/handler/admin/ticket_config.go`

- [ ] **Step 1: Create ticket DTOs**

DTOs for TicketType, TicketStatus, TicketTransition CRUD. Also DTOs for Ticket CRUD:
- `CreateTicketReq` — title, description, type_id, hospital_id, assignee_id, priority
- `TicketFilterQuery` — extends PageQuery: type_id, status_id, assignee_id, creator_id, hospital_id, province_id, region_id, priority, date_from, date_to
- `TransitionTicketReq` — to_status_id
- `AssignTicketReq` — assignee_id
- `CreateCommentReq` — content, is_internal

- [ ] **Step 2: Create ticket repository**

Config CRUD methods for TicketType, TicketStatus, TicketTransition (standard pattern).
Also: `GetTransitions(fromStatusID uuid.UUID) ([]TicketTransition, error)` — returns allowed transitions from a status.

Seed default ticket types and statuses method.

- [ ] **Step 3: Create ticket config service + handler**

Standard CRUD pattern for types/statuses/transitions. Handler at `ticket_config.go`.

- [ ] **Step 4: Verify and commit**

```bash
go mod tidy && go build ./cmd/server/
git add internal/dto/ticket.go internal/repository/ticket.go internal/service/ticket.go internal/handler/admin/ticket_config.go
git commit -m "feat: add ticket type/status/transition config CRUD"
```

---

### Task 6: Ticket CRUD + State Machine + Comments + Attachments

**Files:**
- Modify: `hospital-server/internal/repository/ticket.go` — add ticket CRUD methods
- Modify: `hospital-server/internal/service/ticket.go` — add ticket logic + state machine
- Create: `hospital-server/internal/handler/admin/ticket.go`

- [ ] **Step 1: Add ticket repository methods**

- `ListTickets(q *TicketFilterQuery) ([]Ticket, int64, error)` — multi-filter, preload Type/Status/Creator/Assignee/Hospital
- `GetTicket(id) (*Ticket, error)` — full preload including Comments (with User), Attachments, Logs
- `CreateTicket(ticket *Ticket) error`
- `UpdateTicket(ticket *Ticket) error`
- `GenerateTicketNo() string` — format: TK-YYYYMMDD-XXXX (sequential)
- `CreateComment(comment *TicketComment) error`
- `CreateAttachment(attachment *TicketAttachment) error`
- `CreateLog(log *TicketLog) error`

- [ ] **Step 2: Add ticket service with state machine**

Key methods:
- `Create(creatorID, req)` — generate ticket_no, set initial status (is_initial=true), create ticket + log
- `Transition(ticketID, userID, toStatusID)` — validate transition exists (from current status to target), check allowed_roles, update status, create log. If target is_terminal, set resolved_at.
- `Assign(ticketID, userID, assigneeID)` — update assignee, create log
- `AddComment(ticketID, userID, req)` — create comment + log
- `AddAttachment(ticketID, userID, attachment)` — create attachment record
- `List/Get` — delegate to repo

- [ ] **Step 3: Create ticket handler**

- `ListTickets` — bind TicketFilterQuery
- `GetTicket` — by ID, full detail
- `CreateTicket` — bind req, get creator from context
- `TransitionTicket` — PUT /tickets/:id/transition
- `AssignTicket` — PUT /tickets/:id/assign
- `AddComment` — POST /tickets/:id/comments
- `UploadAttachment` — POST /tickets/:id/attachments (multipart form, upload to MinIO, save record)

- [ ] **Step 4: Verify and commit**

```bash
go mod tidy && go build ./cmd/server/
git add internal/repository/ticket.go internal/service/ticket.go internal/handler/admin/ticket.go
git commit -m "feat: add ticket CRUD with state machine, comments, and attachments"
```

---

### Task 7: File Upload Handler + Seed Ticket Defaults

**Files:**
- Create: `hospital-server/internal/handler/admin/upload.go`
- Modify: `hospital-server/cmd/server/main.go` — init MinIO, seed ticket defaults

- [ ] **Step 1: Create upload handler**

Generic file upload endpoint:
- Accept multipart form file
- Generate unique object name (uuid + extension)
- Upload to MinIO via storage package
- Return file URL, name, size, type

- [ ] **Step 2: Update main.go**

- Init MinIO storage from config
- Pass storage to router.Setup
- Add seed function for default ticket types (故障处理/功能需求/市场反馈/客户之声/内部支持/售前调研) and statuses (open/in_progress/resolved/suspended/reassigned/closed) with transitions

- [ ] **Step 3: Verify and commit**

```bash
go mod tidy && go build ./cmd/server/
git add internal/handler/admin/upload.go cmd/server/main.go
git commit -m "feat: add file upload handler, MinIO init, and seed ticket defaults"
```

---

### Task 8: Wire All Phase 2 Routes

**Files:**
- Modify: `hospital-server/internal/router/router.go`

- [ ] **Step 1: Add all new routes**

Update router.Setup to accept `*storage.Storage` parameter. Wire:
- Hospital CRUD: `/hospitals`, `/hospitals/:id`, `/hospitals/summary`, `/hospitals/export`
- Hospital categories: `/hospital-categories`
- Field definitions: `/field-definitions`
- Ticket CRUD: `/tickets`, `/tickets/:id`, `/tickets/:id/transition`, `/tickets/:id/assign`, `/tickets/:id/comments`, `/tickets/:id/attachments`
- Ticket config: `/ticket-types`, `/ticket-statuses`, `/ticket-transitions`
- File upload: `/api/common/v1/upload`, `/api/common/v1/files/:id`

- [ ] **Step 2: Verify and commit**

```bash
go mod tidy && go build ./cmd/server/
git add internal/router/router.go
git commit -m "feat: wire Phase 2 routes — hospital, ticket, file upload"
```

---

### Task 9: Phase 2 Integration Tests

**Files:**
- Create: `hospital-server/tests/integration/hospital_test.go`
- Create: `hospital-server/tests/integration/ticket_test.go`
- Modify: `hospital-server/tests/integration/setup_test.go` — update setup for Phase 2

- [ ] **Step 1: Update test setup**

Add MinIO init (or skip if not available), seed ticket defaults.

- [ ] **Step 2: Hospital integration tests**

- Create category → create hospital → list with filters → get by ID → update → summary → delete

- [ ] **Step 3: Ticket integration tests**

- Create ticket → transition to in_progress → add comment → assign → transition to resolved → verify logs

- [ ] **Step 4: Run and verify**

```bash
go test ./tests/integration/ -v -count=1
```

- [ ] **Step 5: Commit**

```bash
git add tests/
git commit -m "test: add Phase 2 integration tests for hospital and ticket CRUD"
```
