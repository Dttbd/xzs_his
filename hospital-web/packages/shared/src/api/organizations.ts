import { apiClient } from './client'
import type { ApiResponse, PageResult } from './types'

// --- Types ---

export interface Region {
  id: string
  name: string
  code: string
  status: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Province {
  id: string
  region_id: string
  name: string
  code: string
  default_handler: string | null
  status: number
  sort_order: number
  created_at: string
  updated_at: string
  region?: Region
}

// --- Region CRUD ---

export async function listRegions(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<PageResult<Region>>>('/api/admin/v1/regions', { params: { page_size: 100, ...params } })
  return data.data!.list
}

export async function createRegion(payload: Partial<Region>) {
  const { data } = await apiClient.post<ApiResponse<Region>>('/api/admin/v1/regions', payload)
  return data.data!
}

export async function updateRegion(id: string, payload: Partial<Region>) {
  const { data } = await apiClient.put<ApiResponse<Region>>(`/api/admin/v1/regions/${id}`, payload)
  return data.data!
}

export async function deleteRegion(id: string) {
  await apiClient.delete(`/api/admin/v1/regions/${id}`)
}

// --- Province CRUD ---

export async function listProvinces(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<PageResult<Province>>>('/api/admin/v1/provinces', { params: { page_size: 100, ...params } })
  return data.data!.list
}

export async function createProvince(payload: Partial<Province>) {
  const { data } = await apiClient.post<ApiResponse<Province>>('/api/admin/v1/provinces', payload)
  return data.data!
}

export async function updateProvince(id: string, payload: Partial<Province>) {
  const { data } = await apiClient.put<ApiResponse<Province>>(`/api/admin/v1/provinces/${id}`, payload)
  return data.data!
}

export async function deleteProvince(id: string) {
  await apiClient.delete(`/api/admin/v1/provinces/${id}`)
}
