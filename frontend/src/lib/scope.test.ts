import { describe, expect, it } from 'vitest'

import { resolveDepartmentScope } from '@/lib/scope'
import { PERM } from '@/lib/permissions'
import type { Session } from '@/types/session'

function session(overrides: Partial<Session> = {}): Session {
  return {
    user: {
      id: 'u1',
      username: 'demo',
      mustChangePassword: false,
      organizationId: 'o1',
      departmentId: null,
    },
    roles: ['MANAGER'],
    permissions: [PERM.employeeView],
    permissionScopes: {},
    delegatedPermissions: [],
    modules: [],
    ...overrides,
  }
}

describe('resolveDepartmentScope', () => {
  it('OWNER xem toàn tổ chức dù có departmentId', () => {
    const value = session({
      roles: ['OWNER'],
      user: {
        id: 'u1',
        username: 'owner',
        mustChangePassword: false,
        organizationId: 'o1',
        departmentId: 'd1',
      },
    })
    expect(resolveDepartmentScope(value)).toEqual({
      isScoped: false,
      departmentId: null,
      reason: 'owner',
    })
  })

  it('HR có scope ORGANIZATION được thao tác liên phòng ban', () => {
    const value = session({
      permissionScopes: { [PERM.employeeView]: ['ORGANIZATION'] },
      user: {
        id: 'u1',
        username: 'hr',
        mustChangePassword: false,
        organizationId: 'o1',
        departmentId: 'd1',
      },
    })
    expect(resolveDepartmentScope(value)).toMatchObject({
      isScoped: false,
      reason: 'org-scope',
    })
  })

  it('HR chỉ có scope DEPARTMENT bị giới hạn đúng phòng ban', () => {
    const value = session({
      permissionScopes: { [PERM.employeeView]: ['DEPARTMENT:d1'] },
      user: {
        id: 'u1',
        username: 'hr',
        mustChangePassword: false,
        organizationId: 'o1',
        departmentId: 'd1',
      },
    })
    expect(resolveDepartmentScope(value)).toEqual({
      isScoped: true,
      departmentId: 'd1',
      reason: 'department-scope',
    })
  })

  it('JWT cũ không có permissionScopes vẫn giới hạn theo departmentId', () => {
    const value = session({
      permissionScopes: {},
      user: {
        id: 'u1',
        username: 'hr',
        mustChangePassword: false,
        organizationId: 'o1',
        departmentId: 'd1',
      },
    })
    expect(resolveDepartmentScope(value)).toMatchObject({
      isScoped: true,
      departmentId: 'd1',
    })
  })

  it('không có departmentId và không có scope tổ chức thì không tự mở rộng', () => {
    const value = session({ permissionScopes: {} })
    expect(resolveDepartmentScope(value)).toMatchObject({ isScoped: false, reason: 'unknown' })
  })

  it('không có phiên thì trả unknown, không ném lỗi', () => {
    expect(resolveDepartmentScope(null)).toEqual({
      isScoped: false,
      departmentId: null,
      reason: 'unknown',
    })
  })
})
