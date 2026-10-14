import { Button, Checkbox, Divider, Flex, Form, Input, Typography, theme } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { AuthCard } from '../../components/AuthCard/AuthCard';
import { RoleButton } from '../../components/RoleButton/RoleButton';
import { ROLES, rolePreviewPath } from '../../features/auth/roles';
import type { Role } from '../../features/auth/roles';

const { Text } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
  remember?: boolean;
}

export default function LoginPage() {
  const { token } = theme.useToken();
  const navigate = useNavigate();

  const handleSubmit = (_values: LoginFormValues) => {
    // TODO(Sprint 2): gọi API đăng nhập khi Sang chốt contract.
    // Chưa nối backend theo yêu cầu Sprint 1 — chỉ dựng giao diện để chốt design.
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

        <Form.Item style={{ marginBottom: token.margin }}>
          <Button type="primary" htmlType="submit" block>
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
