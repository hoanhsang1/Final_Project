import { describe, expect, it } from 'vitest'

import {
  accessibleWorkspaces,
  canEnterAcademicWorkspace,
  canEnterOrganizationWorkspace,
  canSeeItem,
  defaultRouteFor,
  visibleGroups,
  WORKSPACES,
} from '@/lib/nav'
import { PERM } from '@/lib/permissions'
import type { Session } from '@/types/session'

function session(overrides: Partial<Session>): Session {
  return {
    user: {
      id: 'u1',
      username: 'demo',
      mustChangePassword: false,
      organizationId: 'o1',
      departmentId: null,
    },
    roles: ['STAFF'],
    permissions: [],
    permissionScopes: {},
    delegatedPermissions: [],
    modules: [],
    ...overrides,
  }
}

const academicWorkspace = WORKSPACES.find((workspace) => workspace.id === 'academic')!
const organizationWorkspace = WORKSPACES.find((workspace) => workspace.id === 'organization')!

function visibleItemIds(value: Session): string[] {
  return visibleGroups(value, academicWorkspace).flatMap((group) =>
    group.items.map((item) => item.id),
  )
}

describe('điều hướng theo quyền hiệu lực', () => {
  it('giáo viên chỉ thấy mục phù hợp với quyền được cấp', () => {
    const teacher = session({
      permissions: [PERM.classView, PERM.studentView, PERM.scheduleView],
      modules: [],
    })

    const ids = visibleItemIds(teacher)
    expect(ids).toContain('classes')
    expect(ids).toContain('students')
    expect(ids).toContain('schedule')
    expect(ids).not.toContain('subjects')
    expect(ids).not.toContain('facility')
  })

  it('người chỉ có quyền nhân sự không thấy lớp học hay lịch học', () => {
    const hr = session({
      roles: ['MANAGER'],
      permissions: [PERM.employeeView, PERM.employeeCreate, PERM.positionView],
    })
    expect(canEnterOrganizationWorkspace(hr)).toBe(true)
    expect(canEnterAcademicWorkspace(hr)).toBe(true)
    const ids = visibleItemIds(hr)
    expect(ids).not.toContain('classes')
    expect(ids).not.toContain('schedule')
  })

  it('Chủ tổ chức thấy toàn bộ mục của khu Đào tạo dù không liệt kê quyền', () => {
    const owner = session({ roles: ['OWNER'], permissions: [] })
    const ids = visibleItemIds(owner)
    expect(ids).toContain('classes')
    expect(ids).toContain('facility-issues')
    expect(ids).toContain('attendance')
  })

  it('module đang tắt thì ẩn mục tương ứng', () => {
    const withModules = session({
      permissions: [PERM.classView, PERM.scheduleView],
      modules: ['CLASS_MANAGEMENT'],
    })
    const ids = visibleItemIds(withModules)
    expect(ids).toContain('classes')
    expect(ids).not.toContain('schedule')
  })

  it('khi chưa có nguồn dữ liệu module thì không ẩn nhầm', () => {
    const unknownModules = session({ permissions: [PERM.scheduleView], modules: [] })
    expect(visibleItemIds(unknownModules)).toContain('schedule')
  })

  it('mục nhân sự trong khu tổ chức cần employee.view', () => {
    const employees = organizationWorkspace.groups
      .flatMap((group) => group.items)
      .find((item) => item.id === 'employees')!
    expect(canSeeItem(session({ permissions: [] }), employees)).toBe(false)
    expect(canSeeItem(session({ permissions: [PERM.employeeView] }), employees)).toBe(true)
  })

  it('không cấp quyền tự động theo role MANAGER', () => {
    const manager = session({ roles: ['MANAGER'], permissions: [] })
    expect(canEnterOrganizationWorkspace(manager)).toBe(false)
    const ids = accessibleWorkspaces(manager).map((workspace) => workspace.id)
    expect(ids).not.toContain('organization')
  })
})

describe('route mặc định sau đăng nhập', () => {
  it('SUPER_ADMIN vào khu quản trị hệ thống', () => {
    expect(defaultRouteFor(session({ roles: ['SUPER_ADMIN'] }))).toBe('/quan-tri')
  })

  it('OWNER vào tổng quan tổ chức', () => {
    expect(defaultRouteFor(session({ roles: ['ORG_OWNER', 'OWNER'] }))).toBe('/to-chuc')
  })

  it('sinh viên vào cổng sinh viên', () => {
    expect(
      defaultRouteFor(session({ roles: ['STUDENT'], permissions: [PERM.studentSelfView] })),
    ).toBe('/sinh-vien')
  })

  it('người duyệt có hộp việc chờ được ưu tiên sau OWNER', () => {
    expect(
      defaultRouteFor(session({ permissions: [PERM.approvalInboxView, PERM.classView] })),
    ).toBe('/viec-cho-duyet')
  })
})
