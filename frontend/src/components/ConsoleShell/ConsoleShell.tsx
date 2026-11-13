import { Button, Drawer, Flex, Layout, Space, Typography, theme } from 'antd';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import type { ConsoleMenuItem } from '../../features/admin/consoleMenu';
import { logout } from '../../features/auth/authApi';
import { useAuthStore } from '../../stores/authStore';
import ConsoleMenu from '../ConsoleMenu/ConsoleMenu';
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

/** Độ rộng `Sider` desktop — khớp breakpoint `lg` (1024px) của antd. */
const SIDEBAR_WIDTH = 240;
/** Chiều rộng `Drawer` mobile. */
const DRAWER_WIDTH = 300;

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', fontSize: 18 }}
    >
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  );
}

interface ConsoleShellProps {
  /** Tên khu vực/module hiện trên header và Drawer (vd "Khu vực tổ chức"). */
  title: string;
  /** Định danh sản phẩm trên thanh app (mặc định MEMS). */
  productName?: string;
  /** `aria-label` của `nav` chứa menu. */
  menuAriaLabel: string;
  /** `aria-label` của nút hamburger ở màn hình nhỏ. */
  openMenuLabel: string;
  /** Nhãn nút đăng xuất. */
  logoutLabel: string;
  /** Menu của console — cùng một nguồn cho `Sider` và `Drawer`. */
  items: readonly ConsoleMenuItem[];
  /** Khóa mục đang được chọn; `null` khi không khớp mục nào (màn chi tiết). */
  selectedKey: string | null;
}

/**
 * Khung console dùng chung (Layer 1, kiểu Odoo): header app nổi bật mang định danh
 * MEMS + ngữ cảnh khu vực/module + phiên người dùng + đăng xuất; điều hướng bên
 * (desktop Sider ≥1024px, mobile Drawer <1024px) dùng chung `ConsoleMenu`.
 *
 * Giữ hành vi/cấu trúc: skip link (WCAG 2.4.1), `#noi-dung-chinh`, logout gọi API
 * rồi xoá phiên + chuyển `/dang-nhap` kể cả khi API lỗi, `aria-label`/`aria-current`,
 * responsive, render `<Outlet/>`. Không đổi route/guard/IA.
 */
export default function ConsoleShell({
  title,
  productName = 'MEMS',
  menuAriaLabel,
  openMenuLabel,
  logoutLabel,
  items,
  selectedKey,
}: ConsoleShellProps) {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const username = useAuthStore((s) => s.username);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Khớp breakpoint `lg` (1024px) của antd.
  const isDesktop = useMediaQuery('(min-width: 1024px)');

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
          gap: token.marginSM,
          height: 52,
          paddingInline: token.padding,
          background: token.colorPrimary,
          color: token.colorWhite,
          lineHeight: 'normal',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <Space size={token.marginSM} style={{ minWidth: 0 }}>
          {!isDesktop && (
            <Button
              type="text"
              icon={<MenuIcon />}
              aria-label={openMenuLabel}
              aria-expanded={isDrawerOpen}
              onClick={() => setIsDrawerOpen(true)}
              style={{ color: token.colorWhite }}
            />
          )}
          <Flex align="center" gap={token.marginSM} style={{ minWidth: 0 }}>
            <Text strong style={{ color: token.colorWhite, fontSize: 16, letterSpacing: 0.2 }}>
              {productName}
            </Text>
            <span
              aria-hidden="true"
              style={{
                width: 1,
                height: 18,
                background: 'rgba(255,255,255,0.35)',
                display: isDesktop ? 'block' : 'none',
              }}
            />
            {/* Tên khu vực/module — không dùng H1 (H1 thuộc trang con). */}
            <Text
              style={{
                color: 'rgba(255,255,255,0.92)',
                fontSize: 14,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </Text>
          </Flex>
        </Space>

        <Space size={token.marginSM}>
          {username && (
            <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 13, display: isDesktop ? 'inline' : 'none' }}>
              {username}
            </Text>
          )}
          <Button
            size="small"
            onClick={handleLogout}
            loading={isLoggingOut}
            style={{
              background: 'rgba(255,255,255,0.14)',
              borderColor: 'rgba(255,255,255,0.28)',
              color: token.colorWhite,
            }}
          >
            {logoutLabel}
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
            top: 52,
            height: 'calc(100vh - 52px)',
            overflowY: 'auto',
          }}
        >
          <div style={{ paddingBlock: token.paddingXS }}>
            <ConsoleMenu
              items={items}
              menuAriaLabel={menuAriaLabel}
              selectedKey={selectedKey}
            />
          </div>
        </Sider>

        <Content id={MAIN_CONTENT_ID} tabIndex={-1} style={{ padding: token.paddingLG, minWidth: 0 }}>
          <Outlet />
        </Content>
      </Layout>

      <Drawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        placement="left"
        width={DRAWER_WIDTH}
        title={title}
        styles={{ body: { padding: 0 }, header: { borderBottom: `1px solid ${token.colorBorderSecondary}` } }}
      >
        <ConsoleMenu
          items={items}
          menuAriaLabel={menuAriaLabel}
          selectedKey={selectedKey}
          onSelect={() => setIsDrawerOpen(false)}
        />
      </Drawer>
    </Layout>
  );
}
