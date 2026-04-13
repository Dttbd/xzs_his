import { apiClient } from './client'
import type { ApiResponse, PageResult, UserInfo } from './types'

// --- Types ---

export interface Role {
  id: string
  name: string
  code: string
  description: string
  is_system: boolean
  status: number
  created_at: string
  updated_at: string
}

// --- User CRUD ---

export async function listUsers(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<PageResult<UserInfo>>>('/api/admin/v1/users', { params })
  return data.data!
}

export async function getUser(id: string) {
  const { data } = await apiClient.get<ApiResponse<UserInfo>>(`/api/admin/v1/users/${id}`)
  return data.data!
}

export async function createUser(payload: Record<string, any>) {
  const { data } = await apiClient.post<ApiResponse<UserInfo>>('/api/admin/v1/users', payload)
  return data.data!
}

export async function updateUser(id: string, payload: Record<string, any>) {
  const { data } = await apiClient.put<ApiResponse<UserInfo>>(`/api/admin/v1/users/${id}`, payload)
  return data.data!
}

export async function deleteUser(id: string) {
  await apiClient.delete(`/api/admin/v1/users/${id}`)
}

export async function setUserRoles(id: string, roleIds: string[]) {
  const { data } = await apiClient.put<ApiResponse<null>>(`/api/admin/v1/users/${id}/roles`, { role_ids: roleIds })
  return data
}

export async function changePassword(body: { old_password: string; new_password: string }) {
  const { data } = await apiClient.put<ApiResponse<null>>('/api/admin/v1/users/change-password', body)
  if (data.code !== 0) throw new Error(data.message)
  return data
}

// --- Role CRUD ---

export async function listRoles(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<PageResult<Role>>>('/api/admin/v1/roles', { params: { page_size: 100, ...params } })
  return data.data!.list
}

export async function createRole(payload: Partial<Role>) {
  const { data } = await apiClient.post<ApiResponse<Role>>('/api/admin/v1/roles', payload)
  return data.data!
}

export async function updateRole(id: string, payload: Partial<Role>) {
  const { data } = await apiClient.put<ApiResponse<Role>>(`/api/admin/v1/roles/${id}`, payload)
  return data.data!
}

export async function deleteRole(id: string) {
  await apiClient.delete(`/api/admin/v1/roles/${id}`)
}
