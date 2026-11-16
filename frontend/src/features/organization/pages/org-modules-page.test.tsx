import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { orgModulesApi } from '@/features/organization/api'
import type * as OrganizationApi from '@/features/organization/api'
import { OrgModulesPage } from '@/features/organization/pages/org-modules-page'
import type { OrganizationModule } from '@/features/organization/types'
import { ApiError } from '@/lib/api-error'
import { useSessionStore } from '@/stores/session-store'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/organization/api', async (importOriginal) => {
  const actual = await importOriginal<typeof OrganizationApi>()
  return {
    ...actual,
    orgModulesApi: {
      ...actual.orgModulesApi,
      mine: vi.fn(),
      status: vi.fn(),
      toggle: vi.fn(),
    },
  }
})

const modules: OrganizationModule[] = [
  { code: 'STUDENT_MANAGEMENT', name: 'Quản lý sinh viên', isCore: true, status: 'active', lockedByAdmin: false },
  { code: 'FACILITY_MANAGEMENT', name: 'Quản lý cơ sở vật chất', isCore: false, status: 'disabled', lockedByAdmin: false },
  { code: 'EQUIPMENT_MANAGEMENT', name: 'Quản lý thiết bị', isCore: false, status: 'locked', lockedByAdmin: true },
]

/** Hàng trả về từ GET /api/v1/modules/status (snake_case như backend). */
const statusRows = modules.map((module) => ({
  code: module.code,
  name: module.name,
  is_core: module.isCore,
  status: module.status,
}))

beforeEach(() => {
  vi.mocked(orgModulesApi.mine).mockResolvedValue(modules)
  vi.mocked(orgModulesApi.status).mockResolvedValue(statusRows)
  vi.mocked(orgModulesApi.toggle).mockReset()
  signInAs()
})

describe('OrgModulesPage — quản lý module tổ chức', () => {
  it('khóa module lõi và module bị quản trị hệ thống khóa', async () => {
    renderPage(<OrgModulesPage />)

    const core = await screen.findByRole('switch', { name: 'Tắt Quản lý sinh viên' })
    expect(core).toBeDisabled()
    expect(core).toHaveAttribute('aria-checked', 'true')

    const locked = screen.getByRole('switch', { name: 'Bật Quản lý thiết bị' })
    expect(locked).toBeDisabled()
    expect(screen.getByText('Cần SUPER_ADMIN')).toBeInTheDocument()
  })

  it('bật module tùy chọn sau khi xác nhận và nạp lại module cho phiên', async () => {
    vi.mocked(orgModulesApi.toggle).mockResolvedValue(undefined)
    // Sau khi bật, FACILITY chuyển active và trạng thái nạp lại phản ánh điều đó.
    vi.mocked(orgModulesApi.status).mockResolvedValue(
      statusRows.map((row) =>
        row.code === 'FACILITY_MANAGEMENT' ? { ...row, status: 'active' } : row,
      ),
    )

    renderPage(<OrgModulesPage />)

    await userEvent.click(
      await screen.findByRole('switch', { name: 'Bật Quản lý cơ sở vật chất' }),
    )
    expect(await screen.findByText('Bật module?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Bật module' }))

    await waitFor(() =>
      expect(orgModulesApi.toggle).toHaveBeenCalledWith('FACILITY_MANAGEMENT', true),
    )
    // onSuccess refetch danh sách module + hydrate trạng thái module vào phiên.
    await waitFor(() =>
      expect(vi.mocked(orgModulesApi.mine).mock.calls.length).toBeGreaterThanOrEqual(2),
    )
    await waitFor(() => expect(orgModulesApi.status).toHaveBeenCalled())
    await waitFor(() =>
      expect(useSessionStore.getState().session?.modules).toEqual([
        'STUDENT_MANAGEMENT',
        'FACILITY_MANAGEMENT',
      ]),
    )
    expect(useSessionStore.getState().session?.moduleStates?.FACILITY_MANAGEMENT).toBe('active')
  })

  it('giữ nguyên trạng thái và báo lỗi khi bật module thất bại', async () => {
    vi.mocked(orgModulesApi.toggle).mockRejectedValue(
      new ApiError({ status: 409, message: 'Module đang bị khóa bởi quản trị hệ thống.' }),
    )

    renderPage(<OrgModulesPage />)

    await userEvent.click(
      await screen.findByRole('switch', { name: 'Bật Quản lý cơ sở vật chất' }),
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Bật module' }))

    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Bật Quản lý cơ sở vật chất' })).toHaveAttribute(
        'aria-checked',
        'false',
      ),
    )
    expect(orgModulesApi.mine).toHaveBeenCalledTimes(1)
  })

  it('hiển thị thông báo backend chưa hỗ trợ endpoint module', async () => {
    vi.mocked(orgModulesApi.mine).mockRejectedValue(new ApiError({ status: 404, message: 'Not found' }))

    renderPage(<OrgModulesPage />)

    expect(
      await screen.findByText('Backend đang chạy chưa hỗ trợ endpoint này', {}, { timeout: 3000 }),
    ).toBeInTheDocument()
  })
})
