import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as WorkflowsApi from '@/features/workflows/api'
import { MyRequestsPage } from '@/features/workflows/pages/my-requests-page'
import { resignationsApi, transferWorkflowApi } from '@/features/workflows/api'
import type { ResignationRequest, TransferRequest } from '@/features/workflows/types'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/workflows/api', async (importOriginal) => {
  const actual = await importOriginal<typeof WorkflowsApi>()
  return {
    ...actual,
    resignationsApi: { ...actual.resignationsApi, mine: vi.fn(), createMine: vi.fn() },
    transferWorkflowApi: {
      ...actual.transferWorkflowApi,
      inbox: vi.fn(),
      mine: vi.fn(),
      createMine: vi.fn(),
      decide: vi.fn(),
      cancel: vi.fn(),
      transferDepartments: vi.fn(),
    },
  }
})

const resignation: ResignationRequest = {
  id: 'rs-1',
  userId: 'user-staff',
  username: 'nhanvien',
  fullName: 'Nhân Viên',
  departmentId: 'dept-1',
  departmentName: 'Tổ Toán – Tin',
  reason: 'Chuyển nơi ở nên xin nghỉ việc.',
  status: 'PENDING',
  requestedBy: 'user-staff',
  requestedByName: 'Nhân Viên',
  requestedAt: '2026-11-15T02:00:00Z',
  decidedBy: null,
  decidedByName: null,
  decidedAt: null,
  decisionNote: null,
}

const pendingTransfer: TransferRequest = {
  id: 'tr-1',
  userId: 'user-staff',
  username: 'nhanvien',
  fullName: 'Nhân Viên',
  fromDepartmentId: 'dept-1',
  fromDepartmentName: 'Tổ Toán – Tin',
  toDepartmentId: 'dept-2',
  toDepartmentName: 'Tổ Ngữ văn',
  reason: 'Nguyện vọng chuyển chuyên môn.',
  status: 'PENDING',
  requestedBy: 'user-staff',
  requestedByName: 'Nhân Viên',
  requestedAt: '2026-11-14T02:00:00Z',
  appliedAt: null,
  steps: [
    { step: 'SOURCE_HEAD', decision: 'PENDING', decidedBy: null, decidedByName: null, decidedAt: null, note: null },
    { step: 'TARGET_HEAD', decision: 'PENDING', decidedBy: null, decidedByName: null, decidedAt: null, note: null },
    { step: 'HR', decision: 'PENDING', decidedBy: null, decidedByName: null, decidedAt: null, note: null },
    { step: 'EMPLOYEE', decision: 'PENDING', decidedBy: null, decidedByName: null, decidedAt: null, note: null },
  ],
  actionableSteps: ['SOURCE_HEAD'],
}

beforeEach(() => {
  vi.mocked(resignationsApi.mine).mockResolvedValue([resignation])
  vi.mocked(resignationsApi.createMine).mockReset()
  vi.mocked(transferWorkflowApi.inbox).mockResolvedValue([])
  vi.mocked(transferWorkflowApi.mine).mockResolvedValue([pendingTransfer])
  vi.mocked(transferWorkflowApi.createMine).mockReset()
  vi.mocked(transferWorkflowApi.decide).mockReset()
  vi.mocked(transferWorkflowApi.cancel).mockReset()
  vi.mocked(transferWorkflowApi.transferDepartments).mockResolvedValue([
    { id: 'dept-1', name: 'Tổ Toán – Tin' },
    { id: 'dept-2', name: 'Tổ Ngữ văn' },
  ])
  signInAs({
    roles: ['STAFF'],
    user: { id: 'user-staff', departmentId: 'dept-1' },
  })
})

describe('MyRequestsPage — tự phục vụ nghỉ việc/điều chuyển', () => {
  it('hiển thị yêu cầu của chính mình, không lẫn yêu cầu phòng ban khác', async () => {
    renderPage(<MyRequestsPage />)

    expect(await screen.findByText('Chuyển nơi ở nên xin nghỉ việc.')).toBeInTheDocument()
    expect(screen.getByText('Chờ duyệt')).toBeInTheDocument()
    expect(resignationsApi.mine).toHaveBeenCalledTimes(1)
  })

  it('gửi yêu cầu nghỉ việc cho chính mình rồi nạp lại danh sách', async () => {
    vi.mocked(resignationsApi.createMine).mockResolvedValue({
      ...resignation,
      id: 'rs-new',
      reason: 'Lý do cá nhân.',
    })

    renderPage(<MyRequestsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /Gửi yêu cầu nghỉ việc/ }))

    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByRole('textbox'), 'Lý do cá nhân.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi yêu cầu' }))

    await waitFor(() =>
      expect(resignationsApi.createMine).toHaveBeenCalledWith('user-staff', 'Lý do cá nhân.'),
    )
    await waitFor(() => expect(vi.mocked(resignationsApi.mine).mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  it('chặn gửi khi thiếu lý do', async () => {
    renderPage(<MyRequestsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /Gửi yêu cầu nghỉ việc/ }))

    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi yêu cầu' }))

    expect(await screen.findByText('Vui lòng nhập lý do nghỉ việc.')).toBeInTheDocument()
    expect(resignationsApi.createMine).not.toHaveBeenCalled()
  })

  it('gửi yêu cầu điều chuyển tới phòng ban khác, không cho chọn phòng hiện tại', async () => {
    vi.mocked(transferWorkflowApi.createMine).mockResolvedValue({
      ...pendingTransfer,
      id: 'tr-new',
    })

    renderPage(<MyRequestsPage />)
    await userEvent.click(await screen.findByRole('tab', { name: /Điều chuyển/ }))
    await userEvent.click(
      await screen.findByRole('button', { name: /Gửi yêu cầu điều chuyển/ }),
    )

    const dialog = await screen.findByRole('dialog')
    const select = within(dialog).getByRole('combobox')
    // Phòng hiện tại không nằm trong danh sách đích.
    expect(within(select).queryByRole('option', { name: 'Tổ Toán – Tin' })).not.toBeInTheDocument()
    await userEvent.selectOptions(select, 'dept-2')
    await userEvent.type(within(dialog).getByRole('textbox'), 'Nguyện vọng chuyên môn.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi yêu cầu' }))

    await waitFor(() =>
      expect(transferWorkflowApi.createMine).toHaveBeenCalledWith({
        userId: 'user-staff',
        toDepartmentId: 'dept-2',
        reason: 'Nguyện vọng chuyên môn.',
      }),
    )
  })

  it('báo tài khoản chưa thuộc phòng ban thì không gửi được yêu cầu', async () => {
    signInAs({ roles: ['STAFF'], user: { id: 'user-staff', departmentId: null } })

    renderPage(<MyRequestsPage />)

    expect(await screen.findByText('Chưa thuộc phòng ban')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Gửi yêu cầu nghỉ việc/ })).not.toBeInTheDocument()
  })

  it('hiển thị tiến độ 4 bước của yêu cầu điều chuyển của chính mình', async () => {
    renderPage(<MyRequestsPage />)
    await userEvent.click(await screen.findByRole('tab', { name: /Điều chuyển/ }))

    expect(await screen.findByText('Tổ Toán – Tin → Tổ Ngữ văn')).toBeInTheDocument()
    expect(screen.getByText(/Trưởng phòng cũ/)).toBeInTheDocument()
    expect(screen.getByText(/Trưởng phòng mới/)).toBeInTheDocument()
    expect(screen.getByText(/Nhân sự/)).toBeInTheDocument()
    expect(screen.getByText(/Nhân viên xác nhận/)).toBeInTheDocument()
    // Chưa tới bước EMPLOYEE thì không có nút xác nhận chuyển.
    expect(screen.queryByRole('button', { name: 'Xác nhận chuyển' })).not.toBeInTheDocument()
  })

  it('nhân sự xác nhận bước EMPLOYEE khi backend trả đúng bước', async () => {
    vi.mocked(transferWorkflowApi.mine).mockResolvedValue([
      {
        ...pendingTransfer,
        steps: pendingTransfer.steps.map((step) =>
          step.step === 'EMPLOYEE' ? { ...step } : { ...step, decision: 'APPROVED' as const },
        ),
        actionableSteps: ['EMPLOYEE'],
      },
    ])
    vi.mocked(transferWorkflowApi.decide).mockResolvedValue(pendingTransfer)

    renderPage(<MyRequestsPage />)
    await userEvent.click(await screen.findByRole('tab', { name: /Điều chuyển/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Xác nhận chuyển' }))

    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByRole('textbox'), 'Tôi đồng ý')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }))

    await waitFor(() =>
      expect(transferWorkflowApi.decide).toHaveBeenCalledWith('tr-1', 'EMPLOYEE', 'approve', {
        note: 'Tôi đồng ý',
      }),
    )
  })

  it('từ chối bước EMPLOYEE gửi quyết định reject', async () => {
    vi.mocked(transferWorkflowApi.mine).mockResolvedValue([
      { ...pendingTransfer, steps: pendingTransfer.steps, actionableSteps: ['EMPLOYEE'] },
    ])
    vi.mocked(transferWorkflowApi.decide).mockResolvedValue(pendingTransfer)

    renderPage(<MyRequestsPage />)
    await userEvent.click(await screen.findByRole('tab', { name: /Điều chuyển/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Từ chối' }))
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Từ chối' }),
    )

    await waitFor(() =>
      expect(transferWorkflowApi.decide).toHaveBeenCalledWith('tr-1', 'EMPLOYEE', 'reject', {
        note: undefined,
      }),
    )
  })

  it('người tạo huỷ được yêu cầu; nhân sự không huỷ thay yêu cầu do HR tạo', async () => {
    vi.mocked(transferWorkflowApi.cancel).mockResolvedValue({
      ...pendingTransfer,
      status: 'CANCELLED',
    })

    renderPage(<MyRequestsPage />)
    await userEvent.click(await screen.findByRole('tab', { name: /Điều chuyển/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Huỷ yêu cầu' }))

    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Huỷ yêu cầu' }))

    await waitFor(() => expect(transferWorkflowApi.cancel).toHaveBeenCalledWith('tr-1', undefined))
  })

  it('ẩn nút huỷ khi yêu cầu do người khác tạo', async () => {
    vi.mocked(transferWorkflowApi.mine).mockResolvedValue([
      { ...pendingTransfer, requestedBy: 'user-hr' },
    ])

    renderPage(<MyRequestsPage />)
    await userEvent.click(await screen.findByRole('tab', { name: /Điều chuyển/ }))

    expect(await screen.findByText('Tổ Toán – Tin → Tổ Ngữ văn')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Huỷ yêu cầu' })).not.toBeInTheDocument()
  })
})
