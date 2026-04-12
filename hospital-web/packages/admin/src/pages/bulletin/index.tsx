import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Send, Eye, Pencil, Trash2 } from 'lucide-react'
import {
  listBulletins,
  deleteBulletin,
  publishBulletin,
  DataTable,
  Pagination,
  StatusBadge,
  ConfirmDialog,
  type Bulletin,
  type Column,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hospital/shared'
import { BulletinForm } from './bulletin-form'

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

function formatDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function BulletinListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [scopeTypeFilter, setScopeTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editBulletin, setEditBulletin] = useState<Bulletin | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<Bulletin | null>(null)
  const [publishTarget, setPublishTarget] = useState<Bulletin | null>(null)

  const pageSize = 15

  const params: Record<string, any> = { page, page_size: pageSize }
  if (scopeTypeFilter) params.scope_type = scopeTypeFilter
  if (statusFilter !== '') params.status = Number(statusFilter)

  const { data, isLoading } = useQuery({
    queryKey: ['bulletins', params],
    queryFn: () => listBulletins(params),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBulletin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulletins'] })
      setDeleteTarget(null)
    },
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) => publishBulletin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulletins'] })
      setPublishTarget(null)
    },
  })

  const handleEdit = (bulletin: Bulletin) => {
    setEditBulletin(bulletin)
    setFormOpen(true)
  }

  const handleCreate = () => {
    setEditBulletin(undefined)
    setFormOpen(true)
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setEditBulletin(undefined)
  }

  const columns: Column<Bulletin>[] = [
    {
      key: 'title',
      title: '标题',
      render: (_, record) => (
        <button
          className="text-accent hover:underline text-left font-medium"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/bulletins/${record.id}`)
          }}
        >
          {record.is_pinned ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-xs font-semibold text-amber-500 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">
                置顶
              </span>
              {record.title}
            </span>
          ) : (
            record.title
          )}
        </button>
      ),
    },
    {
      key: 'scope_type',
      title: '范围',
      render: (_, record) => (
        <span className="text-sm text-muted-foreground">
          {SCOPE_TYPE_LABELS[record.scope_type] ?? record.scope_type}
        </span>
      ),
    },
    {
      key: 'author',
      title: '作者',
      render: (_, record) => (
        <span className="text-sm">{record.author?.real_name || record.author?.username || '-'}</span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (val: number) => {
        const s = STATUS_MAP[val] ?? { key: 'draft', label: '草稿' }
        return <StatusBadge status={s.key} label={s.label} />
      },
    },
    {
      key: 'published_at',
      title: '发布时间',
      render: (_, record) => (
        <span className="text-sm text-muted-foreground">{formatDate(record.published_at)}</span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-0 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/bulletins/${record.id}`)
            }}
          >
            <Eye size={13} strokeWidth={1.5} />
            查看
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-0 gap-1 text-xs text-accent hover:text-accent"
            onClick={(e) => {
              e.stopPropagation()
              handleEdit(record)
            }}
          >
            <Pencil size={13} strokeWidth={1.5} />
            编辑
          </Button>
          {record.status === 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-0 gap-1 text-xs text-emerald-500 hover:text-emerald-500"
              onClick={(e) => {
                e.stopPropagation()
                setPublishTarget(record)
              }}
            >
              <Send size={13} strokeWidth={1.5} />
              发布
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-0 gap-1 text-xs text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              setDeleteTarget(record)
            }}
          >
            <Trash2 size={13} strokeWidth={1.5} />
            删除
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">公告管理</h1>
        <Button onClick={handleCreate}>
          <Plus size={16} strokeWidth={1.5} />
          新建公告
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={scopeTypeFilter || '__all__'}
          onValueChange={(v) => {
            setScopeTypeFilter(v === '__all__' ? '' : v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="全部范围" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部范围</SelectItem>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="region">大区</SelectItem>
            <SelectItem value="province">省</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusFilter || '__all__'}
          onValueChange={(v) => {
            setStatusFilter(v === '__all__' ? '' : v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部状态</SelectItem>
            <SelectItem value="0">草稿</SelectItem>
            <SelectItem value="1">已发布</SelectItem>
            <SelectItem value="2">已归档</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable<Bulletin>
        columns={columns}
        data={data?.list || []}
        loading={isLoading}
        onRowClick={(record) => navigate(`/bulletins/${record.id}`)}
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

      {/* Form Dialog */}
      <BulletinForm open={formOpen} onClose={handleFormClose} bulletin={editBulletin} />

      {/* Publish Confirm */}
      <ConfirmDialog
        open={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        onConfirm={() => {
          if (publishTarget) publishMutation.mutate(publishTarget.id)
        }}
        title="发布公告"
        message={`确定要发布"${publishTarget?.title}"吗？发布后将对指定范围内用户可见。`}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
        title="删除公告"
        message={`确定要删除"${deleteTarget?.title}"吗？此操作不可撤销。`}
      />
    </div>
  )
}
