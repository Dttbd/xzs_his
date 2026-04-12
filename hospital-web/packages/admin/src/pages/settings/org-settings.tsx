import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listRegions,
  listProvinces,
  createRegion,
  updateRegion,
  deleteRegion,
  createProvince,
  updateProvince,
  deleteProvince,
  listUsers,
  ConfirmDialog,
  Loading,
  type Region,
  type Province,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hospital/shared'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

interface InlineInputProps {
  value: string
  onChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
  placeholder?: string
}

function InlineInput({ value, onChange, onConfirm, onCancel, placeholder }: InlineInputProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        className="flex-1 h-8 py-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') onConfirm()
          if (e.key === 'Escape') onCancel()
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onConfirm}
        className="p-1 h-auto text-accent hover:bg-accent/10"
      >
        <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="p-1 h-auto text-muted-foreground"
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
      </Button>
    </div>
  )
}

export function OrgSettings() {
  const queryClient = useQueryClient()

  const [selectedRegionId, setSelectedRegionId] = useState<string>('')
  const [addingRegion, setAddingRegion] = useState(false)
  const [newRegionName, setNewRegionName] = useState('')
  const [editRegion, setEditRegion] = useState<Region | null>(null)
  const [editRegionName, setEditRegionName] = useState('')
  const [deleteRegionTarget, setDeleteRegionTarget] = useState<Region | null>(null)

  const [addingProvince, setAddingProvince] = useState(false)
  const [newProvinceName, setNewProvinceName] = useState('')
  const [editProvince, setEditProvince] = useState<Province | null>(null)
  const [editProvinceName, setEditProvinceName] = useState('')
  const [deleteProvinceTarget, setDeleteProvinceTarget] = useState<Province | null>(null)

  const { data: regions = [], isLoading: regionsLoading } = useQuery({
    queryKey: ['regions'],
    queryFn: () => listRegions(),
  })

  const { data: allProvinces = [], isLoading: provincesLoading } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => listProvinces(),
  })

  const { data: usersPage } = useQuery({
    queryKey: ['users', { page_size: 200 }],
    queryFn: () => listUsers({ page_size: 200 }),
  })
  const users = usersPage?.list ?? []

  const filteredProvinces = selectedRegionId
    ? allProvinces.filter((p) => p.region_id === selectedRegionId)
    : allProvinces

  const createRegionMut = useMutation({
    mutationFn: (name: string) => createRegion({ name, code: name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] })
      setAddingRegion(false)
      setNewRegionName('')
    },
  })

  const updateRegionMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateRegion(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] })
      setEditRegion(null)
    },
  })

  const deleteRegionMut = useMutation({
    mutationFn: (id: string) => deleteRegion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] })
      if (selectedRegionId === deleteRegionTarget?.id) setSelectedRegionId('')
      setDeleteRegionTarget(null)
    },
  })

  const createProvinceMut = useMutation({
    mutationFn: (name: string) =>
      createProvince({ name, code: name, region_id: selectedRegionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provinces'] })
      setAddingProvince(false)
      setNewProvinceName('')
    },
  })

  const updateProvinceMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Province> }) =>
      updateProvince(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provinces'] })
      setEditProvince(null)
    },
  })

  const deleteProvinceMut = useMutation({
    mutationFn: (id: string) => deleteProvince(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provinces'] })
      setDeleteProvinceTarget(null)
    },
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Regions */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">大区管理</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2.5 py-1 text-xs text-accent hover:bg-accent/10"
            onClick={() => {
              setAddingRegion(true)
              setNewRegionName('')
            }}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            新增
          </Button>
        </div>

        {regionsLoading ? (
          <Loading />
        ) : (
          <div className="space-y-1">
            {addingRegion && (
              <div className="py-1 px-2">
                <InlineInput
                  value={newRegionName}
                  onChange={setNewRegionName}
                  onConfirm={() => {
                    if (newRegionName.trim()) createRegionMut.mutate(newRegionName.trim())
                  }}
                  onCancel={() => setAddingRegion(false)}
                  placeholder="请输入大区名称"
                />
              </div>
            )}
            {regions.map((region) => (
              <div
                key={region.id}
                onClick={() =>
                  setSelectedRegionId((prev) => (prev === region.id ? '' : region.id))
                }
                className={`group flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                  selectedRegionId === region.id
                    ? 'bg-accent/10 text-accent'
                    : 'hover:bg-background text-foreground'
                }`}
              >
                {editRegion?.id === region.id ? (
                  <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                    <InlineInput
                      value={editRegionName}
                      onChange={setEditRegionName}
                      onConfirm={() => {
                        if (editRegionName.trim())
                          updateRegionMut.mutate({ id: region.id, name: editRegionName.trim() })
                      }}
                      onCancel={() => setEditRegion(null)}
                    />
                  </div>
                ) : (
                  <>
                    <span className="text-sm">{region.name}</span>
                    <div
                      className="hidden group-hover:flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setEditRegion(region)
                          setEditRegionName(region.name)
                        }}
                        className="rounded p-1 hover:bg-background transition-colors"
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => setDeleteRegionTarget(region)}
                        className="rounded p-1 hover:bg-background transition-colors"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" strokeWidth={1.5} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {regions.length === 0 && !addingRegion && (
              <p className="text-center text-sm text-muted-foreground py-4">暂无大区</p>
            )}
          </div>
        )}
      </div>

      {/* Provinces */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            省份管理
            {selectedRegionId && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                — {regions.find((r) => r.id === selectedRegionId)?.name}
              </span>
            )}
          </h3>
          {selectedRegionId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2.5 py-1 text-xs text-accent hover:bg-accent/10"
              onClick={() => {
                setAddingProvince(true)
                setNewProvinceName('')
              }}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              新增
            </Button>
          )}
        </div>

        {!selectedRegionId ? (
          <p className="text-center text-sm text-muted-foreground py-4">请先选择大区</p>
        ) : provincesLoading ? (
          <Loading />
        ) : (
          <div className="space-y-1">
            {addingProvince && (
              <div className="py-1 px-2">
                <InlineInput
                  value={newProvinceName}
                  onChange={setNewProvinceName}
                  onConfirm={() => {
                    if (newProvinceName.trim()) createProvinceMut.mutate(newProvinceName.trim())
                  }}
                  onCancel={() => setAddingProvince(false)}
                  placeholder="请输入省份名称"
                />
              </div>
            )}
            {filteredProvinces.map((province) => (
              <div
                key={province.id}
                className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-background transition-colors"
              >
                {editProvince?.id === province.id ? (
                  <div className="flex-1">
                    <InlineInput
                      value={editProvinceName}
                      onChange={setEditProvinceName}
                      onConfirm={() => {
                        if (editProvinceName.trim())
                          updateProvinceMut.mutate({
                            id: province.id,
                            payload: { name: editProvinceName.trim() },
                          })
                      }}
                      onCancel={() => setEditProvince(null)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm text-foreground">{province.name}</span>
                      {province.default_handler && (
                        <span className="text-xs text-muted-foreground">
                          默认负责人:{' '}
                          {users.find((u: any) => u.id === province.default_handler)?.real_name ??
                            province.default_handler}
                        </span>
                      )}
                    </div>
                    <div className="hidden group-hover:flex items-center gap-1">
                      <Select
                        value={province.default_handler ?? '__none__'}
                        onValueChange={(v) =>
                          updateProvinceMut.mutate({
                            id: province.id,
                            payload: { default_handler: v === '__none__' ? null : v },
                          })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs py-1 max-w-[120px]" onClick={(e) => e.stopPropagation()}>
                          <SelectValue placeholder="默认负责人" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">默认负责人</SelectItem>
                          {users.map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.real_name || u.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => {
                          setEditProvince(province)
                          setEditProvinceName(province.name)
                        }}
                        className="rounded p-1 hover:bg-card transition-colors"
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => setDeleteProvinceTarget(province)}
                        className="rounded p-1 hover:bg-card transition-colors"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" strokeWidth={1.5} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {filteredProvinces.length === 0 && !addingProvince && (
              <p className="text-center text-sm text-muted-foreground py-4">暂无省份</p>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteRegionTarget}
        onClose={() => setDeleteRegionTarget(null)}
        onConfirm={() => {
          if (deleteRegionTarget) deleteRegionMut.mutate(deleteRegionTarget.id)
        }}
        title="删除大区"
        message={`确定要删除大区"${deleteRegionTarget?.name}"吗？`}
      />

      <ConfirmDialog
        open={!!deleteProvinceTarget}
        onClose={() => setDeleteProvinceTarget(null)}
        onConfirm={() => {
          if (deleteProvinceTarget) deleteProvinceMut.mutate(deleteProvinceTarget.id)
        }}
        title="删除省份"
        message={`确定要删除省份"${deleteProvinceTarget?.name}"吗？`}
      />
    </div>
  )
}
