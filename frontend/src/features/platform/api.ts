import { api } from '@/services/http'
import type { PageResponse } from '@/types/api'
import type {
  AccountRow,
  AdminModule,
  AuditLogItem,
  ModuleCatalogItem,
  ModuleStatus,
  OrganizationDetail,
  OrganizationListParams,
  OrganizationRow,
  PendingOrganization,
} from '@/features/platform/types'

interface RawOrganizationRow {
  id: string
  name: string
  org_type?: string
  orgType?: string
  status?: string
  created_at?: string
  createdAt?: string
  owner_username?: string
  ownerUsername?: string
  owner_email?: string
  ownerEmail?: string
}

function normalizeStatus(value: string | undefined): OrganizationRow['status'] {
  const normalized = (value ?? 'pending').toLowerCase()
  if (normalized === 'active' || normalized === 'rejected' || normalized === 'suspended') {
    return normalized
  }
  return 'pending'
}

function normalizeType(value: string | undefined): OrganizationRow['orgType'] {
  return (value ?? '').toUpperCase() === 'CENTER' ? 'CENTER' : 'SCHOOL'
}

function toRow(raw: RawOrganizationRow): OrganizationRow {
  return {
    id: raw.id,
    name: raw.name,
    orgType: normalizeType(raw.org_type ?? raw.orgType),
    status: normalizeStatus(raw.status),
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    ownerUsername: raw.owner_username ?? raw.ownerUsername ?? '—',
    ownerEmail: raw.owner_email ?? raw.ownerEmail ?? '—',
  }
}

export const organizationsApi = {
  async list(params: OrganizationListParams = {}): Promise<PageResponse<OrganizationRow>> {
    const { data } = await api.get<PageResponse<RawOrganizationRow>>('/api/v1/organizations', {
      params: {
        page: params.page ?? 1,
        size: params.size ?? 20,
        status: params.status?.length ? params.status.join(',') : undefined,
        orgType: params.orgType,
        keyword: params.keyword || undefined,
        sort: params.sort,
      },
    })
    return { ...data, items: data.items.map(toRow) }
  },

  async pending(): Promise<PendingOrganization[]> {
    const { data } = await api.get<RawOrganizationRow[]>('/api/v1/organizations/pending')
    return data.map((raw) => {
      const row = toRow(raw)
      return {
        id: row.id,
        name: row.name,
        orgType: row.orgType,
        status: row.status,
        ownerUsername: row.ownerUsername,
        ownerEmail: row.ownerEmail,
      }
    })
  },

  async detail(id: string): Promise<OrganizationDetail> {
    const { data } = await api.get<{
      organization: RawOrganizationRow
      owners: { id: string; username: string; email: string; status: string }[]
      modules: { code: string; name: string; status: string }[]
    }>(`/api/v1/organizations/${id}`)

    return {
      organization: {
        id: data.organization.id,
        name: data.organization.name,
        orgType: normalizeType(data.organization.org_type ?? data.organization.orgType),
        status: normalizeStatus(data.organization.status),
      },
      owners: data.owners,
      modules: data.modules.map((module) => ({
        code: module.code,
        name: module.name,
        status: (module.status as 'requested' | 'active' | 'rejected') ?? 'requested',
      })),
    }
  },

  async approve(id: string): Promise<void> {
    await api.patch(`/api/v1/organizations/${id}/approve`)
  },

  async reject(id: string, reason: string): Promise<void> {
    // Backend hiện bỏ qua body; vẫn gửi để tương thích khi được bổ sung.
    await api.patch(`/api/v1/organizations/${id}/reject`, { reason })
  },

  async suspend(id: string, reason: string): Promise<void> {
    await api.patch(`/api/v1/organizations/${id}/suspend`, { reason })
  },

  async reactivate(id: string, reason?: string): Promise<void> {
    await api.patch(`/api/v1/organizations/${id}/reactivate`, { reason })
  },

  async updateModules(id: string, modules: string[]): Promise<void> {
    await api.put(`/api/v1/organizations/${id}/modules`, { modules })
  },

  async auditLogs(params: {
    page?: number
    size?: number
    action?: string[]
    keyword?: string
    organizationId?: string
  } = {}): Promise<PageResponse<AuditLogItem>> {
    const { data } = await api.get<PageResponse<{
      id: string
      created_at: string
      action: string
      actor_username: string
      target_type: string
      target_id: string
      target_name: string
      description: string | null
    }>>('/api/v1/audit-logs', {
      params: {
        page: params.page ?? 1,
        size: params.size ?? 20,
        action: params.action?.length ? params.action.join(',') : undefined,
        keyword: params.keyword || undefined,
        organizationId: params.organizationId,
      },
    })
    return {
      ...data,
      items: data.items.map((item) => ({
        id: item.id,
        createdAt: item.created_at,
        action: item.action,
        actorUsername: item.actor_username,
        targetType: item.target_type === 'ACCOUNT' ? 'ACCOUNT' : 'ORGANIZATION',
        targetId: item.target_id,
        targetName: item.target_name,
        description: item.description,
      })),
    }
  },

  async moduleCatalog(): Promise<ModuleCatalogItem[]> {
    const { data } = await api.get<ModuleCatalogItem[]>('/api/v1/modules')
    return data
  },

  async adminModules(id: string): Promise<AdminModule[]> {
    const { data } = await api.get<
      {
        code: string
        name: string
        is_core: boolean | number
        status: string
        locked_by_admin: string | null
        locked_reason: string | null
        locked_at: string | null
        disabled_at: string | null
      }[]
    >(`/api/v1/organizations/${id}/modules/admin`)
    return data.map((row) => ({
      code: row.code,
      name: row.name,
      status: row.status as ModuleStatus,
      isCore: Boolean(row.is_core),
      lockedByAdmin: row.locked_by_admin,
      lockedReason: row.locked_reason,
      lockedAt: row.locked_at,
      disabledAt: row.disabled_at,
    }))
  },

  async lockModule(
    id: string,
    moduleCode: string,
    params: { lock: boolean; reason: string },
  ): Promise<void> {
    await api.patch(`/api/v1/organizations/${id}/modules/${moduleCode}/lock`, params)
  },
}

interface RawAccountRow {
  id: string
  username: string
  email: string
  full_name?: string
  organization_id?: string | null
  organization_name?: string | null
  role?: string
  status?: string
  created_at?: string | null
  last_login_at?: string | null
  temporaryPassword?: string
}

export interface AccountCreated extends AccountRow {
  temporaryPassword: string
}

function toAccountRow(raw: RawAccountRow): AccountRow {
  return {
    id: raw.id,
    username: raw.username,
    email: raw.email,
    fullName: raw.full_name ?? raw.username,
    organizationId: raw.organization_id ?? null,
    organizationName: raw.organization_name ?? null,
    role: raw.role ?? 'STAFF',
    status: raw.status ?? 'active',
    createdAt: raw.created_at ?? null,
    lastLoginAt: raw.last_login_at ?? null,
  }
}

export const accountsApi = {
  async list(params: {
    page?: number
    size?: number
    organizationId?: string
    role?: string
    status?: string
    keyword?: string
    sort?: string
  } = {}): Promise<PageResponse<AccountRow>> {
    const { data } = await api.get<PageResponse<RawAccountRow>>('/api/v1/accounts', {
      params: {
        page: params.page ?? 1,
        size: params.size ?? 20,
        organizationId: params.organizationId,
        role: params.role,
        status: params.status,
        keyword: params.keyword || undefined,
        sort: params.sort,
      },
    })
    return { ...data, items: data.items.map(toAccountRow) }
  },

  async create(input: { email: string; role: string; organizationId?: string }): Promise<AccountCreated> {
    const { data } = await api.post<RawAccountRow>('/api/v1/accounts', {
      email: input.email,
      role: input.role,
      organization_id: input.organizationId,
    })
    return { ...toAccountRow(data), temporaryPassword: data.temporaryPassword ?? '' }
  },

  async updateStatus(id: string, status: string, reason?: string): Promise<void> {
    await api.patch(`/api/v1/accounts/${id}/status`, { status, reason })
  },

  async updateRole(id: string, role: string): Promise<void> {
    await api.patch(`/api/v1/accounts/${id}/role`, { role })
  },

  async resetPassword(id: string, newPassword?: string): Promise<{ temporaryPassword?: string }> {
    const { data } = await api.post<{ temporaryPassword?: string }>(
      `/api/v1/accounts/${id}/reset-password`,
      { new_password: newPassword },
    )
    return data
  },
}
