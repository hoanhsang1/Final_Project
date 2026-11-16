import { Check, Copy, KeyRound } from 'lucide-react'
import { useState } from 'react'

import { Alert } from '@/components/ui/feedback'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export interface TempPasswordInfo {
  username: string
  password: string
  fullName?: string | null
}

/** Hiển thị mật khẩu tạm đúng một lần, không cho đóng vô tình. */
export function TempPasswordDialog({
  info,
  onClose,
}: {
  info: TempPasswordInfo | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!info) return
    try {
      await navigator.clipboard.writeText(
        `Tên đăng nhập: ${info.username}\nMật khẩu tạm: ${info.password}`,
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* Clipboard có thể bị chặn; người dùng vẫn đọc và sao chép thủ công. */
    }
  }

  return (
    <Dialog open={Boolean(info)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent
        size="md"
        hideClose
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-jade-50 text-jade-700">
            <KeyRound className="size-4" aria-hidden="true" />
          </div>
          <DialogTitle>Thông tin đăng nhập được tạo</DialogTitle>
          <DialogDescription>
            {info?.fullName ? `${info.fullName} có thể đăng nhập bằng tài khoản dưới đây.` : 'Tài khoản đã được tạo.'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <Alert tone="warning" title="Mật khẩu chỉ hiển thị một lần">
            Hãy sao chép và bàn giao ngay. Người dùng sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập
            đầu tiên. Hệ thống không lưu lại mật khẩu dạng đọc được.
          </Alert>

          <dl className="divide-y divide-line rounded-md border border-line">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <dt className="text-xs text-ink-500">Tên đăng nhập</dt>
              <dd className="font-mono text-sm font-medium text-ink-900">{info?.username}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <dt className="text-xs text-ink-500">Mật khẩu tạm</dt>
              <dd className="font-mono text-sm font-semibold tracking-wide text-ink-900">
                {info?.password}
              </dd>
            </div>
          </dl>

          <Button variant="outline" onClick={copy} className="self-start">
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? 'Đã sao chép' : 'Sao chép thông tin'}
          </Button>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onClose}>Tôi đã lưu mật khẩu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
