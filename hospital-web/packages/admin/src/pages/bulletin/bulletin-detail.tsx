import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Send, Trash2, Pin } from 'lucide-react'
import {
  getBulletin,
  deleteBulletin,
  publishBulletin,
  StatusBadge,
  ConfirmDialog,
  Loading,
} from '@hospital/shared'
import { BulletinForm } from './bulletin-form'
import type { Bulletin } from '@hospital/shared'

const STATUS_MAP: Record<number, { key: string; label: string }> = {
  0: { key: 'draft', label: '草稿' },
  1: { key: 'published', label: '已发布' },
  2: { key: 'archived', label: '已归档' },
}

const SCOPE_TYPE_LABELS: Record<string, string> = {
  region: '大区',
  province: '省',
  all: '全部',
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  )
}

export function BulletinDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)

  const { data: bulletin, isLoading } = useQuery({
    queryKey: ['bulletin', id],
    queryFn: () => getBulletin(id!),
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteBulletin(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulletins'] })
      navigate('/bulletins')
    },
  })

  const publishMutation = useMutation({
    mutationFn: () => publishBulletin(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulletin', id] })
      queryClient.invalidateQueries({ queryKey: ['bulletins'] })
      setPublishOpen(false)
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading />
      </div>
    )
  }

  if (!bulletin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">公告不存在</p>
      </div>
    )
  }

  const statusInfo = STATUS_MAP[bulletin.status] ?? { key: 'draft', label: '草稿' }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/bulletins')}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors"
          >
            <ArrowLeft size={18} strokeWidth={1.5} />
          </button>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-foreground">{bulletin.title}</h1>
              {bulletin.is_pinned && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  <Pin size={11} strokeWidth={1.5} />
                  置顶
                </span>
              )}
              <StatusBadge status={statusInfo.key} label={statusInfo.label} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
          >
            <Pencil size={14} strokeWidth={1.5} />
            编辑
          </button>
          {bulletin.status === 0 && (
            <button
              onClick={() => setPublishOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-sm text-emerald-500 hover:bg-emerald-500/20 transition-colors"
            >
              <Send size={14} strokeWidth={1.5} />
              发布
            </button>
          )}
          <button
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/40 bg-destructive/10 text-sm text-destructive hover:bg-destructive/20 transition-colors"
          >
            <Trash2 size={14} strokeWidth={1.5} />
            删除
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetaItem
          label="范围"
          value={SCOPE_TYPE_LABELS[bulletin.scope_type] ?? bulletin.scope_type}
        />
        <MetaItem
          label="作者"
          value={bulletin.author?.real_name || bulletin.author?.username || '-'}
        />
        <MetaItem label="发布时间" value={formatDateTime(bulletin.published_at)} />
        <MetaItem label="过期时间" value={formatDateTime(bulletin.expires_at)} />
      </div>

      {/* Content */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">公告内容</h2>
        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {bulletin.content || <span className="text-muted-foreground italic">暂无内容</span>}
        </div>
      </div>

      {/* Edit Form */}
      <BulletinForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        bulletin={bulletin as Bulletin}
      />

      {/* Publish Confirm */}
      <ConfirmDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onConfirm={() => publishMutation.mutate()}
        title="发布公告"
        message={`确定要发布"${bulletin.title}"吗？发布后将对指定范围内用户可见。`}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="删除公告"
        message={`确定要删除"${bulletin.title}"吗？此操作不可撤销。`}
      />
    </div>
  )
}
