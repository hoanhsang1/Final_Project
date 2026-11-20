import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DepartmentFormDialog } from '@/features/organization/components/department-form-dialog'
import { departmentsApi } from '@/features/organization/api'
import type * as OrganizationApi from '@/features/organization/api'
import type { Department } from '@/features/organization/types'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/organization/api', async (importOriginal) => {
  const actual = await importOriginal<typeof OrganizationApi>()
  return {
    ...actual,
    departmentsApi: {
      ...actual.departmentsApi,
      create: vi.fn(),
      update: vi.fn(),
      moduleImpact: vi.fn(),
    },
  }
})

const department: Department = {
  id: 'dept-1',
  name: 'Tổ Toán – Tin',
  description: 'Chuyên môn toán tin',
  createdAt: '2026-01-01T00:00:00Z',
  modules: ['SCHEDULE_MANAGEMENT', 'STUDENT_MANAGEMENT'],
}

beforeEach(() => {
  vi.mocked(departmentsApi.moduleImpact).mockResolvedValue({
    removedModules: ['SCHEDULE_MANAGEMENT'],
    positions: [{ id: 'pos-1', name: 'Trưởng bộ môn', permissions: ['schedule.view'], members: 3 }],
    affectedMembers: 5,
  })
  vi.mocked(departmentsApi.update).mockReset()
  signInAs()
})

describe('DepartmentFormDialog — cảnh báo gỡ module', () => {
  it('gọi module-impact khi bỏ chọn module và hiển thị số người bị ảnh hưởng', async () => {
    renderPage(
      <DepartmentFormDialog open onOpenChange={() => undefined} department={department} />,
    )

    await userEvent.click(screen.getByLabelText('Quản lý lịch học'))

    await waitFor(() =>
      expect(departmentsApi.moduleImpact).toHaveBeenCalledWith('dept-1', ['SCHEDULE_MANAGEMENT']),
    )
    const alert = await screen.findByRole('status')
    expect(within(alert).getByText(/Gỡ Quản lý lịch học ảnh hưởng/)).toBeInTheDocument()
    expect(alert).not.toBeNull()
    expect(within(alert as HTMLElement).getByText('5')).toBeInTheDocument()
    expect(
      within(alert as HTMLElement).getByText(/Trưởng bộ môn \(3\)/),
    ).toBeInTheDocument()
  })

  it('vẫn cho lưu khi API cảnh báo ảnh hưởng lỗi', async () => {
    vi.mocked(departmentsApi.moduleImpact).mockRejectedValue(new Error('boom'))
    vi.mocked(departmentsApi.update).mockResolvedValue({
      ...department,
      modules: ['STUDENT_MANAGEMENT'],
    })

    renderPage(
      <DepartmentFormDialog open onOpenChange={() => undefined} department={department} />,
    )

    await userEvent.click(screen.getByLabelText('Quản lý lịch học'))
    expect(
      await screen.findByText(
        'Không tải được cảnh báo ảnh hưởng; vẫn có thể lưu thay đổi.',
        undefined,
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    await waitFor(() =>
      expect(departmentsApi.update).toHaveBeenCalledWith('dept-1', {
        name: 'Tổ Toán – Tin',
        description: 'Chuyên môn toán tin',
        moduleCodes: ['STUDENT_MANAGEMENT'],
      }),
    )
  })

  it('chặn lưu khi tên phòng ban rỗng', async () => {
    renderPage(
      <DepartmentFormDialog open onOpenChange={() => undefined} department={department} />,
    )

    await userEvent.clear(screen.getByLabelText(/Tên phòng ban/))
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    expect(await screen.findByText('Vui lòng nhập tên phòng ban.')).toBeInTheDocument()
    expect(departmentsApi.update).not.toHaveBeenCalled()
  })

  it('chỉ cho chọn module có quyền nghiệp vụ, giữ nguyên module cũ khi lưu', async () => {
    const legacy: Department = {
      ...department,
      modules: ['STUDENT_MANAGEMENT', 'SCHEDULE_MANAGEMENT', 'CLASS_MANAGEMENT'],
    }
    vi.mocked(departmentsApi.update).mockResolvedValue(legacy)

    renderPage(<DepartmentFormDialog open onOpenChange={() => undefined} department={legacy} />)

    // CLASS_MANAGEMENT không còn gắn quyền nào nên không hiện để chọn thêm/bỏ.
    expect(screen.queryByLabelText('Quản lý lớp học')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Quản lý giáo viên')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Quản lý sinh viên')).toBeInTheDocument()
    expect(screen.getByLabelText('Quản lý lịch học')).toBeInTheDocument()
    expect(screen.getByLabelText('Cơ sở vật chất')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    await waitFor(() =>
      expect(departmentsApi.update).toHaveBeenCalledWith('dept-1', {
        name: 'Tổ Toán – Tin',
        description: 'Chuyên môn toán tin',
        moduleCodes: ['STUDENT_MANAGEMENT', 'SCHEDULE_MANAGEMENT', 'CLASS_MANAGEMENT'],
      }),
    )
  })
})
