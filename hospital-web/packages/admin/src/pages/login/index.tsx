import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore, ThemeToggle } from '@hospital/shared'

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()

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
      await login(data.username, data.password)
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Theme toggle in corner */}
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm bg-card border border-border rounded-xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-accent">&#9670; HIS</h1>
          <p className="text-muted-foreground text-sm mt-1">医院信息管理系统</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm text-foreground mb-1.5">
              用户名
            </label>
            <input
              id="username"
              type="text"
              placeholder="请输入用户名"
              {...register('username')}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm
                placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors"
            />
            {errors.username && (
              <p className="text-destructive text-xs mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-foreground mb-1.5">
              密码
            </label>
            <input
              id="password"
              type="password"
              placeholder="请输入密码"
              {...register('password')}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm
                placeholder:text-muted-foreground/50 outline-none focus:border-accent transition-colors"
            />
            {errors.password && (
              <p className="text-destructive text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          {errors.root && (
            <p className="text-destructive text-sm">{errors.root.message}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-accent text-accent-foreground rounded-lg text-sm font-medium
              hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isSubmitting ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  )
}
