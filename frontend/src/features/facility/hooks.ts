import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { equipmentApi, issuesApi, roomsApi } from '@/features/facility/api'
import type { EquipmentInput, IssueInput, RoomInput } from '@/features/facility/types'

export const facilityKeys = {
  rooms: (departmentId: string) => ['facilities', departmentId, 'rooms'] as const,
  equipment: (departmentId: string) => ['facilities', departmentId, 'equipment'] as const,
  issues: (departmentId: string, status: string) =>
    ['facilities', departmentId, 'issues', status] as const,
}

export function useRooms(departmentId: string | null) {
  return useQuery({
    queryKey: facilityKeys.rooms(departmentId ?? ''),
    queryFn: () => roomsApi.list(departmentId!),
    enabled: Boolean(departmentId),
  })
}

export function useEquipment(departmentId: string | null) {
  return useQuery({
    queryKey: facilityKeys.equipment(departmentId ?? ''),
    queryFn: () => equipmentApi.list(departmentId!),
    enabled: Boolean(departmentId),
  })
}

export function useIssues(departmentId: string | null, status = '') {
  return useQuery({
    queryKey: facilityKeys.issues(departmentId ?? '', status),
    queryFn: () => issuesApi.list(departmentId!, status || undefined),
    enabled: Boolean(departmentId),
  })
}

export function useFacilityMutations(departmentId: string | null) {
  const queryClient = useQueryClient()
  const invalidateRooms = () =>
    queryClient.invalidateQueries({ queryKey: ['facilities', departmentId ?? '', 'rooms'] })
  const invalidateEquipment = () =>
    queryClient.invalidateQueries({ queryKey: ['facilities', departmentId ?? '', 'equipment'] })
  const invalidateIssues = () =>
    queryClient.invalidateQueries({ queryKey: ['facilities', departmentId ?? '', 'issues'] })

  return {
    createRoom: useMutation({
      mutationFn: (input: RoomInput) => roomsApi.create(departmentId!, input),
      onSuccess: invalidateRooms,
    }),
    updateRoom: useMutation({
      mutationFn: ({ id, input }: { id: string; input: RoomInput }) =>
        roomsApi.update(departmentId!, id, input),
      onSuccess: invalidateRooms,
    }),
    deleteRoom: useMutation({
      mutationFn: (id: string) => roomsApi.remove(departmentId!, id),
      onSuccess: async () => {
        await invalidateRooms()
        await invalidateEquipment()
      },
    }),
    createEquipment: useMutation({
      mutationFn: (input: EquipmentInput) => equipmentApi.create(departmentId!, input),
      onSuccess: invalidateEquipment,
    }),
    updateEquipment: useMutation({
      mutationFn: ({ id, input }: { id: string; input: EquipmentInput }) =>
        equipmentApi.update(departmentId!, id, input),
      onSuccess: invalidateEquipment,
    }),
    deleteEquipment: useMutation({
      mutationFn: (id: string) => equipmentApi.remove(departmentId!, id),
      onSuccess: invalidateEquipment,
    }),
    reportIssue: useMutation({
      mutationFn: (input: IssueInput) => issuesApi.report(departmentId!, input),
      onSuccess: async () => {
        await invalidateIssues()
        await invalidateEquipment()
      },
    }),
    resolveIssue: useMutation({
      mutationFn: (id: string) => issuesApi.resolve(departmentId!, id),
      onSuccess: invalidateIssues,
    }),
  }
}
