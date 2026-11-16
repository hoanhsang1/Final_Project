import { KeyRound, Mail, Phone, ShieldCheck, Trash2, UserCog } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Field, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/states'
import { usePermission } from '@/features/auth/hooks'
import { PositionPicker } from '@/features/organization/components/position-picker'
import {
  TempPasswordDialog,
  type TempPasswordInfo,
} from '@/features/organization/components/temp-password-dialog'
import {
  useMemberDetail,
  usePositions,
  useRemoveMember,
  useResetMemberPassword,
  useUpdateMemberPositions,
} from '@/features/organization/hooks'
import {
  CONTRACT_TYPE_LABELS,
  MEMBER_STATUS_LABELS,
  ROLE_LABELS,
  TEACHING_STATUS_LABELS,
} from '@/features/organization/types'
import { getInitials, formatDate } from '@/lib/format'
import { ApiError } from '@/lib/api-error'
import { ALL_PERMISSION_META, PERM } from '@/lib/permissions'

function permissionLabel(code: string): string {
  return ALL_PERMISSION_META.find((item) => item.code === code)?.label ?? code
}

export function EmployeeDetailDrawer({
  open,
  onOpenChange,
  departmentId,
  userId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  departmentId: string | null
  userId: string | null
}) {
  const { can, isOwner } = usePermission()
  const detail = useMemberDetail(departmentId ?? undefined, userId ?? undefined)
  const positions = usePositions()
  const updatePositions = useUpdateMemberPositions()
  const resetPassword = useResetMemberPassword()
  const removeMember = useRemoveMember()

  const [editOpen, setEditOpen] = useState(false)
  const [selectedPositions, setSelectedPositions] = useState<string[]>([])
  const [reason, setReason] = useState('')
  const [editError, setEditError] = useState<string>()
  const [resetOpen, setResetOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [tempPassword, setTempPassword] = useState<TempPasswordInfo | null>(null)

  const member = detail.data
  const canAssign = can(PERM.employeeAssignPosition)
  const canReset = can(PERM.employeeResetPassword)
  const canDelete = can(PERM.employeeDelete)

  const positionMap = new Map((positions.data ?? []).map((position) => [position.id, position]))
  const detailPositionNames = (member?.positionIds ?? [])
    .map((id) => positionMap.get(id)?.name)
    .filter((name): name is string => Boolean(name))

  const openEdit = () => {
    setSelectedPositions(member?.positionIds ?? [])
    setReason('')
    setEditError(undefined)
    setEditOpen(true)
  }

  const savePositions = () => {
    if (!member || !departmentId) return
    if (selectedPositions.length === 0) {
      setEditError('Nhân sự cần giữ ít nhất một chức vụ.')
      return
    }
    updatePositions.mutate(
      {
        departmentId,
        userId: member.userId,
        positionIds: selectedPositions,
        reason: reason.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Đã cập nhật chức vụ')
          setEditOpen(false)
        },
        onError: (error) => setEditError(ApiError.from(error).message),
      },
    )
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent width="lg" aria-describedby={undefined}>
          <DrawerHeader>
            {detail.isLoading || !member ? (
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <Avatar size="lg">
                  <AvatarFallback>{getInitials(member.fullName ?? member.username)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <DrawerTitle className="truncate">
                    {member.fullName ?? member.username}
                  </DrawerTitle>
                  <DrawerDescription className="mt-0.5 truncate">
                    @{member.username} · {member.departmentName}
                  </DrawerDescription>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge tone={member.status === 'ACTIVE' ? 'success' : 'neutral'} dot>
                      {MEMBER_STATUS_LABELS[member.status] ?? member.status}
                    </Badge>
                    <Badge tone="neutral">{ROLE_LABELS[member.role] ?? member.role}</Badge>
                    {member.teacher ? <Badge tone="info">Giáo viên</Badge> : null}
                    {member.staffCode ? (
                      <Badge tone="outline" className="font-mono">
                        {member.staffCode}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </DrawerHeader>

          <DrawerBody className="flex flex-col gap-5">
            {detail.isError ? (
              <ErrorState
                title="Không tải được hồ sơ"
                description={ApiError.from(detail.error).message}
                onRetry={() => void detail.refetch()}
              />
            ) : detail.isLoading || !member ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : (
              <>
                <section>
                  <h3 className="mb-2 text-2xs font-semibold uppercase tracking-[0.12em] text-ink-400">
                    Liên hệ
                  </h3>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-2xs text-ink-400">Email</dt>
                      <dd className="flex items-center gap-1.5 text-sm text-ink-800">
                        <Mail className="size-3.5 text-ink-400" aria-hidden="true" />
                        {member.email ?? (can(PERM.employeeViewDetail) ? 'Chưa cập nhật' : 'Không có quyền xem')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-400">Điện thoại</dt>
                      <dd className="flex items-center gap-1.5 text-sm text-ink-800">
                        <Phone className="size-3.5 text-ink-400" aria-hidden="true" />
                        {member.phone ?? (can(PERM.employeeViewDetail) ? 'Chưa cập nhật' : 'Không có quyền xem')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-400">Ngày bổ nhiệm</dt>
                      <dd className="text-sm text-ink-800">{formatDate(member.appointedAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-2xs text-ink-400">Số lớp phụ trách</dt>
                      <dd className="text-sm text-ink-800">
                        {member.teacher ? (member.classLabel ?? `${member.classCount} lớp`) : 'Không áp dụng'}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="border-t border-line pt-4">
                  <h3 className="mb-2 text-2xs font-semibold uppercase tracking-[0.12em] text-ink-400">
                    Chức vụ đang giữ
                  </h3>
                  {detailPositionNames.length === 0 ? (
                    <p className="text-sm text-ink-500">Chưa gán chức vụ.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-1.5">
                      {detailPositionNames.map((name) => (
                        <li key={name}>
                          <Badge tone="brand" size="md">
                            {name}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                  {member.teacher ? (
                    <p className="mt-2 text-xs text-ink-500">
                      {member.contractType ? CONTRACT_TYPE_LABELS[member.contractType] : 'Chưa rõ hợp đồng'}
                      {member.teachingStatus
                        ? ` · ${TEACHING_STATUS_LABELS[member.teachingStatus]}`
                        : ''}
                    </p>
                  ) : null}
                </section>

                <section className="border-t border-line pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.12em] text-ink-400">
                      <ShieldCheck className="size-3.5" aria-hidden="true" />
                      Quyền hiệu lực
                    </h3>
                    <Badge tone="neutral">{member.permissions.length} quyền</Badge>
                  </div>
                  {member.permissions.length === 0 ? (
                    <p className="text-sm text-ink-500">
                      Chưa có quyền nghiệp vụ nào ngoài quyền cá nhân.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {member.permissions.slice(0, 10).map((code) => (
                        <span
                          key={code}
                          className="rounded-full border border-line bg-surface-muted px-2 py-0.5 text-2xs text-ink-600"
                          title={code}
                        >
                          {permissionLabel(code)}
                        </span>
                      ))}
                      {member.permissions.length > 10 ? (
                        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-2xs text-ink-500">
                          +{member.permissions.length - 10}
                        </span>
                      ) : null}
                    </div>
                  )}
                  <p className="mt-2 text-2xs leading-relaxed text-ink-400">
                    Danh sách do backend tính từ vai trò, chức vụ, bundle và ủy quyền còn hiệu lực.
                  </p>
                </section>

                <section className="border-t border-line pt-4">
                  <h3 className="mb-2 text-2xs font-semibold uppercase tracking-[0.12em] text-ink-400">
                    Lịch sử bổ nhiệm
                  </h3>
                  {member.assignmentHistory.length === 0 ? (
                    <p className="text-sm text-ink-500">Chưa có lịch sử.</p>
                  ) : (
                    <ol className="flex flex-col gap-3">
                      {member.assignmentHistory.map((item) => (
                        <li key={item.id} className="flex gap-2.5">
                          <span
                            className={
                              item.status === 'ACTIVE'
                                ? 'mt-1.5 size-1.5 shrink-0 rounded-full bg-success-500'
                                : 'mt-1.5 size-1.5 shrink-0 rounded-full bg-ink-300'
                            }
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="text-sm text-ink-800">
                              {item.positionName}{' '}
                              <span className="text-2xs text-ink-400">
                                ({item.scopeType === 'ORGANIZATION' ? 'cấp tổ chức' : 'phòng ban'})
                              </span>
                            </p>
                            <p className="text-2xs text-ink-500">
                              {formatDate(item.effectiveFrom)}
                              {item.effectiveTo ? ` → ${formatDate(item.effectiveTo)}` : ''} ·{' '}
                              {item.assignedByName ?? 'Hệ thống'}
                            </p>
                            {item.revokedReason ? (
                              <p className="text-2xs text-danger-500">Thu hồi: {item.revokedReason}</p>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </>
            )}
          </DrawerBody>

          <DrawerFooter className="flex-wrap">
            {member?.role === 'OWNER' ? (
              <p className="mr-auto text-2xs text-ink-400">
                Chủ tổ chức không thể bị gỡ khỏi tổ chức.
              </p>
            ) : null}
            {canDelete && member && member.role !== 'OWNER' ? (
              <Button variant="danger-ghost" size="sm" onClick={() => setRemoveOpen(true)}>
                <Trash2 aria-hidden="true" />
                Gỡ khỏi phòng ban
              </Button>
            ) : null}
            {canReset && member ? (
              <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
                <KeyRound aria-hidden="true" />
                Đặt lại mật khẩu
              </Button>
            ) : null}
            {canAssign && member ? (
              <Button size="sm" onClick={openEdit}>
                <UserCog aria-hidden="true" />
                Đổi chức vụ
              </Button>
            ) : null}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Đổi chức vụ</DialogTitle>
            <DialogDescription>
              Quyền hiệu lực được tính lại ngay sau khi lưu. Không thể cấp quyền vượt quá quyền của
              bạn.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            {editError ? (
              <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-xs text-danger-500" role="alert">
                {editError}
              </p>
            ) : null}
            <PositionPicker
              positions={positions.data ?? []}
              selected={selectedPositions}
              onChange={setSelectedPositions}
              canAssignOrgScope={isOwner}
              disabled={updatePositions.isPending}
            />
            <Field label="Lý do thay đổi" htmlFor="position-reason" hint="Không bắt buộc, tối đa 1000 ký tự.">
              <Textarea
                id="position-reason"
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ví dụ: bổ nhiệm phụ trách thêm mảng chuyên môn"
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>
              Huỷ
            </Button>
            <Button size="sm" onClick={savePositions} isLoading={updatePositions.isPending}>
              Lưu chức vụ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Đặt lại mật khẩu?"
        description="Hệ thống tạo mật khẩu tạm mới và buộc người dùng đổi ở lần đăng nhập kế tiếp. Mật khẩu cũ mất hiệu lực ngay."
        confirmLabel="Đặt lại mật khẩu"
        tone="primary"
        isLoading={resetPassword.isPending}
        onConfirm={() => {
          if (!member || !departmentId) return
          resetPassword.mutate(
            { departmentId, userId: member.userId },
            {
              onSuccess: (result) => {
                setResetOpen(false)
                setTempPassword({
                  username: member.username,
                  password: result.temporaryPassword,
                  fullName: member.fullName,
                })
              },
              onError: (error) => toast.error(ApiError.from(error).message),
            },
          )
        }}
      />

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Gỡ nhân sự khỏi phòng ban?"
        description="Tài khoản sẽ mất quyền trong phòng ban này. Hành động được ghi nhật ký và không thể hoàn tác tại giao diện."
        confirmLabel="Gỡ khỏi phòng ban"
        isLoading={removeMember.isPending}
        onConfirm={() => {
          if (!member || !departmentId) return
          removeMember.mutate(
            { departmentId, userId: member.userId },
            {
              onSuccess: () => {
                toast.success('Đã gỡ nhân sự khỏi phòng ban')
                setRemoveOpen(false)
                onOpenChange(false)
              },
              onError: (error) => toast.error(ApiError.from(error).message),
            },
          )
        }}
      />

      <TempPasswordDialog info={tempPassword} onClose={() => setTempPassword(null)} />
    </>
  )
}
