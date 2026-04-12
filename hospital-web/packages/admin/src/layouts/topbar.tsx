import { useState, useRef, useEffect } from 'react'
import { Menu, Bell, KeyRound, LogOut } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ThemeToggle, useAuthStore, getUnreadCount } from '@hospital/shared'
import { NotificationDropdown } from './notification-dropdown'
import { ChangePasswordDialog } from './change-password-dialog'

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [changePwdOpen, setChangePwdOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userMenuOpen) return
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [userMenuOpen])

  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => getUnreadCount(),
    refetchInterval: 30_000,
  })

  const unreadCount = unreadData?.count ?? 0

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
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors"
            aria-label="通知"
          >
            <Bell size={20} strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            )}
          </button>

          {notifOpen && (
            <NotificationDropdown onClose={() => setNotifOpen(false)} />
          )}
        </div>

        <ThemeToggle />

        {/* User dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center text-accent text-xs font-medium">
              {(user?.real_name || user?.username || 'A').charAt(0)}
            </div>
            <span className="hidden sm:inline max-w-[100px] truncate">
              {user?.real_name || user?.username || '管理员'}
            </span>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-border bg-card shadow-lg z-50 py-1 overflow-hidden">
              <button
                onClick={() => {
                  setUserMenuOpen(false)
                  setChangePwdOpen(true)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent/5 transition-colors"
              >
                <KeyRound size={15} strokeWidth={1.5} />
                修改密码
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors"
              >
                <LogOut size={15} strokeWidth={1.5} />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>

      <ChangePasswordDialog open={changePwdOpen} onClose={() => setChangePwdOpen(false)} />
    </header>
  )
}
