# Phase 3: Supporting Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build bulletin (announcement) system, notification system (in-app + WeChat push stub), report aggregation APIs, and Asynq async worker.

**Architecture:** Extends Phase 1+2. New models/repos/services/handlers for bulletin, notification, report modules. Asynq worker as separate entry point.

**Tech Stack:** Same as Phase 1+2 + Asynq (Redis-based async task queue)

---

### Task 1: Bulletin Models + CRUD

**Files:**
- Create: `internal/models/bulletin.go`
- Create: `internal/dto/bulletin.go`
- Create: `internal/repository/bulletin.go`
- Create: `internal/service/bulletin.go`
- Create: `internal/handler/admin/bulletin.go`
- Modify: `internal/models/migrate.go`

Bulletin model:
```go
type Bulletin struct {
    BaseModel
    Title       string     `gorm:"size:200;not null" json:"title"`
    Content     string     `gorm:"type:text" json:"content"`
    ScopeType   string     `gorm:"size:20;not null" json:"scope_type"` // region / province
    ScopeID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"scope_id"`
    AuthorID    uuid.UUID  `gorm:"type:uuid;not null" json:"author_id"`
    IsPinned    bool       `gorm:"default:false" json:"is_pinned"`
    PublishedAt *time.Time `json:"published_at"`
    ExpiresAt   *time.Time `json:"expires_at"`
    Status      int8       `gorm:"default:0;not null" json:"status"` // 0=draft, 1=published, 2=archived

    Author User `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
}
```

DTOs: CreateBulletinReq, UpdateBulletinReq, BulletinFilterQuery (scope_type, scope_id, status, keyword, pagination)

Repository: List (filter by scope, user's region/province visibility), Get, Create, Update, Delete. List should support "visible to user" filtering — user sees bulletins where scope matches their region_id or province_id.

Service: Create sets author_id, Publish sets published_at + status=1, standard CRUD.

Handler: List, Get, Create, Update, Delete, Publish (PUT /:id/publish).

Verify build, commit: `"feat: add bulletin (announcement) system with scope-based visibility"`

---

### Task 2: Notification Models + CRUD

**Files:**
- Create: `internal/models/notification.go`
- Create: `internal/dto/notification.go`
- Create: `internal/repository/notification.go`
- Create: `internal/service/notification.go`
- Create: `internal/handler/admin/notification.go`
- Modify: `internal/models/migrate.go`

Notification model:
```go
type Notification struct {
    BaseModel
    UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
    Title     string    `gorm:"size:200;not null" json:"title"`
    Content   string    `gorm:"type:text" json:"content"`
    Type      string    `gorm:"size:50;not null" json:"type"` // ticket, bulletin, system
    RefType   string    `gorm:"size:50" json:"ref_type"`
    RefID     *uuid.UUID `gorm:"type:uuid" json:"ref_id"`
    IsRead    bool      `gorm:"default:false;index" json:"is_read"`
}
```

DTOs: NotificationFilterQuery (type, is_read, pagination)

Repository: ListByUser (paginated, filter by type/is_read), MarkRead, MarkAllRead, UnreadCount, Create, BatchCreate (for sending to multiple users).

Service: List, MarkRead, MarkAllRead, UnreadCount. SendNotification(userIDs []uuid.UUID, title, content, type, refType string, refID *uuid.UUID) — batch creates notifications for multiple users.

Handler: List (current user's notifications), MarkRead (PUT /:id/read), MarkAllRead (PUT /read-all), UnreadCount (GET /unread-count).

Verify build, commit: `"feat: add notification system with batch send and read tracking"`

---

### Task 3: Report Aggregation APIs

**Files:**
- Create: `internal/dto/report.go`
- Create: `internal/repository/report.go`
- Create: `internal/service/report.go`
- Create: `internal/handler/admin/report.go`

Report DTOs:
```go
type ReportQuery struct {
    DateFrom   string     `form:"date_from"`   // YYYY-MM-DD
    DateTo     string     `form:"date_to"`
    RegionID   *uuid.UUID `form:"region_id"`
    ProvinceID *uuid.UUID `form:"province_id"`
}

type OverviewStats struct {
    HospitalCount    int64 `json:"hospital_count"`
    TicketTotal      int64 `json:"ticket_total"`
    TicketPending    int64 `json:"ticket_pending"`
    TicketResolved   int64 `json:"ticket_resolved"`
    AvgResponseHours float64 `json:"avg_response_hours"`
    MonthNewHospitals int64 `json:"month_new_hospitals"`
}

type ChartDataItem struct {
    Label string  `json:"label"`
    Value float64 `json:"value"`
}
```

Repository — raw SQL aggregation queries:
- `Overview(q)` — counts from hospitals + tickets
- `HospitalStats(q, groupBy)` — hospital counts by province/region/category/specialty
- `TicketStats(q, groupBy)` — ticket counts by type/status/assignee, avg response time
- `TicketTrend(q, interval)` — ticket creation count by day/week/month
- `SalesStats(q)` — per-user ticket counts (resolved, avg time)

Service: thin wrappers. ExportReport(q, reportType) builds Excel.

Handler: Overview (GET /overview), HospitalStats (GET /hospital-stats), TicketStats (GET /ticket-stats), TicketTrend (GET /ticket-trend), SalesStats (GET /sales-stats), ExportReport (GET /export).

Verify build, commit: `"feat: add report aggregation APIs with overview, stats, and trends"`

---

### Task 4: Asynq Worker Setup

**Files:**
- Create: `cmd/worker/main.go`
- Create: `internal/worker/tasks.go`
- Create: `internal/worker/notification.go`
- Modify: `internal/config/config.go` — ensure Redis config works for Asynq
- Modify: `deploy/Dockerfile` — add worker build target
- Modify: `deploy/docker-compose.yml` — add worker service

Worker entry point (`cmd/worker/main.go`): connects to Redis, registers task handlers, starts Asynq server.

Task definitions (`internal/worker/tasks.go`):
```go
const (
    TaskSendNotification = "notification:send"
    TaskSendWechatMsg    = "wechat:send"
)

type NotificationPayload struct {
    UserIDs []uuid.UUID `json:"user_ids"`
    Title   string      `json:"title"`
    Content string      `json:"content"`
    Type    string      `json:"type"`
    RefType string      `json:"ref_type"`
    RefID   *uuid.UUID  `json:"ref_id"`
}
```

Notification handler (`internal/worker/notification.go`): processes TaskSendNotification by batch creating notifications in DB. TaskSendWechatMsg is a stub (logs "would send WeChat message").

Add EnqueueNotification helper that services can call to dispatch async notifications.

Install Asynq: `go get github.com/hibiken/asynq@latest`

Verify build for both targets: `go build ./cmd/server/ && go build ./cmd/worker/`

Commit: `"feat: add Asynq worker with notification task handler"`

---

### Task 5: Wire Phase 3 Routes + Integrate Notifications

**Files:**
- Modify: `internal/router/router.go` — add bulletin, notification, report routes
- Modify: `internal/service/ticket.go` — enqueue notifications on ticket events
- Modify: `cmd/server/main.go` — init Asynq client, pass to router

Wire routes:
```
/api/admin/v1/bulletins, /bulletins/:id, /bulletins/:id/publish
/api/admin/v1/notifications, /notifications/:id/read, /notifications/read-all, /notifications/unread-count
/api/admin/v1/reports/overview, /reports/hospital-stats, /reports/ticket-stats, /reports/ticket-trend, /reports/sales-stats, /reports/export
```

Integrate: TicketService.Create/Transition/Assign/AddComment should enqueue notification tasks (if Asynq client available).

Verify build, commit: `"feat: wire Phase 3 routes and integrate async notifications"`

---

### Task 6: Phase 3 Integration Tests

**Files:**
- Create: `tests/integration/bulletin_test.go`
- Create: `tests/integration/notification_test.go`
- Create: `tests/integration/report_test.go`
- Modify: `tests/integration/setup_test.go`

Tests:
- Bulletin: create, list (scope filtering), publish, update, delete
- Notification: send, list, mark read, mark all read, unread count
- Report: overview stats, hospital stats, ticket stats

Verify all tests pass, commit: `"test: add Phase 3 integration tests for bulletin, notification, and report"`
