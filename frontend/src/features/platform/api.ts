import { api } from '@/services/http'
import type { PageResponse } from '@/types/api'
import type {
  AuditLogItem,
  ModuleCatalogItem,
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
}
