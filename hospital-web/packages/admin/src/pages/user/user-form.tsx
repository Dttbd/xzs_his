import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createUser,
  updateUser,
  setUserRoles,
  listRoles,
  listRegions,
  listProvinces,
  type Role,
  type Region,
  type Province,
} from '@hospital/shared'
import type { UserInfo } from '@hospital/shared'
import { X } from 'lucide-react'

interface UserFormProps {
  open: boolean
  onClose: () => void
  user?: UserInfo
}

interface FormData {
  username: string
  password: string
  real_name: string
  phone: string
  email: string
  region_id: string
  province_id: string
  role_ids: string[]
}

const emptyForm: FormData = {
  username: '',
  password: '',
  real_name: '',
  phone: '',
  email: '',
  region_id: '',
  province_id: '',
  role_ids: [],
}

export function UserForm({ open, onClose, user }: UserFormProps) {
  const queryClient = useQueryClient()
  const overlayRef = useRef<HTMLDivElement>(null)
  const isEdit = !!user

  const [form, setForm] = useState<FormData>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      if (user) {
        setForm({
          username: user.username ?? '',
          password: '',
          real_name: user.real_name ?? '',
          phone: user.phone ?? '',
          email: user.email ?? '',
          region_id: user.region_id ?? '',
          province_id: user.province_id ?? '',
          role_ids: user.roles?.map((r) => r.id) ?? [],
        })
      } else {
        setForm(emptyForm)
      }
      setErrors({})
    }
  }, [open, user])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => listRoles(),
    enabled: open,
  })

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: () => listRegions(),
    enabled: open,
  })

  const { data: allProvinces = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => listProvinces(),
    enabled: open,
  })

  const filteredProvinces = form.region_id
    ? allProvinces.filter((p: Province) => p.region_id === form.region_id)
    : allProvinces

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: Record<string, any> = {
        real_name: data.real_name,
        phone: data.phone || undefined,
        email: data.email || undefined,
        region_id: data.region_id || null,
        province_id: data.province_id || null,
      }
      let savedUser: UserInfo
      if (isEdit) {
        savedUser = await updateUser(user!.id, payload)
      } else {
        savedUser = await createUser({
          ...payload,
          username: data.username,
          password: data.password,
        })
      }
      await setUserRoles(savedUser.id, data.role_ids)
      return savedUser
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
  })

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!isEdit && !form.username.trim()) errs.username = '请输入用户名'
    if (!isEdit && !form.password.trim()) errs.password = '请输入密码'
    if (!form.real_name.trim()) errs.real_name = '请输入姓名'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate(form)
  }

  function toggleRole(id: string) {
    setForm((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(id)
        ? prev.role_ids.filter((r) => r !== id)
        : [...prev.role_ids, id],
    }))
  }

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'region_id') next.province_id = ''
      return next
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

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? '编辑用户' : '新建用户'}
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
            {!isEdit && (
              <>
                <div>
                  <label className={labelClass}>
                    用户名 <span className="text-destructive">*</span>
                  </label>
                  <input
                    className={inputClass}
                    value={form.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    placeholder="请输入用户名"
                    autoComplete="off"
                  />
                  {errors.username && <p className={errorClass}>{errors.username}</p>}
                </div>
                <div>
                  <label className={labelClass}>
                    密码 <span className="text-destructive">*</span>
                  </label>
                  <input
                    className={inputClass}
                    type="password"
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    placeholder="请输入密码"
                    autoComplete="new-password"
                  />
                  {errors.password && <p className={errorClass}>{errors.password}</p>}
                </div>
              </>
            )}

            <div>
              <label className={labelClass}>
                姓名 <span className="text-destructive">*</span>
              </label>
              <input
                className={inputClass}
                value={form.real_name}
                onChange={(e) => updateField('real_name', e.target.value)}
                placeholder="请输入真实姓名"
              />
              {errors.real_name && <p className={errorClass}>{errors.real_name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>手机号</label>
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="请输入手机号"
                />
              </div>
              <div>
                <label className={labelClass}>邮箱</label>
                <input
                  className={inputClass}
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="请输入邮箱"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>大区</label>
                <select
                  className={selectClass}
                  value={form.region_id}
                  onChange={(e) => updateField('region_id', e.target.value)}
                >
                  <option value="">请选择大区</option>
                  {regions.map((r: Region) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>省份</label>
                <select
                  className={selectClass}
                  value={form.province_id}
                  onChange={(e) => updateField('province_id', e.target.value)}
                >
                  <option value="">请选择省份</option>
                  {filteredProvinces.map((p: Province) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>角色</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {roles.map((role: Role) => (
                  <label
                    key={role.id}
                    className="inline-flex items-center gap-1.5 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-border accent-accent"
                      checked={form.role_ids.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                    />
                    <span className="text-sm text-foreground">{role.name}</span>
                  </label>
                ))}
                {roles.length === 0 && (
                  <span className="text-sm text-muted-foreground">暂无角色</span>
                )}
              </div>
            </div>
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
              {mutation.isPending ? '保存中...' : isEdit ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
