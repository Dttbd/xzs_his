import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTicket,
  listTicketTypes,
  listHospitals,
  listUsers,
  Button,
  Input,
  Label,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

const ticketSchema = z.object({
  title: z.string().min(1, '请输入工单标题').max(200),
  description: z.string().optional(),
  type_id: z.string().optional(),
  priority: z.number().min(1).max(4),
  hospital_id: z.string().optional(),
  assignee_id: z.string().optional(),
})

type TicketFormData = z.infer<typeof ticketSchema>

const emptyDefaults: TicketFormData = {
  title: '',
  description: '',
  type_id: '',
  priority: 2,
  hospital_id: '',
  assignee_id: '',
}

export function TicketCreateDialog({ open, onClose }: TicketCreateDialogProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: emptyDefaults,
  })

  // Fetch options
  const { data: ticketTypes } = useQuery({
    queryKey: ['ticket-types'],
    queryFn: () => listTicketTypes(),
    enabled: open,
  })

  const { data: hospitalsResult } = useQuery({
    queryKey: ['hospitals-search', ''],
    queryFn: () => listHospitals({ keyword: '', page: 1, page_size: 20 }),
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
      reset(emptyDefaults)
      onClose()
    },
    onError: (err: any) => {
      setError('root', {
        message: err?.response?.data?.message || err?.message || '创建失败',
      })
    },
  })

  useEffect(() => {
    if (!open) reset(emptyDefaults)
  }, [open, reset])

  async function onSubmit(formData: TicketFormData) {
    mutation.mutate({
      title: formData.title.trim(),
      description: formData.description?.trim(),
      type_id: formData.type_id || undefined,
      priority: formData.priority,
      hospital_id: formData.hospital_id || null,
      assignee_id: formData.assignee_id || null,
    })
  }

  const selectClass =
    'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>创建工单</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <Label>
              标题 <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              placeholder="请输入工单标题"
              className="mt-1.5"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-destructive text-xs mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label>描述</Label>
            <Textarea
              placeholder="请输入工单描述"
              rows={4}
              className="mt-1.5 resize-none"
              {...register('description')}
            />
          </div>

          {/* Type + Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>工单类型</Label>
              <select className={`${selectClass} mt-1.5`} {...register('type_id')}>
                <option value="">请选择</option>
                {ticketTypes?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>优先级</Label>
              <select className={`${selectClass} mt-1.5`} {...register('priority', { valueAsNumber: true })}>
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
            <Label>关联医院</Label>
            <select className={`${selectClass} mt-1.5`} {...register('hospital_id')}>
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
            <Label>处理人</Label>
            <select className={`${selectClass} mt-1.5`} {...register('assignee_id')}>
              <option value="">暂不指派</option>
              {usersResult?.list?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.real_name || u.username}
                </option>
              ))}
            </select>
          </div>

          {errors.root && (
            <p className="text-destructive text-sm">{errors.root.message}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? '创建中...' : '创建'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
