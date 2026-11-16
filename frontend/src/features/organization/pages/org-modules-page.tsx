import { Blocks, Info, Lock, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Alert } from '@/components/ui/feedback'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { useOrgModules, useToggleOrgModule } from '@/features/organization/hooks'
import type { OrganizationModule } from '@/features/organization/types'
import { ApiError } from '@/lib/api-error'

const STATUS_LABEL: Record<string, string> = {
  active: 'Đang bật',
  disabled: 'Đã tắt',
  locked: 'Bị khóa',
  requested: 'Đang chờ duyệt',
  rejected: 'Bị từ chối',
  not_registered: 'Chưa đăng ký',
}

export function OrgModulesPage() {
  const query = useOrgModules()
  const toggle = useToggleOrgModule()
  const [pending, setPending] = useState<{ module: OrganizationModule; enabled: boolean } | null>(
    null,
  )

  const modules = query.data ?? []
  const activeCount = modules.filter((module) => module.status === 'active').length

  const requestToggle = (module: OrganizationModule) => {
    if (module.isCore || module.lockedByAdmin) return
    const isActive = module.status === 'active'
    setPending({ module, enabled: !isActive })
  }

  const confirmToggle = () => {
    if (!pending) return
    toggle.mutate(
      { code: pending.module.code, enabled: pending.enabled },
      {
        onSuccess: () => {
          toast.success(
            pending.enabled
              ? `Đã bật ${pending.module.name}`
              : `Đã tắt ${pending.module.name} — dữ liệu được giữ ở chế độ chỉ đọc`,
          )
          setPending(null)
        },
        onError: (error) => {
          toast.error(ApiError.from(error).message)
          setPending(null)
        },
      },
    )
  }

  if (query.isError) {
    const apiError = ApiError.from(query.error)
    const backendMissing = apiError.status === 404 || apiError.status === 403
    return (
      <PageContainer>
        <PageHeader
          eyebrow="Tổ chức · Quản trị"
          title="Module của tổ chức"
          description="Bật hoặc tắt các module tùy chọn của tổ chức."
        />
        {backendMissing ? (
          <Alert tone="warning" className="mt-6" title="Backend đang chạy chưa hỗ trợ endpoint này">
            Giao diện đã sẵn sàng theo contract <code>GET/PATCH /api/v1/organizations/my/modules</code>{' '}
            nhưng service đang chạy trả {apiError.status}. Cần build lại IdentityService để dùng chức
            năng này. Đây là <strong>BACKEND_DEPENDENCY</strong>, không phải lỗi giao diện.
          </Alert>
        ) : (
          <ErrorState
            className="mt-6"
            title="Không tải được module của tổ chức"
            description={apiError.message}
            onRetry={() => void query.refetch()}
          />
        )}
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Tổ chức · Quản trị"
        title="Module của tổ chức"
        description="Module lõi luôn bật. Module tùy chọn có thể tắt; khi tắt, dữ liệu được giữ nhưng chỉ đọc."
        actions={
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            Làm mới
          </Button>
        }
        meta={
          <>
            <Badge tone="brand">
              {activeCount}/{modules.length} module đang bật
            </Badge>
            <span className="text-xs text-ink-400">
              Thao tác được ghi nhật ký tổ chức. Backend kiểm tra lại quyền OWNER.
            </span>
          </>
        }
      />

      <Alert tone="info" className="mt-6" title="Nguyên tắc module">
        Module lõi (Sinh viên, Giáo viên, Lớp, Lịch) không thể tắt. Module bị quản trị hệ thống khóa
        chỉ có thể mở bởi SUPER_ADMIN. Tắt module chuyển dữ liệu sang chỉ đọc, không xoá.
      </Alert>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {query.isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[132px] rounded-lg" />
            ))
          : modules.map((module) => {
              const isActive = module.status === 'active'
              const locked = module.lockedByAdmin || module.status === 'locked'
              const disabled = module.isCore || locked || toggle.isPending
              return (
                <Card key={module.code} className="overflow-hidden">
                  <CardContent className="flex items-start gap-3 py-4">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-jade-50 text-jade-700">
                      <Blocks className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-semibold text-ink-900">{module.name}</p>
                        {module.isCore ? (
                          <Badge tone="outline" size="sm">
                            <ShieldCheck className="size-3" aria-hidden="true" />
                            Module lõi
                          </Badge>
                        ) : null}
                        {locked ? (
                          <Badge tone="warning" size="sm">
                            <Lock className="size-3" aria-hidden="true" />
                            Bị quản trị hệ thống khóa
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 font-mono text-2xs text-ink-400">{module.code}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge tone={isActive ? 'success' : locked ? 'warning' : 'neutral'} dot>
                          {locked ? 'Bị khóa' : (STATUS_LABEL[module.status] ?? module.status)}
                        </Badge>
                        {module.status === 'disabled' ? (
                          <span className="text-2xs text-ink-400">Dữ liệu chỉ đọc</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => requestToggle(module)}
                        disabled={disabled}
                        label={`${isActive ? 'Tắt' : 'Bật'} ${module.name}`}
                      />
                      {module.isCore ? (
                        <span className="text-2xs text-ink-400">Không thể tắt</span>
                      ) : locked ? (
                        <span className="text-2xs text-warning-600">Cần SUPER_ADMIN</span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
      </div>

      {!query.isLoading && modules.length === 0 ? (
        <Alert tone="neutral" className="mt-4" title="Chưa có module">
          <Info className="mr-1 inline size-3" aria-hidden="true" />
          Tổ chức chưa đăng ký module nào. Liên hệ quản trị hệ thống để được cấp.
        </Alert>
      ) : null}

      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
        title={pending?.enabled ? 'Bật module?' : 'Tắt module?'}
        description={
          pending
            ? pending.enabled
              ? `${pending.module.name} sẽ được bật lại cho tổ chức và dùng được ngay.`
              : `${pending.module.name} sẽ chuyển sang chỉ đọc: giữ toàn bộ dữ liệu nhưng chặn tạo/sửa/duyệt mới.`
            : undefined
        }
        confirmLabel={pending?.enabled ? 'Bật module' : 'Tắt module'}
        tone={pending?.enabled ? 'primary' : 'danger'}
        isLoading={toggle.isPending}
        onConfirm={confirmToggle}
      />
    </PageContainer>
  )
}
