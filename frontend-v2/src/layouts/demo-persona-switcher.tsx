import { ArrowRight, FlaskConical, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useLoginMutation } from '@/features/auth/hooks'
import { getInitials } from '@/lib/format'
import { ApiError } from '@/lib/api-error'
import { mockAccounts } from '@/services/mock/fixtures'

const PERSONA_NOTES: Record<string, string> = {
  platform_admin: 'Duyệt tổ chức, quản lý tài khoản và nhật ký hệ thống.',
  sample_owner: 'Toàn quyền trong tổ chức: phòng ban, nhân sự, chức vụ, ủy quyền.',
  sample_hr: 'Quản lý nhân sự phòng Hành chính – Nhân sự, duyệt bước HR.',
  sample_academic: 'Giáo vụ: hồ sơ sinh viên, lớp học và môn học.',
  sample_teacher: 'Giáo viên: lớp được phân công, lịch dạy, điểm danh.',
  sample_head: 'Trưởng phòng Tổ Toán – Tin: duyệt hủy/đóng lớp.',
  csvc_lam: 'Nhân viên CSVC, tài khoản còn mật khẩu tạm (bị buộc đổi).',
}

/** Chỉ tải trong chế độ mock: đổi nhanh người dùng demo để đánh giá UX. */
export function DemoPersonaSwitcher({ inline = false }: { inline?: boolean }) {
  const [open, setOpen] = useState(false)
  const login = useLoginMutation()
  const navigate = useNavigate()

  const signInAs = (username: string, password: string) => {
    login.mutate(
      { username, password },
      {
        onSuccess: () => {
          setOpen(false)
          toast.success(`Đã đăng nhập với ${username}`)
          navigate('/', { replace: true })
        },
        onError: (error) => {
          toast.error(ApiError.from(error).message)
        },
      },
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          inline
            ? 'flex size-9 items-center justify-center rounded-md border border-saffron-200 bg-saffron-50 text-saffron-700 shadow-xs transition-colors hover:bg-saffron-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron-500'
            : 'fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-saffron-200 bg-saffron-50 px-3.5 py-2 text-xs font-semibold text-saffron-700 shadow-md transition-colors hover:bg-saffron-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron-500'
        }
        aria-label="Chuyển vai trò demo"
        title="Chuyển vai trò demo"
      >
        <FlaskConical className="size-3.5" aria-hidden="true" />
        {inline ? null : 'Vai trò demo'}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Chuyển vai trò demo</DialogTitle>
            <DialogDescription>
              Dữ liệu demo chạy hoàn toàn trong trình duyệt và được đặt lại khi tải lại trang.
              Các tài khoản dưới đây khớp với seed của backend.
            </DialogDescription>
          </DialogHeader>
          <div className="mems-scroll max-h-[65vh] overflow-y-auto border-t border-line px-6 py-4">
            <ul className="flex flex-col gap-2">
              {mockAccounts.map((account) => (
                <li key={account.id}>
                  <div className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5">
                    <Avatar size="sm">
                      <AvatarFallback>{getInitials(account.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">
                        {account.fullName}{' '}
                        <span className="font-normal text-ink-400">@{account.username}</span>
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        {PERSONA_NOTES[account.username] ?? account.roles.join(', ')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={login.isPending}
                      onClick={() => signInAs(account.username, account.password)}
                    >
                      Đăng nhập
                      <ArrowRight aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex items-start gap-2 text-2xs text-ink-400">
              <X className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
              Không dùng dữ liệu demo để kết luận về dữ liệu thật của tổ chức.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
