import { Building2, KeyRound, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { PageContainer } from '@/components/layout/page-container'
import { useLogout, useSession } from '@/features/auth/hooks'
import { getInitials } from '@/lib/format'
import { isOwner } from '@/lib/nav'
import { PERMISSION_GROUPS } from '@/lib/permissions'

function roleLabel(roles: string[]): string {
  if (roles.includes('SUPER_ADMIN')) return 'Quản trị hệ thống'
  if (roles.some((role) => role === 'OWNER' || role === 'ORG_OWNER')) return 'Chủ tổ chức'
  if (roles.includes('MANAGER')) return 'Quản lý phòng ban'
  if (roles.includes('STUDENT')) return 'Sinh viên'
  return 'Nhân viên'
}

export function ProfilePage() {
  const session = useSession()
  const logout = useLogout()
  if (!session) return null

  const displayName = session.user.fullName ?? session.user.username
  const granted = PERMISSION_GROUPS.map((group) => ({
    ...group,
    permissions: group.permissions.filter((permission) =>
      isOwner(session) || session.permissions.includes(permission.code),
    ),
  })).filter((group) => group.permissions.length > 0)

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Cá nhân"
        title="Hồ sơ cá nhân"
        description="Thông tin phiên đăng nhập hiện tại và quyền hiệu lực bạn đang có."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/doi-mat-khau">
                <KeyRound aria-hidden="true" />
                Đổi mật khẩu
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <LogOut aria-hidden="true" />
              Đăng xuất
            </Button>
          </>
        }
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center py-7 text-center">
            <Avatar size="lg" className="size-16 text-lg">
              <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <h2 className="mt-3 text-lg font-semibold text-ink-900">{displayName}</h2>
            <p className="text-sm text-ink-500">@{session.user.username}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              <Badge tone="brand">{roleLabel(session.roles)}</Badge>
              {session.user.mustChangePassword ? (
                <Badge tone="warning">Đang dùng mật khẩu tạm</Badge>
              ) : (
                <Badge tone="success">Mật khẩu đã đổi</Badge>
              )}
            </div>
          </CardContent>
          <div className="border-t border-line px-5 py-4">
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-2 text-ink-500">
                  <Building2 className="size-4" aria-hidden="true" />
                  Tổ chức
                </dt>
                <dd className="max-w-[60%] text-right text-ink-800">
                  {session.user.organizationName ??
                    (session.user.organizationId
                      ? `Mã ${session.user.organizationId.slice(0, 8)}`
                      : 'Toàn hệ thống')}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-2 text-ink-500">
                  <UserRound className="size-4" aria-hidden="true" />
                  Phòng ban
                </dt>
                <dd className="text-right text-ink-800">
                  {session.user.departmentId ? `Mã ${session.user.departmentId}` : 'Cấp tổ chức'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-2 text-ink-500">
                  <Mail className="size-4" aria-hidden="true" />
                  Email
                </dt>
                <dd className="text-right text-ink-800">{session.user.email ?? '—'}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-2 text-ink-500">
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Hết hạn phiên
                </dt>
                <dd className="text-right text-ink-800">
                  {session.expiresAt
                    ? new Intl.DateTimeFormat('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                      }).format(new Date(session.expiresAt))
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>
          <div className="border-t border-line bg-surface-muted px-5 py-3 text-2xs leading-relaxed text-ink-400">
            Họ tên và email lấy từ JWT. Backend chưa có endpoint <code>GET /me</code>; khi được bổ
            sung, trang này sẽ đọc dữ liệu hồ sơ đầy đủ.
          </div>
        </Card>

        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Quyền hiệu lực</CardTitle>
                <p className="mt-0.5 text-sm text-ink-500">
                  {session.permissions.length} quyền từ vai trò, chức vụ và ủy quyền còn hiệu lực.
                </p>
              </div>
              <Badge tone={isOwner(session) ? 'brand' : 'neutral'}>
                {isOwner(session) ? 'OWNER — toàn quyền tổ chức' : 'Theo chức vụ'}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-2">
              {granted.length === 0 ? (
                <p className="text-sm text-ink-500">
                  Tài khoản chưa được gán quyền nghiệp vụ nào ngoài quyền cá nhân.
                </p>
              ) : (
                granted.map((group) => (
                  <div key={group.label}>
                    <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-400">
                      {group.label}
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {group.permissions.map((permission) => (
                        <li
                          key={permission.code}
                          className="rounded-full border border-line bg-surface-muted px-2 py-0.5 text-2xs text-ink-600"
                          title={permission.code}
                        >
                          {permission.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Quyền nhận qua ủy quyền</CardTitle>
                <p className="mt-0.5 text-sm text-ink-500">
                  Có thời hạn, do Chủ tổ chức cấp và có thể thu hồi.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/uy-quyen">Xem chi tiết</Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-2">
              {session.delegatedPermissions.length === 0 ? (
                <p className="text-sm text-ink-500">
                  Bạn không nhận quyền ủy quyền nào. Chức danh Tổng quản lý không tự kèm quyền.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {session.delegatedPermissions.map((code) => (
                    <li
                      key={code}
                      className="rounded-full border border-info-100 bg-info-50 px-2 py-0.5 font-mono text-2xs text-info-600"
                    >
                      {code}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
