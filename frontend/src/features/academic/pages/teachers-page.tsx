import { GraduationCap, Pencil, Plus, UserRound, Users } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, type DataColumn } from '@/components/ui/data-table'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { useTeacher, useTeachers, useUpdateTeacher } from '@/features/academic/hooks'
import {
  CONTRACT_TYPE_LABELS,
  TEACHING_STATUS_LABELS,
  type TeacherItem,
} from '@/features/academic/types'
import { usePermission } from '@/features/auth/hooks'
import { EmployeeCreateDrawer } from '@/features/organization/components/employee-create-drawer'
import { EmployeeDetailDrawer } from '@/features/organization/components/employee-detail-drawer'
import { useDepartments, useSpecialties } from '@/features/organization/hooks'
import { ApiError } from '@/lib/api-error'
import { PERM } from '@/lib/permissions'

type TeacherForm = {
  fullName: string
  email: string
  phone: string
  specialtyIds: string[]
  contractType: '' | 'CO_HUU' | 'THINH_GIANG'
}

function TeacherEditDialog({
  userId,
  open,
  onOpenChange,
}: {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const detail = useTeacher(userId ?? undefined)
  const specialties = useSpecialties()
  const update = useUpdateTeacher(userId ?? '')
  const [form, setForm] = useState<TeacherForm | null>(null)
  const [error, setError] = useState<string>()

  const teacher = detail.data
  const current = useMemo<TeacherForm>(
    () =>
      form ?? {
        fullName: teacher?.fullName ?? '',
        email: teacher?.email ?? '',
        phone: teacher?.phone ?? '',
        specialtyIds: teacher?.specialties.map((item) => item.id) ?? [],
        contractType: (teacher?.contractType as 'CO_HUU' | 'THINH_GIANG' | null) ?? '',
      },
    [form, teacher],
  )

  const toggleSpecialty = (id: string) => {
    setForm({
      ...current,
      specialtyIds: current.specialtyIds.includes(id)
        ? current.specialtyIds.filter((item) => item !== id)
        : [...current.specialtyIds, id],
    })
  }

  const submit = () => {
    if (!teacher) return
    setError(undefined)
    if (!current.fullName.trim()) {
      setError('Vui lòng nhập họ tên.')
      return
    }
    if (current.specialtyIds.length === 0) {
      setError('Giáo viên cần có ít nhất một chuyên môn.')
      return
    }
    update.mutate(
      {
        fullName: current.fullName.trim(),
        email: current.email.trim() || undefined,
        phone: current.phone.trim() || undefined,
        specialtyIds: current.specialtyIds,
        contractType: current.contractType || undefined,
        version: teacher.version,
      },
      {
        onSuccess: () => {
          toast.success('Đã cập nhật hồ sơ giáo viên.')
          setForm(null)
          onOpenChange(false)
        },
        onError: (cause) =>
          setError(ApiError.from(cause).message || 'Không cập nhật được hồ sơ giáo viên.'),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hồ sơ giáo viên</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {detail.isLoading ? <p className="text-sm text-ink-500">Đang tải hồ sơ…</p> : null}
          {detail.isError ? (
            <ErrorState
              title="Không tải được hồ sơ giáo viên"
              description={ApiError.from(detail.error).message}
              onRetry={() => void detail.refetch()}
            />
          ) : null}
          {teacher ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Họ tên" required>
                  <Input
                    value={current.fullName}
                    onChange={(event) => setForm({ ...current, fullName: event.target.value })}
                  />
                </Field>
                <Field label="Mã nhân viên">
                  <Input value={teacher.staffCode ?? '—'} readOnly disabled />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={current.email}
                    onChange={(event) => setForm({ ...current, email: event.target.value })}
                  />
                </Field>
                <Field label="Điện thoại">
                  <Input
                    value={current.phone}
                    onChange={(event) => setForm({ ...current, phone: event.target.value })}
                  />
                </Field>
                <Field label="Loại hợp đồng">
                  <Select
                    value={current.contractType || 'none'}
                    onValueChange={(value) =>
                      setForm({
                        ...current,
                        contractType: value === 'none' ? '' : (value as 'CO_HUU' | 'THINH_GIANG'),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại hợp đồng" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Chưa xác định</SelectItem>
                      <SelectItem value="CO_HUU">Cơ hữu</SelectItem>
                      <SelectItem value="THINH_GIANG">Thỉnh giảng</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Chuyên môn" required hint="Chọn ít nhất một chuyên môn đang hoạt động.">
                <div className="grid max-h-44 gap-2 overflow-y-auto rounded-md border border-line-200 p-3 sm:grid-cols-2">
                  {(specialties.data ?? []).map((specialty) => (
                    <label key={specialty.id} className="flex items-center gap-2 text-sm text-ink-700">
                      <input
                        type="checkbox"
                        checked={current.specialtyIds.includes(specialty.id)}
                        onChange={() => toggleSpecialty(specialty.id)}
                        className="size-4 rounded border-line-300"
                      />
                      {specialty.name}
                    </label>
                  ))}
                  {specialties.data?.length === 0 ? (
                    <p className="text-sm text-ink-500">Chưa có chuyên môn nào trong tổ chức.</p>
                  ) : null}
                </div>
              </Field>
              {error ? <p className="text-sm text-danger-600">{error}</p> : null}
            </>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button onClick={submit} isLoading={update.isPending} disabled={!teacher}>
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TeachersPage() {
  const { can } = usePermission()
  const departments = useDepartments()
  const specialties = useSpecialties()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim())
  const [specialtyId, setSpecialtyId] = useState('all')
  const [teachingStatus, setTeachingStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailUser, setDetailUser] = useState<TeacherItem | null>(null)
  const [editUser, setEditUser] = useState<string | null>(null)

  const teachers = useTeachers({
    page,
    size,
    q: deferredSearch || undefined,
    specialtyId: specialtyId === 'all' ? undefined : specialtyId,
    teachingStatus: teachingStatus === 'all' ? undefined : teachingStatus,
  })

  const departmentName = (id: string) =>
    departments.data?.find((item) => item.id === id)?.name ?? '—'

  const rows = teachers.data?.items ?? []
  const total = teachers.data?.total ?? 0
  const noClass = rows.filter((row) => row.noClass).length

  const columns: DataColumn<TeacherItem>[] = [
    {
      id: 'name',
      header: 'Giáo viên',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-900">{row.fullName}</p>
          <p className="truncate text-xs text-ink-500">
            {row.staffCode ?? 'Chưa có mã'} · {row.email ?? 'Chưa có email'}
          </p>
        </div>
      ),
      sortValue: (row) => row.fullName,
    },
    {
      id: 'department',
      header: 'Phòng ban',
      hideBelow: 'md',
      cell: (row) => departmentName(row.departmentId),
    },
    {
      id: 'specialties',
      header: 'Chuyên môn',
      hideBelow: 'lg',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.specialties.length === 0 ? '—' : null}
          {row.specialties.map((item) => (
            <Badge key={item.id} tone="neutral" size="sm">
              {item.name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: 'contract',
      header: 'Hợp đồng',
      hideBelow: 'lg',
      cell: (row) => (row.contractType ? CONTRACT_TYPE_LABELS[row.contractType] ?? row.contractType : '—'),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: (row) => (
        <Badge tone={row.teachingStatus === 'DANG_DAY' ? 'success' : 'warning'} dot>
          {row.teachingStatus
            ? TEACHING_STATUS_LABELS[row.teachingStatus] ?? row.teachingStatus
            : 'Chưa xác định'}
        </Badge>
      ),
    },
    {
      id: 'classes',
      header: 'Lớp đang dạy',
      align: 'right',
      cell: (row) => (
        <span className={row.classCount === 0 ? 'text-warning-600' : 'text-ink-700'}>
          {row.classCount}
        </span>
      ),
      sortValue: (row) => row.classCount,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setDetailUser(row)}>
            <UserRound aria-hidden="true" />
            Hồ sơ
          </Button>
          {can(PERM.employeeEdit) ? (
            <Button variant="ghost" size="sm" onClick={() => setEditUser(row.userId)}>
              <Pencil aria-hidden="true" />
              Sửa
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Đào tạo · Giáo viên"
        title="Giáo viên"
        description="Danh sách giáo viên theo phòng ban, chuyên môn và tình trạng giảng dạy."
        actions={
          can(PERM.employeeCreate) ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" />
              Thêm giáo viên
            </Button>
          ) : null
        }
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
              <GraduationCap className="size-3.5" aria-hidden="true" />
              {total} giáo viên
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
              <Users className="size-3.5" aria-hidden="true" />
              {noClass} chưa có lớp
            </span>
          </>
        }
      />

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onValueChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          placeholder="Tìm theo tên, mã, email…"
        />
        <Select
          value={specialtyId}
          onValueChange={(value) => {
            setSpecialtyId(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Chuyên môn" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi chuyên môn</SelectItem>
            {(specialties.data ?? []).map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={teachingStatus}
          onValueChange={(value) => {
            setTeachingStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            <SelectItem value="DANG_DAY">Đang dạy</SelectItem>
            <SelectItem value="TAM_NGHI">Tạm nghỉ</SelectItem>
            <SelectItem value="DA_NGHI">Đã nghỉ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(row) => row.userId}
          isLoading={teachers.isLoading}
          error={
            teachers.isError ? (
              <ErrorState
                title="Không tải được danh sách giáo viên"
                description={ApiError.from(teachers.error).message}
                onRetry={() => void teachers.refetch()}
              />
            ) : undefined
          }
          empty={<p className="py-8 text-center text-sm text-ink-500">Không có giáo viên phù hợp.</p>}
          serverPagination={{
            page,
            size,
            total,
            onPageChange: setPage,
            onSizeChange: (next) => {
              setSize(next)
              setPage(1)
            },
          }}
        />
      </div>

      <EmployeeCreateDrawer open={createOpen} onOpenChange={setCreateOpen} />
      <EmployeeDetailDrawer
        open={Boolean(detailUser)}
        onOpenChange={(open) => !open && setDetailUser(null)}
        departmentId={detailUser?.departmentId ?? null}
        userId={detailUser?.userId ?? null}
      />
      <TeacherEditDialog
        userId={editUser}
        open={Boolean(editUser)}
        onOpenChange={(open) => !open && setEditUser(null)}
      />
    </PageContainer>
  )
}
