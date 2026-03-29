import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import {
  listTickets,
  listTicketTypes,
  listTicketStatuses,
  useAuthStore,
  DataTable,
  Pagination,
  StatusBadge,
} from '@hospital/shared'
import type { Column, Ticket } from '@hospital/shared'
import { TicketCreateDialog } from './ticket-create'

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'created', label: '我创建的' },
  { key: 'assigned', label: '我处理的' },
] as const

type TabKey = (typeof tabs)[number]['key']

const priorityMap: Record<number, { label: string; color: string }> = {
  1: { label: '低', color: 'text-zinc-400' },
  2: { label: '中', color: 'text-blue-500' },
  3: { label: '高', color: 'text-amber-500' },
  4: { label: '紧急', color: 'text-rose-500' },
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function TicketListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [tab, setTab] = useState<TabKey>('all')
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const pageSize = 15

  // Build query params
  const queryParams: Record<string, any> = {
    page,
    page_size: pageSize,
  }
  if (keyword) queryParams.keyword = keyword
  if (typeFilter) queryParams.type_id = typeFilter
  if (statusFilter) queryParams.status_id = statusFilter
  if (tab === 'created' && user) queryParams.creator_id = user.id
  if (tab === 'assigned' && user) queryParams.assignee_id = user.id

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', queryParams],
    queryFn: () => listTickets(queryParams),
  })

  const { data: ticketTypes } = useQuery({
    queryKey: ['ticket-types'],
    queryFn: () => listTicketTypes(),
  })

  const { data: ticketStatuses } = useQuery({
    queryKey: ['ticket-statuses'],
    queryFn: () => listTicketStatuses(),
  })

  const columns: Column<Ticket>[] = [
    {
      key: 'ticket_no',
      title: '工单号',
      render: (_, record) => (
        <span className="text-accent font-medium">{record.ticket_no}</span>
      ),
    },
    {
      key: 'title',
      title: '标题',
      render: (_, record) => (
        <span className="text-foreground">{record.title}</span>
      ),
    },
    {
      key: 'type',
      title: '类型',
      render: (_, record) => (
        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
          {record.type?.name || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (_, record) =>
        record.status ? (
          <StatusBadge status={record.status.code} label={record.status.name} />
        ) : (
          '-'
        ),
    },
    {
      key: 'priority',
      title: '优先级',
      render: (_, record) => {
        const p = priorityMap[record.priority] || priorityMap[2]
        return <span className={`text-xs font-medium ${p.color}`}>{p.label}</span>
      },
    },
    {
      key: 'creator',
      title: '创建人',
      render: (_, record) => (
        <span className="text-sm">{record.creator?.real_name || '-'}</span>
      ),
    },
    {
      key: 'assignee',
      title: '处理人',
      render: (_, record) => (
        <span className="text-sm">{record.assignee?.real_name || '未指派'}</span>
      ),
    },
    {
      key: 'created_at',
      title: '创建时间',
      render: (_, record) => (
        <span className="text-sm text-muted-foreground">{formatDate(record.created_at)}</span>
      ),
    },
  ]

  const inputClass =
    'px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">工单中心</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} strokeWidth={1.5} />
          创建工单
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key)
              setPage(1)
            }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'text-accent border-accent'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search
            size={14}
            strokeWidth={1.5}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setPage(1)
            }}
            placeholder="搜索工单号或标题"
            className={`${inputClass} pl-8 w-56`}
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value)
            setPage(1)
          }}
          className={`${inputClass} w-36`}
        >
          <option value="">全部类型</option>
          {ticketTypes?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className={`${inputClass} w-36`}
        >
          <option value="">全部状态</option>
          {ticketStatuses?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <DataTable<Ticket>
        columns={columns}
        data={data?.list || []}
        loading={isLoading}
        onRowClick={(record) => navigate(`/tickets/${record.id}`)}
      />

      {/* Pagination */}
      {data && (
        <Pagination
          page={data.page}
          pageSize={data.page_size}
          total={data.total}
          onChange={setPage}
        />
      )}

      {/* Create Dialog */}
      <TicketCreateDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
