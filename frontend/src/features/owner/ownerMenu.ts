import { createElement } from 'react';
import { ApartmentOutlined, IdcardOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import type { ConsoleMenuItem } from '../admin/consoleMenu';
import { MSG_OWNER } from './ownerMessages';

/**
 * Menu của console Owner (`/to-chuc`) — nguồn sự thật duy nhất cho cả `Sider`
 * và `Drawer` (xem `ConsoleShell`).
 *
 * Nhân viên nằm TRONG màn chi tiết phòng ban, không phải mục menu riêng.
 * "Ủy quyền" là nơi bổ nhiệm Tổng quản lý và cấp/thu quyền cho họ (quy tắc 3).
 */
export const OWNER_MENU: readonly ConsoleMenuItem[] = [
  { key: 'phong-ban', label: MSG_OWNER.MENU_DEPARTMENTS, path: '/to-chuc', exact: true, icon: createElement(ApartmentOutlined) },
  { key: 'chuc-vu', label: MSG_OWNER.MENU_POSITIONS, path: '/to-chuc/chuc-vu', exact: true, icon: createElement(IdcardOutlined) },
  { key: 'uy-quyen', label: MSG_OWNER.MENU_DELEGATION, path: '/to-chuc/uy-quyen', exact: true, icon: createElement(SafetyCertificateOutlined) },
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
