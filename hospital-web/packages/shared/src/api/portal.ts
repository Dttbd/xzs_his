import { apiClient } from './client'
import type { ApiResponse, LoginResponse, PageResult, UserInfo } from './types'

// Portal uses different auth endpoint
export async function portalLoginApi(username: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/api/portal/auth/login', { username, password })
  if (data.code !== 0) throw new Error(data.message)
  return data.data!
}

// Portal ticket types
export interface PortalTicket {
  id: string
  ticket_no: string
  title: string
  description: string
  type: { id: string; name: string; code: string }
  status: { id: string; name: string; code: string; color: string }
  creator: { id: string; real_name: string }
  assignee?: { id: string; real_name: string }
  created_at: string
  resolved_at?: string
  comments?: PortalComment[]
  attachments?: PortalAttachment[]
}

export interface PortalComment {
  id: string
  user: { id: string; real_name: string }
  content: string
  is_internal: boolean
  created_at: string
}

export interface PortalAttachment {
  id: string
  file_name: string
  file_url: string
  file_size: number
  file_type: string
  created_at: string
}

export async function listPortalTickets(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<PageResult<PortalTicket>>>('/api/portal/v1/tickets', { params })
  return data.data!
}

export async function getPortalTicket(id: string) {
  const { data } = await apiClient.get<ApiResponse<PortalTicket>>(`/api/portal/v1/tickets/${id}`)
  return data.data!
}

export async function createPortalTicket(body: { title: string; description: string; type_id: string }) {
  const { data } = await apiClient.post<ApiResponse<PortalTicket>>('/api/portal/v1/tickets', body)
  return data.data!
}

export async function addPortalComment(ticketId: string, body: { content: string }) {
  const { data } = await apiClient.post<ApiResponse<PortalComment>>(`/api/portal/v1/tickets/${ticketId}/comments`, body)
  return data.data!
}

export async function addPortalAttachment(ticketId: string, body: Record<string, any>) {
  const { data } = await apiClient.post<ApiResponse<PortalAttachment>>(`/api/portal/v1/tickets/${ticketId}/attachments`, body)
  return data.data!
}

export async function getPortalProfile() {
  const { data } = await apiClient.get<ApiResponse<UserInfo>>('/api/portal/v1/profile')
  return data.data!
}

export async function updatePortalProfile(body: Record<string, any>) {
  const { data } = await apiClient.put<ApiResponse<UserInfo>>('/api/portal/v1/profile', body)
  return data.data!
}
