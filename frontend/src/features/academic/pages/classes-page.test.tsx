import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { classesApi, subjectsApi } from '@/features/academic/api'
import type * as AcademicApi from '@/features/academic/api'
import { ClassesPage } from '@/features/academic/pages/classes-page'
import type { SchoolClass, Subject } from '@/features/academic/types'
import { PERM } from '@/lib/permissions'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/academic/api', async (importOriginal) => {
  const actual = await importOriginal<typeof AcademicApi>()
  return {
    ...actual,
    classesApi: { ...actual.classesApi, list: vi.fn(), create: vi.fn() },
    subjectsApi: { ...actual.subjectsApi, list: vi.fn() },
  }
})

const schoolClass: SchoolClass = {
  id: 'class-1',
  orgId: 'org-1',
  classCode: 'LH-10A1',
  name: 'Lớp 10A1',
  academicYear: '2026-2027',
  startDate: null,
  endDate: null,
  status: 'DANG_HOAT_DONG',
  teacher: null,
  closeState: 'NONE',
  version: 1,
  studentCount: 0,
  createdBy: null,
  createdAt: null,
  updatedAt: null,
  cancelReason: null,
  closeRequestNote: null,
  closeRejectReason: null,
  needsReassignment: false,
  reassignmentReason: null,
  subjectId: null,
  subjectName: null,
  cancelState: null,
  cancelRequestReason: null,
}

const subject: Subject = {
  id: 'sub-1',
  code: 'TOAN10',
  name: 'Toán 10',
  description: null,
  active: true,
  createdAt: null,
  updatedAt: null,
}

beforeEach(() => {
  vi.mocked(classesApi.list).mockReset()
  vi.mocked(classesApi.list).mockResolvedValue({ items: [schoolClass], total: 1, page: 1, size: 20 })
  vi.mocked(classesApi.create).mockReset()
  vi.mocked(subjectsApi.list).mockReset()
  vi.mocked(subjectsApi.list).mockResolvedValue([subject])
  signInAs({ permissions: [PERM.classView, PERM.classCreate] })
})

describe('ClassesPage — quyền tạo lớp độc lập với quyền xem', () => {
  it('chỉ có class.create: mở luồng tạo mà không đọc danh sách lớp', async () => {
    vi.mocked(classesApi.create).mockResolvedValue({
      ...schoolClass,
      id: 'class-2',
      classCode: 'LH-10A2',
      name: 'Lớp 10A2',
    })
    signInAs({ roles: ['STAFF'], role: 'STAFF', permissions: [PERM.classCreate] })

    renderPage(<ClassesPage />)

    expect(await screen.findByText('Chỉ có quyền tạo lớp')).toBeInTheDocument()
    expect(classesApi.list).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Tạo lớp' }))
    const dialog = await screen.findByRole('dialog')
    const inputs = within(dialog).getAllByRole('textbox')
    await userEvent.type(inputs[0]!, 'LH-10A2')
    await userEvent.type(inputs[1]!, 'Lớp 10A2')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo lớp' }))

    await waitFor(() =>
      expect(classesApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ classCode: 'LH-10A2', name: 'Lớp 10A2' }),
      ),
    )
    expect(await screen.findByText('Đã tạo lớp học')).toBeInTheDocument()
    expect(screen.getByText('LH-10A2 · Lớp 10A2')).toBeInTheDocument()
    expect(classesApi.list).not.toHaveBeenCalled()
  })

  it('có class.view: hiển thị danh sách lớp', async () => {
    renderPage(<ClassesPage />)

    expect(await screen.findByText('LH-10A1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tạo lớp' })).toBeInTheDocument()
    await waitFor(() => expect(classesApi.list).toHaveBeenCalledTimes(1))
  })
})
