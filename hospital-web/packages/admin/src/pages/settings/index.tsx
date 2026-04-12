import { Tabs, TabsContent, TabsList, TabsTrigger } from '@hospital/shared'
import { OrgSettings } from './org-settings'
import { TicketConfig } from './ticket-config'
import { FieldConfig } from './field-config'

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">系统设置</h1>

      <Tabs defaultValue="org">
        <TabsList>
          <TabsTrigger value="org">组织架构</TabsTrigger>
          <TabsTrigger value="ticket">工单配置</TabsTrigger>
          <TabsTrigger value="field">字段配置</TabsTrigger>
        </TabsList>

        <TabsContent value="org">
          <OrgSettings />
        </TabsContent>
        <TabsContent value="ticket">
          <TicketConfig />
        </TabsContent>
        <TabsContent value="field">
          <FieldConfig />
        </TabsContent>
      </Tabs>
    </div>
  )
}
