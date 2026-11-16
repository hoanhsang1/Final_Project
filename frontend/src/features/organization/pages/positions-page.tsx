import { Copy, KeyRound, Plus, Trash2, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable, TableToolbar, type DataColumn } from '@/components/ui/data-table'
import { CheckboxRow } from '@/components/ui/checkbox'
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
import { ErrorState } from '@/components/ui/states'
import { PageContainer } from '@/components/layout/page-container'
import { usePermission } from '@/features/auth/hooks'
import {
  useAvailablePermissions,
  useClonePosition,
  useCreatePosition,
  useDeletePosition,
  useDepartments,
  usePositionImpact,
  usePositions,
  useUpdatePosition,
} from '@/features/organization/hooks'
import type { Position, PositionInput } from '@/features/organization/types'
import {
  usePermissionBundles,
  usePermissionCatalog,
} from '@/features/workflows/hooks'
import { PERM } from '@/lib/permissions'
import { ApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/format'

const emptyInput = (): PositionInput => ({
  name: '',
  description: '',
  permissions: [],
  bundleCodes: [],
  scope: 'DEPARTMENT',
  departmentId: null,
})

export function PositionsPage() {
  const { can, isOwner } = usePermission()
  const positions = usePositions()
  const departments = useDepartments()
  const catalog = usePermissionCatalog()
  const bundles = usePermissionBundles()
  const create = useCreatePosition()
  const update = useUpdatePosition()
  const remove = useDeletePosition()
  const clone = useClonePosition()

  const canManage = isOwner || can(PERM.positionManage)

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Position | null>(null)
  const [input, setInput] = useState<PositionInput>(emptyInput())
  const [formError, setFormError] = useState<string>()
  const [permissionSearch, setPermissionSearch] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null)
  const [impactTarget, setImpactTarget] = useState<Position | null>(null)
  const impact = usePositionImpact(impactTarget?.id)

  const [cloneTarget, setCloneTarget] = useState<Position | null>(null)
  const [cloneDepartment, setCloneDepartment] = useState('')
  const [cloneName, setCloneName] = useState('')
  const [cloneResult, setCloneResult] = useState<{
    removedPermissions: string[]
    droppedBundles: string[]
  } | null>(null)

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (positions.data ?? []).filter(
      (position) =>
        !term ||
        position.name.toLowerCase().includes(term) ||
        position.permissions.some((permission) => permission.toLowerCase().includes(term)),
    )
  }, [positions.data, search])

  const departmentMap = useMemo(
    () => new Map((departments.data ?? []).map((department) => [department.id, department.name])),
    [departments.data],
  )

  const availableForDepartment = useAvailablePermissions(
    formOpen && input.scope === 'DEPARTMENT' ? input.departmentId ?? undefined : undefined,
  )

  // Khi soạn chức danh phòng ban, chỉ hiện các quyền thuộc module đang bật
  // (available-permissions). Quyền đang chọn sẵn nhưng ngoài danh sách vẫn
  // hiển thị để không bị ẩn trạng thái đã chọn.
  const permissionSource = useMemo(() => {
    const base = availableForDepartment.data
    if (!base) return catalog.data ?? []
    const known = new Set(base.map((permission) => permission.code))
    const selected = input.permissions.flatMap((code) => {
      if (known.has(code)) return []
      const match = (catalog.data ?? []).find((permission) => permission.code === code)
      return match ? [match] : []
    })
    return [...base, ...selected]
  }, [availableForDepartment.data, catalog.data, input.permissions])

  const filteredPermissions = useMemo(() => {
    const term = permissionSearch.trim().toLowerCase()
    return permissionSource.filter(
      (permission) =>
        !term ||
        permission.code.toLowerCase().includes(term) ||
        permission.description.toLowerCase().includes(term),
    )
  }, [permissionSource, permissionSearch])

  const openCreate = () => {
    setEditing(null)
    setInput(emptyInput())
    setFormError(undefined)
    setPermissionSearch('')
    setFormOpen(true)
  }

  const openEdit = (position: Position) => {
    setEditing(position)
    setInput({
      name: position.name,
      description: position.description ?? '',
      permissions: [...position.permissions],
      bundleCodes: [...position.bundleCodes],
      scope: position.scope,
      departmentId: position.departmentId,
    })
    setFormError(undefined)
    setPermissionSearch('')
    setFormOpen(true)
  }

  const togglePermission = (code: string) => {
    setInput((current) => ({
      ...current,
      permissions: current.permissions.includes(code)
        ? current.permissions.filter((item) => item !== code)
        : [...current.permissions, code],
    }))
  }

  const toggleBundle = (code: string) => {
    setInput((current) => ({
      ...current,
      bundleCodes: current.bundleCodes.includes(code)
        ? current.bundleCodes.filter((item) => item !== code)
        : [...current.bundleCodes, code],
    }))
  }

  const submit = () => {
    if (!input.name.trim()) return setFormError('Cần nhập tên chức danh.')
    if (input.scope === 'DEPARTMENT' && !input.departmentId) {
      return setFormError('Chức danh phạm vi phòng ban cần chọn phòng ban.')
    }
    if (input.permissions.length === 0 && input.bundleCodes.length === 0) {
      return setFormError('Chọn ít nhất một quyền hoặc một gói quyền.')
    }
    const payload: PositionInput = {
      ...input,
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      departmentId: input.scope === 'DEPARTMENT' ? input.departmentId : null,
    }
    if (editing) {
      update.mutate(
        { id: editing.id, input: payload },
        {
          onSuccess: () => {
            toast.success('Đã cập nhật chức danh')
            setFormOpen(false)
          },
          onError: (error) => setFormError(ApiError.from(error).message),
        },
      )
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          toast.success('Đã tạo chức danh')
          setFormOpen(false)
        },
        onError: (error) => setFormError(ApiError.from(error).message),
      })
    }
  }

  const columns: DataColumn<Position>[] = [
    {
      id: 'name',
      header: 'Chức danh',
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-800">{row.name}</p>
          <p className="truncate text-xs text-ink-400">{row.description || '—'}</p>
        </div>
      ),
    },
    {
      id: 'scope',
      header: 'Phạm vi',
      cell: (row) => (
        <Badge tone={row.scope === 'ORGANIZATION' ? 'brand' : 'neutral'}>
          {row.scope === 'ORGANIZATION'
            ? 'Toàn tổ chức'
            : departmentMap.get(row.departmentId ?? '') || 'Phòng ban'}
        </Badge>
      ),
    },
    {
      id: 'bundles',
      header: 'Gói quyền',
      hideBelow: 'md',
      cell: (row) =>
        row.bundleCodes.length ? (
          <div className="flex flex-wrap gap-1">
            {row.bundleCodes.map((code) => (
              <Badge key={code} tone="outline" size="sm">
                {code}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-ink-400">—</span>
        ),
    },
    {
      id: 'permissions',
      header: 'Quyền',
      align: 'right',
      cell: (row) => <span className="tabular text-sm text-ink-700">{row.permissions.length}</span>,
    },
    {
      id: 'createdAt',
      header: 'Tạo lúc',
      hideBelow: 'lg',
      sortValue: (row) => row.createdAt,
      cell: (row) => <span className="text-xs text-ink-500">{formatDate(row.createdAt)}</span>,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setImpactTarget(row)}>
            <Users aria-hidden="true" />
            Ảnh hưởng
          </Button>
          {canManage ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCloneTarget(row)
                  setCloneDepartment('')
                  setCloneName('')
                  setCloneResult(null)
                }}
              >
                <Copy aria-hidden="true" />
                Nhân bản
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                Sửa
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-danger-500 hover:text-danger-600"
                onClick={() => setDeleteTarget(row)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Tổ chức · Cơ cấu"
        title="Chức vụ & quyền"
        description="Chức danh gắn tập quyền và gói quyền; quyền hiệu lực chỉ áp dụng trong module phòng ban đang bật."
        actions={
          canManage ? (
            <Button size="sm" onClick={openCreate}>
              <Plus aria-hidden="true" />
              Tạo chức danh
            </Button>
          ) : null
        }
        meta={
          <>
            <Badge tone="info" dot>
              {(positions.data ?? []).length} chức danh
            </Badge>
            <span className="text-xs text-ink-400">
              Chức danh phạm vi tổ chức chỉ Chủ tổ chức gán cho nhân sự.
            </span>
          </>
        }
      />

      {positions.isError ? (
        <ErrorState
          className="mt-6"
          title="Không tải được chức danh"
          description={ApiError.from(positions.error).message}
          onRetry={() => void positions.refetch()}
        />
      ) : (
        <div className="mt-5 overflow-hidden rounded-lg border border-line bg-surface shadow-xs">
          <TableToolbar
            actions={
              <span className="text-xs text-ink-400">{rows.length} chức danh</span>
            }
          >
            <SearchInput
              value={search}
              onValueChange={setSearch}
              placeholder="Tìm theo tên hoặc mã quyền…"
              aria-label="Tìm chức danh"
            />
          </TableToolbar>
          <DataTable
            columns={columns}
            data={rows}
            rowKey={(row) => row.id}
            isLoading={positions.isLoading}
            initialPageSize={10}
            empty={
              <EmptyState
                icon={<KeyRound className="size-5" aria-hidden="true" />}
                title="Chưa có chức danh"
                description="Tạo chức danh để gán quyền cho nhân sự theo phạm vi tổ chức hoặc phòng ban."
                action={
                  canManage
                    ? { label: 'Tạo chức danh', onClick: openCreate }
                    : undefined
                }
              />
            }
          />
        </div>
      )}

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setFormError(undefined)
        }}
      >
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Sửa chức danh' : 'Tạo chức danh'}</DialogTitle>
            <DialogDescription>
              Quyền ngoài module đang bật của phòng ban sẽ bị backend loại khi tính quyền hiệu lực.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <Field label="Tên chức danh" required error={formError && !input.name ? formError : undefined}>
              <Input
                value={input.name}
                maxLength={200}
                onChange={(event) => {
                  setInput((current) => ({ ...current, name: event.target.value }))
                  setFormError(undefined)
                }}
              />
            </Field>
            <Field label="Mô tả" hint="Tối đa 1000 ký tự.">
              <Textarea
                rows={2}
                value={input.description ?? ''}
                maxLength={1000}
                onChange={(event) =>
                  setInput((current) => ({ ...current, description: event.target.value }))
                }
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phạm vi" required>
                <select
                  value={input.scope}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      scope: event.target.value as 'ORGANIZATION' | 'DEPARTMENT',
                      departmentId:
                        event.target.value === 'ORGANIZATION' ? null : current.departmentId,
                    }))
                  }
                  className="h-9.5 w-full rounded-md border border-line-strong bg-surface px-2 text-sm"
                >
                  <option value="DEPARTMENT">Phòng ban</option>
                  <option value="ORGANIZATION">Toàn tổ chức</option>
                </select>
              </Field>
              <Field label="Phòng ban" required={input.scope === 'DEPARTMENT'}>
                <select
                  value={input.departmentId ?? ''}
                  disabled={input.scope === 'ORGANIZATION'}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      departmentId: event.target.value || null,
                    }))
                  }
                  className="h-9.5 w-full rounded-md border border-line-strong bg-surface px-2 text-sm disabled:bg-ink-50"
                >
                  <option value="">Chọn phòng ban</option>
                  {(departments.data ?? []).map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-ink-700">Gói quyền</p>
              <div className="grid gap-2 rounded-md border border-line p-3 sm:grid-cols-2">
                {(bundles.data ?? []).map((bundle) => (
                  <CheckboxRow
                    key={bundle.code}
                    id={`bundle-${bundle.code}`}
                    label={bundle.name}
                    description={bundle.description}
                    checked={input.bundleCodes.includes(bundle.code)}
                    onCheckedChange={() => toggleBundle(bundle.code)}
                  />
                ))}
                {bundles.isLoading ? (
                  <p className="text-sm text-ink-500">Đang tải gói quyền…</p>
                ) : null}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-ink-700">
                Quyền trực tiếp ({input.permissions.length} đã chọn)
              </p>
              {input.scope === 'DEPARTMENT' && input.departmentId ? (
                <p className="mb-2 text-2xs text-ink-400">
                  Đang lọc theo module đang bật của phòng ban đã chọn.
                </p>
              ) : null}
              <SearchInput
                value={permissionSearch}
                onValueChange={setPermissionSearch}
                placeholder="Tìm mã hoặc mô tả quyền…"
                aria-label="Tìm quyền"
              />
              <div className="mems-scroll mt-2 max-h-64 overflow-y-auto rounded-md border border-line p-3">
                {catalog.isLoading || availableForDepartment.isFetching ? (
                  <p className="text-sm text-ink-500">Đang tải danh mục quyền…</p>
                ) : availableForDepartment.isError ? (
                  <p className="text-sm text-danger-500">
                    {ApiError.from(availableForDepartment.error).message}
                  </p>
                ) : filteredPermissions.length === 0 ? (
                  <p className="text-sm text-ink-500">Không có quyền khớp từ khoá.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {filteredPermissions.map((permission) => (
                      <CheckboxRow
                        key={permission.code}
                        id={`position-perm-${permission.code}`}
                        label={permission.code}
                        description={permission.description}
                        checked={input.permissions.includes(permission.code)}
                        onCheckedChange={() => togglePermission(permission.code)}
                      />
                    ))}
                  </div>
                )}
              </div>
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
            <Button onClick={submit} isLoading={create.isPending || update.isPending}>
              {editing ? 'Lưu thay đổi' : 'Tạo chức danh'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(impactTarget)}
        onOpenChange={(open) => {
          if (!open) setImpactTarget(null)
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Ảnh hưởng chức danh</DialogTitle>
            <DialogDescription>{impactTarget?.name}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {impact.isLoading ? (
              <p className="text-sm text-ink-500">Đang tính…</p>
            ) : impact.isError ? (
              <p className="text-sm text-danger-500">{ApiError.from(impact.error).message}</p>
            ) : (
              <p className="text-sm text-ink-700">
                Đang có{' '}
                <span className="font-semibold tabular">{impact.data?.activeHolders ?? 0}</span>{' '}
                người được gán chức danh này.
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImpactTarget(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(cloneTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCloneTarget(null)
            setCloneResult(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nhân bản chức danh</DialogTitle>
            <DialogDescription>
              {cloneTarget?.name} → phòng ban đích. Quyền ngoài module đích sẽ bị loại.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <Field label="Phòng ban đích" required>
              <select
                value={cloneDepartment}
                onChange={(event) => setCloneDepartment(event.target.value)}
                className="h-9.5 w-full rounded-md border border-line-strong bg-surface px-2 text-sm"
              >
                <option value="">Chọn phòng ban</option>
                {(departments.data ?? []).map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tên bản sao" hint="Bỏ trống = “<tên gốc> (bản sao)”.">
              <Input
                value={cloneName}
                maxLength={200}
                onChange={(event) => setCloneName(event.target.value)}
              />
            </Field>
            {cloneResult ? (
              <Alert tone="warning" title="Đã nhân bản">
                <p>
                  Loại {cloneResult.removedPermissions.length} quyền và{' '}
                  {cloneResult.droppedBundles.length} gói quyền ngoài module đích.
                </p>
                {cloneResult.removedPermissions.length ? (
                  <p className="mt-1 font-mono text-2xs">
                    {cloneResult.removedPermissions.join(', ')}
                  </p>
                ) : null}
              </Alert>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneTarget(null)}>
              Đóng
            </Button>
            <Button
              isLoading={clone.isPending}
              disabled={!cloneDepartment}
              onClick={() => {
                if (!cloneTarget) return
                clone.mutate(
                  {
                    id: cloneTarget.id,
                    departmentId: cloneDepartment,
                    name: cloneName.trim() || undefined,
                  },
                  {
                    onSuccess: (result) => {
                      toast.success('Đã nhân bản chức danh')
                      setCloneResult(result)
                    },
                    onError: (error) => toast.error(ApiError.from(error).message),
                  },
                )
              }}
            >
              Nhân bản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Xoá chức danh?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” chỉ xoá được khi không còn người được gán.`
            : ''
        }
        confirmLabel="Xoá chức danh"
        tone="danger"
        isLoading={remove.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          remove.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success('Đã xoá chức danh')
              setDeleteTarget(null)
            },
            onError: (error) => toast.error(ApiError.from(error).message),
          })
        }}
      />
    </PageContainer>
  )
}
