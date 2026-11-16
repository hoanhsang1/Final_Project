import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { departmentsApi, positionsApi } from '@/features/organization/api'
import type * as OrganizationApi from '@/features/organization/api'
import { EmployeeDetailDrawer } from '@/features/organization/components/employee-detail-drawer'
import type { MemberDetail, Position } from '@/features/organization/types'
import { effectivePermissionsApi } from '@/features/workflows/api'
import type * as WorkflowsApi from '@/features/workflows/api'
import { PERM } from '@/lib/permissions'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/organization/api', async (importOriginal) => {
  const actual = await importOriginal<typeof OrganizationApi>()
  return {
    ...actual,
    departmentsApi: {
      ...actual.departmentsApi,
      memberDetail: vi.fn(),
      updatePositions: vi.fn(),
      resetPassword: vi.fn(),
      removeMember: vi.fn(),
    },
    positionsApi: { ...actual.positionsApi, list: vi.fn() },
  }
})

vi.mock('@/features/workflows/api', async (importOriginal) => {
  const actual = await importOriginal<typeof WorkflowsApi>()
  return {
    ...actual,
    effectivePermissionsApi: {
      ...actual.effectivePermissionsApi,
      member: vi.fn(),
    },
  }
})

const positionA: Position = {
  id: 'pos-a',
  name: 'Trưởng bộ môn',
  description: 'Phụ trách chuyên môn',
  createdAt: '2026-01-01T00:00:00Z',
  permissions: ['employee.view'],
  profileType: 'TEACHER',
  bundleCodes: [],
  scope: 'DEPARTMENT',
  departmentId: 'dept-1',
}

const positionB: Position = {
  ...positionA,
  id: 'pos-b',
  name: 'Giáo vụ',
  profileType: 'STAFF',
  permissions: ['employee.view'],
}

const member: MemberDetail = {
  userId: 'user-9',
  username: 'giao.vien',
  departmentId: 'dept-1',
  role: 'STAFF',
  status: 'ACTIVE',
  appointedBy: null,
  appointedAt: '2026-01-01T00:00:00Z',
  positionIds: ['pos-a'],
  permissions: ['employee.view'],
  departmentName: 'Tổ Toán – Tin',
  fullName: 'Giáo viên A',
  email: 'gv.a@example.test',
  phone: null,
  staffCode: 'GV001',
  teacher: true,
  contractType: 'CO_HUU',
  teachingStatus: 'DANG_DAY',
  classCount: 2,
  classLabel: null,
  assignmentHistory: [],
}

beforeEach(() => {
  vi.mocked(departmentsApi.memberDetail).mockResolvedValue(member)
  vi.mocked(positionsApi.list).mockResolvedValue([positionA, positionB])
  vi.mocked(effectivePermissionsApi.member).mockResolvedValue({
    userId: 'user-9',
    orgId: 'org-1',
    departmentId: 'dept-1',
    permissions: ['employee.view'],
    permissionScopes: { 'employee.view': ['DEPARTMENT:dept-1'] },
    delegatedPermissions: [],
  })
  vi.mocked(departmentsApi.updatePositions).mockReset()
  vi.mocked(departmentsApi.resetPassword).mockReset()
})

function renderDrawer() {
  return renderPage(
    <EmployeeDetailDrawer
      open
      onOpenChange={() => undefined}
      departmentId="dept-1"
      userId="user-9"
    />,
  )
}

describe('EmployeeDetailDrawer — phân công chức vụ', () => {
  it('cập nhật chức vụ kèm lý do và refetch chi tiết nhân sự', async () => {
    signInAs({ permissions: [PERM.employeeAssignPosition] })
    vi.mocked(departmentsApi.updatePositions).mockResolvedValue({
      ...member,
      positionIds: ['pos-b'],
    })

    renderDrawer()
    expect(await screen.findByText('Giáo viên A')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Đổi chức vụ' }))
    const dialog = await screen.findByRole('dialog')

    await userEvent.click(within(dialog).getByLabelText('Trưởng bộ môn'))
    await userEvent.click(within(dialog).getByLabelText('Giáo vụ'))
    await userEvent.type(within(dialog).getByRole('textbox'), 'Bổ nhiệm giáo vụ')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu chức vụ' }))

    await waitFor(() =>
      expect(departmentsApi.updatePositions).toHaveBeenCalledWith(
        'dept-1',
        'user-9',
        ['pos-b'],
        'Bổ nhiệm giáo vụ',
      ),
    )
    await waitFor(() => expect(departmentsApi.memberDetail).toHaveBeenCalledTimes(2))
  })

  it('không cho bỏ hết chức vụ', async () => {
    signInAs({ permissions: [PERM.employeeAssignPosition] })

    renderDrawer()
    expect(await screen.findByText('Giáo viên A')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Đổi chức vụ' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByLabelText('Trưởng bộ môn'))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu chức vụ' }))

    expect(
      await within(dialog).findByText('Nhân sự cần giữ ít nhất một chức vụ.'),
    ).toBeInTheDocument()
    expect(departmentsApi.updatePositions).not.toHaveBeenCalled()
  })

  it('ẩn nút đổi chức vụ khi thiếu quyền phân công', async () => {
    signInAs({ roles: ['STAFF'], role: 'STAFF', permissions: [] })

    renderDrawer()
    expect(await screen.findByText('Giáo viên A')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Đổi chức vụ' })).not.toBeInTheDocument()
  })

  it('hiển thị mật khẩu tạm sau khi đặt lại mật khẩu nhân sự', async () => {
    signInAs({ permissions: [PERM.employeeResetPassword] })
    vi.mocked(departmentsApi.resetPassword).mockResolvedValue({
      temporaryPassword: 'Temp@98765',
    })

    renderDrawer()
    expect(await screen.findByText('Giáo viên A')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }))
    const confirm = await screen.findByRole('dialog')
    await userEvent.click(within(confirm).getByRole('button', { name: 'Đặt lại mật khẩu' }))

    expect(
      await screen.findByRole('heading', { name: 'Thông tin đăng nhập được tạo' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Temp@98765')).toBeInTheDocument()
    expect(departmentsApi.resetPassword).toHaveBeenCalledWith('dept-1', 'user-9')
  })
})
