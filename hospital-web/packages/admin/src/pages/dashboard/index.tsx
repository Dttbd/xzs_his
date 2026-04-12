import { useQuery } from '@tanstack/react-query'
import { getOverview, useAuthStore } from '@hospital/shared'
import { StatsCards } from './stats-cards'
import { TicketTrendChart } from './ticket-trend-chart'
import { TypeDistributionChart } from './type-distribution-chart'
import { RecentTickets } from './recent-tickets'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data: overview, isLoading } = useQuery({
    queryKey: ['overview'],
    queryFn: () => getOverview({}),
  })

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {getGreeting()}，{user?.real_name ?? '管理员'}
        </h1>
        <p className="text-sm text-muted mt-1">
          {overview
            ? `当前有 ${overview.open_ticket_count} 个待处理工单`
            : '加载中...'}
        </p>
      </div>

      <StatsCards overview={overview} loading={isLoading} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TicketTrendChart />
        </div>
        <TypeDistributionChart />
      </div>

      <RecentTickets />
    </div>
  )
}
