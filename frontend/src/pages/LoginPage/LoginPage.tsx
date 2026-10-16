import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Checkbox, Divider, Flex, Form, Input, Typography, theme } from 'antd';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthCard } from '../../components/AuthCard/AuthCard';
import { RoleButton } from '../../components/RoleButton/RoleButton';
import { login } from '../../features/auth/authApi';
import { ROLES, rolePreviewPath } from '../../features/auth/roles';
import type { Role } from '../../features/auth/roles';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
  remember?: boolean;
}

export default function LoginPage() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  /** Lỗi từ backend / lỗi mạng, hiển thị inline trong form. */
  const [formError, setFormError] = useState<string | null>(null);
  /** Thông báo khi đăng nhập OK nhưng vai trò chưa có trang tương ứng. */
  const [notice, setNotice] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (res) => {
      setFormError(null);
      setSession(res);

      // Đọc role MỚI NHẤT từ store (setSession đã cập nhật xong).
      const role = useAuthStore.getState().role;
      if (role) {
        navigate(rolePreviewPath(role));
      } else {
        // Đăng nhập được nhưng vai trò chưa có màn hình ở Sprint này.
        setNotice(
          'Đăng nhập thành công, nhưng vai trò của bạn chưa có màn hình ở giai đoạn này. Vui lòng thử lại sau.',
        );
      }
    },
    onError: (error: Error) => {
      // NFR-REL-001: lỗi thì hiển thị rõ, KHÔNG điều hướng, KHÔNG hiện thành công.
      setFormError(error.message);
    },
  });

  const handleSubmit = (values: LoginFormValues) => {
    setNotice(null);
    // Backend không có trường "remember" — chỉ gửi 2 field contract yêu cầu.
    loginMutation.mutate({ username: values.username, password: values.password });
  };

  const handleSelectRole = (role: Role) => {
    navigate(rolePreviewPath(role.id));
  };

  return (
    <AuthCard
      activeTab="login"
      title="Đăng nhập để tiếp tục"
      subtitle="Dùng tài khoản đã được cấp bởi tổ chức của bạn"
    >
      <Form<LoginFormValues> layout="vertical" requiredMark={false} onFinish={handleSubmit}>
        <Form.Item
          label="Tên đăng nhập"
          name="username"
          rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
        >
          <Input autoComplete="username" placeholder="Ví dụ: nghia.ledai" />
        </Form.Item>

        <Form.Item
          label="Mật khẩu"
          name="password"
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
        >
          <Input.Password autoComplete="current-password" placeholder="Nhập mật khẩu" />
        </Form.Item>

        <Flex justify="space-between" align="center" style={{ marginBottom: token.margin }}>
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Checkbox>Ghi nhớ đăng nhập</Checkbox>
          </Form.Item>
          <Button type="link" htmlType="button" style={{ padding: 0 }}>
            {/* TODO(Sprint sau): trang quên mật khẩu chưa có. */}
            Quên mật khẩu?
          </Button>
        </Flex>

        {formError && (
          <Alert
            type="error"
            showIcon
            message={formError}
            style={{ marginBottom: token.margin }}
            role="alert"
          />
        )}
        {notice && (
          <Alert
            type="warning"
            showIcon
            message={notice}
            style={{ marginBottom: token.margin }}
            role="status"
          />
        )}

        <Form.Item style={{ marginBottom: token.margin }}>
          <Button type="primary" htmlType="submit" block loading={loginMutation.isPending}>
            Đăng nhập
          </Button>
        </Form.Item>
      </Form>

      <Divider plain>hoặc xem thử theo vai trò</Divider>

      <Flex vertical gap={token.marginXS}>
        {ROLES.map((role) => (
          <RoleButton key={role.id} role={role} onSelect={handleSelectRole} />
        ))}
      </Flex>

      <Flex justify="center" gap={token.marginXXS} style={{ marginTop: token.marginLG }}>
        <Text type="secondary">Chưa có tổ chức?</Text>
        <Link to="/dang-ky">Đăng ký tổ chức</Link>
      </Flex>
    </AuthCard>
  );
}
