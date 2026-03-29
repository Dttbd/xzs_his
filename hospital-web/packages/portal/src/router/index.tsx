import { createBrowserRouter } from 'react-router-dom'
import { PortalLayout } from '../layouts/portal-layout'
import { AuthGuard } from './auth-guard'
import { PortalLoginPage } from '../pages/login'
import { ProfilePage } from '../pages/profile'

// Placeholder pages for T2
function Placeholder({ title }: { title: string }) {
  return <div className="text-center text-muted-foreground py-20">{title} - 开发中</div>
}

export const router = createBrowserRouter([
  { path: '/login', element: <PortalLoginPage /> },
  {
    path: '/',
    element: <AuthGuard><PortalLayout /></AuthGuard>,
    children: [
      { index: true, element: <Placeholder title="我的工单" /> },
      { path: 'tickets/:id', element: <Placeholder title="工单详情" /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
])
