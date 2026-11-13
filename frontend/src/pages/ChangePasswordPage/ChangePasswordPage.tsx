import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthCard } from '../../components/AuthCard/AuthCard';
import { changePassword } from '../../features/auth/authApi';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;

/** Khớp ràng buộc `ChangePasswordRequest` của IdentityService (12–72 ký tự). */
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 72;

interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Màn Đổi mật khẩu `/doi-mat-khau`.
 *
 * Bắt buộc với tài khoản vừa được cấp mật khẩu tạm: JWT mang claim
 * `mustChangePassword = true`, các service nghiệp vụ trả 403
 * `PASSWORD_CHANGE_REQUIRED` cho tới khi đổi.
 *
 * BE thu hồi refresh token sau khi đổi → đăng xuất và bắt đăng nhập lại bằng
 * mật khẩu mới (access token cũ vẫn mang claim `mustChangePassword`).
 */
export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (values: ChangePasswordValues) =>
      changePassword(values.currentPassword, values.newPassword),
    onSuccess: () => {
      clearSession();
      navigate('/dang-nhap', {
        replace: true,
        state: { notice: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.' },
      });
    },
    onError: (error: Error) => {
      setFormError(error.message);
    },
  });

  if (!isAuthenticated) {
    return <Navigate to="/dang-nhap" replace />;
  }

  return (
    <AuthCard
      activeTab="login"
      title="Đổi mật khẩu"
      subtitle={
        mustChangePassword
          ? 'Tài khoản đang dùng mật khẩu tạm. Đổi mật khẩu để tiếp tục sử dụng hệ thống.'
          : 'Cập nhật mật khẩu đăng nhập của bạn.'
      }
    >
      {mustChangePassword && (
        <Alert
          type="warning"
          showIcon
          role="status"
          message="Bạn phải đổi mật khẩu tạm trước khi thao tác nghiệp vụ."
          style={{ marginBottom: 16 }}
        />
      )}

      {formError && (
        <Alert type="error" showIcon role="alert" message={formError} style={{ marginBottom: 16 }} />
      )}

      <Form<ChangePasswordValues>
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => {
          setFormError(null);
          mutation.mutate(values);
        }}
      >
        <Form.Item
          label="Mật khẩu hiện tại"
          name="currentPassword"
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>

        <Form.Item
          label="Mật khẩu mới"
          name="newPassword"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu mới' },
            {
              min: MIN_PASSWORD_LENGTH,
              message: `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự`,
            },
            {
              max: MAX_PASSWORD_LENGTH,
              message: `Mật khẩu không được vượt quá ${MAX_PASSWORD_LENGTH} ký tự`,
            },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>

        <Form.Item
          label="Nhập lại mật khẩu mới"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Vui lòng nhập lại mật khẩu mới' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Mật khẩu nhập lại không khớp'));
              },
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>

        <Button type="primary" htmlType="submit" block loading={mutation.isPending}>
          Đổi mật khẩu
        </Button>
      </Form>

      <Text style={{ display: 'block', marginTop: 16, textAlign: 'center' }}>
        <Link to="/dang-nhap">Quay lại đăng nhập</Link>
      </Text>
    </AuthCard>
  );
}
