import { createElement } from 'react';
import { ReadOutlined, SolutionOutlined } from '@ant-design/icons';
import type { ConsoleMenuItem } from '../admin/consoleMenu';
import { canViewClasses, canViewTeachers } from '../auth/permissions';
import { MSG_S4 } from './sprint4Messages';

/**
 * Menu khu vực Đào tạo — chỉ hiện mục người dùng thật sự xem được (§9).
 * Không còn fallback "hiện cả hai": fallback cũ đưa người chỉ có CLASS_VIEW vào
 * màn giáo viên và nhận lỗi 403.
 */
export function getAcademicMenu(permissions: string[], isOwner: boolean): ConsoleMenuItem[] {
  const items: ConsoleMenuItem[] = [];
  if (canViewTeachers(isOwner, permissions)) {
    items.push({
      key: 'giao-vien',
      label: MSG_S4.MENU_TEACHERS,
      path: '/dao-tao/giao-vien',
      exact: false,
      icon: createElement(SolutionOutlined),
    });
  }
  if (canViewClasses(isOwner, permissions)) {
    items.push({
      key: 'lop-hoc',
      label: MSG_S4.MENU_CLASSES,
      path: '/dao-tao/lop-hoc',
      exact: false,
      icon: createElement(ReadOutlined),
    });
  }
  return items;
}

export function activeAcademicMenuKey(pathname: string): string | null {
  if (pathname.startsWith('/dao-tao/lop-hoc')) return 'lop-hoc';
  if (pathname.startsWith('/dao-tao/giao-vien')) return 'giao-vien';
  return null;
}
