import {
  Banner,
  Button,
  Dialog,
  DialogHeader,
  HStack,
  TextArea,
  TextInput,
  VStack,
} from '@astryxdesign/core';
import type { FormEvent } from 'react';
import { useEffect } from 'react';
import { MSG_DEPT, MSG_OWNER } from '../../features/owner/ownerMessages';
import type { Department, DepartmentPayload } from '../../features/owner/types';
import { useFormState } from '../../hooks/useFormState';

/**
 * Là `type` chứ không phải `interface`: `useFormState<T>` buộc
 * `T extends Record<string, unknown>`, và chỉ type alias của object literal mới
 * có index signature ngầm.
 */
type DepartmentFormValues = {
  name: string;
  description: string;
};

interface DepartmentFormModalProps {
  open: boolean;
  /** `null` = tạo mới; có giá trị = sửa phòng ban đó. */
  department: Department | null;
  /** Đang gửi yêu cầu → khoá nút xác nhận. */
  submitting: boolean;
  /** Lỗi BE đã dịch sang tiếng Việt — hiện trong modal, không dùng toast. */
  error?: string | null;
  onCancel: () => void;
  onSubmit: (values: DepartmentPayload) => void;
}

/**
 * Modal tạo / sửa phòng ban — `POST /departments`, `PUT /departments/{id}`.
 *
 * Validate ở FE chỉ để UX; `DepartmentRequest` của BE (name ≤200, description
 * ≤1000) mới là chốt cuối.
 */
export default function DepartmentFormModal({
  open,
  department,
  submitting,
  error,
  onCancel,
  onSubmit,
}: DepartmentFormModalProps) {
  const isEditing = department !== null;

  const form = useFormState<DepartmentFormValues>(
    { name: '', description: '' },
    {
      name: (value) => {
        if (!value.trim()) return MSG_DEPT.NAME_REQUIRED;
        return value.trim().length <= 200 ? undefined : MSG_DEPT.NAME_TOO_LONG;
      },
      description: (value) =>
        value.trim().length <= 1000 ? undefined : MSG_DEPT.DESCRIPTION_TOO_LONG,
    },
  );
  // `reset` có identity ổn định (useCallback deps rỗng) — tách ra để effect bên
  // dưới không phải phụ thuộc cả object `form` (đổi mỗi render → effect lặp vô hạn).
  const resetForm = form.reset;

  // Đổ dữ liệu vào form mỗi khi mở (thay `Form.setFieldsValue` + `destroyOnClose`).
  useEffect(() => {
    if (!open) return;
    if (department) {
      resetForm({ name: department.name, description: department.description ?? '' });
    } else {
      resetForm();
    }
  }, [open, department, resetForm]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.validate()) return;
    onSubmit({
      name: form.values.name.trim(),
      description: form.values.description.trim() || undefined,
    });
  };

  return (
    <Dialog
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      purpose="form"
      width={520}
    >
      <DialogHeader
        title={isEditing ? MSG_DEPT.EDIT : MSG_DEPT.CREATE}
        onOpenChange={(next) => {
          if (!next) onCancel();
        }}
      />

      <form noValidate onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-4)' }}>
        <VStack gap={4}>
          {error ? (
            <Banner status="error" title={error} collapsible={false} role="alert" />
          ) : null}

          <TextInput
            label={MSG_DEPT.NAME}
            value={form.values.name}
            onChange={(value) => form.setValue('name', value)}
            placeholder="Ví dụ: Khoa Công nghệ thông tin"
            autoComplete="off"
            isDisabled={submitting}
            aria-required="true"
            status={
              form.errorOf('name') ? { type: 'error', message: form.errorOf('name') } : undefined
            }
          />

          <TextArea
            label={MSG_DEPT.DESCRIPTION}
            value={form.values.description}
            onChange={(value) => form.setValue('description', value)}
            rows={3}
            maxLength={1000}
            isDisabled={submitting}
            status={
              form.errorOf('description')
                ? { type: 'error', message: form.errorOf('description') }
                : undefined
            }
          />

          <HStack justify="end" gap={2}>
            <Button variant="secondary" size="lg" label={MSG_OWNER.CANCEL} onClick={onCancel} />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              label={MSG_OWNER.SAVE}
              isLoading={submitting}
            />
          </HStack>
        </VStack>
      </form>
    </Dialog>
  );
}
