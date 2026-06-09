import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loginApi } from './auth'

// Mock the axios client module
vi.mock('./client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

import { apiClient } from './client'

const mockPost = apiClient.post as ReturnType<typeof vi.fn>

const fakeUser = {
  id: '1',
  username: 'admin',
  real_name: 'Admin',
  phone: '',
  email: '',
  avatar_url: '',
  region_id: null,
  province_id: null,
  status: 1,
  roles: [],
}

describe('loginApi()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns data.data on success (code === 0)', async () => {
    const loginResp = { token: 'test-token', expires_in: 86400, user: fakeUser }
    mockPost.mockResolvedValueOnce({ data: { code: 0, message: 'ok', data: loginResp } })

    const result = await loginApi('admin', 'admin123')
    expect(result).toEqual(loginResp)
    expect(mockPost).toHaveBeenCalledWith('/api/auth/login', {
      username: 'admin',
      password: 'admin123',
    })
  })

  it('throws an Error when code !== 0', async () => {
    mockPost.mockResolvedValueOnce({
      data: { code: 1001, message: '用户名或密码错误', data: null },
    })

    await expect(loginApi('admin', 'wrong')).rejects.toThrow('用户名或密码错误')
  })
})
