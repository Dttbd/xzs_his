import { apiClient } from './client'
import type { ApiResponse } from './types'

// --- Types ---

export interface OverviewStats {
  hospital_count: number
  ticket_count: number
  open_ticket_count: number
  user_count: number
  [key: string]: number
}

export interface ChartDataItem {
  label: string
  value: number
  [key: string]: any
}

export interface TrendItem {
  date: string
  count: number
  [key: string]: any
}

export interface SalesStatsItem {
  user_id: string
  user_name: string
  hospital_count: number
  ticket_count: number
  resolved_count: number
  [key: string]: any
}

// --- Report API ---

export async function getOverview(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<OverviewStats>>('/api/admin/v1/reports/overview', { params })
  return data.data!
}

export async function getHospitalStats(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<ChartDataItem[]>>('/api/admin/v1/reports/hospital-stats', { params })
  return data.data!
}

export async function getTicketStats(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<ChartDataItem[]>>('/api/admin/v1/reports/ticket-stats', { params })
  return data.data!
}

export async function getTicketTrend(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<TrendItem[]>>('/api/admin/v1/reports/ticket-trend', { params })
  return data.data!
}

export async function getSalesStats(params?: Record<string, any>) {
  const { data } = await apiClient.get<ApiResponse<SalesStatsItem[]>>('/api/admin/v1/reports/sales-stats', { params })
  return data.data!
}
