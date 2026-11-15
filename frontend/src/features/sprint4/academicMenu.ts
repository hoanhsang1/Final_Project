import { createElement } from 'react';
import {
  ApartmentOutlined,
  CalendarOutlined,
  IdcardOutlined,
  ReadOutlined,
  SolutionOutlined,
  SwapOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { ConsoleMenuItem } from '../admin/consoleMenu';
import {
  canEditStaff,
  canViewClasses,
  canViewFacility,
  canViewOwnSchedule,
  canViewSchedule,
  canViewStaff,
  canViewStudents,
  canViewTeachers,
  canViewTransfers,
} from '../auth/permissions';
import { MSG_OPS } from '../operations/operationsMessages';
import { MSG_S4 } from './sprint4Messages';

/**
 * Menu khu vực Đào tạo — chỉ hiện mục người dùng thật sự xem được (§9).
 * Không còn fallback "hiện cả hai": fallback cũ đưa người chỉ có class.view vào
 * màn giáo viên và nhận lỗi 403.
 */
export function getAcademicMenu(permissions: string[], isOwner: boolean): ConsoleMenuItem[] {
  const items: ConsoleMenuItem[] = [];
  // "Nhân sự" đứng đầu: người phụ trách nhân sự phòng ban vào đây là chính.
  if (canViewStaff(isOwner, permissions)) {
    items.push({
      key: 'nhan-su',
      label: MSG_S4.MENU_STAFF,
      path: '/dao-tao/nhan-su',
      exact: false,
      icon: createElement(IdcardOutlined),
    });
  }
  if (canViewTransfers(isOwner, permissions)) {
    items.push({
      key: 'chuyen-phong',
      label: MSG_S4.MENU_TRANSFERS,
      path: '/dao-tao/chuyen-phong',
      exact: false,
      icon: createElement(SwapOutlined),
    });
  }
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
  if (canViewStudents(isOwner, permissions)) {
    items.push({
      key: 'sinh-vien',
      label: MSG_S4.MENU_STUDENTS,
      path: '/dao-tao/sinh-vien',
      exact: false,
      icon: createElement(TeamOutlined),
    });
  }
  if (canViewSchedule(isOwner, permissions)) {
    items.push({
      key: 'lich-hoc',
      label: MSG_OPS.MENU_SCHEDULE,
      path: '/dao-tao/lich-hoc',
      exact: false,
      icon: createElement(CalendarOutlined),
    });
  }
  if (canViewOwnSchedule(permissions)) {
    items.push({
      key: 'lich-cua-toi',
      label: 'Lịch của tôi',
      path: '/dao-tao/lich-cua-toi',
      exact: false,
      icon: createElement(CalendarOutlined),
    });
  }
  if (canViewFacility(isOwner, permissions)) {
    items.push({
      key: 'co-so-vat-chat',
      label: MSG_OPS.MENU_FACILITY,
      path: '/dao-tao/co-so-vat-chat',
      exact: false,
      icon: createElement(ToolOutlined),
    });
  }
  if (canEditStaff(isOwner, permissions)) {
    items.push({
      key: 'chuc-vu',
      label: MSG_S4.MENU_POSITIONS,
      path: '/dao-tao/chuc-vu',
      exact: false,
      icon: createElement(ApartmentOutlined),
    });
  }
  return items;
}

export function activeAcademicMenuKey(pathname: string): string | null {
  if (pathname.startsWith('/dao-tao/nhan-su')) return 'nhan-su';
  if (pathname.startsWith('/dao-tao/chuyen-phong')) return 'chuyen-phong';
  if (pathname.startsWith('/dao-tao/chuc-vu')) return 'chuc-vu';
  if (pathname.startsWith('/dao-tao/lop-hoc')) return 'lop-hoc';
  if (pathname.startsWith('/dao-tao/sinh-vien')) return 'sinh-vien';
  if (pathname.startsWith('/dao-tao/lich-cua-toi')) return 'lich-cua-toi';
  if (pathname.startsWith('/dao-tao/lich-hoc')) return 'lich-hoc';
  if (pathname.startsWith('/dao-tao/co-so-vat-chat')) return 'co-so-vat-chat';
  if (pathname.startsWith('/dao-tao/giao-vien')) return 'giao-vien';
  return null;
}
