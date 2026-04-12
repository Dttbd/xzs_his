import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { Loading } from '@hospital/shared'
import { AdminLayout } from '../layouts/admin-layout'
import { AuthGuard } from './auth-guard'
import { LoginPage } from '../pages/login'
import { HospitalListPage } from '../pages/hospital'
import { HospitalDetailPage } from '../pages/hospital/hospital-detail'
import { TicketListPage } from '../pages/ticket'
import { TicketDetailPage } from '../pages/ticket/ticket-detail'
import { BulletinListPage } from '../pages/bulletin'
import { BulletinDetailPage } from '../pages/bulletin/bulletin-detail'
import { UserListPage } from '../pages/user'
import { RoleListPage } from '../pages/user/role-list'
import { SettingsPage } from '../pages/settings'

// Lazy-loaded pages (contain ECharts — split into separate chunks)
const DashboardPage = lazy(() => import('../pages/dashboard'))
const HospitalSummaryPage = lazy(() => import('../pages/hospital/hospital-summary'))
const ReportPage = lazy(() => import('../pages/report'))

function withSuspense(node: React.ReactNode) {
  return <Suspense fallback={<Loading />}>{node}</Suspense>
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">{title} — 开发中</p>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AdminLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: withSuspense(<DashboardPage />) },
      { path: 'hospitals', element: <HospitalListPage /> },
      { path: 'hospitals/summary', element: withSuspense(<HospitalSummaryPage />) },
      { path: 'hospitals/:id', element: <HospitalDetailPage /> },
      { path: 'tickets', element: <TicketListPage /> },
      { path: 'tickets/:id', element: <TicketDetailPage /> },
      { path: 'bulletins', element: <BulletinListPage /> },
      { path: 'bulletins/:id', element: <BulletinDetailPage /> },
      { path: 'reports', element: withSuspense(<ReportPage />) },
      { path: 'users', element: <UserListPage /> },
      { path: 'users/roles', element: <RoleListPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
