import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { equipmentApi, issuesApi } from '@/features/facility/api'
import type * as FacilityApi from '@/features/facility/api'
import { FacilityIssuesPage } from '@/features/facility/pages/facility-issues-page'
import type { Equipment, FacilityIssue } from '@/features/facility/types'
import { departmentsApi } from '@/features/organization/api'
import type * as OrganizationApi from '@/features/organization/api'
import type { Department } from '@/features/organization/types'
import { PERM } from '@/lib/permissions'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/facility/api', async (importOriginal) => {
  const actual = await importOriginal<typeof FacilityApi>()
  return {
    ...actual,
    equipmentApi: { ...actual.equipmentApi, list: vi.fn() },
    issuesApi: {
      ...actual.issuesApi,
      list: vi.fn(),
      report: vi.fn(),
      resolve: vi.fn(),
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

const department: Department = {
  id: 'dept-1',
  name: 'Tổ Toán – Tin',
  description: null,
  createdAt: '2026-01-01T00:00:00Z',
  modules: ['FACILITY_MANAGEMENT'],
}

const equipment: Equipment = {
  id: 'eq-1',
  assetCode: 'TB001',
  name: 'Máy chiếu',
  equipmentType: 'projector',
  roomId: 'room-1',
  roomName: 'Phòng học 101',
  status: 'broken',
  purchaseDate: '2025-09-01',
}

const openIssue: FacilityIssue = {
  id: 'issue-1',
  equipmentId: 'eq-1',
  equipmentName: 'Máy chiếu',
  reportedBy: 'user-9',
  description: 'Bóng đèn chiếu bị cháy',
  photoUrl: null,
  status: 'open',
  resolvedAt: null,
  createdAt: '2026-11-10T08:00:00Z',
}

beforeAll(() => {
  // Radix Select cần pointer-capture API mà jsdom chưa cung cấp.
  Object.defineProperty(window.HTMLElement.prototype, 'hasPointerCapture', {
    configurable: true,
    value: () => false,
  })
  Object.defineProperty(window.HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: () => {},
  })
  Object.defineProperty(window.HTMLElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: () => {},
  })
})

afterAll(() => {
  delete (window.HTMLElement.prototype as Partial<HTMLElement>).hasPointerCapture
  delete (window.HTMLElement.prototype as Partial<HTMLElement>).setPointerCapture
  delete (window.HTMLElement.prototype as Partial<HTMLElement>).releasePointerCapture
})

beforeEach(() => {
  vi.mocked(departmentsApi.list).mockResolvedValue([department])
  vi.mocked(equipmentApi.list).mockResolvedValue([equipment])
  vi.mocked(issuesApi.list).mockResolvedValue([openIssue])
  vi.mocked(issuesApi.report).mockReset()
  vi.mocked(issuesApi.resolve).mockReset()
  signInAs({
    permissions: [PERM.facilityView, PERM.facilityIssueReport, PERM.facilityIssueResolve],
  })
})

describe('FacilityIssuesPage — báo cáo và xử lý sự cố', () => {
  it('hiển thị sự cố kèm trạng thái và mô tả', async () => {
    renderPage(<FacilityIssuesPage />)

    expect(await screen.findByText('Bóng đèn chiếu bị cháy')).toBeInTheDocument()
    expect(screen.getByText('Máy chiếu')).toBeInTheDocument()
    expect(screen.getByText('Chờ xử lý')).toBeInTheDocument()
  })

  it('chặn gửi báo cáo khi chưa chọn thiết bị', async () => {
    renderPage(<FacilityIssuesPage />)
    await screen.findByText('Bóng đèn chiếu bị cháy')

    await userEvent.click(screen.getByRole('button', { name: 'Báo cáo sự cố' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi báo cáo' }))

    expect(await within(dialog).findByText('Vui lòng chọn thiết bị gặp sự cố.')).toBeInTheDocument()
    expect(issuesApi.report).not.toHaveBeenCalled()
  })

  it('gửi báo cáo sự cố và refetch danh sách', async () => {
    vi.mocked(issuesApi.report).mockResolvedValue({ ...openIssue, id: 'issue-2' })

    renderPage(<FacilityIssuesPage />)
    await screen.findByText('Bóng đèn chiếu bị cháy')

    await userEvent.click(screen.getByRole('button', { name: 'Báo cáo sự cố' }))
    const dialog = await screen.findByRole('dialog')

    await userEvent.click(within(dialog).getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: /TB001/ }))
    await userEvent.type(
      within(dialog).getByPlaceholderText('Mô tả tình trạng hỏng hóc…'),
      'Quạt trần kêu to',
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi báo cáo' }))

    await waitFor(() =>
      expect(issuesApi.report).toHaveBeenCalledWith('dept-1', {
        equipmentId: 'eq-1',
        description: 'Quạt trần kêu to',
        photoUrl: undefined,
      }),
    )
    await waitFor(() => expect(issuesApi.list).toHaveBeenCalledTimes(2))
  })

  it('đánh dấu đã xử lý sự cố và refetch danh sách', async () => {
    vi.mocked(issuesApi.resolve).mockResolvedValue({
      ...openIssue,
      status: 'resolved',
      resolvedAt: '2026-11-16T09:00:00Z',
    })

    renderPage(<FacilityIssuesPage />)
    await screen.findByText('Bóng đèn chiếu bị cháy')

    await userEvent.click(screen.getByRole('button', { name: 'Đánh dấu đã xử lý' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Xác nhận đã xử lý sự cố')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Đã xử lý' }))

    await waitFor(() => expect(issuesApi.resolve).toHaveBeenCalledWith('dept-1', 'issue-1'))
    await waitFor(() => expect(issuesApi.list).toHaveBeenCalledTimes(2))
  })

  it('ẩn thao tác báo cáo và xử lý khi chỉ có quyền xem', async () => {
    signInAs({ roles: ['STAFF'], role: 'STAFF', permissions: [PERM.facilityView] })

    renderPage(<FacilityIssuesPage />)
    await screen.findByText('Bóng đèn chiếu bị cháy')

    expect(screen.queryByRole('button', { name: 'Báo cáo sự cố' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Đánh dấu đã xử lý' })).not.toBeInTheDocument()
  })

  it.each(['disabled', 'locked'] as const)(
    'chặn báo cáo và xử lý khi module cơ sở vật chất ở trạng thái %s',
    async (state) => {
      signInAs({
        permissions: [PERM.facilityView, PERM.facilityIssueReport, PERM.facilityIssueResolve],
        moduleStates: { FACILITY_MANAGEMENT: state },
      })

      renderPage(<FacilityIssuesPage />)

      expect(await screen.findByText('Bóng đèn chiếu bị cháy')).toBeInTheDocument()
      expect(
        screen.getByText(
          'Module cơ sở vật chất đang ở chế độ chỉ đọc. Bạn vẫn có thể xem dữ liệu nhưng không thể tạo hoặc cập nhật.',
        ),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Báo cáo sự cố' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Đánh dấu đã xử lý' })).not.toBeInTheDocument()
    },
  )
})
