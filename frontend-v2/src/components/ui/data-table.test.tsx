import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { DataTable, type DataColumn } from '@/components/ui/data-table'

interface Row {
  id: string
  name: string
  count: number
}

const rows: Row[] = [
  { id: '1', name: 'Tổ Toán', count: 12 },
  { id: '2', name: 'Tổ Văn', count: 7 },
  { id: '3', name: 'Phòng Đào tạo', count: 5 },
]

const columns: DataColumn<Row>[] = [
  { id: 'name', header: 'Tên', cell: (row) => row.name, sortValue: (row) => row.name },
  { id: 'count', header: 'Nhân sự', cell: (row) => row.count, sortValue: (row) => row.count },
]

function bodyRows() {
  return within(screen.getAllByRole('rowgroup')[1]!).getAllByRole('row')
}

describe('DataTable', () => {
  it('phân trang phía client theo số dòng mỗi trang', async () => {
    render(<DataTable columns={columns} data={rows} rowKey={(row) => row.id} initialPageSize={2} />)

    expect(bodyRows()).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    expect(bodyRows()).toHaveLength(1)
    expect(screen.getByText('Phòng Đào tạo')).toBeInTheDocument()
  })

  it('sắp xếp khi bấm tiêu đề cột', async () => {
    render(<DataTable columns={columns} data={rows} rowKey={(row) => row.id} initialPageSize={10} />)

    await userEvent.click(screen.getByRole('button', { name: /Nhân sự/ }))
    expect(bodyRows()[0]).toHaveTextContent('Phòng Đào tạo')
  })

  it('hiển thị trạng thái rỗng thay vì bảng trống', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        rowKey={(row) => row.id}
        empty={<p>Chưa có phòng ban nào</p>}
      />,
    )
    expect(screen.getByText('Chưa có phòng ban nào')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('hiển thị lỗi thay cho dữ liệu khi tải thất bại', () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(row) => row.id}
        error={<p>Không tải được danh sách</p>}
      />,
    )
    expect(screen.getByText('Không tải được danh sách')).toBeInTheDocument()
  })
})
