import { createElement, type ReactNode, type SVGProps } from 'react';
import type { ConsoleMenuItem } from '../admin/consoleMenu';
import { canViewClasses, canViewTeachers } from '../auth/permissions';
import { MSG_S4 } from './sprint4Messages';

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
  return items;
}

export function activeAcademicMenuKey(pathname: string): string | null {
  if (pathname.startsWith('/dao-tao/lop-hoc')) return 'lop-hoc';
  if (pathname.startsWith('/dao-tao/giao-vien')) return 'giao-vien';
  return null;
}
