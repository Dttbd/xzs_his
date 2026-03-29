# HIS Implementation Roadmap

This project is broken into 6 phases. Each phase produces working, testable software and has its own detailed plan.

## Phases

| Phase | Name | Scope | Status | Depends On |
|-------|------|-------|--------|------------|
| 1 | Backend Foundation | Project scaffold, Docker Compose, DB models/migrations, config, auth (JWT), user CRUD, RBAC (Casbin), organization CRUD | ✅ Complete | — |
| 2 | Core Business Backend | Hospital CRUD (dynamic fields, filtering, export), Ticket system (state machine, comments, attachments), file upload (MinIO) | ✅ Complete | Phase 1 |
| 3 | Supporting Backend | Bulletin system, notification system (in-app + WeChat push), report aggregation APIs, Asynq worker setup | ✅ Complete | Phase 2 |
| 4 | Frontend Foundation | Monorepo scaffold (pnpm + Vite), shared package (API client, components, theme system), admin layout (sidebar/topbar/responsive), auth flow | ✅ Complete | Phase 1 |
| 5 | Admin SPA | Dashboard, hospital pages, ticket pages, bulletin pages, report pages, user/role pages, system settings pages | ✅ Complete | Phase 3 + 4 |
| 6 | Portal SPA | Customer portal layout, ticket submit/view/comment, profile page | ✅ Complete | Phase 3 + 4 |

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

### Phase 4 — Frontend Foundation (2026-03-29)
- 6 tasks, 4 commits
- pnpm monorepo: shared + admin + portal packages
- React 19 + TypeScript + Vite + Tailwind CSS v4
- Theme system: dark/light/system with CSS variables, ThemeProvider, ThemeToggle
- Shared API client: Axios + JWT interceptor + Zustand auth store (persist)
- Admin layout: responsive sidebar (220px/64px/drawer), topbar, mobile bottom nav
- React Router with auth guard, login page, 7 placeholder routes
- All Lucide icons, zero shadows, modern flat design
- Production build: 362KB JS, 12.7KB CSS

## Plan Files

- `2026-03-29-his-phase1-backend-foundation.md` — Phase 1 (completed)
- `2026-03-29-his-phase2-core-business.md` — Phase 2 (completed)
- `2026-03-29-his-phase3-supporting-backend.md` — Phase 3 (completed)
- `2026-03-29-his-phase4-frontend-foundation.md` — Phase 4 (completed)
- `2026-03-29-his-phase5-admin-spa.md` — Phase 5 (completed)

### Phase 5 — Admin SPA (2026-03-29)
- 7 tasks, 7+ commits
- Shared: 8 API modules (70+ API functions), 6 reusable components (DataTable, Pagination, StatusBadge, Loading, Empty, ConfirmDialog)
- Dashboard: stats cards, ECharts trend/distribution charts, recent tickets
- Hospital: list with filters + form + detail + summary charts + Excel export
- Ticket: list with tabs + create dialog + detail with timeline/comments/attachments + state machine transitions
- Bulletin: list + form + detail + publish workflow
- Notification: topbar dropdown with real-time unread count + mark read
- Reports: hospital stats, ticket stats, ticket trend, sales performance (all with ECharts)
- User management: list + create/edit form + role management
- Settings: org structure (region/province), ticket config (type/status/transition), field definitions
- Production build: 1.66MB JS (gzip 521KB, includes ECharts)

### Phase 6 — Portal SPA (2026-03-29)
- 3 tasks, 3 commits
- Portal layout: simple topbar + content, mobile-first
- Login page with portal-specific auth endpoint
- Ticket pages: card-based list, create dialog, detail with comment timeline
- Profile page with view/edit toggle
- Shared portal API module added to @hospital/shared
- Portal build: 357KB JS (gzip 115KB)

## Final Stats
- **Total commits:** 54
- **Backend:** 71 Go files, ~6500 lines
- **Frontend:** 71 TS/TSX files across 3 packages
- **Tests:** 15 integration + 4 unit, all passing
- **All 6 phases complete**
