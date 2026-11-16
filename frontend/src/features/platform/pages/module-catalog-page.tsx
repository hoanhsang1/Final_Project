import { Blocks } from 'lucide-react'
import { useDeferredValue, useState } from 'react'

import { DataTable, type DataColumn } from '@/components/ui/data-table'
import { Alert } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { useModuleCatalog } from '@/features/platform/hooks'
import type { ModuleCatalogItem } from '@/features/platform/types'
import { errorMessage } from '@/lib/api-error'

export function ModuleCatalogPage() {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim().toLowerCase())
  const catalog = useModuleCatalog()

  const rows = (catalog.data ?? []).filter(
    (item) =>
      !deferredSearch ||
      item.code.toLowerCase().includes(deferredSearch) ||
      item.name.toLowerCase().includes(deferredSearch),
  )

  const columns: DataColumn<ModuleCatalogItem>[] = [
    {
      id: 'code',
      header: 'Mã module',
      cell: (row) => <span className="font-mono text-xs text-ink-700">{row.code}</span>,
      sortValue: (row) => row.code,
    },
    {
      id: 'name',
      header: 'Tên module',
      cell: (row) => <span className="font-medium text-ink-900">{row.name}</span>,
      sortValue: (row) => row.name,
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Quản trị hệ thống · Module"
        title="Danh mục module"
        description="Các module đang hoạt động trên toàn hệ thống, dùng khi duyệt và cấu hình tổ chức."
        meta={
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
            <Blocks className="size-3.5" aria-hidden="true" />
            {catalog.data?.length ?? 0} module
          </span>
        }
      />

      <Alert tone="info" className="mt-5" title="Danh mục chỉ đọc">
        Backend hiện chỉ cung cấp API đọc danh mục module. Thêm/sửa/ngừng module cần bổ sung API quản
        trị danh mục trước khi mở thao tác trên giao diện.
      </Alert>

      <div className="mt-4">
        <SearchInput value={search} onValueChange={setSearch} placeholder="Tìm module…" />
      </div>

      <div className="mt-3">
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(row) => row.code}
          isLoading={catalog.isLoading}
          error={
            catalog.isError ? (
              <ErrorState
                title="Không tải được danh mục module"
                description={errorMessage(catalog.error)}
                onRetry={() => void catalog.refetch()}
              />
            ) : undefined
          }
          empty={<p className="py-8 text-center text-sm text-ink-500">Không có module phù hợp.</p>}
          initialPageSize={30}
        />
      </div>
    </PageContainer>
  )
}
