import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  subjectCategoriesApi,
  subjectsApi,
  teacherSubjectsApi,
  teachersApi,
} from '@/features/academic/api'
import type * as AcademicApi from '@/features/academic/api'
import { TeachersPage } from '@/features/academic/pages/teachers-page'
import type { Subject, TeacherDetail, TeacherItem } from '@/features/academic/types'
import type * as OrgApi from '@/features/organization/api'
import { departmentsApi, positionsApi, specialtiesApi } from '@/features/organization/api'
import { ApiError } from '@/lib/api-error'
import { PERM } from '@/lib/permissions'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/academic/api', async (importOriginal) => {
  const actual = await importOriginal<typeof AcademicApi>()
  return {
    ...actual,
    teachersApi: {
      ...actual.teachersApi,
      list: vi.fn(),
      byId: vi.fn(),
      update: vi.fn(),
      changeStatus: vi.fn(),
    },
    teacherSubjectsApi: {
      ...actual.teacherSubjectsApi,
      teachable: vi.fn(),
      replaceExceptions: vi.fn(),
    },
    subjectsApi: { ...actual.subjectsApi, list: vi.fn() },
    subjectCategoriesApi: { ...actual.subjectCategoriesApi, list: vi.fn() },
  }
})

vi.mock('@/features/organization/api', async (importOriginal) => {
  const actual = await importOriginal<typeof OrgApi>()
  return {
    ...actual,
    departmentsApi: { ...actual.departmentsApi, list: vi.fn() },
    specialtiesApi: {
      ...actual.specialtiesApi,
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    positionsApi: { ...actual.positionsApi, list: vi.fn() },
  }
})

const teacher: TeacherItem = {
  userId: 'teacher-1',
  staffCode: 'GV001',
  fullName: 'Giáo viên A',
  email: 'gv.a@example.test',
  phone: null,
  departmentId: 'dept-1',
  specialties: [{ id: 'spec-1', name: 'Toán' }],
  contractType: 'CO_HUU',
  teachingStatus: 'DANG_DAY',
  classCount: 2,
  noClass: false,
  classLabel: null,
}

beforeAll(() => {
  // Radix Select dùng Pointer Capture — jsdom chưa hỗ trợ.
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.setPointerCapture ??= () => undefined
})

beforeEach(() => {
  vi.mocked(teachersApi.list).mockResolvedValue({
    items: [teacher],
    total: 1,
    page: 1,
    size: 20,
  })
  vi.mocked(teachersApi.update).mockReset()
  vi.mocked(teachersApi.changeStatus).mockResolvedValue({
    ...teacher,
    teachingStatus: 'NGHI_VIEC',
    positionIds: [],
    classes: [],
    version: 2,
    createdAt: null,
    updatedAt: null,
    history: [],
  })
  vi.mocked(departmentsApi.list).mockResolvedValue([])
  vi.mocked(specialtiesApi.list).mockResolvedValue([{ id: 'spec-1', name: 'Toán' }])
  vi.mocked(specialtiesApi.create).mockReset()
  vi.mocked(specialtiesApi.update).mockReset()
  vi.mocked(positionsApi.list).mockResolvedValue([])
  vi.mocked(teacherSubjectsApi.teachable).mockResolvedValue([])
  vi.mocked(teacherSubjectsApi.replaceExceptions).mockReset()
  vi.mocked(subjectsApi.list).mockResolvedValue([])
  vi.mocked(subjectCategoriesApi.list).mockResolvedValue([])
})

describe('TeachersPage — đổi trạng thái giảng dạy', () => {
  it('hiện nút đổi trạng thái khi có teacher.change_status', async () => {
    signInAs({
      roles: ['STAFF'],
      role: 'STAFF',
      permissions: [PERM.employeeView, PERM.teacherChangeStatus],
    })

    renderPage(<TeachersPage />)
    await screen.findByText('Giáo viên A')

    expect(screen.getByRole('button', { name: 'Trạng thái' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sửa' })).not.toBeInTheDocument()
  })

  it('ẩn nút đổi trạng thái khi chỉ có quyền xem giáo viên', async () => {
    signInAs({ roles: ['STAFF'], role: 'STAFF', permissions: [PERM.employeeView] })

    renderPage(<TeachersPage />)
    await screen.findByText('Giáo viên A')

    expect(screen.queryByRole('button', { name: 'Trạng thái' })).not.toBeInTheDocument()
  })

  it('gửi trạng thái đã chọn và refetch danh sách', async () => {
    signInAs({
      roles: ['STAFF'],
      role: 'STAFF',
      permissions: [PERM.employeeView, PERM.teacherChangeStatus],
    })

    renderPage(<TeachersPage />)
    await screen.findByText('Giáo viên A')

    await userEvent.click(screen.getByRole('button', { name: 'Trạng thái' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: 'Nghỉ việc' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu trạng thái' }))

    await waitFor(() =>
      expect(teachersApi.changeStatus).toHaveBeenCalledWith('teacher-1', 'NGHI_VIEC'),
    )
    await waitFor(() => expect(teachersApi.list).toHaveBeenCalledTimes(2))
  })
})

describe('TeachersPage — xung đột chuyên môn với lớp đang dạy', () => {
  it('409 SPECIALTY_MISMATCH: hiện các lớp bị lệch và gửi lại với confirm=true', async () => {
    const detail: TeacherDetail = {
      ...teacher,
      positionIds: [],
      classes: [],
      version: 3,
      createdAt: null,
      updatedAt: null,
      history: [],
    }
    vi.mocked(teachersApi.byId).mockResolvedValue(detail)
    vi.mocked(teachersApi.update)
      .mockRejectedValueOnce(
        new ApiError({
          message: 'Chuyên môn không khớp môn học của lớp đang phụ trách.',
          status: 409,
          code: 'SPECIALTY_MISMATCH',
          details: { classes: [{ id: 'class-1', name: 'Lớp 10A' }] },
        }),
      )
      .mockResolvedValueOnce(detail)
    signInAs({
      roles: ['STAFF'],
      role: 'STAFF',
      permissions: [PERM.employeeView, PERM.employeeEdit],
    })

    renderPage(<TeachersPage />)
    await screen.findByText('Giáo viên A')
    await userEvent.click(screen.getByRole('button', { name: 'Sửa' }))

    const dialog = await screen.findByRole('dialog')
    await screen.findByDisplayValue('Giáo viên A')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }))

    expect(await within(dialog).findByText('Lớp 10A')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Vẫn lưu' }))

    await waitFor(() => expect(teachersApi.update).toHaveBeenCalledTimes(2))
    expect(vi.mocked(teachersApi.update).mock.calls[1][1]).toMatchObject({ confirm: true })
  })
})

describe('TeachersPage — môn dạy được (quy tắc D1)', () => {
  const detail: TeacherDetail = {
    ...teacher,
    positionIds: [],
    classes: [],
    version: 3,
    createdAt: null,
    updatedAt: null,
    history: [],
  }

  const subjectOf = (id: string, name: string): Subject => ({
    id,
    code: null,
    name,
    description: null,
    active: true,
    createdAt: null,
    updatedAt: null,
  })

  it('hiển thị lý do và cho lưu ngoại lệ ngoài danh mục chuyên môn', async () => {
    vi.mocked(teachersApi.byId).mockResolvedValue(detail)
    vi.mocked(teacherSubjectsApi.teachable).mockResolvedValue([
      { subjectId: 'sub-java', subjectCode: 'JAVA', subjectName: 'Lập trình Java', reason: 'CATEGORY' },
      { subjectId: 'sub-eng', subjectCode: 'ENG', subjectName: 'Tiếng Anh', reason: 'EXCEPTION' },
    ])
    vi.mocked(subjectsApi.list).mockResolvedValue([
      subjectOf('sub-java', 'Lập trình Java'),
      subjectOf('sub-eng', 'Tiếng Anh'),
      subjectOf('sub-sql', 'SQL'),
    ])
    vi.mocked(teacherSubjectsApi.replaceExceptions).mockResolvedValue([])
    signInAs({ permissions: [PERM.employeeView, PERM.employeeEdit] })

    renderPage(<TeachersPage />)
    await screen.findByText('Giáo viên A')
    await userEvent.click(screen.getByRole('button', { name: 'Sửa' }))

    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText(/Cùng danh mục chuyên môn/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Ngoại lệ được duyệt/)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Chỉnh ngoại lệ' }))

    const javaBox = within(dialog).getByRole('checkbox', { name: /Lập trình Java/ })
    expect(javaBox).toBeChecked()
    expect(javaBox).toBeDisabled()
    expect(within(dialog).getByRole('checkbox', { name: 'Tiếng Anh' })).toBeChecked()

    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'SQL' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu ngoại lệ' }))

    await waitFor(() =>
      expect(teacherSubjectsApi.replaceExceptions).toHaveBeenCalledWith('teacher-1', [
        'sub-eng',
        'sub-sql',
      ]),
    )
  })

  it('chỉ hiện nút quản lý chuyên môn khi có employee.edit', async () => {
    signInAs({ roles: ['STAFF'], role: 'STAFF', permissions: [PERM.employeeView] })
    renderPage(<TeachersPage />)
    await screen.findByText('Giáo viên A')

    expect(screen.queryByRole('button', { name: 'Chuyên môn' })).not.toBeInTheDocument()
  })

  it('tạo chuyên môn kèm danh mục môn học', async () => {
    vi.mocked(specialtiesApi.create).mockResolvedValue({
      id: 'spec-2',
      name: 'Lập trình Web',
      categoryId: 'cat-prog',
    })
    vi.mocked(subjectCategoriesApi.list).mockResolvedValue([
      { id: 'cat-prog', name: 'Lập trình', active: true, subjectCount: 1, createdAt: null, updatedAt: null },
    ])
    signInAs({ roles: ['STAFF'], role: 'STAFF', permissions: [PERM.employeeView, PERM.employeeEdit] })

    renderPage(<TeachersPage />)
    await screen.findByText('Giáo viên A')
    await userEvent.click(screen.getByRole('button', { name: 'Chuyên môn' }))

    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getAllByRole('textbox')[0]!, 'Lập trình Web')
    await userEvent.click(within(dialog).getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: 'Lập trình' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thêm' }))

    await waitFor(() =>
      expect(specialtiesApi.create).toHaveBeenCalledWith({
        name: 'Lập trình Web',
        categoryId: 'cat-prog',
      }),
    )
  })
})
