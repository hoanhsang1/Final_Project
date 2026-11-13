import { useLocation } from 'react-router-dom';
import ConsoleShell from '../ConsoleShell/ConsoleShell';
import { MSG_ADM } from '../../features/admin/adminMessages';
import { activeOwnerMenuKey, OWNER_MENU } from '../../features/owner/ownerMenu';
import { MSG_OWNER } from '../../features/owner/ownerMessages';

/**
 * Khung console của Owner — cùng khung với console quản trị, chỉ khác menu.
 *
 * Tên khu vực đặt trên header (không phải `<h1>`) để tiêu đề trang con vẫn là
 * heading cấp 1 duy nhất (xem `ConsoleShell`).
 */
export default function OwnerConsoleLayout() {
  const location = useLocation();

  return (
    <ConsoleShell
      title={MSG_OWNER.TITLE}
      menuAriaLabel={MSG_OWNER.MENU_ARIA}
      openMenuLabel={MSG_OWNER.OPEN_MENU}
      // Nút đăng xuất dùng chung câu chữ với console quản trị.
      logoutLabel={MSG_ADM.LOGOUT}
      items={OWNER_MENU}
      selectedKey={activeOwnerMenuKey(location.pathname)}
    />
  );
}
