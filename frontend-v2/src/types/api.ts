export interface PageResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
}

/** Envelope lỗi dùng chung của 4 service: {success, code, message, data}. */
export interface ApiErrorEnvelope {
  success?: boolean
  code?: string | null
  message?: string | null
  data?: unknown
  timestamp?: string
  path?: string
}
