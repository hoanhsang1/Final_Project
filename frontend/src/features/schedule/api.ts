import { api } from '@/services/http'
import type {
  AutoScheduleRequest,
  AutoScheduleResult,
  ClassSlotRule,
  ClassSlotRules,
  RoomSuggestion,
  ScheduleDraftConfirmResult,
  ScheduleDraftDetail,
  ScheduleDraftItem,
  ScheduleDraftPatch,
  ScheduleDraftRequest,
  ScheduleDraftSummary,
  ScheduleInput,
  ScheduleSession,
  ScheduleTimeSlot,
  ScheduleTimeSlotInput,
  TeacherAvailability,
  TeacherAvailabilityEntry,
} from '@/features/schedule/types'

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
    params: { startTime?: string; endTime?: string; classId?: string },
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

  /** @deprecated Tạo lịch trực tiếp không qua nháp; dùng scheduleDraftsApi thay thế. */
  async autoGenerate(departmentId: string, request: AutoScheduleRequest): Promise<AutoScheduleResult> {
    const { data } = await api.post<AutoScheduleResult>(
      `/api/departments/${departmentId}/schedules/auto-generate`,
      request,
    )
    return data
  },
}

export const scheduleDraftsApi = {
  async create(departmentId: string, request: ScheduleDraftRequest): Promise<ScheduleDraftDetail> {
    const { data } = await api.post<ScheduleDraftDetail>(
      `/api/departments/${departmentId}/schedules/drafts`,
      request,
    )
    return data
  },

  async list(departmentId: string, status?: string): Promise<ScheduleDraftSummary[]> {
    const { data } = await api.get<ScheduleDraftSummary[]>(
      `/api/departments/${departmentId}/schedules/drafts`,
      { params: { status: status || undefined } },
    )
    return data
  },

  async detail(departmentId: string, draftId: string, week: number): Promise<ScheduleDraftDetail> {
    const { data } = await api.get<ScheduleDraftDetail>(
      `/api/departments/${departmentId}/schedules/drafts/${draftId}`,
      { params: { week } },
    )
    return data
  },

  async patchItem(
    departmentId: string,
    draftId: string,
    itemId: string,
    patch: ScheduleDraftPatch,
  ): Promise<ScheduleDraftItem> {
    const { data } = await api.patch<ScheduleDraftItem>(
      `/api/departments/${departmentId}/schedules/drafts/${draftId}/items/${itemId}`,
      patch,
    )
    return data
  },

  /** 409 là kết quả nghiệp vụ (rollback toàn bộ) — trả về danh sách buổi lỗi thay vì ném lỗi. */
  async confirm(departmentId: string, draftId: string): Promise<ScheduleDraftConfirmResult> {
    const response = await api.post<ScheduleDraftConfirmResult>(
      `/api/departments/${departmentId}/schedules/drafts/${draftId}/confirm`,
      undefined,
      { validateStatus: (status) => status === 200 || status === 409 },
    )
    return response.data
  },

  async discard(departmentId: string, draftId: string): Promise<void> {
    await api.delete(`/api/departments/${departmentId}/schedules/drafts/${draftId}`)
  },
}

export const scheduleConfigApi = {
  async timeSlots(): Promise<ScheduleTimeSlot[]> {
    const { data } = await api.get<{ slots: ScheduleTimeSlot[] }>(
      '/api/schedule-config/time-slots',
    )
    return data.slots
  },

  async saveTimeSlots(slots: ScheduleTimeSlotInput[]): Promise<ScheduleTimeSlot[]> {
    const { data } = await api.put<{ slots: ScheduleTimeSlot[] }>(
      '/api/schedule-config/time-slots',
      { slots },
    )
    return data.slots
  },

  async classRules(classId: string): Promise<ClassSlotRule[]> {
    const { data } = await api.get<ClassSlotRules>(
      `/api/schedule-config/classes/${classId}/slot-rules`,
    )
    return data.rules
  },

  async saveClassRules(classId: string, rules: ClassSlotRule[]): Promise<ClassSlotRule[]> {
    const { data } = await api.put<ClassSlotRules>(
      `/api/schedule-config/classes/${classId}/slot-rules`,
      { rules },
    )
    return data.rules
  },

  async teacherAvailability(teacherId: string): Promise<TeacherAvailabilityEntry[]> {
    const { data } = await api.get<TeacherAvailability>(
      `/api/schedule-config/teachers/${teacherId}/availability`,
    )
    return data.entries
  },

  async saveTeacherAvailability(
    teacherId: string,
    entries: TeacherAvailabilityEntry[],
  ): Promise<TeacherAvailabilityEntry[]> {
    const { data } = await api.put<TeacherAvailability>(
      `/api/schedule-config/teachers/${teacherId}/availability`,
      { entries },
    )
    return data.entries
  },
}
