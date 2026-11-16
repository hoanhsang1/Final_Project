import { api } from '@/services/http'
import type {
  AppNotification,
  CreateMemberInput,
  CreatedMember,
  Department,
  DepartmentInput,
  Member,
  MemberDetail,
  Position,
  Specialty,
  TransferRequest,
} from '@/features/organization/types'

export const departmentsApi = {
  async list(): Promise<Department[]> {
    const { data } = await api.get<Department[]>('/departments')
    return data
  },

  async byId(id: string): Promise<Department> {
    const { data } = await api.get<Department>(`/departments/${id}`)
    return data
  },

  async create(input: DepartmentInput): Promise<Department> {
    const { data } = await api.post<Department>('/departments', {
      name: input.name,
      description: input.description,
      moduleCodes: input.moduleCodes,
    })
    return data
  },

  async update(id: string, input: DepartmentInput): Promise<Department> {
    const { data } = await api.put<Department>(`/departments/${id}`, {
      name: input.name,
      description: input.description,
      moduleCodes: input.moduleCodes,
    })
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/departments/${id}`)
  },

  async members(departmentId: string): Promise<Member[]> {
    const { data } = await api.get<Member[]>(`/departments/${departmentId}/members`)
    return data
  },

  async memberDetail(departmentId: string, userId: string): Promise<MemberDetail> {
    const { data } = await api.get<MemberDetail>(`/departments/${departmentId}/members/${userId}`)
    return data
  },

  async createMember(input: CreateMemberInput): Promise<CreatedMember> {
    const { departmentId, ...rest } = input
    const { data } = await api.post<CreatedMember>(`/departments/${departmentId}/members`, rest)
    return data
  },

  async updatePositions(
    departmentId: string,
    userId: string,
    positionIds: string[],
    reason?: string,
  ): Promise<Member> {
    const { data } = await api.put<Member>(
      `/departments/${departmentId}/members/${userId}/positions`,
      { positionIds, reason },
    )
    return data
  },

  async resetPassword(departmentId: string, userId: string): Promise<{ temporaryPassword: string }> {
    const { data } = await api.post<{ temporaryPassword: string }>(
      `/departments/${departmentId}/members/${userId}/reset-password`,
    )
    return data
  },

  async removeMember(departmentId: string, userId: string): Promise<void> {
    await api.delete(`/departments/${departmentId}/members/${userId}`)
  },
}

export const positionsApi = {
  async list(): Promise<Position[]> {
    const { data } = await api.get<Position[]>('/positions')
    return data
  },
}

export const specialtiesApi = {
  async list(): Promise<Specialty[]> {
    const { data } = await api.get<Specialty[]>('/specialties')
    return data
  },
}

export const transfersApi = {
  async inbox(): Promise<TransferRequest[]> {
    const { data } = await api.get<TransferRequest[]>('/transfer-requests/inbox')
    return data
  },
}

export const notificationsApi = {
  async list(): Promise<AppNotification[]> {
    const { data } = await api.get<AppNotification[]>('/notifications')
    return data
  },

  async markAllRead(): Promise<{ updated: number }> {
    const { data } = await api.post<{ updated: number }>('/notifications/read-all')
    return data
  },
}
