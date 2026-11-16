import {
  AxiosError,
  type AxiosAdapter,
  type AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'

import { decodeJwt } from '@/lib/jwt'
import { ALL_PERMISSION_META, BUNDLES, PERM } from '@/lib/permissions'
import { mockModules, mockOrgModules } from '@/services/mock/fixtures'
import {
  DEMO_ORG_ID,
  mockAccounts,
  mockAuditLogs,
  mockDepartments,
  mockMembers,
  mockNotifications,
  mockOrganizations,
  mockPositions,
  mockTransfers,
  type MockAccount,
  type MockDepartment,
  type MockMember,
  type MockOrganization,
} from '@/services/mock/fixtures'

/**
 * Mock adapter — chỉ hoạt động khi VITE_DATA_SOURCE=mock.
 * Trả về đúng shape của backend thật (kể cả snake_case và envelope lỗi)
 * để tầng service/UI không cần biết đang chạy mock hay API.
 */

const LATENCY_MS = 220

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function base64Url(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function buildToken(account: MockAccount, ttlSeconds = 900): string {
  const organization = mockOrganizations.find((org) => org.id === account.orgId)
  const roles = account.roles
  const role = roles.includes('SUPER_ADMIN')
    ? 'SUPER_ADMIN'
    : roles.includes('OWNER') || roles.includes('ORG_OWNER')
      ? 'OWNER'
      : roles.includes('MANAGER')
        ? 'MANAGER'
        : 'STAFF'

  const scopes: Record<string, string[]> = {}
  const orgWide =
    account.roles.includes('SUPER_ADMIN') ||
    account.roles.includes('OWNER') ||
    account.roles.includes('ORG_OWNER')
  for (const permission of account.permissions) {
    // OWNER/SUPER_ADMIN: toàn tổ chức. Tài khoản phòng ban: chỉ scope phòng ban,
    // trừ khi mock muốn mô phỏng HR được cấp scope ORGANIZATION.
    scopes[permission] = orgWide
      ? ['ORGANIZATION']
      : account.departmentId
        ? [`DEPARTMENT:${account.departmentId}`]
        : ['ORGANIZATION']
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: 'mems-identity',
    sub: account.id,
    userId: account.id,
    username: account.username,
    roles,
    role,
    permissions: account.permissions,
    permissionScopes: scopes,
    delegatedPermissions: [],
    departmentId: account.departmentId,
    orgId: account.orgId,
    mustChangePassword: account.mustChangePassword,
    exp: now + ttlSeconds,
    iat: now,
    // Hai claim mô phỏng đề xuất bổ sung — API thật chưa có.
    fullName: account.fullName,
    orgName: organization?.name,
  }

  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  return `${header}.${base64Url(JSON.stringify(payload))}.mock-signature`
}

function tokenPair(account: MockAccount) {
  return {
    accessToken: buildToken(account),
    refreshToken: `mock-refresh-${account.id}-${Math.random().toString(36).slice(2, 10)}`,
    tokenType: 'Bearer',
    expiresIn: 900,
  }
}

function bearer(config: InternalAxiosRequestConfig): string | null {
  const headers = config.headers as AxiosHeaders | undefined
  const value = headers?.get?.('Authorization') ?? (headers as unknown as Record<string, string>)?.Authorization
  if (typeof value !== 'string') return null
  return value.replace(/^Bearer\s+/i, '')
}

function currentAccount(config: InternalAxiosRequestConfig): MockAccount | null {
  const token = bearer(config)
  if (!token) return null
  const claims = decodeJwt(token)
  return mockAccounts.find((account) => account.id === claims.userId) ?? null
}

function isOwner(account: MockAccount) {
  return account.roles.includes('OWNER') || account.roles.includes('ORG_OWNER')
}

function can(account: MockAccount, permission: string) {
  return isOwner(account) || account.permissions.includes(permission)
}

function respond<T>(config: InternalAxiosRequestConfig, data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config,
  }
}

function fail(
  config: InternalAxiosRequestConfig,
  status: number,
  code: string,
  message: string,
): never {
  const response: AxiosResponse = {
    data: { success: false, code, message, data: null },
    status,
    statusText: 'ERROR',
    headers: {},
    config,
  }
  throw new AxiosError(message, String(status), config, undefined, response)
}

function requireAccount(config: InternalAxiosRequestConfig): MockAccount {
  const account = currentAccount(config)
  if (!account) fail(config, 401, 'UNAUTHENTICATED', 'Authentication required')
  return account
}

function requirePermission(config: InternalAxiosRequestConfig, permission: string): MockAccount {
  const account = requireAccount(config)
  if (!can(account, permission)) fail(config, 403, 'FORBIDDEN', 'Access denied')
  return account
}

function body<T>(config: InternalAxiosRequestConfig): T {
  if (!config.data) return {} as T
  if (typeof config.data === 'string') return JSON.parse(config.data) as T
  return config.data as T
}

function param(config: InternalAxiosRequestConfig, key: string): string | undefined {
  const params = (config.params ?? {}) as Record<string, unknown>
  const value = params[key]
  if (Array.isArray(value)) return value.join(',')
  return value === undefined || value === null ? undefined : String(value)
}

function paginate<T>(items: T[], config: InternalAxiosRequestConfig) {
  const page = Math.max(1, Number(param(config, 'page') ?? 1))
  const size = Math.max(1, Number(param(config, 'size') ?? 20))
  return {
    items: items.slice((page - 1) * size, page * size),
    total: items.length,
    page,
    size,
  }
}

function normalize(value: string | undefined): string {
  return (value ?? '').toLowerCase()
}

function memberResponse(member: MockMember) {
  return {
    userId: member.userId,
    username: member.username,
    departmentId: member.departmentId,
    role: member.role,
    status: member.status,
    appointedBy: member.appointedBy,
    appointedAt: member.appointedAt,
    positionIds: member.positionIds,
    permissions: member.permissions,
  }
}

function memberDetail(member: MockMember) {
  const department = mockDepartments.find((item) => item.id === member.departmentId)
  return {
    ...memberResponse(member),
    departmentName: department?.name ?? '—',
    fullName: member.fullName,
    email: member.email,
    phone: member.phone,
    staffCode: member.staffCode,
    teacher: member.teacher,
    contractType: member.contractType,
    teachingStatus: member.teachingStatus,
    classCount: member.classCount,
    noClass: member.classCount === 0,
    classLabel: member.classLabel,
    assignmentHistory: member.assignmentHistory,
  }
}

function organizationDetail(org: MockOrganization) {
  const modules = mockModules.slice(0, 4).map((module) => ({
    code: module.code,
    name: module.name,
    status: org.status === 'active' ? 'active' : org.status === 'pending' ? 'requested' : 'rejected',
  }))
  return {
    organization: {
      id: org.id,
      name: org.name,
      org_type: org.org_type,
      status: org.status,
    },
    owners: [
      {
        id: `owner-of-${org.id}`,
        username: org.owner_username,
        email: org.owner_email,
        status: org.status === 'pending' ? 'pending' : org.status === 'active' ? 'active' : 'disabled',
      },
    ],
    modules,
  }
}

function actionableSteps(account: MockAccount | null, transfer: (typeof mockTransfers)[number]): string[] {
  if (!account || transfer.status !== 'PENDING') return []
  const pending = transfer.steps.find((item) => item.decision === 'PENDING')
  if (!pending) return []
  switch (pending.step) {
    case 'SOURCE_HEAD':
      return isHead(account.id, transfer.fromDepartmentId) ? ['SOURCE_HEAD'] : []
    case 'TARGET_HEAD':
      return isHead(account.id, transfer.toDepartmentId) ? ['TARGET_HEAD'] : []
    case 'HR':
      return can(account, PERM.employeeApproveTransfer) ? ['HR'] : []
    case 'EMPLOYEE':
      return account.id === transfer.userId ? ['EMPLOYEE'] : []
    default:
      return []
  }
}

function isHead(userId: string, departmentId: string): boolean {
  const member = mockMembers.find(
    (item) => item.userId === userId && item.departmentId === departmentId,
  )
  return Boolean(member?.positionIds.includes('pos-head'))
}

function transferResponse(transfer: (typeof mockTransfers)[number], account: MockAccount | null) {
  return {
    id: transfer.id,
    userId: transfer.userId,
    username: transfer.username,
    fullName: transfer.fullName,
    fromDepartmentId: transfer.fromDepartmentId,
    fromDepartmentName: transfer.fromDepartmentName,
    toDepartmentId: transfer.toDepartmentId,
    toDepartmentName: transfer.toDepartmentName,
    reason: transfer.reason,
    status: transfer.status,
    requestedBy: transfer.requestedBy,
    requestedByName: transfer.requestedByName,
    requestedAt: transfer.requestedAt,
    appliedAt: transfer.appliedAt,
    appliedBy: transfer.appliedBy,
    steps: transfer.steps,
    actionableSteps: actionableSteps(account, transfer),
  }
}

export const mockAdapter: AxiosAdapter = async (config) => {
  await delay(LATENCY_MS)
  const method = (config.method ?? 'get').toLowerCase()
  const path = (config.url ?? '').split('?')[0] ?? ''

  // ------------------------------------------------------------------ auth
  if (method === 'post' && path === '/api/v1/auth/login') {
    const payload = body<{ username?: string; password?: string }>(config)
    const account = mockAccounts.find(
      (item) => item.username === payload.username?.trim() && item.password === payload.password,
    )
    if (!account) fail(config, 401, 'INVALID_CREDENTIALS', 'Invalid username or password')
    if (account!.status !== 'active') fail(config, 403, 'ACCOUNT_NOT_ACTIVE', 'Account is not active')
    if (!isOwner(account!) && !account!.roles.includes('SUPER_ADMIN') && !account!.orgId) {
      fail(config, 403, 'ORGANIZATION_REQUIRED', 'Organization is required')
    }
    account!.lastLoginAt = new Date().toISOString()
    return respond(config, tokenPair(account!))
  }

  if (method === 'post' && path === '/api/v1/auth/refresh') {
    const payload = body<{ refreshToken?: string }>(config)
    const accountId = payload.refreshToken?.split('-')[2]
    const account = mockAccounts.find((item) => item.id === accountId)
    if (!account) fail(config, 401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token')
    return respond(config, tokenPair(account!))
  }

  if (method === 'post' && path === '/api/v1/auth/logout') {
    return respond(config, null, 204)
  }

  if (method === 'post' && path === '/api/v1/auth/change-password') {
    const account = requireAccount(config)
    const payload = body<{ currentPassword?: string; newPassword?: string }>(config)
    if (payload.currentPassword !== account.password) {
      fail(config, 400, 'CURRENT_PASSWORD_INCORRECT', 'Current password is incorrect')
    }
    if (!payload.newPassword || payload.newPassword.length < 12) {
      fail(config, 400, 'NEW_PASSWORD_INVALID', 'New password must be 12-72 characters')
    }
    account.password = payload.newPassword!
    account.mustChangePassword = false
    return respond(config, null, 204)
  }

  if (method === 'post' && path === '/api/v1/auth/register') {
    return respond(
      config,
      {
        organizationId: `org-${Date.now()}`,
        accountId: `acc-${Date.now()}`,
        organizationStatus: 'PENDING',
        accountStatus: 'PENDING',
        requestedModules: body<{ modules?: string[] }>(config).modules ?? [],
      },
      201,
    )
  }

  // ------------------------------------------------------------ module catalog
  if (method === 'get' && path === '/api/v1/modules') {
    return respond(
      config,
      mockModules.filter((module) => module.isActive).map(({ code, name }) => ({ code, name })),
    )
  }

  if (method === 'get' && path === '/api/v1/organizations/my/modules') {
    const account = requireAccount(config)
    if (!isOwner(account)) fail(config, 403, 'FORBIDDEN', 'Owner role required')
    return respond(config, mockOrgModules)
  }

  const myModuleMatch = path.match(/^\/api\/v1\/organizations\/my\/modules\/([A-Z_]+)$/)
  if (method === 'patch' && myModuleMatch) {
    const account = requireAccount(config)
    if (!isOwner(account)) fail(config, 403, 'FORBIDDEN', 'Owner role required')
    const moduleCode = myModuleMatch[1]!
    const moduleRow = mockOrgModules.find((item) => item.code === moduleCode)
    if (!moduleRow) fail(config, 400, 'INVALID_MODULE', 'Module not found')
    if (moduleRow!.is_core) fail(config, 400, 'MODULE_IS_CORE', 'Core modules cannot be disabled')
    if (moduleRow!.is_locked_by_admin) {
      fail(config, 409, 'MODULE_LOCKED_BY_ADMIN', 'Module is locked by administrator')
    }
    const payload = body<{ enabled?: boolean }>(config)
    if (typeof payload.enabled !== 'boolean') {
      fail(config, 400, 'VALIDATION_ERROR', "'enabled' field is required")
    }
    const targetStatus = payload.enabled ? 'active' : 'disabled'
    if (moduleRow!.status === targetStatus) {
      fail(config, 409, 'MODULE_ALREADY_IN_STATE', `Module is already ${targetStatus}`)
    }
    moduleRow!.status = targetStatus
    return respond(config, null, 204)
  }

  // -------------------------------------------------------------- organizations
  if (method === 'get' && path === '/api/v1/organizations/options') {
    requireAccount(config)
    return respond(
      config,
      mockOrganizations.map((org) => ({ id: org.id, name: org.name })),
    )
  }

  if (method === 'get' && path === '/api/v1/organizations/pending') {
    requireAccount(config)
    return respond(
      config,
      mockOrganizations
        .filter((org) => org.status === 'pending')
        .map(({ id, name, org_type, status, owner_username, owner_email }) => ({
          id,
          name,
          org_type,
          status,
          owner_username,
          owner_email,
        })),
    )
  }

  if (method === 'get' && path === '/api/v1/organizations') {
    requireAccount(config)
    const status = normalize(param(config, 'status'))
    const orgType = normalize(param(config, 'orgType'))
    const keyword = normalize(param(config, 'keyword'))
    const filtered = mockOrganizations.filter((org) => {
      if (status && !status.split(',').includes(org.status)) return false
      if (orgType && org.org_type.toLowerCase() !== orgType) return false
      if (
        keyword &&
        !`${org.name} ${org.owner_username} ${org.owner_email}`.toLowerCase().includes(keyword)
      ) {
        return false
      }
      return true
    })
    const sort = param(config, 'sort') ?? 'name,asc'
    const [field, direction] = sort.split(',')
    const sorted = [...filtered].sort((a, b) => {
      const key = (field === 'created_at' ? 'created_at' : field === 'status' ? 'status' : 'name') as
        | 'name'
        | 'status'
        | 'created_at'
      const comparison = String(a[key]).localeCompare(String(b[key]), 'vi')
      return direction === 'desc' ? -comparison : comparison
    })
    return respond(config, paginate(sorted, config))
  }

  const orgMatch = path.match(/^\/api\/v1\/organizations\/([^/]+)(\/[a-z]+)?$/)
  if (orgMatch) {
    const [, orgId, action] = orgMatch
    const org = mockOrganizations.find((item) => item.id === orgId)
    if (method === 'get' && !action) {
      requireAccount(config)
      if (!org) fail(config, 404, 'ORGANIZATION_NOT_FOUND', 'Organization not found')
      return respond(config, organizationDetail(org!))
    }
    const account = requireAccount(config)
    if (!isSuperAdmin(account)) fail(config, 403, 'FORBIDDEN', 'Access denied')
    if (!org) fail(config, 404, 'ORGANIZATION_NOT_FOUND', 'Organization not found')

    if (method === 'patch' && action === '/approve') {
      if (org!.status !== 'pending') fail(config, 409, 'ORGANIZATION_ALREADY_REVIEWED', 'Already reviewed')
      org!.status = 'active'
      org!.approved_at = new Date().toISOString()
      pushAudit('ORG_APPROVED', 'ORGANIZATION', org!, account.username)
      return respond(config, null, 204)
    }
    if (method === 'patch' && action === '/reject') {
      if (org!.status !== 'pending') fail(config, 409, 'ORGANIZATION_ALREADY_REVIEWED', 'Already reviewed')
      org!.status = 'rejected'
      org!.rejection_reason = body<{ reason?: string }>(config).reason ?? null
      pushAudit('ORG_REJECTED', 'ORGANIZATION', org!, account.username)
      return respond(config, null, 204)
    }
    if (method === 'patch' && action === '/suspend') {
      org!.status = 'suspended'
      pushAudit('ORG_SUSPENDED', 'ORGANIZATION', org!, account.username)
      return respond(config, null, 204)
    }
    if (method === 'patch' && action === '/reactivate') {
      org!.status = 'active'
      pushAudit('ORG_REACTIVATED', 'ORGANIZATION', org!, account.username)
      return respond(config, null, 204)
    }
    if (method === 'put' && action === '/modules') {
      pushAudit('ORG_MODULES_UPDATED', 'ORGANIZATION', org!, account.username)
      return respond(config, null, 204)
    }
    fail(config, 404, 'NOT_FOUND', 'Not found')
  }

  function isSuperAdmin(account: MockAccount) {
    return account.roles.includes('SUPER_ADMIN')
  }

  function pushAudit(
    action: string,
    targetType: 'ORGANIZATION' | 'ACCOUNT',
    org: MockOrganization,
    actor: string,
  ) {
    mockAuditLogs.unshift({
      id: `aud-${Date.now()}`,
      created_at: new Date().toISOString(),
      action,
      actor_username: actor,
      target_type: targetType,
      target_id: org.id,
      target_name: org.name,
      description: null,
    })
  }

  // --------------------------------------------------------------- permissions
  if (method === 'get' && path === '/permissions') {
    requireAccount(config)
    return respond(
      config,
      ALL_PERMISSION_META.map((permission) => ({
        code: permission.code,
        description: permission.label,
        moduleCode: null,
        allowedScopes: ['ORGANIZATION', 'DEPARTMENT'],
      })),
    )
  }

  if (method === 'get' && path === '/permission-bundles') {
    requireAccount(config)
    return respond(
      config,
      Object.entries(BUNDLES).map(([code, bundle]) => ({
        code,
        name: bundle.label,
        description: bundle.description,
        permissions: ALL_PERMISSION_META.filter((item) => item.bundle === code).map((item) => item.code),
        allowedScopes: ['ORGANIZATION', 'DEPARTMENT'],
      })),
    )
  }

  // ---------------------------------------------------------------- positions
  if (method === 'get' && path === '/positions') {
    requireAccount(config)
    return respond(config, mockPositions)
  }

  if (method === 'get' && path === '/specialties') {
    requireAccount(config)
    return respond(config, [
      { id: 'spec-toan', name: 'Toán học' },
      { id: 'spec-van', name: 'Ngữ văn' },
      { id: 'spec-tin', name: 'Tin học' },
      { id: 'spec-ly', name: 'Vật lý' },
      { id: 'spec-anh', name: 'Tiếng Anh' },
    ])
  }

  // -------------------------------------------------------------- departments
  if (method === 'get' && path === '/departments') {
    requireAccount(config)
    return respond(
      config,
      mockDepartments.map(({ id, name, description, createdAt, modules }) => ({
        id,
        name,
        description,
        createdAt,
        modules,
      })),
    )
  }

  if (method === 'post' && path === '/departments') {
    requirePermission(config, PERM.departmentManage)
    const payload = body<{ name?: string; description?: string; moduleCodes?: string[] }>(config)
    if (!payload.name?.trim()) fail(config, 400, 'VALIDATION_ERROR', 'Department name is required')
    if (mockDepartments.some((item) => normalize(item.name) === normalize(payload.name))) {
      fail(config, 409, 'DEPARTMENT_EXISTS', 'Department already exists')
    }
    const department: MockDepartment = {
      id: `dept-${mockDepartments.length + 1}`,
      name: payload.name!.trim(),
      description: payload.description?.trim() || null,
      createdAt: new Date().toISOString(),
      modules: payload.moduleCodes ?? [],
      orgId: DEMO_ORG_ID,
    }
    mockDepartments.push(department)
    return respond(config, department, 201)
  }

  const departmentMatch = path.match(/^\/departments\/([^/]+)(\/.*)?$/)
  if (departmentMatch) {
    const [, departmentId, rest] = departmentMatch
    const account = requireAccount(config)
    const department = mockDepartments.find((item) => item.id === departmentId)
    if (!department) fail(config, 404, 'DEPARTMENT_NOT_FOUND', 'Department not found')

    if (!rest && method === 'get') {
      if (!can(account, PERM.departmentView)) fail(config, 403, 'FORBIDDEN', 'Access denied')
      return respond(config, department)
    }
    if (!rest && method === 'put') {
      requirePermission(config, PERM.departmentManage)
      const payload = body<{ name?: string; description?: string; moduleCodes?: string[] }>(config)
      if (!payload.name?.trim()) fail(config, 400, 'VALIDATION_ERROR', 'Department name is required')
      department!.name = payload.name!.trim()
      department!.description = payload.description?.trim() || null
      department!.modules = payload.moduleCodes ?? department!.modules
      return respond(config, department)
    }
    if (!rest && method === 'delete') {
      requirePermission(config, PERM.departmentManage)
      if (mockMembers.some((member) => member.departmentId === departmentId)) {
        fail(config, 409, 'DEPARTMENT_NOT_EMPTY', 'Department is not empty')
      }
      const index = mockDepartments.findIndex((item) => item.id === departmentId)
      mockDepartments.splice(index, 1)
      return respond(config, null, 204)
    }

    if (rest === '/members' && method === 'get') {
      if (!can(account, PERM.employeeView)) fail(config, 403, 'FORBIDDEN', 'Access denied')
      return respond(
        config,
        mockMembers.filter((member) => member.departmentId === departmentId).map(memberResponse),
      )
    }
    if (rest === '/members' && method === 'post') {
      requirePermission(config, PERM.employeeCreate)
      const payload = body<{
        username?: string
        email?: string
        role?: 'MANAGER' | 'STAFF'
        positionIds?: string[]
        staffCode?: string
        fullName?: string
        phone?: string
        teacherProfile?: { specialtyIds?: string[]; contractType?: string }
      }>(config)
      if (!payload.username?.trim() || !payload.email?.trim() || !payload.role) {
        fail(config, 400, 'VALIDATION_ERROR', 'username, email and role are required')
      }
      if (mockAccounts.some((item) => item.username === payload.username)) {
        fail(config, 409, 'ACCOUNT_EXISTS', 'Username already exists')
      }
      if (mockAccounts.some((item) => item.email === payload.email)) {
        fail(config, 409, 'EMAIL_EXISTS', 'Email already exists')
      }
      const positionIds = payload.positionIds ?? []
      if (positionIds.length === 0) {
        fail(config, 400, 'VALIDATION_ERROR', 'At least one position is required')
      }
      const positions = mockPositions.filter((item) => positionIds.includes(item.id))
      const needsTeacher = positions.some((item) => item.profileType === 'TEACHER')
      if (needsTeacher && (!payload.fullName?.trim() || !payload.phone?.trim() || !payload.staffCode?.trim())) {
        fail(config, 400, 'VALIDATION_ERROR', 'Teacher profile requires staffCode, fullName and phone')
      }
      const temporaryPassword = `Mems@${Math.random().toString(36).slice(2, 8)}#26`
      const permissions = [...new Set(positions.flatMap((item) => item.permissions))]
      const newMember: MockMember = {
        userId: `acc-${payload.username}`,
        username: payload.username!.trim(),
        departmentId: departmentId!,
        role: payload.role!,
        status: 'ACTIVE',
        appointedBy: account.id,
        appointedAt: new Date().toISOString(),
        positionIds,
        permissions,
        fullName: payload.fullName?.trim() || payload.username!.trim(),
        email: payload.email!.trim(),
        phone: payload.phone?.trim() || '',
        staffCode: payload.staffCode?.trim() || `NV${String(mockMembers.length + 1).padStart(3, '0')}`,
        teacher: needsTeacher,
        contractType: (payload.teacherProfile?.contractType as 'CO_HUU' | 'THINH_GIANG') ?? null,
        teachingStatus: needsTeacher ? 'DANG_DAY' : null,
        classCount: 0,
        classLabel: 'Chưa có lớp',
        assignmentHistory: [],
      }
      mockMembers.push(newMember)
      mockAccounts.push({
        id: newMember.userId,
        username: newMember.username,
        password: temporaryPassword,
        fullName: newMember.fullName,
        email: newMember.email,
        roles: [payload.role!],
        permissions,
        orgId: DEMO_ORG_ID,
        departmentId: departmentId!,
        mustChangePassword: true,
        status: 'active',
        lastLoginAt: null,
      })
      return respond(
        config,
        { member: memberResponse(newMember), temporaryPassword, mustChangePassword: true },
        201,
      )
    }

    const memberMatch = rest?.match(/^\/members\/([^/]+)(\/.*)?$/)
    if (memberMatch) {
      const [, userId, memberAction] = memberMatch
      const member = mockMembers.find(
        (item) => item.userId === userId && item.departmentId === departmentId,
      )
      if (!member) fail(config, 404, 'MEMBER_NOT_FOUND', 'Member not found')

      if (!memberAction && method === 'get') {
        if (!can(account, PERM.employeeView)) fail(config, 403, 'FORBIDDEN', 'Access denied')
        return respond(config, memberDetail(member!))
      }
      if (!memberAction && method === 'delete') {
        requirePermission(config, PERM.employeeDelete)
        if (member!.role === 'OWNER') fail(config, 403, 'FORBIDDEN', 'Owners cannot remove their own access')
        const index = mockMembers.findIndex((item) => item.userId === userId)
        mockMembers.splice(index, 1)
        return respond(config, null, 204)
      }
      if (memberAction === '/positions' && method === 'put') {
        requirePermission(config, PERM.employeeAssignPosition)
        const payload = body<{ positionIds?: string[] }>(config)
        if (!payload.positionIds || payload.positionIds.length === 0) {
          fail(config, 400, 'VALIDATION_ERROR', 'positionIds is required')
        }
        member!.positionIds = payload.positionIds!
        member!.permissions = [
          ...new Set(
            mockPositions
              .filter((position) => payload.positionIds!.includes(position.id))
              .flatMap((position) => position.permissions),
          ),
        ]
        return respond(config, memberResponse(member!))
      }
      if (memberAction === '/reset-password' && method === 'post') {
        requirePermission(config, PERM.employeeResetPassword)
        const temporaryPassword = `Mems@${Math.random().toString(36).slice(2, 8)}#26`
        const linked = mockAccounts.find((item) => item.id === userId)
        if (linked) {
          linked.password = temporaryPassword
          linked.mustChangePassword = true
        }
        return respond(config, { temporaryPassword })
      }
      if (memberAction === '/assignments' && method === 'get') {
        return respond(config, member!.assignmentHistory)
      }
    }
  }

  // --------------------------------------------------------------- transfers
  if (method === 'get' && (path === '/transfer-requests/inbox' || path === '/transfer-requests/mine')) {
    const account = requireAccount(config)
    const items = mockTransfers
      .filter((transfer) =>
        path.endsWith('/inbox')
          ? actionableSteps(account, transfer).length > 0
          : transfer.userId === account.id || transfer.requestedBy === account.id,
      )
      .map((transfer) => transferResponse(transfer, account))
    return respond(config, items)
  }

  const transferMatch = path.match(/^\/transfer-requests\/([^/]+)(\/steps\/([A-Z_]+)\/(approve|reject)|\/cancel)?$/)
  if (transferMatch) {
    const [, transferId, , stepName, decision] = transferMatch
    const account = requireAccount(config)
    const transfer = mockTransfers.find((item) => item.id === transferId)
    if (!transfer) fail(config, 404, 'TRANSFER_NOT_FOUND', 'Transfer not found')
    if (method === 'get') return respond(config, transferResponse(transfer!, account))

    if (method === 'post' && transferMatch[2] === '/cancel') {
      if (transfer!.requestedBy !== account.id) {
        fail(config, 403, 'TRANSFER_CANCEL_NOT_ALLOWED', 'Only requester can cancel')
      }
      transfer!.status = 'CANCELLED'
      return respond(config, null, 204)
    }

    if (method === 'post' && stepName && decision) {
      if (!actionableSteps(account, transfer!).includes(stepName)) {
        fail(config, 403, 'TRANSFER_STEP_NOT_ALLOWED', 'Not allowed for this step')
      }
      const targetStep = transfer!.steps.find((item) => item.step === stepName)
      if (!targetStep) fail(config, 400, 'INVALID_TRANSFER_STEP', 'Invalid step')
      if (targetStep!.decision !== 'PENDING') {
        fail(config, 409, 'TRANSFER_STEP_ALREADY_DECIDED', 'Step already decided')
      }
      const payload = body<{ note?: string }>(config)
      targetStep!.decision = decision === 'approve' ? 'APPROVED' : 'REJECTED'
      targetStep!.decidedBy = account.id
      targetStep!.decidedByName = account.fullName
      targetStep!.decidedAt = new Date().toISOString()
      targetStep!.note = payload.note ?? null

      if (decision === 'reject') {
        transfer!.status = 'REJECTED'
      } else if (transfer!.steps.every((item) => item.decision === 'APPROVED')) {
        transfer!.status = 'APPROVED'
        transfer!.appliedAt = new Date().toISOString()
        const member = mockMembers.find((item) => item.userId === transfer!.userId)
        if (member) member.departmentId = transfer!.toDepartmentId
      }
      return respond(config, transferResponse(transfer!, account))
    }
  }

  // ------------------------------------------------------------ notifications
  if (method === 'get' && path === '/notifications') {
    requireAccount(config)
    return respond(config, mockNotifications.slice(0, 50))
  }

  if (method === 'post' && path === '/notifications/read-all') {
    requireAccount(config)
    let updated = 0
    mockNotifications.forEach((item) => {
      if (!item.readAt) {
        item.readAt = new Date().toISOString()
        updated += 1
      }
    })
    return respond(config, { updated })
  }

  const notificationRead = path.match(/^\/notifications\/([^/]+)\/read$/)
  if (notificationRead && method === 'post') {
    requireAccount(config)
    const item = mockNotifications.find((notification) => notification.id === notificationRead[1])
    if (item) item.readAt = new Date().toISOString()
    return respond(config, null)
  }

  // ------------------------------------------------------------ effective perms
  if (method === 'get' && path === '/users/me/permissions') {
    const account = requireAccount(config)
    return respond(config, {
      userId: account.id,
      orgId: account.orgId,
      departmentId: account.departmentId,
      permissions: account.permissions,
      permissionScopes: {},
      delegatedPermissions: [],
    })
  }

  // -------------------------------------------------------------- audit logs
  if (method === 'get' && path === '/api/v1/audit-logs') {
    requireAccount(config)
    const action = normalize(param(config, 'action'))
    const organizationId = param(config, 'organizationId')
    const keyword = normalize(param(config, 'keyword'))
    const filtered = mockAuditLogs.filter((log) => {
      if (action && !action.split(',').includes(log.action)) return false
      if (organizationId && log.target_id !== organizationId) return false
      if (keyword && !`${log.target_name} ${log.actor_username}`.toLowerCase().includes(keyword)) return false
      return true
    })
    return respond(config, paginate(filtered, config))
  }

  // ---------------------------------------------------------------- accounts
  if (method === 'get' && path === '/api/v1/accounts') {
    requireAccount(config)
    const keyword = normalize(param(config, 'keyword'))
    const role = param(config, 'role')
    const orgId = param(config, 'organizationId')
    const rows = mockAccounts
      .filter((account) => {
        if (role && !account.roles.includes(role)) return false
        if (orgId && account.orgId !== orgId) return false
        if (keyword && !`${account.username} ${account.email} ${account.fullName}`.toLowerCase().includes(keyword)) {
          return false
        }
        return true
      })
      .map((account) => {
        const organization = mockOrganizations.find((org) => org.id === account.orgId)
        return {
          id: account.id,
          username: account.username,
          email: account.email,
          full_name: account.fullName,
          organization_id: account.orgId,
          organization_name: organization?.name ?? null,
          role: account.roles[0],
          status: account.status,
          created_at: '2026-08-14T06:00:00Z',
          last_login_at: account.lastLoginAt,
        }
      })
    return respond(config, paginate(rows, config))
  }

  fail(config, 404, 'NOT_FOUND', `Mock chưa hỗ trợ ${method.toUpperCase()} ${path}`)
}
