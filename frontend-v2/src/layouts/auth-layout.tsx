import { useId } from 'react'

import { Logo } from '@/components/brand/logo'
import { cn } from '@/lib/cn'

const PILLARS = [
  {
    title: 'Một nền tảng, nhiều tổ chức',
    description: 'Phân vùng dữ liệu theo tổ chức, phòng ban và chức vụ — không lẫn dữ liệu giữa các trường.',
  },
  {
    title: 'Quyền theo chức vụ, không theo chức danh',
    description: 'Tổng quản lý, Giáo vụ hay HR đều nhận đúng quyền được cấp, có thời hạn và thu hồi được.',
  },
  {
    title: 'Vận hành đào tạo liền mạch',
    description: 'Nhân sự, lớp học, lịch giảng dạy và cơ sở vật chất trong cùng một luồng công việc.',
  },
]

/** Khung hai cột cho các trang công khai (đăng nhập, đăng ký, quên mật khẩu). */
export function AuthLayout({
  children,
  aside,
  footer,
}: {
  children: React.ReactNode
  aside?: React.ReactNode
  footer?: React.ReactNode
}) {
  const headingId = useId()

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Panel thương hiệu — chỉ hiển thị từ lg để không chiếm chỗ trên tablet */}
      <aside className="relative hidden w-[44%] min-w-[420px] max-w-[620px] flex-col justify-between overflow-hidden bg-sidebar px-10 py-9 lg:flex xl:px-14">
        <div className="mems-grid-bg absolute inset-0 opacity-70" aria-hidden="true" />
        <div
          className="absolute -right-24 -top-24 size-[420px] rounded-full bg-jade-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -left-20 size-[360px] rounded-full bg-saffron-400/6 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative">
          <Logo tone="light" showTagline />
        </div>

        <div className="relative max-w-md">
          <p className="mb-3 text-2xs font-semibold uppercase tracking-[0.22em] text-jade-300">
            Modular Education Management System
          </p>
          <h1
            id={headingId}
            className="text-balance text-[1.9rem] font-semibold leading-[1.2] tracking-[-0.03em] text-white"
          >
            Điều hành trường học và trung tâm trong một hệ thống duy nhất.
          </h1>
          <p className="mt-4 text-pretty text-sm leading-relaxed text-sidebar-text">
            Từ cơ cấu tổ chức, nhân sự, phân quyền đến lớp học và lịch giảng dạy — tất cả vận hành trên
            cùng một nguồn dữ liệu.
          </p>

          <dl className="mt-9 flex flex-col gap-5">
            {PILLARS.map((pillar) => (
              <div key={pillar.title} className="flex gap-3.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-jade-300" aria-hidden="true" />
                <div>
                  <dt className="text-sm font-medium text-white">{pillar.title}</dt>
                  <dd className="mt-0.5 text-xs leading-relaxed text-sidebar-muted">{pillar.description}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative flex items-center justify-between text-2xs text-sidebar-muted">
          <span>© 2026 MEMS</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-jade-400" aria-hidden="true" />
            Phiên bản 2.0
          </span>
        </div>
      </aside>

      <main className="flex flex-1 flex-col px-4 py-6 sm:px-8 sm:py-10">
        <div className="flex items-center justify-between lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className={cn('w-full max-w-[26rem]')}>{children}</div>
        </div>
        {aside}
        {footer ? <div className="mx-auto w-full max-w-[26rem] pt-6 text-center text-xs text-ink-400">{footer}</div> : null}
      </main>
    </div>
  )
}
