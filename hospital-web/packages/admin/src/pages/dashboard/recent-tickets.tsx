import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { listTickets, StatusBadge, type Ticket } from '@hospital/shared'

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `${diffMin} 分钟前`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH} 小时前`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD} 天前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function RecentTickets() {
  const { data, isLoading } = useQuery({
    queryKey: ['recent-tickets'],
    queryFn: () => listTickets({ page: 1, page_size: 5 }),
  })

  const tickets: Ticket[] = data?.list ?? []

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">最近工单</h3>
        <Link
          to="/tickets"
          className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-400 transition-colors"
        >
          查看全部
          <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3 py-2">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-3 flex-1 bg-muted rounded" />
              <div className="h-5 w-14 bg-muted rounded-full" />
              <div className="h-3 w-16 bg-muted rounded" />
              <div className="h-3 w-14 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted">暂无工单</div>
      ) : (
        <div className="divide-y divide-border">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="flex items-center gap-3 py-3 hover:bg-muted/20 -mx-1 px-1 rounded-lg transition-colors"
            >
              {/* Ticket No */}
              <span className="text-xs font-mono text-indigo-500 shrink-0 w-24 truncate">
                {ticket.ticket_no}
              </span>

              {/* Title */}
              <span className="flex-1 text-sm text-foreground truncate min-w-0">
                {ticket.title}
              </span>

              {/* Type */}
              {ticket.type && (
                <span className="text-xs text-muted shrink-0 hidden sm:block">
                  {ticket.type.name}
                </span>
              )}

              {/* Status */}
              {ticket.status && (
                <div className="shrink-0">
                  <StatusBadge status={ticket.status.code} label={ticket.status.name} />
                </div>
              )}

              {/* Assignee */}
              <span className="text-xs text-muted shrink-0 hidden md:block w-16 truncate text-right">
                {ticket.assignee?.real_name ?? '未分配'}
              </span>

              {/* Time */}
              <span className="text-xs text-muted shrink-0 hidden lg:block w-16 text-right">
                {formatDate(ticket.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
