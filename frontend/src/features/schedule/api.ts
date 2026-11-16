import { api } from '@/services/http'
import type { RoomSuggestion, ScheduleInput, ScheduleSession } from '@/features/schedule/types'

export const schedulesApi = {
  async list(
    departmentId: string,
    params: { from?: string; to?: string; classId?: string },
  ): Promise<ScheduleSession[]> {
    const { data } = await api.get<ScheduleSession[]>(`/api/departments/${departmentId}/schedules`, {
      params,
    })
    return data
  },

  async create(departmentId: string, input: ScheduleInput): Promise<ScheduleSession> {
    const { data } = await api.post<ScheduleSession>(
      `/api/departments/${departmentId}/schedules`,
      input,
    )
    return data
  },

  async update(
    departmentId: string,
    sessionId: string,
    input: ScheduleInput,
  ): Promise<ScheduleSession> {
    const { data } = await api.put<ScheduleSession>(
      `/api/departments/${departmentId}/schedules/${sessionId}`,
      input,
    )
    return data
  },

  async cancel(departmentId: string, sessionId: string): Promise<ScheduleSession> {
    const { data } = await api.post<ScheduleSession>(
      `/api/departments/${departmentId}/schedules/${sessionId}/cancel`,
    )
    return data
  },

  async remove(departmentId: string, sessionId: string): Promise<void> {
    await api.delete(`/api/departments/${departmentId}/schedules/${sessionId}`)
  },

  async roomSuggestions(
    departmentId: string,
    params: { startTime?: string; endTime?: string },
  ): Promise<RoomSuggestion[]> {
    const { data } = await api.get<RoomSuggestion[]>(
      `/api/departments/${departmentId}/schedules/room-suggestions`,
      { params },
    )
    return data
  },

  async mine(params: { from?: string; to?: string }): Promise<ScheduleSession[]> {
    const { data } = await api.get<ScheduleSession[]>('/api/schedules/me', { params })
    return data
  },
}
