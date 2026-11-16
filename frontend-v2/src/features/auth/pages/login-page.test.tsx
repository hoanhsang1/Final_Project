import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers'
import { LoginPage } from '@/features/auth/pages/login-page'

function renderLogin() {
  return render(
    <MemoryRouter>
      <AppProviders>
        <LoginPage />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('bắt buộc nhập tên đăng nhập và mật khẩu', async () => {
    renderLogin()

    await userEvent.click(screen.getByRole('button', { name: /^Đăng nhập$/ }))

    expect(await screen.findByText('Vui lòng nhập tên đăng nhập.')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeInTheDocument()
  })

  it('hiển thị lối tắt quên mật khẩu và đăng ký tổ chức', () => {
    renderLogin()
    expect(screen.getByRole('link', { name: 'Quên mật khẩu?' })).toHaveAttribute(
      'href',
      '/quen-mat-khau',
    )
    expect(screen.getByRole('link', { name: 'Đăng ký tổ chức' })).toHaveAttribute(
      'href',
      '/dang-ky',
    )
  })

  it('cho phép hiện mật khẩu để kiểm tra khi nhập', async () => {
    renderLogin()
    const input = screen.getByLabelText(/Mật khẩu/)
    expect(input).toHaveAttribute('type', 'password')

    await userEvent.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }))
    expect(input).toHaveAttribute('type', 'text')
  })
})
