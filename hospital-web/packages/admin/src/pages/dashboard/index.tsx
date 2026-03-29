import { useAuthStore } from '@hospital/shared'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">
        欢迎回来，{user?.real_name || '管理员'}
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">工作台 — 仪表盘功能开发中</p>
    </div>
  )
}
