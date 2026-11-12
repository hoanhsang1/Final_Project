import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { MSG_ADM } from '../../features/admin/adminMessages';
import { isOwnerRole } from '../../features/auth/permissions';
import { activeAcademicMenuKey, getAcademicMenu } from '../../features/sprint4/academicMenu';
import { MSG_S4 } from '../../features/sprint4/sprint4Messages';
import { useAuthStore } from '../../stores/authStore';
import ConsoleShell from '../ConsoleShell/ConsoleShell';

export default function AcademicConsoleLayout() {
  const location = useLocation();
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const items = useMemo(
    () => getAcademicMenu(permissions, isOwnerRole(backendRoles)),
    [permissions, backendRoles],
  );

  return (
    <ConsoleShell
      title={MSG_S4.TITLE}
      menuAriaLabel={MSG_S4.MENU_ARIA}
      openMenuLabel={MSG_S4.OPEN_MENU}
      logoutLabel={MSG_ADM.LOGOUT}
      items={items}
      selectedKey={activeAcademicMenuKey(location.pathname)}
    />
  );
}
