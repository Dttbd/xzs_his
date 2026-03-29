import { useState } from 'react'
import { BarChart3, ClipboardList, Users } from 'lucide-react'
import { HospitalStatsPage } from './hospital-stats'
import { TicketStatsPage } from './ticket-stats'
import { SalesStatsPage } from './sales-stats'

type TabKey = 'hospital' | 'ticket' | 'sales'

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'hospital', label: '医院统计', icon: BarChart3 },
  { key: 'ticket', label: '工单统计', icon: ClipboardList },
  { key: 'sales', label: '销售业绩', icon: Users },
]

export function ReportPage() {
  const [active, setActive] = useState<TabKey>('hospital')

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">报表中心</h1>
        <p className="text-sm text-muted-foreground mt-1">数据统计与分析</p>
      </div>

      {/* Tab nav */}
      <div className="border-b border-border">
        <nav className="flex gap-0">
          {tabs.map(({ key, label, icon: Icon }) => {
            const isActive = active === key
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={[
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                <Icon size={15} strokeWidth={1.5} />
                {label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab content */}
      {active === 'hospital' && <HospitalStatsPage />}
      {active === 'ticket' && <TicketStatsPage />}
      {active === 'sales' && <SalesStatsPage />}
    </div>
  )
}
