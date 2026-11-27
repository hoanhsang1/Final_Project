import { useLocation } from 'react-router-dom';
import ConsoleShell from '../ConsoleShell/ConsoleShell';
import { MSG_ADM } from '../../features/admin/adminMessages';
import { activeMenuKey, consoleMenu } from '../../features/admin/consoleMenu';
import { useModuleStatus } from '../../features/modules/useModuleStatus';

/**
 * Khung console quản trị hệ thống — `UC-ADMIN-01`.
 *
 * Chỉ chọn menu đang active rồi uỷ quyền phần khung cho `ConsoleShell`; nhờ vậy
 * console Super Admin và console Owner dùng đúng một cách bố cục.
 */
export default function AdminConsoleLayout() {
  const location = useLocation();
  const moduleStatus = useModuleStatus();
  // Loading / lỗi fetch → KHÔNG truyền map: filterMenuByModuleStatus giữ nguyên menu.
  const statuses = moduleStatus.isError || !moduleStatus.data ? undefined : moduleStatus.data;

  return (
    <ConsoleShell
      title={MSG_ADM.TITLE}
      menuAriaLabel={MSG_ADM.MENU_ARIA}
      openMenuLabel={MSG_ADM.OPEN_MENU}
      logoutLabel={MSG_ADM.LOGOUT}
      items={consoleMenu(statuses)}
      selectedKey={activeMenuKey(location.pathname, location.search, statuses)}
    />
  );
}
