import { FolderTree, Pencil, Plus, Power } from 'lucide-react'
import { useDeferredValue, useEffect, useState } from 'react'
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
import { Field, Input, Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { subjectsApi } from '@/features/academic/api'
import {
  useSubjectCategories,
  useSubjectMutations,
  useSubjects,
  useSubjectUsage,
} from '@/features/academic/hooks'
import {
  ROOM_REQUIREMENT_LABELS,
  type RoomRequirement,
  type Subject,
  type SubjectInput,
} from '@/features/academic/types'
import { SubjectCategoriesDialog } from '@/features/academic/subject-categories-dialog'
import { usePermission } from '@/features/auth/hooks'
import { ApiError } from '@/lib/api-error'
import { formatDateTime, formatNumber } from '@/lib/format'
import { moduleState } from '@/lib/nav'
import { PERM } from '@/lib/permissions'

type SubjectForm = {
  code: string
  name: string
  description: string
  categoryId: string
  roomRequirement: RoomRequirement
}

type SubjectWarning = {
  classes: { id: string; name: string }[]
  curricula: { code: string; name: string }[]
}

const EMPTY_FORM: SubjectForm = {
  code: '',
  name: '',
  description: '',
  categoryId: '',
  roomRequirement: 'ANY',
}

function readWarning(details: unknown): SubjectWarning | null {
  if (!details || typeof details !== 'object') return null
  const record = details as Record<string, unknown>
  const classes = Array.isArray(record.classes)
    ? record.classes.flatMap((item) => {
        const value = item as { id?: unknown; name?: unknown } | null
        return typeof value?.id === 'string' && typeof value?.name === 'string'
          ? [{ id: value.id, name: value.name }]
          : []
      })
    : []
  const curricula = Array.isArray(record.curricula)
    ? record.curricula.flatMap((item) => {
        const value = item as { code?: unknown; name?: unknown } | null
        return typeof value?.code === 'string' && typeof value?.name === 'string'
          ? [{ code: value.code, name: value.name }]
          : []
      })
    : []
  if (classes.length === 0 && curricula.length === 0) return null
  return { classes, curricula }
}

function SubjectDialog({
  open,
  onOpenChange,
  subject,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  subject: Subject | null
}) {
  const mutations = useSubjectMutations()
  const categories = useSubjectCategories(true)
  const usage = useSubjectUsage(subject?.id, open && Boolean(subject))
  const [form, setForm] = useState<SubjectForm>(EMPTY_FORM)
  const [error, setError] = useState<string>()
  const [warning, setWarning] = useState<SubjectWarning | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(
      subject
        ? {
            code: subject.code ?? '',
            name: subject.name,
            description: subject.description ?? '',
            categoryId: subject.categoryId ?? '',
            roomRequirement: subject.roomRequirement ?? 'ANY',
          }
        : EMPTY_FORM,
    )
    setError(undefined)
    setWarning(null)
  }, [open, subject])

  const submit = async (confirm = false) => {
    setError(undefined)
    if (!form.name.trim()) {
      setError('Vui lòng nhập tên môn học.')
      return
    }
    const code = form.code.trim()
    if (code) {
      try {
        const check = await subjectsApi.checkCode(code, subject?.id)
        if (!check.available) {
          setError('Mã môn học đã tồn tại trong tổ chức.')
          return
        }
      } catch {
        // Nếu lỗi 403/500 bỏ qua để backend validate khi submit
      }
    }
    const input: SubjectInput = {
      code: code || undefined,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
    }
    if (form.categoryId) input.categoryId = form.categoryId
    if (form.roomRequirement !== 'ANY') input.roomRequirement = form.roomRequirement
    if (confirm) input.confirm = true

    const handlers = {
      onSuccess: () => {
        toast.success(subject ? 'Đã cập nhật môn học.' : 'Đã thêm môn học.')
        onOpenChange(false)
      },
      onError: (cause: unknown) => {
        const apiError = ApiError.from(cause)
        if (!confirm && apiError.code === 'SUBJECT_USAGE_CONFIRMATION_REQUIRED') {
          const parsed = readWarning(apiError.details)
          if (parsed) {
            setWarning(parsed)
            return
          }
        }
        setError(apiError.message || 'Không lưu được môn học.')
      },
    }
    if (subject) mutations.update.mutate({ id: subject.id, input }, handlers)
    else mutations.create.mutate(input, handlers)
  }

  const categoryOptions = categories.data ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{subject ? 'Cập nhật môn học' : 'Thêm môn học'}</DialogTitle>
          <DialogDescription>
            Môn học dùng khi tạo lớp. Danh mục giúp nhóm môn; yêu cầu phòng dùng khi xếp lịch.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mã môn">
              <Input
                value={form.code}
                placeholder="VD: TOAN10"
                onChange={(event) => setForm({ ...form, code: event.target.value })}
              />
            </Field>
            <Field label="Tên môn học" required>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Danh mục">
              <Select
                value={form.categoryId || 'NONE'}
                onValueChange={(value) =>
                  setForm({ ...form, categoryId: value === 'NONE' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Không phân loại</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id}
                      disabled={!category.active && category.id !== subject?.categoryId}
                    >
                      {category.name}
                      {category.active ? '' : ' (đã ngừng)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Yêu cầu phòng">
              <Select
                value={form.roomRequirement}
                onValueChange={(value) =>
                  setForm({ ...form, roomRequirement: value as RoomRequirement })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANY">{ROOM_REQUIREMENT_LABELS.ANY}</SelectItem>
                  <SelectItem value="COMPUTER">{ROOM_REQUIREMENT_LABELS.COMPUTER}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Mô tả">
            <Textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Field>
          {subject && usage.data ? (
            <p className="text-xs text-ink-500">
              Lớp đang dùng: {usage.data.classesUsingSubject} · Chương trình:{' '}
              {usage.data.curriculaUsingSubject ?? 0}
            </p>
          ) : null}
          {warning ? (
            <Alert tone="warning" title="Môn học đang được sử dụng">
              <p>
                Thay đổi danh mục hoặc yêu cầu phòng sẽ không tự cập nhật các buổi học đã xếp.
              </p>
              {warning.classes.length > 0 ? (
                <div className="mt-2">
                  <p className="font-medium">Lớp đang dùng ({warning.classes.length}):</p>
                  <ul className="mt-1 list-disc pl-5">
                    {warning.classes.slice(0, 10).map((item) => (
                      <li key={item.id}>{item.name}</li>
                    ))}
                  </ul>
                  {warning.classes.length > 10 ? (
                    <p className="mt-1">… và {warning.classes.length - 10} lớp khác.</p>
                  ) : null}
                </div>
              ) : null}
              {warning.curricula.length > 0 ? (
                <p className="mt-2">
                  Chương trình đang dùng: {warning.curricula.map((item) => item.name).join(', ')}
                </p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setWarning(null)}>
                  Quay lại
                </Button>
                <Button
                  size="sm"
                  onClick={() => void submit(true)}
                  isLoading={mutations.update.isPending}
                >
                  Vẫn lưu
                </Button>
              </div>
            </Alert>
          ) : null}
          {error ? <p className="text-sm text-danger-600">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          {warning ? null : (
            <Button
              onClick={() => void submit()}
              isLoading={mutations.create.isPending || mutations.update.isPending}
            >
              {subject ? 'Lưu thay đổi' : 'Tạo môn học'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SubjectsPage() {
  const { can, session } = usePermission()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim())
  const [includeInactive, setIncludeInactive] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Subject | null>(null)
  const [toggling, setToggling] = useState<Subject | null>(null)
  const [categoriesOpen, setCategoriesOpen] = useState(false)

  const canView = can(PERM.subjectView) || can(PERM.subjectManage)
  const canManage = can(PERM.subjectManage)
  const moduleDisabled = ['disabled', 'locked'].includes(moduleState(session, 'STUDENT_MANAGEMENT'))
  const writable = canManage && !moduleDisabled

  const subjects = useSubjects({
    q: deferredSearch || undefined,
    includeInactive: includeInactive || undefined,
  })
  const mutations = useSubjectMutations()

  const rows = subjects.data ?? []

  const columns: DataColumn<Subject>[] = [
    {
      id: 'name',
      header: 'Môn học',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-900">{row.name}</p>
          <p className="truncate text-xs text-ink-500">{row.code ?? 'Chưa có mã'}</p>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      id: 'category',
      header: 'Danh mục',
      hideBelow: 'md',
      cell: (row) => row.categoryName || '—',
    },
    {
      id: 'room',
      header: 'Yêu cầu phòng',
      hideBelow: 'lg',
      cell: (row) => ROOM_REQUIREMENT_LABELS[row.roomRequirement ?? 'ANY'],
    },
    {
      id: 'description',
      header: 'Mô tả',
      hideBelow: 'md',
      cell: (row) => row.description || '—',
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: (row) => (
        <Badge tone={row.active ? 'success' : 'neutral'} dot>
          {row.active ? 'Đang dùng' : 'Ngừng dùng'}
        </Badge>
      ),
    },
    {
      id: 'updated',
      header: 'Cập nhật',
      hideBelow: 'lg',
      cell: (row) => (row.updatedAt ? formatDateTime(row.updatedAt) : '—'),
    },
  ]

  if (canManage) {
    columns.push({
      id: 'actions',
      header: '',
      align: 'right',
      cell: (row) =>
        writable ? (
          <div className="flex items-center justify-end gap-1">
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
            <Button
              variant="ghost"
              size="sm"
              isLoading={mutations.setActive.isPending && toggling?.id === row.id}
              onClick={() => {
                if (row.active) {
                  setToggling(row)
                  return
                }
                mutations.setActive.mutate(
                  { id: row.id, active: true },
                  {
                    onSuccess: () => toast.success('Đã kích hoạt lại môn học.'),
                    onError: (cause) =>
                      toast.error(ApiError.from(cause).message || 'Không cập nhật được môn học.'),
                  },
                )
              }}
            >
              <Power aria-hidden="true" />
              {row.active ? 'Ngừng dùng' : 'Kích hoạt'}
            </Button>
          </div>
        ) : null,
    })
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Đào tạo · Môn học"
        title="Môn học"
        description="Danh mục môn học của tổ chức, dùng khi tạo và cập nhật lớp."
        actions={
          writable ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setCategoriesOpen(true)}>
                <FolderTree aria-hidden="true" />
                Danh mục
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
              >
                <Plus aria-hidden="true" />
                Thêm môn học
              </Button>
            </div>
          ) : null
        }
        meta={
          <span className="text-xs text-ink-500">
            {formatNumber(rows.filter((row) => row.active).length)} môn đang hoạt động
          </span>
        }
      />

      {canManage && moduleDisabled ? (
        <Alert tone="warning" className="mt-5">
          Module quản lý sinh viên đang ở chế độ chỉ đọc. Bạn vẫn có thể xem môn học nhưng không thể
          thêm hoặc cập nhật.
        </Alert>
      ) : null}
      {!canView ? (
        <Alert tone="info" className="mt-5" title="Danh mục chỉ đọc">
          Tài khoản của bạn chưa có quyền xem danh mục môn học.
        </Alert>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Tìm theo tên hoặc mã môn…"
        />
        {canManage ? (
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.target.checked)}
              className="size-4 rounded border-line-300"
            />
            Hiện cả môn đã ngừng dùng
          </label>
        ) : null}
      </div>

      <div className="mt-3">
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          isLoading={subjects.isLoading}
          error={
            subjects.isError ? (
              <ErrorState
                title="Không tải được danh sách môn học"
                description={ApiError.from(subjects.error).message}
                onRetry={() => void subjects.refetch()}
              />
            ) : undefined
          }
          empty={<p className="py-8 text-center text-sm text-ink-500">Không có môn học phù hợp.</p>}
          initialPageSize={20}
        />
      </div>

      <SubjectDialog open={formOpen} onOpenChange={setFormOpen} subject={editing} />

      <SubjectCategoriesDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} />

      <ConfirmDialog
        open={Boolean(toggling)}
        onOpenChange={(open) => !open && setToggling(null)}
        title="Ngừng dùng môn học"
        description={`Ngừng dùng môn ${toggling?.name ?? ''}? Lớp đang dùng môn vẫn giữ tham chiếu, nhưng không thể chọn môn này cho lớp mới.`}
        confirmLabel="Ngừng dùng"
        tone="danger"
        onConfirm={() => {
          if (!toggling) return
          mutations.setActive.mutate(
            { id: toggling.id, active: false },
            {
              onSuccess: () => {
                toast.success('Đã ngừng dùng môn học.')
                setToggling(null)
              },
              onError: (cause) =>
                toast.error(ApiError.from(cause).message || 'Không cập nhật được môn học.'),
            },
          )
        }}
      />
    </PageContainer>
  )
}
