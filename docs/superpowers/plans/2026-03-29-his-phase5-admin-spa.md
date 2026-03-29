# Phase 5: Admin SPA Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build all admin SPA pages — dashboard, hospital management, ticket management, bulletins, reports, user/role management, and system settings.

**Architecture:** Each page module follows: API hooks (TanStack Query) → page components (React). Shared components in @hospital/shared. All data fetching via TanStack Query.

**Tech Stack:** React 19, TypeScript, TanStack Query, TanStack Table, React Hook Form, Zustand, ECharts, Lucide React

---

### Task 1: Shared API Hooks + Common Components

**Files:**
- `packages/shared/src/api/hospitals.ts` — hospital API functions
- `packages/shared/src/api/tickets.ts` — ticket API functions
- `packages/shared/src/api/organizations.ts` — region/province API
- `packages/shared/src/api/users.ts` — user/role API
- `packages/shared/src/api/bulletins.ts` — bulletin API
- `packages/shared/src/api/notifications.ts` — notification API
- `packages/shared/src/api/reports.ts` — report API
- `packages/shared/src/api/upload.ts` — file upload API
- `packages/shared/src/components/data-table.tsx` — reusable table component
- `packages/shared/src/components/pagination.tsx` — pagination controls
- `packages/shared/src/components/status-badge.tsx` — ticket status badge
- `packages/shared/src/components/loading.tsx` — loading spinner
- `packages/shared/src/components/empty.tsx` — empty state
- `packages/shared/src/components/confirm-dialog.tsx` — delete confirmation
- Update `packages/shared/src/index.ts` — export all

API function pattern:
```typescript
export async function listHospitals(params: HospitalFilterParams) {
  const { data } = await apiClient.get<ApiResponse<PageResult<Hospital>>>('/api/admin/v1/hospitals', { params })
  return data.data!
}
```

DataTable: wraps a styled HTML table with sort indicators, responsive (table on desktop, card list on mobile). Uses Tailwind classes matching design spec.

StatusBadge: pill-shaped badge using status colors from CSS variables.

Commit: `"feat: add shared API hooks and reusable UI components"`

---

### Task 2: Dashboard Page

**Files:**
- `packages/admin/src/pages/dashboard/index.tsx` — full dashboard
- `packages/admin/src/pages/dashboard/stats-cards.tsx` — 4 stat cards
- `packages/admin/src/pages/dashboard/ticket-trend-chart.tsx` — bar chart
- `packages/admin/src/pages/dashboard/type-distribution-chart.tsx` — donut chart
- `packages/admin/src/pages/dashboard/recent-tickets.tsx` — recent ticket list

Install ECharts: `pnpm add -F @hospital/admin echarts echarts-for-react`

Dashboard layout:
1. Greeting: "早上好，{name}" + pending count
2. 4 stat cards (2x2 on mobile, 4x1 on desktop): 医院总数, 待处理工单, 本月完结, 平均响应
3. Chart row: ticket trend bar chart (2/3) + type distribution donut (1/3)
4. Recent tickets table/card list

All data from report API (`/reports/overview`, `/reports/ticket-trend`, `/reports/ticket-stats`).

ECharts config: flat style, use accent color for bars, match dark/light theme.

Commit: `"feat: add dashboard page with stats, charts, and recent tickets"`

---

### Task 3: Hospital Pages

**Files:**
- `packages/admin/src/pages/hospital/index.tsx` — hospital list page
- `packages/admin/src/pages/hospital/hospital-form.tsx` — create/edit form (dialog or page)
- `packages/admin/src/pages/hospital/hospital-detail.tsx` — detail view
- `packages/admin/src/pages/hospital/hospital-summary.tsx` — summary charts page
- Update router to add sub-routes

Hospital list:
- Filter bar: keyword, province, category, level, status (collapsible on mobile → Sheet)
- DataTable with columns: name, code, level, province, contact, owner, status, actions
- Mobile: card list mode
- Actions: view, edit, delete
- Top buttons: "新建医院" + "导出Excel" + "汇总统计"

Hospital form: React Hook Form with all fields + dynamic field support.

Hospital summary: ECharts charts (bar/pie) grouped by province/region/category/specialty.

Commit: `"feat: add hospital list, form, detail, and summary pages"`

---

### Task 4: Ticket Pages

**Files:**
- `packages/admin/src/pages/ticket/index.tsx` — ticket list
- `packages/admin/src/pages/ticket/ticket-create.tsx` — create ticket dialog/page
- `packages/admin/src/pages/ticket/ticket-detail.tsx` — detail with timeline
- `packages/admin/src/pages/ticket/ticket-timeline.tsx` — comment/log timeline
- Update router

Ticket list:
- Tabs: 全部 / 我创建的 / 我处理的
- Filters: type, status, assignee, date range
- DataTable: ticket_no, title, type badge, status badge, creator, assignee, time
- Mobile: card list

Ticket detail:
- Header: ticket_no + status badge + action buttons (transition/assign)
- Info cards: type, hospital, creator, assignee, priority, created_at
- Timeline: comments + logs interleaved, ordered by time
  - Comments: avatar + name + time + content + attachments
  - Logs: system action entries (created, transitioned, assigned)
- Bottom: comment input (textarea + "内部备注" toggle + send button)
- Attachments: file upload button, display as chips

Commit: `"feat: add ticket list, create, detail with timeline and state transitions"`

---

### Task 5: Bulletin + Notification Pages

**Files:**
- `packages/admin/src/pages/bulletin/index.tsx` — bulletin list
- `packages/admin/src/pages/bulletin/bulletin-form.tsx` — create/edit
- `packages/admin/src/pages/bulletin/bulletin-detail.tsx` — detail view
- Update topbar notification bell with real data
- `packages/admin/src/pages/notification/index.tsx` — notification list page (optional route)
- Update router

Bulletin list:
- Filter: scope (大区/省), status (draft/published/archived)
- Table: title, scope, author, status, published_at, actions
- Publish button (for drafts)

Bulletin form: title, content (textarea or rich text), scope_type select + scope_id select, is_pinned, expires_at.

Notification: topbar bell shows unread count from API. Click → dropdown with recent notifications. "全部已读" button. Link to full notification page.

Commit: `"feat: add bulletin pages and notification dropdown in topbar"`

---

### Task 6: Report Pages

**Files:**
- `packages/admin/src/pages/report/index.tsx` — report center layout
- `packages/admin/src/pages/report/hospital-stats.tsx` — hospital statistics
- `packages/admin/src/pages/report/ticket-stats.tsx` — ticket statistics
- `packages/admin/src/pages/report/sales-stats.tsx` — sales performance
- Update router

Report center with tabs or sub-nav: 医院统计 / 工单统计 / 销售业绩

Each tab:
- Filter bar: date range, region, province
- Charts (ECharts): bar + pie + trend line
- Summary table below charts
- Export button

Commit: `"feat: add report pages with ECharts visualizations"`

---

### Task 7: User + System Settings Pages

**Files:**
- `packages/admin/src/pages/user/index.tsx` — user list
- `packages/admin/src/pages/user/user-form.tsx` — create/edit user
- `packages/admin/src/pages/user/role-list.tsx` — role management
- `packages/admin/src/pages/settings/index.tsx` — settings layout
- `packages/admin/src/pages/settings/org-settings.tsx` — region/province management
- `packages/admin/src/pages/settings/ticket-config.tsx` — ticket type/status/transition config
- `packages/admin/src/pages/settings/field-config.tsx` — custom field definitions
- Update router with sub-routes

User list: table with username, real_name, region, province, roles, status, actions.
User form: fields + role multi-select.

Settings: tab navigation between 组织架构 / 工单配置 / 字段配置.
Each sub-page: CRUD table with inline add/edit/delete.

Commit: `"feat: add user management and system settings pages"`
