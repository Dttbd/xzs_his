import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from './sidebar'
import { Topbar } from './topbar'
import { MobileNav } from './mobile-nav'
import { MobileSidebar } from './mobile-sidebar'

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const ml = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} className="hidden md:flex" />
      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div
        className="flex flex-col min-h-screen transition-[margin-left] duration-200 max-md:!ml-0"
        style={{ marginLeft: ml }}
      >
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      <MobileNav className="md:hidden" />
    </div>
  )
}
