# HIS Implementation Roadmap

This project is broken into 6 phases. Each phase produces working, testable software and has its own detailed plan.

## Phases

| Phase | Name | Scope | Depends On |
|-------|------|-------|------------|
| 1 | Backend Foundation | Project scaffold, Docker Compose, DB models/migrations, config, auth (JWT + WeChat SSO stub), user CRUD, RBAC (Casbin), organization (regions/provinces) CRUD | — |
| 2 | Core Business Backend | Hospital CRUD (with dynamic fields, filtering, export), Ticket system (state machine, comments, attachments, logs), file upload (MinIO) | Phase 1 |
| 3 | Supporting Backend | Bulletin system, notification system (in-app + WeChat push), report aggregation APIs, Asynq worker setup | Phase 2 |
| 4 | Frontend Foundation | Monorepo scaffold (pnpm + Vite), shared package (API client, components, theme system), admin layout (sidebar/topbar/responsive), auth flow | Phase 1 |
| 5 | Admin SPA | Dashboard, hospital pages, ticket pages, bulletin pages, report pages, user/role pages, system settings pages | Phase 3 + 4 |
| 6 | Portal SPA | Customer portal layout, ticket submit/view/comment, profile page | Phase 3 + 4 |

## Plan Files

- `2026-03-29-his-phase1-backend-foundation.md` — Phase 1
- Subsequent phases will be planned after Phase 1 is complete
