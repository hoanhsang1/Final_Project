import { BookOpen, GraduationCap, Mail, Phone } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/page-header'
import { Spinner } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { useMyStudent, useMyStudentClasses } from '@/features/academic/hooks'
import { STUDENT_STATUS_LABELS, type StudentClass } from '@/features/academic/types'
import { errorMessage } from '@/lib/api-error'
import { formatDate } from '@/lib/format'

function ClassRow({ item }: { item: StudentClass }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-3">
      <div>
        <p className="font-medium text-ink-900">
          {item.classCode} · {item.name}
        </p>
        <p className="text-sm text-ink-600">
          {[item.subjectName, item.teacherName, item.academicYear].filter(Boolean).join(' · ') || '—'}
        </p>
      </div>
      <Badge tone={item.closeState === 'CLOSED' ? 'neutral' : 'success'} dot>
        {item.closeState === 'CLOSED' ? 'Đã đóng' : 'Đang học'}
      </Badge>
    </li>
  )
}

export function StudentPortalPage() {
  const profile = useMyStudent()
  const classes = useMyStudentClasses()

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Cá nhân · Sinh viên"
        title="Cổng sinh viên"
        description="Hồ sơ và các lớp bạn đang theo học."
      />

      {profile.isLoading ? <Spinner label="Đang tải hồ sơ…" /> : null}
      {profile.isError ? (
        <ErrorState
          title="Không tải được hồ sơ sinh viên"
          description={errorMessage(profile.error)}
          onRetry={() => void profile.refetch()}
        />
      ) : null}

      {profile.data ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="size-4 text-jade-700" aria-hidden="true" />
                Hồ sơ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-lg font-semibold text-ink-900">{profile.data.fullName}</p>
              <p className="text-ink-600">Mã sinh viên: {profile.data.studentCode}</p>
              <p className="text-ink-600">Ngày sinh: {formatDate(profile.data.dateOfBirth)}</p>
              <p className="flex items-center gap-2 text-ink-600">
                <Mail className="size-4" aria-hidden="true" />
                {profile.data.email ?? 'Chưa cập nhật email'}
              </p>
              <p className="flex items-center gap-2 text-ink-600">
                <Phone className="size-4" aria-hidden="true" />
                {profile.data.phone ?? 'Chưa cập nhật điện thoại'}
              </p>
              <Badge tone={profile.data.status === 'active' ? 'success' : 'warning'} dot>
                {STUDENT_STATUS_LABELS[profile.data.status] ?? profile.data.status}
              </Badge>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="size-4 text-jade-700" aria-hidden="true" />
                Lớp của tôi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {classes.isLoading ? <Spinner label="Đang tải lớp…" /> : null}
              {classes.isError ? (
                <ErrorState
                  title="Không tải được lớp của bạn"
                  description={errorMessage(classes.error)}
                  onRetry={() => void classes.refetch()}
                />
              ) : null}
              {classes.data?.length === 0 ? (
                <EmptyState title="Chưa vào lớp" description="Bạn chưa được xếp vào lớp nào." />
              ) : null}
              {classes.data?.length ? (
                <ul className="divide-y divide-line-100">
                  {classes.data.map((item) => (
                    <ClassRow key={item.id} item={item} />
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </PageContainer>
  )
}
