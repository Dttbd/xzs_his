import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listHospitals,
  deleteHospital,
  exportHospitals,
  listCategories,
  listProvinces,
  DataTable,
  Pagination,
  StatusBadge,
  ConfirmDialog,
  Loading,
  Empty,
  Button,
  Input,
  type Hospital,
  type Column,
} from '@hospital/shared'
import { Plus, Download, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { HospitalForm } from './hospital-form'

const LEVELS = ['三甲', '三乙', '二甲', '二乙', '一甲', '其他']

const STATUS_MAP: Record<number, { key: string; label: string }> = {
  1: { key: 'published', label: '启用' },
  0: { key: 'draft', label: '停用' },
}

export function HospitalListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Filter state
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [provinceId, setProvinceId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [level, setLevel] = useState('')
  const [status, setStatus] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Dialog state
  const [formOpen, setFormOpen] = useState(false)
  const [editHospital, setEditHospital] = useState<Hospital | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<Hospital | null>(null)

  const params: Record<string, any> = { page, page_size: 15 }
  if (keyword) params.keyword = keyword
  if (provinceId) params.province_id = provinceId
  if (categoryId) params.category_id = categoryId
  if (level) params.level = level
  if (status !== '') params.status = Number(status)

  const { data, isLoading } = useQuery({
    queryKey: ['hospitals', params],
    queryFn: () => listHospitals(params),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => listCategories(),
  })

  const { data: provinces = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => listProvinces(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHospital(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
    },
  })

  const handleExport = useCallback(async () => {
    try {
      const blob = await exportHospitals(params)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hospitals_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silent
    }
  }, [params])

  const handleEdit = useCallback((hospital: Hospital) => {
    setEditHospital(hospital)
    setFormOpen(true)
  }, [])

  const handleCreate = useCallback(() => {
    setEditHospital(undefined)
    setFormOpen(true)
  }, [])

  const handleFormClose = useCallback(() => {
    setFormOpen(false)
    setEditHospital(undefined)
  }, [])

  const selectClass =
    'border border-border bg-background rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent appearance-none'

  const columns: Column<Hospital>[] = [
    {
      key: 'name',
      title: '医院名称',
      render: (_: any, record: Hospital) => (
        <button
          className="text-accent hover:underline text-left"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/hospitals/${record.id}`)
          }}
        >
          {record.name}
        </button>
      ),
    },
    { key: 'code', title: '编码' },
    { key: 'level', title: '等级' },
    {
      key: 'province',
      title: '省份',
      render: (_: any, record: Hospital) => record.province?.name ?? '-',
    },
    { key: 'contact_name', title: '联系人' },
    {
      key: 'owner_user',
      title: '负责人',
      render: (_: any, record: Hospital) =>
        record.owner_user?.real_name ?? record.owner_user?.username ?? '-',
    },
    {
      key: 'status',
      title: '状态',
      render: (val: number) => {
        const s = STATUS_MAP[val] ?? { key: 'draft', label: '未知' }
        return <StatusBadge status={s.key} label={s.label} />
      },
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, record: Hospital) => (
        <div className="flex gap-2">
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              handleEdit(record)
            }}
          >
            编辑
          </Button>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-destructive"
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
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-foreground">医院管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" strokeWidth={1.5} />
            导出
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            新建医院
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border border-border bg-card">
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
        >
          <span className="inline-flex items-center gap-1.5">
            <Search className="h-4 w-4" strokeWidth={1.5} />
            筛选条件
          </span>
          {filtersOpen ? (
            <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
          )}
        </button>

        {filtersOpen && (
          <div className="border-t border-border px-4 pb-4 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <Input
                placeholder="搜索名称/编码"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value)
                  setPage(1)
                }}
              />
              <select
                className={selectClass}
                value={provinceId}
                onChange={(e) => {
                  setProvinceId(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">全部省份</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                className={selectClass}
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">全部分类</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                className={selectClass}
                value={level}
                onChange={(e) => {
                  setLevel(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">全部等级</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <select
                className={selectClass}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">全部状态</option>
                <option value="1">启用</option>
                <option value="0">停用</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <Loading />
      ) : !data || data.list.length === 0 ? (
        <Empty message="暂无医院数据" />
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

      {/* Form dialog */}
      <HospitalForm
        open={formOpen}
        onClose={handleFormClose}
        hospital={editHospital}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
        title="删除医院"
        message={`确定要删除"${deleteTarget?.name}"吗？此操作不可撤销。`}
      />
    </div>
  )
}
