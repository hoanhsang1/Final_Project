import { KeyRound, Pencil, Plus, Trash2, UsersRound } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable, type DataColumn } from '@/components/ui/data-table'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert } from '@/components/ui/feedback'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { useClasses, useStudentMutations, useStudents } from '@/features/academic/hooks'
import {
  STUDENT_STATUS_LABELS,
  type Student,
  type StudentAccount,
  type StudentInput,
} from '@/features/academic/types'
import { usePermission } from '@/features/auth/hooks'
import { ApiError } from '@/lib/api-error'
import { formatDate, formatDateTime } from '@/lib/format'
import { PERM } from '@/lib/permissions'

type StudentForm = {
  studentCode: string
  fullName: string
  dateOfBirth: string
  email: string
  phone: string
  status: 'active' | 'inactive' | 'suspended'
}

const EMPTY_FORM: StudentForm = {
  studentCode: '',
  fullName: '',
  dateOfBirth: '',
  email: '',
  phone: '',
  status: 'active',
}

function StudentFormDialog({
  open,
  onOpenChange,
  student,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: Student | null
}) {
  const mutations = useStudentMutations()
  const [form, setForm] = useState<StudentForm>(EMPTY_FORM)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!open) return
    setForm(
      student
        ? {
            studentCode: student.studentCode,
            fullName: student.fullName,
            dateOfBirth: student.dateOfBirth ?? '',
            email: student.email ?? '',
            phone: student.phone ?? '',
            status: (student.status as StudentForm['status']) ?? 'active',
          }
        : EMPTY_FORM,
    )
    setError(undefined)
  }, [open, student])

  const submit = () => {
    setError(undefined)
    if (!form.fullName.trim()) {
      setError('Vui lòng nhập họ tên sinh viên.')
      return
    }
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      setError('Email không hợp lệ.')
      return
    }
    const input: StudentInput = {
      studentCode: form.studentCode.trim() || undefined,
      fullName: form.fullName.trim(),
      dateOfBirth: form.dateOfBirth || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      status: form.status,
    }
    const handlers = {
      onSuccess: () => {
        toast.success(student ? 'Đã cập nhật sinh viên.' : 'Đã tạo sinh viên.')
        onOpenChange(false)
      },
      onError: (cause: unknown) =>
        setError(ApiError.from(cause).message || 'Không lưu được sinh viên.'),
    }
    if (student) mutations.update.mutate({ id: student.id, input }, handlers)
    else mutations.create.mutate(input, handlers)
  }

  const pending = mutations.create.isPending || mutations.update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{student ? 'Cập nhật sinh viên' : 'Thêm sinh viên'}</DialogTitle>
          <DialogDescription>
            Mã sinh viên để trống sẽ được hệ thống sinh tự động.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Họ tên" required>
              <Input
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              />
            </Field>
            <Field label="Mã sinh viên">
              <Input
                value={form.studentCode}
                disabled={Boolean(student)}
                onChange={(event) => setForm({ ...form, studentCode: event.target.value })}
              />
            </Field>
            <Field label="Ngày sinh">
              <Input
                type="date"
                value={form.dateOfBirth}
                onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })}
              />
            </Field>
            <Field label="Trạng thái">
              <Select
                value={form.status}
                onValueChange={(value) => setForm({ ...form, status: value as StudentForm['status'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Đang học</SelectItem>
                  <SelectItem value="inactive">Tạm dừng</SelectItem>
                  <SelectItem value="suspended">Đình chỉ</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Field>
            <Field label="Điện thoại">
              <Input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </Field>
          </div>
          {error ? <p className="text-sm text-danger-600">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={submit} isLoading={pending}>
            {student ? 'Lưu thay đổi' : 'Tạo sinh viên'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function StudentsPage() {
  const { can } = usePermission()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim())
  const [status, setStatus] = useState('all')
  const [classId, setClassId] = useState('all')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [deleting, setDeleting] = useState<Student | null>(null)
  const [account, setAccount] = useState<StudentAccount | null>(null)

  const classes = useClasses({ page: 1, size: 100 })
  const students = useStudents({
    page,
    size,
    q: deferredSearch || undefined,
    status: status === 'all' ? undefined : status,
    classId: classId === 'all' ? undefined : classId,
  })
  const mutations = useStudentMutations()

  const rows = students.data?.items ?? []
  const total = students.data?.total ?? 0
  const activeCount = rows.filter((row) => row.status === 'active').length

  const classOptions = useMemo(() => classes.data?.items ?? [], [classes.data])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const createAccount = (student: Student) => {
    mutations.createAccount.mutate(student.id, {
      onSuccess: (data) => setAccount(data),
      onError: (cause) => toast.error(ApiError.from(cause).message || 'Không cấp được tài khoản.'),
    })
  }

  const columns: DataColumn<Student>[] = [
    {
      id: 'name',
      header: 'Sinh viên',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-900">{row.fullName}</p>
          <p className="truncate text-xs text-ink-500">
            {row.studentCode} · {row.email ?? 'Chưa có email'}
          </p>
        </div>
      ),
      sortValue: (row) => row.fullName,
    },
    {
      id: 'class',
      header: 'Lớp',
      hideBelow: 'md',
      cell: (row) => row.classCode ?? '—',
    },
    {
      id: 'dob',
      header: 'Ngày sinh',
      hideBelow: 'lg',
      cell: (row) => formatDate(row.dateOfBirth),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: (row) => (
        <Badge tone={row.status === 'active' ? 'success' : row.status === 'suspended' ? 'danger' : 'warning'} dot>
          {STUDENT_STATUS_LABELS[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      id: 'account',
      header: 'Tài khoản',
      hideBelow: 'lg',
      cell: (row) =>
        row.accountUsername ? (
          <div>
            <p className="text-ink-700">{row.accountUsername}</p>
            <p className="text-xs text-ink-500">Tạo {formatDateTime(row.accountCreatedAt)}</p>
          </div>
        ) : (
          <span className="text-ink-500">Chưa cấp</span>
        ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {can(PERM.studentCreateAccount) && !row.accountUsername ? (
            <Button variant="ghost" size="sm" onClick={() => createAccount(row)}>
              <KeyRound aria-hidden="true" />
              Cấp tài khoản
            </Button>
          ) : null}
          {can(PERM.studentEdit) ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(row)
                setFormOpen(true)
              }}
            >
              <Pencil aria-hidden="true" />
              Sửa
            </Button>
          ) : null}
          {can(PERM.studentDelete) ? (
            <Button variant="ghost" size="sm" onClick={() => setDeleting(row)}>
              <Trash2 aria-hidden="true" />
              Xoá
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Đào tạo · Sinh viên"
        title="Sinh viên"
        description="Hồ sơ sinh viên, lớp đang theo học và tài khoản đăng nhập."
        actions={
          can(PERM.studentCreate) ? (
            <Button size="sm" onClick={openCreate}>
              <Plus aria-hidden="true" />
              Thêm sinh viên
            </Button>
          ) : null
        }
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
              <UsersRound className="size-3.5" aria-hidden="true" />
              {total} sinh viên
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
              <span className="size-1.5 rounded-full bg-success-500" aria-hidden="true" />
              {activeCount} đang học (trang này)
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
          value={classId}
          onValueChange={(value) => {
            setClassId(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Lớp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi lớp</SelectItem>
            {classOptions.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.classCode} · {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            <SelectItem value="active">Đang học</SelectItem>
            <SelectItem value="inactive">Tạm dừng</SelectItem>
            <SelectItem value="suspended">Đình chỉ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          isLoading={students.isLoading}
          error={
            students.isError ? (
              <ErrorState
                title="Không tải được danh sách sinh viên"
                description={ApiError.from(students.error).message}
                onRetry={() => void students.refetch()}
              />
            ) : undefined
          }
          empty={<p className="py-8 text-center text-sm text-ink-500">Không có sinh viên phù hợp.</p>}
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

      <StudentFormDialog open={formOpen} onOpenChange={setFormOpen} student={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Xoá sinh viên"
        description={`Xoá hồ sơ ${deleting?.fullName ?? ''}? Thao tác không thể hoàn tác.`}
        confirmLabel="Xoá"
        tone="danger"
        onConfirm={() => {
          if (!deleting) return
          mutations.remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success('Đã xoá sinh viên.')
              setDeleting(null)
            },
            onError: (cause) =>
              toast.error(ApiError.from(cause).message || 'Không xoá được sinh viên.'),
          })
        }}
      />

      <Dialog open={Boolean(account)} onOpenChange={(open) => !open && setAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tài khoản sinh viên đã được tạo</DialogTitle>
            <DialogDescription>
              Mật khẩu tạm chỉ hiển thị một lần. Hãy gửi cho sinh viên và yêu cầu đổi khi đăng nhập.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Alert tone="warning" title="Lưu lại thông tin đăng nhập">
              <div className="mt-2 space-y-1 font-mono text-sm">
                <p>Tên đăng nhập: {account?.username}</p>
                <p>Mật khẩu tạm: {account?.temporaryPassword}</p>
              </div>
            </Alert>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setAccount(null)}>Đã lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
