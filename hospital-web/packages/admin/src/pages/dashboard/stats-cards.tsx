import { Building2, ClipboardList, CheckCircle2, Users } from 'lucide-react'
import type { OverviewStats } from '@hospital/shared'

interface StatsCardsProps {
  overview?: OverviewStats
  loading: boolean
}

interface CardConfig {
  label: string
  icon: React.ElementType
  getValue: (o: OverviewStats) => string | number
  sub: (o: OverviewStats) => string
  subColor: string
  iconBg: string
  iconColor: string
}

const cards: CardConfig[] = [
  {
    label: '医院总数',
    icon: Building2,
    getValue: (o) => o.hospital_count ?? 0,
    sub: () => '已登记医院',
    subColor: 'text-emerald-500',
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-500',
  },
  {
    label: '待处理工单',
    icon: ClipboardList,
    getValue: (o) => o.open_ticket_count ?? 0,
    sub: () => '需要处理',
    subColor: 'text-orange-500',
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-500',
  },
  {
    label: '工单总数',
    icon: CheckCircle2,
    getValue: (o) => o.ticket_count ?? 0,
    sub: () => '全部工单',
    subColor: 'text-emerald-500',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
  },
  {
    label: '用户总数',
    icon: Users,
    getValue: (o) => o.user_count ?? 0,
    sub: () => '系统用户',
    subColor: 'text-blue-500',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
  },
]

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 w-20 bg-muted rounded" />
          <div className="h-8 w-16 bg-muted rounded" />
          <div className="h-3 w-24 bg-muted rounded" />
        </div>
        <div className="h-10 w-10 bg-muted rounded-lg" />
      </div>
    </div>
  )
}

export function StatsCards({ overview, loading }: StatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        const value = overview ? card.getValue(overview) : 0
        const sub = overview ? card.sub(overview) : ''

        return (
          <div key={card.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted uppercase tracking-wide font-medium">{card.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                {sub && (
                  <p className={`text-xs mt-1 ${card.subColor}`}>{sub}</p>
                )}
              </div>
              <div className={`p-2.5 rounded-lg ${card.iconBg}`}>
                <Icon className={`h-5 w-5 ${card.iconColor}`} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
