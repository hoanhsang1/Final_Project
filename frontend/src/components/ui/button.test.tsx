import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('render nội dung và gọi onClick', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Lưu thay đổi</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('khi đang tải thì khoá nút và hiển thị nhãn chờ', () => {
    render(
      <Button isLoading loadingText="Đang lưu…">
        Lưu
      </Button>,
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveTextContent('Đang lưu…')
  })

  it('áp dụng biến thể nguy hiểm', () => {
    render(<Button variant="danger">Xoá</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-danger-500')
  })
})
