import { apiClient } from './client'
import type { ApiResponse, PageResult } from './types'

// --- Types ---

export interface Hospital {
  id: string
  name: string
  code: string
  category_id: string | null
  level: string
  province_id: string | null
  city: string
  address: string
  contact_name: string
  contact_phone: string
  contact_email: string
  bed_count: number
  department_count: number
  is_specialized: boolean
  specialty_type: string
  owner_user_id: string | null
  status: number
  remark: string
  created_at: string
  updated_at: string
  category?: HospitalCategory
  province?: { id: string; name: string; code: string; region_id: string }
  owner_user?: { id: string; username: string; real_name: string }
  fields?: HospitalField[]
}

export interface HospitalCategory {
  id: string
  name: string
  code: string
  parent_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
  parent?: HospitalCategory
  children?: HospitalCategory[]
}

export interface FieldDefinition {
  id: string
  field_key: string
  field_name: string
  field_type: string
  options: string
  is_required: boolean
  is_filterable: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface HospitalField {
  id: string
  hospital_id: string
  field_key: string
  field_value: string
}

// --- Hospital CRUD ---

export async function listHospitals(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<PageResult<Hospital>>>('/api/admin/v1/hospitals', { params })
  return data.data!
}

export async function getHospital(id: string) {
  const { data } = await apiClient.get<ApiResponse<Hospital>>(`/api/admin/v1/hospitals/${id}`)
  return data.data!
}

export async function createHospital(payload: Partial<Hospital>) {
  const { data } = await apiClient.post<ApiResponse<Hospital>>('/api/admin/v1/hospitals', payload)
  return data.data!
}

export async function updateHospital(id: string, payload: Partial<Hospital>) {
  const { data } = await apiClient.put<ApiResponse<Hospital>>(`/api/admin/v1/hospitals/${id}`, payload)
  return data.data!
}

export async function deleteHospital(id: string) {
  await apiClient.delete(`/api/admin/v1/hospitals/${id}`)
}

export async function getHospitalSummary(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<Record<string, any>>>('/api/admin/v1/hospitals/summary', { params })
  return data.data!
}

export async function exportHospitals(params?: Record<string, any>) {
  const response = await apiClient.get('/api/admin/v1/hospitals/export', {
    params,
    responseType: 'blob',
  })
  return response.data as Blob
}

// --- Category CRUD ---

export async function listCategories(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<HospitalCategory[]>>('/api/admin/v1/hospital-categories', { params })
  return data.data!
}

export async function createCategory(payload: Partial<HospitalCategory>) {
  const { data } = await apiClient.post<ApiResponse<HospitalCategory>>('/api/admin/v1/hospital-categories', payload)
  return data.data!
}

export async function updateCategory(id: string, payload: Partial<HospitalCategory>) {
  const { data } = await apiClient.put<ApiResponse<HospitalCategory>>(`/api/admin/v1/hospital-categories/${id}`, payload)
  return data.data!
}

export async function deleteCategory(id: string) {
  await apiClient.delete(`/api/admin/v1/hospital-categories/${id}`)
}

// --- Field Definition CRUD ---

export async function listFieldDefinitions(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<FieldDefinition[]>>('/api/admin/v1/field-definitions', { params })
  return data.data!
}

export async function createFieldDefinition(payload: Partial<FieldDefinition>) {
  const { data } = await apiClient.post<ApiResponse<FieldDefinition>>('/api/admin/v1/field-definitions', payload)
  return data.data!
}

export async function updateFieldDefinition(id: string, payload: Partial<FieldDefinition>) {
  const { data } = await apiClient.put<ApiResponse<FieldDefinition>>(`/api/admin/v1/field-definitions/${id}`, payload)
  return data.data!
}

export async function deleteFieldDefinition(id: string) {
  await apiClient.delete(`/api/admin/v1/field-definitions/${id}`)
}
