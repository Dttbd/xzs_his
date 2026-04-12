import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  listUsers,
  deleteUser,
  updateUser,
  DataTable,
  Pagination,
  StatusBadge,
  ConfirmDialog,
  Loading,
  Empty,
  type Column,
  Button,
} from '@hospital/shared'
import type { UserInfo, Role } from '@hospital/shared'
import { Plus, Shield } from 'lucide-react'
import { UserForm } from './user-form'

export function UserListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserInfo | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<UserInfo | null>(null)
  const [toggleTarget, setToggleTarget] = useState<UserInfo | null>(null)

  const params = { page, page_size: 15 }

  const { data, isLoading } = useQuery({
    queryKey: ['users', params],
    queryFn: () => listUsers(params),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: number }) =>
      updateUser(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setToggleTarget(null)
    },
  })

  const handleEdit = useCallback((u: UserInfo) => {
    setEditUser(u)
    setFormOpen(true)
  }, [])

  const handleCreate = useCallback(() => {
    setEditUser(undefined)
    setFormOpen(true)
  }, [])

  const handleFormClose = useCallback(() => {
    setFormOpen(false)
    setEditUser(undefined)
  }, [])

  const columns: Column<UserInfo>[] = [
    {
      key: 'username',
      title: '用户名',
      render: (_: any, record: UserInfo) => (
        <span className="font-medium text-foreground">{record.username}</span>
      ),
    },
    {
      key: 'real_name',
      title: '姓名',
      render: (val: string) => val || '-',
    },
    {
      key: 'phone',
      title: '手机号',
      render: (val: string) => val || '-',
    },
    {
      key: 'region',
      title: '大区',
      render: (_: any, record: UserInfo) => (record as any).region?.name ?? '-',
    },
    {
      key: 'province',
      title: '省份',
      render: (_: any, record: UserInfo) => (record as any).province?.name ?? '-',
    },
    {
      key: 'roles',
      title: '角色',
      render: (_: any, record: UserInfo) => {
        const roles: Role[] = (record as any).roles ?? []
        if (roles.length === 0) return <span className="text-muted-foreground text-xs">-</span>
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent"
              >
                {r.name}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      key: 'status',
      title: '状态',
      render: (val: number) => (
        <StatusBadge
          status={val === 1 ? 'published' : 'draft'}
          label={val === 1 ? '启用' : '停用'}
        />
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, record: UserInfo) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-0 text-xs text-accent hover:text-accent"
            onClick={(e) => {
              e.stopPropagation()
              handleEdit(record)
            }}
          >
            编辑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              setToggleTarget(record)
            }}
          >
            {record.status === 1 ? '停用' : '启用'}
          </Button>
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
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-foreground">用户管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/users/roles')}>
            <Shield className="h-4 w-4" strokeWidth={1.5} />
            角色管理
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            新建用户
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Loading />
      ) : !data || data.list.length === 0 ? (
        <Empty message="暂无用户数据" />
      ) : (
        <>
          <DataTable columns={columns} data={data.list} />
          <Pagination
            page={data.page}
            pageSize={data.page_size}
            total={data.total}
            onChange={setPage}
          />
        </>
      )}

      <UserForm open={formOpen} onClose={handleFormClose} user={editUser} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
        title="删除用户"
        message={`确定要删除用户"${deleteTarget?.username}"吗？此操作不可撤销。`}
      />

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={() => {
          if (toggleTarget) {
            toggleMutation.mutate({
              id: toggleTarget.id,
              status: toggleTarget.status === 1 ? 0 : 1,
            })
          }
        }}
        title={toggleTarget?.status === 1 ? '停用用户' : '启用用户'}
        message={`确定要${toggleTarget?.status === 1 ? '停用' : '启用'}用户"${toggleTarget?.username}"吗？`}
      />
    </div>
  )
}
