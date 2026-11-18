import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Alert } from '@/components/ui/feedback'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import {
  useCreateDepartment,
  useDepartmentModuleImpact,
  useUpdateDepartment,
} from '@/features/organization/hooks'
import type { Department } from '@/features/organization/types'
import { ApiError } from '@/lib/api-error'
import { MODULE_CATALOG, moduleLabel } from '@/lib/modules'

interface FormErrors {
  name?: string
  modules?: string
  form?: string
}

export function DepartmentFormDialog({
  open,
  onOpenChange,
  department,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  department?: Department | null
}) {
  const create = useCreateDepartment()
  const update = useUpdateDepartment()
  // Component được mount mỗi lần mở (key theo phòng ban) nên state khởi tạo
  // trực tiếp từ props, không cần effect reset.
  const [name, setName] = useState(department?.name ?? '')
  const [description, setDescription] = useState(department?.description ?? '')
  const [moduleCodes, setModuleCodes] = useState<string[]>(department?.modules ?? [])
  const [errors, setErrors] = useState<FormErrors>({})

  const isEdit = Boolean(department)

  const removedModules = useMemo(
    () => (department?.modules ?? []).filter((code) => !moduleCodes.includes(code)),
    [department?.modules, moduleCodes],
  )
  const impact = useDepartmentModuleImpact(department?.id, removedModules)

  const toggleModule = (code: string) => {
    setModuleCodes((current) => {
      if (current.includes(code)) return current.filter((item) => item !== code)
      if (current.length >= 6) {
        setErrors((errors) => ({ ...errors, modules: 'Tối đa 6 module cho mỗi phòng ban.' }))
        return current
      }
      return [...current, code]
    })
    setErrors((current) => ({ ...current, modules: undefined, form: undefined }))
  }

  const submit = () => {
    const next: FormErrors = {}
    if (!name.trim()) next.name = 'Vui lòng nhập tên phòng ban.'
    if (name.trim().length > 200) next.name = 'Tên phòng ban tối đa 200 ký tự.'
    if (description.length > 1000) next.name = 'Mô tả tối đa 1000 ký tự.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      moduleCodes,
    }
    const onSuccess = () => {
      toast.success(isEdit ? 'Đã cập nhật phòng ban' : 'Đã tạo phòng ban')
      onOpenChange(false)
    }
    const onError = (error: unknown) => setErrors({ form: ApiError.from(error).message })

    if (isEdit && department) {
      update.mutate({ id: department.id, input: payload }, { onSuccess, onError })
    } else {
      create.mutate(payload, { onSuccess, onError })
    }
  }

  const pending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa phòng ban' : 'Thêm phòng ban'}</DialogTitle>
          <DialogDescription>
            Phòng ban gắn với một tập module nghiệp vụ. Nhân sự chỉ thuộc một phòng ban tại một thời
            điểm.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          {errors.form ? <Alert tone="danger">{errors.form}</Alert> : null}

          <Field label="Tên phòng ban" htmlFor="department-name" required error={errors.name}>
            <Input
              id="department-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setErrors((current) => ({ ...current, name: undefined, form: undefined }))
              }}
              placeholder="Ví dụ: Tổ Toán – Tin"
              autoFocus
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <Field
            label="Mô tả"
            htmlFor="department-description"
            hint="Không bắt buộc, tối đa 1000 ký tự."
          >
            <Textarea
              id="department-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Chức năng và phạm vi phụ trách của phòng ban"
            />
          </Field>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink-700">Module sử dụng</legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {MODULE_CATALOG.map((module) => (
                <label
                  key={module.code}
                  htmlFor={`department-module-${module.code}`}
                  className="flex cursor-pointer items-start gap-2.5 rounded-sm border border-transparent px-2 py-1.5 hover:bg-ink-50"
                >
                  <Checkbox
                    id={`department-module-${module.code}`}
                    checked={moduleCodes.includes(module.code)}
                    onCheckedChange={() => toggleModule(module.code)}
                    className="mt-0.5"
                    aria-label={module.label}
                  />
                  <span>
                    <span className="block text-sm text-ink-700">{module.label}</span>
                    <span className="block text-2xs text-ink-400">
                      {module.core ? 'Module lõi' : 'Module tùy chọn'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {errors.modules ? (
              <p className="mt-1 text-xs font-medium text-danger-500" role="alert">
                {errors.modules}
              </p>
            ) : null}
            <p className="mt-2 text-2xs leading-relaxed text-ink-400">
              Chỉ chọn được module đã bật ở cấp tổ chức. Module lõi không thể tắt.
            </p>
          </fieldset>

          {removedModules.length > 0 ? (
            <Alert tone="warning" title="Cảnh báo gỡ module">
              {impact.isError ? (
                <p>Không tải được cảnh báo ảnh hưởng; vẫn có thể lưu thay đổi.</p>
              ) : impact.isLoading ? (
                <p>Đang kiểm tra chức danh và nhân sự bị ảnh hưởng…</p>
              ) : (
                <>
                  <p>
                    Gỡ {removedModules.map((code) => moduleLabel(code)).join(', ')} ảnh hưởng{' '}
                    <span className="font-semibold tabular">
                      {impact.data?.affectedMembers ?? 0}
                    </span>{' '}
                    nhân sự đang giữ {impact.data?.positions.length ?? 0} chức danh. Không quyền nào
                    bị xoá tự động; quyền hiệu lực ngừng áp dụng cho tới khi module được bật lại.
                  </p>
                  {impact.data?.positions.length ? (
                    <p className="mt-1 text-2xs">
                      {impact.data.positions
                        .map((position) => `${position.name} (${position.members})`)
                        .join(' · ')}
                    </p>
                  ) : null}
                </>
              )}
            </Alert>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={pending}>
            Huỷ
          </Button>
          <Button size="sm" onClick={submit} isLoading={pending}>
            {isEdit ? 'Lưu thay đổi' : 'Tạo phòng ban'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
