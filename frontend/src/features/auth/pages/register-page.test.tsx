import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authApi } from '@/features/auth/api'
import type * as AuthApi from '@/features/auth/api'
import { RegisterPage } from '@/features/auth/pages/register-page'
import type { RegisterOrganizationResponse } from '@/types/session'
import { ApiError } from '@/lib/api-error'
import { renderPage } from '@/tests/render-page'

vi.mock('@/features/auth/api', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthApi>()
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      register: vi.fn(),
      publicModules: vi.fn(),
    },
  }
})

const registered: RegisterOrganizationResponse = {
  organizationId: 'org-new',
  accountId: 'acc-new',
  organizationStatus: 'PENDING',
  accountStatus: 'PENDING',
  requestedModules: ['STUDENT_MANAGEMENT'],
}

beforeEach(() => {
  vi.mocked(authApi.publicModules).mockResolvedValue([
    { code: 'STUDENT_MANAGEMENT', name: 'Quản lý học sinh' },
    { code: 'SCHEDULE_MANAGEMENT', name: 'Quản lý lịch học' },
  ])
  vi.mocked(authApi.register).mockReset()
})

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText(/Tên tổ chức/), 'Trường THPT Nguyễn Du')
  await userEvent.type(screen.getByLabelText(/Tên đăng nhập chủ tổ chức/), 'nguyen.du')
  await userEvent.type(screen.getByLabelText(/^Email/), 'admin@nguyendu.edu.vn')
  await userEvent.type(screen.getByLabelText(/^Mật khẩu/), 'MatKhauRatDai123')
  await userEvent.type(screen.getByLabelText(/Xác nhận mật khẩu/), 'MatKhauRatDai123')
  await userEvent.click(await screen.findByLabelText(/Quản lý học sinh/))
}

describe('RegisterPage — đăng ký tổ chức công khai', () => {
  it('tải danh mục module công khai từ API', async () => {
    renderPage(<RegisterPage />)

    expect(await screen.findByLabelText(/Quản lý học sinh/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Quản lý lịch học/)).toBeInTheDocument()
    expect(authApi.publicModules).toHaveBeenCalledTimes(1)
  })

  it('chặn gửi khi thiếu dữ liệu bắt buộc', async () => {
    renderPage(<RegisterPage />)
    await screen.findByLabelText(/Quản lý học sinh/)

    await userEvent.click(screen.getByRole('button', { name: /Gửi đăng ký/ }))

    expect(await screen.findByText('Vui lòng nhập tên tổ chức.')).toBeInTheDocument()
    expect(screen.getByText('Tên đăng nhập phải từ 3 đến 100 ký tự.')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng nhập email.')).toBeInTheDocument()
    expect(screen.getByText('Mật khẩu phải có ít nhất 12 ký tự.')).toBeInTheDocument()
    expect(screen.getByText('Chọn ít nhất một module.')).toBeInTheDocument()
    expect(authApi.register).not.toHaveBeenCalled()
  })

  it('báo lỗi khi mật khẩu xác nhận không khớp', async () => {
    renderPage(<RegisterPage />)
    await screen.findByLabelText(/Quản lý học sinh/)

    await userEvent.type(screen.getByLabelText(/Tên tổ chức/), 'Trung tâm A')
    await userEvent.type(screen.getByLabelText(/Tên đăng nhập chủ tổ chức/), 'trungtam.a')
    await userEvent.type(screen.getByLabelText(/^Email/), 'a@trungtam.vn')
    await userEvent.type(screen.getByLabelText(/^Mật khẩu/), 'MatKhauRatDai123')
    await userEvent.type(screen.getByLabelText(/Xác nhận mật khẩu/), 'MatKhauKhac123')
    await userEvent.click(await screen.findByLabelText(/Quản lý học sinh/))
    await userEvent.click(screen.getByRole('button', { name: /Gửi đăng ký/ }))

    expect(await screen.findByText('Mật khẩu xác nhận không khớp.')).toBeInTheDocument()
    expect(authApi.register).not.toHaveBeenCalled()
  })

  it('gửi đăng ký đúng payload rồi hiển thị trạng thái chờ duyệt', async () => {
    vi.mocked(authApi.register).mockResolvedValue(registered)
    renderPage(<RegisterPage />)

    await fillValidForm()
    await userEvent.selectOptions(screen.getByLabelText(/Loại hình/), 'CENTER')
    await userEvent.click(screen.getByRole('button', { name: /Gửi đăng ký/ }))

    await waitFor(() =>
      expect(authApi.register).toHaveBeenCalledWith({
        organizationName: 'Trường THPT Nguyễn Du',
        orgType: 'CENTER',
        username: 'nguyen.du',
        email: 'admin@nguyendu.edu.vn',
        password: 'MatKhauRatDai123',
        modules: ['STUDENT_MANAGEMENT'],
      }),
    )

    expect(await screen.findByText('Đã gửi đăng ký tổ chức')).toBeInTheDocument()
    const card = screen.getByText('Module đề nghị').closest('div')!
    expect(within(card).getByText('Quản lý học sinh')).toBeInTheDocument()
    expect(screen.getByText(/chờ quản trị hệ thống duyệt/)).toBeInTheDocument()
  })

  it('dịch lỗi trùng tên đăng nhập từ backend', async () => {
    vi.mocked(authApi.register).mockRejectedValue(
      new AxiosError('Conflict', 'ERR_BAD_RESPONSE', undefined, undefined, {
        status: 409,
        statusText: 'Conflict',
        headers: {},
        config: {} as never,
        data: { code: 'USERNAME_EXISTS', message: 'Username already exists' },
      }),
    )
    renderPage(<RegisterPage />)

    await fillValidForm()
    await userEvent.click(screen.getByRole('button', { name: /Gửi đăng ký/ }))

    expect(
      await screen.findByText('Tên đăng nhập đã tồn tại.', {}, { timeout: 3000 }),
    ).toBeInTheDocument()
  })

  it('báo lỗi khi không tải được danh mục module', async () => {
    vi.mocked(authApi.publicModules).mockRejectedValue(
      new ApiError({ status: 503, message: 'Dịch vụ tạm thời không phản hồi.' }),
    )
    renderPage(<RegisterPage />)

    expect(
      await screen.findByText('Không tải được danh mục module', {}, { timeout: 3000 }),
    ).toBeInTheDocument()
  })
})
