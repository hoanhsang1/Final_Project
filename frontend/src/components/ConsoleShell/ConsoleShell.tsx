import { Button, Drawer, DrawerHeader, Text } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import type { ConsoleMenuItem } from '../../features/admin/consoleMenu';
import { logout } from '../../features/auth/authApi';
import { useAuthStore } from '../../stores/authStore';
import ConsoleMenu from '../ConsoleMenu/ConsoleMenu';
import './ConsoleShell.css';

/** `id` của vùng nội dung chính — đích nhảy của skip link (WCAG 2.4.1). */
const MAIN_CONTENT_ID = 'noi-dung-chinh';

/** Độ rộng cột bên ở desktop — khớp độ rộng cột bên ở bản trước. */
const SIDEBAR_WIDTH = 248;
/** Chiều rộng `Drawer` ở màn hình nhỏ. */
const DRAWER_WIDTH = 300;

/**
 * Dấu hiệu nhận diện: 4 ô module (MEMS = quản lý giáo dục **theo module**).
 * Bốn ô cùng một hình, khác độ đậm — đọc được cả khi in đen trắng.
 */
function BrandMark() {
  return (
    <svg
      viewBox="0 0 22 22"
      width="22"
      height="22"
      aria-hidden="true"
      focusable="false"
      className="mems-console__brand-svg"
    >
      <rect x="1" y="1" width="9" height="9" rx="2" className="mems-console__brand-strong" />
      <rect x="12" y="1" width="9" height="9" rx="2" className="mems-console__brand-soft" />
      <rect x="1" y="12" width="9" height="9" rx="2" className="mems-console__brand-soft" />
      <rect x="12" y="12" width="9" height="9" rx="2" className="mems-console__brand-strong" />
    </svg>
  );
}

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
      className="mems-console__menu-icon"
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
  /** Menu của console — cùng một nguồn cho cột bên và `Drawer`. */
  items: readonly ConsoleMenuItem[];
  /** Khóa mục đang được chọn; `null` khi không khớp mục nào (màn chi tiết). */
  selectedKey: string | null;
}

/**
 * Khung console dùng chung (kiểu Odoo): header app mang định danh MEMS + ngữ
 * cảnh khu vực/module + phiên người dùng + đăng xuất; điều hướng bên
 * (desktop ≥1024px, mobile `Drawer` <1024px) dùng chung `ConsoleMenu`.
 *
 * Giữ hành vi/cấu trúc của bản trước: skip link (WCAG 2.4.1), `#noi-dung-chinh`,
 * logout gọi API rồi xoá phiên + chuyển `/dang-nhap` kể cả khi API lỗi,
 * `aria-label`/`aria-current`, responsive, render `<Outlet/>`.
 *
 * Bố cục dùng hai khối flex + một media query trong `ConsoleShell.css`, cùng
 * một nguồn breakpoint là `useMediaQuery` của Astryx — tránh lệch giữa logic JS
 * và CSS khi xác định desktop/mobile.
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
  const navigate = useNavigate();
  const username = useAuthStore((s) => s.username);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
    <div className="mems-console">
      {/* Skip link: ẩn bằng CSS, hiện khi nhận focus bằng bàn phím. */}
      <a href={`#${MAIN_CONTENT_ID}`} className="mems-console__skip">
        Tới nội dung chính
      </a>

      <header className="mems-console__header">
        <div className="mems-console__header-start">
          {isDesktop ? null : (
            <Button
              variant="ghost"
              isIconOnly
              label={openMenuLabel}
              icon={<MenuIcon />}
              aria-expanded={isDrawerOpen}
              onClick={() => setIsDrawerOpen(true)}
              className="mems-console__menu-button"
            />
          )}
          <span className="mems-console__brand" aria-hidden="true">
            <BrandMark />
          </span>
          <Text type="large" weight="semibold" className="mems-console__product">
            {productName}
          </Text>
          <span className="mems-console__header-divider" aria-hidden="true" />
          {/* Tên khu vực/module — không dùng H1 (H1 thuộc trang con). */}
          <Text type="body" color="secondary" className="mems-console__context">
            {title}
          </Text>
        </div>

        <div className="mems-console__header-end">
          {username ? (
            <Text type="supporting" color="secondary" className="mems-console__username">
              {username}
            </Text>
          ) : null}
          <Button
            variant="secondary"
            size="md"
            label={logoutLabel}
            isLoading={isLoggingOut}
            onClick={handleLogout}
          />
        </div>
      </header>

      <div className="mems-console__body">
        {isDesktop ? (
          <aside
            className="mems-console__sider"
            style={{ width: SIDEBAR_WIDTH }}
            aria-label={title}
          >
            <ConsoleMenu
              items={items}
              menuAriaLabel={menuAriaLabel}
              selectedKey={selectedKey}
            />
          </aside>
        ) : null}

        <main id={MAIN_CONTENT_ID} tabIndex={-1} className="mems-console__main">
          <Outlet />
        </main>
      </div>

      {isDesktop ? null : (
        <Drawer
          isOpen={isDrawerOpen}
          onOpenChange={setIsDrawerOpen}
          side="start"
          width={DRAWER_WIDTH}
          label={title}
          padding={0}
        >
          <DrawerHeader
            title={title}
            onOpenChange={setIsDrawerOpen}
            hasDivider
            className="mems-console__drawer-header"
          />
          <div className="mems-console__drawer-menu">
            <ConsoleMenu
              items={items}
              menuAriaLabel={menuAriaLabel}
              selectedKey={selectedKey}
              onSelect={() => setIsDrawerOpen(false)}
            />
          </div>
        </Drawer>
      )}
    </div>
  );
}
