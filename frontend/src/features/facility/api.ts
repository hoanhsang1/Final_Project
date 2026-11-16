import { api } from '@/services/http'
import type {
  Equipment,
  EquipmentInput,
  FacilityIssue,
  IssueInput,
  Room,
  RoomInput,
} from '@/features/facility/types'

export const roomsApi = {
  async list(departmentId: string): Promise<Room[]> {
    const { data } = await api.get<Room[]>(`/api/departments/${departmentId}/facilities/rooms`)
    return data
  },

  async create(departmentId: string, input: RoomInput): Promise<Room> {
    const { data } = await api.post<Room>(`/api/departments/${departmentId}/facilities/rooms`, input)
    return data
  },

  async update(departmentId: string, roomId: string, input: RoomInput): Promise<Room> {
    const { data } = await api.put<Room>(
      `/api/departments/${departmentId}/facilities/rooms/${roomId}`,
      input,
    )
    return data
  },

  async remove(departmentId: string, roomId: string): Promise<void> {
    await api.delete(`/api/departments/${departmentId}/facilities/rooms/${roomId}`)
  },
}

export const equipmentApi = {
  async list(departmentId: string): Promise<Equipment[]> {
    const { data } = await api.get<Equipment[]>(
      `/api/departments/${departmentId}/facilities/equipment`,
    )
    return data
  },

  async create(departmentId: string, input: EquipmentInput): Promise<Equipment> {
    const { data } = await api.post<Equipment>(
      `/api/departments/${departmentId}/facilities/equipment`,
      input,
    )
    return data
  },

  async update(departmentId: string, equipmentId: string, input: EquipmentInput): Promise<Equipment> {
    const { data } = await api.put<Equipment>(
      `/api/departments/${departmentId}/facilities/equipment/${equipmentId}`,
      input,
    )
    return data
  },

  async remove(departmentId: string, equipmentId: string): Promise<void> {
    await api.delete(`/api/departments/${departmentId}/facilities/equipment/${equipmentId}`)
  },
}

export const issuesApi = {
  async list(departmentId: string, status?: string): Promise<FacilityIssue[]> {
    const { data } = await api.get<FacilityIssue[]>(
      `/api/departments/${departmentId}/facilities/issues`,
      { params: status ? { status } : undefined },
    )
    return data
  },

  async report(departmentId: string, input: IssueInput): Promise<FacilityIssue> {
    const { data } = await api.post<FacilityIssue>(
      `/api/departments/${departmentId}/facilities/issues`,
      input,
    )
    return data
  },

  async resolve(departmentId: string, issueId: string): Promise<FacilityIssue> {
    const { data } = await api.post<FacilityIssue>(
      `/api/departments/${departmentId}/facilities/issues/${issueId}/resolve`,
    )
    return data
  },
}
