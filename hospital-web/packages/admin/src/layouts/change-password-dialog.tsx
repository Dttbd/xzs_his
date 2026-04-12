import { useState, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { changePassword } from '@hospital/shared'
import { X } from 'lucide-react'

interface ChangePasswordDialogProps {
  open: boolean
  onClose: () => void
}

interface FormData {
  old_password: string
  new_password: string
  confirm_password: string
}

const emptyForm: FormData = {
  old_password: '',
  new_password: '',
  confirm_password: '',
}

export function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(emptyForm)
      setErrors({})
      setSuccess(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const mutation = useMutation({
    mutationFn: () =>
      changePassword({ old_password: form.old_password, new_password: form.new_password }),
    onSuccess: () => {
      setSuccess(true)
      setTimeout(() => onClose(), 1200)
    },
    onError: (err: Error) => {
      setErrors({ submit: err.message })
    },
  })

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.old_password) errs.old_password = '请输入旧密码'
    if (!form.new_password || form.new_password.length < 6) errs.new_password = '新密码至少6位'
    if (!form.confirm_password) errs.confirm_password = '请确认新密码'
    else if (form.new_password !== form.confirm_password) errs.confirm_password = '两次密码不一致'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate()
  }

  function updateField(key: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }))
    if (errors.submit) setErrors((prev) => ({ ...prev, submit: '' }))
  }

  if (!open) return null

  const inputClass =
    'w-full border border-border bg-background rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent'
  const labelClass = 'block text-sm font-medium text-foreground mb-1'
  const errorClass = 'text-xs text-destructive mt-1'

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">修改密码</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-background"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {success ? (
          <p className="text-sm text-center text-accent py-4">密码修改成功</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>
                  旧密码 <span className="text-destructive">*</span>
                </label>
                <input
                  className={inputClass}
                  type="password"
                  value={form.old_password}
                  onChange={(e) => updateField('old_password', e.target.value)}
                  placeholder="请输入旧密码"
                  autoComplete="current-password"
                />
                {errors.old_password && <p className={errorClass}>{errors.old_password}</p>}
              </div>

              <div>
                <label className={labelClass}>
                  新密码 <span className="text-destructive">*</span>
                </label>
                <input
                  className={inputClass}
                  type="password"
                  value={form.new_password}
                  onChange={(e) => updateField('new_password', e.target.value)}
                  placeholder="至少6位"
                  autoComplete="new-password"
                />
                {errors.new_password && <p className={errorClass}>{errors.new_password}</p>}
              </div>

              <div>
                <label className={labelClass}>
                  确认新密码 <span className="text-destructive">*</span>
                </label>
                <input
                  className={inputClass}
                  type="password"
                  value={form.confirm_password}
                  onChange={(e) => updateField('confirm_password', e.target.value)}
                  placeholder="再次输入新密码"
                  autoComplete="new-password"
                />
                {errors.confirm_password && (
                  <p className={errorClass}>{errors.confirm_password}</p>
                )}
              </div>

              {errors.submit && (
                <p className="text-sm text-destructive text-center">{errors.submit}</p>
              )}
            </div>

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
                {mutation.isPending ? '提交中...' : '确认修改'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
