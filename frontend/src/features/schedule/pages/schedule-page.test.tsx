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
import { addDaysLocal, startOfWeekLocal } from '@/features/schedule/components/week-calendar-utils'
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

const secondDepartment: Department = {
  ...department,
  id: 'dept-2',
  name: 'Tổ Văn – Sử',
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

/** ISO của một buổi trong tuần hiện tại (0 = thứ 2), tính theo giờ địa phương. */
function isoInCurrentWeek(dayOffset: number, hour: number, minute = 0): string {
  const day = addDaysLocal(startOfWeekLocal(new Date()), dayOffset)
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute).toISOString()
}

const session: ScheduleSession = {
  id: 'ses-1',
  classId: 'class-1',
  className: 'Lớp 10A1',
  teacherId: null,
  roomId: null,
  startTime: isoInCurrentWeek(0, 8),
  endTime: isoInCurrentWeek(0, 10),
  status: 'scheduled',
  departmentId: 'dept-1',
}

const secondSession: ScheduleSession = {
  ...session,
  id: 'ses-2',
  classId: 'class-2',
  className: 'Lớp 11B1',
  departmentId: 'dept-2',
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
      PERM.scheduleEdit,
      PERM.scheduleCancelSession,
      PERM.scheduleDelete,
    ],
  })
})

describe('SchedulePage — lịch học', () => {
  it('hiển thị buổi học của phòng ban đang chọn trên lịch tuần', async () => {
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

    await userEvent.click(screen.getByRole('tab', { name: 'Danh sách' }))
    await screen.findByText('10A1 · Lớp 10A1')
    const callsBefore = vi.mocked(schedulesApi.list).mock.calls.length

    await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Huỷ buổi' }))

    await waitFor(() => expect(schedulesApi.cancel).toHaveBeenCalledWith('dept-1', 'ses-1'))
    await waitFor(() =>
      expect(vi.mocked(schedulesApi.list).mock.calls.length).toBeGreaterThan(callsBefore),
    )
  })

  it('báo lỗi khi tải lịch thất bại', async () => {
    vi.mocked(schedulesApi.list).mockRejectedValue(
      new ApiError({ status: 403, message: 'Bạn không có quyền xem lịch của phòng ban này.' }),
    )

    renderPage(<SchedulePage />)

    expect(
      await screen.findByText(
        'Bạn không có quyền xem lịch của phòng ban này.',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
  })

  it('ẩn thao tác khi thiếu quyền lịch học', async () => {
    signInAs({ roles: ['STAFF'], role: 'STAFF', permissions: [] })

    renderPage(<SchedulePage />)
    await screen.findByText('10A1 · Lớp 10A1')
    expect(screen.queryByRole('button', { name: 'Xếp buổi học' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Danh sách' }))
    await screen.findByText('10A1 · Lớp 10A1')
    expect(screen.queryByRole('button', { name: 'Sửa' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Huỷ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Xoá' })).not.toBeInTheDocument()
  })

  it('hiển thị lịch nhiều phòng ban, mỗi phòng ban một màu', async () => {
    vi.mocked(departmentsApi.list).mockResolvedValue([department, secondDepartment])
    vi.mocked(schedulesApi.list).mockImplementation(async (departmentId) =>
      departmentId === 'dept-1' ? [session] : [secondSession],
    )

    renderPage(<SchedulePage />)

    const first = (await screen.findByText('10A1 · Lớp 10A1')).closest('button')
    const second = (await screen.findByText('Lớp 11B1')).closest('button')
    expect(first?.className).toContain('bg-lane-1-50')
    expect(second?.className).toContain('bg-lane-2-50')
    expect(screen.getByRole('checkbox', { name: 'Tổ Toán – Tin' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Tổ Văn – Sử' })).toBeInTheDocument()
  })

  it('bỏ chọn phòng ban trong chú thích thì ẩn buổi học của phòng đó', async () => {
    vi.mocked(departmentsApi.list).mockResolvedValue([department, secondDepartment])
    vi.mocked(schedulesApi.list).mockImplementation(async (departmentId) =>
      departmentId === 'dept-1' ? [session] : [secondSession],
    )

    renderPage(<SchedulePage />)
    await screen.findByText('Lớp 11B1')

    await userEvent.click(screen.getByRole('checkbox', { name: 'Tổ Văn – Sử' }))

    await waitFor(() => expect(screen.queryByText('Lớp 11B1')).not.toBeInTheDocument())
    expect(screen.getByText('10A1 · Lớp 10A1')).toBeInTheDocument()
  })

  it('chuyển tuần trước tải lịch đúng khoảng thời gian', async () => {
    renderPage(<SchedulePage />)
    await screen.findByText('10A1 · Lớp 10A1')

    const previousMonday = addDaysLocal(startOfWeekLocal(new Date()), -7)
    const expectedFrom = new Date(
      previousMonday.getFullYear(),
      previousMonday.getMonth(),
      previousMonday.getDate(),
    ).toISOString()

    await userEvent.click(screen.getByRole('button', { name: 'Tuần trước' }))

    await waitFor(() => {
      const calls = vi.mocked(schedulesApi.list).mock.calls
      expect(calls.some(([, params]) => params.from === expectedFrom)).toBe(true)
    })
  })

  it('lọc lịch theo lớp đang chọn', async () => {
    renderPage(<SchedulePage />)
    await screen.findByText('10A1 · Lớp 10A1')

    const combos = screen.getAllByRole('combobox')
    await userEvent.click(combos[combos.length - 1]!)
    await userEvent.click(await screen.findByRole('option', { name: '10A1 · Lớp 10A1' }))

    await waitFor(() => {
      const calls = vi.mocked(schedulesApi.list).mock.calls
      expect(calls.some(([, params]) => params.classId === 'class-1')).toBe(true)
    })
  })

  it('bấm vào buổi học mở hộp thoại cập nhật', async () => {
    renderPage(<SchedulePage />)
    await userEvent.click(await screen.findByText('10A1 · Lớp 10A1'))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Cập nhật buổi học')).toBeInTheDocument()
  })

  it('buổi đã huỷ hiển thị mờ và gạch ngang', async () => {
    vi.mocked(schedulesApi.list).mockResolvedValue([{ ...session, status: 'cancelled' }])

    renderPage(<SchedulePage />)

    const block = (await screen.findByText('10A1 · Lớp 10A1')).closest('button')
    expect(block?.className).toContain('line-through')
  })

  it('chỉ báo lỗi phòng ban bị từ chối, vẫn hiện phòng ban còn lại', async () => {
    vi.mocked(departmentsApi.list).mockResolvedValue([department, secondDepartment])
    vi.mocked(schedulesApi.list).mockImplementation(async (departmentId) => {
      if (departmentId === 'dept-2') {
        throw new ApiError({ status: 403, message: 'Bạn không có quyền xem lịch của phòng ban này.' })
      }
      return [session]
    })

    renderPage(<SchedulePage />)

    expect(
      await screen.findByText('10A1 · Lớp 10A1', {}, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(
      await screen.findByText(/Tổ Văn – Sử: Bạn không có quyền xem lịch/, {}, { timeout: 3000 }),
    ).toBeInTheDocument()
  })
})
