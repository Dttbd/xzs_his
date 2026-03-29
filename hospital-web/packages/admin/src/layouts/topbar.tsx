import { Menu, Bell } from 'lucide-react'
import { ThemeToggle, useAuthStore } from '@hospital/shared'

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <header className="h-[52px] flex items-center justify-between px-4 border-b border-border bg-card shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors"
          aria-label="打开菜单"
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button className="relative p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors">
          <Bell size={20} strokeWidth={1.5} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
        </button>

        <ThemeToggle />

        {/* User dropdown */}
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors"
          title="退出登录"
        >
          <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center text-accent text-xs font-medium">
            {(user?.real_name || user?.username || 'A').charAt(0)}
          </div>
          <span className="hidden sm:inline max-w-[100px] truncate">
            {user?.real_name || user?.username || '管理员'}
          </span>
        </button>
      </div>
    </header>
  )
}
