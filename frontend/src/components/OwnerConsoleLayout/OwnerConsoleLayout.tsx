import { useLocation } from 'react-router-dom';
import ConsoleShell from '../ConsoleShell/ConsoleShell';
import { MSG_ADM } from '../../features/admin/adminMessages';
import {
  activeFacilityMenuKey,
  activeOwnerMenuKey,
  FACILITY_MENU,
  OWNER_MENU,
} from '../../features/owner/ownerMenu';
import { MSG_OWNER } from '../../features/owner/ownerMessages';

export type OwnerConsoleLayoutProps = {
  /** Chọn menu của Owner (`/to-chuc`) hoặc của CSVC (`/co-so-vat-chat`). */
  variant?: 'owner' | 'facility';
};

/**
 * Khung console của Owner — cùng khung với console quản trị, chỉ khác menu.
 * Biến thể `facility` giữ nguyên khung nhưng thay menu và mục đang chọn.
 *
 * Tên khu vực đặt trên header (không phải `<h1>`) để tiêu đề trang con vẫn là
 * heading cấp 1 duy nhất (xem `ConsoleShell`).
 */
export default function OwnerConsoleLayout({ variant = 'owner' }: OwnerConsoleLayoutProps) {
  const location = useLocation();
  const isFacility = variant === 'facility';

  return (
    <ConsoleShell
      title={MSG_OWNER.TITLE}
      menuAriaLabel={MSG_OWNER.MENU_ARIA}
      openMenuLabel={MSG_OWNER.OPEN_MENU}
      // Nút đăng xuất dùng chung câu chữ với console quản trị.
      logoutLabel={MSG_ADM.LOGOUT}
      items={isFacility ? FACILITY_MENU : OWNER_MENU}
      selectedKey={
        isFacility
          ? activeFacilityMenuKey(location.pathname)
          : activeOwnerMenuKey(location.pathname)
      }
    />
  );
}
