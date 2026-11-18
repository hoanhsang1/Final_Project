import { GraduationCap, Plus, RefreshCw, SlidersHorizontal, UserRound, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/feedback'
import { Field } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { usePermission } from '@/features/auth/hooks'
import { EmployeeCreateDrawer } from '@/features/organization/components/employee-create-drawer'
import { EmployeeDetailDrawer } from '@/features/organization/components/employee-detail-drawer'
import { EmployeeTable } from '@/features/organization/components/employee-table'
import { useEmployeeDirectory } from '@/features/organization/hooks'
import type { EmployeeRow } from '@/features/organization/types'
import { ApiError } from '@/lib/api-error'
import { normalizeForSearch } from '@/lib/format'
import { PERM } from '@/lib/permissions'

export function EmployeesPage() {
  const { can } = usePermission()
  const directory = useEmployeeDirectory()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState<string>('all')
  const [role, setRole] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [kind, setKind] = useState<'all' | 'teacher' | 'staff'>('all')
  const [createOpenState, setCreateOpenState] = useState(false)
  const [createKey, setCreateKey] = useState(0)
  const [selected, setSelected] = useState<EmployeeRow | null>(null)

  const defaultDepartmentId = searchParams.get('phongBan') ?? undefined
  const openFromQuery = searchParams.get('them') === '1' && can(PERM.employeeCreate)
  const createOpen = createOpenState || openFromQuery

  const openCreate = () => {
    setCreateKey((value) => value + 1)
    setCreateOpenState(true)
  }
  const effectiveDepartmentId = directory.isScoped
    ? (directory.scopedDepartmentId ?? 'all')
    : departmentId

  const closeCreate = (open: boolean) => {
    setCreateOpenState(open)
    if (!open && searchParams.has('them')) {
      const next = new URLSearchParams(searchParams)
      next.delete('them')
      setSearchParams(next, { replace: true })
    }
  }

  const rows = useMemo(() => {
    const needle = normalizeForSearch(search.trim())
    return directory.rows.filter((row) => {
      if (effectiveDepartmentId !== 'all' && row.departmentId !== effectiveDepartmentId) return false
      if (role !== 'all' && row.role !== role) return false
      if (status !== 'all' && row.status !== status) return false
      if (kind === 'teacher' && !row.teacher) return false
      if (kind === 'staff' && row.teacher) return false
      if (!needle) return true
      return normalizeForSearch(
        [
          row.fullName ?? '',
          row.username,
          row.staffCode ?? '',
          row.email ?? '',
          row.departmentName,
          ...row.positionNames,
        ].join(' '),
      ).includes(needle)
    })
  }, [directory.rows, effectiveDepartmentId, kind, role, search, status])

  const teachers = directory.rows.filter((row) => row.teacher).length
  const active = directory.rows.filter((row) => row.status === 'ACTIVE').length
  const hasFilters =
    Boolean(search) ||
    (!directory.isScoped && departmentId !== 'all') ||
    role !== 'all' ||
    status !== 'all' ||
    kind !== 'all'

  const resetFilters = () => {
    setSearch('')
    if (!directory.isScoped) setDepartmentId('all')
    setRole('all')
    setStatus('all')
    setKind('all')
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Tổ chức · Nhân sự"
        title="Nhân sự"
        description="Danh bạ nhân sự toàn tổ chức. Mỗi người thuộc một phòng ban và có thể giữ nhiều chức vụ."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void directory.refetch()}>
              <RefreshCw aria-hidden="true" />
              Làm mới
            </Button>
            {can(PERM.employeeCreate) ? (
              <Button size="sm" onClick={openCreate}>
                <Plus aria-hidden="true" />
                Thêm nhân sự
              </Button>
            ) : null}
          </>
        }
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
              <Users className="size-3.5" aria-hidden="true" />
              {directory.rows.length} nhân sự
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
              <span className="size-1.5 rounded-full bg-success-500" aria-hidden="true" />
              {active} đang làm việc
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
              <GraduationCap className="size-3.5" aria-hidden="true" />
              {teachers} giáo viên
            </span>
          </>
        }
      />

      {directory.isScoped ? (
        <Alert tone="info" className="mt-5" title="Phạm vi phòng ban của bạn">
          Tài khoản của bạn chỉ có quyền xem nhân sự trong phòng ban đang công tác. Danh sách và số
          liệu bên dưới đã được giới hạn theo phạm vi này.
        </Alert>
      ) : null}

      {directory.isError ? (
        <div className="mt-6">
          <ErrorState
            title="Không tải được danh sách nhân sự"
            description={ApiError.from(directory.error).message}
            onRetry={directory.refetch}
          />
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-xs">
          <div className="flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Tìm kiếm" labelSize="sm">
                <SearchInput
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Tên, tài khoản, mã NV, email…"
                  aria-label="Tìm nhân sự"
                  containerClassName="sm:max-w-none"
                />
              </Field>
              <Field label="Phòng ban" labelSize="sm">
                <Select
                  value={effectiveDepartmentId}
                  onValueChange={(value) => setDepartmentId(value)}
                  disabled={directory.isScoped}
                >
                  <SelectTrigger aria-label="Lọc theo phòng ban">
                    <SelectValue placeholder="Mọi phòng ban" />
                  </SelectTrigger>
                  <SelectContent>
                    {directory.isScoped ? null : <SelectItem value="all">Mọi phòng ban</SelectItem>}
                    {directory.departments
                      .filter(
                        (department) =>
                          !directory.isScoped || department.id === directory.scopedDepartmentId,
                      )
                      .map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Loại nhân sự" labelSize="sm">
                <Select value={kind} onValueChange={(value) => setKind(value as typeof kind)}>
                  <SelectTrigger aria-label="Lọc theo loại nhân sự">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="teacher">Giáo viên</SelectItem>
                    <SelectItem value="staff">Nhân viên</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Trạng thái" labelSize="sm">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger aria-label="Lọc theo trạng thái">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Mọi trạng thái</SelectItem>
                    <SelectItem value="ACTIVE">Đang làm việc</SelectItem>
                    <SelectItem value="RESIGNED">Đã nghỉ việc</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-40" aria-label="Lọc theo vai trò">
                  <SelectValue placeholder="Vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Mọi vai trò</SelectItem>
                  <SelectItem value="OWNER">Chủ tổ chức</SelectItem>
                  <SelectItem value="MANAGER">Quản lý</SelectItem>
                  <SelectItem value="STAFF">Nhân viên</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters ? (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <SlidersHorizontal aria-hidden="true" />
                  Xoá lọc
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-line bg-surface-muted px-4 py-2 text-xs text-ink-500">
            <span>
              {rows.length} / {directory.rows.length} nhân sự
              {search ? ` khớp “${search}”` : ''}
            </span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <UserRound className="size-3.5" aria-hidden="true" />
              Bấm vào dòng để xem hồ sơ đầy đủ
            </span>
          </div>

          <EmployeeTable
            rows={rows}
            isLoading={directory.isLoading}
            onOpen={setSelected}
            emptyTitle={hasFilters ? 'Không tìm thấy nhân sự phù hợp' : 'Chưa có nhân sự'}
            emptyDescription={
              hasFilters
                ? 'Thử đổi từ khoá hoặc bỏ bớt bộ lọc.'
                : 'Thêm nhân sự đầu tiên, gán phòng ban và chức vụ để bắt đầu.'
            }
            emptyAction={
              hasFilters
                ? { label: 'Xoá bộ lọc', onClick: resetFilters }
                : can(PERM.employeeCreate)
                  ? { label: 'Thêm nhân sự', onClick: openCreate }
                  : undefined
            }
          />
        </div>
      )}

      <EmployeeCreateDrawer
        key={createKey}
        open={createOpen}
        onOpenChange={closeCreate}
        defaultDepartmentId={defaultDepartmentId}
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
