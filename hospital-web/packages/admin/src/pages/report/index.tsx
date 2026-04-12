import { BarChart3, ClipboardList, Users } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@hospital/shared'
import { HospitalStatsPage } from './hospital-stats'
import { TicketStatsPage } from './ticket-stats'
import { SalesStatsPage } from './sales-stats'

export default function ReportPage() {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">报表中心</h1>
        <p className="text-sm text-muted-foreground mt-1">数据统计与分析</p>
      </div>

      <Tabs defaultValue="hospital">
        <TabsList>
          <TabsTrigger value="hospital" className="flex items-center gap-2">
            <BarChart3 size={15} strokeWidth={1.5} />
            医院统计
          </TabsTrigger>
          <TabsTrigger value="ticket" className="flex items-center gap-2">
            <ClipboardList size={15} strokeWidth={1.5} />
            工单统计
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <Users size={15} strokeWidth={1.5} />
            销售业绩
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hospital">
          <HospitalStatsPage />
        </TabsContent>
        <TabsContent value="ticket">
          <TicketStatsPage />
        </TabsContent>
        <TabsContent value="sales">
          <SalesStatsPage />
        </TabsContent>
      </Tabs>
    </div>
  )
}
