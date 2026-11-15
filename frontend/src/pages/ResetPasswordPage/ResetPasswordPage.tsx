import { Banner, Button, HStack, Text, TextInput, VStack } from '@astryxdesign/core';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLink } from '../../components/AppLink/AppLink';
import { AuthCard } from '../../components/AuthCard/AuthCard';
import { PasswordResetError, resetPassword } from '../../features/auth/authApi';
import { useFormState } from '../../hooks/useFormState';

/** Độ dài tối thiểu của mật khẩu mới — khớp ràng buộc `D-31`/`D-33` (≥ 8). */
const MIN_PASSWORD_LENGTH = 8;
/** BCrypt chỉ dùng 72 byte đầu — chặn ở FE cho khớp BE. */
const MAX_PASSWORD_LENGTH = 72;

type ResetPasswordValues = {
  newPassword: string;
  confirmPassword: string;
};

/**
 * Màn Đặt lại mật khẩu `/dat-lai-mat-khau?token=…` — bước 2 của luồng.
 *
 * Token lấy từ query param vì email gửi ra một **liên kết** — dán link vào
 * trình duyệt hoặc F5 vẫn dùng được. Không có token → màn nhắc xin liên kết mới
 * thay vì hiện form vô nghĩa.
 *
 * Trạng thái: **loading** · **error** (`Banner` đỏ, kèm lối xin liên kết mới
 * khi token hết hạn) · **success** (`Banner` xanh) · nhánh thiếu token.
 * No-permission không áp dụng — màn công khai.
 *
 * ⚠️ BE chưa có endpoint `D-33` → 404 → hiện "chức năng chưa sẵn sàng",
 * KHÔNG giả thành công (`NFR-REL-001`).
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<PasswordResetError | null>(null);

  const resetToken = (searchParams.get('token') ?? '').trim();

  const form = useFormState<ResetPasswordValues>(
    { newPassword: '', confirmPassword: '' },
    {
      newPassword: (value) => {
        if (!value) return 'Vui lòng nhập mật khẩu mới';
        if (value.length < MIN_PASSWORD_LENGTH) {
          return `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự`;
        }
        if (value.length > MAX_PASSWORD_LENGTH) {
          return `Mật khẩu không được vượt quá ${MAX_PASSWORD_LENGTH} ký tự`;
        }
        return undefined;
      },
      confirmPassword: (value, values) => {
        if (!value) return 'Vui lòng nhập lại mật khẩu';
        return value === values.newPassword ? undefined : 'Mật khẩu nhập lại không khớp';
      },
    },
  );

  const mutation = useMutation({
    mutationFn: (newPassword: string) => resetPassword(resetToken, newPassword),
    onSuccess: () => {
      setFormError(null);
      setDone(true);
    },
    onError: (error) => {
      setDone(false);
      setFormError(
        error instanceof PasswordResetError
          ? error
          : new PasswordResetError('unknown', 'Không đặt lại được mật khẩu. Vui lòng thử lại.'),
      );
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.validate()) return;
    mutation.mutate(form.values.newPassword);
  };

  if (!resetToken) {
    return (
      <AuthCard
        activeTab="login"
        title="Đặt lại mật khẩu"
        subtitle="Cần liên kết trong email để tiếp tục."
      >
        <VStack gap={4}>
          <Banner
            status="warning"
            title="Thiếu liên kết đặt lại mật khẩu"
            description="Liên kết trong email có thể đã bị cắt khi sao chép, hoặc bạn mở sai địa chỉ."
            collapsible={false}
          />
          <AppLink to="/quen-mat-khau" type="body" weight="medium">
            Yêu cầu liên kết mới
          </AppLink>
        </VStack>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard
        activeTab="login"
        title="Đặt lại mật khẩu thành công"
        subtitle="Mật khẩu mới đã được lưu."
      >
        <VStack gap={4}>
          <Banner
            status="success"
            title="Bạn có thể đăng nhập bằng mật khẩu mới"
            description="Vì lý do an toàn, các phiên đăng nhập cũ trên thiết bị khác sẽ hết hiệu lực."
            collapsible={false}
          />
          <AppLink to="/dang-nhap" type="body" weight="medium">
            Về trang đăng nhập
          </AppLink>
        </VStack>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      activeTab="login"
      title="Đặt mật khẩu mới"
      subtitle="Mật khẩu cần ít nhất 8 ký tự. Không dùng lại mật khẩu cũ."
    >
      <VStack gap={4}>
        <form onSubmit={handleSubmit} noValidate>
          <VStack gap={4}>
            <TextInput
              type="password"
              label="Mật khẩu mới"
              value={form.values.newPassword}
              onChange={(value) => form.setValue('newPassword', value)}
              autoComplete="new-password"
              placeholder="Nhập mật khẩu mới"
              isDisabled={mutation.isPending}
              aria-required="true"
              status={
                form.errorOf('newPassword')
                  ? { type: 'error', message: form.errorOf('newPassword') }
                  : undefined
              }
            />

            <TextInput
              type="password"
              label="Nhập lại mật khẩu"
              value={form.values.confirmPassword}
              onChange={(value) => form.setValue('confirmPassword', value)}
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu mới"
              isDisabled={mutation.isPending}
              aria-required="true"
              status={
                form.errorOf('confirmPassword')
                  ? { type: 'error', message: form.errorOf('confirmPassword') }
                  : undefined
              }
            />

            {formError && (
              <Banner
                status="error"
                title={formError.message}
                collapsible={false}
                role="alert"
              />
            )}

            {formError?.kind === 'expired' && (
              <HStack justify="center">
                <AppLink to="/quen-mat-khau" type="body" weight="medium">
                  Yêu cầu liên kết mới
                </AppLink>
              </HStack>
            )}

            <Button
              type="submit"
              variant="primary"
              label="Lưu mật khẩu mới"
              width="100%"
              isLoading={mutation.isPending}
            />
          </VStack>
        </form>

        <HStack justify="center" gap={1} wrap="wrap">
          <Text type="body" color="secondary">
            Không muốn đổi?
          </Text>
          <AppLink to="/dang-nhap" type="body" weight="medium">
            Về trang đăng nhập
          </AppLink>
        </HStack>
      </VStack>
    </AuthCard>
  );
}
