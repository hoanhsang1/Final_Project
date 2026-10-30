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
      const state = useAuthStore.getState();
      // `SUPER_ADMIN` đã có màn riêng (console quản trị Sprint 2) → vào thẳng.
      // Kiểm tra `backendRoles` (role gốc từ JWT) vì `role` chỉ chứa MỘT slug.
      if (state.backendRoles.includes('SUPER_ADMIN')) {
        navigate('/quan-tri');
        return;
      }

      // Chủ tổ chức (OWNER / ORG_OWNER) quản trị cơ cấu: Phòng ban, Chức vụ & Nhân sự
      if (
        state.backendRoles.includes('OWNER') ||
        state.backendRoles.includes('ORG_OWNER')
      ) {
        navigate('/to-chuc/phong-ban');
        return;
      }

      // Cán bộ tác nghiệp (MANAGER / STAFF) quản lý Sinh viên & Lớp học
      if (
        state.backendRoles.includes('MANAGER') ||
        state.backendRoles.includes('STAFF')
      ) {
        navigate('/to-chuc/sinh-vien');
        return;
      }

      const role = state.role;
      if (role) {
        navigate(rolePreviewPath(role));
      } else {
        // Đăng nhập được nhưng vai trò chưa có màn hình ở giai đoạn này.
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
          <Link to="/quen-mat-khau">Quên mật khẩu?</Link>
        </Flex>

        {formError && (
          <Alert
            type="error"
            showIcon
            message={formError}
            style={{ marginBottom: token.margin }}
          />
        )}

        {notice && (
          <Alert
            type="info"
            showIcon
            message={notice}
            style={{ marginBottom: token.margin }}
          />
        )}

        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={loginMutation.isPending}
          style={{ marginBottom: token.margin }}
        >
          Đăng nhập
        </Button>

        <Flex justify="center" align="center" gap={token.marginXXS}>
          <Text type="secondary">Chưa có tổ chức?</Text>
          <Link to="/dang-ky">Đăng ký tổ chức</Link>
        </Flex>
      </Form>

      <Divider plain style={{ marginBlock: token.margin }}>
        <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
          Hoặc xem thử theo vai trò
        </Text>
      </Divider>

      <Flex vertical gap={token.marginXS}>
        {ROLES.map((role) => (
          <RoleButton key={role.id} role={role} onSelect={handleSelectRole} />
        ))}
      </Flex>
    </AuthCard>
  );
}
