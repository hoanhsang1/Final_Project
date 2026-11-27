import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'

import { scheduleConfigApi, scheduleDraftsApi, schedulesApi } from '@/features/schedule/api'
import type {
  AutoScheduleRequest,
  ClassSlotRule,
  ScheduleDraftPatch,
  ScheduleDraftRequest,
  ScheduleInput,
  ScheduleTimeSlotInput,
  TeacherAvailabilityEntry,
} from '@/features/schedule/types'

export const scheduleKeys = {
  list: (departmentId: string, params: unknown) =>
    ['schedules', departmentId, params] as const,
  mine: (params: unknown) => ['schedules', 'me', params] as const,
  roomSuggestions: (departmentId: string, params: unknown) =>
    ['schedules', departmentId, 'room-suggestions', params] as const,
  autoGenerate: (departmentId: string) => ['schedules', departmentId, 'auto-generate'] as const,
  drafts: (departmentId: string, status: string | undefined) =>
    ['schedule-drafts', departmentId, status ?? 'all'] as const,
  draft: (departmentId: string, draftId: string, week: number) =>
    ['schedule-drafts', departmentId, draftId, week] as const,
  configTimeSlots: () => ['schedule-config', 'time-slots'] as const,
  configClassRules: (classId: string) => ['schedule-config', 'class-rules', classId] as const,
  configTeacherAvailability: (teacherId: string) =>
    ['schedule-config', 'teacher-availability', teacherId] as const,
}

export function useSchedules(
  departmentId: string | null,
  params: { from?: string; to?: string; classId?: string },
) {
  return useQuery({
    queryKey: scheduleKeys.list(departmentId ?? '', params),
    queryFn: () => schedulesApi.list(departmentId!, params),
    enabled: Boolean(departmentId),
    placeholderData: (previous) => previous,
  })
}

/** Lịch tuần của nhiều phòng ban: mỗi phòng một query để lỗi 403 không kéo cả trang. */
export function useSchedulesByDepartments(
  departmentIds: string[],
  params: { from: string; to: string },
) {
  return useQueries({
    queries: departmentIds.map((departmentId) => ({
      queryKey: scheduleKeys.list(departmentId, params),
      queryFn: () => schedulesApi.list(departmentId, params),
      enabled: Boolean(departmentId) && Boolean(params.from) && Boolean(params.to),
    })),
  })
}

export function useMySchedule(params: { from?: string; to?: string }) {
  return useQuery({
    queryKey: scheduleKeys.mine(params),
    queryFn: () => schedulesApi.mine(params),
    placeholderData: (previous) => previous,
  })
}

export function useRoomSuggestions(
  departmentId: string | null,
  params: { startTime?: string; endTime?: string; classId?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: scheduleKeys.roomSuggestions(departmentId ?? '', params),
    queryFn: () => schedulesApi.roomSuggestions(departmentId!, params),
    enabled: Boolean(departmentId) && Boolean(params.startTime) && Boolean(params.endTime) && enabled,
  })
}

export function useScheduleMutations(departmentId: string | null) {
  const queryClient = useQueryClient()
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['schedules'] })
  }
  return {
    create: useMutation({
      mutationFn: (input: ScheduleInput) => schedulesApi.create(departmentId!, input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ScheduleInput }) =>
        schedulesApi.update(departmentId!, id, input),
      onSuccess: invalidate,
    }),
    cancel: useMutation({
      mutationFn: (id: string) => schedulesApi.cancel(departmentId!, id),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => schedulesApi.remove(departmentId!, id),
      onSuccess: invalidate,
    }),
  }
}

/** @deprecated Luồng tạo lịch cũ; dùng nháp (`useScheduleDraftMutations`) thay thế. */
export function useAutoSchedule(departmentId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: AutoScheduleRequest) =>
      schedulesApi.autoGenerate(departmentId!, request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
  })
}

export function useScheduleDrafts(departmentId: string | null, status?: string) {
  return useQuery({
    queryKey: scheduleKeys.drafts(departmentId ?? '', status),
    queryFn: () => scheduleDraftsApi.list(departmentId!, status),
    enabled: Boolean(departmentId),
  })
}

export function useScheduleDraftDetail(
  departmentId: string | null,
  draftId: string | null,
  week: number,
) {
  return useQuery({
    queryKey: scheduleKeys.draft(departmentId ?? '', draftId ?? '', week),
    queryFn: () => scheduleDraftsApi.detail(departmentId!, draftId!, week),
    enabled: Boolean(departmentId) && Boolean(draftId),
  })
}

export function useScheduleDraftMutations(departmentId: string | null) {
  const queryClient = useQueryClient()
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['schedule-drafts'] })
  }
  return {
    create: useMutation({
      mutationFn: (request: ScheduleDraftRequest) =>
        scheduleDraftsApi.create(departmentId!, request),
      onSuccess: refresh,
    }),
    patchItem: useMutation({
      mutationFn: ({
        draftId,
        itemId,
        patch,
      }: {
        draftId: string
        itemId: string
        patch: ScheduleDraftPatch
      }) => scheduleDraftsApi.patchItem(departmentId!, draftId, itemId, patch),
      onSuccess: refresh,
    }),
    confirm: useMutation({
      mutationFn: (draftId: string) => scheduleDraftsApi.confirm(departmentId!, draftId),
      onSuccess: async () => {
        await refresh()
        // Buổi học thật vừa được tạo — làm mới cả lịch phòng ban.
        await queryClient.invalidateQueries({ queryKey: ['schedules'] })
      },
    }),
    discard: useMutation({
      mutationFn: (draftId: string) => scheduleDraftsApi.discard(departmentId!, draftId),
      onSuccess: refresh,
    }),
  }
}

export function useScheduleTimeSlots() {  return useQuery({
    queryKey: scheduleKeys.configTimeSlots(),
    queryFn: () => scheduleConfigApi.timeSlots(),
  })
}

export function useClassSlotRules(classId: string | null) {
  return useQuery({
    queryKey: scheduleKeys.configClassRules(classId ?? ''),
    queryFn: () => scheduleConfigApi.classRules(classId!),
    enabled: Boolean(classId),
  })
}

export function useTeacherAvailability(teacherId: string | null) {
  return useQuery({
    queryKey: scheduleKeys.configTeacherAvailability(teacherId ?? ''),
    queryFn: () => scheduleConfigApi.teacherAvailability(teacherId!),
    enabled: Boolean(teacherId),
  })
}

export function useScheduleConfigMutations() {
  const queryClient = useQueryClient()
  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['schedule-config'] })
  }
  return {
    saveTimeSlots: useMutation({
      mutationFn: (slots: ScheduleTimeSlotInput[]) => scheduleConfigApi.saveTimeSlots(slots),
      onSuccess: refreshAll,
    }),
    saveClassRules: useMutation({
      mutationFn: ({ classId, rules }: { classId: string; rules: ClassSlotRule[] }) =>
        scheduleConfigApi.saveClassRules(classId, rules),
      onSuccess: refreshAll,
    }),
    saveTeacherAvailability: useMutation({
      mutationFn: ({
        teacherId,
        entries,
      }: {
        teacherId: string
        entries: TeacherAvailabilityEntry[]
      }) => scheduleConfigApi.saveTeacherAvailability(teacherId, entries),
      onSuccess: refreshAll,
    }),
  }
}
