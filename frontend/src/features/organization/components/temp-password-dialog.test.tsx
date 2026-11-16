import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TempPasswordDialog } from '@/features/organization/components/temp-password-dialog'

describe('TempPasswordDialog', () => {
  it('hiển thị tài khoản và mật khẩu tạm đúng một lần', () => {
    render(
      <TempPasswordDialog
        info={{ username: 'nguyen.van.a', password: 'Mems@abc123#26', fullName: 'Nguyễn Văn A' }}
        onClose={() => undefined}
      />,
    )

    expect(screen.getByText('nguyen.van.a')).toBeInTheDocument()
    expect(screen.getByText('Mems@abc123#26')).toBeInTheDocument()
    expect(screen.getByText(/Nguyễn Văn A/)).toBeInTheDocument()
    expect(screen.getByText(/chỉ hiển thị một lần/i)).toBeInTheDocument()
  })

  it('chỉ đóng khi người dùng xác nhận đã lưu', async () => {
    const onClose = vi.fn()
    render(
      <TempPasswordDialog
        info={{ username: 'u1', password: 'p1' }}
        onClose={onClose}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Tôi đã lưu mật khẩu' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
