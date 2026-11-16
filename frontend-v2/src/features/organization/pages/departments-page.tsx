import { Network, Pencil, Plus, RefreshCw, Trash2, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, TableToolbar, type DataColumn } from '@/components/ui/data-table'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Alert, EmptyState } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { usePermission } from '@/features/auth/hooks'
import { DepartmentFormDialog } from '@/features/organization/components/department-form-dialog'
import { useDeleteDepartment } from '@/features/organization/hooks'
import { useHeadcounts } from '@/features/organization/use-headcounts'
import type { Department } from '@/features/organization/types'
import { ApiError } from '@/lib/api-error'
import { formatDate, normalizeForSearch } from '@/lib/format'
import { moduleLabel } from '@/lib/modules'
import { PERM } from '@/lib/permissions'

function MiniStat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-4 py-3 shadow-xs">
      <p className="text-2xs font-medium uppercase tracking-[0.1em] text-ink-400">{label}</p>
      <p className="mt-0.5 text-xl font-semibold text-ink-900 tabular">{value}</p>
      {hint ? <p className="text-2xs text-ink-400">{hint}</p> : null}
    </div>
  )
}

export function DepartmentsPage() {
  const { can } = usePermission()
  const navigate = useNavigate()
  const headcounts = useHeadcounts()
  const removeDepartment = useDeleteDepartment()

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null)

  const canManage = can(PERM.departmentManage)

  const rows = useMemo(() => {
    const needle = normalizeForSearch(search.trim())
    const departments = headcounts.departments
    if (!needle) return departments
    return departments.filter((department) =>
      normalizeForSearch(`${department.name} ${department.description ?? ''}`).includes(needle),
    )
  }, [headcounts.departments, search])

  const countByDepartment = new Map(
    headcounts.byDepartment.map((item) => [item.departmentId, item.total]),
  )
  const usedModules = new Set(headcounts.departments.flatMap((department) => department.modules))

  const columns: DataColumn<Department>[] = [
    {
      id: 'name',
      header: 'Phòng ban',
      sortValue: (department) => department.name,
      cell: (department) => (
        <div className="min-w-0">
          <Link
            to={`/to-chuc/phong-ban/${department.id}`}
            onClick={(event) => event.stopPropagation()}
            className="truncate font-medium text-ink-800 hover:text-jade-800 hover:underline"
          >
            {department.name}
          </Link>
          <p className="line-clamp-1 text-2xs text-ink-400">
            {department.description ?? 'Chưa có mô tả'}
          </p>
        </div>
      ),
    },
    {
      id: 'headcount',
      header: 'Nhân sự',
      align: 'right',
      sortValue: (department) => countByDepartment.get(department.id) ?? -1,
      cell: (department) => {
        const count = countByDepartment.get(department.id)
        if (count === undefined) {
          return (
            <span
              className="text-2xs text-ink-300"
              title="Bạn chỉ xem được số nhân sự của phòng ban mình công tác"
            >
              —
            </span>
          )
        }
        return <span className="text-sm font-medium text-ink-700 tabular">{count}</span>
      },
    },
    {
      id: 'modules',
      header: 'Module',
      hideBelow: 'md',
      cell: (department) =>
        department.modules.length === 0 ? (
          <span className="text-2xs text-ink-400">Chưa gắn module</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {department.modules.slice(0, 2).map((code) => (
              <Badge key={code} tone="neutral" size="sm">
                {moduleLabel(code)}
              </Badge>
            ))}
            {department.modules.length > 2 ? (
              <span className="text-2xs text-ink-400">+{department.modules.length - 2}</span>
            ) : null}
          </div>
        ),
    },
    {
      id: 'createdAt',
      header: 'Ngày tạo',
      hideBelow: 'lg',
      sortValue: (department) => department.createdAt,
      cell: (department) => (
        <span className="text-xs text-ink-500 tabular">{formatDate(department.createdAt)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (department) => (
        <div className="flex justify-end gap-1">
          <button
            type="button"
            className="rounded-sm p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600"
            aria-label={`Xem chi tiết ${department.name}`}
            onClick={(event) => {
              event.stopPropagation()
              navigate(`/to-chuc/phong-ban/${department.id}`)
            }}
          >
            <Users className="size-4" aria-hidden="true" />
          </button>
          {canManage ? (
            <>
              <button
                type="button"
                className="rounded-sm p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600"
                aria-label={`Sửa ${department.name}`}
                onClick={(event) => {
                  event.stopPropagation()
                  setEditing(department)
                  setFormOpen(true)
                }}
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="rounded-sm p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600"
                aria-label={`Xoá ${department.name}`}
                onClick={(event) => {
                  event.stopPropagation()
                  setDeleteTarget(department)
                }}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Tổ chức · Cơ cấu"
        title="Phòng ban"
        description="Mỗi nhân sự thuộc một phòng ban tại một thời điểm. Module gắn theo phòng ban quyết định phạm vi nghiệp vụ."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void headcounts.refetch()}>
              <RefreshCw aria-hidden="true" />
              Làm mới
            </Button>
            {canManage ? (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
              >
                <Plus aria-hidden="true" />
                Thêm phòng ban
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniStat label="Phòng ban" value={headcounts.departments.length} />
        <MiniStat
          label="Nhân sự"
          value={headcounts.totalEmployees}
          hint={
            headcounts.isScoped
              ? `${headcounts.activeEmployees} đang làm việc · phòng ban của bạn`
              : `${headcounts.activeEmployees} đang làm việc`
          }
        />
        <MiniStat
          label="Module đang dùng"
          value={usedModules.size}
          hint="Tổng hợp từ các phòng ban"
        />
      </div>

      {headcounts.isScoped ? (
        <Alert tone="info" className="mt-4" title="Số nhân sự theo phạm vi">
          Bạn chỉ xem được danh sách và số lượng nhân sự của phòng ban mình công tác; các phòng ban
          khác hiển thị “—”.
        </Alert>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-lg border border-line bg-surface shadow-xs">
        <TableToolbar
          actions={
            <span className="text-xs text-ink-400">
              {rows.length} phòng ban{search ? ` khớp “${search}”` : ''}
            </span>
          }
        >
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Tìm phòng ban theo tên hoặc mô tả…"
            aria-label="Tìm phòng ban"
          />
        </TableToolbar>

        {headcounts.isError ? (
          <div className="p-4">
            <ErrorState
              title="Không tải được danh sách phòng ban"
              description={ApiError.from(headcounts.error).message}
              onRetry={headcounts.refetch}
            />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            rowKey={(department) => department.id}
            isLoading={headcounts.isLoading}
            onRowClick={(department) => navigate(`/to-chuc/phong-ban/${department.id}`)}
            initialPageSize={10}
            empty={
              <EmptyState
                icon={<Network className="size-5" aria-hidden="true" />}
                title={search ? 'Không tìm thấy phòng ban' : 'Chưa có phòng ban'}
                description={
                  search
                    ? 'Thử từ khoá khác hoặc xoá bộ lọc.'
                    : 'Tạo phòng ban đầu tiên để bắt đầu bố trí nhân sự và module nghiệp vụ.'
                }
                action={
                  canManage && !search
                    ? {
                        label: 'Thêm phòng ban',
                        onClick: () => {
                          setEditing(null)
                          setFormOpen(true)
                        },
                      }
                    : undefined
                }
                secondaryAction={search ? { label: 'Xoá tìm kiếm', onClick: () => setSearch('') } : undefined}
              />
            }
          />
        )}
      </div>

      {formOpen ? (
        <DepartmentFormDialog
          key={editing?.id ?? 'new'}
          open
          onOpenChange={setFormOpen}
          department={editing}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Xoá phòng ban?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” chỉ xoá được khi không còn nhân sự. Hành động không thể hoàn tác.`
            : undefined
        }
        confirmLabel="Xoá phòng ban"
        isLoading={removeDepartment.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          removeDepartment.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success('Đã xoá phòng ban')
              setDeleteTarget(null)
            },
            onError: (error) => toast.error(ApiError.from(error).message),
          })
        }}
      />
    </PageContainer>
  )
}
