import { useState } from 'react'
import { Menu, Bell, KeyRound, LogOut } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  ThemeToggle,
  useAuthStore,
  getUnreadCount,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@hospital/shared'
import { NotificationDropdown } from './notification-dropdown'
import { ChangePasswordDialog } from './change-password-dialog'

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const [notifOpen, setNotifOpen] = useState(false)
  const [changePwdOpen, setChangePwdOpen] = useState(false)

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
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="md:hidden"
          aria-label="打开菜单"
        >
          <Menu size={20} strokeWidth={1.5} />
        </Button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNotifOpen((v) => !v)}
            className="relative"
            aria-label="通知"
          >
            <Bell size={20} strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            )}
          </Button>

          {notifOpen && (
            <NotificationDropdown onClose={() => setNotifOpen(false)} />
          )}
        </div>

        <ThemeToggle />

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 py-1.5">
              <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center text-accent text-xs font-medium">
                {(user?.real_name || user?.username || 'A').charAt(0)}
              </div>
              <span className="hidden sm:inline max-w-[100px] truncate text-sm">
                {user?.real_name || user?.username || '管理员'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setChangePwdOpen(true)}>
              <KeyRound size={15} strokeWidth={1.5} />
              修改密码
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut size={15} strokeWidth={1.5} />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ChangePasswordDialog open={changePwdOpen} onClose={() => setChangePwdOpen(false)} />
    </header>
  )
}
