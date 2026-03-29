import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createHospital,
  updateHospital,
  listCategories,
  listProvinces,
  listUsers,
  type Hospital,
  type HospitalCategory,
  type Province,
} from '@hospital/shared'
import { X } from 'lucide-react'

interface HospitalFormProps {
  open: boolean
  onClose: () => void
  hospital?: Hospital
}

const LEVELS = ['三甲', '三乙', '二甲', '二乙', '一甲', '其他']

interface FormData {
  name: string
  code: string
  category_id: string
  level: string
  province_id: string
  city: string
  address: string
  contact_name: string
  contact_phone: string
  contact_email: string
  bed_count: number
  department_count: number
  is_specialized: boolean
  specialty_type: string
  owner_user_id: string
  remark: string
}

const emptyForm: FormData = {
  name: '',
  code: '',
  category_id: '',
  level: '',
  province_id: '',
  city: '',
  address: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  bed_count: 0,
  department_count: 0,
  is_specialized: false,
  specialty_type: '',
  owner_user_id: '',
  remark: '',
}

export function HospitalForm({ open, onClose, hospital }: HospitalFormProps) {
  const queryClient = useQueryClient()
  const overlayRef = useRef<HTMLDivElement>(null)
  const isEdit = !!hospital

  const [form, setForm] = useState<FormData>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      if (hospital) {
        setForm({
          name: hospital.name ?? '',
          code: hospital.code ?? '',
          category_id: hospital.category_id ?? '',
          level: hospital.level ?? '',
          province_id: hospital.province_id ?? '',
          city: hospital.city ?? '',
          address: hospital.address ?? '',
          contact_name: hospital.contact_name ?? '',
          contact_phone: hospital.contact_phone ?? '',
          contact_email: hospital.contact_email ?? '',
          bed_count: hospital.bed_count ?? 0,
          department_count: hospital.department_count ?? 0,
          is_specialized: hospital.is_specialized ?? false,
          specialty_type: hospital.specialty_type ?? '',
          owner_user_id: hospital.owner_user_id ?? '',
          remark: hospital.remark ?? '',
        })
      } else {
        setForm(emptyForm)
      }
      setErrors({})
    }
  }, [open, hospital])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => listCategories(),
    enabled: open,
  })

  const { data: provinces = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => listProvinces(),
    enabled: open,
  })

  const { data: usersPage } = useQuery({
    queryKey: ['users', { page_size: 200 }],
    queryFn: () => listUsers({ page_size: 200 }),
    enabled: open,
  })
  const users = usersPage?.list ?? []

  const mutation = useMutation({
    mutationFn: (data: Partial<Hospital>) =>
      isEdit ? updateHospital(hospital!.id, data) : createHospital(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      onClose()
    },
  })

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = '请输入医院名称'
    if (!form.code.trim()) errs.code = '请输入医院编码'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const payload: Record<string, any> = { ...form }
    if (!payload.category_id) payload.category_id = null
    if (!payload.province_id) payload.province_id = null
    if (!payload.owner_user_id) payload.owner_user_id = null
    mutation.mutate(payload)
  }

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
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
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? '编辑医院' : '新建医院'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-background"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className={labelClass}>
                医院名称 <span className="text-destructive">*</span>
              </label>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="请输入医院名称"
              />
              {errors.name && <p className={errorClass}>{errors.name}</p>}
            </div>

            {/* Code */}
            <div>
              <label className={labelClass}>
                医院编码 <span className="text-destructive">*</span>
              </label>
              <input
                className={inputClass}
                value={form.code}
                onChange={(e) => updateField('code', e.target.value)}
                placeholder="请输入医院编码"
              />
              {errors.code && <p className={errorClass}>{errors.code}</p>}
            </div>

            {/* Category */}
            <div>
              <label className={labelClass}>分类</label>
              <select
                className={selectClass}
                value={form.category_id}
                onChange={(e) => updateField('category_id', e.target.value)}
              >
                <option value="">请选择分类</option>
                {categories.map((c: HospitalCategory) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Level */}
            <div>
              <label className={labelClass}>等级</label>
              <select
                className={selectClass}
                value={form.level}
                onChange={(e) => updateField('level', e.target.value)}
              >
                <option value="">请选择等级</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            {/* Province */}
            <div>
              <label className={labelClass}>省份</label>
              <select
                className={selectClass}
                value={form.province_id}
                onChange={(e) => updateField('province_id', e.target.value)}
              >
                <option value="">请选择省份</option>
                {provinces.map((p: Province) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* City */}
            <div>
              <label className={labelClass}>城市</label>
              <input
                className={inputClass}
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="请输入城市"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className={labelClass}>地址</label>
              <input
                className={inputClass}
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="请输入详细地址"
              />
            </div>

            {/* Contact Name */}
            <div>
              <label className={labelClass}>联系人</label>
              <input
                className={inputClass}
                value={form.contact_name}
                onChange={(e) => updateField('contact_name', e.target.value)}
                placeholder="请输入联系人姓名"
              />
            </div>

            {/* Contact Phone */}
            <div>
              <label className={labelClass}>联系电话</label>
              <input
                className={inputClass}
                value={form.contact_phone}
                onChange={(e) => updateField('contact_phone', e.target.value)}
                placeholder="请输入联系电话"
              />
            </div>

            {/* Contact Email */}
            <div>
              <label className={labelClass}>联系邮箱</label>
              <input
                className={inputClass}
                type="email"
                value={form.contact_email}
                onChange={(e) => updateField('contact_email', e.target.value)}
                placeholder="请输入联系邮箱"
              />
            </div>

            {/* Owner */}
            <div>
              <label className={labelClass}>负责人</label>
              <select
                className={selectClass}
                value={form.owner_user_id}
                onChange={(e) => updateField('owner_user_id', e.target.value)}
              >
                <option value="">请选择负责人</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.real_name || u.username}
                  </option>
                ))}
              </select>
            </div>

            {/* Bed Count */}
            <div>
              <label className={labelClass}>床位数</label>
              <input
                className={inputClass}
                type="number"
                min={0}
                value={form.bed_count}
                onChange={(e) => updateField('bed_count', Number(e.target.value))}
              />
            </div>

            {/* Department Count */}
            <div>
              <label className={labelClass}>科室数</label>
              <input
                className={inputClass}
                type="number"
                min={0}
                value={form.department_count}
                onChange={(e) => updateField('department_count', Number(e.target.value))}
              />
            </div>

            {/* Is Specialized */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-foreground">专科医院</label>
              <button
                type="button"
                onClick={() => updateField('is_specialized', !form.is_specialized)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  form.is_specialized ? 'bg-accent' : 'bg-border'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    form.is_specialized ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Specialty Type */}
            {form.is_specialized && (
              <div>
                <label className={labelClass}>专科类型</label>
                <input
                  className={inputClass}
                  value={form.specialty_type}
                  onChange={(e) => updateField('specialty_type', e.target.value)}
                  placeholder="请输入专科类型"
                />
              </div>
            )}

            {/* Remark */}
            <div className="md:col-span-2">
              <label className={labelClass}>备注</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                value={form.remark}
                onChange={(e) => updateField('remark', e.target.value)}
                placeholder="请输入备注信息"
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
