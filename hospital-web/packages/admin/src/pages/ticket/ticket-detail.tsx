import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Send,
  Paperclip,
  UserCheck,
  Lock,
} from 'lucide-react'
import {
  getTicket,
  transitionTicket,
  assignTicket,
  addComment,
  addAttachment,
  listTransitions,
  listUsers,
  StatusBadge,
  Loading,
} from '@hospital/shared'
import { TicketTimeline } from './ticket-timeline'

const priorityMap: Record<number, { label: string; color: string }> = {
  1: { label: '低', color: 'text-zinc-400' },
  2: { label: '中', color: 'text-blue-500' },
  3: { label: '高', color: 'text-amber-500' },
  4: { label: '紧急', color: 'text-rose-500' },
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [commentText, setCommentText] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [assigneeId, setAssigneeId] = useState('')

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => getTicket(id!),
    enabled: !!id,
  })

  const { data: transitions } = useQuery({
    queryKey: ['ticket-transitions'],
    queryFn: () => listTransitions(),
  })

  const { data: usersResult } = useQuery({
    queryKey: ['users-select'],
    queryFn: () => listUsers({ page: 1, page_size: 100 }),
    enabled: showAssignDialog,
  })

  // Available transitions for current status
  const availableTransitions = transitions?.filter(
    (t) => t.from_status_id === ticket?.status_id
  ) || []

  const transitionMutation = useMutation({
    mutationFn: ({ toStatusId, comment }: { toStatusId: string; comment?: string }) =>
      transitionTicket(id!, { to_status_id: toStatusId, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
    },
  })

  const assignMutation = useMutation({
    mutationFn: (newAssigneeId: string) => assignTicket(id!, { assignee_id: newAssigneeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
      setShowAssignDialog(false)
      setAssigneeId('')
    },
  })

  const commentMutation = useMutation({
    mutationFn: () => addComment(id!, { content: commentText.trim(), is_internal: isInternal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
      setCommentText('')
      setIsInternal(false)
    },
  })

  const attachMutation = useMutation({
    mutationFn: (file: File) => addAttachment(id!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
    },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      attachMutation.mutate(file)
      e.target.value = ''
    }
  }

  if (isLoading) return <Loading />

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
        工单不存在
      </div>
    )
  }

  const p = priorityMap[ticket.priority] || priorityMap[2]

  const inputClass =
    'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors'

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/tickets')}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        返回工单列表
      </button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-accent font-mono text-sm">{ticket.ticket_no}</span>
          {ticket.status && (
            <StatusBadge status={ticket.status.code} label={ticket.status.name} />
          )}
          <h1 className="text-xl font-semibold text-foreground w-full sm:w-auto mt-1 sm:mt-0">
            {ticket.title}
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {availableTransitions.map((t) => (
            <button
              key={t.id}
              onClick={() => transitionMutation.mutate({ toStatusId: t.to_status_id })}
              disabled={transitionMutation.isPending}
              className="px-3 py-1.5 text-sm border border-border rounded-lg text-foreground hover:bg-background transition-colors disabled:opacity-50"
            >
              {t.name}
            </button>
          ))}
          <button
            onClick={() => setShowAssignDialog(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-foreground hover:bg-background transition-colors"
          >
            <UserCheck size={14} strokeWidth={1.5} />
            转派
          </button>
        </div>
      </div>

      {/* Info section */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoField label="工单类型" value={ticket.type?.name || '-'} />
          <InfoField
            label="优先级"
            value={<span className={`font-medium ${p.color}`}>{p.label}</span>}
          />
          <InfoField label="关联医院" value={ticket.hospital?.name || '-'} />
          <InfoField label="创建人" value={ticket.creator?.real_name || '-'} />
          <InfoField label="处理人" value={ticket.assignee?.real_name || '未指派'} />
          <InfoField label="创建时间" value={formatDateTime(ticket.created_at)} />
          <InfoField label="更新时间" value={formatDateTime(ticket.updated_at)} />
          {ticket.resolved_at && (
            <InfoField label="解决时间" value={formatDateTime(ticket.resolved_at)} />
          )}
        </div>
      </div>

      {/* Description */}
      {ticket.description && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">描述</h3>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {ticket.description}
          </div>
        </div>
      )}

      {/* Attachments */}
      {ticket.attachments && ticket.attachments.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">附件</h3>
          <div className="flex flex-wrap gap-2">
            {ticket.attachments.map((att) => (
              <a
                key={att.id}
                href={att.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-accent hover:bg-background transition-colors"
              >
                <Paperclip size={14} strokeWidth={1.5} />
                {att.file_name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-4">动态</h3>
        <TicketTimeline
          comments={ticket.comments || []}
          logs={ticket.logs || []}
        />
      </div>

      {/* Comment input */}
      <div className="border border-border rounded-xl bg-card p-4 space-y-3">
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="添加留言..."
          rows={3}
          className={`${inputClass} resize-none`}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded border-border"
              />
              <Lock size={14} strokeWidth={1.5} />
              内部备注
            </label>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={attachMutation.isPending}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <Paperclip size={14} strokeWidth={1.5} />
              {attachMutation.isPending ? '上传中...' : '附件'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <button
            onClick={() => commentMutation.mutate()}
            disabled={!commentText.trim() || commentMutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Send size={14} strokeWidth={1.5} />
            {commentMutation.isPending ? '发送中...' : '发送'}
          </button>
        </div>
      </div>

      {/* Assign Dialog */}
      {showAssignDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm bg-card border border-border rounded-xl p-6 mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">转派工单</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-foreground mb-1.5">选择处理人</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">请选择</option>
                  {usersResult?.list?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.real_name || u.username}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAssignDialog(false)
                    setAssigneeId('')
                  }}
                  className="px-4 py-2 text-sm border border-border rounded-lg text-foreground hover:bg-background transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => assigneeId && assignMutation.mutate(assigneeId)}
                  disabled={!assigneeId || assignMutation.isPending}
                  className="px-4 py-2 text-sm bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {assignMutation.isPending ? '转派中...' : '确认转派'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-foreground">{typeof value === 'string' ? value : value}</p>
    </div>
  )
}
