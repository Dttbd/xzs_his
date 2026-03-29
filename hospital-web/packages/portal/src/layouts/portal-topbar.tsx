import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X, LogOut } from 'lucide-react'
import { ThemeToggle, useAuthStore } from '@hospital/shared'

export function PortalTopbar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'text-sm px-3 py-1.5 rounded-lg transition-colors',
      isActive
        ? 'text-accent bg-accent/10 font-medium'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent/5',
    ].join(' ')

  return (
    <header className="relative h-[52px] flex items-center justify-between px-4 border-b border-border bg-card shrink-0">
      {/* Left: logo + nav */}
      <div className="flex items-center gap-4">
        <span className="text-accent font-bold text-base select-none">HIS 客户门户</span>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          <NavLink to="/" end className={navLinkClass}>
            我的工单
          </NavLink>
          <NavLink to="/profile" className={navLinkClass}>
            个人信息
          </NavLink>
        </nav>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* User name */}
        <span className="hidden sm:inline text-sm text-muted-foreground max-w-[120px] truncate">
          {user?.real_name || user?.username || '用户'}
        </span>

        {/* Logout button */}
        <button
          onClick={() => logout()}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors"
          title="退出登录"
        >
          <LogOut size={18} strokeWidth={1.5} />
        </button>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="菜单"
        >
          {menuOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
        </button>
      </div>

      {/* Mobile nav dropdown */}
      {menuOpen && (
        <div className="absolute top-[52px] left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex flex-col gap-1 sm:hidden">
          <NavLink
            to="/"
            end
            className={navLinkClass}
            onClick={() => setMenuOpen(false)}
          >
            我的工单
          </NavLink>
          <NavLink
            to="/profile"
            className={navLinkClass}
            onClick={() => setMenuOpen(false)}
          >
            个人信息
          </NavLink>
          <div className="pt-2 border-t border-border mt-1 flex items-center justify-between">
            <span className="text-sm text-muted-foreground truncate">
              {user?.real_name || user?.username || '用户'}
            </span>
            <button
              onClick={() => { logout(); setMenuOpen(false) }}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
            >
              <LogOut size={15} strokeWidth={1.5} />
              退出
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
