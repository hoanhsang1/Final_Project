import {
  BookOpen,
  Pencil,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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
import { Spinner } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import {
  useCurriculum,
  useCurriculumMutations,
  useCurriculumSubjectMutations,
  useCurriculumSubjects,
  useSubjects,
} from '@/features/academic/hooks'
import type {
  CurriculumSubject,
  CurriculumSubjectCreateRequest,
  CurriculumSubjectUpdateRequest,
} from '@/features/academic/types'
import { usePermission } from '@/features/auth/hooks'
import { ApiError } from '@/lib/api-error'
import { PERM } from '@/lib/permissions'

// ─── Add Subject Dialog ───────────────────────────────────────────────────────

type SubjectForm = {
  subjectId: string
  sequenceNo: string
  requiredSessions: string
  sessionMinutes: string
  theoryHours: string
  practiceHours: string
  isRequired: boolean
  notes: string
}

const EMPTY_SUBJECT_FORM: SubjectForm = {
  subjectId: '',
  sequenceNo: '1',
  requiredSessions: '30',
  sessionMinutes: '45',
  theoryHours: '',
  practiceHours: '',
  isRequired: true,
  notes: '',
}

function SubjectFormDialog({
  open,
  onOpenChange,
  curriculumId,
  editing,
  existingSubjectIds,
  nextSequenceNo,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  curriculumId: string
  editing: CurriculumSubject | null
  existingSubjectIds: string[]
  nextSequenceNo: number
}) {
  const { data: subjects } = useSubjects({ includeInactive: false })
  const mutations = useCurriculumSubjectMutations(curriculumId)
  const [form, setForm] = useState<SubjectForm>(EMPTY_SUBJECT_FORM)
  const [error, setError] = useState<string | null>(null)
  const [subjectSearch, setSubjectSearch] = useState('')
  const deferredSearch = useDeferredValue(subjectSearch)

  const handleOpenChange = (val: boolean) => {
    if (val) {
      if (editing) {
        setForm({
          subjectId: editing.subjectId,
          sequenceNo: String(editing.sequenceNo),
          requiredSessions: String(editing.requiredSessions),
          sessionMinutes: String(editing.sessionMinutes),
          theoryHours: editing.theoryHours != null ? String(editing.theoryHours) : '',
          practiceHours: editing.practiceHours != null ? String(editing.practiceHours) : '',
          isRequired: editing.isRequired,
          notes: editing.notes ?? '',
        })
      } else {
        setForm({ ...EMPTY_SUBJECT_FORM, sequenceNo: String(nextSequenceNo) })
      }
      setError(null)
      setSubjectSearch('')
    }
    onOpenChange(val)
  }

  const isEditing = Boolean(editing)
  const isPending = mutations.addSubject.isPending || mutations.updateSubject.isPending

  const availableSubjects = (subjects ?? []).filter(
    (s) =>
      (!isEditing ? !existingSubjectIds.includes(s.id) : s.id === editing?.subjectId || !existingSubjectIds.includes(s.id)) &&
      (!deferredSearch ||
        s.name.toLowerCase().includes(deferredSearch.toLowerCase()) ||
        (s.code?.toLowerCase().includes(deferredSearch.toLowerCase()) ?? false)),
  )

  const handleSubmit = async () => {
    if (!form.subjectId) {
      setError('Vui lòng chọn môn học')
      return
    }
    const sequenceNo = parseInt(form.sequenceNo) || 1
    const requiredSessions = parseInt(form.requiredSessions) || 1
    const sessionMinutes = parseInt(form.sessionMinutes) || 45

    setError(null)
    try {
      if (isEditing && editing) {
        const input: CurriculumSubjectUpdateRequest = {
          sequenceNo,
          requiredSessions,
          sessionMinutes,
          theoryHours: form.theoryHours ? parseFloat(form.theoryHours) : undefined,
          practiceHours: form.practiceHours ? parseFloat(form.practiceHours) : undefined,
          isRequired: form.isRequired,
          notes: form.notes.trim() || undefined,
        }
        await mutations.updateSubject.mutateAsync({ subjectId: editing.subjectId, input })
        toast.success('Đã cập nhật môn học')
      } else {
        const input: CurriculumSubjectCreateRequest = {
          subjectId: form.subjectId,
          sequenceNo,
          requiredSessions,
          sessionMinutes,
          theoryHours: form.theoryHours ? parseFloat(form.theoryHours) : undefined,
          practiceHours: form.practiceHours ? parseFloat(form.practiceHours) : undefined,
          isRequired: form.isRequired,
          notes: form.notes.trim() || undefined,
        }
        await mutations.addSubject.mutateAsync(input)
        toast.success('Đã thêm môn học vào chương trình')
      }
      onOpenChange(false)
    } catch (err) {
      setError(ApiError.from(err).message || 'Đã xảy ra lỗi')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Chỉnh sửa môn học' : 'Thêm môn học vào chương trình'}</DialogTitle>
          <DialogDescription>
            Cấu hình số buổi học và thời lượng mỗi buổi.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}

          {/* Subject picker */}
          {!isEditing && (
            <Field label="Môn học *">
              <SearchInput
                value={subjectSearch}
                onValueChange={setSubjectSearch}
                placeholder="Tìm kiếm môn học..."
                className="mb-2"
              />
              <div className="max-h-40 overflow-y-auto border border-line-200 rounded-md divide-y divide-line-100">
                {availableSubjects.length === 0 ? (
                  <div className="p-3 text-sm text-ink-500 text-center">
                    {deferredSearch ? 'Không tìm thấy môn học phù hợp' : 'Tất cả môn học đã được thêm'}
                  </div>
                ) : (
                  availableSubjects.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-ink-50 transition-colors ${
                        form.subjectId === s.id ? 'bg-jade-50 font-medium' : ''
                      }`}
                      onClick={() => setForm((f) => ({ ...f, subjectId: s.id }))}
                    >
                      <span>{s.name}</span>
                      {s.code && (
                        <span className="ml-2 text-xs text-ink-500 font-mono">{s.code}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </Field>
          )}

          {isEditing && (
            <div className="text-sm font-medium text-ink-900">
              Môn học: <span className="text-jade-700">{editing?.subjectName}</span>
              {editing?.subjectCode && (
                <span className="ml-2 font-mono text-xs text-ink-500">{editing.subjectCode}</span>
              )}
            </div>
          )}

          {/* Session config */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số thứ tự">
              <Input
                type="number"
                min="1"
                value={form.sequenceNo}
                onChange={(e) => setForm((f) => ({ ...f, sequenceNo: e.target.value }))}
              />
            </Field>
            <Field label="Số buổi học *">
              <Input
                type="number"
                min="1"
                value={form.requiredSessions}
                onChange={(e) => setForm((f) => ({ ...f, requiredSessions: e.target.value }))}
              />
            </Field>
            <Field label="Thời lượng (phút) *">
              <Input
                type="number"
                min="1"
                value={form.sessionMinutes}
                onChange={(e) => setForm((f) => ({ ...f, sessionMinutes: e.target.value }))}
              />
            </Field>
            <Field label="Bắt buộc">
              <select
                className="flex h-9 w-full rounded-md border border-line-200 bg-surface px-3 py-1 text-sm shadow-sm transition-colors"
                value={form.isRequired ? 'true' : 'false'}
                onChange={(e) => setForm((f) => ({ ...f, isRequired: e.target.value === 'true' }))}
              >
                <option value="true">Bắt buộc</option>
                <option value="false">Tự chọn</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Giờ lý thuyết">
              <Input
                type="number"
                min="0"
                step="0.5"
                placeholder="Không bắt buộc"
                value={form.theoryHours}
                onChange={(e) => setForm((f) => ({ ...f, theoryHours: e.target.value }))}
              />
            </Field>
            <Field label="Giờ thực hành">
              <Input
                type="number"
                min="0"
                step="0.5"
                placeholder="Không bắt buộc"
                value={form.practiceHours}
                onChange={(e) => setForm((f) => ({ ...f, practiceHours: e.target.value }))}
              />
            </Field>
          </div>

          <Field label="Ghi chú">
            <Textarea
              placeholder="Ghi chú về môn học trong chương trình..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              maxLength={500}
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} isLoading={isPending} disabled={!isEditing && !form.subjectId}>
            {isEditing ? 'Cập nhật' : 'Thêm môn học'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CurriculumDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { can } = usePermission()
  const canManage = can(PERM.curriculumManage)

  const { data: curriculum, isLoading: loadingCurriculum, isError, error } = useCurriculum(id)
  const {
    data: curriculumSubjects,
    isLoading: loadingSubjects,
    isError: subjectsError,
    error: subjectsLoadError,
    refetch: refetchSubjects,
  } = useCurriculumSubjects(id)
  const mutations = useCurriculumMutations()
  const subjectMutations = useCurriculumSubjectMutations(id ?? '')

  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<CurriculumSubject | null>(null)
  const [deletingSubject, setDeletingSubject] = useState<CurriculumSubject | null>(null)

  if (!id) return null

  const isPageLoading = loadingCurriculum || loadingSubjects

  if (isPageLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <Spinner className="size-8" />
        </div>
      </PageContainer>
    )
  }

  if (isError || !curriculum) {
    return (
      <PageContainer>
        <ErrorState
          title="Không thể tải thông tin chương trình đào tạo"
          description={ApiError.from(error).message}
        />
      </PageContainer>
    )
  }

  if (subjectsError) {
    return (
      <PageContainer>
        <ErrorState
          title="Không tải được môn học của chương trình"
          description={ApiError.from(subjectsLoadError).message}
          onRetry={() => void refetchSubjects()}
        />
      </PageContainer>
    )
  }

  const subjects = curriculumSubjects ?? []
  const existingSubjectIds = subjects.map((s) => s.subjectId)
  const nextSequenceNo = subjects.length > 0 ? Math.max(...subjects.map((s) => s.sequenceNo)) + 1 : 1

  const handleToggleActive = async () => {
    try {
      await mutations.setActive.mutateAsync({ id, active: !curriculum.isActive })
      toast.success(curriculum.isActive ? 'Đã ngừng kích hoạt chương trình' : 'Đã kích hoạt chương trình')
    } catch (err) {
      toast.error(ApiError.from(err).message || 'Không thể thay đổi trạng thái')
    }
  }

  const handleRemoveSubject = async () => {
    if (!deletingSubject) return
    try {
      await subjectMutations.removeSubject.mutateAsync(deletingSubject.subjectId)
      toast.success('Đã xoá môn học khỏi chương trình')
      setDeletingSubject(null)
    } catch (err) {
      toast.error(ApiError.from(err).message || 'Không thể xoá môn học')
    }
  }

  return (
    <PageContainer>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-ink-500 mb-6">
        <Link to="/dao-tao/chuong-trinh-dao-tao" className="hover:text-ink-900 transition-colors">
          Chương trình đào tạo
        </Link>
        <span>/</span>
        <span className="text-ink-900">{curriculum.name}</span>
      </div>

      {/* Header */}
      <PageHeader
        eyebrow={
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-ink-100 px-2 py-0.5 rounded text-ink-600">{curriculum.code}</span>
            <Badge tone={curriculum.isActive ? 'success' : 'neutral'}>
              {curriculum.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
            </Badge>
          </div>
        }
        title={curriculum.name}
        description={curriculum.description ?? undefined}
        actions={
          canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleToggleActive}>
                {curriculum.isActive ? (
                  <><ToggleRight className="size-4 mr-2" /> Ngừng hoạt động</>
                ) : (
                  <><ToggleLeft className="size-4 mr-2" /> Kích hoạt</>
                )}
              </Button>
              <Button
                onClick={() => {
                  setEditingSubject(null)
                  setSubjectDialogOpen(true)
                }}
              >
                <Plus className="size-4 mr-2" />
                Thêm môn học
              </Button>
            </div>
          )
        }
      />

      {/* Meta info */}
      {(curriculum.gradeLevel || curriculum.majorCode) && (
        <div className="flex gap-4 text-sm text-ink-500 mb-6">
          {curriculum.gradeLevel && (
            <span>
              Cấp độ: <span className="text-ink-900">{curriculum.gradeLevel}</span>
            </span>
          )}
          {curriculum.majorCode && (
            <span>
              Chuyên ngành: <span className="text-ink-900">{curriculum.majorCode}</span>
            </span>
          )}
          <span>
            Phiên bản: <span className="text-ink-900">v{curriculum.version}</span>
          </span>
        </div>
      )}

      {/* Subject list */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-ink-900">
            Danh sách môn học ({subjects.length})
          </h2>
          {canManage && subjects.length > 0 && (
            <Button
              size="sm"
              onClick={() => {
                setEditingSubject(null)
                setSubjectDialogOpen(true)
              }}
            >
              <Plus className="size-4 mr-1" />
              Thêm môn
            </Button>
          )}
        </div>

        {subjects.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <BookOpen className="mx-auto size-10 text-ink-400 mb-3" />
            <h3 className="text-base font-semibold text-ink-900">Chưa có môn học nào</h3>
            <p className="text-sm text-ink-500 mt-1 max-w-sm mx-auto">
              Thêm môn học vào chương trình để bắt đầu.
            </p>
            {canManage && (
              <Button
                className="mt-4"
                onClick={() => {
                  setEditingSubject(null)
                  setSubjectDialogOpen(true)
                }}
              >
                <Plus className="size-4 mr-2" />
                Thêm môn học
              </Button>
            )}
          </div>
        ) : (
          <div className="border border-line-200 rounded-xl overflow-hidden bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-ink-50">
                <tr className="border-b border-line-200">
                  <th className="text-left px-4 py-3 font-medium text-ink-500 w-12">STT</th>
                  <th className="text-left px-4 py-3 font-medium text-ink-500">Môn học</th>
                  <th className="text-right px-4 py-3 font-medium text-ink-500">Số buổi</th>
                  <th className="text-right px-4 py-3 font-medium text-ink-500">Phút/buổi</th>
                  <th className="text-center px-4 py-3 font-medium text-ink-500">Bắt buộc</th>
                  <th className="text-left px-4 py-3 font-medium text-ink-500">Ghi chú</th>
                  {canManage && (
                    <th className="text-right px-4 py-3 font-medium text-ink-500">Thao tác</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-100">
                {subjects
                  .slice()
                  .sort((a, b) => a.sequenceNo - b.sequenceNo)
                  .map((cs) => (
                    <tr key={cs.subjectId} className="hover:bg-ink-50/50 transition-colors">
                      <td className="px-4 py-3 text-ink-500 text-center">{cs.sequenceNo}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink-900">{cs.subjectName}</div>
                        {cs.subjectCode && (
                          <div className="text-xs font-mono text-ink-500">{cs.subjectCode}</div>
                        )}
                        {(cs.theoryHours != null || cs.practiceHours != null) && (
                          <div className="text-xs text-ink-500">
                            {cs.theoryHours != null && `LT: ${cs.theoryHours}h`}
                            {cs.theoryHours != null && cs.practiceHours != null && ' · '}
                            {cs.practiceHours != null && `TH: ${cs.practiceHours}h`}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{cs.requiredSessions}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{cs.sessionMinutes}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone={cs.isRequired ? 'neutral' : 'outline'}>
                          {cs.isRequired ? 'Bắt buộc' : 'Tự chọn'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-ink-500 text-xs max-w-[200px] truncate">
                        {cs.notes ?? '—'}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingSubject(cs)
                                setSubjectDialogOpen(true)
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-danger-600 hover:text-danger-700"
                              onClick={() => setDeletingSubject(cs)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <SubjectFormDialog
        open={subjectDialogOpen}
        onOpenChange={setSubjectDialogOpen}
        curriculumId={id}
        editing={editingSubject}
        existingSubjectIds={existingSubjectIds}
        nextSequenceNo={nextSequenceNo}
      />

      <ConfirmDialog
        open={Boolean(deletingSubject)}
        onOpenChange={(v) => !v && setDeletingSubject(null)}
        title="Xoá môn học khỏi chương trình?"
        description={`Môn học "${deletingSubject?.subjectName}" sẽ bị xoá khỏi chương trình đào tạo này.`}
        confirmLabel="Xoá"
        tone="danger"
        onConfirm={handleRemoveSubject}
        isLoading={subjectMutations.removeSubject.isPending}
      />
    </PageContainer>
  )
}
