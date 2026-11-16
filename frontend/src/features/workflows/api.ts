import { api } from '@/services/http'
import type {
  Delegation,
  DelegationInput,
  EffectivePermissions,
  GeneralManager,
  GeneralManagerCandidate,
  PermissionBundle,
  PermissionDefinition,
  ResignationRequest,
  TransferDecisionInput,
  TransferRequest,
  TransferStepCode,
} from '@/features/workflows/types'

export const resignationsApi = {
  async list(departmentId: string, status?: string): Promise<ResignationRequest[]> {
    const { data } = await api.get<ResignationRequest[]>(
      `/departments/${departmentId}/resignation-requests`,
      { params: { status: status || undefined } },
    )
    return data
  },

  async create(
    departmentId: string,
    input: { userId: string; reason: string },
  ): Promise<ResignationRequest> {
    const { data } = await api.post<ResignationRequest>(
      `/departments/${departmentId}/resignation-requests`,
      input,
    )
    return data
  },

  async decide(
    departmentId: string,
    requestId: string,
    decision: 'approve' | 'reject',
    note?: string,
  ): Promise<ResignationRequest> {
    const { data } = await api.post<ResignationRequest>(
      `/departments/${departmentId}/resignation-requests/${requestId}/${decision}`,
      { note },
    )
    return data
  },
}

export const transferWorkflowApi = {
  async inbox(): Promise<TransferRequest[]> {
    const { data } = await api.get<TransferRequest[]>('/transfer-requests/inbox')
    return data
  },

  async mine(): Promise<TransferRequest[]> {
    const { data } = await api.get<TransferRequest[]>('/transfer-requests/mine')
    return data
  },

  async detail(id: string): Promise<TransferRequest> {
    const { data } = await api.get<TransferRequest>(`/transfer-requests/${id}`)
    return data
  },

  async create(input: {
    userId: string
    toDepartmentId: string
    reason: string
  }): Promise<TransferRequest> {
    const { data } = await api.post<TransferRequest>('/transfer-requests', input)
    return data
  },

  async decide(
    id: string,
    step: TransferStepCode,
    decision: 'approve' | 'reject',
    input: TransferDecisionInput = {},
  ): Promise<TransferRequest> {
    const { data } = await api.post<TransferRequest>(
      `/transfer-requests/${id}/steps/${step}/${decision}`,
      { note: input.note },
    )
    return data
  },

  async cancel(id: string, note?: string): Promise<TransferRequest> {
    const { data } = await api.post<TransferRequest>(`/transfer-requests/${id}/cancel`, { note })
    return data
  },
}

export const delegationsApi = {
  async list(activeOnly = false): Promise<Delegation[]> {
    const { data } = await api.get<Delegation[]>('/api/delegations', {
      params: { activeOnly },
    })
    return data
  },

  async mine(): Promise<Delegation[]> {
    const { data } = await api.get<Delegation[]>('/api/delegations/me')
    return data
  },

  async create(input: DelegationInput): Promise<Delegation> {
    const { data } = await api.post<Delegation>('/api/delegations', {
      ...input,
      scope: 'ORGANIZATION',
    })
    return data
  },

  async update(id: string, input: DelegationInput): Promise<Delegation> {
    const { data } = await api.put<Delegation>(`/api/delegations/${id}`, input)
    return data
  },

  async revoke(id: string, reason?: string): Promise<Delegation> {
    const { data } = await api.post<Delegation>(`/api/delegations/${id}/revoke`, { reason })
    return data
  },
}

export const generalManagerApi = {
  async list(): Promise<GeneralManager[]> {
    const { data } = await api.get<GeneralManager[]>('/api/general-manager')
    return data
  },

  async candidates(): Promise<GeneralManagerCandidate[]> {
    const { data } = await api.get<GeneralManagerCandidate[]>('/api/general-manager/candidates')
    return data
  },

  async appoint(userId: string, reason?: string): Promise<GeneralManager> {
    const { data } = await api.post<GeneralManager>('/api/general-manager', { userId, reason })
    return data
  },

  async remove(userId: string, reason?: string): Promise<void> {
    await api.delete(`/api/general-manager/${userId}`, { params: { reason } })
  },
}

export const permissionsApi = {
  async catalog(): Promise<PermissionDefinition[]> {
    const { data } = await api.get<PermissionDefinition[]>('/permissions')
    return data
  },

  async bundles(): Promise<PermissionBundle[]> {
    const { data } = await api.get<PermissionBundle[]>('/permission-bundles')
    return data
  },

  async departmentAvailable(departmentId: string): Promise<PermissionDefinition[]> {
    const { data } = await api.get<PermissionDefinition[]>(
      `/departments/${departmentId}/available-permissions`,
    )
    return data
  },
}

export const effectivePermissionsApi = {
  async me(): Promise<EffectivePermissions> {
    const { data } = await api.get<EffectivePermissions>('/users/me/permissions')
    return data
  },

  async member(departmentId: string, userId: string): Promise<EffectivePermissions> {
    const { data } = await api.get<EffectivePermissions>(
      `/departments/${departmentId}/members/${userId}/permissions`,
    )
    return data
  },
}
