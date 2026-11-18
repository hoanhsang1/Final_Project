import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { accountsApi, organizationsApi } from '@/features/platform/api'
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

export function useOrganizationAdminModules(id: string | undefined) {
  return useQuery({
    queryKey: ['organizations', id ?? '', 'modules-admin'],
    queryFn: () => organizationsApi.adminModules(id!),
    enabled: Boolean(id),
  })
}

export function useToggleModuleLock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      moduleCode,
      lock,
      reason,
    }: {
      id: string
      moduleCode: string
      lock: boolean
      reason: string
    }) => organizationsApi.lockModule(id, moduleCode, { lock, reason }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', variables.id] })
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
    },
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

export function useSuspendOrganization() {
  const invalidate = useInvalidateOrganizations()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      organizationsApi.suspend(id, reason),
    onSuccess: invalidate,
  })
}

export function useReactivateOrganization() {
  const invalidate = useInvalidateOrganizations()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      organizationsApi.reactivate(id, reason),
    onSuccess: invalidate,
  })
}

export function useModuleCatalog() {
  return useQuery({
    queryKey: queryKeys.moduleCatalog,
    queryFn: () => organizationsApi.moduleCatalog(),
    staleTime: 5 * 60_000,
  })
}

export function useAccounts(params: {
  page?: number
  size?: number
  organizationId?: string
  role?: string
  status?: string
  keyword?: string
}) {
  return useQuery({
    queryKey: ['accounts', params],
    queryFn: () => accountsApi.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useAccountMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['accounts'] })
  return {
    create: useMutation({
      mutationFn: (input: { email: string; role: string; organizationId?: string }) =>
        accountsApi.create(input),
      onSuccess: invalidate,
    }),
    updateStatus: useMutation({
      mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
        accountsApi.updateStatus(id, status, reason),
      onSuccess: invalidate,
    }),
    updateRole: useMutation({
      mutationFn: ({ id, role }: { id: string; role: string }) => accountsApi.updateRole(id, role),
      onSuccess: invalidate,
    }),
    resetPassword: useMutation({
      mutationFn: ({ id, newPassword }: { id: string; newPassword?: string }) =>
        accountsApi.resetPassword(id, newPassword),
      onSuccess: invalidate,
    }),
  }
}
