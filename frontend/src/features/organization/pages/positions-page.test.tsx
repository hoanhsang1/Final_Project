import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { departmentsApi, positionsApi } from '@/features/organization/api'
import type * as OrganizationApi from '@/features/organization/api'
import { PositionsPage } from '@/features/organization/pages/positions-page'
import type { Department, Position } from '@/features/organization/types'
import { ApiError } from '@/lib/api-error'
import { PERM } from '@/lib/permissions'
import { renderPage, signInAs } from '@/tests/render-page'
import { permissionsApi } from '@/features/workflows/api'
import type * as WorkflowsApi from '@/features/workflows/api'

vi.mock('@/features/organization/api', async (importOriginal) => {
  const actual = await importOriginal<typeof OrganizationApi>()
  return {
    ...actual,
    departmentsApi: {
      ...actual.departmentsApi,
      list: vi.fn(),
      availablePermissions: vi.fn(),
      moduleImpact: vi.fn(),
    },
    positionsApi: {
      ...actual.positionsApi,
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      impact: vi.fn(),
      clone: vi.fn(),
    },
  }
})

vi.mock('@/features/workflows/api', async (importOriginal) => {
  const actual = await importOriginal<typeof WorkflowsApi>()
  return {
    ...actual,
    permissionsApi: {
      ...actual.permissionsApi,
      catalog: vi.fn(),
      bundles: vi.fn(),
    },
  }
})

const department: Department = {
  id: 'dept-1',
  name: 'Tổ Toán – Tin',
  description: null,
  createdAt: '2026-01-01T00:00:00Z',
  modules: ['STUDENT_MANAGEMENT'],
}

const position: Position = {
  id: 'pos-1',
  name: 'Trưởng bộ môn',
  description: 'Phụ trách chuyên môn',
  createdAt: '2026-01-02T00:00:00Z',
  permissions: ['employee.view'],
  profileType: 'TEACHER',
  bundleCodes: ['HR_MANAGEMENT'],
  scope: 'DEPARTMENT',
  departmentId: 'dept-1',
}

const catalog = [
  {
    code: 'employee.view',
    description: 'Xem nhân sự',
    moduleCode: 'TEACHER_MANAGEMENT',
    allowedScopes: ['DEPARTMENT'],
  },
  {
    code: 'employee.create',
    description: 'Tạo nhân sự',
    moduleCode: 'TEACHER_MANAGEMENT',
    allowedScopes: ['DEPARTMENT'],
  },
]

const bundles = [
  {
    code: 'HR_MANAGEMENT',
    name: 'Quản lý nhân sự',
    description: 'Bộ quyền nhân sự',
    permissions: ['employee.view', 'employee.create'],
    allowedScopes: ['DEPARTMENT'],
  },
]

beforeEach(() => {
  vi.mocked(departmentsApi.list).mockResolvedValue([department])
  vi.mocked(departmentsApi.availablePermissions).mockResolvedValue([catalog[0]])
  vi.mocked(positionsApi.list).mockResolvedValue([position])
  vi.mocked(permissionsApi.catalog).mockResolvedValue(catalog)
  vi.mocked(permissionsApi.bundles).mockResolvedValue(bundles)
  vi.mocked(positionsApi.create).mockReset()
  signInAs({ permissions: [PERM.positionManage] })
})

describe('PositionsPage — CRUD chức danh và gói quyền', () => {
  it('hiển thị chức danh kèm gói quyền và số quyền trực tiếp', async () => {
    renderPage(<PositionsPage />)

    expect(await screen.findByText('Trưởng bộ môn')).toBeInTheDocument()
    expect(screen.getByText('Phụ trách chuyên môn')).toBeInTheDocument()
    expect(screen.getByText('HR_MANAGEMENT')).toBeInTheDocument()
    expect(screen.getByText('Tổ Toán – Tin')).toBeInTheDocument()
  })

  it('ẩn thao tác quản lý khi thiếu quyền position.manage', async () => {
    signInAs({ roles: ['STAFF'], role: 'STAFF', permissions: [] })
    renderPage(<PositionsPage />)

    await screen.findByText('Trưởng bộ môn')
    expect(screen.queryByRole('button', { name: 'Tạo chức danh' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sửa' })).not.toBeInTheDocument()
    // Nút chỉ-đọc vẫn hiển thị cho người có quyền xem.
    expect(screen.getByRole('button', { name: 'Ảnh hưởng' })).toBeInTheDocument()
  })

  it('tạo chức danh phòng ban: lọc quyền theo module đang bật và refetch danh sách', async () => {
    vi.mocked(positionsApi.create).mockResolvedValue({ ...position, id: 'pos-2', name: 'Tổ phó' })

    renderPage(<PositionsPage />)
    await screen.findByText('Trưởng bộ môn')

    await userEvent.click(screen.getByRole('button', { name: 'Tạo chức danh' }))
    const dialog = await screen.findByRole('dialog')

    await userEvent.type(within(dialog).getAllByRole('textbox')[0], 'Tổ phó')
    const selects = within(dialog).getAllByRole('combobox')
    await userEvent.selectOptions(selects[1], 'dept-1')

    await waitFor(() =>
      expect(departmentsApi.availablePermissions).toHaveBeenCalledWith('dept-1'),
    )

    // Chỉ quyền thuộc module đang bật của phòng ban được hiển thị.
    expect(await within(dialog).findByText('employee.view')).toBeInTheDocument()
    expect(within(dialog).queryByText('employee.create')).not.toBeInTheDocument()

    await userEvent.click(within(dialog).getByLabelText('Quản lý nhân sự'))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo chức danh' }))

    await waitFor(() =>
      expect(positionsApi.create).toHaveBeenCalledWith({
        name: 'Tổ phó',
        description: undefined,
        permissions: [],
        bundleCodes: ['HR_MANAGEMENT'],
        scope: 'DEPARTMENT',
        departmentId: 'dept-1',
      }),
    )
    await waitFor(() => expect(positionsApi.list).toHaveBeenCalledTimes(2))
  })

  it('hiển thị lỗi backend khi tạo chức danh thất bại', async () => {
    vi.mocked(positionsApi.create).mockRejectedValue(
      // ApiError.from giữ nguyên instance đã dịch — mô phỏng lỗi axios đã qua translateError.
      new ApiError({ status: 403, message: 'Bạn không có quyền thực hiện thao tác này.' }),
    )

    renderPage(<PositionsPage />)
    await screen.findByText('Trưởng bộ môn')

    await userEvent.click(screen.getByRole('button', { name: 'Tạo chức danh' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getAllByRole('textbox')[0], 'Tổ phó')
    await userEvent.selectOptions(within(dialog).getAllByRole('combobox')[1], 'dept-1')
    await userEvent.click(within(dialog).getByLabelText('Quản lý nhân sự'))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo chức danh' }))

    expect(
      await screen.findByText('Bạn không có quyền thực hiện thao tác này.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Tạo chức danh' })).toBeInTheDocument()
  })

  it('chặn submit khi chưa chọn quyền hoặc gói quyền', async () => {
    renderPage(<PositionsPage />)
    await screen.findByText('Trưởng bộ môn')

    await userEvent.click(screen.getByRole('button', { name: 'Tạo chức danh' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getAllByRole('textbox')[0], 'Tổ phó')
    const selects = within(dialog).getAllByRole('combobox')
    await userEvent.selectOptions(selects[1], 'dept-1')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo chức danh' }))

    expect(
      await within(dialog).findByText('Chọn ít nhất một quyền hoặc một gói quyền.'),
    ).toBeInTheDocument()
    expect(positionsApi.create).not.toHaveBeenCalled()
  })
})
