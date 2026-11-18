import {
  Banner,
  Button,
  Dialog,
  DialogHeader,
  HStack,
  MultiSelector,
  RadioList,
  RadioListItem,
  TextInput,
  VStack,
} from '@astryxdesign/core';
import type { FormEvent } from 'react';
import { useEffect } from 'react';
import { MSG_MEM, MSG_OWNER } from '../../features/owner/ownerMessages';
import type { MemberPayload, Position } from '../../features/owner/types';
import { useFormState } from '../../hooks/useFormState';
import { AppLink } from '../AppLink/AppLink';

/** Cùng quy ước với các form khác trong repo (khai cục bộ, chưa có hằng dùng chung). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface MemberFormModalProps {
  open: boolean;
  positions: Position[];
  submitting: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (values: MemberPayload) => void;
}

/**
 * Là `type` chứ không phải `interface`: `useFormState<T>` buộc
 * `T extends Record<string, unknown>` (xem `DepartmentFormModal`).
 */
type MemberFormValues = {
  username: string;
  email: string;
  role: 'MANAGER' | 'STAFF';
  positionIds: string[];
};

/**
 * Modal thêm nhân viên vào phòng ban — `POST /departments/{id}/members`.
 *
 * BE tự sinh mật khẩu tạm và trả về **một lần**; modal này chỉ thu thập thông tin
 * định danh. Validate ở FE chỉ để UX, `MemberRequest` của BE mới là chốt cuối.
 */
export default function MemberFormModal({
  open,
  positions,
  submitting,
  error,
  onCancel,
  onSubmit,
}: MemberFormModalProps) {
  const hasPositions = positions.length > 0;

  const form = useFormState<MemberFormValues>(
    { username: '', email: '', role: 'STAFF', positionIds: [] },
    {
      username: (value) => {
        if (!value.trim()) return MSG_MEM.USERNAME_REQUIRED;
        return value.trim().length <= 100 ? undefined : MSG_MEM.USERNAME_TOO_LONG;
      },
      email: (value) => {
        if (!value.trim()) return MSG_MEM.EMAIL_REQUIRED;
        return EMAIL_PATTERN.test(value.trim()) ? undefined : MSG_MEM.EMAIL_INVALID;
      },
      role: (value) => (value ? undefined : MSG_MEM.ROLE_REQUIRED),
      positionIds: (value) => (value.length > 0 ? undefined : MSG_MEM.POSITIONS_REQUIRED),
    },
  );
  // `reset` có identity ổn định — tách ra để effect không phụ thuộc cả object `form`.
  const resetForm = form.reset;

  // Đổ dữ liệu vào form mỗi khi mở (thay `Form.resetFields` + `destroyOnClose`).
  useEffect(() => {
    if (!open) return;
    resetForm({ username: '', email: '', role: 'STAFF', positionIds: [] });
  }, [open, resetForm]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Chưa có chức vụ thì không gửi — khớp nút Lưu bị khoá của bản antd.
    if (!hasPositions) return;
    if (!form.validate()) return;
    onSubmit({
      username: form.values.username.trim(),
      email: form.values.email.trim(),
      role: form.values.role,
      positionIds: form.values.positionIds,
    });
  };

  const positionOptions = positions.map((p) => ({ value: p.id, label: p.name }));

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
        title={MSG_MEM.ADD_TITLE}
        onOpenChange={(next) => {
          if (!next) onCancel();
        }}
      />

      <form noValidate onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-4)' }}>
        <VStack gap={4}>
          {error ? (
            <Banner status="error" title={error} collapsible={false} role="alert" />
          ) : null}

          {!hasPositions ? (
            <Banner
              status="warning"
              title={MSG_MEM.NO_POSITION_CATALOG}
              collapsible={false}
              endContent={
                <AppLink to="/to-chuc/chuc-vu">{MSG_MEM.GO_TO_POSITIONS}</AppLink>
              }
            />
          ) : null}

          <TextInput
            label={MSG_MEM.USERNAME}
            value={form.values.username}
            onChange={(value) => form.setValue('username', value)}
            autoComplete="off"
            isDisabled={submitting}
            aria-required="true"
            status={
              form.errorOf('username')
                ? { type: 'error', message: form.errorOf('username') }
                : undefined
            }
          />

          <TextInput
            label={MSG_MEM.EMAIL}
            value={form.values.email}
            onChange={(value) => form.setValue('email', value)}
            autoComplete="off"
            isDisabled={submitting}
            aria-required="true"
            status={
              form.errorOf('email')
                ? { type: 'error', message: form.errorOf('email') }
                : undefined
            }
          />

          <RadioList
            label={MSG_MEM.ROLE}
            value={form.values.role}
            onChange={(value) => form.setValue('role', value as 'MANAGER' | 'STAFF')}
            isDisabled={submitting}
            status={
              form.errorOf('role')
                ? { type: 'error', message: form.errorOf('role') }
                : undefined
            }
          >
            <RadioListItem label="Nhân viên phòng ban" value="STAFF" />
            <RadioListItem label="Quản lý phòng ban" value="MANAGER" />
          </RadioList>

          <MultiSelector
            label={MSG_MEM.POSITIONS}
            placeholder="Chọn chức vụ"
            options={positionOptions}
            value={form.values.positionIds}
            onChange={(value) => form.setValue('positionIds', value)}
            isDisabled={submitting || !hasPositions}
            aria-required="true"
            status={
              form.errorOf('positionIds')
                ? { type: 'error', message: form.errorOf('positionIds') }
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
              isDisabled={!hasPositions}
            />
          </HStack>
        </VStack>
      </form>
    </Dialog>
  );
}
