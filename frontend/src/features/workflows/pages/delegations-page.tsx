import { Award, Ban, FileBadge, Plus, UserRoundCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckboxRow } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, EmptyState } from '@/components/ui/feedback'
import { Field, Input, Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { usePermission } from '@/features/auth/hooks'
import {
  useDelegationMutations,
  useDelegations,
  useGeneralManagerCandidates,
  useGeneralManagerMutations,
  useGeneralManagers,
  useMyDelegations,
  usePermissionCatalog,
} from '@/features/workflows/hooks'
import type { Delegation } from '@/features/workflows/types'
import { DELEGATION_STATUS_LABELS } from '@/features/workflows/types'
import { ApiError } from '@/lib/api-error'
import { formatDateTime } from '@/lib/format'

function toLocalInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 16) : ''
}

function toIso(value: string): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

export function DelegationsPage() {
  const { isOwner } = usePermission()
  const catalog = usePermissionCatalog()
  const managers = useGeneralManagers(isOwner)
  const candidates = useGeneralManagerCandidates(isOwner)
  const delegations = useDelegations(false, isOwner)
  const mine = useMyDelegations()
  const gmMutations = useGeneralManagerMutations()
  const delegationMutations = useDelegationMutations()

  const [activeOnly, setActiveOnly] = useState(false)
  const [permissionSearch, setPermissionSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Delegation | null>(null)
  const [delegateId, setDelegateId] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [effectiveTo, setEffectiveTo] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState<string>()

  const [revokeTarget, setRevokeTarget] = useState<Delegation | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)

  const rows = useMemo(() => {
    const list = delegations.data ?? []
    return activeOnly ? list.filter((item) => item.active) : list
  }, [delegations.data, activeOnly])

  const permissionOptions = useMemo(() => {
    const term = permissionSearch.trim().toLowerCase()
    return (catalog.data ?? []).filter(
      (permission) =>
        !term ||
        permission.code.toLowerCase().includes(term) ||
        permission.description.toLowerCase().includes(term),
    )
  }, [catalog.data, permissionSearch])

  const openCreate = () => {
    setEditing(null)
    setDelegateId('')
    setSelected([])
    setEffectiveFrom('')
    setEffectiveTo('')
    setReason('')
    setFormError(undefined)
    setPermissionSearch('')
    setFormOpen(true)
  }

  const openEdit = (delegation: Delegation) => {
    setEditing(delegation)
    setDelegateId(delegation.delegateId)
    setSelected(delegation.permissions)
    setEffectiveFrom(toLocalInput(delegation.effectiveFrom))
    setEffectiveTo(toLocalInput(delegation.effectiveTo))
    setReason(delegation.reason ?? '')
    setFormError(undefined)
    setPermissionSearch('')
    setFormOpen(true)
  }

  const togglePermission = (code: string) => {
    setSelected((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    )
    setFormError(undefined)
  }

  const submit = () => {
    if (!editing && !delegateId) return setFormError('Chọn Tổng quản lý nhận uỷ quyền.')
    if (selected.length === 0) return setFormError('Chọn ít nhất một quyền uỷ quyền.')
    if (effectiveFrom && effectiveTo && new Date(effectiveFrom) > new Date(effectiveTo)) {
      return setFormError('Thời điểm bắt đầu phải trước thời điểm kết thúc.')
    }
    const payload = {
      delegateId,
      permissions: selected,
      effectiveFrom: toIso(effectiveFrom),
      effectiveTo: toIso(effectiveTo),
      reason: reason.trim() || undefined,
    }
    if (editing) {
      delegationMutations.update.mutate(
        { id: editing.id, input: payload },
        {
          onSuccess: () => {
            toast.success('Đã cập nhật uỷ quyền')
            setFormOpen(false)
          },
          onError: (error) => setFormError(ApiError.from(error).message),
        },
      )
    } else {
      delegationMutations.create.mutate(payload, {
        onSuccess: () => {
          toast.success('Đã tạo uỷ quyền')
          setFormOpen(false)
        },
        onError: (error) => setFormError(ApiError.from(error).message),
      })
    }
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Tổ chức · Quản trị"
        title="Tổng quản lý & uỷ quyền"
        description="Chủ tổ chức bổ nhiệm Tổng quản lý và uỷ quyền từng quyền có thời hạn."
        actions={
          isOwner ? (
            <Button size="sm" onClick={openCreate} disabled={(managers.data ?? []).length === 0}>
              <Plus aria-hidden="true" />
              Tạo uỷ quyền
            </Button>
          ) : null
        }
        meta={
          <span className="text-xs text-ink-400">
            Uỷ quyền chỉ áp dụng phạm vi ORGANIZATION và chỉ giao được quyền Chủ tổ chức đang có.
          </span>
        }
      />

      {!isOwner ? (
        <Alert tone="info" className="mt-5" title="Chế độ chỉ xem">
          Chỉ Chủ tổ chức quản lý bổ nhiệm và uỷ quyền. Bạn xem được các uỷ quyền đang nhận tại tab
          “Của tôi”.
        </Alert>
      ) : null}

      <Tabs defaultValue={isOwner ? 'managers' : 'mine'} className="mt-5">
        <TabsList variant="underline">
          {isOwner ? (
            <>
              <TabsTrigger variant="underline" value="managers">
                Tổng quản lý ({managers.data?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger variant="underline" value="delegations">
                Uỷ quyền ({rows.length})
              </TabsTrigger>
            </>
          ) : null}
          <TabsTrigger variant="underline" value="mine">
            Của tôi ({mine.data?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {isOwner ? (
          <TabsContent value="managers" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="size-4 text-jade-600" aria-hidden="true" />
                    Đang giữ chức danh
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  {managers.isError ? (
                    <ErrorState
                      title="Không tải được Tổng quản lý"
                      description={ApiError.from(managers.error).message}
                      onRetry={() => void managers.refetch()}
                    />
                  ) : (managers.data ?? []).length === 0 ? (
                    <p className="py-4 text-sm text-ink-500">Chưa bổ nhiệm Tổng quản lý.</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {(managers.data ?? []).map((manager) => (
                        <li
                          key={manager.userId}
                          className="flex items-start justify-between gap-3 py-3 first:pt-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink-800">
                              {manager.fullName || manager.username}
                            </p>
                            <p className="truncate text-xs text-ink-500">
                              {manager.departmentName || '—'} · bổ nhiệm{' '}
                              {formatDateTime(manager.appointedAt)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={gmMutations.remove.isPending}
                            onClick={() => setRemoveTarget(manager.userId)}
                          >
                            Bãi nhiệm
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserRoundCheck className="size-4 text-jade-600" aria-hidden="true" />
                    Bổ nhiệm Tổng quản lý
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                  {candidates.isLoading ? (
                    <p className="py-4 text-sm text-ink-500">Đang tải ứng viên…</p>
                  ) : (candidates.data ?? []).length === 0 ? (
                    <p className="py-4 text-sm text-ink-500">
                      Không còn nhân sự đang hoạt động để bổ nhiệm.
                    </p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {(candidates.data ?? []).map((candidate) => (
                        <li
                          key={candidate.userId}
                          className="flex items-start justify-between gap-3 py-3 first:pt-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm text-ink-800">
                              {candidate.fullName || candidate.username}
                            </p>
                            <p className="truncate text-xs text-ink-500">
                              {candidate.departmentName || '—'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            disabled={gmMutations.appoint.isPending}
                            onClick={() =>
                              gmMutations.appoint.mutate(
                                { userId: candidate.userId },
                                {
                                  onSuccess: () => toast.success('Đã bổ nhiệm Tổng quản lý'),
                                  onError: (error) => toast.error(ApiError.from(error).message),
                                },
                              )
                            }
                          >
                            Bổ nhiệm
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ) : null}

        {isOwner ? (
          <TabsContent value="delegations" className="mt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm text-ink-600">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(event) => setActiveOnly(event.target.checked)}
                />
                Chỉ hiện uỷ quyền đang hiệu lực
              </label>
            </div>
            {delegations.isError ? (
              <ErrorState
                title="Không tải được uỷ quyền"
                description={ApiError.from(delegations.error).message}
                onRetry={() => void delegations.refetch()}
              />
            ) : rows.length === 0 ? (
              <EmptyState
                icon={<FileBadge className="size-5" aria-hidden="true" />}
                title="Chưa có uỷ quyền"
                description="Bổ nhiệm Tổng quản lý trước, sau đó tạo uỷ quyền với tập quyền và thời hạn cụ thể."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {rows.map((delegation) => (
                  <Card key={delegation.id}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">
                            {delegation.delegateName || delegation.delegateUsername}
                          </CardTitle>
                          <p className="mt-0.5 text-xs text-ink-500">
                            {delegation.delegateDepartmentName || '—'} · từ{' '}
                            {formatDateTime(delegation.effectiveFrom)}
                            {delegation.effectiveTo
                              ? ` → ${formatDateTime(delegation.effectiveTo)}`
                              : ' · không đặt hạn'}
                          </p>
                        </div>
                        <Badge tone={delegation.active ? 'success' : 'neutral'} dot>
                          {DELEGATION_STATUS_LABELS[delegation.status] ?? delegation.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 pt-1">
                      <div className="flex flex-wrap gap-1.5">
                        {delegation.permissions.map((permission) => (
                          <Badge key={permission} tone="outline" size="sm">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                      {delegation.reason ? (
                        <p className="text-sm text-ink-600">{delegation.reason}</p>
                      ) : null}
                      {delegation.revokedReason ? (
                        <p className="text-xs text-ink-400">
                          Thu hồi: {delegation.revokedReason}
                        </p>
                      ) : null}
                      {delegation.active ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(delegation)}>
                            Điều chỉnh
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRevokeTarget(delegation)
                              setRevokeReason('')
                            }}
                          >
                            <Ban aria-hidden="true" />
                            Thu hồi
                          </Button>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ) : null}

        <TabsContent value="mine" className="mt-4">
          {mine.isError ? (
            <ErrorState
              title="Không tải được uỷ quyền của bạn"
              description={ApiError.from(mine.error).message}
              onRetry={() => void mine.refetch()}
            />
          ) : (mine.data ?? []).length === 0 ? (
            <EmptyState
              icon={<FileBadge className="size-5" aria-hidden="true" />}
              title="Bạn chưa nhận uỷ quyền nào"
              description="Khi Chủ tổ chức uỷ quyền, tập quyền và thời hạn sẽ hiển thị tại đây."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {(mine.data ?? []).map((delegation) => (
                <Card key={delegation.id}>
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm text-ink-700">
                        Từ {delegation.delegatorName} · {formatDateTime(delegation.effectiveFrom)}
                        {delegation.effectiveTo
                          ? ` → ${formatDateTime(delegation.effectiveTo)}`
                          : ' · không đặt hạn'}
                      </p>
                      <Badge tone={delegation.active ? 'success' : 'neutral'} dot>
                        {DELEGATION_STATUS_LABELS[delegation.status] ?? delegation.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {delegation.permissions.map((permission) => (
                        <Badge key={permission} tone="brand" size="sm">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setFormError(undefined)
        }}
      >
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Điều chỉnh uỷ quyền' : 'Tạo uỷ quyền'}</DialogTitle>
            <DialogDescription>
              Người nhận phải đang là Tổng quản lý. Chỉ chọn được quyền Chủ tổ chức đang giữ.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <Field label="Tổng quản lý nhận uỷ quyền" required>
              <select
                value={delegateId}
                disabled={Boolean(editing)}
                onChange={(event) => {
                  setDelegateId(event.target.value)
                  setFormError(undefined)
                }}
                className="h-9.5 w-full rounded-md border border-line-strong bg-surface px-2 text-sm disabled:bg-ink-50"
              >
                <option value="">Chọn Tổng quản lý</option>
                {(managers.data ?? []).map((manager) => (
                  <option key={manager.userId} value={manager.userId}>
                    {manager.fullName || manager.username} · {manager.departmentName || '—'}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Hiệu lực từ" hint="Bỏ trống = ngay khi lưu.">
                <Input
                  type="datetime-local"
                  value={effectiveFrom}
                  onChange={(event) => setEffectiveFrom(event.target.value)}
                />
              </Field>
              <Field label="Hiệu lực đến" hint="Bỏ trống = không đặt hạn.">
                <Input
                  type="datetime-local"
                  value={effectiveTo}
                  onChange={(event) => setEffectiveTo(event.target.value)}
                />
              </Field>
            </div>

            <Field label="Lý do" hint="Tối đa 1000 ký tự.">
              <Textarea
                rows={2}
                value={reason}
                maxLength={1000}
                onChange={(event) => setReason(event.target.value)}
              />
            </Field>

            <div>
              <p className="mb-2 text-sm font-medium text-ink-700">
                Quyền uỷ quyền ({selected.length} đã chọn)
              </p>
              <SearchInput
                value={permissionSearch}
                onValueChange={setPermissionSearch}
                placeholder="Tìm mã hoặc mô tả quyền…"
                aria-label="Tìm quyền"
              />
              <div className="mems-scroll mt-2 max-h-64 overflow-y-auto rounded-md border border-line p-3">
                {catalog.isLoading ? (
                  <p className="text-sm text-ink-500">Đang tải danh mục quyền…</p>
                ) : permissionOptions.length === 0 ? (
                  <p className="text-sm text-ink-500">Không có quyền khớp từ khoá.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {permissionOptions.map((permission) => (
                      <CheckboxRow
                        key={permission.code}
                        id={`delegation-perm-${permission.code}`}
                        label={permission.code}
                        description={permission.description}
                        checked={selected.includes(permission.code)}
                        onCheckedChange={() => togglePermission(permission.code)}
                      />
                    ))}
                  </div>
                )}
              </div>
              {selected.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.map((code) => (
                    <Badge key={code} tone="brand" size="sm">
                      {code}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            {formError ? (
              <p className="text-xs font-medium text-danger-500" role="alert">
                {formError}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Huỷ
            </Button>
            <Button
              onClick={submit}
              isLoading={delegationMutations.create.isPending || delegationMutations.update.isPending}
            >
              {editing ? 'Lưu thay đổi' : 'Tạo uỷ quyền'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thu hồi uỷ quyền</DialogTitle>
            <DialogDescription>
              {revokeTarget
                ? `${revokeTarget.delegateName || revokeTarget.delegateUsername} sẽ mất các quyền được uỷ quyền ngay lập tức.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label="Lý do thu hồi" required>
              <Textarea
                rows={3}
                value={revokeReason}
                maxLength={1000}
                onChange={(event) => setRevokeReason(event.target.value)}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Huỷ
            </Button>
            <Button
              variant="danger"
              isLoading={delegationMutations.revoke.isPending}
              onClick={() => {
                if (!revokeTarget) return
                if (!revokeReason.trim()) {
                  toast.error('Cần nêu lý do thu hồi.')
                  return
                }
                delegationMutations.revoke.mutate(
                  { id: revokeTarget.id, reason: revokeReason.trim() },
                  {
                    onSuccess: () => {
                      toast.success('Đã thu hồi uỷ quyền')
                      setRevokeTarget(null)
                    },
                    onError: (error) => toast.error(ApiError.from(error).message),
                  },
                )
              }}
            >
              Thu hồi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null)
        }}
        title="Bãi nhiệm Tổng quản lý?"
        description="Chức danh cấp tổ chức sẽ bị gỡ. Uỷ quyền hiện có cần được thu hồi riêng nếu muốn chấm dứt quyền."
        confirmLabel="Bãi nhiệm"
        tone="danger"
        isLoading={gmMutations.remove.isPending}
        onConfirm={() => {
          if (!removeTarget) return
          gmMutations.remove.mutate(
            { userId: removeTarget },
            {
              onSuccess: () => {
                toast.success('Đã bãi nhiệm Tổng quản lý')
                setRemoveTarget(null)
              },
              onError: (error) => toast.error(ApiError.from(error).message),
            },
          )
        }}
      />
    </PageContainer>
  )
}
