import { useState, useEffect, useRef } from 'react'
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
} from '@hospital/shared'
import { Plus, X, Pencil, Trash2 } from 'lucide-react'

const FIELD_TYPES = [
  { value: 'text', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'select', label: '下拉选择' },
  { value: 'date', label: '日期' },
]

const inputClass =
  'w-full border border-border bg-background rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent'
const selectClass =
  'w-full border border-border bg-background rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent appearance-none'
const labelClass = 'block text-sm font-medium text-foreground mb-1'

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
  const overlayRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

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

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-foreground">
            {isEdit ? '编辑字段' : '新建字段'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-background transition-colors">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>
                字段键 <span className="text-destructive">*</span>
              </label>
              <input
                className={inputClass}
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
              <label className={labelClass}>
                字段名称 <span className="text-destructive">*</span>
              </label>
              <input
                className={inputClass}
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="如: 合同编号"
              />
              {errors.field_name && (
                <p className="text-xs text-destructive mt-1">{errors.field_name}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>字段类型</label>
              <select
                className={selectClass}
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value)}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {(fieldType === 'select' || options) && (
              <div>
                <label className={labelClass}>
                  选项 (JSON)
                  {fieldType === 'select' && <span className="text-destructive"> *</span>}
                </label>
                <textarea
                  className={`${inputClass} resize-none font-mono text-xs`}
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
                <label className="text-sm text-foreground">必填</label>
                <Toggle checked={isRequired} onChange={setIsRequired} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-foreground">可筛选</label>
                <Toggle checked={isFilterable} onChange={setIsFilterable} />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-lg bg-accent text-accent-foreground px-4 py-2 text-sm hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? '保存中...' : isEdit ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
        <button
          onClick={() => {
            setEditField(undefined)
            setFormOpen(true)
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-accent-foreground px-3 py-1.5 text-sm hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          新增字段
        </button>
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
