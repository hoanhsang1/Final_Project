import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { PERM } from '@/lib/permissions'
import { AcademicLanding } from '@/routes/academic-landing'
import { signInAs } from '@/tests/render-page'

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/dao-tao']}>
      <Routes>
        <Route path="/dao-tao" element={<AcademicLanding />} />
        <Route path="/dao-tao/lop-hoc" element={<p>Trang lớp học</p>} />
        <Route path="/dao-tao/lop-cua-toi" element={<p>Trang lớp của tôi</p>} />
        <Route path="/dao-tao/giao-vien" element={<p>Trang giáo viên</p>} />
        <Route path="/ho-so" element={<p>Trang hồ sơ</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AcademicLanding — chọn trang đích theo quyền hiệu lực', () => {
  it('giáo viên vào thẳng lớp của mình thay vì trang giáo viên bị chặn', async () => {
    signInAs({ roles: ['STAFF'], permissions: [PERM.classSelfView, PERM.scheduleSelfView] })

    renderLanding()

    expect(await screen.findByText('Trang lớp của tôi')).toBeInTheDocument()
  })

  it('người quản lý lớp vào danh sách lớp học', async () => {
    signInAs({ roles: ['STAFF'], permissions: [PERM.classView] })

    renderLanding()

    expect(await screen.findByText('Trang lớp học')).toBeInTheDocument()
  })

  it('không có quyền đào tạo nào thì về hồ sơ cá nhân', async () => {
    signInAs({ roles: ['STAFF'], permissions: [] })

    renderLanding()

    expect(await screen.findByText('Trang hồ sơ')).toBeInTheDocument()
  })
})
