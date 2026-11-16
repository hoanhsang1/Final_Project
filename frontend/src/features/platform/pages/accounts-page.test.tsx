import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { accountsApi, organizationsApi } from '@/features/platform/api'
import { AccountsPage } from '@/features/platform/pages/accounts-page'
import type { AccountRow } from '@/features/platform/types'
import { ApiError } from '@/lib/api-error'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/platform/api', () => ({
  accountsApi: {
    list: vi.fn(),
    create: vi.fn(),
    updateRole: vi.fn(),
    updateStatus: vi.fn(),
    resetPassword: vi.fn(),
  },
  organizationsApi: {
    list: vi.fn(),
  },
}))

const row: AccountRow = {
  id: 'acc-1',
  username: 'giao.vu',
  email: 'giaovu@example.test',
  fullName: 'Giáo vụ',
  organizationId: 'org-1',
  organizationName: 'Trường Test',
  role: 'STAFF',
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  lastLoginAt: null,
}

beforeEach(() => {
  vi.mocked(accountsApi.list).mockResolvedValue({ items: [row], total: 1, page: 1, size: 20 })
  vi.mocked(organizationsApi.list).mockResolvedValue({
    items: [
      {
        id: 'org-1',
        name: 'Trường Test',
        orgType: 'SCHOOL',
        status: 'active',
        createdAt: null,
        ownerUsername: 'owner.test',
        ownerEmail: 'owner@example.test',
      },
    ],
    total: 1,
    page: 1,
    size: 100,
  })
  vi.mocked(accountsApi.create).mockReset()
  vi.mocked(accountsApi.resetPassword).mockReset()
  signInAs({ permissions: ['system.account.manage'] })
})

describe('AccountsPage — hợp đồng mật khẩu tạm', () => {
  it('hiển thị mật khẩu tạm backend trả về sau khi tạo tài khoản', async () => {
    vi.mocked(accountsApi.create).mockResolvedValue({
      ...row,
      id: 'acc-2',
      username: 'nguyen.van.a',
      email: 'nguyen.van.a@example.test',
      temporaryPassword: 'Temp@abc123',
    })

    renderPage(<AccountsPage />)
    await screen.findByText('giao.vu')

    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/Email/), 'nguyen.van.a@example.test')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }))

    expect(
      await screen.findByRole('heading', { name: 'Thông tin đăng nhập được tạo' }),
    ).toBeInTheDocument()
    expect(screen.getByText('nguyen.van.a')).toBeInTheDocument()
    expect(screen.getByText('Temp@abc123')).toBeInTheDocument()
    expect(accountsApi.create).toHaveBeenCalledWith({
      email: 'nguyen.van.a@example.test',
      role: 'STAFF',
      organizationId: undefined,
    })
  })

  it('không mở hộp mật khẩu tạm khi backend không trả temporaryPassword', async () => {
    vi.mocked(accountsApi.create).mockResolvedValue({
      ...row,
      id: 'acc-3',
      username: 'tran.van.b',
      temporaryPassword: '',
    })

    renderPage(<AccountsPage />)
    await screen.findByText('giao.vu')

    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/Email/), 'tran.van.b@example.test')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(
      screen.queryByRole('heading', { name: 'Thông tin đăng nhập được tạo' }),
    ).not.toBeInTheDocument()
  })

  it('hiển thị lỗi API khi tạo tài khoản thất bại và giữ hộp thoại', async () => {
    vi.mocked(accountsApi.create).mockRejectedValue(
      new ApiError({ status: 409, code: 'EMAIL_EXISTS', message: 'Email đã tồn tại.' }),
    )

    renderPage(<AccountsPage />)
    await screen.findByText('giao.vu')

    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/Email/), 'giao.vu@example.test')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }))

    expect(await screen.findByText('Email đã tồn tại.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('hiển thị mật khẩu tạm mới sau khi đặt lại mật khẩu', async () => {
    vi.mocked(accountsApi.resetPassword).mockResolvedValue({ temporaryPassword: 'Reset@12345' })

    renderPage(<AccountsPage />)
    await screen.findByText('giao.vu')

    await userEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Đặt lại' }))

    expect(
      await screen.findByRole('heading', { name: 'Thông tin đăng nhập được tạo' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Reset@12345')).toBeInTheDocument()
    expect(accountsApi.resetPassword).toHaveBeenCalledWith('acc-1', undefined)
  })
})
