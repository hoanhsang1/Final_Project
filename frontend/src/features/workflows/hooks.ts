import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { refreshEffectivePermissions } from '@/features/auth/module-hydration'
import { notificationsApi } from '@/features/organization/api'
import type { AppNotification } from '@/features/organization/types'
import {
  delegationsApi,
  effectivePermissionsApi,
  generalManagerApi,
  permissionsApi,
  resignationsApi,
  transferWorkflowApi,
} from '@/features/workflows/api'
import type {
  DelegationInput,
  ResignationStatus,
  TransferDecisionInput,
  TransferStepCode,
} from '@/features/workflows/types'
import { queryKeys } from '@/lib/query-keys'

export function useResignations(departmentId: string | undefined, status?: ResignationStatus) {
  return useQuery({
    queryKey: ['resignation-requests', departmentId ?? '', status ?? 'ALL'],
    queryFn: () => resignationsApi.list(departmentId!, status),
    enabled: Boolean(departmentId),
  })
}

export function useResignationMutations(departmentId: string | undefined) {
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['resignation-requests'] })
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    void queryClient.invalidateQueries({ queryKey: ['departments'] })
  }

  const create = useMutation({
    mutationFn: (input: { userId: string; reason: string }) =>
      resignationsApi.create(departmentId!, input),
    onSuccess: invalidate,
  })
  const createMine = useMutation({
    mutationFn: (input: { userId: string; reason: string }) =>
      resignationsApi.createMine(input.userId, input.reason),
    onSuccess: invalidate,
  })
  const decide = useMutation({
    mutationFn: ({
      requestId,
      decision,
      note,
    }: {
      requestId: string
      decision: 'approve' | 'reject'
      note?: string
    }) => resignationsApi.decide(departmentId!, requestId, decision, note),
    onSuccess: invalidate,
  })
  return { create, createMine, decide }
}

export function useMyResignations(status?: string, enabled = true) {
  return useQuery({
    queryKey: ['resignation-requests', 'me', status ?? 'ALL'],
    queryFn: () => resignationsApi.mine(status),
    enabled,
  })
}

export function useTransferWorkflow() {
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['transfer-requests'] })
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const inbox = useQuery({
    queryKey: [...queryKeys.transferInbox, 'workflow'],
    queryFn: () => transferWorkflowApi.inbox(),
    staleTime: 15_000,
  })
  const mine = useQuery({
    queryKey: ['transfer-requests', 'mine'],
    queryFn: () => transferWorkflowApi.mine(),
    staleTime: 15_000,
  })

  const create = useMutation({
    mutationFn: (input: { userId: string; toDepartmentId: string; reason: string }) =>
      transferWorkflowApi.create(input),
    onSuccess: invalidate,
  })
  const createMine = useMutation({
    mutationFn: (input: { userId: string; toDepartmentId: string; reason: string }) =>
      transferWorkflowApi.createMine(input),
    onSuccess: invalidate,
  })
  const decide = useMutation({
    mutationFn: ({
      id,
      step,
      decision,
      input,
    }: {
      id: string
      step: TransferStepCode
      decision: 'approve' | 'reject'
      input?: TransferDecisionInput
    }) => transferWorkflowApi.decide(id, step, decision, input),
    onSuccess: invalidate,
  })
  const cancel = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      transferWorkflowApi.cancel(id, note),
    onSuccess: invalidate,
  })
  return { inbox, mine, create, createMine, decide, cancel }
}

export function useTransferDepartments(enabled = true) {
  return useQuery({
    queryKey: ['transfer-requests', 'departments'],
    queryFn: () => transferWorkflowApi.transferDepartments(),
    staleTime: 5 * 60_000,
    enabled,
  })
}

export function useTransferDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['transfer-requests', 'detail', id ?? ''],
    queryFn: () => transferWorkflowApi.detail(id!),
    enabled: Boolean(id),
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
    },
  })
}

export function useDelegations(activeOnly = false, enabled = true) {
  return useQuery({
    queryKey: ['delegations', activeOnly],
    queryFn: () => delegationsApi.list(activeOnly),
    staleTime: 20_000,
    enabled,
  })
}

export function useMyDelegations() {
  return useQuery({
    queryKey: ['delegations', 'me'],
    queryFn: () => delegationsApi.mine(),
    staleTime: 30_000,
  })
}

export function useDelegationMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['delegations'] })
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    void refreshEffectivePermissions()
  }
  const create = useMutation({
    mutationFn: (input: DelegationInput) => delegationsApi.create(input),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: DelegationInput }) =>
      delegationsApi.update(id, input),
    onSuccess: invalidate,
  })
  const revoke = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      delegationsApi.revoke(id, reason),
    onSuccess: invalidate,
  })
  return { create, update, revoke }
}

export function useGeneralManagers(enabled = true) {
  return useQuery({
    queryKey: ['general-manager'],
    queryFn: () => generalManagerApi.list(),
    staleTime: 30_000,
    enabled,
  })
}

export function useGeneralManagerCandidates(enabled = true) {
  return useQuery({
    queryKey: ['general-manager', 'candidates'],
    queryFn: () => generalManagerApi.candidates(),
    staleTime: 30_000,
    enabled,
  })
}

export function useGeneralManagerMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['general-manager'] })
    void refreshEffectivePermissions()
  }
  const appoint = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      generalManagerApi.appoint(userId, reason),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      generalManagerApi.remove(userId, reason),
    onSuccess: invalidate,
  })
  return { appoint, remove }
}

export function usePermissionCatalog() {
  return useQuery({
    queryKey: ['permissions', 'catalog'],
    queryFn: () => permissionsApi.catalog(),
    staleTime: 10 * 60_000,
  })
}

export function usePermissionBundles() {
  return useQuery({
    queryKey: ['permissions', 'bundles'],
    queryFn: () => permissionsApi.bundles(),
    staleTime: 10 * 60_000,
  })
}

export function useEffectivePermissionsMe() {
  return useQuery({
    queryKey: ['permissions', 'me'],
    queryFn: () => effectivePermissionsApi.me(),
    staleTime: 60_000,
  })
}

export function useMemberEffectivePermissions(
  departmentId: string | undefined,
  userId: string | undefined,
) {
  return useQuery({
    queryKey: ['permissions', 'member', departmentId ?? '', userId ?? ''],
    queryFn: () => effectivePermissionsApi.member(departmentId!, userId!),
    enabled: Boolean(departmentId && userId),
    staleTime: 60_000,
  })
}

export type NotificationItem = AppNotification
