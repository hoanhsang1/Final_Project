import { Banner, Button, HStack, Text, TextInput, VStack } from '@astryxdesign/core';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { AppLink } from '../../components/AppLink/AppLink';
import { AuthCard } from '../../components/AuthCard/AuthCard';
import { PasswordResetError, requestPasswordReset } from '../../features/auth/authApi';
import { useFormState } from '../../hooks/useFormState';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ForgotPasswordValues = {
  email: string;
};

/**
 * Màn Quên mật khẩu `/quen-mat-khau` — bước 1 của luồng đặt lại.
 *
 * Nguyên tắc chống dò tài khoản: dù email có trong hệ thống hay không, BE trả
 * cùng một kết quả và FE hiện **cùng một thông báo** — người ngoài không dùng
 * màn này để kiểm tra email nào đã đăng ký.
 *
 * Trạng thái: **loading** (nút gửi) · **error** (`Banner` đỏ trong form) ·
 * **success** (`Banner` xanh "Kiểm tra email"). Không có empty/no-permission —
 * màn công khai, không cần dữ liệu để hiển thị.
 *
 * ⚠️ BE chưa có endpoint `D-32` → bấm gửi sẽ ra banner "chức năng chưa sẵn
 * sàng", KHÔNG giả thành công (`NFR-REL-001`).
 */
export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useFormState<ForgotPasswordValues>(
    { email: '' },
    {
      email: (value) => {
        if (!value.trim()) return 'Vui lòng nhập email';
        return EMAIL_PATTERN.test(value.trim()) ? undefined : 'Email không đúng định dạng';
      },
    },
  );

  const mutation = useMutation({
    mutationFn: (email: string) => requestPasswordReset(email),
    onSuccess: (_data, email) => {
      setFormError(null);
      setSentTo(email);
    },
    onError: (error) => {
      // NFR-REL-001: lỗi/timeout thì KHÔNG hiện trạng thái thành công.
      setSentTo(null);
      setFormError(
        error instanceof PasswordResetError
          ? error.message
          : 'Không gửi được yêu cầu. Vui lòng thử lại.',
      );
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.validate()) return;
    mutation.mutate(form.values.email.trim());
  };

  if (sentTo) {
    return (
      <AuthCard
        activeTab="login"
        title="Kiểm tra email của bạn"
        subtitle="Hướng dẫn đặt lại mật khẩu vừa được gửi đi."
      >
        <VStack gap={4}>
          <Banner
            status="success"
            title="Đã gửi yêu cầu đặt lại mật khẩu"
            description={
              <>
                Nếu <Text weight="semibold">{sentTo}</Text> đã đăng ký tài khoản, bạn sẽ nhận được
                email kèm liên kết đặt lại. Liên kết hiệu lực trong 30 phút.
              </>
            }
            collapsible={false}
          />

          <Text type="body" color="secondary" style={{ textAlign: 'center' }}>
            Không thấy email? Kiểm tra hộp thư rác trước khi yêu cầu lại.
          </Text>

          <HStack justify="between" align="center" gap={2} wrap="wrap">
            <AppLink to="/dang-nhap" type="body" weight="medium">
              Về trang đăng nhập
            </AppLink>
            <Button
              type="button"
              variant="ghost"
              label="Dùng email khác"
              onClick={() => {
                setSentTo(null);
                setFormError(null);
                form.reset();
              }}
            />
          </HStack>
        </VStack>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      activeTab="login"
      title="Quên mật khẩu"
      subtitle="Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu."
    >
      <VStack gap={4}>
        <form onSubmit={handleSubmit} noValidate>
          <VStack gap={4}>
            <TextInput
              type="email"
              label="Email"
              value={form.values.email}
              onChange={(value) => form.setValue('email', value)}
              autoComplete="email"
              placeholder="ten@donvi.edu.vn"
              isDisabled={mutation.isPending}
              aria-required="true"
              status={
                form.errorOf('email') ? { type: 'error', message: form.errorOf('email') } : undefined
              }
            />

            {formError && (
              <Banner status="error" title={formError} collapsible={false} role="alert" />
            )}

            <Button
              type="submit"
              variant="primary"
              label="Gửi liên kết đặt lại"
              width="100%"
              isLoading={mutation.isPending}
            />
          </VStack>
        </form>

        <HStack justify="center" gap={1} wrap="wrap">
          <Text type="body" color="secondary">
            Nhớ ra mật khẩu?
          </Text>
          <AppLink to="/dang-nhap" type="body" weight="medium">
            Đăng nhập
          </AppLink>
        </HStack>
      </VStack>
    </AuthCard>
  );
}
