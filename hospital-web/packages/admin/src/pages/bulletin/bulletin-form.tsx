import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBulletin,
  updateBulletin,
  listRegions,
  listProvinces,
  type Bulletin,
  type Region,
  type Province,
} from '@hospital/shared'
import { X } from 'lucide-react'

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

export function BulletinForm({ open, onClose, bulletin }: BulletinFormProps) {
  const queryClient = useQueryClient()
  const overlayRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

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

  if (!open) return null

  const inputClass =
    'w-full border border-border bg-background rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent'
  const selectClass =
    'w-full border border-border bg-background rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent appearance-none'
  const labelClass = 'block text-sm font-medium text-foreground mb-1'
  const errorClass = 'text-xs text-destructive mt-1'

  const scopeOptions =
    form.scope_type === 'region'
      ? regions
      : form.scope_type === 'province'
        ? provinces
        : []

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? '编辑公告' : '新建公告'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-background"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className={labelClass}>
                标题 <span className="text-destructive">*</span>
              </label>
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="请输入公告标题"
              />
              {errors.title && <p className={errorClass}>{errors.title}</p>}
            </div>

            {/* Content */}
            <div>
              <label className={labelClass}>
                内容 <span className="text-destructive">*</span>
              </label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={5}
                value={form.content}
                onChange={(e) => updateField('content', e.target.value)}
                placeholder="请输入公告内容"
              />
              {errors.content && <p className={errorClass}>{errors.content}</p>}
            </div>

            {/* Scope Type */}
            <div>
              <label className={labelClass}>范围类型</label>
              <select
                className={selectClass}
                value={form.scope_type}
                onChange={(e) => updateField('scope_type', e.target.value)}
              >
                <option value="all">全部</option>
                <option value="region">大区</option>
                <option value="province">省</option>
              </select>
            </div>

            {/* Scope ID */}
            {(form.scope_type === 'region' || form.scope_type === 'province') && (
              <div>
                <label className={labelClass}>
                  {form.scope_type === 'region' ? '选择大区' : '选择省份'}
                </label>
                <select
                  className={selectClass}
                  value={form.scope_id}
                  onChange={(e) => updateField('scope_id', e.target.value)}
                >
                  <option value="">
                    {form.scope_type === 'region' ? '请选择大区' : '请选择省份'}
                  </option>
                  {(scopeOptions as (Region | Province)[]).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Is Pinned */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-foreground">置顶</label>
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
              <label className={labelClass}>过期时间</label>
              <input
                type="date"
                className={inputClass}
                value={form.expires_at}
                onChange={(e) => updateField('expires_at', e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-background"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-lg bg-accent text-accent-foreground px-4 py-2 text-sm transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              {mutation.isPending ? '保存中...' : isEdit ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
