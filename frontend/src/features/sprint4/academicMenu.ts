import { createElement, type ReactNode, type SVGProps } from 'react';
import type { ConsoleMenuItem } from '../admin/consoleMenu';
import {
  canViewClasses,
  canViewStudentClasses,
  canViewStudentSelf,
  canViewStudents,
  canViewTeacherClasses,
  canViewTeacherSelf,
  canViewTeachers,
  hasAnyPermissionWithAliases,
} from '../auth/permissions';
import { MSG_AUTO } from '../schedule/autoScheduleMessages';
import { MSG_SCHEDULE } from '../schedule/scheduleMessages';
import { MSG_S4, MSG_SELF, MSG_STUDENT } from './sprint4Messages';

type SvgChild = readonly [tag: 'rect' | 'path' | 'circle', props: Record<string, string | number>];

function svgIcon(children: readonly SvgChild[], props?: SVGProps<SVGSVGElement>): ReactNode {
  return createElement(
    'svg',
    {
      viewBox: '0 0 16 16',
      width: '1em',
      height: '1em',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '1.4',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': true,
      focusable: 'false',
      ...props,
    },
    ...children.map(([tag, childProps], index) => createElement(tag, { key: index, ...childProps })),
  );
}

function TeacherIcon(): ReactNode {
  return svgIcon([
    ['circle', { cx: 8, cy: 5, r: 2.2 }],
    ['path', { d: 'M3.5 13c0-2.2 2-4 4.5-4s4.5 1.8 4.5 4' }],
    ['rect', { x: 10.5, y: 2.5, width: 3.5, height: 2.5, rx: 0.5 }],
    ['path', { d: 'M12.25 5v1.2' }],
  ]);
}

function ClassIcon(): ReactNode {
  return svgIcon([
    ['path', { d: 'M3 3.5h7.5a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3z' }],
    ['path', { d: 'M5.5 3.5v10M3 6h8.5M13 5v7' }],
  ]);
}

function StudentIcon(): ReactNode {
  return svgIcon([
    ['circle', { cx: 8, cy: 5, r: 2.2 }],
    ['path', { d: 'M3.5 13c0-2.2 2-4 4.5-4s4.5 1.8 4.5 4' }],
    ['path', { d: 'M11 9.5l1.5 1.5L15 8.5' }],
  ]);
}

function ScheduleIcon(): ReactNode {
  return svgIcon([
    ['rect', { x: 2.5, y: 3.5, width: 11, height: 10, rx: 1 }],
    ['path', { d: 'M2.5 6.5h11M5 2v3M11 2v3' }],
  ]);
}

function ImpactsIcon(): ReactNode {
  return svgIcon([
    ['rect', { x: 2.5, y: 3.5, width: 11, height: 10, rx: 1 }],
    ['path', { d: 'M2.5 6.5h11M5 2v3M11 2v3' }],
    ['path', { d: 'M8 8.5v2.5M8 13h.01' }],
  ]);
}

function MyScheduleIcon(): ReactNode {
  return svgIcon([
    ['rect', { x: 2.5, y: 3.5, width: 11, height: 10, rx: 1 }],
    ['path', { d: 'M2.5 6.5h11M5 2v3' }],
    ['path', { d: 'M6 10.5h4M8 8.5v4' }],
  ]);
}

function AutoScheduleIcon(): ReactNode {
  return svgIcon([
    ['rect', { x: 2.5, y: 3.5, width: 11, height: 10, rx: 1 }],
    ['path', { d: 'M2.5 6.5h11M5 2v3M11 2v3' }],
    ['path', { d: 'M9 9l1 2 2 1-2 1-1 2-1-2-2-1 2-1z' }],
  ]);
}

function SelfIcon(): ReactNode {
  return svgIcon([
    ['path', { d: 'M2.5 7.5 8 3l5.5 4.5' }],
    ['path', { d: 'M4.5 7v5.5h7V7' }],
    ['path', { d: 'M7 12.5V9.5h2v3' }],
  ]);
}

/**
 * Menu khu vực Đào tạo — chỉ hiện mục người dùng thật sự xem được (§9).
 * Không còn fallback "hiện cả hai": fallback cũ đưa người chỉ có CLASS_VIEW vào
 * màn giáo viên và nhận lỗi 403.
 */
export function getAcademicMenu(
  permissions: string[],
  isOwner: boolean,
  backendRoles: string[] = [],
): ConsoleMenuItem[] {
  const items: ConsoleMenuItem[] = [];
  // JWT của TEACHER và STUDENT có CÙNG self-permission → chỉ `backendRoles`
  // được phép phân biệt hai vai trò (xem gate trong permissions.ts).
  const selfState = { backendRoles, permissions };
  const isTeacher = canViewTeacherSelf(selfState);
  const isStudent = canViewStudentSelf(selfState);

  if (isTeacher || isStudent) {
    items.push({
      key: 'trang-ca-nhan',
      label: MSG_SELF.TITLE_HOME,
      path: '/dao-tao/trang-ca-nhan',
      exact: true,
      icon: createElement(SelfIcon),
    });
  }
  if (isTeacher) {
    items.push({
      key: 'ho-so-cua-toi',
      label: MSG_SELF.PROFILE_TEACHER,
      path: '/dao-tao/giao-vien/cua-toi',
      exact: true,
      icon: createElement(TeacherIcon),
    });
  } else if (isStudent) {
    items.push({
      key: 'ho-so-cua-toi',
      label: MSG_SELF.PROFILE_STUDENT,
      path: '/dao-tao/hoc-sinh/cua-toi',
      exact: true,
      icon: createElement(StudentIcon),
    });
  }
  // "Lớp của tôi" cần role tương ứng VÀ self-permission tương ứng; alias
  // UPPERCASE/dotted đều được helper xử lý.
  if (canViewTeacherClasses(selfState)) {
    items.push({
      key: 'lop-cua-toi',
      label: MSG_SELF.MY_CLASSES,
      path: '/dao-tao/lop-hoc-cua-toi',
      exact: false,
      icon: createElement(ClassIcon),
    });
  } else if (canViewStudentClasses(selfState)) {
    items.push({
      key: 'lop-cua-toi',
      label: MSG_SELF.MY_CLASSES,
      path: '/dao-tao/hoc-sinh/lop-cua-toi',
      exact: false,
      icon: createElement(ClassIcon),
    });
  }

  if (canViewTeachers(isOwner, permissions)) {
    items.push({
      key: 'giao-vien',
      label: MSG_S4.MENU_TEACHERS,
      path: '/dao-tao/giao-vien',
      exact: false,
      icon: createElement(TeacherIcon),
    });
  }
  if (canViewClasses(isOwner, permissions)) {
    items.push({
      key: 'lop-hoc',
      label: MSG_S4.MENU_CLASSES,
      path: '/dao-tao/lop-hoc',
      exact: false,
      icon: createElement(ClassIcon),
    });
  }
  // `getAcademicMenu` chỉ nhận `isOwner` boolean; dựng state tối thiểu để dùng
  // chung `canViewStudents` với màn danh sách (một nguồn quyết định).
  if (canViewStudents({ backendRoles: isOwner ? ['OWNER'] : [], permissions })) {
    items.push({
      key: 'hoc-sinh',
      label: MSG_STUDENT.TITLE,
      path: '/dao-tao/hoc-sinh',
      exact: false,
      icon: createElement(StudentIcon),
    });
  }
  // Lịch dùng helper alias-aware của Task 1: `schedule.view`/`SCHEDULE_VIEW` và
  // `schedule.self_view`/`SCHEDULE_SELF_VIEW` đều được nhận diện. Hai mục độc lập
  // — người chỉ có `schedule.self_view` vẫn thấy lịch cá nhân dù không xem được
  // lịch phòng ban (và ngược lại).
  if (isOwner || hasAnyPermissionWithAliases(permissions, ['schedule.view'])) {
    items.push({
      key: 'lich',
      label: MSG_SCHEDULE.MENU_SCHEDULE,
      path: '/dao-tao/lich',
      exact: false,
      icon: createElement(ScheduleIcon),
    });
  }
  // Buổi bị ảnh hưởng cùng mức quyền với lịch phòng ban (không phải self-view).
  // Đặt NGAY SAU `lich` để không đổi mục đầu tiên mà `landing.ts`/router dùng.
  if (isOwner || hasAnyPermissionWithAliases(permissions, ['schedule.view'])) {
    items.push({
      key: 'impacts',
      label: MSG_SCHEDULE.IMPACTS_TITLE,
      path: '/dao-tao/lich/buoi-bi-anh-huong',
      exact: false,
      icon: createElement(ImpactsIcon),
    });
  }
  // Xếp lịch tự động là thao tác ghi — chỉ chủ tổ chức hoặc schedule.create.
  // Người chỉ có schedule.view không thấy mục này.
  if (isOwner || hasAnyPermissionWithAliases(permissions, ['schedule.create'])) {
    items.push({
      key: 'tu-dong-xep-lich',
      label: MSG_AUTO.MENU_AUTO_SCHEDULE,
      path: '/dao-tao/tu-dong-xep-lich',
      exact: false,
      icon: createElement(AutoScheduleIcon),
    });
  }
  if (isOwner || hasAnyPermissionWithAliases(permissions, ['schedule.self_view'])) {
    items.push({
      key: 'lich-cua-toi',
      label: MSG_SCHEDULE.MENU_MY_SCHEDULE,
      path: '/dao-tao/lich-cua-toi',
      exact: false,
      icon: createElement(MyScheduleIcon),
    });
  }
  return items;
}

export function activeAcademicMenuKey(pathname: string): string | null {
  // Các path self phải được nhận diện TRƯỚC prefix cũ: `/giao-vien/cua-toi`,
  // `/hoc-sinh/cua-toi`, `/lop-hoc-cua-toi` đều bắt đầu bằng prefix quản lý.
  if (
    pathname === '/dao-tao/trang-ca-nhan' ||
    pathname.startsWith('/dao-tao/trang-ca-nhan/')
  ) {
    return 'trang-ca-nhan';
  }
  if (
    pathname === '/dao-tao/giao-vien/cua-toi' ||
    pathname.startsWith('/dao-tao/giao-vien/cua-toi/') ||
    pathname === '/dao-tao/hoc-sinh/cua-toi' ||
    pathname.startsWith('/dao-tao/hoc-sinh/cua-toi/')
  ) {
    return 'ho-so-cua-toi';
  }
  if (
    pathname === '/dao-tao/lop-hoc-cua-toi' ||
    pathname.startsWith('/dao-tao/lop-hoc-cua-toi/') ||
    pathname === '/dao-tao/hoc-sinh/lop-cua-toi' ||
    pathname.startsWith('/dao-tao/hoc-sinh/lop-cua-toi/')
  ) {
    return 'lop-cua-toi';
  }

  if (pathname.startsWith('/dao-tao/hoc-sinh')) return 'hoc-sinh';
  if (pathname.startsWith('/dao-tao/lop-hoc')) return 'lop-hoc';
  if (pathname.startsWith('/dao-tao/giao-vien')) return 'giao-vien';
  // Màn auto-xếp phải được nhận diện trước khi so với prefix `/dao-tao/lich`.
  if (
    pathname === '/dao-tao/tu-dong-xep-lich' ||
    pathname.startsWith('/dao-tao/tu-dong-xep-lich/')
  ) {
    return 'tu-dong-xep-lich';
  }
  // Kiểm tra lịch cá nhân TRƯỚC: `/dao-tao/lich-cua-toi` cũng bắt đầu bằng
  // `/dao-tao/lich`, nếu không sẽ bị nhầm sang mục lịch phòng ban.
  if (pathname === '/dao-tao/lich-cua-toi' || pathname.startsWith('/dao-tao/lich-cua-toi/')) {
    return 'lich-cua-toi';
  }
  // `/dao-tao/lich/buoi-bi-anh-huong` là màn riêng, phải nhận diện TRƯỚC prefix
  // `/dao-tao/lich` nếu không sẽ luôn bị gắn nhầm sang mục lịch phòng ban.
  if (
    pathname === '/dao-tao/lich/buoi-bi-anh-huong' ||
    pathname.startsWith('/dao-tao/lich/buoi-bi-anh-huong/')
  ) {
    return 'impacts';
  }
  if (pathname === '/dao-tao/lich' || pathname.startsWith('/dao-tao/lich/')) return 'lich';
  return null;
}
