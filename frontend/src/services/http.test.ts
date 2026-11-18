import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'

import { createQueryClient } from '@/app/providers'
import { api, ApiDeploymentMismatchError } from '@/services/http'

const originalAdapter = api.defaults.adapter

afterEach(() => {
  api.defaults.adapter = originalAdapter
})

function respond(config: InternalAxiosRequestConfig, data: unknown, status = 200): Promise<AxiosResponse> {
  return Promise.resolve({ data, status, statusText: 'OK', headers: {}, config })
}

function fail(config: InternalAxiosRequestConfig, data: unknown, status: number): Promise<never> {
  const response = { data, status, statusText: 'Error', headers: {}, config } as AxiosResponse
  return Promise.reject(new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, {}, response))
}

describe('phát hiện API không khớp triển khai', () => {
  it('báo lỗi rõ khi path API trả HTML (Vercel SPA fallback/thiếu rewrite)', async () => {
    api.defaults.adapter = (config) => respond(config, '<!doctype html><html></html>')

    await expect(api.get('/api/v1/modules/status')).rejects.toBeInstanceOf(ApiDeploymentMismatchError)
  })

  it('giữ nguyên lỗi 404 JSON để trang hiển thị đúng lỗi nghiệp vụ', async () => {
    api.defaults.adapter = (config) => fail(config, { status: 404 }, 404)

    const error = await api.get('/transfer-requests/inbox').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(AxiosError)
    expect(error).not.toBeInstanceOf(ApiDeploymentMismatchError)
  })

  it('không thử lại 4xx nhưng vẫn thử lại lỗi mạng/5xx một lần', () => {
    const retry = createQueryClient().getDefaultOptions().queries?.retry as (
      count: number,
      error: unknown,
    ) => boolean

    expect(retry(0, { isAxiosError: true, response: { status: 404 } })).toBe(false)
    expect(retry(0, { isAxiosError: true, response: { status: 403 } })).toBe(false)
    expect(retry(0, { isAxiosError: true, response: { status: 503 } })).toBe(true)
    expect(retry(1, { isAxiosError: true, response: { status: 503 } })).toBe(false)
    expect(retry(0, new Error('network'))).toBe(true)
  })
})
