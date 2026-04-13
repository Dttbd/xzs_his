import { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCheck } from 'lucide-react'
import { listNotifications, markNotificationRead, markAllRead } from '@hospital/shared'

interface NotificationDropdownProps {
  onClose: () => void
}

function formatRelativeTime(iso: string): string {
  const now = Date.now()
  const ts = new Date(iso).getTime()
  const diff = Math.floor((now - ts) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return `${Math.floor(diff / 86400)} 天前`
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // slight delay so the bell-button click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  const { data: notificationsPage } = useQuery({
    queryKey: ['notifications-dropdown'],
    queryFn: () => listNotifications({ page: 1, page_size: 5 }),
    refetchInterval: 30_000,
  })

  const notifications = notificationsPage?.list ?? []

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-dropdown'] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    },
  })

  const markAllMutation = useMutation({
    mutationFn: () => markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-dropdown'] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    },
  })

  const handleItemClick = (id: string) => {
    markReadMutation.mutate(id)
  }

  const handleViewAll = () => {
    onClose()
    navigate('/notifications')
  }

  return (
    <div
      ref={ref}
      className="fixed inset-x-3 top-[56px] sm:inset-x-auto sm:absolute sm:top-full sm:right-0 sm:mt-2 sm:w-80 rounded-xl border border-border bg-card z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-medium text-foreground">通知</span>
        <button
          onClick={() => markAllMutation.mutate()}
          disabled={markAllMutation.isPending}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <CheckCheck size={13} strokeWidth={1.5} />
          全部已读
        </button>
      </div>

      {/* List */}
      <div className="divide-y divide-border">
        {notifications.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">暂无通知</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleItemClick(n.id)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/5 transition-colors"
            >
              {/* Unread dot */}
              <span
                className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${
                  n.is_read ? 'bg-transparent border border-border' : 'bg-accent'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm truncate ${
                    n.is_read ? 'text-muted-foreground' : 'text-foreground font-medium'
                  }`}
                >
                  {n.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.content}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {formatRelativeTime(n.created_at)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2.5">
        <button
          onClick={handleViewAll}
          className="w-full text-center text-xs text-accent hover:underline transition-colors"
        >
          查看全部
        </button>
      </div>
    </div>
  )
}
