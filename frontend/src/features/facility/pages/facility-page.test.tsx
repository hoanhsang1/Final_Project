import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { equipmentApi, issuesApi, roomsApi } from '@/features/facility/api'
import type * as FacilityApi from '@/features/facility/api'
import { FacilityPage } from '@/features/facility/pages/facility-page'
import type { Equipment, Room } from '@/features/facility/types'
import { departmentsApi } from '@/features/organization/api'
import type * as OrganizationApi from '@/features/organization/api'
import type { Department } from '@/features/organization/types'
import { ApiError } from '@/lib/api-error'
import { PERM } from '@/lib/permissions'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/facility/api', async (importOriginal) => {
  const actual = await importOriginal<typeof FacilityApi>()
  return {
    ...actual,
    roomsApi: {
      ...actual.roomsApi,
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    equipmentApi: {
      ...actual.equipmentApi,
      list: vi.fn(),
    },
    issuesApi: { ...actual.issuesApi, list: vi.fn() },
  }
})

vi.mock('@/features/organization/api', async (importOriginal) => {
  const actual = await importOriginal<typeof OrganizationApi>()
  return {
    ...actual,
    departmentsApi: { ...actual.departmentsApi, list: vi.fn() },
  }
})

const department: Department = {
  id: 'dept-1',
  name: 'Tổ Toán – Tin',
  description: null,
  createdAt: '2026-01-01T00:00:00Z',
  modules: ['FACILITY_MANAGEMENT'],
}

const room: Room = {
  id: 'room-1',
  code: 'P101',
  name: 'Phòng học 101',
  building: 'A',
  floor: '1',
  capacity: 40,
  roomType: 'classroom',
  status: 'active',
}

const equipment: Equipment = {
  id: 'eq-1',
  assetCode: 'TB001',
  name: 'Máy chiếu',
  equipmentType: 'projector',
  roomId: 'room-1',
  roomName: 'Phòng học 101',
  status: 'in_use',
  purchaseDate: '2025-09-01',
}

beforeEach(() => {
  vi.mocked(departmentsApi.list).mockResolvedValue([department])
  vi.mocked(roomsApi.list).mockResolvedValue([room])
  vi.mocked(equipmentApi.list).mockResolvedValue([equipment])
  vi.mocked(issuesApi.list).mockResolvedValue([])
  vi.mocked(roomsApi.create).mockReset()
  vi.mocked(roomsApi.remove).mockReset()
  signInAs({
    permissions: [
      PERM.facilityView,
      PERM.facilityRoomCreate,
      PERM.facilityRoomDelete,
      PERM.facilityManage,
    ],
  })
})

describe('FacilityPage — phòng và thiết bị', () => {
  it('hiển thị phòng và thiết bị của phòng ban', async () => {
    renderPage(<FacilityPage />)

    expect(await screen.findByText('P101')).toBeInTheDocument()
    expect(screen.getByText('Phòng học 101')).toBeInTheDocument()
    expect(screen.getByText('Đang sử dụng')).toBeInTheDocument()
  })

  it('tạo phòng học và refetch danh sách', async () => {
    vi.mocked(roomsApi.create).mockResolvedValue({ ...room, id: 'room-2', code: 'P102' })

    renderPage(<FacilityPage />)
    await screen.findByText('P101')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm phòng' }))
    const dialog = await screen.findByRole('dialog')
    const inputs = within(dialog).getAllByRole('textbox')
    await userEvent.type(inputs[0]!, 'P102')
    await userEvent.type(inputs[1]!, 'Phòng học 102')
    await userEvent.clear(within(dialog).getByRole('spinbutton'))
    await userEvent.type(within(dialog).getByRole('spinbutton'), '35')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo phòng' }))

    await waitFor(() =>
      expect(roomsApi.create).toHaveBeenCalledWith('dept-1', {
        code: 'P102',
        name: 'Phòng học 102',
        building: '',
        floor: '',
        capacity: 35,
        roomType: 'classroom',
        status: 'active',
      }),
    )
    await waitFor(() => expect(roomsApi.list).toHaveBeenCalledTimes(2))
  })

  it('chặn tạo phòng khi thiếu mã hoặc tên', async () => {
    renderPage(<FacilityPage />)
    await screen.findByText('P101')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm phòng' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo phòng' }))

    expect(await within(dialog).findByText('Vui lòng nhập mã và tên phòng.')).toBeInTheDocument()
    expect(roomsApi.create).not.toHaveBeenCalled()
  })

  it('báo lỗi khi xoá phòng thất bại', async () => {
    vi.mocked(roomsApi.remove).mockRejectedValue(
      new ApiError({ status: 409, message: 'Phòng đang gắn thiết bị, không thể xoá.' }),
    )

    renderPage(<FacilityPage />)
    await screen.findByText('P101')

    await userEvent.click(screen.getByRole('button', { name: 'Xoá' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xoá' }))

    await waitFor(() => expect(roomsApi.remove).toHaveBeenCalledWith('dept-1', 'room-1'))
    await waitFor(() => expect(roomsApi.list).toHaveBeenCalledTimes(1))
  })

  it('ẩn thao tác khi không có quyền cơ sở vật chất', async () => {
    signInAs({ roles: ['STAFF'], role: 'STAFF', permissions: [] })

    renderPage(<FacilityPage />)
    await screen.findByText('P101')
    expect(screen.queryByRole('button', { name: 'Thêm phòng' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sửa' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Xoá' })).not.toBeInTheDocument()
  })

  it('cho phép ghi khi module active và có quyền', async () => {
    signInAs({
      permissions: [PERM.facilityView, PERM.facilityRoomCreate, PERM.facilityRoomDelete],
      moduleStates: { FACILITY_MANAGEMENT: 'active' },
    })

    renderPage(<FacilityPage />)
    await screen.findByText('P101')
    expect(screen.getByRole('button', { name: 'Thêm phòng' })).toBeInTheDocument()
    expect(screen.queryByText(/chế độ chỉ đọc/)).not.toBeInTheDocument()
  })

  it('không hiện nút ghi khi module chưa đăng ký', async () => {
    signInAs({
      permissions: [PERM.facilityView, PERM.facilityRoomCreate, PERM.facilityRoomDelete],
      moduleStates: { FACILITY_MANAGEMENT: 'not_registered' },
    })

    renderPage(<FacilityPage />)
    await screen.findByText('P101')
    expect(screen.queryByRole('button', { name: 'Thêm phòng' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Xoá' })).not.toBeInTheDocument()
  })

  it.each(['disabled', 'locked'] as const)(
    'chỉ cho đọc khi module cơ sở vật chất ở trạng thái %s',
    async (state) => {
      signInAs({
        permissions: [
          PERM.facilityView,
          PERM.facilityRoomCreate,
          PERM.facilityRoomDelete,
          PERM.facilityManage,
        ],
        moduleStates: { FACILITY_MANAGEMENT: state },
      })

      renderPage(<FacilityPage />)

      expect(await screen.findByText('P101')).toBeInTheDocument()
      expect(
        screen.getByText(
          'Module cơ sở vật chất đang ở chế độ chỉ đọc. Bạn vẫn có thể xem dữ liệu nhưng không thể tạo hoặc cập nhật.',
        ),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Thêm phòng' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Sửa' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Xoá' })).not.toBeInTheDocument()
    },
  )
})
