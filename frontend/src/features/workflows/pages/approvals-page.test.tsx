import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { classesApi } from '@/features/academic/api'
import type * as AcademicApi from '@/features/academic/api'
import { approvalInboxApi, resignationsApi } from '@/features/workflows/api'
import type * as WorkflowsApi from '@/features/workflows/api'
import { ApprovalsPage } from '@/features/workflows/pages/approvals-page'
import type {
  ApprovalInbox,
  ClassLifecycleInboxItem,
  ResignationRequest,
} from '@/features/workflows/types'
import type { TransferRequest } from '@/features/organization/types'
import { ApiError } from '@/lib/api-error'
import { PERM } from '@/lib/permissions'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/workflows/api', async (importOriginal) => {
  const actual = await importOriginal<typeof WorkflowsApi>()
  return {
    ...actual,
    approvalInboxApi: { ...actual.approvalInboxApi, get: vi.fn() },
    resignationsApi: { ...actual.resignationsApi, decide: vi.fn() },
  }
})

vi.mock('@/features/academic/api', async (importOriginal) => {
  const actual = await importOriginal<typeof AcademicApi>()
  return {
    ...actual,
    classesApi: {
      ...actual.classesApi,
      approveCancel: vi.fn(),
      rejectCancel: vi.fn(),
      approveClose: vi.fn(),
      rejectClose: vi.fn(),
    },
  }
})

const resignation: ResignationRequest = {
  id: 'res-1',
  userId: 'user-9',
  username: 'giao.vien',
  fullName: 'Giáo viên A',
  departmentId: 'dept-1',
  departmentName: 'Tổ Toán – Tin',
  reason: 'Chuyển công tác',
  status: 'PENDING',
  requestedBy: 'user-2',
  requestedByName: 'Trưởng phòng',
  requestedAt: '2026-02-01T08:00:00Z',
  decidedBy: null,
  decidedByName: null,
  decidedAt: null,
  decisionNote: null,
}

const transfer: TransferRequest = {
  id: 'tr-1',
  userId: 'user-9',
  username: 'giao.vien',
  fullName: 'Giáo viên A',
  fromDepartmentId: 'dept-1',
  fromDepartmentName: 'Tổ Toán',
  toDepartmentId: 'dept-2',
  toDepartmentName: 'Tổ Lý',
  reason: 'Nguyện vọng',
  status: 'PENDING',
  requestedBy: 'user-2',
  requestedByName: 'Trưởng phòng',
  requestedAt: '2026-02-01T08:00:00Z',
  appliedAt: null,
  steps: [],
  actionableSteps: ['SOURCE_HEAD'],
}

const classItem: ClassLifecycleInboxItem = {
  classId: 'class-1',
  classCode: 'C10A',
  className: 'Lớp 10A',
  classStatus: 'DANG_DIEN_RA',
  kind: 'CLOSE',
  requesterId: 'user-2',
  requesterName: 'Trưởng phòng',
  reason: 'Đã hết chương trình',
  requestedAt: '2026-02-01T08:00:00Z',
  studentCount: 30,
}

function inbox(overrides: Partial<ApprovalInbox> = {}): ApprovalInbox {
  return {
    transfers: [],
    resignations: [],
    classLifecycle: [],
    total: 0,
    ...overrides,
  }
}

beforeEach(() => {
  vi.mocked(approvalInboxApi.get).mockResolvedValue(inbox())
  vi.mocked(resignationsApi.decide).mockReset()
  vi.mocked(classesApi.approveClose).mockReset()
  vi.mocked(classesApi.rejectClose).mockReset()
  vi.mocked(classesApi.approveCancel).mockReset()
  vi.mocked(classesApi.rejectCancel).mockReset()
})

describe('ApprovalsPage — hộp duyệt hợp nhất', () => {
  it('hiển thị ba loại việc chờ duyệt với người yêu cầu và thời gian', async () => {
    vi.mocked(approvalInboxApi.get).mockResolvedValue(
      inbox({ transfers: [transfer], resignations: [resignation], classLifecycle: [classItem], total: 3 }),
    )
    signInAs({ roles: ['MANAGER'], role: 'MANAGER', permissions: [] })

    renderPage(<ApprovalsPage />)

    expect(await screen.findByText(/Tổ Toán → Tổ Lý/)).toBeInTheDocument()
    expect(screen.getByText(/Yêu cầu bởi Trưởng phòng/)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Điều chuyển \(1\)/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Nghỉ việc \(1\)/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Vòng đời lớp \(1\)/ })).toBeInTheDocument()
  })

  it('duyệt nghỉ việc dùng departmentId của chính yêu cầu', async () => {
    vi.mocked(approvalInboxApi.get).mockResolvedValue(inbox({ resignations: [resignation], total: 1 }))
    vi.mocked(resignationsApi.decide).mockResolvedValue({ ...resignation, status: 'APPROVED' })
    signInAs({ roles: ['MANAGER'], role: 'MANAGER', permissions: [PERM.employeeApproveResignation] })

    renderPage(<ApprovalsPage />)
    await userEvent.click(await screen.findByRole('tab', { name: /Nghỉ việc/ }))
    expect(await screen.findByText('Giáo viên A')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Chấp thuận' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Chấp thuận' }))

    await waitFor(() =>
      expect(resignationsApi.decide).toHaveBeenCalledWith('dept-1', 'res-1', 'approve', undefined),
    )
    await waitFor(() => expect(approvalInboxApi.get).toHaveBeenCalledTimes(2))
  })

  it('hộp rỗng không hiện nút quyết định', async () => {
    signInAs({ roles: ['STAFF'], role: 'STAFF', permissions: [] })

    renderPage(<ApprovalsPage />)
    await userEvent.click(await screen.findByRole('tab', { name: /Nghỉ việc/ }))

    expect(await screen.findByText('Không có yêu cầu nghỉ việc')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Chấp thuận' })).not.toBeInTheDocument()
  })

  it('duyệt đóng lớp gọi đúng endpoint vòng đời', async () => {
    vi.mocked(approvalInboxApi.get).mockResolvedValue(inbox({ classLifecycle: [classItem], total: 1 }))
    vi.mocked(classesApi.approveClose).mockResolvedValue({} as never)
    signInAs({ roles: ['MANAGER'], role: 'MANAGER', permissions: [PERM.classApproveClose] })

    renderPage(<ApprovalsPage />)
    await userEvent.click(await screen.findByRole('tab', { name: /Vòng đời lớp/ }))
    expect(await screen.findByText('C10A · Lớp 10A')).toBeInTheDocument()
    expect(screen.getByText(/Đã hết chương trình/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Chấp thuận' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Xác nhận' }))

    await waitFor(() => expect(classesApi.approveClose).toHaveBeenCalledWith('class-1'))
  })

  it('từ chối hủy lớp bắt buộc nhập lý do', async () => {
    vi.mocked(approvalInboxApi.get).mockResolvedValue(
      inbox({ classLifecycle: [{ ...classItem, kind: 'CANCEL' }], total: 1 }),
    )
    signInAs({ roles: ['MANAGER'], role: 'MANAGER', permissions: [PERM.classApproveClose] })

    renderPage(<ApprovalsPage />)
    await userEvent.click(await screen.findByRole('tab', { name: /Vòng đời lớp/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Từ chối' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }))

    expect(classesApi.rejectCancel).not.toHaveBeenCalled()

    await userEvent.type(within(dialog).getByRole('textbox'), 'Lớp vẫn còn học sinh')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }))

    await waitFor(() =>
      expect(classesApi.rejectCancel).toHaveBeenCalledWith('class-1', 'Lớp vẫn còn học sinh'),
    )
  })

  it('hiển thị lỗi API của hộp duyệt', async () => {
    vi.mocked(approvalInboxApi.get).mockRejectedValue(
      new ApiError({ status: 503, message: 'Dịch vụ tạm thời không phản hồi.' }),
    )
    signInAs({ roles: ['MANAGER'], role: 'MANAGER', permissions: [] })

    renderPage(<ApprovalsPage />)

    expect(
      await screen.findByText('Không tải được hộp duyệt', {}, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Dịch vụ tạm thời không phản hồi.')).toBeInTheDocument()
  })
})
