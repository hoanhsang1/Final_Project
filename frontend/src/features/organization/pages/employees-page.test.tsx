import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { departmentsApi, positionsApi, specialtiesApi } from '@/features/organization/api'
import type * as OrganizationApi from '@/features/organization/api'
import { EmployeesPage } from '@/features/organization/pages/employees-page'
import type {
  Department,
  Member,
  MemberDetail,
  Position,
  Specialty,
} from '@/features/organization/types'
import { ApiError } from '@/lib/api-error'
import { PERM } from '@/lib/permissions'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/organization/api', async (importOriginal) => {
  const actual = await importOriginal<typeof OrganizationApi>()
  return {
    ...actual,
    departmentsApi: {
      ...actual.departmentsApi,
      list: vi.fn(),
      members: vi.fn(),
      memberDetail: vi.fn(),
      createMember: vi.fn(),
    },
    positionsApi: { ...actual.positionsApi, list: vi.fn() },
    specialtiesApi: { ...actual.specialtiesApi, list: vi.fn() },
  }
})

const department: Department = {
  id: 'dept-1',
  name: 'Tổ Toán – Tin',
  description: null,
  createdAt: '2026-01-01T00:00:00Z',
  modules: ['STUDENT_MANAGEMENT'],
}

const staffPosition: Position = {
  id: 'pos-1',
  name: 'Nhân viên văn phòng',
  description: null,
  createdAt: '2026-01-01T00:00:00Z',
  permissions: ['employee.view'],
  profileType: 'STAFF',
  bundleCodes: [],
  scope: 'DEPARTMENT',
  departmentId: 'dept-1',
}

const teacherPosition: Position = {
  id: 'pos-2',
  name: 'Giáo viên bộ môn',
  description: null,
  createdAt: '2026-01-01T00:00:00Z',
  permissions: ['student.view'],
  profileType: 'TEACHER',
  bundleCodes: [],
  scope: 'DEPARTMENT',
  departmentId: 'dept-1',
}

const specialty: Specialty = { id: 'spec-1', name: 'Toán' }

const member: Member = {
  userId: 'user-1',
  username: 'nva',
  departmentId: 'dept-1',
  role: 'STAFF',
  status: 'ACTIVE',
  appointedBy: null,
  appointedAt: '2026-01-01T00:00:00Z',
  positionIds: ['pos-1'],
  permissions: ['employee.view'],
}

const memberDetail: MemberDetail = {
  ...member,
  departmentName: department.name,
  fullName: 'Nguyễn Văn A',
  email: 'nva@example.test',
  phone: null,
  staffCode: 'NV001',
  teacher: false,
  contractType: null,
  teachingStatus: null,
  classCount: 0,
  classLabel: null,
  assignmentHistory: [],
}

function openCreateDrawer() {
  return userEvent
    .click(screen.getByRole('button', { name: 'Thêm nhân sự' }))
    .then(() => screen.findByRole('dialog'))
}

beforeEach(() => {
  vi.mocked(departmentsApi.list).mockResolvedValue([department])
  vi.mocked(departmentsApi.members).mockResolvedValue([member])
  vi.mocked(departmentsApi.memberDetail).mockResolvedValue(memberDetail)
  vi.mocked(positionsApi.list).mockResolvedValue([staffPosition, teacherPosition])
  vi.mocked(specialtiesApi.list).mockResolvedValue([specialty])
  vi.mocked(departmentsApi.createMember).mockReset()
  signInAs({ permissions: [PERM.employeeView, PERM.employeeCreate] })
})

describe('EmployeesPage — danh bạ và tạo nhân sự', () => {
  it('hiển thị nhân sự kèm phòng ban, mã NV và chức vụ', async () => {
    renderPage(<EmployeesPage />)

    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument()
    expect(screen.getByText('@nva')).toBeInTheDocument()
    expect(screen.getByText('NV001')).toBeInTheDocument()
    expect(screen.getAllByText('Tổ Toán – Tin').length).toBeGreaterThan(0)
    expect(screen.getByText('Nhân viên văn phòng')).toBeInTheDocument()
  })

  it('tạo nhân sự STAFF và hiển thị mật khẩu tạm backend trả', async () => {
    vi.mocked(departmentsApi.createMember).mockResolvedValue({
      member,
      temporaryPassword: 'Temp@11111',
      mustChangePassword: true,
    })

    renderPage(<EmployeesPage />)
    await screen.findByText('Nguyễn Văn A')

    const dialog = await openCreateDrawer()
    await userEvent.type(within(dialog).getByLabelText(/Tên đăng nhập/), 'ntb')
    await userEvent.type(within(dialog).getByLabelText(/Email/), 'ntb@example.test')
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Nhân viên văn phòng' }),
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo nhân sự' }))

    await waitFor(() =>
      expect(departmentsApi.createMember).toHaveBeenCalledWith({
        departmentId: 'dept-1',
        username: 'ntb',
        email: 'ntb@example.test',
        role: 'STAFF',
        positionIds: ['pos-1'],
      }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Thông tin đăng nhập được tạo' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Temp@11111')).toBeInTheDocument()
  })

  it('chặn tạo khi thiếu tài khoản, email và chức vụ', async () => {
    renderPage(<EmployeesPage />)
    await screen.findByText('Nguyễn Văn A')

    const dialog = await openCreateDrawer()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo nhân sự' }))

    expect(await within(dialog).findByText('Nhập tên đăng nhập.')).toBeInTheDocument()
    expect(within(dialog).getByText('Nhập email.')).toBeInTheDocument()
    expect(within(dialog).getByText('Chọn ít nhất một chức vụ.')).toBeInTheDocument()
    expect(departmentsApi.createMember).not.toHaveBeenCalled()
  })

  it('chức vụ giáo viên bắt buộc hồ sơ giáo viên và gửi kèm chuyên môn', async () => {
    vi.mocked(departmentsApi.createMember).mockResolvedValue({
      member: { ...member, userId: 'user-2', positionIds: ['pos-2'] },
      temporaryPassword: 'Temp@22222',
      mustChangePassword: true,
    })

    renderPage(<EmployeesPage />)
    await screen.findByText('Nguyễn Văn A')

    const dialog = await openCreateDrawer()
    await userEvent.type(within(dialog).getByLabelText(/Tên đăng nhập/), 'gv.b')
    await userEvent.type(within(dialog).getByLabelText(/Email/), 'gv.b@example.test')
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Giáo viên bộ môn' }))

    expect(await within(dialog).findByText('Hồ sơ giáo viên')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo nhân sự' }))

    expect(await within(dialog).findByText('Giáo viên cần mã nhân viên.')).toBeInTheDocument()
    expect(within(dialog).getByText('Nhập họ tên giáo viên.')).toBeInTheDocument()
    expect(within(dialog).getByText('Nhập số điện thoại.')).toBeInTheDocument()
    expect(within(dialog).getByText('Chọn ít nhất một chuyên môn.')).toBeInTheDocument()
    expect(departmentsApi.createMember).not.toHaveBeenCalled()

    await userEvent.type(within(dialog).getByLabelText(/Mã nhân viên/), 'GV010')
    await userEvent.type(within(dialog).getByLabelText(/Họ và tên/), 'Trần Thị B')
    await userEvent.type(within(dialog).getByLabelText(/Số điện thoại/), '0901234567')
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Toán' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo nhân sự' }))

    await waitFor(() =>
      expect(departmentsApi.createMember).toHaveBeenCalledWith({
        departmentId: 'dept-1',
        username: 'gv.b',
        email: 'gv.b@example.test',
        role: 'STAFF',
        positionIds: ['pos-2'],
        staffCode: 'GV010',
        fullName: 'Trần Thị B',
        phone: '0901234567',
        teacherProfile: { specialtyIds: ['spec-1'] },
      }),
    )
  })

  it('hiển thị lỗi backend khi tạo nhân sự thất bại', async () => {
    vi.mocked(departmentsApi.createMember).mockRejectedValue(
      new ApiError({ status: 409, message: 'Tên đăng nhập đã tồn tại.' }),
    )

    renderPage(<EmployeesPage />)
    await screen.findByText('Nguyễn Văn A')

    const dialog = await openCreateDrawer()
    await userEvent.type(within(dialog).getByLabelText(/Tên đăng nhập/), 'nva')
    await userEvent.type(within(dialog).getByLabelText(/Email/), 'nva@example.test')
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Nhân viên văn phòng' }),
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo nhân sự' }))

    expect(await within(dialog).findByText('Không tạo được nhân sự')).toBeInTheDocument()
    expect(within(dialog).getByText('Tên đăng nhập đã tồn tại.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Thông tin đăng nhập được tạo' })).not.toBeInTheDocument()
  })

  it('ẩn nút thêm nhân sự khi không có quyền', async () => {
    signInAs({ roles: ['STAFF'], role: 'STAFF', permissions: [PERM.employeeView] })

    renderPage(<EmployeesPage />)
    await screen.findByText('Nguyễn Văn A')

    expect(screen.queryByRole('button', { name: 'Thêm nhân sự' })).not.toBeInTheDocument()
  })
})
