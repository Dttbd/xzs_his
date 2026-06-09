import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './auth-store'

const fakeUser = {
  id: '42',
  username: 'testuser',
  real_name: 'Test User',
  phone: '',
  email: '',
  avatar_url: '',
  region_id: null,
  province_id: null,
  status: 1,
  roles: [],
}

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false })
    localStorage.clear()
  })

  it('setToken stores token and marks isAuthenticated true', () => {
    useAuthStore.getState().setToken('my-jwt')
    const state = useAuthStore.getState()
    expect(state.token).toBe('my-jwt')
    expect(state.isAuthenticated).toBe(true)
    expect(localStorage.getItem('his-token')).toBe('my-jwt')
  })

  it('setUser stores user without changing authentication state', () => {
    useAuthStore.getState().setUser(fakeUser)
    const state = useAuthStore.getState()
    expect(state.user).toEqual(fakeUser)
    // isAuthenticated remains false unless setToken was called
    expect(state.isAuthenticated).toBe(false)
  })

  it('clear resets all auth state and removes localStorage token', () => {
    useAuthStore.getState().setToken('some-token')
    useAuthStore.getState().setUser(fakeUser)
    useAuthStore.getState().clear()

    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(localStorage.getItem('his-token')).toBeNull()
  })
})
