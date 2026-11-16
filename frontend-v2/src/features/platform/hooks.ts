import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { organizationsApi } from '@/features/platform/api'
import type { OrganizationListParams } from '@/features/platform/types'
import { queryKeys } from '@/lib/query-keys'

export function useOrganizations(params: OrganizationListParams = {}) {
  return useQuery({
    queryKey: queryKeys.organizations(params),
    queryFn: () => organizationsApi.list(params),
    placeholderData: (previous) => previous,
  })
}

export function usePendingOrganizations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.pendingOrganizations,
    queryFn: () => organizationsApi.pending(),
    enabled,
  })
}

export function useOrganizationDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.organization(id ?? ''),
    queryFn: () => organizationsApi.detail(id!),
    enabled: Boolean(id),
  })
}

export function useAuditLogs(params: Parameters<typeof organizationsApi.auditLogs>[0] = {}) {
  return useQuery({
    queryKey: queryKeys.auditLogs(params),
    queryFn: () => organizationsApi.auditLogs(params),
  })
}

function useInvalidateOrganizations() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['organizations'] })
    void queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
  }
}

export function useApproveOrganization() {
  const invalidate = useInvalidateOrganizations()
  return useMutation({
    mutationFn: (id: string) => organizationsApi.approve(id),
    onSuccess: invalidate,
  })
}

export function useRejectOrganization() {
  const invalidate = useInvalidateOrganizations()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      organizationsApi.reject(id, reason),
    onSuccess: invalidate,
  })
}

export function useUpdateOrganizationModules() {
  const invalidate = useInvalidateOrganizations()
  return useMutation({
    mutationFn: ({ id, modules }: { id: string; modules: string[] }) =>
      organizationsApi.updateModules(id, modules),
    onSuccess: invalidate,
  })
}
