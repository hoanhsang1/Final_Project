import { useLocation } from 'react-router-dom';
import ConsoleShell from '../ConsoleShell/ConsoleShell';
import { MSG_ADM } from '../../features/admin/adminMessages';
import { activeMenuKey, CONSOLE_MENU } from '../../features/admin/consoleMenu';

/**
 * Khung console quản trị hệ thống — `UC-ADMIN-01`.
 *
 * Chỉ chọn menu đang active rồi uỷ quyền phần khung cho `ConsoleShell`; nhờ vậy
 * console Super Admin và console Owner dùng đúng một cách bố cục.
 */
export default function AdminConsoleLayout() {
  const location = useLocation();

  return (
    <ConsoleShell
      title={MSG_ADM.TITLE}
      menuAriaLabel={MSG_ADM.MENU_ARIA}
      openMenuLabel={MSG_ADM.OPEN_MENU}
      logoutLabel={MSG_ADM.LOGOUT}
      items={CONSOLE_MENU}
      selectedKey={activeMenuKey(location.pathname, location.search)}
    />
  );
}
