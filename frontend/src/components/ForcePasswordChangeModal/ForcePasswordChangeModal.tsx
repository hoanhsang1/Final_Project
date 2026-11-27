import {
  Banner,
  Button,
  Dialog,
  DialogHeader,
  HStack,
  Text,
  TextInput,
  VStack,
} from '@astryxdesign/core';
import { useMutation } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../../features/auth/authApi';
import { ApiError } from '../../features/platform/errorCodes';
import { useFormState } from '../../hooks/useFormState';
import { useNotify } from '../../hooks/useNotify';
import { useAuthStore } from '../../stores/authStore';
import { validateNewPassword } from '../AccountResetPasswordModal/AccountResetPasswordModal';

/** Câu chữ riêng của luồng bắt đổi mật khẩu tạm (không lộ message kỹ thuật BE). */
const COPY = {
  TITLE: 'Đổi mật khẩu tạm',
  DESCRIPTION: 'Bạn đang dùng mật khẩu tạm. Vui lòng đặt mật khẩu mới trước khi tiếp tục.',
  CURRENT_LABEL: 'Mật khẩu hiện tại',
  CURRENT_REQUIRED: 'Vui lòng nhập mật khẩu hiện tại',
  NEW_LABEL: 'Mật khẩu mới',
  SUBMIT: 'Đổi mật khẩu',
  SUCCESS: 'Đã đổi mật khẩu. Vui lòng đăng nhập lại bằng mật khẩu mới.',
  FAILED: 'Không đổi được mật khẩu, vui lòng thử lại.',
  RATE_LIMITED: 'Bạn đã yêu cầu quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.',
  STILL_REQUIRED: 'Vui lòng đổi mật khẩu tạm trước khi tiếp tục.',
} as const;

type ForceChangeFormValues = {
  currentPassword: string;
  newPassword: string;
};

interface ForcePasswordChangeModalProps {
  /** Luôn `true` khi mount — component chỉ tồn tại khi cờ `mustChangePassword` bật. */
  open?: boolean;
}

/**
 * Modal **bắt đổi mật khẩu** dùng chung cho mọi màn (LoginPage, SessionWatcher).
 *
 * - `Dialog purpose="form"` + `onOpenChange` no-op + `DialogHeader` KHÔNG có
 *   `onOpenChange` ⇒ không nút đóng, ESC/bấm nền cũng không đóng được — người
 *   dùng không thể thoát khi chưa đổi xong mật khẩu tạm. (`purpose="required"`
 *   của Astryx đổi role sang `alertdialog`; ở đây giữ role `dialog` chuẩn cho
 *   assistive tech/test.)
 * - Gọi `POST /api/v1/auth/change-password` với `{ currentPassword, newPassword }`.
 * - 204 → xoá phiên local + đưa về `/dang-nhap` để đăng nhập lại bằng mật khẩu mới.
 * - 403 `PASSWORD_CHANGE_REQUIRED` → giữ nguyên cờ, không điều hướng.
 * - `ApiError` (kể cả 429) được giữ `code`/`status` để phân nhánh không cần parse message.
 */
export default function ForcePasswordChangeModal({ open = true }: ForcePasswordChangeModalProps) {
  const navigate = useNavigate();
  const notify = useNotify();
  const clearSession = useAuthStore((s) => s.clearSession);
  // Lỗi từ BE hiện bằng Banner (NFR-REL-001: không bao giờ hiện thành công).
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useFormState<ForceChangeFormValues>(
    { currentPassword: '', newPassword: '' },
    {
      currentPassword: (value) => (value.trim() ? undefined : COPY.CURRENT_REQUIRED),
      newPassword: (value) => validateNewPassword(value),
    },
  );

  const changeMutation = useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => changePassword(currentPassword, newPassword),
    onSuccess: () => {
      notify.success(COPY.SUCCESS);
      // Token cũ vẫn mang claim `mustChangePassword` → phải xoá session, bắt đăng nhập lại.
      clearSession();
      navigate('/dang-nhap', { replace: true });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 429) {
        setErrorMessage(COPY.RATE_LIMITED);
      } else if (error instanceof ApiError && error.code === 'PASSWORD_CHANGE_REQUIRED') {
        setErrorMessage(COPY.STILL_REQUIRED);
      } else {
        setErrorMessage(error instanceof Error ? error.message : COPY.FAILED);
      }
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    if (!form.validate()) return;
    changeMutation.mutate({
      currentPassword: form.values.currentPassword,
      newPassword: form.values.newPassword.trim(),
    });
  };

  return (
    <Dialog isOpen={open} onOpenChange={() => undefined} purpose="form" width={520}>
      {/* Header không có onOpenChange ⇒ không nút đóng; onOpenChange no-op ⇒ ESC/bấm nền không thoát. */}
      <DialogHeader title={COPY.TITLE} />

      <form noValidate onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-4)' }}>
        <VStack gap={4}>
          <Text type="body">{COPY.DESCRIPTION}</Text>

          {errorMessage ? (
            <Banner status="error" title={errorMessage} collapsible={false} role="alert" />
          ) : null}

          <TextInput
            type="password"
            label={COPY.CURRENT_LABEL}
            value={form.values.currentPassword}
            onChange={(value) => form.setValue('currentPassword', value)}
            autoComplete="current-password"
            isDisabled={changeMutation.isPending}
            aria-required="true"
            status={
              form.errorOf('currentPassword')
                ? { type: 'error', message: form.errorOf('currentPassword') }
                : undefined
            }
          />

          <TextInput
            type="password"
            label={COPY.NEW_LABEL}
            value={form.values.newPassword}
            onChange={(value) => form.setValue('newPassword', value)}
            autoComplete="new-password"
            isDisabled={changeMutation.isPending}
            aria-required="true"
            status={
              form.errorOf('newPassword')
                ? { type: 'error', message: form.errorOf('newPassword') }
                : undefined
            }
          />

          <HStack justify="end">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              label={COPY.SUBMIT}
              isLoading={changeMutation.isPending}
              isDisabled={changeMutation.isPending}
            />
          </HStack>
        </VStack>
      </form>
    </Dialog>
  );
}
