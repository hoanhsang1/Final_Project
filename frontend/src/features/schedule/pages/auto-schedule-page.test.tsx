import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { classesApi, teachersApi } from '@/features/academic/api'
import type * as AcademicApi from '@/features/academic/api'
import type { SchoolClass, TeacherItem } from '@/features/academic/types'
import { scheduleConfigApi, scheduleDraftsApi, schedulesApi } from '@/features/schedule/api'
import type * as ScheduleApi from '@/features/schedule/api'
import { AutoSchedulePage } from '@/features/schedule/pages/auto-schedule-page'
import type {
  ScheduleDraftDetail,
  ScheduleDraftItem,
  ScheduleDraftSummary,
  ScheduleTimeSlot,
} from '@/features/schedule/types'
import { PERM } from '@/lib/permissions'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/schedule/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ScheduleApi>()
  return {
    ...actual,
    schedulesApi: { ...actual.schedulesApi, roomSuggestions: vi.fn() },
    scheduleConfigApi: { ...actual.scheduleConfigApi, timeSlots: vi.fn() },
    scheduleDraftsApi: {
      ...actual.scheduleDraftsApi,
      create: vi.fn(),
      list: vi.fn(),
      detail: vi.fn(),
      patchItem: vi.fn(),
      confirm: vi.fn(),
      discard: vi.fn(),
    },
  }
})

vi.mock('@/features/academic/api', async (importOriginal) => {
  const actual = await importOriginal<typeof AcademicApi>()
  return {
    ...actual,
    classesApi: { ...actual.classesApi, list: vi.fn() },
    teachersApi: { ...actual.teachersApi, list: vi.fn() },
  }
})

const schoolClass: SchoolClass = {
  id: 'class-1',
  orgId: 'org-1',
  classCode: 'C10A',
  name: 'Lớp 10A',
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
  subjectId: 'sub-1',
  subjectName: 'Toán',
  cancelState: null,
  cancelRequestReason: null,
}

const teacher: TeacherItem = {
  userId: 'teacher-1',
  staffCode: 'GV01',
  fullName: 'GV 1',
  email: null,
  phone: null,
  departmentId: 'dept-1',
  specialties: [],
  contractType: null,
  teachingStatus: 'DANG_DAY',
  classCount: 0,
  noClass: true,
  classLabel: null,
}

const slots: ScheduleTimeSlot[] = [
  { id: 'ts-1', periodNo: 1, name: 'Tiết 1', startTime: '07:30', endTime: '08:30', joinsNext: false, isActive: true },
  { id: 'ts-2', periodNo: 2, name: 'Tiết 2', startTime: '08:40', endTime: '09:40', joinsNext: false, isActive: true },
  { id: 'ts-3', periodNo: 3, name: 'Tiết 3', startTime: '09:50', endTime: '10:50', joinsNext: false, isActive: true },
]

const firstItem: ScheduleDraftItem = {
  id: 'item-1',
  classId: 'class-1',
  subjectId: 'sub-1',
  subjectName: 'Toán',
  teacherId: 'teacher-1',
  teacherName: 'GV 1',
  roomId: 'room-1',
  roomCode: 'R1',
  startTime: '2026-11-30T00:30:00Z',
  endTime: '2026-11-30T01:30:00Z',
  date: '2026-11-30',
  periods: [1],
  weekNo: 1,
  exception: false,
  exceptionType: null,
  exceptionReason: null,
  manualEdit: false,
}

const exceptionItem: ScheduleDraftItem = {
  ...firstItem,
  id: 'item-2',
  roomId: 'room-3',
  roomCode: 'R3',
  startTime: '2026-12-01T01:40:00Z',
  endTime: '2026-12-01T02:40:00Z',
  date: '2026-12-01',
  periods: [2],
  exception: true,
  exceptionType: 'ROOM_CHANGED',
  exceptionReason: 'Phòng R1 đang bảo trì',
}

const detail: ScheduleDraftDetail = {
  id: 'draft-1',
  status: 'DRAFT',
  departmentId: 'dept-1',
  classIds: ['class-1'],
  dateFrom: '2026-11-30',
  dateTo: '2026-12-13',
  week: 1,
  totalWeeks: 2,
  items: [firstItem, exceptionItem],
  unscheduled: [
    { id: 'u-1', classId: 'class-1', subjectId: 'sub-1', sessionNo: 3, reason: 'Không còn giáo viên rảnh' },
  ],
  totalItems: 3,
  exceptionCount: 1,
  unscheduledCount: 1,
  complete: false,
  steps: 42,
  elapsedMillis: 15,
  createdAt: '2026-11-27T00:00:00Z',
  confirmedAt: null,
}

const summary: ScheduleDraftSummary = {
  id: 'draft-1',
  status: 'DRAFT',
  departmentId: 'dept-1',
  classIds: ['class-1'],
  dateFrom: '2026-11-30',
  dateTo: '2026-12-13',
  itemCount: 2,
  unscheduledCount: 1,
  exceptionCount: 1,
  createdAt: '2026-11-27T00:00:00Z',
  confirmedAt: null,
}

beforeEach(() => {
  vi.mocked(classesApi.list).mockResolvedValue({ items: [schoolClass], total: 1, page: 1, size: 100 })
  vi.mocked(teachersApi.list).mockResolvedValue({ items: [teacher], total: 1, page: 1, size: 100 })
  vi.mocked(scheduleConfigApi.timeSlots).mockResolvedValue(slots)
  vi.mocked(schedulesApi.roomSuggestions).mockResolvedValue([
    { id: 'room-1', code: 'R1', name: 'Phòng 1', capacity: 40, status: 'active' },
    { id: 'room-2', code: 'R2', name: 'Phòng 2', capacity: 45, status: 'active' },
  ])
  vi.mocked(scheduleDraftsApi.list).mockResolvedValue([summary])
  vi.mocked(scheduleDraftsApi.detail).mockResolvedValue(detail)
  vi.mocked(scheduleDraftsApi.create).mockResolvedValue(detail)
  vi.mocked(scheduleDraftsApi.patchItem).mockResolvedValue({ ...firstItem, roomId: 'room-2', roomCode: 'R2', manualEdit: true })
  vi.mocked(scheduleDraftsApi.confirm).mockResolvedValue({ created: 2, failed: [] })
  vi.mocked(scheduleDraftsApi.discard).mockResolvedValue(undefined)

  signInAs({
    roles: ['STAFF'],
    role: 'STAFF',
    permissions: [PERM.scheduleView, PERM.scheduleCreate],
    user: { departmentId: 'dept-1' },
  })
})

async function openDraft() {
  renderPage(<AutoSchedulePage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Mở' }))
  return screen.findByRole('table', { name: 'Lưới lịch nháp' })
}

describe('AutoSchedulePage — xếp lịch nháp', () => {
  it('tạo lịch nháp với lớp đã chọn rồi hiển thị lưới tuần', async () => {
    renderPage(<AutoSchedulePage />)

    await userEvent.click(await screen.findByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Tạo lịch nháp' }))

    await waitFor(() =>
      expect(scheduleDraftsApi.create).toHaveBeenCalledWith(
        'dept-1',
        expect.objectContaining({ classIds: ['class-1'], dateFrom: expect.any(String) }),
      ),
    )
    const grid = await screen.findByRole('table', { name: 'Lưới lịch nháp' })
    expect(within(grid).getAllByText('Lớp 10A').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Xác nhận/ })).toBeInTheDocument()
    expect(screen.getByText('Tuần 1/2')).toBeInTheDocument()
  })

  it('hiển thị buổi ngoại lệ và danh sách chưa xếp được', async () => {
    await openDraft()

    expect(screen.getByText(/Đổi phòng/)).toBeInTheDocument()
    expect(screen.getByText(/Không còn giáo viên rảnh/)).toBeInTheDocument()
  })

  it('báo lỗi khi không tải được lịch nháp thay vì hiện danh sách trống', async () => {
    // Lỗi 4xx để React Query không thử lại, giữ test nhanh và ổn định.
    vi.mocked(scheduleDraftsApi.detail).mockRejectedValue(
      Object.assign(new Error('Not Found'), {
        isAxiosError: true,
        response: { status: 404 },
      }),
    )

    renderPage(<AutoSchedulePage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Mở' }))

    expect(await screen.findByText('Không tải được lịch nháp')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })

  it('sửa phòng của một buổi nháp và gửi PATCH', async () => {
    await openDraft()

    await userEvent.click(screen.getByTitle('Lớp 10A · Toán · GV 1 · R1'))
    const dialog = await screen.findByRole('dialog')
    const combos = within(dialog).getAllByRole('combobox')
    await userEvent.click(combos[3]!)
    await userEvent.click(await screen.findByRole('option', { name: /R2/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() =>
      expect(scheduleDraftsApi.patchItem).toHaveBeenCalledWith('dept-1', 'draft-1', 'item-1', {
        roomId: 'room-2',
      }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('xác nhận lịch nháp tạo buổi thật', async () => {
    await openDraft()

    await userEvent.click(screen.getByRole('button', { name: /Xác nhận/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận lịch' }))

    await waitFor(() => expect(scheduleDraftsApi.confirm).toHaveBeenCalledWith('dept-1', 'draft-1'))
  })

  it('xác nhận thất bại: hiển thị lý do và giữ lịch nháp', async () => {
    vi.mocked(scheduleDraftsApi.confirm).mockResolvedValue({
      created: 0,
      failed: [
        { itemId: 'item-1', classId: 'class-1', subjectName: 'Toán', reason: 'Trùng giáo viên' },
      ],
    })
    await openDraft()

    await userEvent.click(screen.getByRole('button', { name: /Xác nhận/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận lịch' }))

    expect(await screen.findByText(/Trùng giáo viên/)).toBeInTheDocument()
    expect(screen.getByText(/toàn bộ thay đổi đã được hoàn tác/i)).toBeInTheDocument()
  })
})
