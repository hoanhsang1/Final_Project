import { CloudOff, LockKeyhole, RotateCcw, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

interface StateShellProps {
  icon: React.ReactNode
  code?: string
  title: string
  description: React.ReactNode
  action?: React.ReactNode
  details?: string
  className?: string
}

function StateShell({ icon, code, title, description, action, details, className }: StateShellProps) {
  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-xl flex-col items-center px-6 py-16 text-center',
        className,
      )}
      role="status"
    >
      <div className="flex size-14 items-center justify-center rounded-xl border border-line bg-surface text-ink-400 shadow-sm">
        {icon}
      </div>
      {code ? (
        <p className="mt-5 text-2xs font-semibold uppercase tracking-[0.16em] text-ink-400">{code}</p>
      ) : null}
      <h2 className="mt-1 text-xl font-semibold text-ink-900">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-ink-500">{description}</div>
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div> : null}
      {details ? (
        <details className="mt-6 w-full text-left">
          <summary className="cursor-pointer text-xs font-medium text-ink-400 hover:text-ink-600">
            Chi tiết kỹ thuật
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-md bg-ink-950 p-3 text-2xs leading-relaxed text-ink-200">
            {details}
          </pre>
        </details>
      ) : null}
    </div>
  )
}

export function ErrorState({
  title = 'Không tải được dữ liệu',
  description = 'Đã có lỗi khi kết nối tới máy chủ. Vui lòng thử lại sau ít phút.',
  onRetry,
  action,
  details,
  className,
}: {
  title?: string
  description?: React.ReactNode
  onRetry?: () => void
  action?: React.ReactNode
  details?: string
  className?: string
}) {
  return (
    <StateShell
      icon={<CloudOff className="size-6" aria-hidden="true" />}
      code="Lỗi kết nối"
      title={title}
      description={description}
      className={className}
      details={details}
      action={
        <>
          {action}
          {onRetry ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCcw aria-hidden="true" />
              Thử lại
            </Button>
          ) : null}
        </>
      }
    />
  )
}

export function ForbiddenState({
  title = 'Bạn không có quyền truy cập',
  description = 'Khu vực này yêu cầu quyền mà tài khoản của bạn chưa được cấp. Liên hệ quản trị viên tổ chức nếu bạn cho rằng đây là nhầm lẫn.',
  action,
  className,
}: {
  title?: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <StateShell
      icon={<LockKeyhole className="size-6" aria-hidden="true" />}
      code="403 · Bị từ chối"
      title={title}
      description={description}
      action={action}
      className={className}
    />
  )
}

export function NotFoundState({ className }: { className?: string }) {
  return (
    <StateShell
      icon={<TriangleAlert className="size-6" aria-hidden="true" />}
      code="404"
      title="Không tìm thấy trang"
      description="Đường dẫn không tồn tại hoặc đã được thay đổi. Hãy quay lại khu vực làm việc."
      className={className}
      action={
        <Button variant="outline" size="sm" onClick={() => window.history.back()}>
          Quay lại
        </Button>
      }
    />
  )
}
