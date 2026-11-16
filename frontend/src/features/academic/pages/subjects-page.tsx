import { useDeferredValue, useState } from 'react'

import { DataTable, type DataColumn } from '@/components/ui/data-table'
import { Alert } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { useSubjects } from '@/features/academic/hooks'
import type { Subject } from '@/features/academic/types'
import { errorMessage } from '@/lib/api-error'
import { formatNumber } from '@/lib/format'

export function SubjectsPage() {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim())
  const subjects = useSubjects(deferredSearch)

  const columns: DataColumn<Subject>[] = [
    {
      id: 'name',
      header: 'Tên môn học',
      cell: (row) => <span className="font-medium text-ink-900">{row.name}</span>,
      sortValue: (row) => row.name,
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Đào tạo · Môn học"
        title="Môn học"
        description="Danh mục môn học đang hoạt động của tổ chức, dùng khi tạo và cập nhật lớp."
        meta={
          <span className="text-xs text-ink-500">
            {formatNumber(subjects.data?.length ?? 0)} môn đang hoạt động
          </span>
        }
      />

      <Alert tone="info" className="mt-5" title="Danh mục chỉ đọc">
        Backend hiện chỉ cung cấp API đọc danh mục môn học. Việc thêm/sửa môn cần bổ sung API quản
        lý môn học trước khi mở thao tác trên giao diện.
      </Alert>

      <div className="mt-4">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Tìm môn học…"
        />
      </div>

      <div className="mt-3">
        <DataTable
          columns={columns}
          data={subjects.data ?? []}
          rowKey={(row) => row.id}
          isLoading={subjects.isLoading}
          error={
            subjects.isError ? (
              <ErrorState
                title="Không tải được danh sách môn học"
                description={errorMessage(subjects.error)}
                onRetry={() => void subjects.refetch()}
              />
            ) : undefined
          }
          empty={<p className="py-8 text-center text-sm text-ink-500">Không có môn học phù hợp.</p>}
          initialPageSize={20}
        />
      </div>
    </PageContainer>
  )
}
