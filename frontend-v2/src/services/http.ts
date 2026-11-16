import axios, { type AxiosError } from 'axios'

import { useSessionStore } from '@/stores/session-store'
import type { LoginResponse } from '@/types/session'

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Bỏ qua cơ chế refresh (dùng cho chính endpoint refresh). */
    skipAuthRefresh?: boolean
    /** Đã thử lại sau khi refresh hay chưa. */
    _retry?: boolean
  }
}

export type DataSource = 'mock' | 'api'

export const DATA_SOURCE: DataSource =
  (import.meta.env.VITE_DATA_SOURCE as DataSource | undefined) ?? 'api'

export const isMockMode = DATA_SOURCE === 'mock'

/**
 * Một axios instance duy nhất: backend dùng nhiều tiền tố đường dẫn
 * (`/api/v1/...`, `/departments...`, `/api/schedules/...`) nên baseURL để trống
 * và mỗi service khai báo đường dẫn tuyệt đối.
 */
export const api = axios.create({
  baseURL: '',
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
})

// Mock được nạp động: bản build API thật không kéo dữ liệu demo vào bundle chính.
if (isMockMode) {
  const { mockAdapter } = await import('@/services/mock/adapter')
  api.defaults.adapter = mockAdapter
}

api.interceptors.request.use((config) => {
  const token = useSessionStore.getState().accessToken
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

let refreshPromise: Promise<LoginResponse> | null = null

async function refreshAccessToken(): Promise<LoginResponse> {
  const refreshToken = useSessionStore.getState().refreshToken
  if (!refreshToken) throw new Error('NO_REFRESH_TOKEN')

  const { data } = await api.post<LoginResponse>(
    '/api/v1/auth/refresh',
    { refreshToken },
    { skipAuthRefresh: true },
  )
  useSessionStore.getState().setTokens(data.accessToken, data.refreshToken)
  return data
}

function ensureRefreshed(): Promise<LoginResponse> {
  // Chỉ một request refresh tại một thời điểm; các 401 khác chờ chung promise.
  refreshPromise ??= refreshAccessToken().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

function expireSession() {
  useSessionStore.getState().clear()
  window.dispatchEvent(new CustomEvent('mems:session-expired'))
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config
    const status = error.response?.status
    const url = config?.url ?? ''

    const isAuthEndpoint = url.includes('/api/v1/auth/login') || url.includes('/api/v1/auth/refresh')

    if (status === 401 && config && !config.skipAuthRefresh && !config._retry && !isAuthEndpoint) {
      config._retry = true
      try {
        const refreshed = await ensureRefreshed()
        config.headers?.set('Authorization', `Bearer ${refreshed.accessToken}`)
        return api(config)
      } catch {
        expireSession()
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)

export function getApiErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không mong muốn.'
}
