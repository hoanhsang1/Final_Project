import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { schedulesApi } from '@/features/schedule/api'
import type { AutoScheduleRequest, ScheduleInput } from '@/features/schedule/types'

export const scheduleKeys = {
  list: (departmentId: string, params: unknown) =>
    ['schedules', departmentId, params] as const,
  mine: (params: unknown) => ['schedules', 'me', params] as const,
  roomSuggestions: (departmentId: string, params: unknown) =>
    ['schedules', departmentId, 'room-suggestions', params] as const,
  autoGenerate: (departmentId: string) => ['schedules', departmentId, 'auto-generate'] as const,
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
