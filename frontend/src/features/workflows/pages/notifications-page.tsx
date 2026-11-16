import { Bell, CheckCheck, Inbox } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/page-header'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { useNotifications } from '@/features/organization/hooks'
import type { AppNotification } from '@/features/organization/types'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/features/workflows/hooks'
import { ApiError } from '@/lib/api-error'
import { formatRelative } from '@/lib/format'
import { cn } from '@/lib/cn'

function linkFor(notification: AppNotification): string | null {
  switch (notification.entityType) {
    case 'TRANSFER_REQUEST':
      return '/to-chuc/chuyen-phong'
    case 'RESIGNATION_REQUEST':
      return '/viec-cho-duyet'
    case 'SCHOOL_CLASS':
      return '/dao-tao/lop-hoc'
    default:
      return null
  }
}

export function NotificationsPage() {
  const query = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const [tab, setTab] = useState<'all' | 'unread'>('all')

  const notifications = useMemo(
    () => [...(query.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [query.data],
  )
  const unread = notifications.filter((item) => !item.readAt)
  const rows = tab === 'unread' ? unread : notifications

  const handleMarkRead = (notification: AppNotification) => {
    markRead.mutate(notification.id, {
      onSuccess: () => toast.success('Đã đánh dấu đã đọc'),
      onError: (error) => toast.error(ApiError.from(error).message),
    })
  }

  const handleMarkAll = () => {
    markAll.mutate(undefined, {
      onSuccess: (result) => toast.success(`Đã đánh dấu ${result.updated} thông báo`),
      onError: (error) => toast.error(ApiError.from(error).message),
    })
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Cá nhân · Thông báo"
        title="Thông báo"
        description="Sự kiện duyệt, điều chuyển, nghỉ việc và lớp học liên quan tới bạn."
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={unread.length === 0 || markAll.isPending}
            onClick={handleMarkAll}
          >
            <CheckCheck aria-hidden="true" />
            Đánh dấu tất cả đã đọc
          </Button>
        }
        meta={
          <>
            <Badge tone={unread.length ? 'warning' : 'success'} dot>
              {unread.length} chưa đọc
            </Badge>
            <span className="text-xs text-ink-400">
              Thông báo do hệ thống tạo khi có quyết định hoặc việc cần bạn xử lý.
            </span>
          </>
        }
      />

      <div className="mt-5">
        <Tabs value={tab} onValueChange={(value) => setTab(value as 'all' | 'unread')}>
          <TabsList>
            <TabsTrigger value="all">Tất cả ({notifications.length})</TabsTrigger>
            <TabsTrigger value="unread">Chưa đọc ({unread.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {query.isLoading ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-ink-500">Đang tải thông báo…</CardContent>
          </Card>
        ) : query.isError ? (
          <ErrorState
            title="Không tải được thông báo"
            description={ApiError.from(query.error).message}
            onRetry={() => void query.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-5" aria-hidden="true" />}
            title={tab === 'unread' ? 'Không còn thông báo chưa đọc' : 'Chưa có thông báo'}
            description="Thông báo mới sẽ xuất hiện khi có yêu cầu cần bạn duyệt hoặc quyết định vừa được ghi nhận."
            action={
              tab === 'unread'
                ? { label: 'Xem tất cả', onClick: () => setTab('all'), variant: 'outline' }
                : undefined
            }
          />
        ) : (
          rows.map((notification) => {
            const target = linkFor(notification)
            const isUnread = !notification.readAt
            return (
              <Card
                key={notification.id}
                className={cn(isUnread && 'border-jade-200 bg-jade-50/40')}
              >
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span
                      className={cn(
                        'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border',
                        isUnread
                          ? 'border-jade-200 bg-jade-100 text-jade-700'
                          : 'border-line bg-ink-50 text-ink-400',
                      )}
                      aria-hidden="true"
                    >
                      <Bell className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-ink-900">{notification.title}</p>
                        {isUnread ? <Badge tone="brand">Mới</Badge> : null}
                      </div>
                      <p className="mt-1 whitespace-pre-line text-sm text-ink-600">{notification.body}</p>
                      <p className="mt-1.5 text-2xs text-ink-400">
                        {formatRelative(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {target ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link to={target}>Mở</Link>
                      </Button>
                    ) : null}
                    {isUnread ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={markRead.isPending}
                        onClick={() => handleMarkRead(notification)}
                      >
                        Đã đọc
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </PageContainer>
  )
}
