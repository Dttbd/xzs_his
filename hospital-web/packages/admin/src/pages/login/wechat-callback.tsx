import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore, wechatCallbackApi } from '@hospital/shared'

export function WechatCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.setToken)
  const setUser = useAuthStore((s) => s.setUser)
  const [error, setError] = useState('')

  useEffect(() => {
    const code = params.get('code') || ''
    const state = params.get('state') || ''
    const saved = sessionStorage.getItem('wechat_oauth_state')
    if (!code || (saved && state && saved !== state)) {
      setError('登录校验失败，请重试')
      return
    }
    wechatCallbackApi(code, state)
      .then((resp) => {
        setToken(resp.token)
        setUser(resp.user)
        navigate('/', { replace: true })
      })
      .catch(() => setError('企业微信登录失败，请确认账号已绑定'))
  }, [params, navigate, setToken, setUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted text-sm">{error || '正在登录…'}</p>
    </div>
  )
}
