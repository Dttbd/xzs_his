import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listTicketTypes,
  createTicketType,
  updateTicketType,
  deleteTicketType,
  listTicketStatuses,
  createTicketStatus,
  updateTicketStatus,
  deleteTicketStatus,
  listTransitions,
  createTransition,
  updateTransition,
  deleteTransition,
  listRoles,
  ConfirmDialog,
  Loading,
  Empty,
  type TicketType,
  type TicketStatus,
  type TicketTransition,
  type Role,
} from '@hospital/shared'
import { Plus, X, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react'

const inputClass =
  'w-full border border-border bg-background rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent'
const selectClass =
  'w-full border border-border bg-background rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent appearance-none'
const labelClass = 'block text-sm font-medium text-foreground mb-1'

// ---- Toggle button ----
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-accent' : 'bg-border'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

// ---- Dialog wrapper ----
interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  isPending: boolean
  isEdit: boolean
}

function FormDialog({ open, onClose, title, children, onSubmit, isPending, isEdit }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-background transition-colors">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="space-y-4">{children}</div>
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-accent text-accent-foreground px-4 py-2 text-sm hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? '保存中...' : isEdit ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---- Ticket Types ----
function TicketTypesSection() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<TicketType | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<TicketType | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [icon, setIcon] = useState('')
  const [isActive, setIsActive] = useState(true)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['ticket-types'],
    queryFn: () => listTicketTypes(),
  })

  const mutation = useMutation({
    mutationFn: (payload: Partial<TicketType>) =>
      editItem ? updateTicketType(editItem.id, payload) : createTicketType(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-types'] })
      setFormOpen(false)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTicketType(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ticket-types'] }),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateTicketType(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ticket-types'] }),
  })

  function openCreate() {
    setEditItem(undefined)
    setName('')
    setCode('')
    setIcon('')
    setIsActive(true)
    setFormOpen(true)
  }

  function openEdit(item: TicketType) {
    setEditItem(item)
    setName(item.name)
    setCode(item.code)
    setIcon(item.icon ?? '')
    setIsActive(item.is_active)
    setFormOpen(true)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-foreground">工单类型</h4>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-accent hover:bg-accent/10 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          新增
        </button>
      </div>

      {isLoading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty message="暂无工单类型" />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <th className="py-2 text-left font-medium">名称</th>
              <th className="py-2 text-left font-medium">编码</th>
              <th className="py-2 text-left font-medium">图标</th>
              <th className="py-2 text-left font-medium">启用</th>
              <th className="py-2 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border/50">
                <td className="py-2 text-foreground">{item.name}</td>
                <td className="py-2 text-muted-foreground">{item.code}</td>
                <td className="py-2 text-muted-foreground">{item.icon || '-'}</td>
                <td className="py-2">
                  <Toggle
                    checked={item.is_active}
                    onChange={(v) => toggleMut.mutate({ id: item.id, is_active: v })}
                  />
                </td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="rounded p-1 hover:bg-background transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="rounded p-1 hover:bg-background transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editItem ? '编辑工单类型' : '新建工单类型'}
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate({ name, code, icon, is_active: isActive })
        }}
        isPending={mutation.isPending}
        isEdit={!!editItem}
      >
        <div>
          <label className={labelClass}>名称 <span className="text-destructive">*</span></label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="工单类型名称" required />
        </div>
        <div>
          <label className={labelClass}>编码 <span className="text-destructive">*</span></label>
          <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="如: incident, request" required />
        </div>
        <div>
          <label className={labelClass}>图标</label>
          <input className={inputClass} value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="图标名称" />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-foreground">启用</label>
          <Toggle checked={isActive} onChange={setIsActive} />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget.id)
        }}
        title="删除工单类型"
        message={`确定要删除"${deleteTarget?.name}"吗？`}
      />
    </>
  )
}

// ---- Ticket Statuses ----
function TicketStatusesSection() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<TicketStatus | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<TicketStatus | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [isInitial, setIsInitial] = useState(false)
  const [isTerminal, setIsTerminal] = useState(false)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['ticket-statuses'],
    queryFn: () => listTicketStatuses(),
  })

  const mutation = useMutation({
    mutationFn: (payload: Partial<TicketStatus>) =>
      editItem ? updateTicketStatus(editItem.id, payload) : createTicketStatus(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-statuses'] })
      setFormOpen(false)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTicketStatus(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ticket-statuses'] }),
  })

  function openCreate() {
    setEditItem(undefined)
    setName('')
    setCode('')
    setColor('#6366f1')
    setIsInitial(false)
    setIsTerminal(false)
    setFormOpen(true)
  }

  function openEdit(item: TicketStatus) {
    setEditItem(item)
    setName(item.name)
    setCode(item.code)
    setColor(item.color ?? '#6366f1')
    setIsInitial(item.is_initial)
    setIsTerminal(item.is_terminal)
    setFormOpen(true)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-foreground">工单状态</h4>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-accent hover:bg-accent/10 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          新增
        </button>
      </div>

      {isLoading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty message="暂无工单状态" />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <th className="py-2 text-left font-medium">名称</th>
              <th className="py-2 text-left font-medium">编码</th>
              <th className="py-2 text-left font-medium">颜色</th>
              <th className="py-2 text-left font-medium">初始</th>
              <th className="py-2 text-left font-medium">终态</th>
              <th className="py-2 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border/50">
                <td className="py-2 text-foreground">{item.name}</td>
                <td className="py-2 text-muted-foreground">{item.code}</td>
                <td className="py-2">
                  <span
                    className="inline-block h-4 w-4 rounded"
                    style={{ backgroundColor: item.color }}
                  />
                </td>
                <td className="py-2">
                  {item.is_initial ? (
                    <span className="text-xs text-accent">是</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">否</span>
                  )}
                </td>
                <td className="py-2">
                  {item.is_terminal ? (
                    <span className="text-xs text-accent">是</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">否</span>
                  )}
                </td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="rounded p-1 hover:bg-background transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="rounded p-1 hover:bg-background transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editItem ? '编辑工单状态' : '新建工单状态'}
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate({ name, code, color, is_initial: isInitial, is_terminal: isTerminal })
        }}
        isPending={mutation.isPending}
        isEdit={!!editItem}
      >
        <div>
          <label className={labelClass}>名称 <span className="text-destructive">*</span></label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="状态名称" required />
        </div>
        <div>
          <label className={labelClass}>编码 <span className="text-destructive">*</span></label>
          <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="如: open, closed" required />
        </div>
        <div>
          <label className={labelClass}>颜色</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-14 rounded cursor-pointer border border-border bg-background"
            />
            <input
              className={inputClass}
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#6366f1"
            />
          </div>
        </div>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <label className="text-sm text-foreground">初始状态</label>
            <Toggle checked={isInitial} onChange={setIsInitial} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-foreground">终态</label>
            <Toggle checked={isTerminal} onChange={setIsTerminal} />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget.id)
        }}
        title="删除工单状态"
        message={`确定要删除"${deleteTarget?.name}"吗？`}
      />
    </>
  )
}

// ---- Ticket Transitions ----
function TicketTransitionsSection() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<TicketTransition | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<TicketTransition | null>(null)
  const [fromStatusId, setFromStatusId] = useState('')
  const [toStatusId, setToStatusId] = useState('')
  const [name, setName] = useState('')
  const [allowedRoles, setAllowedRoles] = useState('')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['transitions'],
    queryFn: () => listTransitions(),
  })

  const { data: statuses = [] } = useQuery({
    queryKey: ['ticket-statuses'],
    queryFn: () => listTicketStatuses(),
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => listRoles(),
  })

  const mutation = useMutation({
    mutationFn: (payload: Partial<TicketTransition>) =>
      editItem ? updateTransition(editItem.id, payload) : createTransition(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transitions'] })
      setFormOpen(false)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTransition(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transitions'] }),
  })

  function openCreate() {
    setEditItem(undefined)
    setFromStatusId('')
    setToStatusId('')
    setName('')
    setAllowedRoles('')
    setFormOpen(true)
  }

  function openEdit(item: TicketTransition) {
    setEditItem(item)
    setFromStatusId(item.from_status_id)
    setToStatusId(item.to_status_id)
    setName(item.name)
    setAllowedRoles(item.allowed_roles ?? '')
    setFormOpen(true)
  }

  const statusName = (id: string) => statuses.find((s) => s.id === id)?.name ?? id

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-foreground">流转规则</h4>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-accent hover:bg-accent/10 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          新增
        </button>
      </div>

      {isLoading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty message="暂无流转规则" />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <th className="py-2 text-left font-medium">名称</th>
              <th className="py-2 text-left font-medium">来源状态</th>
              <th className="py-2 text-left font-medium">目标状态</th>
              <th className="py-2 text-left font-medium">允许角色</th>
              <th className="py-2 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border/50">
                <td className="py-2 text-foreground">{item.name}</td>
                <td className="py-2 text-muted-foreground">
                  {item.from_status?.name ?? statusName(item.from_status_id)}
                </td>
                <td className="py-2 text-muted-foreground">
                  {item.to_status?.name ?? statusName(item.to_status_id)}
                </td>
                <td className="py-2 text-muted-foreground max-w-[160px] truncate">
                  {item.allowed_roles || '-'}
                </td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="rounded p-1 hover:bg-background transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="rounded p-1 hover:bg-background transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editItem ? '编辑流转规则' : '新建流转规则'}
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate({
            name,
            from_status_id: fromStatusId,
            to_status_id: toStatusId,
            allowed_roles: allowedRoles,
          })
        }}
        isPending={mutation.isPending}
        isEdit={!!editItem}
      >
        <div>
          <label className={labelClass}>规则名称 <span className="text-destructive">*</span></label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="如: 关闭工单" required />
        </div>
        <div>
          <label className={labelClass}>来源状态 <span className="text-destructive">*</span></label>
          <select className={selectClass} value={fromStatusId} onChange={(e) => setFromStatusId(e.target.value)} required>
            <option value="">请选择来源状态</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>目标状态 <span className="text-destructive">*</span></label>
          <select className={selectClass} value={toStatusId} onChange={(e) => setToStatusId(e.target.value)} required>
            <option value="">请选择目标状态</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>允许角色</label>
          <div className="flex flex-wrap gap-2">
            {roles.map((role: Role) => {
              const rolesArr = allowedRoles ? allowedRoles.split(',').map((r) => r.trim()) : []
              const checked = rolesArr.includes(role.code)
              return (
                <label key={role.id} className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-border accent-accent"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? rolesArr.filter((r) => r !== role.code)
                        : [...rolesArr, role.code]
                      setAllowedRoles(next.join(','))
                    }}
                  />
                  <span className="text-sm text-foreground">{role.name}</span>
                </label>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">留空表示所有角色均可操作</p>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget.id)
        }}
        title="删除流转规则"
        message={`确定要删除"${deleteTarget?.name}"吗？`}
      />
    </>
  )
}

// ---- Accordion section ----
function AccordionSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        {title}
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        )}
      </button>
      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 overflow-x-auto">
          {children}
        </div>
      )}
    </div>
  )
}

export function TicketConfig() {
  return (
    <div className="space-y-4">
      <AccordionSection title="工单类型" defaultOpen>
        <TicketTypesSection />
      </AccordionSection>
      <AccordionSection title="工单状态">
        <TicketStatusesSection />
      </AccordionSection>
      <AccordionSection title="流转规则">
        <TicketTransitionsSection />
      </AccordionSection>
    </div>
  )
}
