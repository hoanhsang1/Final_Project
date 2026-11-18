import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { permissionsApi, delegationsApi, generalManagerApi } from '@/features/workflows/api'
import type * as WorkflowsApi from '@/features/workflows/api'
import { DelegationsPage } from '@/features/workflows/pages/delegations-page'
import type { Delegation, GeneralManager } from '@/features/workflows/types'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/workflows/api', async (importOriginal) => {
  const actual = await importOriginal<typeof WorkflowsApi>()
  return {
    ...actual,
    delegationsApi: {
      ...actual.delegationsApi,
      list: vi.fn(),
      mine: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      revoke: vi.fn(),
    },
    generalManagerApi: {
      ...actual.generalManagerApi,
      list: vi.fn(),
      candidates: vi.fn(),
      appoint: vi.fn(),
      remove: vi.fn(),
    },
    permissionsApi: {
      ...actual.permissionsApi,
      catalog: vi.fn(),
    },
  }
})

const manager: GeneralManager = {
  userId: 'gm-1',
  username: 'tong.quan.ly',
  fullName: 'Tổng quản lý',
  departmentId: null,
  departmentName: 'Trường Test',
  appointedAt: '2026-01-05T00:00:00Z',
}

const delegation: Delegation = {
  id: 'del-1',
  delegatorId: 'owner-1',
  delegatorName: 'Chủ tổ chức',
  delegateId: 'gm-1',
  delegateName: 'Tổng quản lý',
  delegateUsername: 'tong.quan.ly',
  delegateDepartmentId: null,
  delegateDepartmentName: 'Trường Test',
  permissions: ['employee.approve_resignation'],
  scope: 'ORGANIZATION',
  effectiveFrom: '2026-01-10T00:00:00Z',
  effectiveTo: null,
  status: 'ACTIVE',
  active: true,
  reason: 'Đi công tác',
  createdAt: '2026-01-10T00:00:00Z',
  revokedAt: null,
  revokedReason: null,
}

beforeEach(() => {
  vi.mocked(generalManagerApi.list).mockResolvedValue([manager])
  vi.mocked(generalManagerApi.candidates).mockResolvedValue([])
  vi.mocked(delegationsApi.list).mockResolvedValue([delegation])
  vi.mocked(delegationsApi.mine).mockResolvedValue([])
  vi.mocked(permissionsApi.catalog).mockResolvedValue([
    {
      code: 'employee.approve_resignation',
      description: 'Duyệt nghỉ việc',
      moduleCode: 'TEACHER_MANAGEMENT',
      allowedScopes: ['ORGANIZATION'],
    },
  ])
  vi.mocked(delegationsApi.create).mockReset()
  vi.mocked(delegationsApi.revoke).mockReset()
  vi.mocked(generalManagerApi.appoint).mockReset()
})

describe('DelegationsPage — uỷ quyền và Tổng quản lý', () => {
  it('OWNER thấy danh sách Tổng quản lý và tạo uỷ quyền', async () => {
    signInAs()
    vi.mocked(delegationsApi.create).mockResolvedValue(delegation)

    renderPage(<DelegationsPage />)

    expect(await screen.findByText('Tổng quản lý')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: /Uỷ quyền \(/ }))
    expect(await screen.findByText('employee.approve_resignation')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Tạo uỷ quyền' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.selectOptions(within(dialog).getByRole('combobox'), 'gm-1')
    await userEvent.click(within(dialog).getByLabelText('employee.approve_resignation'))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo uỷ quyền' }))

    await waitFor(() =>
      expect(delegationsApi.create).toHaveBeenCalledWith({
        delegateId: 'gm-1',
        permissions: ['employee.approve_resignation'],
        effectiveFrom: undefined,
        effectiveTo: undefined,
        reason: undefined,
      }),
    )
    await waitFor(() => expect(delegationsApi.list).toHaveBeenCalledTimes(2))
  })

  it('không có quyền OWNER thì không gọi API quản trị uỷ quyền', async () => {
    signInAs({ roles: ['STAFF'], role: 'STAFF', permissions: [] })
    vi.mocked(delegationsApi.mine).mockResolvedValue([
      { ...delegation, delegatorId: 'owner-1' },
    ])

    renderPage(<DelegationsPage />)

    expect(await screen.findByText('Chế độ chỉ xem')).toBeInTheDocument()
    expect(await screen.findByText(/Từ Chủ tổ chức/)).toBeInTheDocument()
    expect(delegationsApi.list).not.toHaveBeenCalled()
    expect(generalManagerApi.list).not.toHaveBeenCalled()
    expect(generalManagerApi.candidates).not.toHaveBeenCalled()
  })

  it('thu hồi uỷ quyền đòi lý do và refetch danh sách', async () => {
    signInAs()
    vi.mocked(delegationsApi.revoke).mockResolvedValue({ ...delegation, active: false })

    renderPage(<DelegationsPage />)
    await userEvent.click(await screen.findByRole('tab', { name: /Uỷ quyền \(/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Thu hồi' }))

    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thu hồi' }))
    expect(delegationsApi.revoke).not.toHaveBeenCalled()

    await userEvent.type(within(dialog).getByRole('textbox'), 'Kết thúc công tác')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thu hồi' }))

    await waitFor(() =>
      expect(delegationsApi.revoke).toHaveBeenCalledWith('del-1', 'Kết thúc công tác'),
    )
    await waitFor(() => expect(delegationsApi.list).toHaveBeenCalledTimes(2))
  })

  it('bổ nhiệm Tổng quản lý từ danh sách ứng viên và refetch', async () => {
    signInAs()
    vi.mocked(generalManagerApi.candidates).mockResolvedValue([
      {
        userId: 'user-7',
        username: 'ung.vien',
        fullName: 'Ứng viên A',
        departmentId: 'dept-1',
        departmentName: 'Tổ Toán – Tin',
      },
    ])
    vi.mocked(generalManagerApi.appoint).mockResolvedValue(manager)

    renderPage(<DelegationsPage />)

    expect(await screen.findByText('Ứng viên A')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Bổ nhiệm' }))

    await waitFor(() =>
      expect(generalManagerApi.appoint).toHaveBeenCalledWith('user-7', undefined),
    )
    await waitFor(() => expect(generalManagerApi.list).toHaveBeenCalledTimes(2))
  })
})
