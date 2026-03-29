import { apiClient } from './client'
import type { ApiResponse, PageResult } from './types'

// --- Types ---

export interface Notification {
  id: string
  user_id: string
  title: string
  content: string
  type: string
  ref_type: string
  ref_id: string | null
  is_read: boolean
  created_at: string
  updated_at: string
}

// --- Notification API ---

export async function listNotifications(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<PageResult<Notification>>>('/api/admin/v1/notifications', { params })
  return data.data!
}

export async function markNotificationRead(id: string) {
  const { data } = await apiClient.put<ApiResponse<null>>(`/api/admin/v1/notifications/${id}/read`)
  return data
}

export async function markAllRead() {
  const { data } = await apiClient.put<ApiResponse<null>>('/api/admin/v1/notifications/read-all')
  return data
}

export async function getUnreadCount() {
  const { data } = await apiClient.get<ApiResponse<{ count: number }>>('/api/admin/v1/notifications/unread-count')
  return data.data!
}
