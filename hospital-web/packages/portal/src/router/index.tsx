import { createBrowserRouter } from 'react-router-dom'
import { PortalLayout } from '../layouts/portal-layout'
import { AuthGuard } from './auth-guard'
import { PortalLoginPage } from '../pages/login'
import { ProfilePage } from '../pages/profile'
import { TicketListPage } from '../pages/ticket'
import { TicketDetailPage } from '../pages/ticket/ticket-detail'

export const router = createBrowserRouter([
  { path: '/login', element: <PortalLoginPage /> },
  {
    path: '/',
    element: <AuthGuard><PortalLayout /></AuthGuard>,
    children: [
      { index: true, element: <TicketListPage /> },
      { path: 'tickets/:id', element: <TicketDetailPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
])
