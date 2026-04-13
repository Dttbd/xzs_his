import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBulletin,
  updateBulletin,
  listRegions,
  listProvinces,
  type Bulletin,
  type Region,
  type Province,
  Button,
  Input,
  Textarea,
  Label,
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
  DatePicker,
} from '@hospital/shared'

interface BulletinFormProps {
  open: boolean
  onClose: () => void
  bulletin?: Bulletin
}

interface FormData {
  title: string
  content: string
  scope_type: string
  scope_id: string
  is_pinned: boolean
  expires_at: string
}

const emptyForm: FormData = {
  title: '',
  content: '',
  scope_type: 'all',
  scope_id: '',
  is_pinned: false,
  expires_at: '',
}

const errorClass = 'text-xs text-destructive mt-1'

export function BulletinForm({ open, onClose, bulletin }: BulletinFormProps) {
  const queryClient = useQueryClient()
  const isEdit = !!bulletin

  const [form, setForm] = useState<FormData>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      if (bulletin) {
        setForm({
          title: bulletin.title ?? '',
          content: bulletin.content ?? '',
          scope_type: bulletin.scope_type ?? 'all',
          scope_id: bulletin.scope_id ?? '',
          is_pinned: bulletin.is_pinned ?? false,
          expires_at: bulletin.expires_at
            ? bulletin.expires_at.slice(0, 10)
            : '',
        })
      } else {
        setForm(emptyForm)
      }
      setErrors({})
    }
  }, [open, bulletin])

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: () => listRegions(),
    enabled: open,
  })

  const { data: provinces = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => listProvinces(),
    enabled: open,
  })

  const mutation = useMutation({
    mutationFn: (data: Partial<Bulletin>) =>
      isEdit ? updateBulletin(bulletin!.id, data) : createBulletin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulletins'] })
      onClose()
    },
  })

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.title.trim()) errs.title = '请输入公告标题'
    if (!form.content.trim()) errs.content = '请输入公告内容'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const payload: Partial<Bulletin> = {
      title: form.title,
      content: form.content,
      scope_type: form.scope_type,
      scope_id: form.scope_id || undefined,
      is_pinned: form.is_pinned,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    }
    mutation.mutate(payload)
  }

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => {
      const updated = { ...prev, [key]: value }
      // Reset scope_id when scope_type changes
      if (key === 'scope_type') updated.scope_id = ''
      return updated
    })
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const scopeOptions =
    form.scope_type === 'region'
      ? regions
      : form.scope_type === 'province'
        ? provinces
        : []

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑公告' : '新建公告'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            {/* Title */}
            <div>
              <Label>
                标题 <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="请输入公告标题"
              />
              {errors.title && <p className={errorClass}>{errors.title}</p>}
            </div>

            {/* Content */}
            <div>
              <Label>
                内容 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                className="mt-1 resize-none"
                rows={5}
                value={form.content}
                onChange={(e) => updateField('content', e.target.value)}
                placeholder="请输入公告内容"
              />
              {errors.content && <p className={errorClass}>{errors.content}</p>}
            </div>

            {/* Scope Type */}
            <div>
              <Label>范围类型</Label>
              <Select
                value={form.scope_type}
                onValueChange={(v) => updateField('scope_type', v)}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="region">大区</SelectItem>
                  <SelectItem value="province">省</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scope ID */}
            {(form.scope_type === 'region' || form.scope_type === 'province') && (
              <div>
                <Label>
                  {form.scope_type === 'region' ? '选择大区' : '选择省份'}
                </Label>
                <Select
                  value={form.scope_id || '__none__'}
                  onValueChange={(v) => updateField('scope_id', v === '__none__' ? '' : v)}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder={form.scope_type === 'region' ? '请选择大区' : '请选择省份'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      {form.scope_type === 'region' ? '请选择大区' : '请选择省份'}
                    </SelectItem>
                    {(scopeOptions as (Region | Province)[]).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Is Pinned */}
            <div className="flex items-center gap-3">
              <Label>置顶</Label>
              <button
                type="button"
                onClick={() => updateField('is_pinned', !form.is_pinned)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  form.is_pinned ? 'bg-accent' : 'bg-border'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    form.is_pinned ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Expires At */}
            <div>
              <Label>过期时间</Label>
              <DatePicker
                className="mt-1"
                value={form.expires_at}
                onChange={(v) => updateField('expires_at', v)}
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
