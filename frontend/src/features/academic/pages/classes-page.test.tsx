import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { classesApi, curriculaApi, subjectsApi } from '@/features/academic/api'
import type * as AcademicApi from '@/features/academic/api'
import { ClassesPage } from '@/features/academic/pages/classes-page'
import type { CurriculumSummary, SchoolClass, Subject } from '@/features/academic/types'
import { PERM } from '@/lib/permissions'
import { renderPage, signInAs } from '@/tests/render-page'

vi.mock('@/features/academic/api', async (importOriginal) => {
  const actual = await importOriginal<typeof AcademicApi>()
  return {
    ...actual,
    classesApi: { ...actual.classesApi, list: vi.fn(), create: vi.fn() },
    curriculaApi: { ...actual.curriculaApi, list: vi.fn() },
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
  status: 'DANG_DIEN_RA',
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

const curriculum: CurriculumSummary = {
  id: 'cur-1',
  code: 'CT10',
  name: 'Chương trình 10',
  gradeLevel: '10',
  isActive: true,
  version: 0,
  subjectCount: 2,
}

beforeAll(() => {
  // Radix Select dùng Pointer Capture — jsdom chưa hỗ trợ.
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.setPointerCapture ??= () => undefined
})

beforeEach(() => {
  vi.mocked(classesApi.list).mockReset()
  vi.mocked(classesApi.list).mockResolvedValue({ items: [schoolClass], total: 1, page: 1, size: 20 })
  vi.mocked(classesApi.create).mockReset()
  vi.mocked(subjectsApi.list).mockReset()
  vi.mocked(subjectsApi.list).mockResolvedValue([subject])
  vi.mocked(curriculaApi.list).mockReset()
  vi.mocked(curriculaApi.list).mockResolvedValue({ items: [curriculum], total: 1, page: 1, size: 100 })
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

  it('tạo lớp không gửi trạng thái — backend luôn khởi tạo CHUA_BAT_DAU', async () => {
    vi.mocked(classesApi.create).mockResolvedValue(schoolClass)
    renderPage(<ClassesPage />)
    await screen.findByText('LH-10A1')

    await userEvent.click(screen.getByRole('button', { name: 'Tạo lớp' }))
    const dialog = await screen.findByRole('dialog')
    const inputs = within(dialog).getAllByRole('textbox')
    await userEvent.type(inputs[0]!, 'LH-10A3')
    await userEvent.type(inputs[1]!, 'Lớp 10A3')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo lớp' }))

    await waitFor(() => expect(classesApi.create).toHaveBeenCalled())
    expect(vi.mocked(classesApi.create).mock.calls[0]?.[0]).not.toHaveProperty('status')
  })

  it('tạo lớp kèm chương trình: gửi curriculumId để backend áp môn ngay', async () => {
    vi.mocked(classesApi.create).mockResolvedValue(schoolClass)
    renderPage(<ClassesPage />)
    await screen.findByText('LH-10A1')

    await userEvent.click(screen.getByRole('button', { name: 'Tạo lớp' }))
    const dialog = await screen.findByRole('dialog')
    const inputs = within(dialog).getAllByRole('textbox')
    await userEvent.type(inputs[0]!, 'LH-10C1')
    await userEvent.type(inputs[1]!, 'Lớp 10C1')
    await userEvent.click(within(dialog).getAllByRole('combobox')[1]!)
    await userEvent.click(await screen.findByRole('option', { name: 'Chương trình 10 (CT10)' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo lớp' }))

    await waitFor(() =>
      expect(classesApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ classCode: 'LH-10C1', curriculumId: 'cur-1' }),
      ),
    )
  })

  it('bộ lọc trạng thái dùng đúng mã trạng thái của backend', async () => {
    renderPage(<ClassesPage />)
    await screen.findByText('LH-10A1')

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: 'Đang diễn ra' }))

    await waitFor(() =>
      expect(classesApi.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'DANG_DIEN_RA' }),
      ),
    )
  })
})
