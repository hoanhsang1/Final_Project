export const queryKeys = {
  departments: ['departments'] as const,
  department: (id: string) => ['departments', id] as const,
  members: (departmentId: string) => ['departments', departmentId, 'members'] as const,
  member: (departmentId: string, userId: string) =>
    ['departments', departmentId, 'members', userId] as const,
  positions: ['positions'] as const,
  organizations: (params: unknown) => ['organizations', params] as const,
  pendingOrganizations: ['organizations', 'pending'] as const,
  organization: (id: string) => ['organizations', id] as const,
  auditLogs: (params: unknown) => ['audit-logs', params] as const,
  moduleCatalog: ['modules'] as const,
  notifications: ['notifications'] as const,
  transferInbox: ['transfer-requests', 'inbox'] as const,
}
