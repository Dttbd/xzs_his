import { apiClient } from './client'
import type { ApiResponse } from './types'

export interface UploadResult {
  id: string
  file_name: string
  file_url: string
  file_size: number
  file_type: string
}

export async function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post<ApiResponse<UploadResult>>(
    '/api/common/v1/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return data.data!
}
