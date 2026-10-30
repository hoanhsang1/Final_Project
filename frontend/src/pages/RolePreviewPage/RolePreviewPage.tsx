import { Button, Card, Flex, Result, Space, Tag, theme, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { logout } from '../../features/auth/authApi';
import { findRole } from '../../features/auth/roles';
import { useAuthStore } from '../../stores/authStore';
import { cardStyle, layoutBackground } from '../../theme';

const { Text, Title } = Typography;

export default function RolePreviewPage() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const { vaiTro } = useParams();

  const role = findRole(vaiTro);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const username = useAuthStore((s) => s.username);
  const clearSession = useAuthStore((s) => s.clearSession);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Bỏ qua lỗi mạng
    }
    clearSession();
    navigate('/dang-nhap');
  };

  const backButton = (
    <Button onClick={() => navigate('/dang-nhap')}>
      Quay lại đăng nhập
    </Button>
  );

  return (
    <Flex
      align="center"
      justify="center"
      style={{ minHeight: '100vh', background: layoutBackground, padding: token.paddingLG }}
    >
      <Card style={cardStyle} styles={{ body: { padding: token.paddingLG } }}>
        {role ? (
          <Flex vertical align="center" gap={token.marginXS}>
            {isAuthenticated ? (
              <Tag color="success">Đã đăng nhập</Tag>
            ) : (
              <Tag color="processing">Chế độ xem thử — chưa đăng nhập</Tag>
            )}

            <Text type="secondary">{isAuthenticated ? 'Xin chào' : 'Bạn đang là'}</Text>
            <Title level={1} style={{ margin: 0 }}>
              {isAuthenticated ? (username ?? role.label) : role.label}
            </Title>
            <Text type="secondary" style={{ textAlign: 'center' }}>
              {isAuthenticated ? `Vai trò: ${role.label} — ${role.description}` : role.description}
            </Text>

            <Space style={{ marginTop: token.margin }} wrap>
              {(role.id === 'org-owner' || role.id === 'academic-staff') && (
                <Button type="primary" onClick={() => navigate('/to-chuc/sinh-vien')}>
                  Vào Cổng Quản lý Sinh viên & Lớp học
                </Button>
              )}
              {isAuthenticated && <Button onClick={handleLogout}>Đăng xuất</Button>}
              {backButton}
            </Space>
          </Flex>
        ) : (
          <Result
            status="404"
            title="Không có vai trò này"
            subTitle="Đường dẫn xem thử không đúng. Hãy quay lại trang đăng nhập."
            extra={backButton}
          />
        )}
      </Card>
    </Flex>
  );
}
