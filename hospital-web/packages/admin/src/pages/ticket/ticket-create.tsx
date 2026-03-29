import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import {
  createTicket,
  listTicketTypes,
  listHospitals,
  listUsers,
} from '@hospital/shared'

interface TicketCreateDialogProps {
  open: boolean
  onClose: () => void
}

const priorityOptions = [
  { value: 1, label: '低' },
  { value: 2, label: '中' },
  { value: 3, label: '高' },
  { value: 4, label: '紧急' },
]

export function TicketCreateDialog({ open, onClose }: TicketCreateDialogProps) {
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [typeId, setTypeId] = useState('')
  const [priority, setPriority] = useState(2)
  const [hospitalId, setHospitalId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [hospitalKeyword, setHospitalKeyword] = useState('')
  const [error, setError] = useState('')

  // Fetch options
  const { data: ticketTypes } = useQuery({
    queryKey: ['ticket-types'],
    queryFn: () => listTicketTypes(),
    enabled: open,
  })

  const { data: hospitalsResult } = useQuery({
    queryKey: ['hospitals-search', hospitalKeyword],
    queryFn: () => listHospitals({ keyword: hospitalKeyword, page: 1, page_size: 20 }),
    enabled: open,
  })

  const { data: usersResult } = useQuery({
    queryKey: ['users-select'],
    queryFn: () => listUsers({ page: 1, page_size: 100 }),
    enabled: open,
  })

  const mutation = useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      resetForm()
      onClose()
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || err?.message || '创建失败')
    },
  })

  function resetForm() {
    setTitle('')
    setDescription('')
    setTypeId('')
    setPriority(2)
    setHospitalId('')
    setAssigneeId('')
    setHospitalKeyword('')
    setError('')
  }

  useEffect(() => {
    if (!open) resetForm()
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('请输入标题')
      return
    }
    setError('')
    mutation.mutate({
      title: title.trim(),
      description: description.trim(),
      type_id: typeId || undefined,
      priority,
      hospital_id: hospitalId || null,
      assignee_id: assigneeId || null,
    })
  }

  if (!open) return null

  const inputClass =
    'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">创建工单</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm text-foreground mb-1.5">
              标题 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入工单标题"
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-foreground mb-1.5">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入工单描述"
              rows={4}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Type + Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-foreground mb-1.5">工单类型</label>
              <select
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
                className={inputClass}
              >
                <option value="">请选择</option>
                {ticketTypes?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-foreground mb-1.5">优先级</label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className={inputClass}
              >
                {priorityOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hospital */}
          <div>
            <label className="block text-sm text-foreground mb-1.5">关联医院</label>
            <select
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
              className={inputClass}
            >
              <option value="">不关联</option>
              {hospitalsResult?.list?.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm text-foreground mb-1.5">处理人</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className={inputClass}
            >
              <option value="">暂不指派</option>
              {usersResult?.list?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.real_name || u.username}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-border rounded-lg text-foreground hover:bg-background transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {mutation.isPending ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
