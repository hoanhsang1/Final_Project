import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { classesApi, teachersApi } from '@/features/academic/api'
import type * as AcademicApi from '@/features/academic/api'
import { MyClassesPage } from '@/features/academic/pages/my-classes-page'
import type { SchoolClass, Student, TeacherDetail } from '@/features/academic/types'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/academic/api', async (importOriginal) => {
  const actual = await importOriginal<typeof AcademicApi>()
  return {
    ...actual,
    classesApi: { ...actual.classesApi, mine: vi.fn(), myStudents: vi.fn() },
    teachersApi: { ...actual.teachersApi, me: vi.fn() },
  }
})

const schoolClass: SchoolClass = {
  id: 'class-1',
  orgId: 'org-1',
  classCode: 'LH-10A1',
  name: 'Lớp 10A1',
  academicYear: '2026-2027',
  startDate: null,
  endDate: null,
  status: 'DANG_HOC',
  teacher: { id: 'user-teacher', code: 'GV001', fullName: 'Trần Quốc Bảo' },
  closeState: 'NONE',
  version: 1,
  studentCount: 32,
  createdBy: null,
  createdAt: null,
  updatedAt: null,
  cancelReason: null,
  closeRequestNote: null,
  closeRejectReason: null,
  needsReassignment: false,
  reassignmentReason: null,
  subjectId: null,
  subjectName: 'Toán',
  cancelState: null,
  cancelRequestReason: null,
}

const students: Student[] = [
  {
    id: 'stu-1',
    orgId: 'org-1',
    studentCode: 'SV001',
    fullName: 'Nguyễn Văn An',
    dateOfBirth: null,
    email: null,
    phone: null,
    status: 'DANG_DIEN_RA',
    classId: 'class-1',
    classCode: 'LH-10A1',
    className: 'Lớp 10A1',
    createdBy: null,
    createdAt: null,
    updatedAt: null,
    accountUsername: null,
    accountCreatedAt: null,
  },
]

const teacher: TeacherDetail = {
  userId: 'user-teacher',
  staffCode: 'GV001',
  fullName: 'Trần Quốc Bảo',
  email: null,
  phone: null,
  departmentId: 'dept-1',
  specialties: [],
  contractType: 'CO_HUU',
  teachingStatus: 'DANG_DAY',
  classCount: 1,
  noClass: false,
  classLabel: 'Lớp 10A1',
  positionIds: [],
  classes: [],
  version: 1,
  createdAt: null,
  updatedAt: null,
  history: [],
}

beforeEach(() => {
  vi.mocked(teachersApi.me).mockResolvedValue(teacher)
  vi.mocked(classesApi.mine).mockResolvedValue({
    items: [schoolClass],
    total: 1,
    page: 1,
    size: 50,
  })
  vi.mocked(classesApi.myStudents).mockResolvedValue(students)
  signInAs({ user: { departmentId: 'dept-1' } })
})

describe('MyClassesPage — lớp của giáo viên', () => {
  it('chỉ hiển thị lớp được phân công cho chính giáo viên', async () => {
    renderPage(<MyClassesPage />)

    expect(await screen.findByText('LH-10A1 · Lớp 10A1')).toBeInTheDocument()
    expect(screen.getByText('32 sinh viên')).toBeInTheDocument()
    expect(screen.getByText(/Mã GV GV001/)).toBeInTheDocument()
    expect(classesApi.mine).toHaveBeenCalledTimes(1)
  })

  it('mở hộp thoại và tải sinh viên của lớp đang chọn', async () => {
    renderPage(<MyClassesPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Xem sinh viên' }))

    await waitFor(() => expect(classesApi.myStudents).toHaveBeenCalledWith('class-1'))
    expect(await screen.findByText('Nguyễn Văn An')).toBeInTheDocument()
    expect(screen.getByText('SV001')).toBeInTheDocument()
  })

  it('báo trống khi giáo viên chưa được phân công lớp', async () => {
    vi.mocked(classesApi.mine).mockResolvedValue({ items: [], total: 0, page: 1, size: 50 })

    renderPage(<MyClassesPage />)

    expect(await screen.findByText('Bạn chưa được phân công lớp')).toBeInTheDocument()
  })
})
