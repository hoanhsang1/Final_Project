import { api } from '@/services/http'
import type {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  RegisterOrganizationRequest,
  RegisterOrganizationResponse,
} from '@/types/session'

export const authApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/api/v1/auth/login', payload)
    return data
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post('/api/v1/auth/logout', { refreshToken }, { skipAuthRefresh: true })
  },

  async refresh(refreshToken: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>(
      '/api/v1/auth/refresh',
      { refreshToken },
      { skipAuthRefresh: true },
    )
    return data
  },

  async changePassword(payload: ChangePasswordRequest): Promise<void> {
    await api.post('/api/v1/auth/change-password', payload)
  },

  async register(payload: RegisterOrganizationRequest): Promise<RegisterOrganizationResponse> {
    const { data } = await api.post<RegisterOrganizationResponse>('/api/v1/auth/register', payload)
    return data
  },
}
