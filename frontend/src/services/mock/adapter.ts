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
  mockAcademicClasses,
  mockAccounts,
  mockAuditLogs,
  mockClassSubjectHistory,
  mockClassSubjects,
  mockCurricula,
  mockCurriculumSubjects,
  mockDepartments,
  mockMembers,
  mockNotifications,
  mockOrganizations,
  mockPositions,
  mockSpecialtySubjects,
  mockSubjects,
  mockTeacherSubjectProfiles,
  mockTransfers,
  type MockAccount,
  type MockDepartment,
  type MockMember,
  type MockOrganization,
  type MockSpecialtySubject,
  type MockSubject,
  type MockTeacherSubjectProfile,
} from '@/services/mock/fixtures'
import type {
  ApplyCurriculumRequest,
  ClassSubject,
  ClassSubjectCreateRequest,
  ClassSubjectHistory,
  ClassSubjectUpdateRequest,
  Curriculum,
  CurriculumCreateRequest,
  CurriculumSubject,
  CurriculumSubjectCreateRequest,
  CurriculumSubjectUpdateRequest,
  CurriculumSummary,
  CurriculumUpdateRequest,
  PrimarySubjectChangeRequest,
  SpecialtySubjectUpdateRequest,
  SubjectCreateRequest,
  SubjectUpdateRequest,
  TeacherSubject,
  TeacherSubjectCreateRequest,
  TeacherSubjectUpdateRequest,
} from '@/features/academic/types'

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
  const known = mockAccounts.find((account) => account.id === claims.userId)
  if (known) return known
  // Token dựng từ phiên test (không thuộc tài khoản demo): dựng tài khoản tạm theo claim.
  if (!claims.userId) return null
  return {
    id: claims.userId,
    username: claims.username ?? claims.userId,
    password: '',
    fullName: claims.fullName ?? claims.username ?? claims.userId,
    email: '',
    roles: claims.roles ?? [],
    permissions: claims.permissions ?? [],
    orgId: claims.orgId ?? null,
    departmentId: claims.departmentId ?? null,
    mustChangePassword: claims.mustChangePassword === true,
    status: 'active',
    lastLoginAt: null,
  }
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
  data: unknown = null,
): never {
  const response: AxiosResponse = {
    data: { success: false, code, message, data },
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

/** Trưởng phòng ở bất kỳ phòng ban nào (backend xét theo chức danh toàn tổ chức). */
function isHeadAnywhere(userId: string): boolean {
  return mockMembers.some(
    (item) => item.userId === userId && item.positionIds.includes('pos-head'),
  )
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

  // Mọi vai trò: trạng thái module của tổ chức trong JWT.
  if (method === 'get' && path === '/api/v1/modules/status') {
    requireAccount(config)
    return respond(
      config,
      mockOrgModules.map((module) => ({
        code: module.code,
        name: module.name,
        is_core: module.is_core,
        status: module.status,
      })),
    )
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

  // Khả năng duyệt theo chức danh/uỷ quyền (không suy ra từ role MANAGER).
  if (method === 'get' && path === '/users/me/approval-capabilities') {
    const account = requireAccount(config)
    const head = isHeadAnywhere(account.id)
    const transfer = isOwner(account) || can(account, PERM.employeeApproveTransfer) || head
    const resignation =
      isOwner(account) || can(account, PERM.employeeApproveResignation) || head
    const classLifecycle =
      isOwner(account) || can(account, PERM.classApproveClose) || (head && can(account, PERM.classView))
    return respond(config, {
      transfer,
      resignation,
      classLifecycle,
      any: transfer || resignation || classLifecycle,
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

  // ==========================================================================
  // Phase 1 — Academic Setup Mock Endpoints (D-01 to D-15)
  // ==========================================================================

  // ----------------------------------------------------------------- subjects
  if (method === 'get' && path === '/api/subjects/check-code') {
    const account = requireAccount(config)
    const code = normalize(param(config, 'code'))
    const excludeId = param(config, 'excludeId')
    const match = mockSubjects.find(
      (s) =>
        s.orgId === account.orgId &&
        s.code &&
        normalize(s.code) === code &&
        s.id !== excludeId,
    )
    return respond(config, {
      code: code ?? '',
      available: !match,
      existingId: match?.id ?? null,
    })
  }

  const subjectUsageMatch = path.match(/^\/api\/subjects\/([^/]+)\/usage$/)
  if (method === 'get' && subjectUsageMatch) {
    const account = requireAccount(config)
    const subjectId = subjectUsageMatch[1]
    const classes = mockAcademicClasses.filter(
      (c) =>
        c.orgId === account.orgId &&
        (c.subjectId === subjectId ||
          mockClassSubjects.some((cs) => cs.classId === c.id && cs.subjectId === subjectId)),
    )
    return respond(config, {
      subjectId,
      classesUsingSubject: classes.length,
      classIds: classes.map((c) => c.id),
    })
  }

  const subjectStatusMatch = path.match(/^\/api\/subjects\/([^/]+)\/status$/)
  if (method === 'patch' && subjectStatusMatch) {
    const account = requirePermission(config, PERM.subjectManage)
    const subjectId = subjectStatusMatch[1]
    const subject = mockSubjects.find((s) => s.id === subjectId && s.orgId === account.orgId)
    if (!subject) fail(config, 404, 'SUBJECT_NOT_FOUND', 'Môn học không tồn tại')
    const payload = body<{ active?: boolean }>(config)
    if (typeof payload.active !== 'boolean') {
      fail(config, 400, 'VALIDATION_ERROR', "'active' field is required")
    }
    subject.active = payload.active
    subject.updatedAt = new Date().toISOString()
    return respond(config, subject)
  }

  const subjectItemMatch = path.match(/^\/api\/subjects\/([^/]+)$/)
  if (method === 'get' && subjectItemMatch) {
    const account = requireAccount(config)
    const subject = mockSubjects.find((s) => s.id === subjectItemMatch[1] && s.orgId === account.orgId)
    if (!subject) fail(config, 404, 'SUBJECT_NOT_FOUND', 'Môn học không tồn tại')
    return respond(config, subject)
  }

  if (method === 'put' && subjectItemMatch) {
    const account = requirePermission(config, PERM.subjectManage)
    const subjectId = subjectItemMatch[1]
    const subject = mockSubjects.find((s) => s.id === subjectId && s.orgId === account.orgId)
    if (!subject) fail(config, 404, 'SUBJECT_NOT_FOUND', 'Môn học không tồn tại')
    const payload = body<SubjectUpdateRequest>(config)
    if (!payload.name?.trim()) fail(config, 400, 'NAME_REQUIRED', 'Tên môn học là bắt buộc')
    const nameNorm = normalize(payload.name)
    if (
      mockSubjects.some(
        (s) => s.id !== subjectId && s.orgId === account.orgId && normalize(s.name) === nameNorm,
      )
    ) {
      fail(config, 409, 'CONFLICT', 'Tên môn học đã tồn tại trong tổ chức')
    }
    const code = payload.code?.trim() || null
    if (code) {
      if (code.length > 50) fail(config, 400, 'VALIDATION_ERROR', 'Mã môn học không được vượt 50 ký tự')
      if (
        mockSubjects.some(
          (s) =>
            s.id !== subjectId &&
            s.orgId === account.orgId &&
            s.code &&
            normalize(s.code) === normalize(code),
        )
      ) {
        fail(config, 409, 'SUBJECT_CODE_EXISTS', 'Mã môn học đã tồn tại trong tổ chức')
      }
    }
    subject.name = payload.name.trim()
    subject.code = code
    subject.description = payload.description?.trim() || null
    subject.updatedAt = new Date().toISOString()
    return respond(config, subject)
  }

  if (method === 'get' && path === '/api/subjects') {
    const account = requireAccount(config)
    const q = normalize(param(config, 'q'))
    const includeInactive = param(config, 'includeInactive') === 'true'
    const canSeeInactive = isOwner(account) || can(account, PERM.subjectManage)
    const items = mockSubjects
      .filter((s) => {
        if (s.orgId !== account.orgId) return false
        if (!s.active && (!includeInactive || !canSeeInactive)) return false
        if (q) {
          const matchName = normalize(s.name)?.includes(q)
          const matchCode = normalize(s.code ?? undefined)?.includes(q)
          if (!matchName && !matchCode) return false
        }
        return true
      })
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1
        return a.name.localeCompare(b.name, 'vi')
      })
    return respond(config, items)
  }

  if (method === 'post' && path === '/api/subjects') {
    const account = requirePermission(config, PERM.subjectManage)
    const payload = body<SubjectCreateRequest>(config)
    if (!payload.name?.trim()) fail(config, 400, 'NAME_REQUIRED', 'Tên môn học là bắt buộc')
    if (payload.name.trim().length > 200) {
      fail(config, 400, 'VALIDATION_ERROR', 'Tên môn học không được vượt 200 ký tự')
    }
    const nameNorm = normalize(payload.name)
    if (mockSubjects.some((s) => s.orgId === account.orgId && normalize(s.name) === nameNorm)) {
      fail(config, 409, 'CONFLICT', 'Tên môn học đã tồn tại trong tổ chức')
    }
    const code = payload.code?.trim() || null
    if (code) {
      if (code.length > 50) fail(config, 400, 'VALIDATION_ERROR', 'Mã môn học không được vượt 50 ký tự')
      if (
        mockSubjects.some(
          (s) => s.orgId === account.orgId && s.code && normalize(s.code) === normalize(code),
        )
      ) {
        fail(config, 409, 'SUBJECT_CODE_EXISTS', 'Mã môn học đã tồn tại trong tổ chức')
      }
    }
    const newSubject: MockSubject = {
      id: `sub-${Math.random().toString(36).slice(2, 9)}`,
      code,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      active: true,
      orgId: account.orgId!,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    }
    mockSubjects.push(newSubject)
    return respond(config, newSubject, 201)
  }

  // ---------------------------------------------------------------- curricula
  const curriculumSubjectsMatch = path.match(/^\/api\/curricula\/([^/]+)\/subjects(\/([^/]+))?$/)
  if (curriculumSubjectsMatch) {
    const [, curriculumId, , subjectId] = curriculumSubjectsMatch
    const account = requireAccount(config)
    const curriculum = mockCurricula.find((c) => c.id === curriculumId && c.orgId === account.orgId)
    if (!curriculum) fail(config, 404, 'CURRICULUM_NOT_FOUND', 'Chương trình đào tạo không tồn tại')

    // GET /api/curricula/:id/subjects
    if (method === 'get' && !subjectId) {
      if (!can(account, PERM.curriculumView) && !can(account, PERM.curriculumManage)) {
        fail(config, 403, 'FORBIDDEN', 'Access denied')
      }
      const subjects = mockCurriculumSubjects
        .filter((s) => s.curriculumId === curriculumId)
        .sort((a, b) => a.sequenceNo - b.sequenceNo)
      return respond(config, subjects)
    }

    // POST /api/curricula/:id/subjects
    if (method === 'post' && !subjectId) {
      requirePermission(config, PERM.curriculumManage)
      const payload = body<CurriculumSubjectCreateRequest>(config)
      const subject = mockSubjects.find((s) => s.id === payload.subjectId && s.orgId === account.orgId)
      if (!subject) fail(config, 404, 'SUBJECT_NOT_FOUND', 'Môn học không tồn tại')
      if (!subject.active) fail(config, 400, 'SUBJECT_INACTIVE', 'Chỉ được thêm môn học đang hoạt động')
      if (
        mockCurriculumSubjects.some(
          (s) => s.curriculumId === curriculumId && s.subjectId === payload.subjectId,
        )
      ) {
        fail(config, 409, 'CURRICULUM_SUBJECT_DUPLICATE', 'Môn học đã tồn tại trong chương trình')
      }
      if (
        mockCurriculumSubjects.some(
          (s) => s.curriculumId === curriculumId && s.sequenceNo === payload.sequenceNo,
        )
      ) {
        fail(config, 409, 'CURRICULUM_SEQUENCE_DUPLICATE', 'Thứ tự môn học đã được sử dụng')
      }
      if (!payload.requiredSessions || payload.requiredSessions < 1) {
        fail(config, 400, 'VALIDATION_ERROR', 'Số buổi yêu cầu phải lớn hơn 0')
      }
      if (!payload.sessionMinutes || payload.sessionMinutes < 1) {
        fail(config, 400, 'VALIDATION_ERROR', 'Thời lượng buổi phải lớn hơn 0')
      }
      const prereqIds = payload.prerequisiteSubjectIds ?? []
      if (prereqIds.includes(payload.subjectId)) {
        fail(config, 400, 'VALIDATION_ERROR', 'Môn học không thể tự làm môn tiên quyết của chính nó')
      }
      if (prereqIds.length > 50) fail(config, 400, 'PREREQUISITE_IDS_TOO_MANY', 'Tối đa 50 môn tiên quyết')
      if (new Set(prereqIds).size !== prereqIds.length) {
        fail(config, 400, 'PREREQUISITE_DUPLICATE', 'Môn tiên quyết bị trùng lặp')
      }
      const existingSubjectIds = new Set(
        mockCurriculumSubjects.filter((s) => s.curriculumId === curriculumId).map((s) => s.subjectId),
      )
      for (const pid of prereqIds) {
        if (!existingSubjectIds.has(pid)) {
          fail(
            config,
            404,
            'CURRICULUM_SUBJECT_NOT_FOUND',
            'Môn tiên quyết không thuộc chương trình đào tạo này',
          )
        }
      }
      // Check cycle: does any pid reach payload.subjectId?
      const reaches = (from: string, target: string, visited = new Set<string>()): boolean => {
        if (from === target) return true
        visited.add(from)
        const current = mockCurriculumSubjects.find(
          (s) => s.curriculumId === curriculumId && s.subjectId === from,
        )
        if (!current) return false
        for (const next of current.prerequisiteSubjectIds) {
          if (!visited.has(next) && reaches(next, target, visited)) return true
        }
        return false
      }
      for (const pid of prereqIds) {
        if (reaches(pid, payload.subjectId)) {
          fail(config, 400, 'SUBJECT_PREREQUISITE_CYCLE', 'Chuỗi tiên quyết tạo vòng lặp', {
            path: [payload.subjectId, pid, payload.subjectId],
          })
        }
      }
      const prereqs = prereqIds.map((pid) => {
        const match = mockSubjects.find((s) => s.id === pid)
        return { subjectId: pid, subjectCode: match?.code ?? null, subjectName: match?.name ?? pid }
      })
      const newCurriculumSubject: CurriculumSubject = {
        curriculumId,
        subjectId: payload.subjectId,
        subjectCode: subject.code,
        subjectName: subject.name,
        sequenceNo: payload.sequenceNo,
        requiredSessions: payload.requiredSessions,
        sessionMinutes: payload.sessionMinutes,
        sessionsPerWeek: payload.sessionsPerWeek ?? null,
        theoryHours: payload.theoryHours ?? null,
        practiceHours: payload.practiceHours ?? null,
        isRequired: payload.isRequired ?? true,
        notes: payload.notes ?? null,
        prerequisiteSubjectIds: prereqIds,
        prerequisites: prereqs,
      }
      mockCurriculumSubjects.push(newCurriculumSubject)
      curriculum.version += 1
      curriculum.subjectCount = (curriculum.subjectCount ?? 0) + 1
      return respond(config, newCurriculumSubject, 201)
    }

    // PUT /api/curricula/:id/subjects/:subjectId
    if (method === 'put' && subjectId) {
      requirePermission(config, PERM.curriculumManage)
      const currentSubject = mockCurriculumSubjects.find(
        (s) => s.curriculumId === curriculumId && s.subjectId === subjectId,
      )
      if (!currentSubject) {
        fail(config, 404, 'CURRICULUM_SUBJECT_NOT_FOUND', 'Môn học không tồn tại trong chương trình')
      }
      const payload = body<CurriculumSubjectUpdateRequest>(config)
      if (
        payload.sequenceNo &&
        mockCurriculumSubjects.some(
          (s) =>
            s.curriculumId === curriculumId &&
            s.subjectId !== subjectId &&
            s.sequenceNo === payload.sequenceNo,
        )
      ) {
        fail(config, 409, 'CURRICULUM_SEQUENCE_DUPLICATE', 'Thứ tự môn học đã được sử dụng')
      }
      const prereqIds = payload.prerequisiteSubjectIds ?? currentSubject.prerequisiteSubjectIds
      if (prereqIds.includes(subjectId)) {
        fail(config, 400, 'VALIDATION_ERROR', 'Môn học không thể tự làm môn tiên quyết của chính nó')
      }
      if (prereqIds.length > 50) fail(config, 400, 'PREREQUISITE_IDS_TOO_MANY', 'Tối đa 50 môn tiên quyết')
      if (new Set(prereqIds).size !== prereqIds.length) {
        fail(config, 400, 'PREREQUISITE_DUPLICATE', 'Môn tiên quyết bị trùng lặp')
      }
      const existingSubjectIds = new Set(
        mockCurriculumSubjects.filter((s) => s.curriculumId === curriculumId).map((s) => s.subjectId),
      )
      for (const pid of prereqIds) {
        if (!existingSubjectIds.has(pid)) {
          fail(
            config,
            404,
            'CURRICULUM_SUBJECT_NOT_FOUND',
            'Môn tiên quyết không thuộc chương trình đào tạo này',
          )
        }
      }
      const reaches = (from: string, target: string, visited = new Set<string>()): boolean => {
        if (from === target) return true
        visited.add(from)
        const cur = mockCurriculumSubjects.find(
          (s) => s.curriculumId === curriculumId && s.subjectId === from,
        )
        if (!cur) return false
        for (const next of cur.prerequisiteSubjectIds) {
          if (!visited.has(next) && reaches(next, target, visited)) return true
        }
        return false
      }
      for (const pid of prereqIds) {
        if (reaches(pid, subjectId)) {
          fail(config, 400, 'SUBJECT_PREREQUISITE_CYCLE', 'Chuỗi tiên quyết tạo vòng lặp', {
            path: [subjectId, pid, subjectId],
          })
        }
      }
      if (payload.sequenceNo !== undefined) currentSubject.sequenceNo = payload.sequenceNo
      if (payload.requiredSessions !== undefined) currentSubject.requiredSessions = payload.requiredSessions
      if (payload.sessionMinutes !== undefined) currentSubject.sessionMinutes = payload.sessionMinutes
      if (payload.theoryHours !== undefined) currentSubject.theoryHours = payload.theoryHours
      if (payload.practiceHours !== undefined) currentSubject.practiceHours = payload.practiceHours
      if (payload.isRequired !== undefined) currentSubject.isRequired = payload.isRequired
      if (payload.notes !== undefined) currentSubject.notes = payload.notes
      currentSubject.prerequisiteSubjectIds = prereqIds
      currentSubject.prerequisites = prereqIds.map((pid) => {
        const match = mockSubjects.find((s) => s.id === pid)
        return { subjectId: pid, subjectCode: match?.code ?? null, subjectName: match?.name ?? pid }
      })
      curriculum.version += 1
      return respond(config, currentSubject)
    }

    // DELETE /api/curricula/:id/subjects/:subjectId
    if (method === 'delete' && subjectId) {
      requirePermission(config, PERM.curriculumManage)
      const index = mockCurriculumSubjects.findIndex(
        (s) => s.curriculumId === curriculumId && s.subjectId === subjectId,
      )
      if (index === -1) {
        fail(config, 404, 'CURRICULUM_SUBJECT_NOT_FOUND', 'Môn học không tồn tại trong chương trình')
      }
      const hasDependents = mockCurriculumSubjects.some(
        (s) => s.curriculumId === curriculumId && s.prerequisiteSubjectIds.includes(subjectId),
      )
      if (hasDependents) {
        fail(
          config,
          409,
          'CONFLICT',
          'Môn học đang là điều kiện tiên quyết của môn khác trong chương trình. Hãy gỡ môn tiên quyết trước.',
        )
      }
      mockCurriculumSubjects.splice(index, 1)
      curriculum.version += 1
      curriculum.subjectCount = Math.max(0, (curriculum.subjectCount ?? 1) - 1)
      return respond(config, null, 204)
    }
  }

  const curriculumStatusMatch = path.match(/^\/api\/curricula\/([^/]+)\/status$/)
  if (method === 'patch' && curriculumStatusMatch) {
    const account = requirePermission(config, PERM.curriculumManage)
    const curriculumId = curriculumStatusMatch[1]
    const curriculum = mockCurricula.find((c) => c.id === curriculumId && c.orgId === account.orgId)
    if (!curriculum) fail(config, 404, 'CURRICULUM_NOT_FOUND', 'Chương trình đào tạo không tồn tại')
    const payload = body<{ active?: boolean }>(config)
    if (typeof payload.active !== 'boolean') {
      fail(config, 400, 'VALIDATION_ERROR', "'active' field is required")
    }
    curriculum.isActive = payload.active
    curriculum.version += 1
    curriculum.updatedAt = new Date().toISOString()
    return respond(config, curriculum)
  }

  const curriculumItemMatch = path.match(/^\/api\/curricula\/([^/]+)$/)
  if (method === 'get' && curriculumItemMatch) {
    const account = requireAccount(config)
    if (!can(account, PERM.curriculumView) && !can(account, PERM.curriculumManage)) {
      fail(config, 403, 'FORBIDDEN', 'Access denied')
    }
    const curriculum = mockCurricula.find(
      (c) => c.id === curriculumItemMatch[1] && c.orgId === account.orgId,
    )
    if (!curriculum) fail(config, 404, 'CURRICULUM_NOT_FOUND', 'Chương trình đào tạo không tồn tại')
    const subjectCount = mockCurriculumSubjects.filter((s) => s.curriculumId === curriculum.id).length
    return respond(config, { ...curriculum, subjectCount })
  }

  if (method === 'put' && curriculumItemMatch) {
    const account = requirePermission(config, PERM.curriculumManage)
    const curriculumId = curriculumItemMatch[1]
    const curriculum = mockCurricula.find((c) => c.id === curriculumId && c.orgId === account.orgId)
    if (!curriculum) fail(config, 404, 'CURRICULUM_NOT_FOUND', 'Chương trình đào tạo không tồn tại')
    const payload = body<CurriculumUpdateRequest>(config)
    if (payload.version !== curriculum.version) {
      fail(
        config,
        409,
        'DATA_CHANGED',
        'Dữ liệu chương trình đào tạo đã thay đổi bởi người khác. Vui lòng tải lại trang.',
      )
    }
    if (!payload.name?.trim()) fail(config, 400, 'NAME_REQUIRED', 'Tên CTĐT là bắt buộc')
    if (payload.code?.trim()) {
      if (
        mockCurricula.some(
          (c) =>
            c.id !== curriculumId &&
            c.orgId === account.orgId &&
            normalize(c.code) === normalize(payload.code),
        )
      ) {
        fail(config, 409, 'CURRICULUM_CODE_EXISTS', 'Mã CTĐT đã tồn tại trong tổ chức')
      }
      curriculum.code = payload.code.trim()
    }
    curriculum.name = payload.name.trim()
    curriculum.description = payload.description?.trim() || null
    curriculum.gradeLevel = payload.gradeLevel?.trim() || null
    curriculum.majorCode = payload.majorCode?.trim() || null
    curriculum.version += 1
    curriculum.updatedAt = new Date().toISOString()
    return respond(config, curriculum)
  }

  if (method === 'get' && path === '/api/curricula') {
    const account = requireAccount(config)
    if (!can(account, PERM.curriculumView) && !can(account, PERM.curriculumManage)) {
      fail(config, 403, 'FORBIDDEN', 'Access denied')
    }
    const q = normalize(param(config, 'q'))
    const isActiveParam = param(config, 'isActive')
    const rows: CurriculumSummary[] = mockCurricula
      .filter((c) => {
        if (c.orgId !== account.orgId) return false
        if (isActiveParam !== undefined && String(c.isActive) !== isActiveParam) return false
        if (q) {
          const matchName = normalize(c.name)?.includes(q)
          const matchCode = normalize(c.code)?.includes(q)
          if (!matchName && !matchCode) return false
        }
        return true
      })
      .map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        gradeLevel: c.gradeLevel,
        isActive: c.isActive,
        version: c.version,
        subjectCount: mockCurriculumSubjects.filter((s) => s.curriculumId === c.id).length,
      }))
    return respond(config, paginate(rows, config))
  }

  if (method === 'post' && path === '/api/curricula') {
    const account = requirePermission(config, PERM.curriculumManage)
    const payload = body<CurriculumCreateRequest>(config)
    if (!payload.code?.trim()) fail(config, 400, 'CODE_REQUIRED', 'Mã CTĐT là bắt buộc')
    if (!payload.name?.trim()) fail(config, 400, 'NAME_REQUIRED', 'Tên CTĐT là bắt buộc')
    if (
      mockCurricula.some(
        (c) => c.orgId === account.orgId && normalize(c.code) === normalize(payload.code),
      )
    ) {
      fail(config, 409, 'CURRICULUM_CODE_EXISTS', 'Mã CTĐT đã tồn tại trong tổ chức')
    }
    if (
      mockCurricula.some(
        (c) => c.orgId === account.orgId && normalize(c.name) === normalize(payload.name),
      )
    ) {
      fail(config, 409, 'CONFLICT', 'Tên CTĐT đã tồn tại trong tổ chức')
    }
    const newCurriculum: Curriculum = {
      id: `cur-${Math.random().toString(36).slice(2, 9)}`,
      orgId: account.orgId!,
      code: payload.code.trim(),
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      gradeLevel: payload.gradeLevel?.trim() || null,
      majorCode: payload.majorCode?.trim() || null,
      isActive: true,
      version: 0,
      subjectCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    }
    mockCurricula.push(newCurriculum)
    return respond(config, newCurriculum, 201)
  }

  // ------------------------------------------------------------- class subjects
  const classSubjectHistoryMatch = path.match(/^\/api\/classes\/([^/]+)\/subject-history$/)
  if (method === 'get' && classSubjectHistoryMatch) {
    const account = requirePermission(config, PERM.classView)
    const classId = classSubjectHistoryMatch[1]
    const cls = mockAcademicClasses.find((c) => c.id === classId && c.orgId === account.orgId)
    if (!cls) fail(config, 404, 'CLASS_NOT_FOUND', 'Lớp học không tồn tại')
    const page = Math.max(0, Number(param(config, 'page') ?? 0))
    const size = Math.max(1, Number(param(config, 'size') ?? 20))
    const rows = mockClassSubjectHistory
      .filter((h) => h.classId === classId)
      .sort((a, b) => b.changedAt.localeCompare(a.changedAt))
    const items = rows.slice(page * size, (page + 1) * size)
    return respond(config, {
      items,
      total: rows.length,
      page,
      size,
      pages: Math.ceil(rows.length / size),
    })
  }

  const primarySubjectChangeMatch = path.match(/^\/api\/classes\/([^/]+)\/subjects\/primary$/)
  if (method === 'put' && primarySubjectChangeMatch) {
    const account = requirePermission(config, PERM.classEdit)
    const classId = primarySubjectChangeMatch[1]
    const cls = mockAcademicClasses.find((c) => c.id === classId && c.orgId === account.orgId)
    if (!cls) fail(config, 404, 'CLASS_NOT_FOUND', 'Lớp học không tồn tại')
    if (cls.status !== 'CHUA_BAT_DAU' && cls.status !== 'DANG_DIEN_RA') {
      fail(
        config,
        409,
        'CLASS_NOT_EDITABLE',
        'Chỉ có thể đổi môn học chính khi lớp chưa bắt đầu hoặc đang diễn ra',
      )
    }
    const payload = body<PrimarySubjectChangeRequest>(config)
    if (!payload.reason?.trim()) {
      fail(config, 400, 'VALIDATION_ERROR', 'Lý do thay đổi môn chính là bắt buộc')
    }
    if (payload.reason.trim().length > 500) {
      fail(config, 400, 'REASON_TOO_LONG', 'Lý do không được vượt quá 500 ký tự')
    }
    if (!payload.operationId?.trim()) {
      fail(config, 400, 'VALIDATION_ERROR', 'operationId là bắt buộc')
    }
    if (typeof payload.expectedVersion !== 'number') {
      fail(config, 400, 'VALIDATION_ERROR', 'expectedVersion là bắt buộc')
    }

    // Idempotency: same operationId check (BR-SUB-23, D-08)
    const existingHistory = mockClassSubjectHistory.find(
      (h) => h.operationId === payload.operationId && h.classId === classId,
    )
    if (existingHistory) {
      if (
        existingHistory.newSubjectId === payload.subjectId &&
        existingHistory.reason === payload.reason.trim()
      ) {
        return respond(config, {
          classId,
          subjectId: existingHistory.newSubjectId,
          subjectName: existingHistory.newSubjectName,
          version: cls.version,
          historyId: existingHistory.id,
          operationId: existingHistory.operationId,
        })
      }
      fail(
        config,
        409,
        'CLASS_SUBJECT_OPERATION_CONFLICT',
        'operationId đã được sử dụng với nội dung khác',
      )
    }

    // Optimistic locking (D-15)
    if (cls.version !== payload.expectedVersion) {
      fail(
        config,
        409,
        'DATA_CHANGED',
        'Dữ liệu lớp học đã thay đổi bởi người khác. Vui lòng tải lại trang.',
      )
    }

    const newSub = mockSubjects.find((s) => s.id === payload.subjectId && s.orgId === account.orgId)
    if (!newSub) fail(config, 404, 'SUBJECT_NOT_FOUND', 'Môn học mới không tồn tại')
    if (!newSub.active) fail(config, 400, 'SUBJECT_INACTIVE', 'Môn học mới đã ngừng hoạt động')

    const oldPrimaryRow = mockClassSubjects.find((cs) => cs.classId === classId && cs.isPrimary)
    const oldSub = oldPrimaryRow
      ? mockSubjects.find((s) => s.id === oldPrimaryRow.subjectId)
      : cls.subjectId
        ? mockSubjects.find((s) => s.id === cls.subjectId)
        : null

    const oldTeacher = oldPrimaryRow?.teacherId
      ? mockMembers.find((m) => m.userId === oldPrimaryRow.teacherId)
      : cls.teacherId
        ? mockMembers.find((m) => m.userId === cls.teacherId)
        : null

    const historyId = `hist-${Math.random().toString(36).slice(2, 9)}`
    const historyItem: ClassSubjectHistory = {
      id: historyId,
      classId,
      oldSubjectId: oldSub?.id ?? null,
      oldSubjectCode: oldSub?.code ?? null,
      oldSubjectName: oldSub?.name ?? null,
      oldTeacherId: oldTeacher?.userId ?? null,
      oldTeacherName: oldTeacher?.fullName ?? null,
      oldSource: oldPrimaryRow?.source ?? (cls.subjectId ? 'LEGACY' : null),
      newSubjectId: newSub.id,
      newSubjectCode: newSub.code,
      newSubjectName: newSub.name,
      newSource: 'MANUAL',
      reason: payload.reason.trim(),
      operationId: payload.operationId,
      changedBy: account.id,
      changedByName: account.fullName,
      changedAt: new Date().toISOString(),
    }
    mockClassSubjectHistory.push(historyItem)

    // Unmark old primary
    if (oldPrimaryRow) oldPrimaryRow.isPrimary = false

    // Check if new subject already in class
    const existingRow = mockClassSubjects.find(
      (cs) => cs.classId === classId && cs.subjectId === newSub.id,
    )
    if (existingRow) {
      existingRow.isPrimary = true
      historyItem.newSource = existingRow.source
    } else {
      // D-08, D-15: teacherId = NULL (khong copy giao vien cu)
      mockClassSubjects.push({
        classId,
        subjectId: newSub.id,
        subjectCode: newSub.code,
        subjectName: newSub.name,
        source: 'MANUAL',
        curriculumId: null,
        requiredSessions: payload.plannedSessions ?? 45,
        plannedSessions: payload.plannedSessions ?? 45,
        sessionMinutes: payload.sessionMinutes ?? 45,
        sessionsPerWeek: null,
        stageNo: 1,
        teacherId: null,
        teacherName: null,
        isPrimary: true,
        status: 'PLANNED',
      })
    }

    cls.subjectId = newSub.id
    cls.version += 1

    return respond(config, {
      classId,
      subjectId: newSub.id,
      subjectName: newSub.name,
      version: cls.version,
      historyId,
      operationId: payload.operationId,
    })
  }

  const applyCurriculumMatch = path.match(/^\/api\/classes\/([^/]+)\/curriculum$/)
  if (method === 'put' && applyCurriculumMatch) {
    const account = requirePermission(config, PERM.classEdit)
    const classId = applyCurriculumMatch[1]
    const cls = mockAcademicClasses.find((c) => c.id === classId && c.orgId === account.orgId)
    if (!cls) fail(config, 404, 'CLASS_NOT_FOUND', 'Lớp học không tồn tại')
    if (cls.status !== 'CHUA_BAT_DAU') {
      fail(config, 409, 'CLASS_SUBJECT_LOCKED', 'Chỉ có thể áp dụng CTĐT khi lớp chưa bắt đầu')
    }
    const payload = body<ApplyCurriculumRequest>(config)
    if (cls.version !== payload.version) {
      fail(
        config,
        409,
        'DATA_CHANGED',
        'Dữ liệu lớp học đã thay đổi bởi người khác. Vui lòng tải lại trang.',
      )
    }
    const curriculum = mockCurricula.find(
      (c) => c.id === payload.curriculumId && c.orgId === account.orgId,
    )
    if (!curriculum) fail(config, 404, 'CURRICULUM_NOT_FOUND', 'CTĐT không tồn tại')
    if (!curriculum.isActive) fail(config, 400, 'CURRICULUM_INACTIVE', 'CTĐT đã ngừng hoạt động')

    const keepManual = payload.keepManualSubjects !== false
    // Remove curriculum-sourced rows if confirmReplace
    for (let i = mockClassSubjects.length - 1; i >= 0; i--) {
      const cs = mockClassSubjects[i]!
      if (cs.classId === classId) {
        if (cs.source === 'CURRICULUM' || (!keepManual && cs.source === 'MANUAL')) {
          mockClassSubjects.splice(i, 1)
        }
      }
    }

    const curSubs = mockCurriculumSubjects.filter((s) => s.curriculumId === payload.curriculumId)
    for (let idx = 0; idx < curSubs.length; idx++) {
      const cs = curSubs[idx]!
      mockClassSubjects.push({
        classId,
        subjectId: cs.subjectId,
        subjectCode: cs.subjectCode,
        subjectName: cs.subjectName,
        source: 'CURRICULUM',
        curriculumId: payload.curriculumId,
        requiredSessions: cs.requiredSessions,
        plannedSessions: cs.requiredSessions,
        sessionMinutes: cs.sessionMinutes,
        sessionsPerWeek: cs.sessionsPerWeek ?? 2,
        stageNo: cs.sequenceNo,
        teacherId: null,
        teacherName: null,
        isPrimary: idx === 0, // D-15: dòng đầu tiên làm primary nếu chưa có
        status: 'PLANNED',
      })
    }

    cls.curriculumId = payload.curriculumId
    if (curSubs.length > 0) cls.subjectId = curSubs[0]!.subjectId
    cls.version += 1

    return respond(config, {
      classId,
      curriculumId: cls.curriculumId,
      subjects: mockClassSubjects.filter((cs) => cs.classId === classId),
    })
  }

  const classSubjectsRouteMatch = path.match(/^\/api\/classes\/([^/]+)\/subjects(\/([^/]+))?$/)
  if (classSubjectsRouteMatch) {
    const [, classId, , subjectId] = classSubjectsRouteMatch
    const account = requireAccount(config)
    const cls = mockAcademicClasses.find((c) => c.id === classId && c.orgId === account.orgId)
    if (!cls) fail(config, 404, 'CLASS_NOT_FOUND', 'Lớp học không tồn tại')

    // GET /api/classes/:classId/subjects
    if (method === 'get' && !subjectId) {
      requirePermission(config, PERM.classView)
      const rows = mockClassSubjects.filter((cs) => cs.classId === classId)
      // D-09, D-15: Fallback legacy nếu chưa có class_subject nào nhưng có subjectId
      if (rows.length === 0 && cls.subjectId) {
        const sub = mockSubjects.find((s) => s.id === cls.subjectId)
        const teacher = cls.teacherId ? mockMembers.find((m) => m.userId === cls.teacherId) : null
        const legacyRow: ClassSubject = {
          classId,
          subjectId: cls.subjectId,
          subjectCode: sub?.code ?? null,
          subjectName: sub?.name ?? 'Môn học legacy',
          source: 'LEGACY',
          curriculumId: null,
          requiredSessions: null,
          plannedSessions: null,
          sessionMinutes: null,
          sessionsPerWeek: null,
          stageNo: 1,
          teacherId: cls.teacherId, // Fallback teacher chỉ áp dụng cho dòng LEGACY suy ra
          teacherName: teacher?.fullName ?? null,
          isPrimary: true,
          status: 'PLANNED',
        }
        return respond(config, {
          classId,
          curriculumId: cls.curriculumId,
          subjects: [legacyRow],
        })
      }
      return respond(config, {
        classId,
        curriculumId: cls.curriculumId,
        subjects: rows,
      })
    }

    // POST /api/classes/:classId/subjects (Thêm môn thủ công)
    if (method === 'post' && !subjectId) {
      requirePermission(config, PERM.classEdit)
      if (cls.status !== 'CHUA_BAT_DAU') {
        fail(config, 409, 'CLASS_NOT_EDITABLE', 'Chỉ có thể thêm môn học khi lớp chưa bắt đầu')
      }
      const payload = body<ClassSubjectCreateRequest>(config)
      const sub = mockSubjects.find((s) => s.id === payload.subjectId && s.orgId === account.orgId)
      if (!sub) fail(config, 404, 'SUBJECT_NOT_FOUND', 'Môn học không tồn tại')
      if (!sub.active) fail(config, 400, 'SUBJECT_INACTIVE', 'Chỉ có thể thêm môn học đang hoạt động')
      if (mockClassSubjects.some((cs) => cs.classId === classId && cs.subjectId === payload.subjectId)) {
        fail(config, 409, 'CLASS_SUBJECT_EXISTS', 'Môn học đã tồn tại trong lớp')
      }
      const teacher = payload.teacherId
        ? mockMembers.find((m) => m.userId === payload.teacherId)
        : null
      const newClassSubject: ClassSubject = {
        classId,
        subjectId: payload.subjectId,
        subjectCode: sub.code,
        subjectName: sub.name,
        source: 'MANUAL',
        curriculumId: null,
        requiredSessions: payload.plannedSessions,
        plannedSessions: payload.plannedSessions,
        sessionMinutes: payload.sessionMinutes,
        sessionsPerWeek: payload.sessionsPerWeek ?? null,
        stageNo: payload.stageNo ?? 1,
        teacherId: payload.teacherId ?? null,
        teacherName: teacher?.fullName ?? null,
        isPrimary: false,
        status: 'PLANNED',
      }
      mockClassSubjects.push(newClassSubject)
      cls.version += 1
      return respond(config, newClassSubject, 201)
    }

    // PUT /api/classes/:classId/subjects/:subjectId
    if (method === 'put' && subjectId) {
      requirePermission(config, PERM.classEdit)
      const current = mockClassSubjects.find(
        (cs) => cs.classId === classId && cs.subjectId === subjectId,
      )
      if (!current) fail(config, 404, 'CLASS_SUBJECT_NOT_FOUND', 'Môn học không thuộc lớp này')
      const payload = body<ClassSubjectUpdateRequest>(config)
      if (payload.version !== cls.version) {
        fail(
          config,
          409,
          'DATA_CHANGED',
          'Dữ liệu lớp học đã thay đổi bởi người khác. Vui lòng tải lại trang.',
        )
      }
      if (payload.plannedSessions !== undefined) current.plannedSessions = payload.plannedSessions
      if (payload.sessionMinutes !== undefined) current.sessionMinutes = payload.sessionMinutes
      if (payload.sessionsPerWeek !== undefined) current.sessionsPerWeek = payload.sessionsPerWeek
      if (payload.stageNo !== undefined) current.stageNo = payload.stageNo
      if (payload.teacherId !== undefined) {
        current.teacherId = payload.teacherId
        const teacher = payload.teacherId
          ? mockMembers.find((m) => m.userId === payload.teacherId)
          : null
        current.teacherName = teacher?.fullName ?? null
      }
      cls.version += 1
      return respond(config, current)
    }

    // DELETE /api/classes/:classId/subjects/:subjectId
    if (method === 'delete' && subjectId) {
      requirePermission(config, PERM.classEdit)
      if (cls.status !== 'CHUA_BAT_DAU') {
        fail(config, 409, 'CLASS_NOT_EDITABLE', 'Chỉ có thể xoá môn học khi lớp chưa bắt đầu')
      }
      const current = mockClassSubjects.find(
        (cs) => cs.classId === classId && cs.subjectId === subjectId,
      )
      if (!current) fail(config, 404, 'CLASS_SUBJECT_NOT_FOUND', 'Môn học không thuộc lớp này')
      // D-15: Không cho xoá dòng primary
      if (current.isPrimary) {
        fail(
          config,
          409,
          'CLASS_SUBJECT_LEGACY_PROTECTED',
          'Không thể xoá môn học chính của lớp. Vui lòng đổi môn chính trước.',
        )
      }
      const idx = mockClassSubjects.findIndex(
        (cs) => cs.classId === classId && cs.subjectId === subjectId,
      )
      mockClassSubjects.splice(idx, 1)
      cls.version += 1
      return respond(config, null, 204)
    }
  }

  // ------------------------------------------------------------ teacher subjects
  const teacherSubjectsMatch = path.match(/^\/api\/teachers\/([^/]+)\/subjects$/)
  if (teacherSubjectsMatch) {
    const staffId = teacherSubjectsMatch[1]
    const account = requireAccount(config)
    const orgId = account.orgId!
    let profile = mockTeacherSubjectProfiles.find(
      (p) => p.userId === staffId && p.orgId === orgId,
    )
    if (!profile) {
      const newProfile: MockTeacherSubjectProfile = { userId: staffId, version: 1, orgId: orgId, items: [] }
      mockTeacherSubjectProfiles.push(newProfile)
      profile = newProfile
    }

    // GET /api/teachers/:staffId/subjects
    if (method === 'get') {
      requirePermission(config, PERM.employeeView)
      return respond(config, {
        userId: profile.userId,
        version: profile.version,
        items: profile.items.filter((item) => item.status === 'APPROVED'),
      })
    }

    // POST /api/teachers/:staffId/subjects
    if (method === 'post') {
      requirePermission(config, PERM.employeeEdit)
      const payload = body<TeacherSubjectCreateRequest>(config)
      const sub = mockSubjects.find((s) => s.id === payload.subjectId && s.orgId === account.orgId)
      if (!sub) fail(config, 404, 'SUBJECT_NOT_FOUND', 'Môn học không tồn tại')
      if (!sub.active) fail(config, 400, 'SUBJECT_INACTIVE', 'Chỉ có thể gán môn học đang hoạt động')
      const member = mockMembers.find((m) => m.userId === staffId)
      if (member?.teachingStatus === 'NGHI_VIEC') {
        fail(config, 409, 'TEACHER_NOT_AVAILABLE', 'Giáo viên đã nghỉ việc, không thể gán môn học')
      }
      if (profile.items.some((item) => item.subjectId === payload.subjectId && item.status === 'APPROVED')) {
        fail(config, 409, 'TEACHER_SUBJECT_EXISTS', 'Giáo viên đã được gán môn học này')
      }
      // D-06a: Created immediately with status = 'APPROVED', NO PENDING!
      const newItem: TeacherSubject = {
        subjectId: sub.id,
        subjectCode: sub.code,
        subjectName: sub.name,
        status: 'APPROVED',
        source: payload.source ?? 'MANUAL',
        createdAt: new Date().toISOString(),
      }
      profile.items.push(newItem)
      profile.version += 1
      return respond(config, newItem, 201)
    }

    // PUT /api/teachers/:staffId/subjects
    if (method === 'put') {
      requirePermission(config, PERM.employeeEdit)
      const payload = body<TeacherSubjectUpdateRequest>(config)
      if (payload.version !== profile.version) {
        fail(
          config,
          409,
          'DATA_CHANGED',
          'Dữ liệu giáo viên đã thay đổi bởi người khác. Vui lòng tải lại trang.',
        )
      }
      const targetIds = new Set(payload.subjectIds)
      const revokedIds = profile.items
        .filter((item) => item.status === 'APPROVED' && !targetIds.has(item.subjectId))
        .map((item) => item.subjectId)

      // Check if any revoked subject is in use
      const inUseClasses = mockClassSubjects.filter(
        (cs) =>
          cs.teacherId === staffId &&
          revokedIds.includes(cs.subjectId) &&
          mockAcademicClasses.some((c) => c.id === cs.classId && c.status === 'DANG_DIEN_RA'),
      )
      if (inUseClasses.length > 0 && payload.confirmRevokeInUse !== true) {
        fail(
          config,
          409,
          'TEACHER_SUBJECT_IN_USE',
          'Giáo viên đang dạy môn học này tại các lớp đang diễn ra',
          { affectedClasses: inUseClasses.map((cs) => cs.classId) },
        )
      }

      // Update items
      profile.items.forEach((item) => {
        if (!targetIds.has(item.subjectId)) {
          item.status = 'REVOKED'
        }
      })
      payload.subjectIds.forEach((sid) => {
        const sub = mockSubjects.find((s) => s.id === sid && s.orgId === account.orgId)
        if (!sub) return
        const existing = profile!.items.find((item) => item.subjectId === sid)
        if (existing) {
          existing.status = 'APPROVED'
        } else {
          profile!.items.push({
            subjectId: sub.id,
            subjectCode: sub.code,
            subjectName: sub.name,
            status: 'APPROVED',
            source: 'MANUAL',
            createdAt: new Date().toISOString(),
          })
        }
      })
      profile.version += 1
      return respond(config, {
        userId: profile.userId,
        version: profile.version,
        items: profile.items.filter((item) => item.status === 'APPROVED'),
      })
    }
  }

  // ---------------------------------------------------------- specialty subjects
  const specialtySubjectsMatch = path.match(/^\/api\/specialties\/([^/]+)\/subjects$/)
  if (specialtySubjectsMatch) {
    const specialtyId = specialtySubjectsMatch[1]
    const account = requireAccount(config)
    const orgId = account.orgId!
    let entry = mockSpecialtySubjects.find(
      (s) => s.specialtyId === specialtyId && s.orgId === orgId,
    )
    if (!entry) {
      const newEntry: MockSpecialtySubject = { specialtyId, subjectIds: [], orgId }
      mockSpecialtySubjects.push(newEntry)
      entry = newEntry
    }

    if (method === 'get') {
      return respond(config, { specialtyId: entry.specialtyId, subjectIds: entry.subjectIds })
    }

    if (method === 'put') {
      requirePermission(config, PERM.employeeEdit)
      const payload = body<SpecialtySubjectUpdateRequest>(config)
      for (const sid of payload.subjectIds) {
        const sub = mockSubjects.find((s) => s.id === sid && s.orgId === account.orgId)
        if (!sub) fail(config, 400, 'SUBJECT_NOT_FOUND', `Môn học ${sid} không tồn tại`)
        if (!sub.active) fail(config, 400, 'SUBJECT_INACTIVE', `Môn học ${sub.name} đã ngừng hoạt động`)
      }
      entry.subjectIds = payload.subjectIds
      return respond(config, { specialtyId: entry.specialtyId, subjectIds: entry.subjectIds })
    }
  }

  fail(config, 404, 'NOT_FOUND', `Mock chưa hỗ trợ ${method.toUpperCase()} ${path}`)
}
