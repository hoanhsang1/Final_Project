import { BookOpen, ChevronRight, Pencil, Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { useCurricula, useCurriculumMutations } from '@/features/academic/hooks'
import type { CurriculumCreateRequest, CurriculumSummary, CurriculumUpdateRequest } from '@/features/academic/types'
import { usePermission } from '@/features/auth/hooks'
import { ApiError } from '@/lib/api-error'
import { PERM } from '@/lib/permissions'

// ─── Form ─────────────────────────────────────────────────────────────────────

type CurriculumForm = {
  code: string
  name: string
  description: string
  gradeLevel: string
  majorCode: string
}

const EMPTY_FORM: CurriculumForm = {
  code: '',
  name: '',
  description: '',
  gradeLevel: '',
  majorCode: '',
}

function CurriculumFormDialog({
  open,
  onOpenChange,
  curriculum,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  curriculum: CurriculumSummary | null
}) {
  const mutations = useCurriculumMutations()
  const [form, setForm] = useState<CurriculumForm>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  const handleOpenChange = (val: boolean) => {
    if (val) {
      setForm(
        curriculum
          ? {
              code: curriculum.code,
              name: curriculum.name,
              description: '',
              gradeLevel: curriculum.gradeLevel ?? '',
              majorCode: '',
            }
          : EMPTY_FORM,
      )
      setError(null)
    }
    onOpenChange(val)
  }

  const isEditing = Boolean(curriculum)
  const isPending = mutations.create.isPending || mutations.update.isPending

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Tên chương trình đào tạo là bắt buộc')
      return
    }
    if (!form.code.trim()) {
      setError('Mã chương trình đào tạo là bắt buộc')
      return
    }

    setError(null)
    try {
      if (isEditing && curriculum) {
        const input: CurriculumUpdateRequest = {
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          gradeLevel: form.gradeLevel.trim() || undefined,
          majorCode: form.majorCode.trim() || undefined,
          version: curriculum.version,
        }
        await mutations.update.mutateAsync({ id: curriculum.id, input })
        toast.success('Đã cập nhật chương trình đào tạo')
      } else {
        const input: CurriculumCreateRequest = {
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          gradeLevel: form.gradeLevel.trim() || undefined,
          majorCode: form.majorCode.trim() || undefined,
        }
        await mutations.create.mutateAsync(input)
        toast.success('Đã tạo chương trình đào tạo')
      }
      onOpenChange(false)
    } catch (err) {
      setError(ApiError.from(err).message || 'Đã xảy ra lỗi, vui lòng thử lại')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Chỉnh sửa chương trình đào tạo' : 'Thêm chương trình đào tạo'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Cập nhật thông tin chương trình đào tạo.'
              : 'Nhập thông tin chương trình đào tạo mới.'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Mã chương trình *">
            <Input
              placeholder="VD: THPT-2024"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              maxLength={50}
            />
          </Field>
          <Field label="Tên chương trình *">
            <Input
              placeholder="VD: Chương trình THPT năm 2024"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={200}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cấp độ">
              <Input
                placeholder="VD: Lớp 10"
                value={form.gradeLevel}
                onChange={(e) => setForm((f) => ({ ...f, gradeLevel: e.target.value }))}
                maxLength={50}
              />
            </Field>
            <Field label="Chuyên ngành">
              <Input
                placeholder="VD: TN, XH"
                value={form.majorCode}
                onChange={(e) => setForm((f) => ({ ...f, majorCode: e.target.value }))}
                maxLength={50}
              />
            </Field>
          </div>
          <Field label="Mô tả">
            <Textarea
              placeholder="Mô tả ngắn về chương trình đào tạo..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              maxLength={1000}
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} isLoading={isPending}>
            {isEditing ? 'Cập nhật' : 'Tạo chương trình'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CurriculaPage() {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canManage = can(PERM.curriculumManage)

  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CurriculumSummary | null>(null)

  const deferredQ = useDeferredValue(q)
  const isActive = statusFilter === 'all' ? undefined : statusFilter === 'active'

  const { data, isLoading, isError, error } = useCurricula({
    q: deferredQ || undefined,
    isActive,
    page: 1,
    size: 50,
  })

  const mutations = useCurriculumMutations()

  const handleToggleActive = async (curriculum: CurriculumSummary) => {
    try {
      await mutations.setActive.mutateAsync({ id: curriculum.id, active: !curriculum.isActive })
      toast.success(curriculum.isActive ? 'Đã ngừng kích hoạt chương trình' : 'Đã kích hoạt chương trình')
    } catch (err) {
      toast.error(ApiError.from(err).message || 'Không thể thay đổi trạng thái')
    }
  }

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (c: CurriculumSummary) => {
    setEditing(c)
    setDialogOpen(true)
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Đào tạo"
        title="Chương trình đào tạo"
        description="Quản lý khung chương trình đào tạo và danh sách môn học."
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="size-4 mr-2" />
              Thêm chương trình
            </Button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchInput
          value={q}
          onValueChange={setQ}
          placeholder="Tìm kiếm theo tên hoặc mã..."
          className="flex-1"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Spinner className="size-8" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Không thể tải danh sách chương trình đào tạo"
          description={ApiError.from(error).message}
        />
      ) : !data?.items?.length ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <BookOpen className="mx-auto size-10 text-ink-400 mb-3" />
          <h3 className="text-base font-semibold text-ink-900">Chưa có chương trình đào tạo</h3>
          <p className="text-sm text-ink-500 mt-1 max-w-sm mx-auto">
            {q
              ? 'Không tìm thấy chương trình nào khớp với từ khoá tìm kiếm.'
              : 'Bắt đầu bằng cách thêm chương trình đào tạo đầu tiên.'}
          </p>
          {canManage && !q && (
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="size-4 mr-2" />
              Thêm chương trình
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.items.map((curriculum) => (
            <div
              key={curriculum.id}
              className="relative rounded-xl border border-line-200 bg-surface p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-ink-100 px-1.5 py-0.5 rounded text-ink-600">
                      {curriculum.code}
                    </span>
                    <Badge tone={curriculum.isActive ? 'success' : 'neutral'}>
                      {curriculum.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-ink-900">{curriculum.name}</h3>
                </div>
              </div>

              {/* Meta */}
              <div className="text-xs text-ink-500 space-y-1">
                {curriculum.gradeLevel && (
                  <div>
                    Cấp độ: <span className="text-ink-900">{curriculum.gradeLevel}</span>
                  </div>
                )}
                <div>
                  Số môn học: <span className="text-ink-900 font-medium">{curriculum.subjectCount ?? 0}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-line-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/dao-tao/chuong-trinh-dao-tao/${curriculum.id}`)}
                >
                  <ChevronRight className="size-4 mr-1" />
                  Xem chi tiết
                </Button>
                {canManage && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Chỉnh sửa"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(curriculum)
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title={curriculum.isActive ? 'Ngừng hoạt động' : 'Kích hoạt'}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleActive(curriculum)
                      }}
                    >
                      {curriculum.isActive ? (
                        <ToggleRight className="size-4 text-success-600" />
                      ) : (
                        <ToggleLeft className="size-4 text-ink-400" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CurriculumFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        curriculum={editing}
      />
    </PageContainer>
  )
}
