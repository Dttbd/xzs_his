import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  changePassword,
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@hospital/shared'

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

  const errorClass = 'text-xs text-destructive mt-1'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>修改密码</DialogTitle>
        </DialogHeader>

        {success ? (
          <p className="text-sm text-center text-accent py-4">密码修改成功</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label>
                  旧密码 <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="password"
                  value={form.old_password}
                  onChange={(e) => updateField('old_password', e.target.value)}
                  placeholder="请输入旧密码"
                  autoComplete="current-password"
                  className="mt-1.5"
                />
                {errors.old_password && <p className={errorClass}>{errors.old_password}</p>}
              </div>

              <div>
                <Label>
                  新密码 <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="password"
                  value={form.new_password}
                  onChange={(e) => updateField('new_password', e.target.value)}
                  placeholder="至少6位"
                  autoComplete="new-password"
                  className="mt-1.5"
                />
                {errors.new_password && <p className={errorClass}>{errors.new_password}</p>}
              </div>

              <div>
                <Label>
                  确认新密码 <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="password"
                  value={form.confirm_password}
                  onChange={(e) => updateField('confirm_password', e.target.value)}
                  placeholder="再次输入新密码"
                  autoComplete="new-password"
                  className="mt-1.5"
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
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? '提交中...' : '确认修改'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
