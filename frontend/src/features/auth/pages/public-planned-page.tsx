import { ArrowLeft, MailQuestion } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Alert } from '@/components/ui/feedback'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AuthLayout } from '@/layouts/auth-layout'

const SCREENS: Record<
  string,
  { title: string; description: string; api: string; note?: string }
> = {
  'dang-ky': {
    title: 'Đăng ký tổ chức',
    description:
      'Biểu mẫu đăng ký trường học hoặc trung tâm: tên tổ chức, loại hình, tài khoản chủ sở hữu và module đề nghị. Sau khi gửi, tổ chức ở trạng thái chờ duyệt và chưa đăng nhập được.',
    api: 'POST /api/v1/auth/register · GET /api/v1/modules',
    note: 'Backend đã có endpoint. Giao diện chưa nằm trong phạm vi FE-00.',
  },
  'quen-mat-khau': {
    title: 'Quên mật khẩu',
    description:
      'Nhận liên kết đặt lại qua email. Phản hồi luôn giống nhau dù email có tồn tại hay không để tránh dò tài khoản.',
    api: 'POST /api/v1/auth/forgot-password',
    note: 'Endpoint chưa được triển khai trong IdentityService (đã có bảng token).',
  },
  'dat-lai-mat-khau': {
    title: 'Đặt lại mật khẩu',
    description: 'Đặt mật khẩu mới bằng liên kết một lần gửi qua email, có thời hạn 30 phút.',
    api: 'POST /api/v1/auth/reset-password',
    note: 'Endpoint chưa được triển khai trong IdentityService.',
  },
}

export function PublicPlannedPage({ screen }: { screen: 'dang-ky' | 'quen-mat-khau' | 'dat-lai-mat-khau' }) {
  const content = SCREENS[screen]!

  return (
    <AuthLayout>
      <div className="animate-rise">
        <div className="mb-5 flex size-11 items-center justify-center rounded-lg border border-line bg-surface text-jade-700 shadow-xs">
          <MailQuestion className="size-5" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-ink-900">{content.title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{content.description}</p>

        <Alert tone="warning" className="mt-5" title="Màn hình chưa triển khai">
          Đây là route giữ chỗ trong sitemap. Không có biểu mẫu hay dữ liệu giả được hiển thị.
        </Alert>

        <Card className="mt-5">
          <CardContent className="flex flex-col gap-2 py-4">
            <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-400">
              Phụ thuộc API
            </p>
            <code className="break-words font-mono text-xs text-ink-700">{content.api}</code>
            {content.note ? <p className="text-xs leading-relaxed text-ink-500">{content.note}</p> : null}
          </CardContent>
        </Card>

        <Button variant="outline" size="sm" className="mt-6" asChild>
          <Link to="/dang-nhap">
            <ArrowLeft aria-hidden="true" />
            Về trang đăng nhập
          </Link>
        </Button>
      </div>
    </AuthLayout>
  )
}
