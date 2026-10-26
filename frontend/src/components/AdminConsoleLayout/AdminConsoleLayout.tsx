import { Button, Drawer, Layout, Space, Typography, theme } from 'antd';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import ConsoleMenu from '../ConsoleMenu/ConsoleMenu';
import { MSG_ADM } from '../../features/admin/adminMessages';
import { activeMenuKey } from '../../features/admin/consoleMenu';
import { logout } from '../../features/auth/authApi';
import { useAuthStore } from '../../stores/authStore';
import { useMediaQuery } from './use-media-query';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

/** `id` của vùng nội dung chính — đích nhảy của skip link (WCAG 2.4.1). */
const MAIN_CONTENT_ID = 'noi-dung-chinh';

/** Ẩn phần tử nhưng vẫn cho trình duyệt nhảy đến khi bấm skip link. */
const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * Skip link: chỉ hiện khi nhận focus bằng bàn phím (`WCAG 2.4.1`).
 *
 * Toàn bộ chrome console (hamburger + menu + nút đăng xuất) nằm phía trước
 * nội dung → bàn phím phải Tab qua tất cả mới tới nội dung trang. Dùng
 * `position: fixed` để link vẫn thấy được khi trang đã cuộn.
 */
function SkipLink() {
  const { token } = theme.useToken();
  const [isFocused, setIsFocused] = useState(false);

  const visibleStyle: CSSProperties = {
    position: 'fixed',
    zIndex: 1000,
    insetInlineStart: token.padding,
    insetBlockStart: token.padding,
    paddingBlock: token.paddingXS,
    paddingInline: token.paddingSM,
    background: token.colorBgContainer,
    color: token.colorPrimary,
    borderWidth: token.lineWidth,
    borderStyle: 'solid',
    borderColor: token.colorPrimary,
    borderRadius: token.borderRadius,
    boxShadow: token.boxShadow,
    fontWeight: token.fontWeightStrong,
    textDecoration: 'none',
  };

  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      style={isFocused ? visibleStyle : visuallyHidden}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      Tới nội dung chính
    </a>
  );
}

/** Độ rộng của `Sider` trên desktop — khớp breakpoint `lg` (1024px) của antd. */
const SIDEBAR_WIDTH = 240;
/** Chiều rộng `Drawer` trên mobile. */
const DRAWER_WIDTH = 280;

/**
 * Icon "hamburger" — vẽ bằng SVG thuần.
 *
 * Không import `@ant-design/icons`: package đó KHÔNG có trong `package.json`
 * (chỉ là dependency gián tiếp của antd) → thêm icon từ đó là thêm dependency
 * không khai báo. SVG 3 nét này không tốn thêm gì và antd chỉ cần một ReactNode.
 */
const hamburgerIcon: CSSProperties = {
  display: 'block',
  // Kích thước khớp `font-size` mặc định của nút antd để icon thẳng hàng với chữ.
  fontSize: 16,
};

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      style={hamburgerIcon}
    >
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  );
}

/**
 * Khung console quản trị — `UC-ADMIN-01`.
 *
 * Đặc tả "Sprint 2 — Mở rộng console" §5.2 (`Q-28` = A):
 * - **≥1024px**: `Sider` cố định bên trái, nội dung ở giữa/phải.
 * - **<1024px**: `Sider` bị ẩn (`collapsedWidth={0}`), hiện nút hamburger mở `Drawer`.
 *
 * Menu dựng từ `CONSOLE_MENU` — cùng 1 nguồn cho cả Sider và Drawer nên không
 * bao giờ lệch nhau. Menu cũ từng đặt ngang khi chỉ có 1 mục; lên 6 mục thì menu
 * ngang bị antd gộp hết vào "⋯" ở 320px.
 */
export default function AdminConsoleLayout() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const username = useAuthStore((s) => s.username);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Phải khớp breakpoint `lg` của antd — nếu lệch thì Sider ẩn mà nút hamburger
  // vẫn hiện (hoặc ngược lại) ở đúng mốc 1024px.
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const selectedKey = activeMenuKey(location.pathname, location.search);

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
      setIsDrawerOpen(false);
      navigate('/dang-nhap', { replace: true });
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <SkipLink />
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: token.marginSM,
          height: 'auto',
          paddingBlock: token.paddingSM,
          paddingInline: token.padding,
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Space size={token.marginSM}>
          {/* Chỉ hiện ở <1024px — antd tự ẩn Sider ở đúng mốc đó. */}
          {!isDesktop && (
            <Button
              type="text"
              icon={<MenuIcon />}
              aria-label={MSG_ADM.OPEN_MENU}
              aria-expanded={isDrawerOpen}
              onClick={() => setIsDrawerOpen(true)}
            />
          )}
          {/* Không dùng `Title`: đây là tên hệ thống, không phải tiêu đề trang —
              nếu là heading thì trang sẽ có `<h1>` giả trước `<h1>` thật. */}
          <Text strong style={{ fontSize: token.fontSizeLG }}>
            {MSG_ADM.TITLE}
          </Text>
        </Space>

        <Space size={token.marginSM}>
          {username && <Text>{username}</Text>}
          <Button onClick={handleLogout} loading={isLoggingOut}>
            {MSG_ADM.LOGOUT}
          </Button>
        </Space>
      </Header>

      <Layout>
        <Sider
          width={SIDEBAR_WIDTH}
          breakpoint="lg"
          collapsedWidth={0}
          trigger={null}
          style={{
            background: token.colorBgContainer,
            borderInlineEnd: `1px solid ${token.colorBorderSecondary}`,
            position: 'sticky',
            top: 0,
            height: '100vh',
          }}
        >
          <ConsoleMenu selectedKey={selectedKey} />
        </Sider>

        <Content id={MAIN_CONTENT_ID} tabIndex={-1} style={{ padding: token.padding }}>
          <Outlet />
        </Content>
      </Layout>

      <Drawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        placement="left"
        width={DRAWER_WIDTH}
        title={MSG_ADM.TITLE}
        styles={{ body: { padding: 0 } }}
      >
        <ConsoleMenu
          selectedKey={selectedKey}
          onSelect={() => setIsDrawerOpen(false)}
        />
      </Drawer>
    </Layout>
  );
}
