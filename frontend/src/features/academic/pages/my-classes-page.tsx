import { BookOpen, Users } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { Spinner } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { useMyClasses, useMyClassStudents, useMyTeacherProfile } from '@/features/academic/hooks'
import {
  CLASS_STATUS_LABELS,
  CLOSE_STATE_LABELS,
  TEACHING_STATUS_LABELS,
  type SchoolClass,
} from '@/features/academic/types'
import { errorMessage } from '@/lib/api-error'

/** Giáo viên xem lớp mình phụ trách và sinh viên trong lớp — chỉ dữ liệu của chính mình. */
export function MyClassesPage() {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<SchoolClass | null>(null)
  const profile = useMyTeacherProfile()
  const classes = useMyClasses({ page: 1, size: 50, q: q.trim() || undefined })
  const students = useMyClassStudents(selected?.id, Boolean(selected))

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Đào tạo · Lớp của tôi"
        title="Lớp tôi phụ trách"
        description="Danh sách lớp được phân công cho bạn và sinh viên trong từng lớp."
        meta={
          profile.data ? (
            <span className="text-xs text-ink-500">
              {profile.data.staffCode ? `Mã GV ${profile.data.staffCode} · ` : ''}
              {profile.data.teachingStatus
                ? TEACHING_STATUS_LABELS[profile.data.teachingStatus] ?? profile.data.teachingStatus
                : 'Giáo viên'}
            </span>
          ) : null
        }
      />

      <div className="mt-4 max-w-sm">
        <SearchInput value={q} onValueChange={setQ} placeholder="Tìm theo mã hoặc tên lớp" />
      </div>

      <div className="mt-4">
        {classes.isLoading ? <Spinner label="Đang tải lớp học…" /> : null}
        {classes.isError ? (
          <ErrorState
            title="Không tải được lớp của bạn"
            description={errorMessage(classes.error)}
            onRetry={() => void classes.refetch()}
          />
        ) : null}
        {!classes.isLoading && !classes.isError && (classes.data?.items ?? []).length === 0 ? (
          <EmptyState
            icon={<BookOpen className="size-5" aria-hidden="true" />}
            title="Bạn chưa được phân công lớp"
            description="Khi quản lý đào tạo gán bạn phụ trách lớp, lớp sẽ xuất hiện tại đây."
          />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {(classes.data?.items ?? []).map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-2 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink-900">
                      {item.classCode} · {item.name}
                    </p>
                    <p className="text-xs text-ink-500">
                      {[item.academicYear, item.subjectName].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <Badge tone={item.status === 'DA_HUY' ? 'danger' : 'success'} dot>
                    {CLASS_STATUS_LABELS[item.status] ?? item.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
                    <Users className="size-3.5" aria-hidden="true" />
                    {item.studentCount} sinh viên
                    {item.closeState && item.closeState !== 'NONE'
                      ? ` · ${CLOSE_STATE_LABELS[item.closeState] ?? item.closeState}`
                      : ''}
                  </span>
                  <button
                    type="button"
                    className="text-sm font-medium text-jade-700 hover:underline"
                    onClick={() => setSelected(item)}
                  >
                    Xem sinh viên
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected ? `${selected.classCode} · ${selected.name}` : 'Sinh viên'}</DialogTitle>
            <DialogDescription>Sinh viên đang theo học lớp bạn phụ trách.</DialogDescription>
          </DialogHeader>
          <DialogBody className="max-h-[60vh] overflow-y-auto">
            {students.isLoading ? <Spinner label="Đang tải sinh viên…" /> : null}
            {students.isError ? (
              <ErrorState
                title="Không tải được sinh viên"
                description={errorMessage(students.error)}
                onRetry={() => void students.refetch()}
              />
            ) : null}
            {!students.isLoading && !students.isError && (students.data ?? []).length === 0 ? (
              <p className="text-sm text-ink-500">Lớp chưa có sinh viên.</p>
            ) : null}
            <ul className="divide-y divide-line-100">
              {(students.data ?? []).map((student) => (
                <li key={student.id} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{student.fullName}</p>
                    <p className="text-xs text-ink-500">{student.studentCode}</p>
                  </div>
                  <Badge tone="neutral">{student.status}</Badge>
                </li>
              ))}
            </ul>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
