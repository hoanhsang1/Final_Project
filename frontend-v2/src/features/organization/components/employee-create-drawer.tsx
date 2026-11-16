import { GraduationCap, Info, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Alert } from '@/components/ui/feedback'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Field, Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePermission } from '@/features/auth/hooks'
import { PositionPicker } from '@/features/organization/components/position-picker'
import {
  TempPasswordDialog,
  type TempPasswordInfo,
} from '@/features/organization/components/temp-password-dialog'
import {
  useCreateMember,
  useDepartments,
  usePositions,
  useSpecialties,
} from '@/features/organization/hooks'
import { CONTRACT_TYPE_LABELS } from '@/features/organization/types'
import { ApiError } from '@/lib/api-error'

interface FormState {
  departmentId: string
  username: string
  email: string
  role: 'MANAGER' | 'STAFF'
  positionIds: string[]
  staffCode: string
  fullName: string
  phone: string
  contractType: '' | 'CO_HUU' | 'THINH_GIANG'
  specialtyIds: string[]
}

const EMPTY_FORM: FormState = {
  departmentId: '',
  username: '',
  email: '',
  role: 'STAFF',
  positionIds: [],
  staffCode: '',
  fullName: '',
  phone: '',
  contractType: '',
  specialtyIds: [],
}

type Errors = Partial<Record<keyof FormState | 'form', string>>

export function EmployeeCreateDrawer({
  open,
  onOpenChange,
  defaultDepartmentId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDepartmentId?: string
}) {
  const { isOwner } = usePermission()
  const departments = useDepartments()
  const positions = usePositions()
  const specialties = useSpecialties()
  const createMember = useCreateMember()

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Errors>({})
  const [tempPassword, setTempPassword] = useState<TempPasswordInfo | null>(null)

  useEffect(() => {
    if (!open) return
    const firstDepartment = defaultDepartmentId ?? departments.data?.[0]?.id ?? ''
    setForm({ ...EMPTY_FORM, departmentId: firstDepartment })
    setErrors({})
  }, [open, defaultDepartmentId, departments.data])

  const selectedPositions = useMemo(
    () => (positions.data ?? []).filter((position) => form.positionIds.includes(position.id)),
    [form.positionIds, positions.data],
  )
  const needsTeacher = selectedPositions.some((position) => position.profileType === 'TEACHER')
  const noPositions = positions.isSuccess && (positions.data ?? []).length === 0

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }))
  }

  const validate = (): Errors => {
    const next: Errors = {}
    if (!form.departmentId) next.departmentId = 'Chọn phòng ban cho nhân sự.'
    if (!form.username.trim()) next.username = 'Nhập tên đăng nhập.'
    else if (!/^[a-zA-Z0-9._-]{3,100}$/.test(form.username.trim())) {
      next.username = 'Từ 3–100 ký tự, chỉ gồm chữ, số và . _ -'
    }
    if (!form.email.trim()) next.email = 'Nhập email.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      next.email = 'Email không hợp lệ.'
    }
    if (form.positionIds.length === 0) next.positionIds = 'Chọn ít nhất một chức vụ.'
    if (needsTeacher) {
      if (!form.staffCode.trim()) next.staffCode = 'Giáo viên cần mã nhân viên.'
      if (!form.fullName.trim()) next.fullName = 'Nhập họ tên giáo viên.'
      if (!form.phone.trim()) next.phone = 'Nhập số điện thoại.'
      else if (!/^[0-9+()\-.\s]{6,30}$/.test(form.phone.trim())) next.phone = 'Số điện thoại không hợp lệ.'
      if (form.specialtyIds.length === 0) next.specialtyIds = 'Chọn ít nhất một chuyên môn.'
    }
    return next
  }

  const submit = () => {
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return

    createMember.mutate(
      {
        departmentId: form.departmentId,
        username: form.username.trim(),
        email: form.email.trim(),
        role: form.role,
        positionIds: form.positionIds,
        ...(needsTeacher
          ? {
              staffCode: form.staffCode.trim(),
              fullName: form.fullName.trim(),
              phone: form.phone.trim(),
              teacherProfile: {
                specialtyIds: form.specialtyIds,
                ...(form.contractType ? { contractType: form.contractType } : {}),
              },
            }
          : {}),
      },
      {
        onSuccess: (result) => {
          onOpenChange(false)
          setTempPassword({
            username: result.member.username,
            password: result.temporaryPassword,
            fullName: needsTeacher ? form.fullName.trim() : null,
          })
          toast.success('Đã tạo nhân sự và tài khoản đăng nhập')
          setForm(EMPTY_FORM)
        },
        onError: (error) => {
          const apiError = ApiError.from(error)
          setErrors({ form: apiError.message })
        },
      },
    )
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent width="lg" aria-describedby={undefined}>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <UserPlus className="size-4 text-jade-600" aria-hidden="true" />
              Thêm nhân sự
            </DrawerTitle>
            <DrawerDescription>
              Tạo hồ sơ nhân sự và tài khoản đăng nhập. Mật khẩu tạm chỉ hiển thị một lần sau khi
              tạo.
            </DrawerDescription>
          </DrawerHeader>

          <DrawerBody className="flex flex-col gap-5">
            {errors.form ? (
              <Alert tone="danger" title="Không tạo được nhân sự">
                {errors.form}
              </Alert>
            ) : null}

            {noPositions ? (
              <Alert tone="warning" title="Chưa có chức vụ">
                Cần tạo chức vụ trước khi thêm nhân sự.{' '}
                <Link to="/to-chuc/chuc-vu" className="font-semibold underline underline-offset-2">
                  Tới trang Chức vụ &amp; quyền
                </Link>
              </Alert>
            ) : null}

            <section className="flex flex-col gap-3">
              <h3 className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-400">
                1 · Tài khoản đăng nhập
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tên đăng nhập" htmlFor="new-username" required error={errors.username}>
                  <Input
                    id="new-username"
                    value={form.username}
                    autoComplete="off"
                    onChange={(event) => update('username', event.target.value)}
                    placeholder="nguyen.van.a"
                    aria-invalid={Boolean(errors.username)}
                  />
                </Field>
                <Field label="Email" htmlFor="new-email" required error={errors.email}>
                  <Input
                    id="new-email"
                    type="email"
                    value={form.email}
                    autoComplete="off"
                    onChange={(event) => update('email', event.target.value)}
                    placeholder="a.nguyen@truong.edu.vn"
                    aria-invalid={Boolean(errors.email)}
                  />
                </Field>
              </div>
              <Field
                label="Vai trò tài khoản"
                htmlFor="new-role"
                hint="Vai trò khung của tài khoản. Quyền nghiệp vụ đến từ chức vụ bên dưới."
              >
                <Select
                  value={form.role}
                  onValueChange={(value) => update('role', value as 'MANAGER' | 'STAFF')}
                >
                  <SelectTrigger id="new-role" className="sm:max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAFF">Nhân viên (STAFF)</SelectItem>
                    <SelectItem value="MANAGER">Quản lý phòng ban (MANAGER)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </section>

            <section className="flex flex-col gap-3 border-t border-line pt-5">
              <h3 className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-400">
                2 · Phòng ban &amp; chức vụ
              </h3>
              <Field label="Phòng ban" htmlFor="new-department" required error={errors.departmentId}>
                <Select
                  value={form.departmentId}
                  onValueChange={(value) => update('departmentId', value)}
                >
                  <SelectTrigger id="new-department" aria-invalid={Boolean(errors.departmentId)}>
                    <SelectValue placeholder="Chọn phòng ban" />
                  </SelectTrigger>
                  <SelectContent>
                    {(departments.data ?? []).map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Chức vụ"
                required
                error={errors.positionIds}
                hint="Có thể gán nhiều chức vụ. Chức vụ quyết định quyền hiệu lực."
              >
                <PositionPicker
                  positions={positions.data ?? []}
                  selected={form.positionIds}
                  onChange={(ids) => update('positionIds', ids)}
                  canAssignOrgScope={isOwner}
                  disabled={createMember.isPending}
                />
              </Field>
              <p className="flex items-start gap-1.5 text-2xs leading-relaxed text-ink-400">
                <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                HR chỉ gán được chức vụ có quyền không vượt quá quyền của mình; chức vụ cấp tổ chức
                do Chủ tổ chức gán. Backend kiểm tra lại các điều kiện này.
              </p>
            </section>

            {needsTeacher ? (
              <section className="flex flex-col gap-3 rounded-md border border-info-100 bg-info-50/40 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-800">
                  <GraduationCap className="size-4 text-info-500" aria-hidden="true" />
                  Hồ sơ giáo viên
                </h3>
                <p className="text-2xs leading-relaxed text-ink-500">
                  Chức vụ đã chọn yêu cầu hồ sơ giáo viên. Giáo viên chỉ được phân công lớp khi
                  đang ở trạng thái “Đang dạy” và khớp chuyên môn.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Mã nhân viên" htmlFor="new-staff-code" required error={errors.staffCode}>
                    <Input
                      id="new-staff-code"
                      value={form.staffCode}
                      onChange={(event) => update('staffCode', event.target.value)}
                      placeholder="GV010"
                      aria-invalid={Boolean(errors.staffCode)}
                    />
                  </Field>
                  <Field label="Họ và tên" htmlFor="new-full-name" required error={errors.fullName}>
                    <Input
                      id="new-full-name"
                      value={form.fullName}
                      onChange={(event) => update('fullName', event.target.value)}
                      placeholder="Nguyễn Văn A"
                      aria-invalid={Boolean(errors.fullName)}
                    />
                  </Field>
                  <Field label="Số điện thoại" htmlFor="new-phone" required error={errors.phone}>
                    <Input
                      id="new-phone"
                      value={form.phone}
                      onChange={(event) => update('phone', event.target.value)}
                      placeholder="0901 234 567"
                      aria-invalid={Boolean(errors.phone)}
                    />
                  </Field>
                  <Field label="Loại hợp đồng" htmlFor="new-contract">
                    <Select
                      value={form.contractType || 'NONE'}
                      onValueChange={(value) =>
                        update('contractType', value === 'NONE' ? '' : (value as 'CO_HUU' | 'THINH_GIANG'))
                      }
                    >
                      <SelectTrigger id="new-contract">
                        <SelectValue placeholder="Không xác định" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Không xác định</SelectItem>
                        <SelectItem value="CO_HUU">{CONTRACT_TYPE_LABELS.CO_HUU}</SelectItem>
                        <SelectItem value="THINH_GIANG">
                          {CONTRACT_TYPE_LABELS.THINH_GIANG}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <fieldset>
                  <legend className="mb-1.5 text-sm font-medium text-ink-700">
                    Chuyên môn <span className="text-danger-500">*</span>
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {(specialties.data ?? []).map((specialty) => {
                      const checked = form.specialtyIds.includes(specialty.id)
                      return (
                        <label
                          key={specialty.id}
                          htmlFor={`specialty-${specialty.id}`}
                          className={
                            checked
                              ? 'flex cursor-pointer items-center gap-1.5 rounded-full border border-jade-300 bg-jade-50 px-2.5 py-1 text-xs font-medium text-jade-800'
                              : 'flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink-600 hover:border-ink-300'
                          }
                        >
                          <Checkbox
                            id={`specialty-${specialty.id}`}
                            checked={checked}
                            onCheckedChange={() =>
                              update(
                                'specialtyIds',
                                checked
                                  ? form.specialtyIds.filter((id) => id !== specialty.id)
                                  : [...form.specialtyIds, specialty.id],
                              )
                            }
                            className="size-3.5"
                            aria-label={specialty.name}
                          />
                          {specialty.name}
                        </label>
                      )
                    })}
                  </div>
                  {errors.specialtyIds ? (
                    <p className="mt-1 text-xs font-medium text-danger-500" role="alert">
                      {errors.specialtyIds}
                    </p>
                  ) : null}
                </fieldset>
              </section>
            ) : (
              <section className="rounded-md border border-dashed border-line-strong px-3.5 py-3">
                <p className="flex items-center gap-2 text-xs text-ink-500">
                  <Badge tone="neutral" size="sm">
                    Không phải giáo viên
                  </Badge>
                  Chức vụ đang chọn không yêu cầu hồ sơ giáo viên, nên không cần mã nhân viên hay
                  chuyên môn.
                </p>
              </section>
            )}
          </DrawerBody>

          <DrawerFooter>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={createMember.isPending}>
              Huỷ
            </Button>
            <Button
              size="sm"
              onClick={submit}
              isLoading={createMember.isPending}
              disabled={noPositions}
              loadingText="Đang tạo tài khoản…"
            >
              Tạo nhân sự
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <TempPasswordDialog info={tempPassword} onClose={() => setTempPassword(null)} />
    </>
  )
}
