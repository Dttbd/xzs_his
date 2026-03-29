import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { getPortalTicket, addPortalComment, StatusBadge, Loading } from '@hospital/shared'
import { ArrowLeft, Send, Paperclip, Download } from 'lucide-react'

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [comment, setComment] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['portal-ticket', id],
    queryFn: () => getPortalTicket(id!),
    enabled: !!id,
  })

  const commentMutation = useMutation({
    mutationFn: () => addPortalComment(id!, { content: comment }),
    onSuccess: () => {
      setComment('')
      queryClient.invalidateQueries({ queryKey: ['portal-ticket', id] })
    },
  })

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim() || commentMutation.isPending) return
    commentMutation.mutate()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (comment.trim() && !commentMutation.isPending) {
        commentMutation.mutate()
      }
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  function getInitials(name: string) {
    return name ? name.slice(0, 1).toUpperCase() : '?'
  }

  if (isLoading) return <Loading />

  if (!ticket) {
    return (
      <div className="text-center text-muted-foreground py-20">
        工单不存在或无权访问
      </div>
    )
  }

  const publicComments = (ticket.comments ?? []).filter((c) => !c.is_internal)

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        返回工单列表
      </button>

      {/* Header card */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="text-xs font-mono text-accent">{ticket.ticket_no}</span>
          <StatusBadge
            status={ticket.status?.code ?? ''}
            label={ticket.status?.name ?? '—'}
          />
        </div>

        <h1 className="text-base font-semibold text-foreground mb-4">{ticket.title}</h1>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          <span>
            <span className="text-foreground/50 mr-1">类型</span>
            {ticket.type?.name ?? '—'}
          </span>
          <span>
            <span className="text-foreground/50 mr-1">提交时间</span>
            {formatDate(ticket.created_at)}
          </span>
          {ticket.assignee && (
            <span>
              <span className="text-foreground/50 mr-1">处理人</span>
              {ticket.assignee.real_name}
            </span>
          )}
          {ticket.resolved_at && (
            <span>
              <span className="text-foreground/50 mr-1">解决时间</span>
              {formatDate(ticket.resolved_at)}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {ticket.description && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-foreground mb-3">问题描述</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {ticket.description}
          </p>
        </div>
      )}

      {/* Attachments */}
      {ticket.attachments && ticket.attachments.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-1.5">
            <Paperclip className="h-4 w-4" strokeWidth={1.5} />
            附件
          </h2>
          <div className="flex flex-wrap gap-2">
            {ticket.attachments.map((att) => (
              <a
                key={att.id}
                href={att.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg
                  text-xs text-foreground hover:border-accent/40 hover:text-accent transition-colors"
              >
                <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="max-w-[160px] truncate">{att.file_name}</span>
                <span className="text-muted-foreground shrink-0">{formatFileSize(att.file_size)}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-medium text-foreground mb-4">
          跟进记录
          {publicComments.length > 0 && (
            <span className="ml-1.5 text-xs text-muted-foreground font-normal">
              ({publicComments.length})
            </span>
          )}
        </h2>

        {publicComments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">暂无回复记录</p>
        ) : (
          <div className="space-y-4 mb-5">
            {publicComments.map((c) => (
              <div key={c.id} className="flex gap-3">
                {/* Avatar */}
                <div className="h-7 w-7 shrink-0 rounded-full bg-accent/10 flex items-center justify-center
                  text-accent text-xs font-medium">
                  {getInitials(c.user?.real_name ?? '')}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-medium text-foreground">{c.user?.real_name ?? '—'}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {c.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comment input */}
        <form onSubmit={handleSend} className="border-t border-border pt-4">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="添加回复... (Ctrl+Enter 发送)"
              rows={3}
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground
                placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors resize-none"
            />
            <button
              type="submit"
              disabled={!comment.trim() || commentMutation.isPending}
              className="shrink-0 p-2.5 bg-accent text-accent-foreground rounded-lg
                hover:opacity-90 disabled:opacity-40 transition-opacity"
              title="发送"
            >
              <Send className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
          {commentMutation.isError && (
            <p className="text-destructive text-xs mt-1.5">
              发送失败，请重试
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
