import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { App } from '@/app/app'
import { AppProviders } from '@/app/providers'
import { useSessionStore } from '@/stores/session-store'

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <App />
      </AppProviders>
    </MemoryRouter>,
  )
}

async function signIn(username: string, password: string) {
  await userEvent.type(await screen.findByLabelText(/Tên đăng nhập/), username)
  await userEvent.type(screen.getByLabelText(/^Mật khẩu/), password)
  await userEvent.click(screen.getByRole('button', { name: /^Đăng nhập$/ }))
}

beforeEach(() => {
  localStorage.clear()
  useSessionStore.setState({
    status: 'unauthenticated',
    session: null,
    accessToken: null,
    refreshToken: null,
  })
})

describe('luồng ứng dụng với dữ liệu demo', () => {
  it('chặn người chưa đăng nhập và đưa về trang đăng nhập', async () => {
    renderApp('/to-chuc')

    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('đăng nhập Chủ tổ chức rồi mở bảng điều khiển có dữ liệu thật từ API', async () => {
    renderApp('/dang-nhap')
    await signIn('sample_owner', 'Sample@123456')

    expect(
      await screen.findByRole('heading', { name: 'Bảng điều khiển', level: 1 }, { timeout: 12_000 }),
    ).toBeInTheDocument()

    await waitFor(
      () => {
        expect(screen.getByText('Nhân sự theo phòng ban')).toBeInTheDocument()
        expect(screen.getByText('Tổ Toán – Tin')).toBeInTheDocument()
      },
      { timeout: 12_000 },
    )

    expect(
      screen.getByRole('heading', { name: 'Việc chờ tôi duyệt', level: 3 }),
    ).toBeInTheDocument()

    await waitFor(
      () => {
        expect(useSessionStore.getState().session?.modules).toEqual([
          'STUDENT_MANAGEMENT',
          'TEACHER_MANAGEMENT',
          'CLASS_MANAGEMENT',
        ])
      },
      { timeout: 12_000 },
    )
  }, 30_000)

  it('điều hướng sang danh sách phòng ban từ menu đã lọc theo quyền', async () => {
    renderApp('/dang-nhap')
    await signIn('sample_owner', 'Sample@123456')

    await screen.findByRole('heading', { name: 'Bảng điều khiển', level: 1 }, { timeout: 12_000 })
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' })
    await userEvent.click(within(nav).getByRole('link', { name: 'Phòng ban' }))

    expect(await screen.findByRole('heading', { name: 'Phòng ban', level: 1 })).toBeInTheDocument()
    expect(
      await screen.findByText('Phòng Hành chính – Nhân sự', {}, { timeout: 12_000 }),
    ).toBeInTheDocument()
  }, 30_000)

  it('nạp module đang bật cho OWNER để menu lọc theo module', async () => {
    renderApp('/dang-nhap')
    await signIn('sample_owner', 'Sample@123456')
    await screen.findByRole('heading', { name: 'Bảng điều khiển', level: 1 }, { timeout: 12_000 })

    // Mock: STUDENT/TEACHER/CLASS đang bật, SCHEDULE chưa đăng ký.
    await waitFor(
      () => {
        const modules = useSessionStore.getState().session?.modules ?? []
        expect(modules).toEqual(
          expect.arrayContaining(['STUDENT_MANAGEMENT', 'TEACHER_MANAGEMENT', 'CLASS_MANAGEMENT']),
        )
        expect(modules).not.toContain('SCHEDULE_MANAGEMENT')
      },
      { timeout: 8_000 },
    )
  }, 30_000)

  it('HR chỉ thấy nhân sự trong phòng ban của mình', async () => {
    renderApp('/dang-nhap')
    await signIn('sample_hr', 'Sample@123456')

    await screen.findByRole('heading', { name: 'Bảng điều khiển', level: 1 }, { timeout: 12_000 })

    const scopeHints = await screen.findAllByText(/phòng ban của bạn/i, {}, { timeout: 12_000 })
    expect(scopeHints.length).toBeGreaterThan(0)

    await waitFor(
      () => {
        expect(screen.getByText('Phòng Hành chính – Nhân sự')).toBeInTheDocument()
        expect(screen.queryByText('Tổ Toán – Tin')).not.toBeInTheDocument()
      },
      { timeout: 12_000 },
    )
  }, 30_000)
})
