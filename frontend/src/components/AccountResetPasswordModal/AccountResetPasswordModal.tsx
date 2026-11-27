import {
  Banner,
  Button,
  Dialog,
  DialogHeader,
  HStack,
  RadioList,
  RadioListItem,
  TextInput,
  VStack,
} from '@astryxdesign/core';
import type { FormEvent } from 'react';
import { useEffect } from 'react';
import { MSG_ACC, MSG_ORG } from '../../features/admin/adminMessages';
import { useFormState } from '../../hooks/useFormState';

/** Chế độ đặt lại mật khẩu (`D-31`). */
export type PasswordResetMode = 'email' | 'manual';

/** Độ dài mật khẩu tối thiểu — khớp validate của BE (`D-31`). */
export const MIN_PASSWORD_LENGTH = 12;
/** Số byte UTF-8 tối đa — BCrypt chỉ hash được 72 byte đầu. */
export const MAX_PASSWORD_BYTES = 72;

/**
 * Validate chính sách mật khẩu dùng chung cho đặt lại (admin) và đổi mật khẩu
 * cưỡng chế (người dùng). Trả `undefined` khi hợp lệ, ngược lại trả câu chữ
 * tiếng Việt để đưa thẳng vào `status` của `TextInput`.
 */
export function validateNewPassword(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return MSG_ACC.PASSWORD_REQUIRED;
  if (trimmed.length < MIN_PASSWORD_LENGTH) return MSG_ACC.PASSWORD_TOO_SHORT;
  if (new TextEncoder().encode(trimmed).length > MAX_PASSWORD_BYTES) {
    return MSG_ACC.PASSWORD_TOO_LONG;
  }
  return undefined;
}

interface AccountResetPasswordModalProps {
  open: boolean;
  /** Tên đăng nhập — hiện trong nội dung modal. */
  username: string;
  loading: boolean;
  /** Lỗi từ BE — hiển thị bằng `Banner` trong modal (NFR-REL-001). */
  error?: string | null;
  onCancel: () => void;
  /**
   * `mode = 'email'` → không truyền mật khẩu (BE sinh tạm + gửi email);
   * `mode = 'manual'` → truyền mật khẩu đã trim (≥ 12 ký tự, ≤ 72 byte).
   */
  onConfirm: (mode: PasswordResetMode, newPassword?: string) => void;
}

/**
 * Là `type` chứ không phải `interface`: `useFormState<T>` buộc
 * `T extends Record<string, unknown>` (xem `DepartmentFormModal`).
 *
 * Tên field RIÊNG — không trùng các field của modal trạng thái / vai trò.
 */
type AccountResetFormValues = {
  resetMode: PasswordResetMode;
  newPassword: string;
};

/**
 * Modal **đặt lại mật khẩu** — `POST /accounts/{id}/reset-password` (`D-31`).
 *
 * Hai chế độ (Q-37):
 * - **Gửi mật khẩu tạm qua email** (mặc định) — admin không thấy/đặt được mật
 *   khẩu người khác; cần mail service (`D-27`) chạy thật thì luồng mới trọn.
 * - **Đặt mật khẩu mới thủ công** — cho trường hợp người dùng không nhận được
 *   email; FE validate ≥ 12 ký tự / ≤ 72 byte, BE validate lại là chốt.
 */
export default function AccountResetPasswordModal({
  open,
  username,
  loading,
  error,
  onCancel,
  onConfirm,
}: AccountResetPasswordModalProps) {
  const form = useFormState<AccountResetFormValues>(
    { resetMode: 'email', newPassword: '' },
    {
      // Ô mật khẩu chỉ bắt buộc ở chế độ thủ công — đọc `resetMode` từ `values`
      // (validator của `useFormState` nhận cả `values`).
      newPassword: (value, values) => {
        if (values.resetMode !== 'manual') return undefined;
        return validateNewPassword(value);
      },
    },
  );
  // `reset` có identity ổn định (useCallback deps rỗng) — tách ra để effect bên
  // dưới không phải phụ thuộc cả object `form` (đổi mỗi render → effect lặp vô hạn).
  const resetForm = form.reset;

  // Về mặc định "gửi email" mỗi lần mở (thay `Form.resetFields` + `initialValues`).
  useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.validate()) return;
    const mode = form.values.resetMode;
    onConfirm(mode, mode === 'manual' ? form.values.newPassword.trim() : undefined);
  };

  return (
    <Dialog
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      // `form`: bấm ra ngoài KHÔNG đóng để không mất mật khẩu đang nhập; ESC vẫn đóng.
      purpose="form"
      width={520}
    >
      <DialogHeader
        title={`${MSG_ACC.RESET_TITLE}: ${username}`}
        onOpenChange={(next) => {
          if (!next) onCancel();
        }}
      />

      <form noValidate onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-4)' }}>
        <VStack gap={4}>
          {error ? <Banner status="error" title={error} collapsible={false} role="alert" /> : null}

          <Banner status="info" title={MSG_ACC.RESET_HINT_EMAIL} collapsible={false} />

          <RadioList
            label="Cách đặt lại"
            value={form.values.resetMode}
            onChange={(value) => form.setValue('resetMode', value as PasswordResetMode)}
            isDisabled={loading}
          >
            <RadioListItem label={MSG_ACC.RESET_SEND_EMAIL} value="email" />
            <RadioListItem label={MSG_ACC.RESET_MANUAL} value="manual" />
          </RadioList>

          {/* Chỉ hiện ô mật khẩu khi chọn chế độ thủ công — validate 12..72 byte. */}
          {form.values.resetMode === 'manual' ? (
            <TextInput
              type="password"
              label={MSG_ACC.PASSWORD_LABEL}
              value={form.values.newPassword}
              onChange={(value) => form.setValue('newPassword', value)}
              autoComplete="new-password"
              isDisabled={loading}
              aria-required="true"
              status={
                form.errorOf('newPassword')
                  ? { type: 'error', message: form.errorOf('newPassword') }
                  : undefined
              }
            />
          ) : null}

          <HStack justify="end" gap={2}>
            <Button variant="secondary" size="lg" label={MSG_ORG.CANCEL} onClick={onCancel} />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              label={MSG_ACC.RESET_TITLE}
              isLoading={loading}
              isDisabled={loading}
            />
          </HStack>
        </VStack>
      </form>
    </Dialog>
  );
}
