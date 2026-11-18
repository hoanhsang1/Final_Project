import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { classesApi, teachersApi } from '@/features/academic/api'
import type * as AcademicApi from '@/features/academic/api'
import type { SchoolClass } from '@/features/academic/types'
import { departmentsApi } from '@/features/organization/api'
import type * as OrganizationApi from '@/features/organization/api'
import type { Department } from '@/features/organization/types'
import { schedulesApi } from '@/features/schedule/api'
import type * as ScheduleApi from '@/features/schedule/api'
import { SchedulePage } from '@/features/schedule/pages/schedule-page'
import type { ScheduleSession } from '@/features/schedule/types'
import { ApiError } from '@/lib/api-error'
import { PERM } from '@/lib/permissions'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/schedule/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ScheduleApi>()
  return {
    ...actual,
    schedulesApi: {
      ...actual.schedulesApi,
      list: vi.fn(),
      mine: vi.fn(),
      roomSuggestions: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn(),
      remove: vi.fn(),
    },
  }
})

vi.mock('@/features/organization/api', async (importOriginal) => {
  const actual = await importOriginal<typeof OrganizationApi>()
  return {
    ...actual,
    departmentsApi: { ...actual.departmentsApi, list: vi.fn() },
  }
})

vi.mock('@/features/academic/api', async (importOriginal) => {
  const actual = await importOriginal<typeof AcademicApi>()
  return {
    ...actual,
    classesApi: { ...actual.classesApi, list: vi.fn() },
    teachersApi: { ...actual.teachersApi, assignable: vi.fn() },
  }
})

const department: Department = {
  id: 'dept-1',
  name: 'Tổ Toán – Tin',
  description: null,
  createdAt: '2026-01-01T00:00:00Z',
  modules: ['SCHEDULE_MANAGEMENT'],
}

const classSummary: SchoolClass = {
  id: 'class-1',
  orgId: 'org-1',
  classCode: '10A1',
  name: 'Lớp 10A1',
  academicYear: '2025-2026',
  startDate: null,
  endDate: null,
  status: 'active',
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

const session: ScheduleSession = {
  id: 'ses-1',
  classId: 'class-1',
  className: 'Lớp 10A1',
  teacherId: null,
  roomId: null,
  startTime: '2026-03-02T01:00:00Z',
  endTime: '2026-03-02T03:00:00Z',
  status: 'scheduled',
  departmentId: 'dept-1',
}

beforeEach(() => {
  vi.mocked(departmentsApi.list).mockResolvedValue([department])
  vi.mocked(classesApi.list).mockResolvedValue({
    items: [classSummary],
    total: 1,
    page: 1,
    size: 100,
  })
  vi.mocked(teachersApi.assignable).mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    size: 20,
  })
  vi.mocked(schedulesApi.list).mockResolvedValue([session])
  vi.mocked(schedulesApi.mine).mockResolvedValue([])
  vi.mocked(schedulesApi.roomSuggestions).mockResolvedValue([])
  vi.mocked(schedulesApi.create).mockReset()
  vi.mocked(schedulesApi.cancel).mockReset()
  signInAs({
    permissions: [
      PERM.scheduleView,
      PERM.scheduleCreate,
      PERM.scheduleCancelSession,
      PERM.scheduleDelete,
    ],
  })
})

describe('SchedulePage — lịch học', () => {
  it('hiển thị buổi học của phòng ban đang chọn', async () => {
    renderPage(<SchedulePage />)

    expect(await screen.findByText('10A1 · Lớp 10A1')).toBeInTheDocument()
    expect(screen.getByText('Chưa có phòng')).toBeInTheDocument()
    await waitFor(() => expect(schedulesApi.list).toHaveBeenCalled())
  })

  it('kiểm tra lớp bắt buộc trước khi xếp buổi học', async () => {
    renderPage(<SchedulePage />)
    await screen.findByText('10A1 · Lớp 10A1')

    await userEvent.click(screen.getByRole('button', { name: 'Xếp buổi học' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xếp lịch' }))

    expect(await within(dialog).findByText('Vui lòng chọn lớp học.')).toBeInTheDocument()
    expect(schedulesApi.create).not.toHaveBeenCalled()
  })

  it('huỷ buổi học và refetch lịch', async () => {
    vi.mocked(schedulesApi.cancel).mockResolvedValue({ ...session, status: 'cancelled' })

    renderPage(<SchedulePage />)
    await screen.findByText('10A1 · Lớp 10A1')

    await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Huỷ buổi' }))

    await waitFor(() => expect(schedulesApi.cancel).toHaveBeenCalledWith('dept-1', 'ses-1'))
    await waitFor(() => expect(schedulesApi.list).toHaveBeenCalledTimes(2))
  })

  it('báo lỗi khi tải lịch thất bại', async () => {
    vi.mocked(schedulesApi.list).mockRejectedValue(
      new ApiError({ status: 403, message: 'Bạn không có quyền xem lịch của phòng ban này.' }),
    )

    renderPage(<SchedulePage />)

    expect(
      await screen.findByText('Bạn không có quyền xem lịch của phòng ban này.', {}, { timeout: 3000 }),
    ).toBeInTheDocument()
  })

  it('ẩn thao tác khi thiếu quyền lịch học', async () => {
    signInAs({ roles: ['STAFF'], role: 'STAFF', permissions: [] })

    renderPage(<SchedulePage />)
    await screen.findByText('10A1 · Lớp 10A1')
    expect(screen.queryByRole('button', { name: 'Xếp buổi học' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sửa' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Huỷ' })).not.toBeInTheDocument()
  })
})
