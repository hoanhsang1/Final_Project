import { createElement, type ReactNode, type SVGProps } from 'react';
import type { ConsoleMenuItem } from '../admin/consoleMenu';
import { MSG_OWNER } from './ownerMessages';

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

function DepartmentIcon(): ReactNode {
  return svgIcon([
    ['path', { d: 'M3 13.5V4.5a1 1 0 0 1 1-1h4v10M8 6h4a1 1 0 0 1 1 1v6.5M5 6h1M5 8.5h1M5 11h1M10 8.5h1M10 11h1M2.5 13.5h11' }],
  ]);
}

function PositionIcon(): ReactNode {
  return svgIcon([
    ['rect', { x: 3, y: 4, width: 10, height: 9, rx: 1 }],
    ['path', { d: 'M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M3 7.5h10M8 7.5v2' }],
  ]);
}

/**
 * Menu của console Owner (`/to-chuc`) — nguồn sự thật duy nhất cho cả `Sider`
 * và `Drawer` (xem `ConsoleShell`).
 *
 * Chỉ 2 nhóm chức năng vì Sprint 3 chỉ giao Owner quản lý phòng ban + chức vụ.
 * Nhân viên nằm TRONG màn chi tiết phòng ban, không phải mục menu riêng.
 */
export const OWNER_MENU: readonly ConsoleMenuItem[] = [
  { key: 'phong-ban', label: MSG_OWNER.MENU_DEPARTMENTS, path: '/to-chuc', exact: true, icon: createElement(DepartmentIcon) },
  { key: 'chuc-vu', label: MSG_OWNER.MENU_POSITIONS, path: '/to-chuc/chuc-vu', exact: true, icon: createElement(PositionIcon) },
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
