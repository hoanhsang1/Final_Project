import { Button, Drawer, Flex, Layout, Menu, Space, Tag, Typography, theme } from 'antd';
import type { MenuProps } from 'antd';
import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../../features/auth/authApi';
import { useAuthStore } from '../../stores/authStore';
import { useMediaQuery } from '../AdminConsoleLayout/use-media-query';

const { Header, Content, Sider } = Layout;
const { Text, Title } = Typography;

export default function OrganizationPortalLayout() {
  const { token } = theme.useToken();
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const username = useAuthStore((s) => s.username);
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const clearSession = useAuthStore((s) => s.clearSession);

  const isOwner = backendRoles.includes('OWNER') || backendRoles.includes('ORG_OWNER');
  const isManager = backendRoles.includes('MANAGER');

  const portalMenu = useMemo(() => {
    if (isOwner) {
      return [
        { key: 'phong-ban', label: 'Quản lý Phòng ban & Module', path: '/to-chuc/phong-ban' },
        { key: 'chuc-vu', label: 'Quản lý Chức vụ', path: '/to-chuc/chuc-vu' },
        { key: 'nhan-su', label: 'Bổ nhiệm & Quản lý Nhân sự', path: '/to-chuc/nhan-su' },
      ];
    }

    // Nhân viên (STAFF) và Trưởng phòng (MANAGER)
    const items = [
      { key: 'sinh-vien', label: 'Quản lý Sinh viên', path: '/to-chuc/sinh-vien' },
      { key: 'lop-hoc', label: 'Quản lý Lớp học', path: '/to-chuc/lop-hoc' },
    ];
    if (isManager) {
      items.push({ key: 'nhan-su', label: 'Nhân sự Phòng ban', path: '/to-chuc/nhan-su' });
    }
    return items;
  }, [isOwner, isManager]);

  const activeKey =
    portalMenu.find((m) => location.pathname.startsWith(m.path))?.key ?? portalMenu[0]?.key ?? '';

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // bỏ qua lỗi mạng
    }
    clearSession();
    navigate('/dang-nhap');
  };

  const menuItems: MenuProps['items'] = portalMenu.map((item) => ({
    key: item.key,
    label: (
      <Link to={item.path} onClick={() => setMobileDrawerOpen(false)}>
        {item.label}
      </Link>
    ),
  }));

  const roleLabel = isOwner
    ? 'Chủ tổ chức (OWNER)'
    : isManager
    ? 'Quản lý phòng ban (MANAGER)'
    : 'Nhân viên giáo vụ (STAFF)';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          paddingInline: token.paddingLG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Flex align="center" gap={token.paddingSM}>
          {!isDesktop && (
            <Button
              type="text"
              onClick={() => setMobileDrawerOpen(true)}
              style={{ paddingInline: token.paddingXS }}
            >
              ☰
            </Button>
          )}
          <Title level={4} style={{ margin: 0, color: token.colorPrimary }}>
            MEMS Portal
          </Title>
          <Tag color={isOwner ? 'gold' : isManager ? 'purple' : 'blue'}>{roleLabel}</Tag>
        </Flex>

        <Space size="middle">
          <Text strong>{username}</Text>
          <Button onClick={handleLogout}>Đăng xuất</Button>
        </Space>
      </Header>

      <Layout>
        {isDesktop ? (
          <Sider
            width={260}
            style={{
              background: token.colorBgContainer,
              borderRight: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Menu
              mode="inline"
              selectedKeys={[activeKey]}
              items={menuItems}
              style={{ borderInlineEnd: 'none', height: '100%', paddingTop: token.paddingSM }}
            />
          </Sider>
        ) : (
          <Drawer
            title="Menu tổ chức"
            placement="left"
            width={260}
            onClose={() => setMobileDrawerOpen(false)}
            open={mobileDrawerOpen}
            styles={{ body: { padding: 0 } }}
          >
            <Menu
              mode="inline"
              selectedKeys={[activeKey]}
              items={menuItems}
              style={{ borderInlineEnd: 'none' }}
            />
          </Drawer>
        )}

        <Content
          style={{
            padding: token.paddingLG,
            background: token.colorBgLayout,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
