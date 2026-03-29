import { useState } from 'react'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { createPortalTicket, listTicketTypes } from '@hospital/shared'
import { X } from 'lucide-react'

interface TicketCreateDialogProps {
  open: boolean
  onClose: () => void
}

export function TicketCreateDialog({ open, onClose }: TicketCreateDialogProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [typeId, setTypeId] = useState('')
  const [error, setError] = useState('')

  const { data: types = [] } = useQuery({
    queryKey: ['ticket-types'],
    queryFn: () => listTicketTypes(),
    enabled: open,
  })

  const mutation = useMutation({
    mutationFn: () => createPortalTicket({ title, description, type_id: typeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-tickets'] })
      handleClose()
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        '提交失败，请重试'
      setError(message)
    },
  })

  function handleClose() {
    setTitle('')
    setDescription('')
    setTypeId('')
    setError('')
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!title.trim()) { setError('请填写工单标题'); return }
    if (!typeId) { setError('请选择工单类型'); return }
    mutation.mutate()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md bg-card border border-border rounded-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-foreground">提交工单</h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
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
              placeholder="请简述您的问题"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground
                placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm text-foreground mb-1.5">
              工单类型 <span className="text-destructive">*</span>
            </label>
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground
                outline-none focus:border-accent transition-colors appearance-none"
            >
              <option value="">请选择类型</option>
              {types.filter((t) => t.is_active).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-foreground mb-1.5">
              详细描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请详细描述您的问题，以便我们更快处理"
              rows={5}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground
                placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors resize-none"
            />
          </div>

          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2 border border-border rounded-lg text-sm text-muted-foreground
                hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium
                hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {mutation.isPending ? '提交中...' : '提交工单'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
