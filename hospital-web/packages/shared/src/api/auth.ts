import { apiClient } from './client'
import type { ApiResponse, LoginResponse } from './types'

export async function loginApi(username: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/api/auth/login', {
    username,
    password,
  })
  if (data.code !== 0) {
    throw new Error(data.message)
  }
  return data.data!
}

export async function logoutApi(): Promise<void> {
  await apiClient.post('/api/auth/logout')
}

export async function refreshTokenApi(): Promise<{ token: string; expires_in: number }> {
  const { data } = await apiClient.post<ApiResponse<{ token: string; expires_in: number }>>(
    '/api/admin/v1/auth/refresh'
  )
  return data.data!
}
