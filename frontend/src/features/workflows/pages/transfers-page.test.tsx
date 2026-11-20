import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { departmentsApi, positionsApi } from '@/features/organization/api'
import type * as OrganizationApi from '@/features/organization/api'
import type { Department, Member, MemberDetail, TransferRequest } from '@/features/organization/types'
import { transferWorkflowApi } from '@/features/workflows/api'
import type * as WorkflowsApi from '@/features/workflows/api'
import { TransfersPage } from '@/features/workflows/pages/transfers-page'
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
      memberDetail: vi.fn(),
    },
    positionsApi: { ...actual.positionsApi, list: vi.fn() },
  }
})

vi.mock('@/features/workflows/api', async (importOriginal) => {
  const actual = await importOriginal<typeof WorkflowsApi>()
  return {
    ...actual,
    transferWorkflowApi: {
      ...actual.transferWorkflowApi,
      inbox: vi.fn(),
      mine: vi.fn(),
      create: vi.fn(),
      decide: vi.fn(),
      cancel: vi.fn(),
    },
  }
})

const from: Department = {
  id: 'dept-1',
  name: 'Tổ Toán – Tin',
  description: null,
  createdAt: '2026-01-01T00:00:00Z',
  modules: [],
}

const to: Department = {
  ...from,
  id: 'dept-2',
  name: 'Phòng Hành chính – Nhân sự',
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

const detail: MemberDetail = {
  ...member,
  departmentName: 'Tổ Toán – Tin',
  fullName: 'Giáo viên A',
  email: 'gv.a@example.test',
  phone: null,
  staffCode: 'GV001',
  teacher: true,
  contractType: 'CO_HUU',
  teachingStatus: 'DANG_DAY',
  classCount: 2,
  classLabel: null,
  assignmentHistory: [],
}

const pendingInbox: TransferRequest = {
  id: 'trf-1',
  userId: 'user-9',
  username: 'giao.vien',
  fullName: 'Giáo viên A',
  fromDepartmentId: 'dept-1',
  fromDepartmentName: 'Tổ Toán – Tin',
  toDepartmentId: 'dept-2',
  toDepartmentName: 'Phòng Hành chính – Nhân sự',
  reason: 'Nhu cầu chuyên môn',
  status: 'PENDING',
  requestedBy: 'user-owner',
  requestedByName: 'Trưởng phòng',
  requestedAt: '2026-02-01T08:00:00Z',
  appliedAt: null,
  steps: [],
  actionableSteps: ['SOURCE_HEAD'],
}

beforeEach(() => {
  vi.mocked(departmentsApi.list).mockResolvedValue([from, to])
  vi.mocked(departmentsApi.members).mockResolvedValue([])
  vi.mocked(departmentsApi.memberDetail).mockResolvedValue(detail)
  vi.mocked(positionsApi.list).mockResolvedValue([])
  vi.mocked(transferWorkflowApi.inbox).mockResolvedValue([pendingInbox])
  vi.mocked(transferWorkflowApi.mine).mockResolvedValue([])
  vi.mocked(transferWorkflowApi.create).mockReset()
  vi.mocked(transferWorkflowApi.decide).mockReset()
  vi.mocked(transferWorkflowApi.cancel).mockReset()
  signInAs({ permissions: [PERM.employeeTransfer, PERM.employeeView] })
})

describe('TransfersPage — luồng điều chuyển', () => {
  it('hiển thị bước chờ duyệt và gửi quyết định duyệt đúng bước', async () => {
    vi.mocked(transferWorkflowApi.decide).mockResolvedValue({
      ...pendingInbox,
      status: 'APPROVED',
    })

    renderPage(<TransfersPage />)

    expect(await screen.findByText(/Giáo viên A · Tổ Toán – Tin → Phòng Hành chính/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Xử lý bước đang chờ' }))

    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Duyệt' }))

    await waitFor(() =>
      expect(transferWorkflowApi.decide).toHaveBeenCalledWith(
        'trf-1',
        'SOURCE_HEAD',
        'approve',
        { note: undefined },
      ),
    )
    await waitFor(() => expect(transferWorkflowApi.inbox).toHaveBeenCalledTimes(2))
  })

  it('người tạo huỷ được yêu cầu đang chờ ở tab của tôi', async () => {
    vi.mocked(transferWorkflowApi.inbox).mockResolvedValue([])
    vi.mocked(transferWorkflowApi.mine).mockResolvedValue([
      { ...pendingInbox, actionableSteps: [] },
    ])
    vi.mocked(transferWorkflowApi.cancel).mockResolvedValue({
      ...pendingInbox,
      status: 'CANCELLED',
    })

    renderPage(<TransfersPage />)
    await userEvent.click(await screen.findByRole('tab', { name: /Yêu cầu tôi tạo/ }))

    await userEvent.click(await screen.findByRole('button', { name: 'Huỷ yêu cầu' }))
    const confirm = await screen.findByRole('dialog')
    await userEvent.click(within(confirm).getByRole('button', { name: 'Huỷ yêu cầu' }))

    await waitFor(() =>
      expect(transferWorkflowApi.cancel).toHaveBeenCalledWith('trf-1', undefined),
    )
  })

  it('kiểm tra dữ liệu bắt buộc trước khi tạo yêu cầu điều chuyển', async () => {
    renderPage(<TransfersPage />)
    await screen.findByText(/Giáo viên A · Tổ Toán – Tin → Phòng Hành chính/)

    await userEvent.click(screen.getByRole('button', { name: 'Tạo yêu cầu' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo yêu cầu' }))

    expect(
      (await within(dialog).findAllByText('Chọn nhân sự cần điều chuyển.')).length,
    ).toBeGreaterThan(0)
    expect(transferWorkflowApi.create).not.toHaveBeenCalled()
  })

  it('ẩn nút tạo khi thiếu quyền điều chuyển', async () => {
    signInAs({ roles: ['STAFF'], role: 'STAFF', permissions: [] })

    renderPage(<TransfersPage />)
    await screen.findByRole('tab', { name: /Hộp chờ tôi duyệt/ })
    expect(screen.queryByRole('button', { name: 'Tạo yêu cầu' })).not.toBeInTheDocument()
  })
})
