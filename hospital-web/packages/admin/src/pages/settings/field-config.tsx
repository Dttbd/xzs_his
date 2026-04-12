import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listFieldDefinitions,
  createFieldDefinition,
  updateFieldDefinition,
  deleteFieldDefinition,
  ConfirmDialog,
  Loading,
  Empty,
  type FieldDefinition,
  Button,
  Input,
  Label,
  Textarea,
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
import { Plus, Pencil, Trash2 } from 'lucide-react'

const FIELD_TYPES = [
  { value: 'text', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'select', label: '下拉选择' },
  { value: 'date', label: '日期' },
]

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-accent' : 'bg-border'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

interface FieldFormProps {
  open: boolean
  onClose: () => void
  field?: FieldDefinition
}

function FieldForm({ open, onClose, field }: FieldFormProps) {
  const queryClient = useQueryClient()
  const isEdit = !!field

  const [fieldKey, setFieldKey] = useState('')
  const [fieldName, setFieldName] = useState('')
  const [fieldType, setFieldType] = useState('text')
  const [options, setOptions] = useState('')
  const [isRequired, setIsRequired] = useState(false)
  const [isFilterable, setIsFilterable] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setFieldKey(field?.field_key ?? '')
      setFieldName(field?.field_name ?? '')
      setFieldType(field?.field_type ?? 'text')
      setOptions(field?.options ?? '')
      setIsRequired(field?.is_required ?? false)
      setIsFilterable(field?.is_filterable ?? false)
      setErrors({})
    }
  }, [open, field])

  const mutation = useMutation({
    mutationFn: (payload: Partial<FieldDefinition>) =>
      isEdit ? updateFieldDefinition(field!.id, payload) : createFieldDefinition(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-definitions'] })
      onClose()
    },
  })

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!fieldKey.trim()) errs.field_key = '请输入字段键'
    if (!fieldName.trim()) errs.field_name = '请输入字段名称'
    if (fieldType === 'select' && !options.trim()) errs.options = '下拉类型需要填写选项'
    if (options.trim()) {
      try {
        JSON.parse(options)
      } catch {
        errs.options = '选项格式不正确，需要有效的 JSON'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate({
      field_key: fieldKey,
      field_name: fieldName,
      field_type: fieldType,
      options: options || '',
      is_required: isRequired,
      is_filterable: isFilterable,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑字段' : '新建字段'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div>
              <Label>
                字段键 <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1"
                value={fieldKey}
                onChange={(e) => setFieldKey(e.target.value)}
                placeholder="如: contract_no"
                disabled={isEdit}
              />
              {errors.field_key && (
                <p className="text-xs text-destructive mt-1">{errors.field_key}</p>
              )}
            </div>

            <div>
              <Label>
                字段名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="如: 合同编号"
              />
              {errors.field_name && (
                <p className="text-xs text-destructive mt-1">{errors.field_name}</p>
              )}
            </div>

            <div>
              <Label>字段类型</Label>
              <Select value={fieldType} onValueChange={setFieldType}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(fieldType === 'select' || options) && (
              <div>
                <Label>
                  选项 (JSON)
                  {fieldType === 'select' && <span className="text-destructive"> *</span>}
                </Label>
                <Textarea
                  className="mt-1 resize-none font-mono text-xs"
                  rows={3}
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                  placeholder={`["选项A","选项B","选项C"]`}
                />
                {errors.options && (
                  <p className="text-xs text-destructive mt-1">{errors.options}</p>
                )}
              </div>
            )}

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Label>必填</Label>
                <Toggle checked={isRequired} onChange={setIsRequired} />
              </div>
              <div className="flex items-center gap-2">
                <Label>可筛选</Label>
                <Toggle checked={isFilterable} onChange={setIsFilterable} />
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

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: '文本',
  number: '数字',
  select: '下拉选择',
  date: '日期',
}

export function FieldConfig() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editField, setEditField] = useState<FieldDefinition | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<FieldDefinition | null>(null)

  const { data: fields = [], isLoading } = useQuery({
    queryKey: ['field-definitions'],
    queryFn: () => listFieldDefinitions(),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFieldDefinition(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['field-definitions'] }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">配置医院档案的自定义扩展字段</p>
        <Button
          onClick={() => {
            setEditField(undefined)
            setFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          新增字段
        </Button>
      </div>

      {isLoading ? (
        <Loading />
      ) : fields.length === 0 ? (
        <Empty message="暂无自定义字段" />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="px-4 py-3 text-left font-medium">字段键</th>
                <th className="px-4 py-3 text-left font-medium">字段名称</th>
                <th className="px-4 py-3 text-left font-medium">类型</th>
                <th className="px-4 py-3 text-left font-medium">选项</th>
                <th className="px-4 py-3 text-left font-medium">必填</th>
                <th className="px-4 py-3 text-left font-medium">可筛选</th>
                <th className="px-4 py-3 text-left font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field.id} className="border-b border-border/50">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {field.field_key}
                  </td>
                  <td className="px-4 py-3 text-foreground">{field.field_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[120px] truncate">
                    {field.options || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {field.is_required ? (
                      <span className="text-xs text-accent">是</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">否</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {field.is_filterable ? (
                      <span className="text-xs text-accent">是</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">否</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditField(field)
                          setFormOpen(true)
                        }}
                        className="rounded p-1 hover:bg-background transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(field)}
                        className="rounded p-1 hover:bg-background transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FieldForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditField(undefined)
        }}
        field={editField}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget.id)
        }}
        title="删除字段"
        message={`确定要删除字段"${deleteTarget?.field_name}"吗？此操作不可撤销。`}
      />
    </div>
  )
}
