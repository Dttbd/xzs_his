import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  DataTable,
  StatusBadge,
  ConfirmDialog,
  Loading,
  Empty,
  type Role,
  type Column,
} from '@hospital/shared'
import { Plus, X, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface RoleFormProps {
  open: boolean
  onClose: () => void
  role?: Role
}

function RoleForm({ open, onClose, role }: RoleFormProps) {
  const queryClient = useQueryClient()
  const overlayRef = useRef<HTMLDivElement>(null)
  const isEdit = !!role

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setName(role?.name ?? '')
      setCode(role?.code ?? '')
      setDescription(role?.description ?? '')
      setErrors({})
    }
  }, [open, role])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const mutation = useMutation({
    mutationFn: (payload: Partial<Role>) =>
      isEdit ? updateRole(role!.id, payload) : createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      onClose()
    },
  })

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = '请输入角色名称'
    if (!code.trim()) errs.code = '请输入角色编码'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate({ name, code, description })
  }

  if (!open) return null

  const inputClass =
    'w-full border border-border bg-background rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent'
  const labelClass = 'block text-sm font-medium text-foreground mb-1'
  const errorClass = 'text-xs text-destructive mt-1'

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? '编辑角色' : '新建角色'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-background"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>
                角色名称 <span className="text-destructive">*</span>
              </label>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errors.name) setErrors((p) => ({ ...p, name: '' }))
                }}
                placeholder="请输入角色名称"
              />
              {errors.name && <p className={errorClass}>{errors.name}</p>}
            </div>
            <div>
              <label className={labelClass}>
                角色编码 <span className="text-destructive">*</span>
              </label>
              <input
                className={inputClass}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  if (errors.code) setErrors((p) => ({ ...p, code: '' }))
                }}
                placeholder="如: admin, viewer"
                disabled={isEdit && role?.is_system}
              />
              {errors.code && <p className={errorClass}>{errors.code}</p>}
            </div>
            <div>
              <label className={labelClass}>描述</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请输入角色描述"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-background"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-lg bg-accent text-accent-foreground px-4 py-2 text-sm transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              {mutation.isPending ? '保存中...' : isEdit ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function RoleListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editRole, setEditRole] = useState<Role | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => listRoles(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })

  const columns: Column<Role>[] = [
    {
      key: 'name',
      title: '角色名称',
      render: (val: string) => (
        <span className="font-medium text-foreground">{val}</span>
      ),
    },
    { key: 'code', title: '编码' },
    {
      key: 'description',
      title: '描述',
      render: (val: string) => val || '-',
    },
    {
      key: 'is_system',
      title: '类型',
      render: (val: boolean) =>
        val ? (
          <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
            系统角色
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">自定义</span>
        ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, record: Role) => (
        <div className="flex gap-2">
          <button
            className="text-xs text-accent hover:underline"
            onClick={(e) => {
              e.stopPropagation()
              setEditRole(record)
              setFormOpen(true)
            }}
          >
            编辑
          </button>
          {!record.is_system && (
            <button
              className="text-xs text-destructive hover:underline"
              onClick={(e) => {
                e.stopPropagation()
                setDeleteTarget(record)
              }}
            >
              删除
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/users')}
            className="rounded-lg p-1.5 transition-colors hover:bg-background"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <h1 className="text-xl font-semibold text-foreground">角色管理</h1>
        </div>
        <button
          onClick={() => {
            setEditRole(undefined)
            setFormOpen(true)
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-accent-foreground px-4 py-2 text-sm transition-colors hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          新建角色
        </button>
      </div>

      {isLoading ? (
        <Loading />
      ) : roles.length === 0 ? (
        <Empty message="暂无角色数据" />
      ) : (
        <DataTable columns={columns} data={roles} />
      )}

      <RoleForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditRole(undefined)
        }}
        role={editRole}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
        title="删除角色"
        message={`确定要删除角色"${deleteTarget?.name}"吗？此操作不可撤销。`}
      />
    </div>
  )
}
