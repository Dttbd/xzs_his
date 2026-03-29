import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserInfo } from '../api/types'
import { loginApi, logoutApi } from '../api/auth'

interface AuthState {
  token: string | null
  user: UserInfo | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setToken: (token: string) => void
  setUser: (user: UserInfo) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: async (username, password) => {
        const resp = await loginApi(username, password)
        localStorage.setItem('his-token', resp.token)
        set({
          token: resp.token,
          user: resp.user,
          isAuthenticated: true,
        })
      },

      logout: async () => {
        try {
          await logoutApi()
        } catch {
          // ignore logout API errors
        }
        localStorage.removeItem('his-token')
        set({ token: null, user: null, isAuthenticated: false })
      },

      setToken: (token) => {
        localStorage.setItem('his-token', token)
        set({ token, isAuthenticated: true })
      },

      setUser: (user) => set({ user }),

      clear: () => {
        localStorage.removeItem('his-token')
        set({ token: null, user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'his-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
