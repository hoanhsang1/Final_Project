import { Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Alert } from '@/components/ui/feedback'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { useLoginMutation } from '@/features/auth/hooks'
import { AuthLayout } from '@/layouts/auth-layout'
import { ApiError } from '@/lib/api-error'
import { isMockMode } from '@/services/http'

const DEMO_HINTS = [
  { label: 'Quản trị hệ thống', username: 'platform_admin', password: '123456' },
  { label: 'Chủ tổ chức', username: 'sample_owner', password: 'Sample@123456' },
  { label: 'Nhân sự', username: 'sample_hr', password: 'Sample@123456' },
]

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ username?: string; password?: string; form?: string }>({})
  const login = useLoginMutation()

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: typeof errors = {}
    if (!username.trim()) nextErrors.username = 'Vui lòng nhập tên đăng nhập.'
    if (!password) nextErrors.password = 'Vui lòng nhập mật khẩu.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    login.mutate(
      { username: username.trim(), password },
      {
        onSuccess: () => toast.success('Đăng nhập thành công'),
        onError: (error) => {
          const apiError = ApiError.from(error)
          setErrors({ form: apiError.message })
        },
      },
    )
  }

  return (
    <AuthLayout
      footer={
        <span>
          Cần hỗ trợ? Liên hệ quản trị viên tổ chức hoặc{' '}
          <span className="font-medium text-ink-600">support@mems.vn</span>
        </span>
      }
    >
      <div className="animate-rise">
        <div className="mb-6 flex items-center gap-2">
          <Badge tone="brand" size="sm">
            <ShieldCheck className="size-3" aria-hidden="true" />
            Cổng quản trị
          </Badge>
          {isMockMode ? (
            <Badge tone="warning" size="sm">
              Dữ liệu demo
            </Badge>
          ) : null}
        </div>

        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-ink-900">Đăng nhập</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
          Dùng tài khoản được tổ chức cấp. Quyền truy cập phụ thuộc chức vụ và ủy quyền của bạn.
        </p>

        {errors.form ? (
          <Alert tone="danger" className="mt-5" title="Không đăng nhập được">
            {errors.form}
          </Alert>
        ) : null}

        <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
          <Field label="Tên đăng nhập" htmlFor="username" required error={errors.username}>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              autoFocus
              placeholder="ví dụ: sample_owner"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value)
                setErrors((current) => ({ ...current, username: undefined, form: undefined }))
              }}
              aria-invalid={Boolean(errors.username)}
            />
          </Field>

          <Field label="Mật khẩu" htmlFor="password" required error={errors.password}>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                className="pr-10"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setErrors((current) => ({ ...current, password: undefined, form: undefined }))
                }}
                aria-invalid={Boolean(errors.password)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xs p-1 text-ink-400 hover:text-ink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </Field>

          <div className="flex items-center justify-end">
            <Link
              to="/quen-mat-khau"
              className="rounded-xs text-xs font-medium text-jade-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600"
            >
              Quên mật khẩu?
            </Link>
          </div>

          <Button type="submit" size="lg" block isLoading={login.isPending} loadingText="Đang xác thực…">
            <LogIn aria-hidden="true" />
            Đăng nhập
          </Button>
        </form>

        {isMockMode ? (
          <div className="mt-7 rounded-md border border-dashed border-line-strong bg-surface-muted px-3.5 py-3">
            <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-400">
              Tài khoản demo
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DEMO_HINTS.map((hint) => (
                <button
                  key={hint.username}
                  type="button"
                  onClick={() => {
                    setUsername(hint.username)
                    setPassword(hint.password)
                    setErrors({})
                  }}
                  className="rounded-sm border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-600 transition-colors hover:border-jade-200 hover:bg-jade-50 hover:text-jade-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600"
                >
                  {hint.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-2xs leading-relaxed text-ink-400">
              Mật khẩu: <span className="font-mono">Sample@123456</span> (ngoại trừ{' '}
              <span className="font-mono">platform_admin / 123456</span>).
            </p>
          </div>
        ) : null}

        <p className="mt-6 text-center text-sm text-ink-500">
          Chưa có tài khoản tổ chức?{' '}
          <Link
            to="/dang-ky"
            className="rounded-xs font-medium text-jade-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600"
          >
            Đăng ký tổ chức
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
