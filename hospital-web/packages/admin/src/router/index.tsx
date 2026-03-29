import { createBrowserRouter } from 'react-router-dom'
import { AdminLayout } from '../layouts/admin-layout'
import { AuthGuard } from './auth-guard'
import { LoginPage } from '../pages/login'
import { DashboardPage } from '../pages/dashboard'

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
      { index: true, element: <DashboardPage /> },
      { path: 'hospitals', element: <PlaceholderPage title="医院管理" /> },
      { path: 'tickets', element: <PlaceholderPage title="工单中心" /> },
      { path: 'bulletins', element: <PlaceholderPage title="公告管理" /> },
      { path: 'reports', element: <PlaceholderPage title="报表中心" /> },
      { path: 'users', element: <PlaceholderPage title="用户管理" /> },
      { path: 'settings', element: <PlaceholderPage title="系统设置" /> },
    ],
  },
])
