# Phase 6: Portal SPA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the customer portal SPA — login, ticket submit/view/comment, profile page. Simpler layout than admin, focused on ticket interaction.

**Architecture:** Reuses @hospital/shared API client and components. Separate Vite SPA at packages/portal with its own layout/router.

**Tech Stack:** Same as admin — React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, Zustand, Lucide React

---

### Task 1: Portal Layout + Router + Login

**Files:**
- `packages/portal/src/index.css` — import shared globals
- `packages/portal/src/App.tsx` — providers + router
- `packages/portal/src/layouts/portal-layout.tsx` — simple layout (topbar + content)
- `packages/portal/src/layouts/portal-topbar.tsx` — minimal topbar
- `packages/portal/src/router/index.tsx` — routes
- `packages/portal/src/router/auth-guard.tsx` — portal auth guard
- `packages/portal/src/pages/login/index.tsx` — portal login page

Portal layout: simpler than admin — just a topbar + content area, no sidebar. Mobile-friendly by default.

Topbar: logo "HIS 客户门户" + nav links (我的工单 / 个人信息) + ThemeToggle + logout.

Login page: same style as admin but with "客户门户" branding. Uses portal auth endpoint `/api/portal/auth/login`.

Note: Portal uses same shared auth store but different login API endpoint. Create a portal-specific login function or parameterize the existing one.

Add to shared API: `packages/shared/src/api/portal.ts` with portal-specific API functions (portal login, portal tickets, portal profile).

Commit: `"feat: add portal layout, router, and login page"`

---

### Task 2: Portal Ticket Pages

**Files:**
- `packages/portal/src/pages/ticket/index.tsx` — my tickets list
- `packages/portal/src/pages/ticket/ticket-create.tsx` — submit ticket
- `packages/portal/src/pages/ticket/ticket-detail.tsx` — view ticket + comments

Ticket list: simple card list of customer's tickets. Each card: ticket_no, title, type badge, status badge, created_at.

Create ticket: form with title, description, type select, file attachments. No assignee selection (backend handles auto-assignment).

Ticket detail: similar to admin but simpler — no transition buttons, no internal comments visible. Shows: status, description, public comments timeline, file attachments. Comment input at bottom.

Commit: `"feat: add portal ticket pages — list, create, detail with comments"`

---

### Task 3: Portal Profile Page + Final Polish

**Files:**
- `packages/portal/src/pages/profile/index.tsx` — view/edit profile
- Verify portal build

Profile page: display user info (name, phone, email, hospital). Edit button opens inline edit mode.

Verify: `pnpm -F @hospital/portal build` passes.

Commit: `"feat: add portal profile page and finalize portal SPA"`
