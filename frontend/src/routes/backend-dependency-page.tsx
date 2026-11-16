import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Alert } from '@/components/ui/feedback'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { PageContainer } from '@/components/layout/page-container'

/**
 * Trang giữ chỗ cho chức năng đã có thiết kế nhưng backend chưa có API.
 * Không gọi API, không hiển thị dữ liệu giả.
 */
export function BackendDependencyPage({
  eyebrow,
  title,
  description,
  missing,
  available,
}: {
  eyebrow: string
  title: string
  description: string
  missing: string[]
  available?: { label: string; to: string }[]
}) {
  return (
    <PageContainer>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <Alert tone="warning" className="mt-5" title="BACKEND_DEPENDENCY">
        Màn hình này cần API backend chưa được triển khai. Giao diện không gọi endpoint không tồn
        tại và không hiển thị dữ liệu giả.
      </Alert>

      <div className="mt-4 rounded-lg border border-line-200 bg-surface p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-ink-900">
          <AlertTriangle className="size-4 text-warning-600" aria-hidden="true" />
          API còn thiếu
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-ink-700">
          {missing.map((item) => (
            <li key={item}>
              <code className="rounded bg-ink-50 px-1 py-0.5 text-xs text-ink-800">{item}</code>
            </li>
          ))}
        </ul>
        {available?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {available.map((item) => (
              <Button key={item.to} variant="outline" size="sm" asChild>
                <Link to={item.to}>{item.label}</Link>
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </PageContainer>
  )
}
