# HIS Implementation Roadmap

This project is broken into 6 phases. Each phase produces working, testable software and has its own detailed plan.

## Phases

| Phase | Name | Scope | Status | Depends On |
|-------|------|-------|--------|------------|
| 1 | Backend Foundation | Project scaffold, Docker Compose, DB models/migrations, config, auth (JWT), user CRUD, RBAC (Casbin), organization CRUD | ✅ Complete | — |
| 2 | Core Business Backend | Hospital CRUD (dynamic fields, filtering, export), Ticket system (state machine, comments, attachments), file upload (MinIO) | ✅ Complete | Phase 1 |
| 3 | Supporting Backend | Bulletin system, notification system (in-app + WeChat push), report aggregation APIs, Asynq worker setup | ✅ Complete | Phase 2 |
| 4 | Frontend Foundation | Monorepo scaffold (pnpm + Vite), shared package (API client, components, theme system), admin layout (sidebar/topbar/responsive), auth flow | ⏳ Next | Phase 1 |
| 5 | Admin SPA | Dashboard, hospital pages, ticket pages, bulletin pages, report pages, user/role pages, system settings pages | Pending | Phase 3 + 4 |
| 6 | Portal SPA | Customer portal layout, ticket submit/view/comment, profile page | Pending | Phase 3 + 4 |

## Progress Summary

### Phase 1 — Backend Foundation (2026-03-29)
- 14 tasks, 15 commits
- Go scaffold, Viper config, Docker Compose (PG/Redis/MinIO)
- JWT auth + Casbin RBAC
- User/Role/Region/Province CRUD
- 8 default roles seeded, admin user (admin/admin123)
- 4 unit tests + 5 integration tests

### Phase 2 — Core Business Backend (2026-03-29)
- 9 tasks, 9 commits
- MinIO storage wrapper + Excel export (excelize)
- Hospital CRUD with dynamic fields, multi-filter, summary, Excel export
- Hospital categories (tree), field definitions
- Ticket system: 6 types, 6 statuses, 7 transitions (all configurable)
- State machine validation, comments, attachments, operation logs
- File upload endpoint
- 3 additional integration tests (hospital + ticket workflow + invalid transition)
- Bug fix: GORM Save() with preloaded associations → use Select().Updates()
- Bug fix: Casbin v2→v3 compatibility

### Phase 3 — Supporting Backend (2026-03-29)
- 6 tasks, 7 commits
- Bulletin system with scope-based visibility (region/province)
- Notification system with batch send, read/unread tracking
- Report aggregation: overview, hospital/ticket stats, ticket trend, sales stats
- Asynq async worker (notification task handler + WeChat stub)
- Asynq client integrated into ticket workflow (create/transition/assign/comment auto-notify)
- Import cycle fix: extracted `internal/queue` package from `internal/worker`
- 3 new integration tests (bulletin, notification, report)

## Plan Files

- `2026-03-29-his-phase1-backend-foundation.md` — Phase 1 (completed)
- `2026-03-29-his-phase2-core-business.md` — Phase 2 (completed)
- `2026-03-29-his-phase3-supporting-backend.md` — Phase 3 (completed)
- Phase 4+ plans to be written when starting each phase
