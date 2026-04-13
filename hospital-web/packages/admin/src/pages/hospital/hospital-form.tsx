import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createHospital,
  updateHospital,
  listCategories,
  listProvinces,
  listUsers,
  Button,
  Input,
  Label,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  type Hospital,
  type HospitalCategory,
  type Province,
} from '@hospital/shared'

interface HospitalFormProps {
  open: boolean
  onClose: () => void
  hospital?: Hospital
}

const LEVELS = ['三甲', '三乙', '二甲', '二乙', '一甲', '其他']

const hospitalSchema = z.object({
  name: z.string().min(1, '请输入医院名称').max(200),
  code: z.string().min(1, '请输入医院编码').max(50),
  category_id: z.string().optional(),
  level: z.string().optional(),
  province_id: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z
    .string()
    .email('邮箱格式不正确')
    .optional()
    .or(z.literal('')),
  bed_count: z.number().min(0).optional(),
  department_count: z.number().min(0).optional(),
  is_specialized: z.boolean().optional(),
  specialty_type: z.string().optional(),
  owner_user_id: z.string().optional(),
  remark: z.string().optional(),
})

type HospitalFormData = z.infer<typeof hospitalSchema>

const emptyDefaults: HospitalFormData = {
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
  const isEdit = !!hospital

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<HospitalFormData>({
    resolver: zodResolver(hospitalSchema),
    defaultValues: emptyDefaults,
  })

  const isSpecialized = watch('is_specialized')

  useEffect(() => {
    if (open) {
      if (hospital) {
        reset({
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
        reset(emptyDefaults)
      }
    }
  }, [open, hospital, reset])

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
    queryKey: ['users', { page_size: 100 }],
    queryFn: () => listUsers({ page_size: 100 }),
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

  function onSubmit(formData: HospitalFormData) {
    const payload: Record<string, any> = { ...formData }
    if (!payload.category_id) payload.category_id = null
    if (!payload.province_id) payload.province_id = null
    if (!payload.owner_user_id) payload.owner_user_id = null
    mutation.mutate(payload)
  }

  const selectClass =
    'w-full border border-border bg-background rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent appearance-none'
  const errorClass = 'text-xs text-destructive mt-1'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑医院' : '新建医院'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <Label>
                医院名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1.5"
                placeholder="请输入医院名称"
                {...register('name')}
              />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>

            {/* Code */}
            <div>
              <Label>
                医院编码 <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1.5"
                placeholder="请输入医院编码"
                {...register('code')}
              />
              {errors.code && <p className={errorClass}>{errors.code.message}</p>}
            </div>

            {/* Category */}
            <div>
              <Label>分类</Label>
              <select className={`${selectClass} mt-1.5`} {...register('category_id')}>
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
              <Label>等级</Label>
              <select className={`${selectClass} mt-1.5`} {...register('level')}>
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
              <Label>省份</Label>
              <select className={`${selectClass} mt-1.5`} {...register('province_id')}>
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
              <Label>城市</Label>
              <Input
                className="mt-1.5"
                placeholder="请输入城市"
                {...register('city')}
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <Label>地址</Label>
              <Input
                className="mt-1.5"
                placeholder="请输入详细地址"
                {...register('address')}
              />
            </div>

            {/* Contact Name */}
            <div>
              <Label>联系人</Label>
              <Input
                className="mt-1.5"
                placeholder="请输入联系人姓名"
                {...register('contact_name')}
              />
            </div>

            {/* Contact Phone */}
            <div>
              <Label>联系电话</Label>
              <Input
                className="mt-1.5"
                placeholder="请输入联系电话"
                {...register('contact_phone')}
              />
            </div>

            {/* Contact Email */}
            <div>
              <Label>联系邮箱</Label>
              <Input
                className="mt-1.5"
                type="email"
                placeholder="请输入联系邮箱"
                {...register('contact_email')}
              />
              {errors.contact_email && (
                <p className={errorClass}>{errors.contact_email.message}</p>
              )}
            </div>

            {/* Owner */}
            <div>
              <Label>负责人</Label>
              <select className={`${selectClass} mt-1.5`} {...register('owner_user_id')}>
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
              <Label>床位数</Label>
              <Input
                className="mt-1.5"
                type="number"
                min={0}
                {...register('bed_count', { valueAsNumber: true })}
              />
              {errors.bed_count && (
                <p className={errorClass}>{errors.bed_count.message}</p>
              )}
            </div>

            {/* Department Count */}
            <div>
              <Label>科室数</Label>
              <Input
                className="mt-1.5"
                type="number"
                min={0}
                {...register('department_count', { valueAsNumber: true })}
              />
              {errors.department_count && (
                <p className={errorClass}>{errors.department_count.message}</p>
              )}
            </div>

            {/* Is Specialized */}
            <div className="flex items-center gap-3">
              <Label>专科医院</Label>
              <Controller
                name="is_specialized"
                control={control}
                render={({ field }) => (
                  <button
                    type="button"
                    onClick={() => field.onChange(!field.value)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      field.value ? 'bg-accent' : 'bg-border'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                        field.value ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                )}
              />
            </div>

            {/* Specialty Type */}
            {isSpecialized && (
              <div>
                <Label>专科类型</Label>
                <Input
                  className="mt-1.5"
                  placeholder="请输入专科类型"
                  {...register('specialty_type')}
                />
              </div>
            )}

            {/* Remark */}
            <div className="md:col-span-2">
              <Label>备注</Label>
              <Textarea
                className="mt-1.5 resize-none"
                rows={3}
                placeholder="请输入备注信息"
                {...register('remark')}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? '保存中...' : isEdit ? '保存' : '创建'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
