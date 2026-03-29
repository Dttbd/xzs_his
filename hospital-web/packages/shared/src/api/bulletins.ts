import { apiClient } from './client'
import type { ApiResponse, PageResult } from './types'

// --- Types ---

export interface Bulletin {
  id: string
  title: string
  content: string
  scope_type: string
  scope_id: string
  author_id: string
  is_pinned: boolean
  published_at: string | null
  expires_at: string | null
  status: number
  created_at: string
  updated_at: string
  author?: { id: string; username: string; real_name: string }
}

// --- Bulletin CRUD ---

export async function listBulletins(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<PageResult<Bulletin>>>('/api/admin/v1/bulletins', { params })
  return data.data!
}

export async function getBulletin(id: string) {
  const { data } = await apiClient.get<ApiResponse<Bulletin>>(`/api/admin/v1/bulletins/${id}`)
  return data.data!
}

export async function createBulletin(payload: Partial<Bulletin>) {
  const { data } = await apiClient.post<ApiResponse<Bulletin>>('/api/admin/v1/bulletins', payload)
  return data.data!
}

export async function updateBulletin(id: string, payload: Partial<Bulletin>) {
  const { data } = await apiClient.put<ApiResponse<Bulletin>>(`/api/admin/v1/bulletins/${id}`, payload)
  return data.data!
}

export async function deleteBulletin(id: string) {
  await apiClient.delete(`/api/admin/v1/bulletins/${id}`)
}

export async function publishBulletin(id: string) {
  const { data } = await apiClient.put<ApiResponse<Bulletin>>(`/api/admin/v1/bulletins/${id}/publish`)
  return data.data!
}
