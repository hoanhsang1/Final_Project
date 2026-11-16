import { isAxiosError } from 'axios'

import { translateError } from '@/lib/error-messages'
import type { ApiErrorEnvelope } from '@/types/api'

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly details?: unknown

  constructor(params: { message: string; status?: number; code?: string; details?: unknown }) {
    super(params.message)
    this.name = 'ApiError'
    this.status = params.status ?? 0
    this.code = params.code
    this.details = params.details
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error

    if (isAxiosError(error)) {
      const status = error.response?.status ?? 0
      const body = (error.response?.data ?? {}) as ApiErrorEnvelope
      const code = typeof body.code === 'string' ? body.code : undefined
      return new ApiError({
        status,
        code,
        message: translateError({ code, status, message: body.message }),
        details: body.data,
      })
    }

    if (error instanceof Error) {
      return new ApiError({ message: error.message, status: 0 })
    }
    return new ApiError({ message: 'Đã xảy ra lỗi không mong muốn.', status: 0 })
  }
}

export function errorMessage(error: unknown): string {
  return ApiError.from(error).message
}

export function isForbidden(error: unknown): boolean {
  return ApiError.from(error).status === 403
}

export function isNotFound(error: unknown): boolean {
  return ApiError.from(error).status === 404
}
