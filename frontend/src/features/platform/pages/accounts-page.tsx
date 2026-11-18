import { KeyRound, Plus, ShieldCheck, UserCog } from 'lucide-react'
import { useDeferredValue, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable, type DataColumn } from '@/components/ui/data-table'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert } from '@/components/ui/feedback'
import { Field, Input, Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import {
  TempPasswordDialog,
  type TempPasswordInfo,
} from '@/features/organization/components/temp-password-dialog'
import {
  useAccountMutations,
  useAccounts,
  useOrganizations,
} from '@/features/platform/hooks'
import {
  ACCOUNT_ROLE_LABELS,
  ACCOUNT_STATUS_LABELS,
  type AccountRow,
} from '@/features/platform/types'
import { ApiError } from '@/lib/api-error'
import { formatDateTime } from '@/lib/format'

const ASSIGNABLE_ROLES = ['OWNER', 'MANAGER', 'STAFF', 'ACADEMIC_STAFF', 'STUDENT']

export function AccountsPage() {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim())
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [organizationId, setOrganizationId] = useState('all')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const [createOpen, setCreateOpen] = useState(false)
  const [roleTarget, setRoleTarget] = useState<AccountRow | null>(null)
  const [statusTarget, setStatusTarget] = useState<AccountRow | null>(null)
  const [resetTarget, setResetTarget] = useState<AccountRow | null>(null)
  const [formError, setFormError] = useState<string>()
  const [credential, setCredential] = useState<TempPasswordInfo | null>(null)

  const organizations = useOrganizations({ page: 1, size: 100 })
  const accounts = useAccounts({
    page,
    size,
    keyword: deferredSearch || undefined,
    role: role === 'all' ? undefined : role,
    status: status === 'all' ? undefined : status,
    organizationId: organizationId === 'all' ? undefined : organizationId,
  })
  const mutations = useAccountMutations()

  const [createForm, setCreateForm] = useState({ email: '', role: 'STAFF', organizationId: '' })
  const [nextRole, setNextRole] = useState('')
  const [nextStatus, setNextStatus] = useState<'active' | 'locked' | 'disabled'>('locked')
  const [statusReason, setStatusReason] = useState('')

  useEffect(() => {
    if (!createOpen) return
    setCreateForm({ email: '', role: 'STAFF', organizationId: '' })
    setFormError(undefined)
  }, [createOpen])

  useEffect(() => {
    if (!roleTarget) return
    setNextRole(roleTarget.role)
    setFormError(undefined)
  }, [roleTarget])

  useEffect(() => {
    if (!statusTarget) return
    setNextStatus(statusTarget.status === 'active' ? 'locked' : 'active')
    setStatusReason('')
    setFormError(undefined)
  }, [statusTarget])

  const rows = accounts.data?.items ?? []
  const total = accounts.data?.total ?? 0

  const submitCreate = () => {
    setFormError(undefined)
    if (!createForm.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(createForm.email)) {
      setFormError('Email không hợp lệ.')
      return
    }
    mutations.create.mutate(
      {
        email: createForm.email.trim(),
        role: createForm.role,
        organizationId: createForm.organizationId || undefined,
      },
      {
        onSuccess: (created) => {
          toast.success('Đã tạo tài khoản.')
          setCreateOpen(false)
          if (created.temporaryPassword) {
            setCredential({
              username: created.username,
              password: created.temporaryPassword,
            })
          }
        },
        onError: (cause) =>
          setFormError(ApiError.from(cause).message || 'Không tạo được tài khoản.'),
      },
    )
  }

  const submitRole = () => {
    if (!roleTarget) return
    mutations.updateRole.mutate(
      { id: roleTarget.id, role: nextRole },
      {
        onSuccess: () => {
          toast.success('Đã đổi vai trò tài khoản.')
          setRoleTarget(null)
        },
        onError: (cause) =>
          setFormError(ApiError.from(cause).message || 'Không đổi được vai trò.'),
      },
    )
  }

  const columns: DataColumn<AccountRow>[] = [
    {
      id: 'account',
      header: 'Tài khoản',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-900">{row.username}</p>
          <p className="truncate text-xs text-ink-500">{row.email}</p>
        </div>
      ),
      sortValue: (row) => row.username,
    },
    {
      id: 'organization',
      header: 'Tổ chức',
      hideBelow: 'md',
      cell: (row) => row.organizationName ?? '—',
    },
    {
      id: 'role',
      header: 'Vai trò',
      cell: (row) => (
        <Badge tone={row.role === 'OWNER' ? 'brand' : row.role === 'SUPER_ADMIN' ? 'dark' : 'neutral'}>
          {ACCOUNT_ROLE_LABELS[row.role] ?? row.role}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: (row) => (
        <Badge
          tone={row.status === 'active' ? 'success' : row.status === 'locked' ? 'warning' : 'danger'}
          dot
        >
          {ACCOUNT_STATUS_LABELS[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      id: 'lastLogin',
      header: 'Đăng nhập gần nhất',
      hideBelow: 'lg',
      cell: (row) => formatDateTime(row.lastLoginAt),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setRoleTarget(row)}>
            <UserCog aria-hidden="true" />
            Vai trò
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setStatusTarget(row)}>
            <ShieldCheck aria-hidden="true" />
            Trạng thái
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setResetTarget(row)}>
            <KeyRound aria-hidden="true" />
            Đặt lại mật khẩu
          </Button>
        </div>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Quản trị hệ thống · Tài khoản"
        title="Tài khoản"
        description="Quản lý tài khoản toàn hệ thống: vai trò, trạng thái và đặt lại mật khẩu."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" />
            Tạo tài khoản
          </Button>
        }
        meta={<span className="text-xs text-ink-500">{total} tài khoản</span>}
      />

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput
          value={search}
          onValueChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          placeholder="Tìm username, email, tổ chức…"
        />
        <Select
          value={organizationId}
          onValueChange={(value) => {
            setOrganizationId(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Tổ chức" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi tổ chức</SelectItem>
            {(organizations.data?.items ?? []).map((organization) => (
              <SelectItem key={organization.id} value={organization.id}>
                {organization.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={role}
          onValueChange={(value) => {
            setRole(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi vai trò</SelectItem>
            {ASSIGNABLE_ROLES.map((code) => (
              <SelectItem key={code} value={code}>
                {ACCOUNT_ROLE_LABELS[code] ?? code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="locked">Tạm khoá</SelectItem>
            <SelectItem value="disabled">Đã vô hiệu hoá</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(row) => row.id}
          isLoading={accounts.isLoading}
          error={
            accounts.isError ? (
              <ErrorState
                title="Không tải được danh sách tài khoản"
                description={ApiError.from(accounts.error).message}
                onRetry={() => void accounts.refetch()}
              />
            ) : undefined
          }
          empty={<p className="py-8 text-center text-sm text-ink-500">Không có tài khoản phù hợp.</p>}
          serverPagination={{
            page,
            size,
            total,
            onPageChange: setPage,
            onSizeChange: (next) => {
              setSize(next)
              setPage(1)
            },
          }}
        />
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo tài khoản</DialogTitle>
            <DialogDescription>
              Tên đăng nhập được sinh từ email. Chọn vai trò và tổ chức trước khi tạo.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <Field label="Email" htmlFor="account-email" required>
              <Input
                id="account-email"
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })}
              />
            </Field>
            <Field label="Vai trò" htmlFor="account-role" required>
              <Select
                value={createForm.role}
                onValueChange={(value) => setCreateForm({ ...createForm, role: value })}
              >
                <SelectTrigger id="account-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {ACCOUNT_ROLE_LABELS[code] ?? code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tổ chức" htmlFor="account-org">
              <Select
                value={createForm.organizationId || 'none'}
                onValueChange={(value) =>
                  setCreateForm({ ...createForm, organizationId: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger id="account-org">
                  <SelectValue placeholder="Chọn tổ chức" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không thuộc tổ chức</SelectItem>
                  {(organizations.data?.items ?? []).map((organization) => (
                    <SelectItem key={organization.id} value={organization.id}>
                      {organization.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Alert tone="info" title="Mật khẩu tạm">
              Sau khi tạo, hệ thống hiển thị mật khẩu tạm đúng một lần để bàn giao. Người dùng bắt
              buộc đổi mật khẩu ở lần đăng nhập đầu tiên.
            </Alert>
            {formError ? <p className="text-sm text-danger-600">{formError}</p> : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Huỷ
            </Button>
            <Button onClick={submitCreate} isLoading={mutations.create.isPending}>
              Tạo tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(roleTarget)} onOpenChange={(open) => !open && setRoleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi vai trò · {roleTarget?.username}</DialogTitle>
            <DialogDescription>Thay đổi có hiệu lực ngay sau khi lưu.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <Field label="Vai trò" required>
              <Select value={nextRole} onValueChange={setNextRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {ACCOUNT_ROLE_LABELS[code] ?? code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {formError ? <p className="text-sm text-danger-600">{formError}</p> : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleTarget(null)}>
              Huỷ
            </Button>
            <Button onClick={submitRole} isLoading={mutations.updateRole.isPending}>
              Lưu vai trò
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(statusTarget)} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi trạng thái · {statusTarget?.username}</DialogTitle>
            <DialogDescription>Trạng thái hiện tại: {statusTarget?.status}</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <Field label="Trạng thái mới" required>
              <Select
                value={nextStatus}
                onValueChange={(value) => setNextStatus(value as typeof nextStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="locked">Tạm khoá</SelectItem>
                  <SelectItem value="disabled">Đã vô hiệu hoá</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Lý do">
              <Textarea
                value={statusReason}
                onChange={(event) => setStatusReason(event.target.value)}
                placeholder="Ghi chú lý do thay đổi trạng thái"
              />
            </Field>
            {formError ? <p className="text-sm text-danger-600">{formError}</p> : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusTarget(null)}>
              Huỷ
            </Button>
            <Button
              isLoading={mutations.updateStatus.isPending}
              onClick={() => {
                if (!statusTarget) return
                mutations.updateStatus.mutate(
                  {
                    id: statusTarget.id,
                    status: nextStatus,
                    reason: statusReason.trim() || undefined,
                  },
                  {
                    onSuccess: () => {
                      toast.success('Đã cập nhật trạng thái tài khoản.')
                      setStatusTarget(null)
                    },
                    onError: (cause) =>
                      setFormError(ApiError.from(cause).message || 'Không cập nhật được trạng thái.'),
                  },
                )
              }}
            >
              Lưu trạng thái
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(resetTarget)}
        onOpenChange={(open) => !open && setResetTarget(null)}
        title="Đặt lại mật khẩu"
        description={`Đặt lại mật khẩu cho ${resetTarget?.username ?? ''}? Hệ thống sinh mật khẩu tạm mới và yêu cầu người dùng đổi ở lần đăng nhập kế tiếp.`}
        confirmLabel="Đặt lại"
        onConfirm={() => {
          if (!resetTarget) return
          mutations.resetPassword.mutate(
            { id: resetTarget.id },
            {
              onSuccess: (result) => {
                toast.success('Đã đặt lại mật khẩu.')
                const username = resetTarget.username
                setResetTarget(null)
                if (result.temporaryPassword) {
                  setCredential({ username, password: result.temporaryPassword })
                }
              },
              onError: (cause) =>
                toast.error(ApiError.from(cause).message || 'Không đặt lại được mật khẩu.'),
            },
          )
        }}
      />

      <TempPasswordDialog info={credential} onClose={() => setCredential(null)} />
    </PageContainer>
  )
}
