import { ArrowLeft, Building2, CalendarDays, Layers, Pencil, Plus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/page-header'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { usePermission } from '@/features/auth/hooks'
import { DepartmentFormDialog } from '@/features/organization/components/department-form-dialog'
import { EmployeeCreateDrawer } from '@/features/organization/components/employee-create-drawer'
import { EmployeeDetailDrawer } from '@/features/organization/components/employee-detail-drawer'
import { EmployeeTable } from '@/features/organization/components/employee-table'
import { useDepartment, useEmployeeDirectory } from '@/features/organization/hooks'
import type { EmployeeRow } from '@/features/organization/types'
import { ApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/format'
import { moduleLabel } from '@/lib/modules'
import { PERM } from '@/lib/permissions'

export function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { can } = usePermission()
  const department = useDepartment(id)
  const directory = useEmployeeDirectory()

  const [editOpen, setEditOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createKey, setCreateKey] = useState(0)
  const [selected, setSelected] = useState<EmployeeRow | null>(null)

  const openCreate = () => {
    setCreateKey((value) => value + 1)
    setCreateOpen(true)
  }

  const members = useMemo(
    () => directory.rows.filter((row) => row.departmentId === id),
    [directory.rows, id],
  )
  const teacherCount = members.filter((row) => row.teacher).length

  if (department.isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-3 h-4 w-96" />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="mt-5 h-64" />
      </PageContainer>
    )
  }

  if (department.isError || !department.data) {
    const notFound = ApiError.from(department.error).status === 404
    return (
      <PageContainer>
        {notFound ? (
          <EmptyState
            icon={<Building2 className="size-5" aria-hidden="true" />}
            title="Không tìm thấy phòng ban"
            description="Phòng ban có thể đã bị xoá hoặc bạn không có quyền xem."
            action={{ label: 'Về danh sách phòng ban', onClick: () => history.back(), variant: 'outline' }}
            secondaryAction={{ label: 'Mở danh sách', onClick: () => (window.location.href = '/to-chuc/phong-ban') }}
          />
        ) : (
          <ErrorState
            title="Không tải được phòng ban"
            description={ApiError.from(department.error).message}
            onRetry={() => void department.refetch()}
          />
        )}
      </PageContainer>
    )
  }

  const data = department.data

  return (
    <PageContainer>
      <Link
        to="/to-chuc/phong-ban"
        className="mb-4 inline-flex items-center gap-1.5 rounded-xs text-xs font-medium text-ink-500 hover:text-ink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Danh sách phòng ban
      </Link>

      <PageHeader
        eyebrow="Cơ cấu tổ chức · Phòng ban"
        title={data.name}
        description={data.description ?? 'Phòng ban chưa có mô tả.'}
        actions={
          <>
            {can(PERM.employeeCreate) ? (
              <Button size="sm" onClick={openCreate}>
                <Plus aria-hidden="true" />
                Thêm nhân sự
              </Button>
            ) : null}
            {can(PERM.departmentManage) ? (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil aria-hidden="true" />
                Sửa phòng ban
              </Button>
            ) : null}
          </>
        }
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              Tạo ngày {formatDate(data.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
              <Users className="size-3.5" aria-hidden="true" />
              {members.length} nhân sự
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
              <Layers className="size-3.5" aria-hidden="true" />
              {data.modules.length} module
            </span>
          </>
        }
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink-900">Nhân sự trong phòng ban</h2>
              <p className="text-sm text-ink-500">
                {teacherCount} giáo viên · {members.length - teacherCount} nhân sự khác
              </p>
            </div>
          </div>

          <EmployeeTable
            rows={members}
            isLoading={directory.isLoading}
            onOpen={setSelected}
            showDepartment={false}
            emptyTitle={
              directory.isScoped && directory.scopedDepartmentId !== id
                ? 'Ngoài phạm vi phòng ban của bạn'
                : 'Phòng ban chưa có nhân sự'
            }
            emptyDescription={
              directory.isScoped && directory.scopedDepartmentId !== id
                ? 'Bạn chỉ xem được nhân sự của phòng ban mình công tác.'
                : 'Thêm nhân sự và gán chức vụ để bắt đầu phân công công việc.'
            }
            emptyAction={
              can(PERM.employeeCreate) && (!directory.isScoped || directory.scopedDepartmentId === id)
                ? { label: 'Thêm nhân sự', onClick: openCreate }
                : undefined
            }
          />
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Module của phòng ban</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {data.modules.length === 0 ? (
                <p className="text-sm text-ink-500">
                  Phòng ban chưa gắn module nghiệp vụ nào. Nhân sự vẫn dùng được các quyền nhân sự
                  dùng chung.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.modules.map((code) => (
                    <li
                      key={code}
                      className="flex items-center justify-between rounded-sm border border-line bg-surface-muted px-2.5 py-2 text-sm"
                    >
                      <span className="text-ink-700">{moduleLabel(code)}</span>
                      <Badge tone="success" size="sm">
                        Đang bật
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nguyên tắc phạm vi</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-2 text-xs leading-relaxed text-ink-500">
              <p>
                Nhân sự chỉ thuộc một phòng ban tại một thời điểm. Chuyển phòng phải qua quy trình
                bốn bên.
              </p>
              <p>
                Quyền theo phòng ban chỉ có hiệu lực trong phòng ban đang gán. Quyền cấp tổ chức áp
                dụng toàn tổ chức.
              </p>
              <Button variant="outline" size="sm" className="mt-1 self-start" asChild>
                <Link to="/to-chuc/chuyen-phong">Xem quy trình điều chuyển</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {editOpen ? (
        <DepartmentFormDialog key={data.id} open onOpenChange={setEditOpen} department={data} />
      ) : null}

      <EmployeeCreateDrawer
        key={createKey}
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultDepartmentId={data.id}
      />

      <EmployeeDetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        departmentId={selected?.departmentId ?? null}
        userId={selected?.userId ?? null}
      />
    </PageContainer>
  )
}
