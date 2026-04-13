import { apiClient } from './client'
import type { ApiResponse, PageResult } from './types'

// --- Types ---

export interface TicketType {
  id: string
  name: string
  code: string
  icon: string
  description: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface TicketStatus {
  id: string
  name: string
  code: string
  color: string
  is_initial: boolean
  is_terminal: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface TicketTransition {
  id: string
  from_status_id: string
  to_status_id: string
  name: string
  allowed_roles: string
  created_at: string
  updated_at: string
  from_status?: TicketStatus
  to_status?: TicketStatus
}

export interface Ticket {
  id: string
  ticket_no: string
  title: string
  description: string
  type_id: string
  status_id: string
  priority: number
  hospital_id: string | null
  creator_id: string
  assignee_id: string | null
  province_id: string | null
  region_id: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  type?: TicketType
  status?: TicketStatus
  hospital?: { id: string; name: string; code: string }
  creator?: { id: string; username: string; real_name: string }
  assignee?: { id: string; username: string; real_name: string } | null
  province?: { id: string; name: string; code: string }
  comments?: TicketComment[]
  attachments?: TicketAttachment[]
  logs?: TicketLog[]
}

export interface TicketComment {
  id: string
  ticket_id: string
  user_id: string
  content: string
  is_internal: boolean
  created_at: string
  updated_at: string
  user?: { id: string; username: string; real_name: string; avatar_url: string }
}

export interface TicketAttachment {
  id: string
  ticket_id: string
  comment_id: string | null
  file_name: string
  file_url: string
  file_size: number
  file_type: string
  uploader_id: string
  created_at: string
  updated_at: string
  uploader?: { id: string; username: string; real_name: string }
}

export interface TicketLog {
  id: string
  ticket_id: string
  user_id: string
  action: string
  from_status: string
  to_status: string
  detail: string
  created_at: string
  updated_at: string
  user?: { id: string; username: string; real_name: string }
}

// --- Ticket CRUD ---

export async function listTickets(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<PageResult<Ticket>>>('/api/admin/v1/tickets', { params })
  return data.data!
}

export async function getTicket(id: string) {
  const { data } = await apiClient.get<ApiResponse<Ticket>>(`/api/admin/v1/tickets/${id}`)
  return data.data!
}

export async function createTicket(payload: Partial<Ticket>) {
  const { data } = await apiClient.post<ApiResponse<Ticket>>('/api/admin/v1/tickets', payload)
  return data.data!
}

export async function transitionTicket(id: string, payload: { to_status_id: string; comment?: string }) {
  const { data } = await apiClient.put<ApiResponse<Ticket>>(`/api/admin/v1/tickets/${id}/transition`, payload)
  return data.data!
}

export async function assignTicket(id: string, payload: { assignee_id: string }) {
  const { data } = await apiClient.put<ApiResponse<Ticket>>(`/api/admin/v1/tickets/${id}/assign`, payload)
  return data.data!
}

export async function addComment(ticketId: string, payload: { content: string; is_internal?: boolean }) {
  const { data } = await apiClient.post<ApiResponse<TicketComment>>(`/api/admin/v1/tickets/${ticketId}/comments`, payload)
  return data.data!
}

export async function addAttachment(ticketId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post<ApiResponse<TicketAttachment>>(
    `/api/admin/v1/tickets/${ticketId}/attachments`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return data.data!
}

// --- Ticket Type CRUD ---

export async function listTicketTypes(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<PageResult<TicketType>>>('/api/admin/v1/ticket-types', { params: { page_size: 100, ...params } })
  return data.data!.list
}

export async function createTicketType(payload: Partial<TicketType>) {
  const { data } = await apiClient.post<ApiResponse<TicketType>>('/api/admin/v1/ticket-types', payload)
  return data.data!
}

export async function updateTicketType(id: string, payload: Partial<TicketType>) {
  const { data } = await apiClient.put<ApiResponse<TicketType>>(`/api/admin/v1/ticket-types/${id}`, payload)
  return data.data!
}

export async function deleteTicketType(id: string) {
  await apiClient.delete(`/api/admin/v1/ticket-types/${id}`)
}

// --- Ticket Status CRUD ---

export async function listTicketStatuses(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<PageResult<TicketStatus>>>('/api/admin/v1/ticket-statuses', { params: { page_size: 100, ...params } })
  return data.data!.list
}

export async function createTicketStatus(payload: Partial<TicketStatus>) {
  const { data } = await apiClient.post<ApiResponse<TicketStatus>>('/api/admin/v1/ticket-statuses', payload)
  return data.data!
}

export async function updateTicketStatus(id: string, payload: Partial<TicketStatus>) {
  const { data } = await apiClient.put<ApiResponse<TicketStatus>>(`/api/admin/v1/ticket-statuses/${id}`, payload)
  return data.data!
}

export async function deleteTicketStatus(id: string) {
  await apiClient.delete(`/api/admin/v1/ticket-statuses/${id}`)
}

// --- Ticket Transition CRUD ---

export async function listTransitions(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<PageResult<TicketTransition>>>('/api/admin/v1/ticket-transitions', { params: { page_size: 100, ...params } })
  return data.data!.list
}

export async function createTransition(payload: Partial<TicketTransition>) {
  const { data } = await apiClient.post<ApiResponse<TicketTransition>>('/api/admin/v1/ticket-transitions', payload)
  return data.data!
}

export async function updateTransition(id: string, payload: Partial<TicketTransition>) {
  const { data } = await apiClient.put<ApiResponse<TicketTransition>>(`/api/admin/v1/ticket-transitions/${id}`, payload)
  return data.data!
}

export async function deleteTransition(id: string) {
  await apiClient.delete(`/api/admin/v1/ticket-transitions/${id}`)
}
