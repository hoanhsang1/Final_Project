import { ArrowLeft, Building2, Send } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckboxRow } from '@/components/ui/checkbox'
import { Alert } from '@/components/ui/feedback'
import { Field, Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/skeleton'
import { usePublicModules, useRegisterOrganization } from '@/features/auth/hooks'
import { AuthLayout } from '@/layouts/auth-layout'
import { ApiError } from '@/lib/api-error'
import type { RegisterOrganizationResponse } from '@/types/session'

type OrgType = 'SCHOOL' | 'CENTER'

interface FormState {
  organizationName: string
  orgType: OrgType
  username: string
  email: string
  password: string
  confirmPassword: string
  modules: string[]
}

type FormErrors = Partial<Record<keyof FormState | 'form', string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function RegisterPage() {
  const modules = usePublicModules()
  const register = useRegisterOrganization()
  const [created, setCreated] = useState<RegisterOrganizationResponse | null>(null)
  const [form, setForm] = useState<FormState>({
    organizationName: '',
    orgType: 'SCHOOL',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    modules: [],
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }))
  }

  const toggleModule = (code: string, checked: boolean) => {
    update(
      'modules',
      checked ? [...form.modules, code] : form.modules.filter((item) => item !== code),
    )
  }

  const validate = (): FormErrors => {
    const next: FormErrors = {}
    const organizationName = form.organizationName.trim()
    const username = form.username.trim()
    const email = form.email.trim()

    if (!organizationName) next.organizationName = 'Vui lòng nhập tên tổ chức.'
    else if (organizationName.length > 200) next.organizationName = 'Tên tổ chức tối đa 200 ký tự.'

    if (username.length < 3 || username.length > 100)
      next.username = 'Tên đăng nhập phải từ 3 đến 100 ký tự.'

    if (!email) next.email = 'Vui lòng nhập email.'
    else if (!EMAIL_PATTERN.test(email) || email.length > 255)
      next.email = 'Email không hợp lệ.'

    if (form.password.length < 12) next.password = 'Mật khẩu phải có ít nhất 12 ký tự.'
    if (form.confirmPassword !== form.password)
      next.confirmPassword = 'Mật khẩu xác nhận không khớp.'

    if (form.modules.length === 0) next.modules = 'Chọn ít nhất một module.'
    return next
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return

    register.mutate(
      {
        organizationName: form.organizationName.trim(),
        orgType: form.orgType,
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        modules: form.modules,
      },
      {
        onSuccess: (result) => setCreated(result),
        onError: (error) => setErrors({ form: ApiError.from(error).message }),
      },
    )
  }

  if (created) {
    const moduleNames = (modules.data ?? [])
      .filter((module) => created.requestedModules.includes(module.code))
      .map((module) => module.name)
    return (
      <AuthLayout>
        <div className="animate-rise">
          <div className="mb-5 flex size-11 items-center justify-center rounded-lg border border-line bg-surface text-jade-700 shadow-xs">
            <Building2 className="size-5" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-ink-900">
            Đã gửi đăng ký tổ chức
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
            Tổ chức <span className="font-medium text-ink-700">{form.organizationName.trim()}</span>{' '}
            đang chờ quản trị hệ thống duyệt. Tài khoản chủ tổ chức chưa đăng nhập được cho tới khi
            tổ chức được kích hoạt.
          </p>

          <Alert tone="success" className="mt-5" title="Mã đăng ký">
            Mã tổ chức: <span className="font-mono">{created.organizationId}</span>
          </Alert>

          <Card className="mt-5">
            <CardContent className="flex flex-col gap-2 py-4">
              <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-400">
                Module đề nghị
              </p>
              <div className="flex flex-wrap gap-1.5">
                {moduleNames.length ? (
                  moduleNames.map((name) => (
                    <Badge key={name} tone="neutral" size="sm">
                      {name}
                    </Badge>
                  ))
                ) : (
                  <span className="font-mono text-xs text-ink-600">
                    {created.requestedModules.join(', ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-500">
                Các module ở trạng thái “đã đề nghị” và chỉ hoạt động sau khi tổ chức được duyệt.
              </p>
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

  return (
    <AuthLayout
      footer={
        <span>
          Cần hỗ trợ? Liên hệ <span className="font-medium text-ink-600">support@mems.vn</span>
        </span>
      }
    >
      <div className="animate-rise">
        <div className="mb-5 flex size-11 items-center justify-center rounded-lg border border-line bg-surface text-jade-700 shadow-xs">
          <Building2 className="size-5" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-ink-900">
          Đăng ký tổ chức
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
          Tạo trường học hoặc trung tâm mới. Tổ chức và tài khoản chủ sở hữu ở trạng thái chờ duyệt
          trước khi sử dụng.
        </p>

        {errors.form ? (
          <Alert tone="danger" className="mt-5" title="Không gửi được đăng ký">
            {errors.form}
          </Alert>
        ) : null}

        <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
          <Field label="Tên tổ chức" htmlFor="organizationName" required error={errors.organizationName}>
            <Input
              id="organizationName"
              name="organizationName"
              autoFocus
              maxLength={200}
              placeholder="ví dụ: Trường THPT Nguyễn Du"
              value={form.organizationName}
              onChange={(event) => update('organizationName', event.target.value)}
              aria-invalid={Boolean(errors.organizationName)}
            />
          </Field>

          <Field label="Loại hình" htmlFor="orgType" required>
            <select
              id="orgType"
              name="orgType"
              className="h-9.5 w-full rounded-md border border-line-strong bg-surface px-2 text-sm"
              value={form.orgType}
              onChange={(event) => update('orgType', event.target.value as OrgType)}
            >
              <option value="SCHOOL">Trường học</option>
              <option value="CENTER">Trung tâm</option>
            </select>
          </Field>

          <Field
            label="Tên đăng nhập chủ tổ chức"
            htmlFor="username"
            required
            hint="3–100 ký tự, không trùng tài khoản đã có."
            error={errors.username}
          >
            <Input
              id="username"
              name="username"
              autoComplete="username"
              maxLength={100}
              value={form.username}
              onChange={(event) => update('username', event.target.value)}
              aria-invalid={Boolean(errors.username)}
            />
          </Field>

          <Field label="Email" htmlFor="email" required error={errors.email}>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={255}
              placeholder="admin@truong.edu.vn"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              aria-invalid={Boolean(errors.email)}
            />
          </Field>

          <Field
            label="Mật khẩu"
            htmlFor="password"
            required
            hint="Tối thiểu 12 ký tự."
            error={errors.password}
          >
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              aria-invalid={Boolean(errors.password)}
            />
          </Field>

          <Field
            label="Xác nhận mật khẩu"
            htmlFor="confirmPassword"
            required
            error={errors.confirmPassword}
          >
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(event) => update('confirmPassword', event.target.value)}
              aria-invalid={Boolean(errors.confirmPassword)}
            />
          </Field>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-ink-700">
              Module đề nghị<span className="ml-0.5 text-danger-500">*</span>
            </p>
            {modules.isLoading ? <Spinner label="Đang tải danh mục module…" /> : null}
            {modules.isError ? (
              <Alert tone="danger" title="Không tải được danh mục module">
                {ApiError.from(modules.error).message}{' '}
                <button
                  type="button"
                  className="font-medium underline underline-offset-4"
                  onClick={() => void modules.refetch()}
                >
                  Thử lại
                </button>
              </Alert>
            ) : null}
            {modules.data?.length ? (
              <div className="flex flex-col gap-2.5 rounded-md border border-line bg-surface px-3 py-3">
                {modules.data.map((module) => (
                  <CheckboxRow
                    key={module.code}
                    id={`module-${module.code}`}
                    label={module.name}
                    description={module.code}
                    checked={form.modules.includes(module.code)}
                    onCheckedChange={(checked) => toggleModule(module.code, checked === true)}
                  />
                ))}
              </div>
            ) : null}
            {errors.modules ? (
              <p className="text-xs font-medium text-danger-500" role="alert">
                {errors.modules}
              </p>
            ) : (
              <p className="text-xs text-ink-400">
                Module ở trạng thái đề nghị cho tới khi quản trị hệ thống duyệt tổ chức.
              </p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            block
            isLoading={register.isPending}
            loadingText="Đang gửi đăng ký…"
          >
            <Send aria-hidden="true" />
            Gửi đăng ký
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Đã có tài khoản?{' '}
          <Link
            to="/dang-nhap"
            className="rounded-xs font-medium text-jade-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade-600"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
