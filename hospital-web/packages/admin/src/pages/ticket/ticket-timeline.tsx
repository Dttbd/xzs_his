import { useMemo } from 'react'
import { Activity, MessageSquare, ArrowRightLeft, UserCheck, Plus } from 'lucide-react'
import type { TicketComment, TicketLog } from '@hospital/shared'

interface TimelineProps {
  comments: TicketComment[]
  logs: TicketLog[]
}

type TimelineItem =
  | { kind: 'comment'; data: TicketComment; time: string }
  | { kind: 'log'; data: TicketLog; time: string }

const avatarColors = [
  'bg-blue-500/15 text-blue-500',
  'bg-emerald-500/15 text-emerald-500',
  'bg-amber-500/15 text-amber-500',
  'bg-violet-500/15 text-violet-500',
  'bg-rose-500/15 text-rose-500',
  'bg-cyan-500/15 text-cyan-500',
]

function hashColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

function getLogIcon(action: string) {
  switch (action) {
    case 'create':
      return Plus
    case 'transition':
      return ArrowRightLeft
    case 'assign':
      return UserCheck
    case 'comment':
      return MessageSquare
    default:
      return Activity
  }
}

function getLogDescription(log: TicketLog): string {
  const userName = log.user?.real_name || '系统'
  switch (log.action) {
    case 'create':
      return `${userName} 创建了工单`
    case 'transition':
      return `${userName} 状态变更: ${log.from_status} -> ${log.to_status}`
    case 'assign':
      return `${userName} 转派了工单`
    case 'comment':
      return `${userName} 添加了留言`
    default:
      return `${userName} ${log.action}`
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function TicketTimeline({ comments, logs }: TimelineProps) {
  const items = useMemo<TimelineItem[]>(() => {
    const all: TimelineItem[] = [
      ...comments.map((c) => ({ kind: 'comment' as const, data: c, time: c.created_at })),
      ...logs.map((l) => ({ kind: 'log' as const, data: l, time: l.created_at })),
    ]
    all.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    return all
  }, [comments, logs])

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">暂无动态</p>
    )
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

      <div className="space-y-4">
        {items.map((item) => {
          if (item.kind === 'comment') {
            const c = item.data
            const name = c.user?.real_name || '未知用户'
            const initial = name.charAt(0)
            const colorClass = hashColor(name)
            return (
              <div key={`c-${c.id}`} className="relative flex gap-3 pl-0">
                {/* Avatar */}
                <div
                  className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${colorClass}`}
                >
                  {initial}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{name}</span>
                    {c.is_internal && (
                      <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
                        内部备注
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{formatTime(c.created_at)}</span>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3 text-sm text-foreground whitespace-pre-wrap">
                    {c.content}
                  </div>
                </div>
              </div>
            )
          }

          // Log item
          const l = item.data
          const Icon = getLogIcon(l.action)
          return (
            <div key={`l-${l.id}`} className="relative flex items-center gap-3 pl-0">
              {/* Icon circle */}
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon size={14} strokeWidth={1.5} className="text-muted-foreground" />
              </div>

              {/* Description */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-muted-foreground">{getLogDescription(l)}</span>
                <span className="text-xs text-muted-foreground/60">{formatTime(l.created_at)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
