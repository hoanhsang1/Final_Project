import type { ConsoleMenuItem } from '../admin/consoleMenu';
import { MSG_OWNER } from './ownerMessages';

/**
 * Menu của console Owner (`/to-chuc`) — nguồn sự thật duy nhất cho cả `Sider`
 * và `Drawer` (xem `ConsoleShell`).
 *
 * Chỉ 2 nhóm chức năng vì Sprint 3 chỉ giao Owner quản lý phòng ban + chức vụ.
 * Nhân viên nằm TRONG màn chi tiết phòng ban, không phải mục menu riêng.
 */
export const OWNER_MENU: readonly ConsoleMenuItem[] = [
  { key: 'phong-ban', label: MSG_OWNER.MENU_DEPARTMENTS, path: '/to-chuc', exact: true },
  { key: 'chuc-vu', label: MSG_OWNER.MENU_POSITIONS, path: '/to-chuc/chuc-vu', exact: true },
];

/**
 * Tìm mục menu đang được chọn từ đường dẫn hiện tại.
 *
 * `/to-chuc/phong-ban/:id` là màn chi tiết của nhóm Phòng ban nên vẫn phải
 * highlight mục "Phòng ban", dù đường dẫn không khớp `exact`.
 */
export function activeOwnerMenuKey(pathname: string): string | null {
  for (const item of OWNER_MENU) {
    const matched = item.exact ? pathname === item.path : pathname.startsWith(item.path);
    if (matched) {
      return item.key;
    }
  }

  if (pathname.startsWith('/to-chuc/chuc-vu')) {
    return 'chuc-vu';
  }
  if (pathname.startsWith('/to-chuc')) {
    return 'phong-ban';
  }

  return null;
}
