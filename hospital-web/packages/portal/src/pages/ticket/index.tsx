import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { listPortalTickets, StatusBadge, Loading, Empty, Pagination } from '@hospital/shared'
import { Plus } from 'lucide-react'
import { TicketCreateDialog } from './ticket-create'

const PAGE_SIZE = 10

export function TicketListPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['portal-tickets', page],
    queryFn: () => listPortalTickets({ page, page_size: PAGE_SIZE }),
  })

  const tickets = data?.list ?? []
  const total = data?.total ?? 0

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-foreground">我的工单</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-accent text-accent-foreground
            rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          提交工单
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <Loading />
      ) : tickets.length === 0 ? (
        <Empty message="暂无工单，点击右上角提交新工单" />
      ) : (
        <>
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
                className="bg-card border border-border rounded-xl p-4 cursor-pointer
                  hover:border-accent/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* Ticket number */}
                    <span className="text-xs font-mono text-accent mb-1 block">
                      {ticket.ticket_no}
                    </span>
                    {/* Title */}
                    <p className="text-sm font-medium text-foreground truncate">
                      {ticket.title}
                    </p>
                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{ticket.type?.name ?? '—'}</span>
                      <span>{formatDate(ticket.created_at)}</span>
                    </div>
                  </div>
                  {/* Status badge */}
                  <div className="shrink-0 mt-0.5">
                    <StatusBadge
                      status={ticket.status?.code ?? ''}
                      label={ticket.status?.name ?? '—'}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onChange={setPage}
          />
        </>
      )}

      <TicketCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  )
}
