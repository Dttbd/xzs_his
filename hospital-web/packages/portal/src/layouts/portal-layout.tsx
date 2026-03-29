import { Outlet } from 'react-router-dom'
import { PortalTopbar } from './portal-topbar'

export function PortalLayout() {
  return (
    <div className="min-h-screen bg-background">
      <PortalTopbar />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
