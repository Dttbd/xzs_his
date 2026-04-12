import { useState, useEffect } from 'react'
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
  Button,
  Input,
  Label,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@hospital/shared'
import { Plus, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface RoleFormProps {
  open: boolean
  onClose: () => void
  role?: Role
}

const errorClass = 'text-xs text-destructive mt-1'

function RoleForm({ open, onClose, role }: RoleFormProps) {
  const queryClient = useQueryClient()
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑角色' : '新建角色'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div>
              <Label>
                角色名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1"
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
              <Label>
                角色编码 <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1"
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
              <Label>描述</Label>
              <Textarea
                className="mt-1 resize-none"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请输入角色描述"
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? '保存中...' : isEdit ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-0 text-xs text-accent hover:text-accent"
            onClick={(e) => {
              e.stopPropagation()
              setEditRole(record)
              setFormOpen(true)
            }}
          >
            编辑
          </Button>
          {!record.is_system && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-0 text-xs text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                setDeleteTarget(record)
              }}
            >
              删除
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/users')}
            className="p-1.5"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">角色管理</h1>
        </div>
        <Button
          onClick={() => {
            setEditRole(undefined)
            setFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          新建角色
        </Button>
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
