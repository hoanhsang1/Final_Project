import {
  Banner,
  Button,
  Dialog,
  DialogHeader,
  HStack,
  Selector,
  TextInput,
  VStack,
} from '@astryxdesign/core';
import type { FormEvent } from 'react';
import { useEffect } from 'react';
import { MSG_ACC, MSG_ORG } from '../../features/admin/adminMessages';
import { CREATE_ROLE_OPTIONS } from '../../features/admin/roleLabels';
import type { AccountCreatePayload } from '../../features/admin/types';
import { useFormState } from '../../hooks/useFormState';

/** Cùng quy ước với các form khác trong repo (khai cục bộ, chưa có hằng dùng chung). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Là `type` chứ không phải `interface`: `useFormState<T>` buộc
 * `T extends Record<string, unknown>` (xem `DepartmentFormModal`).
 */
type AccountCreateFormValues = {
  email: string;
  fullName: string;
  role: string;
  organizationId: string;
};

interface AccountCreateModalProps {
  open: boolean;
  /** Tổ chức cho ô Select — lấy từ `GET /organizations/options` (`D-20b`). */
  orgOptions: ReadonlyArray<{ value: string; label: string }>;
  /** Đang gửi yêu cầu → nút xác nhận khoá + loading. */
  loading: boolean;
  /**
   * Lỗi từ BE — hiện bằng `Banner` trong modal (khác toast: toast tự biến mất
   * và bị modal che — NFR-REL-001).
   */
  error?: string | null;
  onCancel: () => void;
  /** Nhận payload đã trim — `organization_id` LUÔN có (mọi role đều gắn tổ chức). */
  onConfirm: (payload: AccountCreatePayload) => void;
}

/**
 * Modal **tạo tài khoản** — `POST /api/v1/accounts` (`D-29`).
 *
 * Không có ô username/mật khẩu: BE sinh từ email + gửi mật khẩu tạm qua email
 * (Q-36). Vai trò chỉ nhận các role `CREATE_ROLE_OPTIONS` — **không** có
 * `SUPER_ADMIN` (Q-35). Validate ở FE chỉ để UX; `AccountCreatePayload` của BE
 * mới là chốt cuối.
 */
export default function AccountCreateModal({
  open,
  orgOptions,
  loading,
  error,
  onCancel,
  onConfirm,
}: AccountCreateModalProps) {
  const form = useFormState<AccountCreateFormValues>(
    { email: '', fullName: '', role: '', organizationId: '' },
    {
      email: (value) => {
        if (!value.trim()) return MSG_ACC.EMAIL_REQUIRED;
        return EMAIL_PATTERN.test(value.trim()) ? undefined : MSG_ACC.EMAIL_INVALID;
      },
      fullName: (value) => (value.trim() ? undefined : MSG_ACC.FULL_NAME_REQUIRED),
      role: (value) => (value ? undefined : MSG_ACC.ROLE_REQUIRED),
      organizationId: (value) => (value ? undefined : MSG_ACC.ORG_REQUIRED),
    },
  );
  // `reset` có identity ổn định (useCallback deps rỗng) — tách ra để effect bên
  // dưới không phải phụ thuộc cả object `form` (đổi mỗi render → effect lặp vô hạn).
  const resetForm = form.reset;

  // Xoá form mỗi lần mở (thay `Form.resetFields` + `forceRender`).
  useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.validate()) return;
    onConfirm({
      email: form.values.email.trim(),
      full_name: form.values.fullName.trim(),
      role: form.values.role,
      organization_id: form.values.organizationId,
    });
  };

  return (
    <Dialog
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      // `form`: bấm ra ngoài KHÔNG đóng để không mất dữ liệu đang nhập; ESC vẫn đóng.
      purpose="form"
      width={520}
    >
      <DialogHeader
        title={MSG_ACC.CREATE_TITLE}
        onOpenChange={(next) => {
          if (!next) onCancel();
        }}
      />

      <form noValidate onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-4)' }}>
        <VStack gap={4}>
          {/* Lỗi BE xếp trên form (NFR-REL-001). */}
          {error ? <Banner status="error" title={error} collapsible={false} role="alert" /> : null}

          <Banner status="info" title={MSG_ACC.CREATE_HINT} collapsible={false} />

          <TextInput
            type="email"
            label={MSG_ACC.EMAIL_LABEL}
            value={form.values.email}
            onChange={(value) => form.setValue('email', value)}
            placeholder="ten@example.edu.vn"
            autoComplete="off"
            isDisabled={loading}
            aria-required="true"
            status={
              form.errorOf('email') ? { type: 'error', message: form.errorOf('email') } : undefined
            }
          />

          <TextInput
            label={MSG_ACC.FULL_NAME}
            value={form.values.fullName}
            onChange={(value) => form.setValue('fullName', value)}
            placeholder="Nguyễn Văn A"
            autoComplete="off"
            isDisabled={loading}
            aria-required="true"
            status={
              form.errorOf('fullName')
                ? { type: 'error', message: form.errorOf('fullName') }
                : undefined
            }
          />

          {/* Không có `SUPER_ADMIN` trong danh sách (Q-35). */}
          <Selector
            label={MSG_ACC.ROLE}
            options={[...CREATE_ROLE_OPTIONS]}
            value={form.values.role}
            onChange={(value) => form.setValue('role', value)}
            placeholder={MSG_ACC.ROLE_REQUIRED}
            isDisabled={loading}
            aria-required="true"
            status={
              form.errorOf('role') ? { type: 'error', message: form.errorOf('role') } : undefined
            }
          />

          <Selector
            label={MSG_ACC.ORGANIZATION}
            options={[...orgOptions]}
            value={form.values.organizationId}
            onChange={(value) => form.setValue('organizationId', value)}
            placeholder={MSG_ACC.ORG_REQUIRED}
            hasSearch
            isDisabled={loading}
            aria-required="true"
            status={
              form.errorOf('organizationId')
                ? { type: 'error', message: form.errorOf('organizationId') }
                : undefined
            }
          />

          <HStack justify="end" gap={2}>
            <Button variant="secondary" size="lg" label={MSG_ORG.CANCEL} onClick={onCancel} />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              label={MSG_ACC.CREATE_TITLE}
              isLoading={loading}
              isDisabled={loading}
            />
          </HStack>
        </VStack>
      </form>
    </Dialog>
  );
}
