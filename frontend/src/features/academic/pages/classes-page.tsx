import { BookOpen, Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react'
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
import { Spinner } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import {
  useAssignableTeachers,
  useClass,
  useClassCloseEvents,
  useClassHistory,
  useClassMutations,
  useClasses,
  useClassStudents,
  useStudents,
  useSubjects,
} from '@/features/academic/hooks'
import {
  CANCEL_STATE_LABELS,
  CLASS_STATUS_LABELS,
  CLOSE_STATE_LABELS,
  type ClassInput,
  type SchoolClass,
} from '@/features/academic/types'
import { usePermission } from '@/features/auth/hooks'
import { ApiError } from '@/lib/api-error'
import { formatDate, formatDateTime } from '@/lib/format'
import { PERM } from '@/lib/permissions'

type ClassForm = {
  classCode: string
  name: string
  academicYear: string
  subjectId: string
  startDate: string
  endDate: string
}

const EMPTY_FORM: ClassForm = {
  classCode: '',
  name: '',
  academicYear: '',
  subjectId: '',
  startDate: '',
  endDate: '',
}

function ClassFormDialog({
  open,
  onOpenChange,
  schoolClass,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  schoolClass: SchoolClass | null
  onCreated?: (created: SchoolClass) => void
}) {
  const subjects = useSubjects()
  const mutations = useClassMutations()
  const [form, setForm] = useState<ClassForm>(EMPTY_FORM)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!open) return
    setForm(
      schoolClass
        ? {
            classCode: schoolClass.classCode,
            name: schoolClass.name,
            academicYear: schoolClass.academicYear ?? '',
            subjectId: schoolClass.subjectId ?? 'none',
            startDate: schoolClass.startDate ?? '',
            endDate: schoolClass.endDate ?? '',
          }
        : EMPTY_FORM,
    )
    setError(undefined)
  }, [open, schoolClass])

  const submit = () => {
    setError(undefined)
    if (!form.classCode.trim() && !schoolClass) {
      setError('Vui lòng nhập mã lớp.')
      return
    }
    if (!form.name.trim()) {
      setError('Vui lòng nhập tên lớp.')
      return
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setError('Ngày kết thúc phải sau ngày bắt đầu.')
      return
    }
    const handlers = {
      onSuccess: (saved: SchoolClass) => {
        toast.success(schoolClass ? 'Đã cập nhật lớp học.' : 'Đã tạo lớp học.')
        if (!schoolClass) onCreated?.(saved)
        onOpenChange(false)
      },
      onError: (cause: unknown) =>
        setError(ApiError.from(cause).message || 'Không lưu được lớp học.'),
    }
    if (schoolClass) {
      mutations.update.mutate(
        {
          id: schoolClass.id,
          input: {
            name: form.name.trim(),
            academicYear: form.academicYear.trim() || undefined,
            subjectId: form.subjectId === 'none' ? undefined : form.subjectId || undefined,
            startDate: form.startDate || undefined,
            endDate: form.endDate || undefined,
            version: schoolClass.version,
          },
        },
        handlers,
      )
    } else {
      const input: ClassInput = {
        classCode: form.classCode.trim(),
        name: form.name.trim(),
        academicYear: form.academicYear.trim() || undefined,
        subjectId: form.subjectId === 'none' ? undefined : form.subjectId || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      }
      mutations.create.mutate(input, handlers)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{schoolClass ? 'Cập nhật lớp học' : 'Tạo lớp học'}</DialogTitle>
          <DialogDescription>
            Lớp học thuộc module quản lý sinh viên của tổ chức. Mã lớp không thể sửa sau khi tạo.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mã lớp" required>
              <Input
                value={form.classCode}
                disabled={Boolean(schoolClass)}
                onChange={(event) => setForm({ ...form, classCode: event.target.value })}
              />
            </Field>
            <Field label="Tên lớp" required>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="Niên khoá">
              <Input
                value={form.academicYear}
                placeholder="VD: 2025-2028"
                onChange={(event) => setForm({ ...form, academicYear: event.target.value })}
              />
            </Field>
            <Field label="Môn học">
              <Select
                value={form.subjectId || 'none'}
                onValueChange={(value) => setForm({ ...form, subjectId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn môn học" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Chưa gán môn</SelectItem>
                  {(subjects.data ?? []).map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Ngày bắt đầu">
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              />
            </Field>
            <Field label="Ngày kết thúc">
              <Input
                type="date"
                value={form.endDate}
                onChange={(event) => setForm({ ...form, endDate: event.target.value })}
              />
            </Field>
          </div>
          {!schoolClass ? (
            <p className="text-xs text-ink-500">
              Lớp mới bắt đầu ở trạng thái “Chưa bắt đầu”; trạng thái tự chuyển khi tới ngày bắt
              đầu/kết thúc.
            </p>
          ) : null}
          {error ? <p className="text-sm text-danger-600">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            onClick={submit}
            isLoading={mutations.create.isPending || mutations.update.isPending}
          >
            {schoolClass ? 'Lưu thay đổi' : 'Tạo lớp'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ClassDetailDialog({
  classId,
  open,
  onOpenChange,
}: {
  classId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { can, isOwner, session } = usePermission()
  const detail = useClass(classId ?? undefined)
  // Ai xem được lớp (kể cả trưởng phòng chỉ có class.view phạm vi phòng) thì xem được sinh viên trong lớp.
  const canViewStudents = can(PERM.classView) || can(PERM.studentView)
  const students = useClassStudents(classId ?? undefined, open && canViewStudents)
  const logs = useClassHistory(classId ?? undefined)
  const events = useClassCloseEvents(classId ?? undefined)
  const mutations = useClassMutations()
  const teacherSearch = useDeferredValue('')
  const assignable = useAssignableTeachers(
    teacherSearch,
    open && (can(PERM.classAssignTeacher) || can(PERM.classTeacherReassign)),
  )

  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [studentQuery, setStudentQuery] = useState('')
  const deferredStudentQuery = useDeferredValue(studentQuery.trim())
  const studentLookup = useStudents({
    page: 1,
    size: 10,
    q: deferredStudentQuery || undefined,
  })

  const schoolClass = detail.data
  // Duyệt huỷ/đóng lớp do ClassApprovalPolicy quyết (trưởng phòng, Tổng quản lý được uỷ quyền, chủ tổ chức).
  const canDecide = isOwner || can(PERM.classApproveClose) || Boolean(session?.approvals?.classLifecycle)

  const run = (action: () => void) => {
    try {
      action()
    } catch {
      toast.error('Không thực hiện được thao tác.')
    }
  }

  const fail = (cause: unknown) =>
    toast.error(ApiError.from(cause).message || 'Không thực hiện được thao tác.')

  useEffect(() => {
    setReason('')
    setNote('')
    setTeacherId('')
    setStudentQuery('')
  }, [classId])

  const studentsInClass = students.data ?? []
  const availableStudents = (studentLookup.data?.items ?? []).filter(
    (student) => !studentsInClass.some((item) => item.id === student.id),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {schoolClass ? `${schoolClass.classCode} · ${schoolClass.name}` : 'Chi tiết lớp học'}
          </DialogTitle>
          <DialogDescription>Thông tin lớp, giáo viên phụ trách và quy trình huỷ/đóng lớp.</DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[70vh] space-y-5 overflow-y-auto">
          {detail.isLoading ? <Spinner label="Đang tải lớp học…" /> : null}
          {detail.isError ? (
            <ErrorState
              title="Không tải được lớp học"
              description={ApiError.from(detail.error).message}
              onRetry={() => void detail.refetch()}
            />
          ) : null}
          {schoolClass ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge tone={schoolClass.status === 'DA_HUY' ? 'danger' : schoolClass.status === 'DANG_DIEN_RA' ? 'success' : 'neutral'}>
                  {CLASS_STATUS_LABELS[schoolClass.status] ?? schoolClass.status}
                </Badge>
                <Badge tone={schoolClass.closeState === 'PENDING' ? 'warning' : 'outline'}>
                  {CLOSE_STATE_LABELS[schoolClass.closeState ?? 'NONE'] ?? 'Đóng lớp'}
                </Badge>
                <Badge tone={schoolClass.cancelState === 'PENDING' ? 'warning' : 'outline'}>
                  {CANCEL_STATE_LABELS[schoolClass.cancelState ?? 'NONE'] ?? 'Huỷ lớp'}
                </Badge>
                {schoolClass.needsReassignment ? (
                  <Badge tone="danger">Cần phân công lại giáo viên</Badge>
                ) : null}
              </div>

              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-ink-500">Niên khoá</dt>
                  <dd className="text-ink-900">{schoolClass.academicYear ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Môn học</dt>
                  <dd className="text-ink-900">{schoolClass.subjectName ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Số sinh viên</dt>
                  <dd className="text-ink-900">{schoolClass.studentCount}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Bắt đầu</dt>
                  <dd className="text-ink-900">{formatDate(schoolClass.startDate)}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Kết thúc</dt>
                  <dd className="text-ink-900">{formatDate(schoolClass.endDate)}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Giáo viên</dt>
                  <dd className="text-ink-900">{schoolClass.teacher?.fullName ?? 'Chưa phân công'}</dd>
                </div>
              </dl>

              {schoolClass.cancelReason ? (
                <Alert tone="warning" title="Lý do huỷ lớp">
                  {schoolClass.cancelReason}
                </Alert>
              ) : null}
              {schoolClass.cancelState === 'PENDING' && schoolClass.cancelRequestReason ? (
                <Alert tone="warning" title="Yêu cầu huỷ đang chờ duyệt">
                  {schoolClass.cancelRequestReason}
                </Alert>
              ) : null}
              {schoolClass.closeRequestNote ? (
                <Alert tone="info" title="Ghi chú yêu cầu đóng lớp">
                  {schoolClass.closeRequestNote}
                </Alert>
              ) : null}
              {schoolClass.closeRejectReason ? (
                <Alert tone="danger" title="Lý do từ chối đóng lớp">
                  {schoolClass.closeRejectReason}
                </Alert>
              ) : null}
              {schoolClass.reassignmentReason ? (
                <Alert tone="danger" title="Lý do cần phân công lại">
                  {schoolClass.reassignmentReason}
                </Alert>
              ) : null}

              {(can(PERM.classAssignTeacher) || can(PERM.classTeacherReassign)) &&
              schoolClass.status !== 'DA_HUY' &&
              schoolClass.closeState !== 'CLOSED' ? (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-ink-900">Phân công giáo viên</h3>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select value={teacherId} onValueChange={setTeacherId}>
                      <SelectTrigger className="sm:w-72">
                        <SelectValue placeholder="Chọn giáo viên khả dụng" />
                      </SelectTrigger>
                      <SelectContent>
                        {(assignable.data?.items ?? []).map((teacher) => (
                          <SelectItem key={teacher.userId} value={teacher.userId}>
                            {teacher.fullName} · {teacher.staffCode ?? 'chưa có mã'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      disabled={!teacherId}
                      isLoading={mutations.assignTeacher.isPending || mutations.reassignTeacher.isPending}
                      onClick={() =>
                        run(() => {
                          const handler = {
                            onSuccess: () => toast.success('Đã phân công giáo viên.'),
                            onError: fail,
                          }
                          const payload = {
                            id: schoolClass.id,
                            teacherId,
                            version: schoolClass.version,
                          }
                          if (schoolClass.teacher) mutations.reassignTeacher.mutate(payload, handler)
                          else mutations.assignTeacher.mutate(payload, handler)
                        })
                      }
                    >
                      {schoolClass.teacher ? 'Phân công lại' : 'Phân công'}
                    </Button>
                  </div>
                </section>
              ) : null}

              {canViewStudents ? (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-ink-900">Sinh viên trong lớp</h3>
                  {students.isLoading ? <Spinner label="Đang tải sinh viên…" /> : null}
                  {students.isError ? (
                    <ErrorState
                      title="Không tải được sinh viên trong lớp"
                      description={ApiError.from(students.error).message}
                      onRetry={() => void students.refetch()}
                    />
                  ) : null}
                  {studentsInClass.length === 0 && !students.isLoading ? (
                    <p className="text-sm text-ink-500">Lớp chưa có sinh viên.</p>
                  ) : (
                    <ul className="divide-y divide-line-100 rounded-md border border-line-200">
                      {studentsInClass.map((student) => (
                        <li key={student.id} className="flex items-center justify-between gap-2 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-ink-900">{student.fullName}</p>
                            <p className="text-xs text-ink-500">{student.studentCode}</p>
                          </div>
                          {can(PERM.classEdit) ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                run(() =>
                                  mutations.removeStudent.mutate(
                                    { id: schoolClass.id, studentId: student.id },
                                    {
                                      onSuccess: () => toast.success('Đã gỡ sinh viên khỏi lớp.'),
                                      onError: fail,
                                    },
                                  ),
                                )
                              }
                            >
                              Gỡ
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                  {can(PERM.classEdit) ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <SearchInput
                        value={studentQuery}
                        onValueChange={setStudentQuery}
                        placeholder="Tìm sinh viên để thêm…"
                      />
                      <div className="flex flex-1 flex-wrap gap-1">
                        {availableStudents.slice(0, 5).map((student) => (
                          <Button
                            key={student.id}
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              run(() =>
                                mutations.addStudent.mutate(
                                  { id: schoolClass.id, studentId: student.id },
                                  {
                                    onSuccess: () => {
                                      toast.success('Đã thêm sinh viên vào lớp.')
                                      setStudentQuery('')
                                    },
                                    onError: fail,
                                  },
                                ),
                              )
                            }
                          >
                            <UserPlus aria-hidden="true" />
                            {student.fullName}
                          </Button>
                        ))}
                        {deferredStudentQuery && availableStudents.length === 0 ? (
                          <p className="text-xs text-ink-500">Không còn sinh viên phù hợp để thêm.</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-ink-900">Quy trình trạng thái</h3>
                {schoolClass.cancelState === 'PENDING' && canDecide ? (
                  <div className="space-y-2 rounded-md border border-warning-200 bg-warning-50/40 p-3">
                    <p className="text-sm text-ink-700">Yêu cầu huỷ lớp đang chờ bạn quyết định.</p>
                    <Textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Lý do từ chối (bắt buộc khi từ chối)"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        isLoading={mutations.approveCancel.isPending}
                        onClick={() =>
                          run(() =>
                            mutations.approveCancel.mutate(schoolClass.id, {
                              onSuccess: () => toast.success('Đã duyệt huỷ lớp.'),
                              onError: fail,
                            }),
                          )
                        }
                      >
                        Duyệt huỷ
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!reason.trim()}
                        isLoading={mutations.rejectCancel.isPending}
                        onClick={() =>
                          run(() =>
                            mutations.rejectCancel.mutate(
                              { id: schoolClass.id, reason: reason.trim() },
                              {
                                onSuccess: () => {
                                  toast.success('Đã từ chối huỷ lớp.')
                                  setReason('')
                                },
                                onError: fail,
                              },
                            ),
                          )
                        }
                      >
                        Từ chối
                      </Button>
                    </div>
                  </div>
                ) : null}

                {schoolClass.closeState === 'PENDING' && canDecide ? (
                  <div className="space-y-2 rounded-md border border-warning-200 bg-warning-50/40 p-3">
                    <p className="text-sm text-ink-700">Yêu cầu đóng lớp đang chờ bạn quyết định.</p>
                    <Textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Lý do từ chối (bắt buộc khi từ chối)"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        isLoading={mutations.approveClose.isPending}
                        onClick={() =>
                          run(() =>
                            mutations.approveClose.mutate(schoolClass.id, {
                              onSuccess: () => toast.success('Đã duyệt đóng lớp.'),
                              onError: fail,
                            }),
                          )
                        }
                      >
                        Duyệt đóng
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!reason.trim()}
                        isLoading={mutations.rejectClose.isPending}
                        onClick={() =>
                          run(() =>
                            mutations.rejectClose.mutate(
                              { id: schoolClass.id, reason: reason.trim() },
                              {
                                onSuccess: () => {
                                  toast.success('Đã từ chối đóng lớp.')
                                  setReason('')
                                },
                                onError: fail,
                              },
                            ),
                          )
                        }
                      >
                        Từ chối
                      </Button>
                    </div>
                  </div>
                ) : null}

                {can(PERM.classCancel) &&
                schoolClass.cancelState !== 'PENDING' &&
                schoolClass.status !== 'DA_HUY' ? (
                  <div className="space-y-2 rounded-md border border-line-200 p-3">
                    <p className="text-sm font-medium text-ink-800">Yêu cầu huỷ lớp</p>
                    <Textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Lý do huỷ lớp"
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={!reason.trim()}
                      isLoading={mutations.requestCancel.isPending}
                      onClick={() =>
                        run(() =>
                          mutations.requestCancel.mutate(
                            { id: schoolClass.id, reason: reason.trim(), version: schoolClass.version },
                            {
                              onSuccess: () => {
                                toast.success('Đã gửi yêu cầu huỷ lớp.')
                                setReason('')
                              },
                              onError: fail,
                            },
                          ),
                        )
                      }
                    >
                      Gửi yêu cầu huỷ
                    </Button>
                  </div>
                ) : null}

                {can(PERM.classRequestClose) &&
                schoolClass.closeState !== 'PENDING' &&
                schoolClass.closeState !== 'CLOSED' ? (
                  <div className="space-y-2 rounded-md border border-line-200 p-3">
                    <p className="text-sm font-medium text-ink-800">Yêu cầu đóng lớp</p>
                    <Textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Ghi chú gửi người duyệt (không bắt buộc)"
                    />
                    <Button
                      size="sm"
                      isLoading={mutations.requestClose.isPending}
                      onClick={() =>
                        run(() =>
                          mutations.requestClose.mutate(
                            { id: schoolClass.id, note: note.trim() || undefined },
                            {
                              onSuccess: () => {
                                toast.success('Đã gửi yêu cầu đóng lớp.')
                                setNote('')
                              },
                              onError: fail,
                            },
                          ),
                        )
                      }
                    >
                      Gửi yêu cầu đóng
                    </Button>
                  </div>
                ) : null}

                {can(PERM.classReopen) && schoolClass.closeState === 'CLOSED' ? (
                  <div className="space-y-2 rounded-md border border-line-200 p-3">
                    <p className="text-sm font-medium text-ink-800">Mở lại lớp</p>
                    <Textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Lý do mở lại (không bắt buộc)"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      isLoading={mutations.reopen.isPending}
                      onClick={() =>
                        run(() =>
                          mutations.reopen.mutate(
                            { id: schoolClass.id, reason: reason.trim() || undefined },
                            {
                              onSuccess: () => {
                                toast.success('Đã mở lại lớp.')
                                setReason('')
                              },
                              onError: fail,
                            },
                          ),
                        )
                      }
                    >
                      Mở lại lớp
                    </Button>
                  </div>
                ) : null}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-ink-900">Lịch sử trạng thái</h3>
                {logs.isLoading ? <Spinner label="Đang tải lịch sử…" /> : null}
                {logs.data?.length === 0 ? (
                  <p className="text-sm text-ink-500">Chưa có thay đổi trạng thái.</p>
                ) : null}
                <ul className="space-y-2 text-sm">
                  {(logs.data ?? []).map((log) => (
                    <li key={log.id} className="rounded-md border border-line-100 px-3 py-2">
                      <p className="text-ink-800">
                        {log.fromStatus ? `${log.fromStatus} → ` : ''}
                        {log.toStatus}
                      </p>
                      <p className="text-xs text-ink-500">
                        {log.actorName ?? 'Hệ thống'} · {formatDateTime(log.changedAt)}
                      </p>
                      {log.reason ? <p className="mt-1 text-xs text-ink-600">{log.reason}</p> : null}
                    </li>
                  ))}
                </ul>
                {events.data?.length ? (
                  <>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                      Sự kiện đóng lớp
                    </h4>
                    <ul className="space-y-2 text-sm">
                      {events.data.map((event) => (
                        <li key={event.id} className="rounded-md border border-line-100 px-3 py-2">
                          <p className="text-ink-800">{event.action}</p>
                          <p className="text-xs text-ink-500">
                            {event.actorName ?? 'Hệ thống'} · {formatDateTime(event.createdAt)}
                          </p>
                          {event.reason ? (
                            <p className="mt-1 text-xs text-ink-600">Lý do: {event.reason}</p>
                          ) : null}
                          {event.note ? (
                            <p className="text-xs text-ink-600">Ghi chú: {event.note}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </section>
            </>
          ) : null}
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

export function ClassesPage() {
  const { can } = usePermission()
  const canView = can(PERM.classView)
  const canCreate = can(PERM.classCreate)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim())
  const [status, setStatus] = useState('all')
  const [needsReassignment, setNeedsReassignment] = useState(false)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SchoolClass | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<SchoolClass | null>(null)
  const [createdClass, setCreatedClass] = useState<SchoolClass | null>(null)

  const classes = useClasses(
    {
      page,
      size,
      q: deferredSearch || undefined,
      status: status === 'all' ? undefined : status,
      needsReassignment: needsReassignment ? true : undefined,
    },
    canView,
  )
  const mutations = useClassMutations()

  // Có class.create mà không có class.view: chỉ mở luồng tạo, không đọc danh sách/chi tiết.
  if (!canView) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow="Đào tạo · Lớp học"
          title="Lớp học"
          description="Tạo lớp học mới. Danh sách lớp cần quyền xem lớp học."
          actions={
            canCreate ? (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null)
                  setCreatedClass(null)
                  setFormOpen(true)
                }}
              >
                <Plus aria-hidden="true" />
                Tạo lớp
              </Button>
            ) : null
          }
        />

        {createdClass ? (
          <Alert tone="success" className="mt-5" title="Đã tạo lớp học">
            {createdClass.classCode} · {createdClass.name}
          </Alert>
        ) : (
          <Alert tone="info" className="mt-5" title="Chỉ có quyền tạo lớp">
            Tài khoản của bạn chưa có quyền xem danh sách lớp học. Bạn vẫn có thể tạo lớp mới; lớp
            vừa tạo sẽ hiển thị ngay tại đây.
          </Alert>
        )}

        <ClassFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          schoolClass={null}
          onCreated={setCreatedClass}
        />
      </PageContainer>
    )
  }

  const rows = classes.data?.items ?? []
  const total = classes.data?.total ?? 0
  const pendingClose = rows.filter((row) => row.closeState === 'PENDING').length

  const columns: DataColumn<SchoolClass>[] = [
    {
      id: 'class',
      header: 'Lớp học',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-900">{row.classCode}</p>
          <p className="truncate text-xs text-ink-500">{row.name}</p>
        </div>
      ),
      sortValue: (row) => row.classCode,
    },
    {
      id: 'subject',
      header: 'Môn học',
      hideBelow: 'md',
      cell: (row) => row.subjectName ?? '—',
    },
    {
      id: 'teacher',
      header: 'Giáo viên',
      hideBelow: 'md',
      cell: (row) => row.teacher?.fullName ?? 'Chưa phân công',
    },
    {
      id: 'students',
      header: 'Sinh viên',
      align: 'right',
      cell: (row) => row.studentCount,
      sortValue: (row) => row.studentCount,
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone={row.status === 'DA_HUY' ? 'danger' : row.status === 'DANG_DIEN_RA' ? 'success' : 'neutral'}>
            {CLASS_STATUS_LABELS[row.status] ?? row.status}
          </Badge>
          {row.closeState === 'PENDING' ? <Badge tone="warning">Chờ đóng</Badge> : null}
          {row.cancelState === 'PENDING' ? <Badge tone="warning">Chờ huỷ</Badge> : null}
          {row.needsReassignment ? <Badge tone="danger">Cần phân công</Badge> : null}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setDetailId(row.id)}>
            <BookOpen aria-hidden="true" />
            Chi tiết
          </Button>
          {can(PERM.classEdit) ? (
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
          {can(PERM.classDelete) ? (
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
        eyebrow="Đào tạo · Lớp học"
        title="Lớp học"
        description="Quản lý lớp, phân công giáo viên, sinh viên và quy trình huỷ/đóng lớp."
        actions={
          can(PERM.classCreate) ? (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus aria-hidden="true" />
              Tạo lớp
            </Button>
          ) : null
        }
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
              <Users className="size-3.5" aria-hidden="true" />
              {total} lớp
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
              <span className="size-1.5 rounded-full bg-warning-500" aria-hidden="true" />
              {pendingClose} lớp chờ đóng (trang này)
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
          placeholder="Tìm theo mã hoặc tên lớp…"
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            <SelectItem value="CHUA_BAT_DAU">Chưa bắt đầu</SelectItem>
            <SelectItem value="DANG_DIEN_RA">Đang diễn ra</SelectItem>
            <SelectItem value="DA_KET_THUC">Đã kết thúc</SelectItem>
            <SelectItem value="DA_HUY">Đã huỷ</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={needsReassignment}
            onChange={(event) => {
              setNeedsReassignment(event.target.checked)
              setPage(1)
            }}
            className="size-4 rounded border-line-300"
          />
          Chỉ lớp cần phân công lại
        </label>
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          isLoading={classes.isLoading}
          error={
            classes.isError ? (
              <ErrorState
                title="Không tải được danh sách lớp"
                description={ApiError.from(classes.error).message}
                onRetry={() => void classes.refetch()}
              />
            ) : undefined
          }
          empty={<p className="py-8 text-center text-sm text-ink-500">Không có lớp phù hợp.</p>}
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

      <ClassFormDialog open={formOpen} onOpenChange={setFormOpen} schoolClass={editing} />
      <ClassDetailDialog
        classId={detailId}
        open={Boolean(detailId)}
        onOpenChange={(open) => !open && setDetailId(null)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Xoá lớp học"
        description={`Xoá lớp ${deleting?.classCode ?? ''}? Chỉ xoá được khi lớp không còn sinh viên.`}
        confirmLabel="Xoá"
        tone="danger"
        onConfirm={() => {
          if (!deleting) return
          mutations.remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success('Đã xoá lớp học.')
              setDeleting(null)
            },
            onError: (cause) =>
              toast.error(ApiError.from(cause).message || 'Không xoá được lớp học.'),
          })
        }}
      />
    </PageContainer>
  )
}
