import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getHospital,
  deleteHospital,
  Loading,
  Empty,
  StatusBadge,
  ConfirmDialog,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@hospital/shared'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { HospitalForm } from './hospital-form'

const STATUS_MAP: Record<number, { key: string; label: string }> = {
  1: { key: 'published', label: '启用' },
  0: { key: 'draft', label: '停用' },
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2">
      <dt className="text-xs font-medium text-muted-foreground mb-1">{label}</dt>
      <dd className="text-sm text-foreground">{value || '-'}</dd>
    </div>
  )
}

export function HospitalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: hospital, isLoading } = useQuery({
    queryKey: ['hospital', id],
    queryFn: () => getHospital(id!),
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteHospital(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      navigate('/hospitals')
    },
  })

  if (isLoading) return <Loading />
  if (!hospital) return <Empty message="医院不存在" />

  const s = STATUS_MAP[hospital.status] ?? { key: 'draft', label: '未知' }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/hospitals')}
        className="text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        返回列表
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-foreground">{hospital.name}</h1>
              <span className="text-sm text-muted-foreground">{hospital.code}</span>
              <StatusBadge status={s.key} label={s.label} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setFormOpen(true)}>
                <Pencil className="h-4 w-4" strokeWidth={1.5} />
                编辑
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                删除
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
            <InfoItem label="医院名称" value={hospital.name} />
            <InfoItem label="医院编码" value={hospital.code} />
            <InfoItem label="等级" value={hospital.level} />
            <InfoItem label="分类" value={hospital.category?.name} />
            <InfoItem label="省份" value={hospital.province?.name} />
            <InfoItem label="城市" value={hospital.city} />
            <InfoItem label="地址" value={hospital.address} />
            <InfoItem label="联系人" value={hospital.contact_name} />
            <InfoItem label="联系电话" value={hospital.contact_phone} />
            <InfoItem label="联系邮箱" value={hospital.contact_email} />
            <InfoItem
              label="负责人"
              value={hospital.owner_user?.real_name ?? hospital.owner_user?.username}
            />
            <InfoItem label="床位数" value={hospital.bed_count?.toString()} />
            <InfoItem label="科室数" value={hospital.department_count?.toString()} />
            <InfoItem
              label="专科医院"
              value={hospital.is_specialized ? '是' : '否'}
            />
            {hospital.is_specialized && (
              <InfoItem label="专科类型" value={hospital.specialty_type} />
            )}
            <InfoItem label="创建时间" value={hospital.created_at?.slice(0, 19).replace('T', ' ')} />
            <InfoItem label="更新时间" value={hospital.updated_at?.slice(0, 19).replace('T', ' ')} />
          </div>
        </CardContent>
      </Card>

      {/* Remark */}
      {hospital.remark && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">备注</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{hospital.remark}</p>
          </CardContent>
        </Card>
      )}

      {/* Dynamic fields */}
      {hospital.fields && hospital.fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">扩展字段</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
              {hospital.fields.map((f) => (
                <InfoItem key={f.id} label={f.field_key} value={f.field_value} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <HospitalForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          queryClient.invalidateQueries({ queryKey: ['hospital', id] })
        }}
        hospital={hospital}
      />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="删除医院"
        message={`确定要删除"${hospital.name}"吗？此操作不可撤销。`}
      />
    </div>
  )
}
