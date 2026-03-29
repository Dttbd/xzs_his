# Phase 4: Frontend Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build React frontend monorepo with shared component library, admin layout (responsive sidebar/topbar/mobile), theme system (dark/light/system), and auth flow (login page + JWT token management).

**Architecture:** pnpm workspace monorepo with 3 packages: shared (components + API client + hooks), admin (管理端 SPA), portal (客户门户 SPA, scaffold only). Vite for build, shadcn/ui + Tailwind CSS v4 for UI.

**Tech Stack:** React 19, TypeScript, Vite, pnpm, Tailwind CSS v4, shadcn/ui, Zustand, TanStack Query, React Router, Axios, Lucide React

---

### Task 1: Monorepo Scaffold

**Files to create:**
- `hospital-web/package.json` — root package.json
- `hospital-web/pnpm-workspace.yaml`
- `hospital-web/tsconfig.json` — root TS config
- `hospital-web/.gitignore`
- `hospital-web/packages/shared/package.json`
- `hospital-web/packages/shared/tsconfig.json`
- `hospital-web/packages/admin/package.json`
- `hospital-web/packages/admin/tsconfig.json`
- `hospital-web/packages/admin/vite.config.ts`
- `hospital-web/packages/admin/index.html`
- `hospital-web/packages/admin/src/main.tsx`
- `hospital-web/packages/admin/src/App.tsx`
- `hospital-web/packages/portal/package.json`
- `hospital-web/packages/portal/tsconfig.json`
- `hospital-web/packages/portal/vite.config.ts`
- `hospital-web/packages/portal/index.html`
- `hospital-web/packages/portal/src/main.tsx`
- `hospital-web/packages/portal/src/App.tsx`

Steps:
1. Create pnpm-workspace.yaml pointing to packages/*
2. Root package.json with dev scripts
3. Install core deps: react, react-dom, typescript, vite, @vitejs/plugin-react
4. Install UI deps: tailwindcss v4, @tailwindcss/vite, lucide-react
5. Install data deps: axios, @tanstack/react-query, zustand, react-router-dom
6. Shared package exports components, hooks, API client
7. Admin/Portal packages import from @hospital/shared
8. Verify: `pnpm install && pnpm -F admin dev` starts dev server

Commit: `"feat: scaffold frontend monorepo with admin, portal, and shared packages"`

---

### Task 2: Theme System + Tailwind Config

**Files:**
- `hospital-web/packages/shared/src/styles/globals.css` — CSS variables for dark/light themes
- `hospital-web/packages/shared/src/hooks/use-theme.ts` — theme toggle hook (dark/light/system)
- `hospital-web/packages/shared/src/components/theme-provider.tsx` — React context provider
- `hospital-web/packages/shared/src/components/theme-toggle.tsx` — toggle button component
- `hospital-web/packages/admin/src/index.css` — import shared globals + Tailwind

Theme CSS variables (from design spec):
```css
:root {
  --background: 248 250 252;      /* #f8fafc */
  --card: 255 255 255;            /* #ffffff */
  --border: 226 232 240;          /* #e2e8f0 */
  --foreground: 15 23 42;         /* #0f172a */
  --muted: 100 116 139;          /* #64748b */
  --muted-foreground: 148 163 184; /* #94a3b8 */
  --accent: 99 102 241;          /* #6366f1 */
  --destructive: 239 68 68;      /* #ef4444 */
}

.dark {
  --background: 18 18 24;        /* #121218 */
  --card: 26 26 36;              /* #1a1a24 */
  --border: 148 163 184 / 0.08;  /* rgba semi-transparent */
  --foreground: 226 232 240;     /* #e2e8f0 */
  --muted: 148 163 184;          /* #94a3b8 */
  --muted-foreground: 100 116 139; /* #64748b */
  --accent: 129 140 248;         /* #818cf8 */
}
```

Tailwind v4 uses CSS-first config via `@theme` in CSS file (no tailwind.config.js needed).

useTheme hook: reads from localStorage, listens to prefers-color-scheme, toggles html class.

Commit: `"feat: add theme system with dark/light/system mode and CSS variables"`

---

### Task 3: Shared API Client + Auth Store

**Files:**
- `hospital-web/packages/shared/src/api/client.ts` — Axios instance with JWT interceptor
- `hospital-web/packages/shared/src/api/types.ts` — API response types (Response, PageResult)
- `hospital-web/packages/shared/src/api/auth.ts` — login, refresh, logout API calls
- `hospital-web/packages/shared/src/stores/auth-store.ts` — Zustand store (token, user, login, logout)
- `hospital-web/packages/shared/src/hooks/use-auth.ts` — auth hook wrapping store
- `hospital-web/packages/shared/src/index.ts` — barrel exports

API client:
- Base URL from env var `VITE_API_URL` (default http://localhost:8080)
- Request interceptor adds Bearer token from auth store
- Response interceptor handles 401 → clear token → redirect to login

Auth store (Zustand + persist):
- token, user, isAuthenticated
- login(username, password) → call API, store token + user
- logout() → clear token, call API
- Persist to localStorage

Commit: `"feat: add shared API client with JWT auth and Zustand auth store"`

---

### Task 4: Admin Layout — Sidebar + Topbar + Mobile

**Files:**
- `hospital-web/packages/admin/src/layouts/admin-layout.tsx` — main layout wrapper
- `hospital-web/packages/admin/src/layouts/sidebar.tsx` — desktop sidebar with nav items
- `hospital-web/packages/admin/src/layouts/topbar.tsx` — top bar (breadcrumb, notifications, user menu)
- `hospital-web/packages/admin/src/layouts/mobile-nav.tsx` — mobile bottom tab bar
- `hospital-web/packages/admin/src/layouts/mobile-sidebar.tsx` — mobile slide-out drawer

Layout structure:
- Desktop (≥1024px): sidebar (220px fixed) + topbar + content area
- Tablet (768-1024px): sidebar collapsed (icon-only, 64px) + topbar + content
- Mobile (<768px): no sidebar, topbar with hamburger, bottom tab bar (5 tabs: 工作台/医院/工单/公告/我的)

Sidebar nav items (Lucide icons, stroke-width 1.5):
- LayoutDashboard: 工作台
- Building2: 医院管理
- ClipboardList: 工单中心
- BookOpen: 公告管理
- BarChart3: 报表中心
- Users: 用户管理
- Settings: 系统设置

Topbar: left=breadcrumb or page title, right=notification bell (with red dot) + theme toggle + user avatar dropdown

Style: follow design spec — no shadows, 1px borders, large radius, Lucide icons.

Commit: `"feat: add responsive admin layout with sidebar, topbar, and mobile navigation"`

---

### Task 5: Router + Auth Guard + Login Page

**Files:**
- `hospital-web/packages/admin/src/router/index.tsx` — route definitions
- `hospital-web/packages/admin/src/router/auth-guard.tsx` — redirect to login if not authenticated
- `hospital-web/packages/admin/src/pages/login/index.tsx` — login page
- `hospital-web/packages/admin/src/pages/dashboard/index.tsx` — placeholder dashboard
- Update `hospital-web/packages/admin/src/App.tsx` — use router + QueryClientProvider + ThemeProvider

Routes:
- `/login` — public, login page
- `/` — protected (auth guard), admin layout wrapper
  - `/` → dashboard page
  - `/hospitals` → placeholder
  - `/tickets` → placeholder
  - `/bulletins` → placeholder
  - `/reports` → placeholder
  - `/users` → placeholder
  - `/settings` → placeholder

Login page: clean centered card, username + password fields, submit button. On success → redirect to dashboard.

Auth guard: checks auth store, redirects to /login if not authenticated.

Commit: `"feat: add router with auth guard and login page"`

---

### Task 6: Verify Full Flow + Polish

1. Start backend: `cd hospital-server && go run ./cmd/server/`
2. Start frontend: `cd hospital-web && pnpm -F admin dev`
3. Verify: login with admin/admin123 → see dashboard with sidebar
4. Verify: responsive — resize browser → sidebar collapses → mobile bottom nav appears
5. Verify: theme toggle works (dark/light/system)
6. Verify: logout → redirects to login
7. Fix any issues

Commit: `"feat: polish frontend foundation — verified login, layout, theme, responsive"`
