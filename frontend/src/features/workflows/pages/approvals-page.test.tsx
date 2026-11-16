import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { departmentsApi } from '@/features/organization/api'
import type * as OrganizationApi from '@/features/organization/api'
import type { Department, Member } from '@/features/organization/types'
import { resignationsApi, transferWorkflowApi } from '@/features/workflows/api'
import type * as WorkflowsApi from '@/features/workflows/api'
import { ApprovalsPage } from '@/features/workflows/pages/approvals-page'
import type { ResignationRequest } from '@/features/workflows/types'
import { ApiError } from '@/lib/api-error'
import { PERM } from '@/lib/permissions'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/organization/api', async (importOriginal) => {
  const actual = await importOriginal<typeof OrganizationApi>()
  return {
    ...actual,
    departmentsApi: {
      ...actual.departmentsApi,
      list: vi.fn(),
      members: vi.fn(),
    },
  }
})

vi.mock('@/features/workflows/api', async (importOriginal) => {
  const actual = await importOriginal<typeof WorkflowsApi>()
  return {
    ...actual,
    resignationsApi: {
      ...actual.resignationsApi,
      list: vi.fn(),
      create: vi.fn(),
      decide: vi.fn(),
    },
    transferWorkflowApi: {
      ...actual.transferWorkflowApi,
      inbox: vi.fn(),
    },
  }
})

const department: Department = {
  id: 'dept-1',
  name: 'Tổ Toán – Tin',
  description: null,
  createdAt: '2026-01-01T00:00:00Z',
  modules: [],
}

const member: Member = {
  userId: 'user-9',
  username: 'giao.vien',
  departmentId: 'dept-1',
  role: 'STAFF',
  status: 'ACTIVE',
  appointedBy: null,
  appointedAt: '2026-01-01T00:00:00Z',
  positionIds: [],
  permissions: [],
}

const request: ResignationRequest = {
  id: 'res-1',
  userId: 'user-9',
  username: 'giao.vien',
  fullName: 'Giáo viên A',
  departmentId: 'dept-1',
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

beforeEach(() => {
  vi.mocked(departmentsApi.list).mockResolvedValue([department])
  vi.mocked(departmentsApi.members).mockResolvedValue([member])
  vi.mocked(transferWorkflowApi.inbox).mockResolvedValue([])
  vi.mocked(resignationsApi.list).mockResolvedValue([request])
  vi.mocked(resignationsApi.decide).mockReset()
  vi.mocked(resignationsApi.create).mockReset()
})

async function openResignationsTab() {
  await userEvent.click(await screen.findByRole('tab', { name: /Nghỉ việc/ }))
}

describe('ApprovalsPage — hộp duyệt nghỉ việc', () => {
  it('quản lý có quyền duyệt thấy nút quyết định và duyệt được yêu cầu', async () => {
    vi.mocked(resignationsApi.decide).mockResolvedValue({ ...request, status: 'APPROVED' })
    signInAs({
      roles: ['MANAGER'],
      role: 'MANAGER',
      permissions: [PERM.employeeApproveResignation],
    })

    renderPage(<ApprovalsPage />)
    await openResignationsTab()

    expect(await screen.findByText('Giáo viên A')).toBeInTheDocument()
    expect(screen.getByText('Chuyển công tác')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Chấp thuận' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Giáo viên A/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Chấp thuận' }))

    await waitFor(() =>
      expect(resignationsApi.decide).toHaveBeenCalledWith(
        'dept-1',
        'res-1',
        'approve',
        undefined,
      ),
    )
    await waitFor(() => expect(resignationsApi.list).toHaveBeenCalledTimes(2))
  })

  it('người không có thẩm quyền chỉ xem được yêu cầu', async () => {
    signInAs({ roles: ['STAFF'], role: 'STAFF', permissions: [] })

    renderPage(<ApprovalsPage />)
    await openResignationsTab()

    expect(await screen.findByText('Giáo viên A')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Chấp thuận' })).not.toBeInTheDocument()
    expect(
      screen.getByText(/người có thẩm quyền theo DEC-08 sẽ quyết định/),
    ).toBeInTheDocument()
  })

  it('hiển thị lỗi API khi tải hộp nghỉ việc', async () => {
    signInAs({ roles: ['MANAGER'], role: 'MANAGER', permissions: [PERM.employeeApproveResignation] })
    vi.mocked(resignationsApi.list).mockRejectedValue(
      new ApiError({ status: 403, message: 'Bạn không có quyền xem hộp nghỉ việc của phòng ban này.' }),
    )

    renderPage(<ApprovalsPage />)
    await openResignationsTab()

    expect(
      await screen.findByText(
        'Bạn không có quyền xem hộp nghỉ việc của phòng ban này.',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
  })

  it('HR tạo yêu cầu nghỉ việc cho nhân sự đang hoạt động', async () => {
    signInAs({ permissions: [PERM.employeeResign] })
    vi.mocked(resignationsApi.create).mockResolvedValue({ ...request, id: 'res-2' })

    renderPage(<ApprovalsPage />)
    await openResignationsTab()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Tạo yêu cầu nghỉ việc' }),
    )
    const dialog = await screen.findByRole('dialog')
    await userEvent.selectOptions(within(dialog).getByRole('combobox'), 'user-9')
    await userEvent.type(within(dialog).getByRole('textbox'), 'Hết hợp đồng')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo yêu cầu' }))

    await waitFor(() =>
      expect(resignationsApi.create).toHaveBeenCalledWith('dept-1', {
        userId: 'user-9',
        reason: 'Hết hợp đồng',
      }),
    )
  })
})
