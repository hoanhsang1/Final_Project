import { api } from '@/services/http'
import type {
  ApprovalCapabilities,
  ChangePasswordRequest,
  EffectivePermissionsResponse,
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

  /** Khả năng duyệt của chính mình (policy chức danh + uỷ quyền), không suy từ role. */
  async approvalCapabilities(): Promise<ApprovalCapabilities> {
    const { data } = await api.get<ApprovalCapabilities>('/users/me/approval-capabilities')
    return data
  },

  /** Quyền hiệu lực hiện tại — dùng sau khi chức vụ/uỷ quyền thay đổi. */
  async effectivePermissions(): Promise<EffectivePermissionsResponse> {
    const { data } = await api.get<EffectivePermissionsResponse>('/users/me/permissions')
    return data
  },
}
