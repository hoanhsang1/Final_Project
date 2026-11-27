import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { scheduleConfigApi } from '@/features/schedule/api'
import type * as ScheduleApi from '@/features/schedule/api'
import { ScheduleConfigPage } from '@/features/schedule/pages/schedule-config-page'
import type { ScheduleTimeSlot } from '@/features/schedule/types'
import { PERM } from '@/lib/permissions'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/schedule/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ScheduleApi>()
  return {
    ...actual,
    scheduleConfigApi: {
      ...actual.scheduleConfigApi,
      timeSlots: vi.fn(),
      saveTimeSlots: vi.fn(),
      classRules: vi.fn(),
      saveClassRules: vi.fn(),
      teacherAvailability: vi.fn(),
      saveTeacherAvailability: vi.fn(),
    },
  }
})

const slots: ScheduleTimeSlot[] = [
  {
    id: 'ts-1',
    periodNo: 1,
    name: 'Tiết 1',
    startTime: '07:30',
    endTime: '08:30',
    joinsNext: false,
    isActive: true,
  },
  {
    id: 'ts-2',
    periodNo: 2,
    name: 'Tiết 2',
    startTime: '08:40',
    endTime: '09:40',
    joinsNext: false,
    isActive: true,
  },
]

beforeEach(() => {
  vi.mocked(scheduleConfigApi.timeSlots).mockResolvedValue(slots)
  vi.mocked(scheduleConfigApi.saveTimeSlots).mockResolvedValue(slots)
  vi.mocked(scheduleConfigApi.classRules).mockReset()
  vi.mocked(scheduleConfigApi.saveClassRules).mockReset()
  vi.mocked(scheduleConfigApi.teacherAvailability).mockReset()
  vi.mocked(scheduleConfigApi.saveTeacherAvailability).mockReset()
  signInAs({ permissions: [PERM.scheduleConfig] })
})

describe('ScheduleConfigPage — cấu hình lịch', () => {
  it('hiển thị khung tiết đã cấu hình', async () => {
    renderPage(<ScheduleConfigPage />)

    expect(await screen.findByDisplayValue('Tiết 1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('08:40')).toBeInTheDocument()
    await waitFor(() => expect(scheduleConfigApi.timeSlots).toHaveBeenCalled())
  })

  it('lưu khung tiết với danh sách hiện tại', async () => {
    renderPage(<ScheduleConfigPage />)
    await screen.findByDisplayValue('Tiết 1')

    await userEvent.click(screen.getByRole('button', { name: /Lưu cấu hình tiết/ }))

    await waitFor(() =>
      expect(scheduleConfigApi.saveTimeSlots).toHaveBeenCalledWith([
        {
          periodNo: 1,
          name: 'Tiết 1',
          startTime: '07:30',
          endTime: '08:30',
          joinsNext: false,
          isActive: true,
        },
        {
          periodNo: 2,
          name: 'Tiết 2',
          startTime: '08:40',
          endTime: '09:40',
          joinsNext: false,
          isActive: true,
        },
      ]),
    )
  })

  it('thêm tiết mới với số tiết nối tiếp', async () => {
    renderPage(<ScheduleConfigPage />)
    await screen.findByDisplayValue('Tiết 1')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm tiết' }))

    expect(await screen.findByLabelText('Tên tiết 3')).toBeInTheDocument()
  })

  it('chuyển sang tab quy tắc tiết của lớp', async () => {
    renderPage(<ScheduleConfigPage />)
    await screen.findByDisplayValue('Tiết 1')

    await userEvent.click(screen.getByRole('tab', { name: 'Quy tắc tiết của lớp' }))

    expect(await screen.findByText('Chọn một lớp để xem và sửa quy tắc tiết.')).toBeInTheDocument()
  })

  it('ẩn thao tác lưu khi thiếu quyền schedule.config', async () => {
    signInAs({ roles: ['STAFF'], role: 'STAFF', permissions: [] })

    renderPage(<ScheduleConfigPage />)
    await screen.findByDisplayValue('Tiết 1')

    expect(screen.getByText('Bạn không có quyền cấu hình lịch của tổ chức.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thêm tiết' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Lưu cấu hình tiết/ })).toBeDisabled()
  })
})
