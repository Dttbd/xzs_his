import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useAuthStore,
  ThemeToggle,
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardContent,
} from '@hospital/shared'

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

      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <h1 className="text-2xl font-bold text-accent">&#9670; HIS</h1>
          <p className="text-muted-foreground text-sm mt-1">医院信息管理系统</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                className="mt-1.5"
                {...register('username')}
              />
              {errors.username && (
                <p className="text-destructive text-xs mt-1">{errors.username.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                className="mt-1.5"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-destructive text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {errors.root && (
              <p className="text-destructive text-sm">{errors.root.message}</p>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? '登录中...' : '登录'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
