export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data?: T
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

export interface PageQuery {
  page?: number
  page_size?: number
  keyword?: string
}

export interface LoginResponse {
  token: string
  expires_in: number
  user: UserInfo
}

export interface UserInfo {
  id: string
  username: string
  real_name: string
  phone: string
  email: string
  avatar_url: string
  region_id: string | null
  province_id: string | null
  status: number
  roles: Array<{ id: string; name: string; code: string }>
}
