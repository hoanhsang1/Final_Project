import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Alert } from '@/components/ui/feedback'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Logo } from '@/components/brand/logo'
import { useChangePasswordMutation, useSession } from '@/features/auth/hooks'
import { ApiError } from '@/lib/api-error'

interface Errors {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
  form?: string
}

/** Đổi mật khẩu — bắt buộc khi tài khoản còn mật khẩu tạm. */
export function ChangePasswordPage() {
  const session = useSession()
  const navigate = useNavigate()
  const changePassword = useChangePasswordMutation()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Errors>({})

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next: Errors = {}
    if (!currentPassword) next.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.'
    if (newPassword.length < 12) next.newPassword = 'Mật khẩu mới phải có ít nhất 12 ký tự.'
    if (newPassword.length > 72) next.newPassword = 'Mật khẩu mới tối đa 72 ký tự.'
    if (newPassword && newPassword === currentPassword) {
      next.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại.'
    }
    if (confirmPassword !== newPassword) next.confirmPassword = 'Xác nhận mật khẩu không khớp.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          toast.success('Đã đổi mật khẩu', {
            description: 'Vui lòng đăng nhập lại bằng mật khẩu mới.',
          })
          navigate('/dang-nhap', { replace: true })
        },
        onError: (error) => setErrors({ form: ApiError.from(error).message }),
      },
    )
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo showTagline />
        </div>

        <div className="rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-7">
          <div className="mb-5 flex size-10 items-center justify-center rounded-lg bg-jade-50 text-jade-700">
            <KeyRound className="size-5" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink-900">Đổi mật khẩu</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
            {session?.user.mustChangePassword
              ? 'Tài khoản của bạn đang dùng mật khẩu tạm. Hãy đặt mật khẩu riêng trước khi tiếp tục.'
              : 'Đặt mật khẩu mới cho tài khoản của bạn.'}
          </p>

          {errors.form ? (
            <Alert tone="danger" className="mt-4" title="Không đổi được mật khẩu">
              {errors.form}
            </Alert>
          ) : null}

          <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4">
            <Field label="Mật khẩu hiện tại" htmlFor="currentPassword" required error={errors.currentPassword}>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </Field>
            <Field
              label="Mật khẩu mới"
              htmlFor="newPassword"
              required
              error={errors.newPassword}
              hint="Từ 12 đến 72 ký tự."
            >
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </Field>
            <Field label="Nhập lại mật khẩu mới" htmlFor="confirmPassword" required error={errors.confirmPassword}>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </Field>

            <Button type="submit" block isLoading={changePassword.isPending} loadingText="Đang cập nhật…">
              Cập nhật mật khẩu
            </Button>
          </form>

          {session?.user.mustChangePassword ? null : (
            <p className="mt-4 text-center text-xs text-ink-400">
              <Link to="/" className="text-jade-700 underline-offset-4 hover:underline">
                Quay lại khu vực làm việc
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
