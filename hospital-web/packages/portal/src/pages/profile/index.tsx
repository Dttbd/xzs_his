import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPortalProfile, updatePortalProfile, useAuthStore } from '@hospital/shared'
import { User, Mail, Phone, Pencil, Save, X } from 'lucide-react'

export function ProfilePage() {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ real_name: '', phone: '', email: '' })
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['portal-profile'],
    queryFn: getPortalProfile,
    select: (data) => data,
  })

  // Populate form when entering edit mode
  const handleStartEdit = () => {
    setForm({
      real_name: profile?.real_name ?? '',
      phone: profile?.phone ?? '',
      email: profile?.email ?? '',
    })
    setEditing(true)
  }

  const handleCancel = () => {
    setEditing(false)
  }

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, string>) => updatePortalProfile(body),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['portal-profile'] })
      setUser(updatedUser)
      setEditing(false)
    },
  })

  const handleSave = () => {
    const payload: Record<string, string> = {}
    if (form.real_name) payload.real_name = form.real_name
    if (form.phone !== undefined) payload.phone = form.phone
    if (form.email !== undefined) payload.email = form.email
    updateMutation.mutate(payload)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground text-sm">加载中...</div>
      </div>
    )
  }

  const avatarChar = profile?.real_name?.[0] ?? profile?.username?.[0] ?? '?'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page title */}
      <h1 className="text-xl font-semibold text-foreground">个人信息</h1>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-xl p-6">
        {/* Avatar + name header */}
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shrink-0 select-none">
            {avatarChar.toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {profile?.real_name || profile?.username}
            </p>
            <p className="text-sm text-muted-foreground">@{profile?.username}</p>
          </div>

          {/* Edit toggle (top-right) */}
          {!editing && (
            <button
              onClick={handleStartEdit}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm text-foreground hover:bg-muted/50 transition-colors"
            >
              <Pencil size={14} strokeWidth={1.5} />
              编辑
            </button>
          )}
        </div>

        {/* Info grid */}
        <div className="space-y-5">
          {/* Real name */}
          <div className="flex items-start gap-3">
            <User size={18} strokeWidth={1.5} className="text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground text-sm mb-1">姓名</p>
              {editing ? (
                <input
                  type="text"
                  value={form.real_name}
                  onChange={(e) => setForm((f) => ({ ...f, real_name: e.target.value }))}
                  placeholder="请输入姓名"
                  className="w-full border border-border bg-background rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent transition-colors placeholder:text-muted-foreground/50"
                />
              ) : (
                <p className="text-foreground text-sm">{profile?.real_name || '—'}</p>
              )}
            </div>
          </div>

          {/* Username (read-only) */}
          <div className="flex items-start gap-3">
            <User size={18} strokeWidth={1.5} className="text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground text-sm mb-1">用户名</p>
              <p className="text-foreground text-sm">{profile?.username || '—'}</p>
              {editing && (
                <p className="text-muted-foreground text-xs mt-0.5">用户名不可修改</p>
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-start gap-3">
            <Phone size={18} strokeWidth={1.5} className="text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground text-sm mb-1">手机号</p>
              {editing ? (
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="请输入手机号"
                  className="w-full border border-border bg-background rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent transition-colors placeholder:text-muted-foreground/50"
                />
              ) : (
                <p className="text-foreground text-sm">{profile?.phone || '—'}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-3">
            <Mail size={18} strokeWidth={1.5} className="text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground text-sm mb-1">邮箱</p>
              {editing ? (
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="请输入邮箱"
                  className="w-full border border-border bg-background rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent transition-colors placeholder:text-muted-foreground/50"
                />
              ) : (
                <p className="text-foreground text-sm">{profile?.email || '—'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Edit action buttons */}
        {editing && (
          <div className="flex gap-3 mt-6 pt-5 border-t border-border">
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Save size={14} strokeWidth={1.5} />
              {updateMutation.isPending ? '保存中...' : '保存'}
            </button>
            <button
              onClick={handleCancel}
              disabled={updateMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors"
            >
              <X size={14} strokeWidth={1.5} />
              取消
            </button>
            {updateMutation.isError && (
              <p className="text-destructive text-sm self-center">
                保存失败，请重试
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
