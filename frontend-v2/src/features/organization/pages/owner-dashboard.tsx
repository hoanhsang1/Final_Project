import {
  ArrowRight,
  Bell,
  Building2,
  FileBadge,
  Inbox,
  Network,
  ScrollText,
  Users,
  UsersRound,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, EmptyState } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { usePermission, useSession } from '@/features/auth/hooks'
import { usePositions, useTransferInbox, useNotifications } from '@/features/organization/hooks'
import { useHeadcounts } from '@/features/organization/use-headcounts'
import { TRANSFER_STEP_LABELS } from '@/features/organization/types'
import { formatRelative, truncate } from '@/lib/format'
import { PERM } from '@/lib/permissions'

export function OwnerDashboard() {
  const session = useSession()
  const navigate = useNavigate()
  const { can } = usePermission()
  const headcounts = useHeadcounts()
  const positions = usePositions()
  const inbox = useTransferInbox()
  const notifications = useNotifications()

  const orgName = session?.user.organizationName ?? 'Tổ chức của bạn'
  const unread = (notifications.data ?? []).filter((item) => !item.readAt).length
  const orgScopePositions = (positions.data ?? []).filter((item) => item.scope === 'ORGANIZATION').length

  if (headcounts.isError) {
    return (
      <PageContainer>
        <ErrorState
          title="Không tải được dữ liệu tổ chức"
          description="Có lỗi khi lấy danh sách phòng ban hoặc nhân sự."
          onRetry={headcounts.refetch}
        />
      </PageContainer>
    )
  }

  const topDepartments = [...headcounts.byDepartment]
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)
  const maxHeadcount = Math.max(1, ...topDepartments.map((item) => item.total))
  const recentNotifications = (notifications.data ?? []).slice(0, 4)
  const pendingApprovals = inbox.data ?? []

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Tổ chức · Tổng quan"
        title="Bảng điều khiển"
        description={`${orgName} — cơ cấu phòng ban, nhân sự và các việc cần xử lý trong tuần.`}
        actions={
          <>
            {can(PERM.departmentManage) ? (
              <Button variant="outline" size="sm" asChild>
                <Link to="/to-chuc/phong-ban">
                  <Network aria-hidden="true" />
                  Phòng ban
                </Link>
              </Button>
            ) : null}
            {can(PERM.employeeCreate) ? (
              <Button size="sm" asChild>
                <Link to="/to-chuc/nhan-su?them=1">
                  <Users aria-hidden="true" />
                  Thêm nhân sự
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      {!headcounts.isLoading && positions.isSuccess && (positions.data ?? []).length === 0 ? (
        <Alert tone="warning" className="mt-5" title="Chưa có chức vụ nào">
          Chức vụ là điều kiện bắt buộc để tạo nhân sự. Hãy tạo chức vụ trước tại{' '}
          <Link to="/to-chuc/chuc-vu" className="font-semibold underline underline-offset-2">
            Chức vụ &amp; quyền
          </Link>
          .
        </Alert>
      ) : null}

      {!headcounts.isLoading && headcounts.departments.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Tổ chức chưa có phòng ban"
          description="Bắt đầu bằng việc tạo phòng ban, sau đó gán chức vụ và thêm nhân sự vào từng phòng."
          action={
            can(PERM.departmentManage)
              ? { label: 'Tạo phòng ban đầu tiên', onClick: () => navigate('/to-chuc/phong-ban') }
              : undefined
          }
        />
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {headcounts.isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[118px] rounded-lg" />
          ))
        ) : (
          <>
            <StatCard
              label="Phòng ban"
              value={headcounts.departments.length}
              hint={`${headcounts.departments.filter((item) => item.modules.length > 0).length} phòng có module nghiệp vụ`}
              icon={<Network className="size-4" aria-hidden="true" />}
            />
            <StatCard
              label="Nhân sự"
              value={headcounts.totalEmployees}
              hint={
                headcounts.isScoped
                  ? `${headcounts.activeEmployees} đang làm việc · phòng ban của bạn`
                  : `${headcounts.activeEmployees} đang làm việc`
              }
              icon={<UsersRound className="size-4" aria-hidden="true" />}
              accent="ink"
            />
            <StatCard
              label="Chức vụ"
              value={positions.data?.length ?? '—'}
              hint={positions.isSuccess ? `${orgScopePositions} chức vụ cấp tổ chức` : 'Đang tải…'}
              icon={<FileBadge className="size-4" aria-hidden="true" />}
              accent="saffron"
            />
            <StatCard
              label="Việc chờ tôi duyệt"
              value={inbox.isSuccess ? pendingApprovals.length : '—'}
              hint={unread > 0 ? `${unread} thông báo chưa đọc` : 'Không có thông báo mới'}
              icon={<Inbox className="size-4" aria-hidden="true" />}
              footer={
                <Link
                  to="/viec-cho-duyet"
                  className="flex items-center justify-between text-2xs font-medium text-jade-700 hover:underline"
                >
                  Mở hộp việc chờ duyệt
                  <ArrowRight className="size-3" aria-hidden="true" />
                </Link>
              }
            />
          </>
        )}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Nhân sự theo phòng ban</CardTitle>
                <p className="mt-0.5 text-sm text-ink-500">
                  {headcounts.isScoped
                    ? 'Bạn chỉ có quyền xem nhân sự trong phòng ban mình công tác.'
                    : 'Tính từ danh sách thành viên của từng phòng ban.'}
                </p>
              </div>
              <Badge tone="neutral">{headcounts.totalEmployees} người</Badge>
            </CardHeader>
            <CardContent className="pt-3">
              {headcounts.isLoading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-9" />
                  ))}
                </div>
              ) : topDepartments.length === 0 ? (
                <EmptyState compact title="Chưa có dữ liệu nhân sự" />
              ) : (
                <ul className="flex flex-col gap-3.5">
                  {topDepartments.map((department) => (
                    <li key={department.departmentId}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                        <Link
                          to={`/to-chuc/phong-ban/${department.departmentId}`}
                          className="truncate font-medium text-ink-700 hover:text-jade-800 hover:underline"
                        >
                          {department.name}
                        </Link>
                        <span className="shrink-0 text-xs text-ink-500 tabular">
                          {department.active}/{department.total} đang làm
                        </span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-ink-100"
                        role="img"
                        aria-label={`${department.name}: ${department.total} nhân sự`}
                      >
                        <div
                          className="h-full rounded-full bg-jade-500"
                          style={{ width: `${Math.max(4, (department.total / maxHeadcount) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {headcounts.byDepartment.length > 6 ? (
                <Button variant="ghost" size="sm" className="mt-3" asChild>
                  <Link to="/to-chuc/phong-ban">Xem tất cả phòng ban</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Việc chờ tôi duyệt</CardTitle>
                <p className="mt-0.5 text-sm text-ink-500">
                  Chỉ hiển thị yêu cầu mà bạn có quyền quyết ở bước hiện tại.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/viec-cho-duyet">Mở hộp</Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-2">
              {inbox.isLoading ? (
                <Skeleton className="h-20" />
              ) : pendingApprovals.length === 0 ? (
                <EmptyState
                  compact
                  icon={<Inbox className="size-5" aria-hidden="true" />}
                  title="Không có yêu cầu nào cần bạn duyệt"
                  description="Khi có yêu cầu điều chuyển hoặc huỷ lớp đến bước của bạn, mục này sẽ hiển thị."
                />
              ) : (
                <ul className="divide-y divide-line">
                  {pendingApprovals.map((request) => (
                    <li key={request.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-800">
                          {request.fullName ?? request.username}
                        </p>
                        <p className="truncate text-xs text-ink-500">
                          {request.fromDepartmentName} → {request.toDepartmentName}
                        </p>
                        <p className="mt-0.5 text-2xs text-ink-400">{truncate(request.reason, 70)}</p>
                      </div>
                      <Badge tone="warning">
                        {TRANSFER_STEP_LABELS[request.actionableSteps[0] ?? ''] ?? 'Chờ duyệt'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-4 text-jade-600" aria-hidden="true" />
                Thông báo gần đây
              </CardTitle>
              {unread > 0 ? <Badge tone="warning">{unread} mới</Badge> : null}
            </CardHeader>
            <CardContent className="pt-2">
              {notifications.isLoading ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              ) : recentNotifications.length === 0 ? (
                <p className="text-sm text-ink-500">Chưa có thông báo.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {recentNotifications.map((item) => (
                    <li key={item.id} className="flex gap-2.5">
                      <span
                        className={
                          item.readAt
                            ? 'mt-1.5 size-1.5 shrink-0 rounded-full bg-ink-200'
                            : 'mt-1.5 size-1.5 shrink-0 rounded-full bg-jade-500'
                        }
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug text-ink-800">{item.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-500">
                          {item.body}
                        </p>
                        <p className="mt-0.5 text-2xs text-ink-400">{formatRelative(item.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="ghost" size="sm" className="mt-2 w-full justify-between" asChild>
                <Link to="/thong-bao">
                  Xem tất cả thông báo
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lối tắt quản trị</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ul className="flex flex-col">
                {[
                  { to: '/to-chuc/phong-ban', label: 'Cơ cấu phòng ban', icon: Network },
                  { to: '/to-chuc/nhan-su', label: 'Danh sách nhân sự', icon: Users },
                  { to: '/to-chuc/chuc-vu', label: 'Chức vụ & quyền', icon: FileBadge },
                  { to: '/to-chuc/uy-quyen', label: 'Tổng quản lý & ủy quyền', icon: UsersRound },
                  { to: '/to-chuc/nhat-ky', label: 'Nhật ký tổ chức', icon: ScrollText },
                  { to: '/to-chuc/module', label: 'Module của tổ chức', icon: Building2 },
                ].map((link) => {
                  const Icon = link.icon
                  return (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="flex items-center gap-2.5 rounded-sm px-2 py-2 text-sm text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900"
                      >
                        <Icon className="size-4 text-ink-400" aria-hidden="true" />
                        <span className="flex-1">{link.label}</span>
                        <ArrowRight className="size-3.5 text-ink-300" aria-hidden="true" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
