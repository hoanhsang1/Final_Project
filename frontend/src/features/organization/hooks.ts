import { useMutation, useQuery, useQueryClient, useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import {
  departmentsApi,
  notificationsApi,
  orgModulesApi,
  positionsApi,
  specialtiesApi,
  transfersApi,
} from '@/features/organization/api'
import type {
  CreateMemberInput,
  DepartmentInput,
  EmployeeRow,
  Position,
  PositionInput,
  SpecialtyInput,
} from '@/features/organization/types'
import { hydrateSessionContext, refreshEffectivePermissions } from '@/features/auth/module-hydration'
import { queryKeys } from '@/lib/query-keys'
import { useDepartmentScope } from '@/features/organization/use-scope'

/** Giới hạn số hồ sơ chi tiết tải thêm để tránh N+1 không kiểm soát. */
export const ENRICH_LIMIT = 30

export function useDepartments() {
  return useQuery({
    queryKey: queryKeys.departments,
    queryFn: () => departmentsApi.list(),
    staleTime: 60_000,
  })
}

export function useDepartment(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.department(id ?? ''),
    queryFn: () => departmentsApi.byId(id!),
    enabled: Boolean(id),
  })
}

/** Quyền còn hiệu lực theo module đang bật của một phòng ban. */
export function useAvailablePermissions(departmentId: string | undefined) {
  return useQuery({
    queryKey: ['departments', departmentId ?? '', 'available-permissions'],
    queryFn: () => departmentsApi.availablePermissions(departmentId!),
    enabled: Boolean(departmentId),
    staleTime: 5 * 60_000,
  })
}

/** Cảnh báo chức danh/nhân sự bị ảnh hưởng khi gỡ module khỏi phòng ban. */
export function useDepartmentModuleImpact(
  departmentId: string | undefined,
  moduleCodes: string[],
) {
  return useQuery({
    queryKey: ['departments', departmentId ?? '', 'module-impact', moduleCodes.join(',')],
    queryFn: () => departmentsApi.moduleImpact(departmentId!, moduleCodes),
    enabled: Boolean(departmentId) && moduleCodes.length > 0,
    staleTime: 30_000,
  })
}

export function usePositions() {
  return useQuery({
    queryKey: queryKeys.positions,
    queryFn: () => positionsApi.list(),
    staleTime: 5 * 60_000,
  })
}

export function useSpecialties() {
  return useQuery({
    queryKey: ['specialties'],
    queryFn: () => specialtiesApi.list(),
    staleTime: 10 * 60_000,
  })
}

/** Danh mục chuyên môn gắn với danh mục môn học quyết định phạm vi môn giáo viên dạy được. */
export function useSpecialtyMutations() {
  const queryClient = useQueryClient()
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['specialties'] })
    // Hồ sơ giáo viên hiển thị chuyên môn + danh sách môn dạy được.
    await queryClient.invalidateQueries({ queryKey: ['teachers'] })
  }
  return {
    create: useMutation({
      mutationFn: (input: SpecialtyInput) => specialtiesApi.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: SpecialtyInput }) =>
        specialtiesApi.update(id, input),
      onSuccess: invalidate,
    }),
  }
}

export function useOrgModules() {
  return useQuery({
    queryKey: queryKeys.orgModules,
    queryFn: () => orgModulesApi.mine(),
    staleTime: 30_000,
  })
}

export function useToggleOrgModule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ code, enabled }: { code: string; enabled: boolean }) =>
      orgModulesApi.toggle(code, enabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orgModules })
      await hydrateSessionContext()
    },
  })
}

export function useDepartmentMembers(departmentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.members(departmentId ?? ''),
    queryFn: () => departmentsApi.members(departmentId!),
    enabled: Boolean(departmentId),
  })
}

export function useMemberDetail(departmentId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.member(departmentId ?? '', userId ?? ''),
    queryFn: () => departmentsApi.memberDetail(departmentId!, userId!),
    enabled: Boolean(departmentId && userId),
    staleTime: 60_000,
  })
}

export function usePositionMap(): Map<string, Position> {
  const { data } = usePositions()
  return useMemo(() => new Map((data ?? []).map((position) => [position.id, position])), [data])
}

function useInvalidatePositions() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.positions })
    void queryClient.invalidateQueries({ queryKey: ['departments'] })
  }
}

export function useCreatePosition() {
  const invalidate = useInvalidatePositions()
  return useMutation({
    mutationFn: (input: PositionInput) => positionsApi.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdatePosition() {
  const invalidate = useInvalidatePositions()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PositionInput }) =>
      positionsApi.update(id, input),
    onSuccess: async () => {
      await invalidate()
      // Sửa chức vụ đang giữ có thể đổi quyền của chính người thao tác.
      void refreshEffectivePermissions()
    },
  })
}

export function useDeletePosition() {
  const invalidate = useInvalidatePositions()
  return useMutation({
    mutationFn: (id: string) => positionsApi.remove(id),
    onSuccess: invalidate,
  })
}

export function useClonePosition() {
  const invalidate = useInvalidatePositions()
  return useMutation({
    mutationFn: ({ id, name, departmentId }: { id: string; name?: string; departmentId: string }) =>
      positionsApi.clone(id, { name, departmentId }),
    onSuccess: invalidate,
  })
}

export function usePositionImpact(id: string | undefined) {
  return useQuery({
    queryKey: ['positions', id ?? '', 'impact'],
    queryFn: () => positionsApi.impact(id!),
    enabled: Boolean(id),
  })
}

/**
 * Danh bạ nhân sự toàn tổ chức.
 *
 * Backend chưa trả họ tên/email trong `MemberResponse`, nên sau khi lấy danh sách
 * theo phòng ban, FE tải thêm hồ sơ chi tiết cho tối đa `ENRICH_LIMIT` người
 * (có cache 5 phút) để hiển thị họ tên. Khi backend bổ sung các trường này,
 * chỉ cần bỏ bước làm giàu dữ liệu.
 */
export function useEmployeeDirectory() {
  const departmentsQuery = useDepartments()
  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data])
  const positions = usePositions()
  const { isScoped, scopedDepartmentId } = useDepartmentScope()

  // Người bị giới hạn phòng ban chỉ tải thành viên của phòng mình; gọi phòng khác
  // sẽ bị backend trả 403 (scope DEPARTMENT).
  const targetDepartments = useMemo(
    () =>
      isScoped ? departments.filter((department) => department.id === scopedDepartmentId) : departments,
    [departments, isScoped, scopedDepartmentId],
  )

  const memberQueries = useQueries({
    queries: targetDepartments.map((department) => ({
      queryKey: queryKeys.members(department.id),
      queryFn: () => departmentsApi.members(department.id),
      enabled: departmentsQuery.isSuccess,
      staleTime: 60_000,
    })),
  })

  const members = useMemo(
    () => memberQueries.flatMap((query) => query.data ?? []),
    [memberQueries],
  )

  const enrichTargets = members.slice(0, ENRICH_LIMIT)
  const detailQueries = useQueries({
    queries: enrichTargets.map((member) => ({
      queryKey: queryKeys.member(member.departmentId, member.userId),
      queryFn: () => departmentsApi.memberDetail(member.departmentId, member.userId),
      enabled: members.length > 0,
      staleTime: 5 * 60_000,
    })),
  })

  const detailMap = useMemo(() => {
    const map = new Map<string, (typeof detailQueries)[number]['data']>()
    detailQueries.forEach((query) => {
      if (query.data) map.set(query.data.userId, query.data)
    })
    return map
  }, [detailQueries])

  const positionMap = useMemo(
    () => new Map((positions.data ?? []).map((position) => [position.id, position])),
    [positions.data],
  )

  const rows: EmployeeRow[] = useMemo(() => {
    const departmentMap = new Map(departments.map((department) => [department.id, department.name]))
    return members.map((member) => {
      const detail = detailMap.get(member.userId)
      return {
        ...member,
        departmentName: departmentMap.get(member.departmentId) ?? '—',
        fullName: detail?.fullName ?? null,
        staffCode: detail?.staffCode ?? null,
        email: detail?.email ?? null,
        teacher: detail?.teacher ?? false,
        teachingStatus: detail?.teachingStatus ?? null,
        positionNames: member.positionIds
          .map((id) => positionMap.get(id)?.name)
          .filter((name): name is string => Boolean(name)),
        enriched: Boolean(detail),
      }
    })
  }, [departments, detailMap, members, positionMap])

  const isLoading =
    departmentsQuery.isLoading ||
    positions.isLoading ||
    memberQueries.some((query) => query.isLoading)

  const isError = departmentsQuery.isError || memberQueries.some((query) => query.isError)
  const error = departmentsQuery.error ?? memberQueries.find((query) => query.error)?.error

  return {
    rows,
    departments,
    positions: positions.data ?? [],
    positionMap,
    isScoped,
    scopedDepartmentId,
    isLoading,
    isError,
    error,
    refetch: () => {
      void departmentsQuery.refetch()
      memberQueries.forEach((query) => void query.refetch())
    },
  }
}

export function useTransferInbox(enabled = true) {
  return useQuery({
    queryKey: queryKeys.transferInbox,
    queryFn: () => transfersApi.inbox(),
    staleTime: 30_000,
    enabled,
  })
}

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => notificationsApi.list(),
    staleTime: 30_000,
    enabled,
  })
}

function useInvalidatePeople() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['departments'] })
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }
}

export function useCreateDepartment() {
  const invalidate = useInvalidatePeople()
  return useMutation({
    mutationFn: (input: DepartmentInput) => departmentsApi.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateDepartment() {
  const invalidate = useInvalidatePeople()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DepartmentInput }) =>
      departmentsApi.update(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteDepartment() {
  const invalidate = useInvalidatePeople()
  return useMutation({
    mutationFn: (id: string) => departmentsApi.remove(id),
    onSuccess: invalidate,
  })
}

export function useCreateMember() {
  const invalidate = useInvalidatePeople()
  return useMutation({
    mutationFn: (input: CreateMemberInput) => departmentsApi.createMember(input),
    onSuccess: invalidate,
  })
}

export function useUpdateMemberPositions() {
  const invalidate = useInvalidatePeople()
  return useMutation({
    mutationFn: ({
      departmentId,
      userId,
      positionIds,
      reason,
    }: {
      departmentId: string
      userId: string
      positionIds: string[]
      reason?: string
    }) => departmentsApi.updatePositions(departmentId, userId, positionIds, reason),
    onSuccess: async () => {
      await invalidate()
      // Chức vụ của chính người dùng có thể vừa đổi → đồng bộ quyền hiệu lực.
      void refreshEffectivePermissions()
    },
  })
}

export function useResetMemberPassword() {
  return useMutation({
    mutationFn: ({ departmentId, userId }: { departmentId: string; userId: string }) =>
      departmentsApi.resetPassword(departmentId, userId),
  })
}

export function useRemoveMember() {
  const invalidate = useInvalidatePeople()
  return useMutation({
    mutationFn: ({ departmentId, userId }: { departmentId: string; userId: string }) =>
      departmentsApi.removeMember(departmentId, userId),
    onSuccess: invalidate,
  })
}
