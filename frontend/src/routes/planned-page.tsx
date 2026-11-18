import { ArrowLeft, CircleDashed, KeyRound, Layers, Link2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { PageContainer } from '@/components/layout/page-container'
import { usePermission } from '@/features/auth/hooks'
import { ModuleLabelList } from '@/routes/module-label-list'
import { PLANNED_CONTENT } from '@/routes/planned-content'
import type { NavItem, Workspace } from '@/lib/nav'
import { PERMISSION_GROUPS } from '@/lib/permissions'

const DEFAULT_CONTENT = {
  summary:
    'Màn hình này đã có trong kiến trúc thông tin và sitemap nhưng chưa được triển khai trong gói FE-00.',
  steps: [
    'Chờ chốt phạm vi nghiệp vụ và API tương ứng.',
    'Thiết kế luồng chi tiết theo quyền hiệu lực.',
    'Triển khai khi backend có contract đã xác minh.',
  ],
  apis: [],
}

function permissionLabel(code: string): string {
  const meta = PERMISSION_GROUPS.flatMap((group) => group.permissions).find(
    (permission) => permission.code === code,
  )
  return meta ? meta.label : code
}

export function PlannedPage({ item, workspace }: { item: NavItem; workspace: Workspace }) {
  const content = PLANNED_CONTENT[item.id] ?? DEFAULT_CONTENT
  const { can } = usePermission()

  return (
    <PageContainer>
      <PageHeader
        eyebrow={`${workspace.label} · Chưa triển khai`}
        title={item.label}
        description={content.summary}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={workspace.to}>
              <ArrowLeft aria-hidden="true" />
              Về trang tổng quan
            </Link>
          </Button>
        }
        meta={
          <>
            <Badge tone="warning" size="md" dot>
              PLANNED — chưa có giao diện hoạt động
            </Badge>
            <span className="text-xs text-ink-400">
              Route giữ chỗ, không gọi API và không hiển thị dữ liệu giả.
            </span>
          </>
        }
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleDashed className="size-4 text-jade-600" aria-hidden="true" />
              Phạm vi nghiệp vụ dự kiến
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <ol className="flex flex-col gap-3">
              {content.steps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-line bg-surface-muted text-2xs font-semibold text-ink-500 tabular">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-ink-700">{step}</span>
                </li>
              ))}
            </ol>
            {content.note ? (
              <p className="mt-4 rounded-md border border-warning-100 bg-warning-50 px-3 py-2 text-xs leading-relaxed text-warning-600">
                {content.note}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="size-4 text-jade-600" aria-hidden="true" />
                Quyền cần có
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              {item.permissions?.length ? (
                <ul className="flex flex-col gap-1.5">
                  {item.permissions.map((code) => (
                    <li key={code} className="flex items-start gap-2 text-xs">
                      <span
                        className={
                          can(code)
                            ? 'mt-1.5 size-1.5 shrink-0 rounded-full bg-success-500'
                            : 'mt-1.5 size-1.5 shrink-0 rounded-full bg-ink-300'
                        }
                        aria-hidden="true"
                      />
                      <span>
                        <span className="font-medium text-ink-700">{permissionLabel(code)}</span>
                        <span className="block text-2xs text-ink-400">{code}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-ink-500">Không yêu cầu quyền đặc biệt ngoài đăng nhập.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="size-4 text-jade-600" aria-hidden="true" />
                Module bắt buộc
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <ModuleLabelList codes={item.modules} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="size-4 text-jade-600" aria-hidden="true" />
                Phụ thuộc API
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              {content.apis.length ? (
                <ul className="flex flex-col gap-1.5">
                  {content.apis.map((api) => (
                    <li key={api} className="break-words font-mono text-2xs leading-relaxed text-ink-600">
                      {api}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-ink-500">Chưa xác định API.</p>
              )}
              <p className="mt-3 text-2xs leading-relaxed text-ink-400">
                Chỉ hiển thị endpoint đã có trong backend hoặc ghi rõ PROPOSED. Không dùng endpoint
                tự đặt.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
