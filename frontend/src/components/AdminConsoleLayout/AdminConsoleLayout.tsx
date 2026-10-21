import { Button, Layout, Menu, Space, Typography, theme } from 'antd';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../../features/auth/authApi';
import { MSG_ADM, MSG_ORG } from '../../features/admin/adminMessages';
import { useAuthStore } from '../../stores/authStore';

const { Header, Content } = Layout;
const { Text, Title } = Typography;

/**
 * Khung console quản trị — `UC-ADMIN-01`.
 *
 * Sprint 2 mới có MỘT mục menu ("Tổ chức chờ duyệt") nên menu đặt ngang: không
 * cần sider, không có chi phí ẩn/hiện ở màn hình 320px (`TC-ADM-10`).
 */
export default function AdminConsoleLayout() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const username = useAuthStore((s) => s.username);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isOnOrgList = location.pathname.startsWith('/quan-tri/to-chuc');

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // `D-13`: gọi API logout thật để BE thu hồi refresh token.
      await logout();
    } catch {
      // Lỗi logout KHÔNG được chặn người dùng thoát phiên (`TC-ADM-09`).
    } finally {
      clearSession();
      setIsLoggingOut(false);
      navigate('/dang-nhap', { replace: true });
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: token.marginSM,
          height: 'auto',
          paddingBlock: token.paddingSM,
          paddingInline: token.paddingLG,
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          {MSG_ADM.TITLE}
        </Title>
        <Space size={token.marginSM}>
          {username && <Text>{username}</Text>}
          <Button onClick={handleLogout} loading={isLoggingOut}>
            {MSG_ADM.LOGOUT}
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: token.paddingLG }}>
        <nav aria-label={MSG_ADM.TITLE}>
          <Menu
            mode="horizontal"
            selectedKeys={isOnOrgList ? ['to-chuc'] : []}
            items={[
              {
                key: 'to-chuc',
                label: (
                  <Link
                    to="/quan-tri/to-chuc"
                    aria-current={isOnOrgList ? 'page' : undefined}
                  >
                    {MSG_ORG.MENU}
                  </Link>
                ),
              },
            ]}
          />
        </nav>

        <div style={{ marginTop: token.marginLG }}>
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
}
