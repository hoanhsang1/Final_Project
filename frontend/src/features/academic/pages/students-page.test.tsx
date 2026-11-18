import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { classesApi, studentsApi } from '@/features/academic/api'
import type * as AcademicApi from '@/features/academic/api'
import { StudentsPage } from '@/features/academic/pages/students-page'
import type { SchoolClass, Student } from '@/features/academic/types'
import { ApiError } from '@/lib/api-error'
import { PERM } from '@/lib/permissions'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/academic/api', async (importOriginal) => {
  const actual = await importOriginal<typeof AcademicApi>()
  return {
    ...actual,
    studentsApi: {
      ...actual.studentsApi,
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      createAccount: vi.fn(),
    },
    classesApi: { ...actual.classesApi, list: vi.fn() },
  }
})

const student: Student = {
  id: 'stu-1',
  orgId: 'org-1',
  studentCode: 'SV001',
  fullName: 'Sinh viên A',
  dateOfBirth: '2006-05-01',
  email: 'sv.a@example.test',
  phone: null,
  status: 'active',
  classId: 'class-1',
  classCode: '10A1',
  className: 'Lớp 10A1',
  createdBy: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
  accountUsername: null,
  accountCreatedAt: null,
}

const classSummary: SchoolClass = {
  id: 'class-1',
  orgId: 'org-1',
  classCode: '10A1',
  name: 'Lớp 10A1',
  academicYear: '2025-2026',
  startDate: null,
  endDate: null,
  status: 'ACTIVE',
  teacher: null,
  closeState: null,
  version: 1,
  studentCount: 30,
  createdBy: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
  cancelReason: null,
  closeRequestNote: null,
  closeRejectReason: null,
  needsReassignment: false,
  reassignmentReason: null,
  subjectId: null,
  subjectName: null,
  cancelState: null,
  cancelRequestReason: null,
}

beforeEach(() => {
  vi.mocked(studentsApi.list).mockResolvedValue({
    items: [student],
    total: 1,
    page: 1,
    size: 20,
  })
  vi.mocked(classesApi.list).mockResolvedValue({
    items: [classSummary],
    total: 1,
    page: 1,
    size: 100,
  })
  vi.mocked(studentsApi.create).mockReset()
  vi.mocked(studentsApi.createAccount).mockReset()
  signInAs({ permissions: [PERM.studentView, PERM.studentCreate, PERM.studentCreateAccount] })
})

describe('StudentsPage — hồ sơ và cấp tài khoản', () => {
  it('hiển thị danh sách sinh viên kèm lớp và trạng thái', async () => {
    renderPage(<StudentsPage />)

    expect(await screen.findByText('Sinh viên A')).toBeInTheDocument()
    expect(screen.getByText(/SV001/)).toBeInTheDocument()
    expect(screen.getByText('10A1')).toBeInTheDocument()
    expect(screen.getByText('Đang học')).toBeInTheDocument()
  })

  it('tạo sinh viên và refetch danh sách', async () => {
    vi.mocked(studentsApi.create).mockResolvedValue({ ...student, id: 'stu-2', fullName: 'Sinh viên B' })

    renderPage(<StudentsPage />)
    await screen.findByText('Sinh viên A')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm sinh viên' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getAllByRole('textbox')[0], 'Sinh viên B')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo sinh viên' }))

    await waitFor(() =>
      expect(studentsApi.create).toHaveBeenCalledWith({
        studentCode: undefined,
        fullName: 'Sinh viên B',
        dateOfBirth: undefined,
        email: undefined,
        phone: undefined,
        status: 'active',
      }),
    )
    await waitFor(() => expect(studentsApi.list).toHaveBeenCalledTimes(2))
  })

  it('chặn tạo khi thiếu họ tên', async () => {
    renderPage(<StudentsPage />)
    await screen.findByText('Sinh viên A')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm sinh viên' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo sinh viên' }))

    expect(await within(dialog).findByText('Vui lòng nhập họ tên sinh viên.')).toBeInTheDocument()
    expect(studentsApi.create).not.toHaveBeenCalled()
  })

  it('hiển thị lỗi API khi tạo sinh viên thất bại', async () => {
    signInAs({
      permissions: [PERM.studentView, PERM.studentCreate],
    })
    vi.mocked(studentsApi.create).mockRejectedValue(
      new ApiError({ status: 400, message: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các trường được đánh dấu.' }),
    )

    renderPage(<StudentsPage />)
    await screen.findByText('Sinh viên A')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm sinh viên' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getAllByRole('textbox')[0], 'Sinh viên B')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo sinh viên' }))

    expect(
      await within(dialog).findByText(
        'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các trường được đánh dấu.',
      ),
    ).toBeInTheDocument()
  })

  it('cấp tài khoản sinh viên và hiển thị mật khẩu tạm', async () => {
    vi.mocked(studentsApi.createAccount).mockResolvedValue({
      studentId: 'stu-1',
      username: 'sv.a',
      temporaryPassword: 'Temp@12345',
    })

    renderPage(<StudentsPage />)
    await screen.findByText('Sinh viên A')

    await userEvent.click(screen.getByRole('button', { name: 'Cấp tài khoản' }))

    expect(
      await screen.findByRole('heading', { name: 'Tài khoản sinh viên đã được tạo' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Tên đăng nhập: sv.a')).toBeInTheDocument()
    expect(screen.getByText('Mật khẩu tạm: Temp@12345')).toBeInTheDocument()
    expect(studentsApi.createAccount).toHaveBeenCalledWith('stu-1')
  })

  it('ẩn thao tác khi không có quyền sinh viên', async () => {
    signInAs({ roles: ['STAFF'], role: 'STAFF', permissions: [] })

    renderPage(<StudentsPage />)
    await screen.findByText('Sinh viên A')
    expect(screen.queryByRole('button', { name: 'Thêm sinh viên' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cấp tài khoản' })).not.toBeInTheDocument()
  })
})
