import { useState, useEffect } from 'react'
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
  Button,
  Input,
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
} from '@hospital/shared'
import type { UserInfo } from '@hospital/shared'

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

const errorClass = 'text-xs text-destructive mt-1'

export function UserForm({ open, onClose, user }: UserFormProps) {
  const queryClient = useQueryClient()
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑用户' : '新建用户'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            {!isEdit && (
              <>
                <div>
                  <Label>
                    用户名 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    className="mt-1"
                    value={form.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    placeholder="请输入用户名"
                    autoComplete="off"
                  />
                  {errors.username && <p className={errorClass}>{errors.username}</p>}
                </div>
                <div>
                  <Label>
                    密码 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    className="mt-1"
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
              <Label>
                姓名 <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1"
                value={form.real_name}
                onChange={(e) => updateField('real_name', e.target.value)}
                placeholder="请输入真实姓名"
              />
              {errors.real_name && <p className={errorClass}>{errors.real_name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>手机号</Label>
                <Input
                  className="mt-1"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="请输入手机号"
                />
              </div>
              <div>
                <Label>邮箱</Label>
                <Input
                  className="mt-1"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="请输入邮箱"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>大区</Label>
                <Select
                  value={form.region_id || '__none__'}
                  onValueChange={(v) => updateField('region_id', v === '__none__' ? '' : v)}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="请选择大区" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">请选择大区</SelectItem>
                    {regions.map((r: Region) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>省份</Label>
                <Select
                  value={form.province_id || '__none__'}
                  onValueChange={(v) => updateField('province_id', v === '__none__' ? '' : v)}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="请选择省份" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">请选择省份</SelectItem>
                    {filteredProvinces.map((p: Province) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>角色</Label>
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
