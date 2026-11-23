import { createElement, type ReactNode, type SVGProps } from 'react';
import { MSG_ADM } from './adminMessages';

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

function DashboardIcon(): ReactNode {
  return svgIcon([
    ['rect', { x: 2, y: 2, width: 5, height: 5, rx: 1 }],
    ['rect', { x: 9, y: 2, width: 5, height: 5, rx: 1 }],
    ['rect', { x: 2, y: 9, width: 5, height: 5, rx: 1 }],
    ['rect', { x: 9, y: 9, width: 5, height: 5, rx: 1 }],
  ]);
}

function AuditIcon(): ReactNode {
  return svgIcon([
    ['path', { d: 'M4 2.5h6l2 2V13a.5.5 0 0 1-.5.5h-7.5a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Z' }],
    ['path', { d: 'M10 2.5V5h2.5M6 7.5h4M6 10h4' }],
  ]);
}

function BankIcon(): ReactNode {
  return svgIcon([
    ['path', { d: 'M2.5 6.5 8 3l5.5 3.5M4 6.5V12m4-5.5V12m4-5.5V12M3 12h10M2.5 13.5h11' }],
  ]);
}

function ModulesIcon(): ReactNode {
  return svgIcon([
    ['rect', { x: 2, y: 2, width: 4.5, height: 4.5, rx: 0.8 }],
    ['rect', { x: 9.5, y: 2, width: 4.5, height: 4.5, rx: 0.8 }],
    ['rect', { x: 2, y: 9.5, width: 4.5, height: 4.5, rx: 0.8 }],
    ['path', { d: 'M9.5 11.75h4.5M11.75 9.5v4.5' }],
  ]);
}

function AccountsIcon(): ReactNode {
  return svgIcon([
    ['circle', { cx: 6, cy: 5.5, r: 2 }],
    ['path', { d: 'M2.5 13c0-2 1.6-3.5 3.5-3.5S9.5 11 9.5 13' }],
    ['circle', { cx: 11, cy: 6, r: 1.5 }],
    ['path', { d: 'M11 9.5c1.4 0 2.5 1 2.5 2.5' }],
  ]);
}

function AuditLogIcon(): ReactNode {
  return svgIcon([
    ['rect', { x: 3, y: 2.5, width: 10, height: 11, rx: 1 }],
    ['path', { d: 'M5.5 6h5M5.5 8.5h5M5.5 11h3' }],
    ['circle', { cx: 11.5, cy: 11, r: 2.2, fill: 'none' }],
    ['path', { d: 'M13.1 12.6 14.5 14' }],
  ]);
}

/**
 * Bảng menu của khung console quản trị — nguồn sự thật duy nhất cho CẢ hai chỗ:
 * menu cột bên (≥1024px) và ngăn kéo điều hướng (<1024px). Đổi menu → sửa đúng 1 file này.
 *
 * Bố cục: mỗi mục menu là "cửa vào" của một nhóm chức năng (đặc tả mục 1).
 * Từ màn danh sách → bấm 1 dòng → màn chi tiết (`/:id`).
 */
export interface ConsoleMenuItem {
  /** Khóa duy nhất — dùng để xác định mục đang chọn và cho test. */
  key: string;
  /** Nhãn tiếng Việt hiển thị trên menu. */
  label: string;
  /** Đường dẫn React Router. */
  path: string;
  /** Icon điều hướng (tùy chọn, dùng cho shell điều hướng). */
  icon?: ReactNode;
  /**
   * Chỉ match đúng đường dẫn này (không match đường dẫn con).
   *
   * Ba mục đầu tiên BẮT BUỘC `exact` — nếu không, `/quan-tri/to-chuc/tat-ca`
   * sẽ khớp cả mục "Tổ chức chờ duyệt" lẫn "Tất cả tổ chức" và cả hai đều được chọn.
   */
  exact?: boolean;
}

export const CONSOLE_MENU: readonly ConsoleMenuItem[] = [
  { key: 'tong-quan', label: MSG_ADM.MENU_OVERVIEW, path: '/quan-tri', exact: true, icon: createElement(DashboardIcon) },
  { key: 'to-chuc', label: 'Tổ chức chờ duyệt', path: '/quan-tri/to-chuc', exact: true, icon: createElement(AuditIcon) },
  { key: 'to-chuc-tat-ca', label: MSG_ADM.MENU_ORG_ALL, path: '/quan-tri/to-chuc/tat-ca', exact: true, icon: createElement(BankIcon) },
  { key: 'module', label: MSG_ADM.MENU_MODULES, path: '/quan-tri/module', icon: createElement(ModulesIcon) },
  { key: 'tai-khoan', label: MSG_ADM.MENU_ACCOUNTS, path: '/quan-tri/tai-khoan', icon: createElement(AccountsIcon) },
  { key: 'nhat-ky', label: MSG_ADM.MENU_AUDIT, path: '/quan-tri/nhat-ky', icon: createElement(AuditLogIcon) },
];

/**
 * Tìm mục menu đang được chọn.
 *
 * Màn **chi tiết** tổ chức (`/quan-tri/to-chuc/:id`) không khớp mục nào → đọc
 * query param `?from=` (giá trị là **khóa menu**) để quay về đúng nhóm: 
 * `?from=to-chuc-tat-ca` → chọn mục "Tất cả tổ chức", không có `from` → chọn
 * "Tổ chức chờ duyệt". Không có `from` → không chọn mục nào (tới bằng URL trực tiếp).
 */
export function activeMenuKey(pathname: string, search?: string): string | null {
  for (const item of CONSOLE_MENU) {
    const matched = item.exact ? pathname === item.path : pathname.startsWith(item.path);
    if (matched) {
      return item.key;
    }
  }

  // Màn chi tiết tổ chức: đọc `?from=` (khóa menu) để biết tới từ nhóm nào.
  if (/^\/quan-tri\/to-chuc\/[^/]+$/.test(pathname)) {
    const from = new URLSearchParams(search ?? '').get('from');
    return CONSOLE_MENU.some((entry) => entry.key === from) ? (from as string) : 'to-chuc';
  }

  return null;
}

/**
 * Đường dẫn quay lại danh sách từ màn chi tiết — đọc `?from=`.
 *
 * Trả về danh sách tổ chức chờ duyệt nếu `from` không hợp lệ hoặc không có.
 */
export function backToListPath(search: string | undefined, fallback: string): string {
  const from = new URLSearchParams(search ?? '').get('from');
  if (!from) {
    return fallback;
  }
  const item = CONSOLE_MENU.find((entry) => entry.key === from);
  return item?.path ?? fallback;
}
