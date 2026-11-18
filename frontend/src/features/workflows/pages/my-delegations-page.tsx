import { FileBadge } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/page-header'
import { Spinner } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { useMyDelegations, usePermissionCatalog } from '@/features/workflows/hooks'
import { DELEGATION_STATUS_LABELS } from '@/features/workflows/types'
import { errorMessage } from '@/lib/api-error'
import { formatDateTime } from '@/lib/format'

export function MyDelegationsPage() {
  const delegations = useMyDelegations()
  const catalog = usePermissionCatalog()

  const label = (code: string) =>
    catalog.data?.find((permission) => permission.code === code)?.description ?? code

  const rows = delegations.data ?? []

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Cá nhân · Uỷ quyền"
        title="Quyền được uỷ quyền"
        description="Các quyền người khác uỷ quyền cho bạn và thời hạn hiệu lực."
      />

      <div className="mt-5 space-y-3">
        {delegations.isLoading ? <Spinner label="Đang tải uỷ quyền…" /> : null}
        {delegations.isError ? (
          <ErrorState
            title="Không tải được uỷ quyền của bạn"
            description={errorMessage(delegations.error)}
            onRetry={() => void delegations.refetch()}
          />
        ) : null}
        {!delegations.isLoading && rows.length === 0 ? (
          <EmptyState
            title="Chưa có uỷ quyền"
            description="Bạn chưa được ai uỷ quyền quyền hạn nào."
          />
        ) : null}
        {rows.map((item) => (
          <Card key={item.id}>
            <CardContent className="space-y-2 pt-5">
              <div className="flex flex-wrap items-center gap-2">
                <FileBadge className="size-4 text-jade-700" aria-hidden="true" />
                <p className="font-medium text-ink-900">
                  {item.delegatorName ?? 'Người uỷ quyền'}
                </p>
                <Badge tone={item.status === 'ACTIVE' ? 'success' : 'neutral'} dot>
                  {DELEGATION_STATUS_LABELS[item.status] ?? item.status}
                </Badge>
              </div>
              <p className="text-sm text-ink-600">
                Hiệu lực: {formatDateTime(item.effectiveFrom)} → {formatDateTime(item.effectiveTo)}
              </p>
              <div className="flex flex-wrap gap-1">
                {item.permissions.map((code) => (
                  <Badge key={code} tone="outline">
                    {label(code)}
                  </Badge>
                ))}
              </div>
              {item.reason ? <p className="text-sm text-ink-600">Lý do: {item.reason}</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  )
}
