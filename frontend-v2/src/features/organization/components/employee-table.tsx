import { UserRound } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { DataTable, type DataColumn } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/feedback'
import {
  MEMBER_STATUS_LABELS,
  ROLE_LABELS,
  TEACHING_STATUS_LABELS,
  type EmployeeRow,
} from '@/features/organization/types'
import { getInitials } from '@/lib/format'

export function EmployeeTable({
  rows,
  isLoading,
  onOpen,
  showDepartment = true,
  emptyTitle = 'Chưa có nhân sự',
  emptyDescription = 'Thêm nhân sự đầu tiên hoặc đổi bộ lọc để xem kết quả khác.',
  emptyAction,
}: {
  rows: EmployeeRow[]
  isLoading: boolean
  onOpen: (row: EmployeeRow) => void
  showDepartment?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: { label: string; onClick: () => void }
}) {
  const columns: DataColumn<EmployeeRow>[] = [
    {
      id: 'name',
      header: 'Nhân sự',
      sortValue: (row) => row.fullName ?? row.username,
      cell: (row) => {
        const name = row.fullName ?? row.username
        return (
          <div className="flex items-center gap-2.5">
            <Avatar size="sm">
              <AvatarFallback>{getInitials(name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink-800">{name}</p>
              <p className="truncate text-2xs text-ink-400">@{row.username}</p>
            </div>
          </div>
        )
      },
    },
    {
      id: 'staffCode',
      header: 'Mã NV',
      hideBelow: 'lg',
      sortValue: (row) => row.staffCode ?? '',
      cell: (row) => (
        <span className="font-mono text-2xs text-ink-600">{row.staffCode ?? '—'}</span>
      ),
    },
    ...(showDepartment
      ? [
          {
            id: 'department',
            header: 'Phòng ban',
            hideBelow: 'md' as const,
            sortValue: (row: EmployeeRow) => row.departmentName,
            cell: (row: EmployeeRow) => (
              <span className="text-sm text-ink-600">{row.departmentName}</span>
            ),
          },
        ]
      : []),
    {
      id: 'positions',
      header: 'Chức vụ',
      hideBelow: 'sm',
      cell: (row) => {
        if (row.positionNames.length === 0) {
          return <span className="text-2xs text-ink-400">Chưa gán chức vụ</span>
        }
        const visible = row.positionNames.slice(0, 2)
        return (
          <div className="flex flex-wrap items-center gap-1">
            {visible.map((name) => (
              <Badge key={name} tone="neutral" size="sm">
                {name}
              </Badge>
            ))}
            {row.positionNames.length > 2 ? (
              <span className="text-2xs text-ink-400">+{row.positionNames.length - 2}</span>
            ) : null}
          </div>
        )
      },
    },
    {
      id: 'role',
      header: 'Vai trò',
      hideBelow: 'lg',
      sortValue: (row) => row.role,
      cell: (row) => <span className="text-xs text-ink-600">{ROLE_LABELS[row.role] ?? row.role}</span>,
    },
    {
      id: 'status',
      header: 'Trạng thái',
      sortValue: (row) => row.status,
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <Badge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'} dot>
            {MEMBER_STATUS_LABELS[row.status] ?? row.status}
          </Badge>
          {row.teacher && row.teachingStatus ? (
            <span
              className={
                row.teachingStatus === 'DANG_DAY'
                  ? 'text-2xs text-success-600'
                  : row.teachingStatus === 'TAM_NGHI'
                    ? 'text-2xs text-warning-600'
                    : 'text-2xs text-ink-400'
              }
            >
              {TEACHING_STATUS_LABELS[row.teachingStatus]}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onOpen(row)
          }}
          className="rounded-sm px-2 py-1 text-xs font-medium text-jade-700 hover:bg-jade-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600"
        >
          Hồ sơ
        </button>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(row) => `${row.departmentId}-${row.userId}`}
      isLoading={isLoading}
      onRowClick={onOpen}
      initialPageSize={10}
      empty={
        <EmptyState
          icon={<UserRound className="size-5" aria-hidden="true" />}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      }
    />
  )
}
