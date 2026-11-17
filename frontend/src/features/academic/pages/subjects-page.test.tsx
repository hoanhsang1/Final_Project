import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { subjectsApi } from '@/features/academic/api'
import type * as AcademicApi from '@/features/academic/api'
import { SubjectsPage } from '@/features/academic/pages/subjects-page'
import type { Subject } from '@/features/academic/types'
import { PERM } from '@/lib/permissions'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/academic/api', async (importOriginal) => {
  const actual = await importOriginal<typeof AcademicApi>()
  return {
    ...actual,
    subjectsApi: {
      ...actual.subjectsApi,
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      setActive: vi.fn(),
    },
  }
})

const math: Subject = {
  id: 'sub-1',
  code: 'TOAN10',
  name: 'Toán 10',
  description: 'Đại số và hình học',
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
}

const retired: Subject = {
  id: 'sub-2',
  code: null,
  name: 'Tin học cũ',
  description: null,
  active: false,
  createdAt: null,
  updatedAt: null,
}

beforeEach(() => {
  vi.mocked(subjectsApi.list).mockReset()
  vi.mocked(subjectsApi.list).mockResolvedValue([math])
  vi.mocked(subjectsApi.create).mockReset()
  vi.mocked(subjectsApi.update).mockReset()
  vi.mocked(subjectsApi.setActive).mockReset()
  signInAs({
    permissions: [PERM.subjectView, PERM.subjectManage],
    moduleStates: { STUDENT_MANAGEMENT: 'active' },
  })
})

describe('SubjectsPage — danh mục môn học', () => {
  it('hiển thị môn học kèm mã và trạng thái', async () => {
    renderPage(<SubjectsPage />)

    expect(await screen.findByText('Toán 10')).toBeInTheDocument()
    expect(screen.getByText('TOAN10')).toBeInTheDocument()
    expect(screen.getByText('Đang dùng')).toBeInTheDocument()
  })

  it('tạo môn học mới và refetch danh sách', async () => {
    vi.mocked(subjectsApi.create).mockResolvedValue({ ...math, id: 'sub-3', code: null, name: 'Văn 10' })

    renderPage(<SubjectsPage />)
    await screen.findByText('Toán 10')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm môn học' }))
    const dialog = await screen.findByRole('dialog')
    const inputs = within(dialog).getAllByRole('textbox')
    await userEvent.type(inputs[1]!, 'Văn 10')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo môn học' }))

    await waitFor(() =>
      expect(subjectsApi.create).toHaveBeenCalledWith({
        code: undefined,
        name: 'Văn 10',
        description: undefined,
      }),
    )
    await waitFor(() => expect(subjectsApi.list).toHaveBeenCalledTimes(2))
  })

  it('chặn tạo môn học khi thiếu tên', async () => {
    renderPage(<SubjectsPage />)
    await screen.findByText('Toán 10')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm môn học' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo môn học' }))

    expect(await within(dialog).findByText('Vui lòng nhập tên môn học.')).toBeInTheDocument()
    expect(subjectsApi.create).not.toHaveBeenCalled()
  })

  it('ngừng dùng môn học sau khi xác nhận', async () => {
    vi.mocked(subjectsApi.setActive).mockResolvedValue({ ...math, active: false })

    renderPage(<SubjectsPage />)
    await screen.findByText('Toán 10')

    await userEvent.click(screen.getByRole('button', { name: 'Ngừng dùng' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Ngừng dùng môn học')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ngừng dùng' }))

    await waitFor(() => expect(subjectsApi.setActive).toHaveBeenCalledWith('sub-1', false))
    await waitFor(() => expect(subjectsApi.list).toHaveBeenCalledTimes(2))
  })

  it('cho phép xem cả môn đã ngừng dùng', async () => {
    vi.mocked(subjectsApi.list).mockResolvedValue([math, retired])

    renderPage(<SubjectsPage />)
    await screen.findByText('Toán 10')

    await userEvent.click(screen.getByRole('checkbox', { name: 'Hiện cả môn đã ngừng dùng' }))

    await waitFor(() =>
      expect(subjectsApi.list).toHaveBeenCalledWith({ q: undefined, includeInactive: true }),
    )
    expect(await screen.findByText('Tin học cũ')).toBeInTheDocument()
  })

  it('ẩn thao tác ghi khi chỉ có quyền xem', async () => {
    signInAs({
      roles: ['STAFF'],
      role: 'STAFF',
      permissions: [PERM.subjectView],
      moduleStates: { STUDENT_MANAGEMENT: 'active' },
    })

    renderPage(<SubjectsPage />)
    await screen.findByText('Toán 10')

    expect(screen.queryByRole('button', { name: 'Thêm môn học' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sửa' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ngừng dùng' })).not.toBeInTheDocument()
  })

  it('ẩn thao tác ghi khi module quản lý sinh viên bị tắt', async () => {
    signInAs({
      permissions: [PERM.subjectView, PERM.subjectManage],
      moduleStates: { STUDENT_MANAGEMENT: 'disabled' },
    })

    renderPage(<SubjectsPage />)
    await screen.findByText('Toán 10')

    expect(screen.queryByRole('button', { name: 'Thêm môn học' })).not.toBeInTheDocument()
    expect(screen.getByText(/chế độ chỉ đọc/)).toBeInTheDocument()
  })
})
