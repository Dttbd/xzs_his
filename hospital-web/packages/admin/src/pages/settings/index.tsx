import { useState } from 'react'
import { OrgSettings } from './org-settings'
import { TicketConfig } from './ticket-config'
import { FieldConfig } from './field-config'

type TabKey = 'org' | 'ticket' | 'field'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'org', label: '组织架构' },
  { key: 'ticket', label: '工单配置' },
  { key: 'field', label: '字段配置' },
]

export function SettingsPage() {
  const [tab, setTab] = useState<TabKey>('org')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">系统设置</h1>

      {/* Tab nav */}
      <div className="flex border-b border-border gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              tab === t.key
                ? 'text-accent'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'org' && <OrgSettings />}
        {tab === 'ticket' && <TicketConfig />}
        {tab === 'field' && <FieldConfig />}
      </div>
    </div>
  )
}
