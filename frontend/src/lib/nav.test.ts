import { describe, expect, it } from 'vitest'

import {
  accessibleWorkspaces,
  canEnterAcademicWorkspace,
  canEnterOrganizationWorkspace,
  canSeeItem,
  canWriteModule,
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

const organizationWorkspace = WORKSPACES.find((workspace) => workspace.id === 'organization')!

function visibleItemIds(value: Session): string[] {
  return visibleItemIdsFor(value, 'academic')
}

function visibleItemIdsFor(value: Session, workspaceId: string): string[] {
  const workspace = WORKSPACES.find((item) => item.id === workspaceId)!
  return visibleGroups(value, workspace).flatMap((group) => group.items.map((item) => item.id))
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

  it('chỉ có class.create vẫn thấy mục lớp học để mở luồng tạo', () => {
    const creator = session({ permissions: [PERM.classCreate] })
    expect(visibleItemIds(creator)).toContain('classes')
  })

  it('môn học hiện khi có subject.view hoặc subject.manage', () => {
    expect(visibleItemIds(session({ permissions: [PERM.subjectView] }))).toContain('subjects')
    expect(visibleItemIds(session({ permissions: [PERM.subjectManage] }))).toContain('subjects')
    expect(visibleItemIds(session({ permissions: [PERM.classView] }))).not.toContain('subjects')
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

  it('module chưa đăng ký thì ẩn mục tương ứng', () => {
    const withModules = session({
      permissions: [PERM.classView, PERM.scheduleView],
      moduleStates: { CLASS_MANAGEMENT: 'active', SCHEDULE_MANAGEMENT: 'not_registered' },
    })
    const ids = visibleItemIds(withModules)
    expect(ids).toContain('classes')
    expect(ids).not.toContain('schedule')
  })

  it('module đang tắt hoặc bị khóa vẫn hiện để đọc, chỉ chặn ghi', () => {
    const readOnly = session({
      permissions: [PERM.classView, PERM.scheduleView],
      moduleStates: { CLASS_MANAGEMENT: 'disabled', SCHEDULE_MANAGEMENT: 'locked' },
    })
    const ids = visibleItemIds(readOnly)
    expect(ids).toContain('classes')
    expect(ids).toContain('schedule')
    expect(canWriteModule(readOnly, 'CLASS_MANAGEMENT')).toBe(false)
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

  it('người duyệt theo chức danh thấy hộp việc chờ dù không có mã quyền', () => {
    const head = session({
      roles: ['STAFF'],
      permissions: [PERM.classView],
      approvals: { transfer: true, resignation: true, classLifecycle: true, any: true },
    })
    const ids = visibleItemIdsFor(head, 'self')
    expect(ids).toContain('approvals-inbox')
    expect(defaultRouteFor(head)).toBe('/viec-cho-duyet')
  })

  it('MANAGER không có khả năng duyệt thì không thấy hộp việc chờ', () => {
    const manager = session({ roles: ['MANAGER'], permissions: [PERM.employeeView] })
    const ids = visibleItemIdsFor(manager, 'self')
    expect(ids).not.toContain('approvals-inbox')
    expect(defaultRouteFor(manager)).toBe('/to-chuc')
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
