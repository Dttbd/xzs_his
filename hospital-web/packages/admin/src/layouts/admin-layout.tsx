import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { MobileNav } from './mobile-nav'
import { MobileSidebar } from './mobile-sidebar'

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop/Tablet sidebar */}
      <Sidebar className="hidden md:flex" />

      {/* Mobile sidebar drawer */}
      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="md:ml-16 lg:ml-[220px] flex flex-col min-h-screen">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav className="md:hidden" />
    </div>
  )
}
