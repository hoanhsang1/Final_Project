import { CalendarDays } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/page-header'
import { Spinner } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { useMySchedule } from '@/features/schedule/hooks'
import { SESSION_STATUS_LABELS } from '@/features/schedule/types'
import { errorMessage } from '@/lib/api-error'
import { formatDateTime } from '@/lib/format'

export function MySchedulePage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const params = {
    from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
  }
  const schedule = useMySchedule(params)

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Cá nhân · Lịch"
        title="Lịch của tôi"
        description="Buổi học của lớp bạn dạy hoặc lớp bạn đang theo học."
      />

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Field label="Từ ngày" labelSize="sm">
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </Field>
        <Field label="Đến ngày" labelSize="sm">
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </Field>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-jade-700" aria-hidden="true" />
              Buổi học
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schedule.isLoading ? <Spinner label="Đang tải lịch…" /> : null}
            {schedule.isError ? (
              <ErrorState
                title="Không tải được lịch của bạn"
                description={errorMessage(schedule.error)}
                onRetry={() => void schedule.refetch()}
              />
            ) : null}
            {schedule.data?.length === 0 ? (
              <EmptyState
                title="Chưa có buổi học"
                description="Không có buổi học nào trong khoảng thời gian đã chọn."
              />
            ) : null}
            {schedule.data?.length ? (
              <ul className="divide-y divide-line-100">
                {schedule.data.map((session) => (
                  <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="font-medium text-ink-900">{session.className ?? 'Buổi học'}</p>
                      <p className="text-sm text-ink-600">
                        {formatDateTime(session.startTime)} → {formatDateTime(session.endTime)}
                      </p>
                    </div>
                    <Badge tone={session.status === 'cancelled' ? 'danger' : 'neutral'} dot>
                      {SESSION_STATUS_LABELS[session.status] ?? session.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
