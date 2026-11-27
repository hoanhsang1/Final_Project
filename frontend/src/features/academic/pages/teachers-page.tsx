import { GraduationCap, Pencil, Plus, RefreshCw, Settings2, UserRound, Users } from 'lucide-react'
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
import { useChangeTeacherStatus, useSubjectCategories, useSubjects, useTeachableSubjectMutations, useTeachableSubjects, useTeacher, useTeachers, useUpdateTeacher } from '@/features/academic/hooks'
import {
  CONTRACT_TYPE_LABELS,
  TEACHER_SUBJECT_REASON_LABELS,
  TEACHING_STATUS_LABELS,
  type TeacherItem,
} from '@/features/academic/types'
import { usePermission } from '@/features/auth/hooks'
import { EmployeeCreateDrawer } from '@/features/organization/components/employee-create-drawer'
import { EmployeeDetailDrawer } from '@/features/organization/components/employee-detail-drawer'
import { useDepartments, useSpecialties, useSpecialtyMutations } from '@/features/organization/hooks'
import type { Specialty } from '@/features/organization/types'
import { ApiError } from '@/lib/api-error'
import { PERM } from '@/lib/permissions'

type TeacherForm = {
  fullName: string
  email: string
  phone: string
  specialtyIds: string[]
  contractType: '' | 'CO_HUU' | 'THINH_GIANG'
}

/**
 * Môn giáo viên dạy được theo quy tắc D1 (cùng danh mục chuyên môn hoặc ngoại lệ).
 * Ngoại lệ chỉ lưu các môn ngoài danh mục — môn đã đủ điều kiện nhờ chuyên môn bị khoá.
 */
function TeachableSubjectsSection({ staffId }: { staffId: string }) {
  const teachable = useTeachableSubjects(staffId)
  const subjects = useSubjects()
  const save = useTeachableSubjectMutations(staffId)
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string>()

  const items = teachable.data ?? []
  const categoryCovered = new Set(
    items.filter((item) => item.reason === 'CATEGORY').map((item) => item.subjectId),
  )
  const exceptionCount = items.filter((item) => item.reason === 'EXCEPTION').length

  const startEdit = () => {
    setSelected(items.filter((item) => item.reason === 'EXCEPTION').map((item) => item.subjectId))
    setError(undefined)
    setEditing(true)
  }

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const submit = () => {
    save.mutate(selected, {
      onSuccess: () => {
        toast.success('Đã cập nhật ngoại lệ môn dạy.')
        setEditing(false)
      },
      onError: (cause) => setError(ApiError.from(cause).message),
    })
  }

  return (
    <div className="rounded-md border border-line-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-900">Môn dạy được ({items.length})</p>
          <p className="text-xs text-ink-500">
            Theo danh mục chuyên môn và ngoại lệ được duyệt · {exceptionCount} ngoại lệ
          </p>
        </div>
        {!editing ? (
          <Button size="sm" variant="outline" onClick={startEdit} disabled={teachable.isLoading}>
            Chỉnh ngoại lệ
          </Button>
        ) : null}
      </div>

      {teachable.isLoading ? <p className="mt-2 text-sm text-ink-500">Đang tải…</p> : null}
      {teachable.isError ? (
        <p className="mt-2 text-sm text-danger-600">{ApiError.from(teachable.error).message}</p>
      ) : null}

      {!teachable.isLoading && !teachable.isError ? (
        items.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">
            Chưa dạy được môn nào — hãy gắn danh mục cho chuyên môn hoặc thêm ngoại lệ.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {items.map((item) => (
              <Badge
                key={item.subjectId}
                tone={item.reason === 'EXCEPTION' ? 'warning' : 'neutral'}
                size="sm"
              >
                {item.subjectName}
                <span className="opacity-70">
                  · {TEACHER_SUBJECT_REASON_LABELS[item.reason] ?? item.reason}
                </span>
              </Badge>
            ))}
          </div>
        )
      ) : null}

      {editing ? (
        <div className="mt-3 space-y-3 border-t border-line-100 pt-3">
          <p className="text-xs text-ink-500">
            Chọn môn ngoài danh mục chuyên môn. Môn đã đủ điều kiện nhờ chuyên môn không cần chọn.
          </p>
          {(subjects.data ?? []).length === 0 ? (
            <p className="text-sm text-ink-500">Chưa có môn học đang hoạt động.</p>
          ) : (
            <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
              {(subjects.data ?? []).map((subject) => {
                const covered = categoryCovered.has(subject.id)
                return (
                  <label key={subject.id} className="flex items-center gap-2 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-line-300"
                      checked={covered || selected.includes(subject.id)}
                      disabled={covered}
                      onChange={() => toggle(subject.id)}
                    />
                    <span className="truncate">{subject.name}</span>
                    {covered ? (
                      <span className="text-xs text-ink-400">(theo chuyên môn)</span>
                    ) : null}
                  </label>
                )
              })}
            </div>
          )}
          {error ? <p className="text-sm text-danger-600">{error}</p> : null}
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} isLoading={save.isPending}>
              Lưu ngoại lệ
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              Huỷ
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** Quản lý chuyên môn và danh mục môn học gắn kèm — danh mục quyết định phạm vi môn dạy được. */
function SpecialtyManagerDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const specialties = useSpecialties()
  const categories = useSubjectCategories()
  const mutations = useSpecialtyMutations()
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('none')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('none')
  const [error, setError] = useState<string>()

  const categoryName = (id?: string | null) =>
    categories.data?.find((category) => category.id === id)?.name ?? 'Chưa gắn danh mục'

  const submitCreate = () => {
    setError(undefined)
    if (!name.trim()) {
      setError('Vui lòng nhập tên chuyên môn.')
      return
    }
    mutations.create.mutate(
      { name: name.trim(), categoryId: categoryId === 'none' ? null : categoryId },
      {
        onSuccess: () => {
          toast.success('Đã thêm chuyên môn.')
          setName('')
          setCategoryId('none')
        },
        onError: (cause) => setError(ApiError.from(cause).message),
      },
    )
  }

  const startEdit = (specialty: Specialty) => {
    setEditId(specialty.id)
    setEditName(specialty.name)
    setEditCategoryId(specialty.categoryId ?? 'none')
    setError(undefined)
  }

  const submitEdit = () => {
    setError(undefined)
    if (!editId) return
    if (!editName.trim()) {
      setError('Vui lòng nhập tên chuyên môn.')
      return
    }
    mutations.update.mutate(
      {
        id: editId,
        input: { name: editName.trim(), categoryId: editCategoryId === 'none' ? null : editCategoryId },
      },
      {
        onSuccess: () => {
          toast.success('Đã cập nhật chuyên môn.')
          setEditId(null)
        },
        onError: (cause) => setError(ApiError.from(cause).message),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Chuyên môn &amp; danh mục môn học</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-ink-600">
            Giáo viên dạy được mọi môn thuộc danh mục của chuyên môn được gắn; môn ngoài danh mục
            cần ngoại lệ riêng.
          </p>

          <div className="grid gap-3 rounded-md border border-line-200 p-3 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="Tên chuyên môn">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="VD: Lập trình Web"
              />
            </Field>
            <Field label="Danh mục môn học">
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chưa gắn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Chưa gắn danh mục</SelectItem>
                  {(categories.data ?? []).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-end">
              <Button size="sm" onClick={submitCreate} isLoading={mutations.create.isPending}>
                <Plus aria-hidden="true" />
                Thêm
              </Button>
            </div>
          </div>

          {specialties.isLoading ? <p className="text-sm text-ink-500">Đang tải…</p> : null}
          {specialties.isError ? (
            <p className="text-sm text-danger-600">
              {ApiError.from(specialties.error).message}
            </p>
          ) : null}
          {error ? <p className="text-sm text-danger-600">{error}</p> : null}

          <ul className="divide-y divide-line-100 rounded-md border border-line-200 text-sm">
            {(specialties.data ?? []).map((specialty) => (
              <li key={specialty.id} className="px-3 py-2">
                {editId === specialty.id ? (
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <Input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      aria-label="Tên chuyên môn"
                    />
                    <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                      <SelectTrigger aria-label="Danh mục môn học">
                        <SelectValue placeholder="Chưa gắn danh mục" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Chưa gắn danh mục</SelectItem>
                        {(categories.data ?? []).map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={submitEdit} isLoading={mutations.update.isPending}>
                        Lưu
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditId(null)}>
                        Huỷ
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">{specialty.name}</p>
                      <p className="text-xs text-ink-500">{categoryName(specialty.categoryId)}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(specialty)}>
                      <Pencil aria-hidden="true" />
                      Sửa
                    </Button>
                  </div>
                )}
              </li>
            ))}
            {specialties.data?.length === 0 ? (
              <li className="px-3 py-3 text-sm text-ink-500">Chưa có chuyên môn nào.</li>
            ) : null}
          </ul>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
  const categories = useSubjectCategories()
  const update = useUpdateTeacher(userId ?? '')
  const [form, setForm] = useState<TeacherForm | null>(null)
  const [error, setError] = useState<string>()
  const [mismatch, setMismatch] = useState<{ id: string; name: string }[] | null>(null)

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
    setMismatch(null)
    setForm({
      ...current,
      specialtyIds: current.specialtyIds.includes(id)
        ? current.specialtyIds.filter((item) => item !== id)
        : [...current.specialtyIds, id],
    })
  }

  const submit = (confirm = false) => {
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
        confirm: confirm || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Đã cập nhật hồ sơ giáo viên.')
          setForm(null)
          setMismatch(null)
          onOpenChange(false)
        },
        onError: (cause) => {
          const apiError = ApiError.from(cause)
          const classes = (apiError.details as { classes?: { id: string; name: string }[] } | undefined)
            ?.classes
          if (apiError.code === 'SPECIALTY_MISMATCH' && classes?.length) {
            setMismatch(classes)
            return
          }
          setError(apiError.message || 'Không cập nhật được hồ sơ giáo viên.')
        },
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
                      <span className="truncate">{specialty.name}</span>
                      {specialty.categoryId ? (
                        <span className="truncate text-xs text-ink-400">
                          · {categories.data?.find((item) => item.id === specialty.categoryId)?.name ?? ''}
                        </span>
                      ) : null}
                    </label>
                  ))}
                  {specialties.data?.length === 0 ? (
                    <p className="text-sm text-ink-500">Chưa có chuyên môn nào trong tổ chức.</p>
                  ) : null}
                </div>
              </Field>
              {userId ? <TeachableSubjectsSection staffId={userId} /> : null}
              {mismatch ? (
                <div className="space-y-2 rounded-md border border-warning-200 bg-warning-50/40 p-3 text-sm">
                  <p className="font-medium text-ink-900">
                    Chuyên môn mới không còn khớp môn học của các lớp giáo viên đang phụ trách:
                  </p>
                  <ul className="list-disc pl-5 text-ink-600">
                    {mismatch.map((item) => (
                      <li key={item.id}>{item.name}</li>
                    ))}
                  </ul>
                  <p className="text-ink-600">
                    Vẫn lưu sẽ giữ nguyên phân công hiện tại và cần rà soát lại lớp sau.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => submit(true)} isLoading={update.isPending}>
                      Vẫn lưu
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setMismatch(null)}>
                      Quay lại
                    </Button>
                  </div>
                </div>
              ) : null}
              {error ? <p className="text-sm text-danger-600">{error}</p> : null}
            </>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button onClick={() => submit()} isLoading={update.isPending} disabled={!teacher}>
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type TeachingStatus = 'DANG_DAY' | 'TAM_NGHI' | 'NGHI_VIEC'

function TeacherStatusDialog({
  userId,
  currentStatus,
  fullName,
  onOpenChange,
}: {
  userId: string
  currentStatus: string | null
  fullName: string
  onOpenChange: (open: boolean) => void
}) {
  const change = useChangeTeacherStatus(userId)
  // Component chỉ được mount khi mở dialog nên trạng thái khởi tạo luôn khớp giáo viên đang chọn.
  const [status, setStatus] = useState<TeachingStatus>((currentStatus as TeachingStatus | null) ?? 'DANG_DAY')

  const submit = () => {
    change.mutate(status, {
      onSuccess: (detail) => {
        toast.success(
          `Đã đổi trạng thái giảng dạy sang “${
            TEACHING_STATUS_LABELS[detail.teachingStatus ?? status] ?? status
          }”.`,
        )
        onOpenChange(false)
      },
      onError: (cause) => toast.error(ApiError.from(cause).message || 'Không đổi được trạng thái giảng dạy.'),
    })
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đổi trạng thái giảng dạy</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-ink-600">
            Giáo viên: <span className="font-medium text-ink-900">{fullName || '—'}</span>
          </p>
          <Field label="Trạng thái mới">
            <Select value={status} onValueChange={(value) => setStatus(value as TeachingStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DANG_DAY">Đang dạy</SelectItem>
                <SelectItem value="TAM_NGHI">Tạm nghỉ</SelectItem>
                <SelectItem value="NGHI_VIEC">Nghỉ việc</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button onClick={submit} isLoading={change.isPending}>
            Lưu trạng thái
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
  const [specialtyOpen, setSpecialtyOpen] = useState(false)
  const [detailUser, setDetailUser] = useState<TeacherItem | null>(null)
  const [editUser, setEditUser] = useState<string | null>(null)
  const [statusUser, setStatusUser] = useState<TeacherItem | null>(null)

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
          {can(PERM.teacherChangeStatus) ? (
            <Button variant="ghost" size="sm" onClick={() => setStatusUser(row)}>
              <RefreshCw aria-hidden="true" />
              Trạng thái
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
          <div className="flex items-center gap-2">
            {can(PERM.employeeEdit) ? (
              <Button size="sm" variant="outline" onClick={() => setSpecialtyOpen(true)}>
                <Settings2 aria-hidden="true" />
                Chuyên môn
              </Button>
            ) : null}
            {can(PERM.employeeCreate) ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus aria-hidden="true" />
                Thêm giáo viên
              </Button>
            ) : null}
          </div>
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
            <SelectItem value="NGHI_VIEC">Đã nghỉ</SelectItem>
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
      <SpecialtyManagerDialog open={specialtyOpen} onOpenChange={setSpecialtyOpen} />
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
      {statusUser ? (
        <TeacherStatusDialog
          userId={statusUser.userId}
          currentStatus={statusUser.teachingStatus}
          fullName={statusUser.fullName}
          onOpenChange={(open) => !open && setStatusUser(null)}
        />
      ) : null}
    </PageContainer>
  )
}
