import { useState } from 'react'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import {
  createPortalTicket,
  listTicketTypes,
  Button,
  Input,
  Label,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hospital/shared'

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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>提交工单</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <Label>
              标题 <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请简述您的问题"
              className="mt-1.5"
            />
          </div>

          {/* Type */}
          <div>
            <Label>
              工单类型 <span className="text-destructive">*</span>
            </Label>
            <Select value={typeId || '__none__'} onValueChange={(v) => setTypeId(v === '__none__' ? '' : v)}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue placeholder="请选择类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">请选择类型</SelectItem>
                {types.filter((t) => t.is_active).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label>详细描述</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请详细描述您的问题，以便我们更快处理"
              rows={5}
              className="mt-1.5 resize-none"
            />
          </div>

          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              取消
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1"
            >
              {mutation.isPending ? '提交中...' : '提交工单'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
