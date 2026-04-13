import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Lock, Eye, EyeOff, ArrowRight, HeartPulse } from 'lucide-react'
import {
  ThemeToggle,
  useAuthStore,
  portalLoginApi,
  Button,
  Input,
  Label,
} from '@hospital/shared'

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

type LoginForm = z.infer<typeof loginSchema>

export function PortalLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showPwd, setShowPwd] = useState(false)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      const resp = await portalLoginApi(data.username, data.password)
      localStorage.setItem('his-token', resp.token)
      useAuthStore.getState().setToken(resp.token)
      useAuthStore.getState().setUser(resp.user)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        '登录失败'
      setError('root', { message })
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left — login form */}
      <div className="flex-1 flex flex-col">
        {/* top bar */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <HeartPulse size={20} strokeWidth={1.5} className="text-accent" />
            <span className="text-base font-semibold text-foreground">客户门户</span>
          </div>
          <ThemeToggle />
        </div>

        {/* form area */}
        <div className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="w-full max-w-[360px]">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground">客户登录</h1>
              <p className="text-muted text-sm mt-2">请使用您的客户账号登录</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* username */}
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm text-foreground">用户名</Label>
                <div className="relative">
                  <User size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="请输入用户名"
                    className="pl-9"
                    {...register('username')}
                  />
                </div>
                {errors.username && (
                  <p className="text-destructive text-xs">{errors.username.message}</p>
                )}
              </div>

              {/* password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm text-foreground">密码</Label>
                <div className="relative">
                  <Lock size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="请输入密码"
                    className="pl-9 pr-9"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPwd
                      ? <EyeOff size={16} strokeWidth={1.5} />
                      : <Eye size={16} strokeWidth={1.5} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-destructive text-xs">{errors.password.message}</p>
                )}
              </div>

              {/* error */}
              {errors.root && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5">
                  <p className="text-destructive text-sm">{errors.root.message}</p>
                </div>
              )}

              {/* submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 text-sm font-medium"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                    登录中
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    登录
                    <ArrowRight size={16} strokeWidth={1.5} />
                  </span>
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-8">
              如需开通账号，请联系您的客户经理
            </p>
          </div>
        </div>
      </div>

      {/* Right — brand panel */}
      <div className="hidden lg:flex lg:w-[56%] relative overflow-hidden items-center justify-center bg-gradient-to-bl from-accent/10 via-accent/5 to-transparent">
        {/* decorative grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle, var(--accent) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        {/* floating shapes */}
        <div className="absolute top-[18%] right-[10%] w-56 h-56 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute bottom-[15%] left-[12%] w-72 h-72 rounded-full bg-accent/[0.03] blur-3xl" />

        {/* content */}
        <div className="relative z-10 max-w-md px-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <HeartPulse size={22} strokeWidth={1.5} className="text-accent" />
            </div>
            <span className="text-xl font-semibold text-foreground tracking-tight">HIS 客户门户</span>
          </div>

          <h2 className="text-3xl font-bold text-foreground leading-tight mb-4">
            在线服务平台
          </h2>
          <p className="text-muted leading-relaxed text-[15px]">
            提交工单、跟踪处理进度、与技术团队实时沟通，获得高效的服务支持。
          </p>

          <div className="mt-10 space-y-4">
            {[
              '快速提交与跟踪工单',
              '实时查看处理进度',
              '在线留言与附件上传',
            ].map((text) => (
              <div key={text} className="flex items-center gap-3 text-sm text-muted">
                <div className="w-1.5 h-1.5 rounded-full bg-accent/60 shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
