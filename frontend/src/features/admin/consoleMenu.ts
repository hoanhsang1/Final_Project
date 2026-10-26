import { MSG_ADM } from './adminMessages';

/**
 * Bảng menu của khung console quản trị — nguồn sự thật duy nhất cho CẢ hai chỗ:
 * `Sider` (≥1024px) và `Drawer` (<1024px). Đổi menu → sửa đúng 1 file này.
 *
 * Bố cục: mỗi mục menu là "cửa vào" của một nhóm chức năng (đặc tả mục 1).
 * Từ màn danh sách → bấm 1 dòng → màn chi tiết (`/:id`).
 */
export interface ConsoleMenuItem {
  /** Khóa duy nhất — dùng cho antd `Menu` và cho test. */
  key: string;
  /** Nhãn tiếng Việt hiển thị trên menu. */
  label: string;
  /** Đường dẫn React Router. */
  path: string;
  /**
   * Chỉ match đúng đường dẫn này (không match đường dẫn con).
   *
   * Ba mục đầu tiên BẮT BUỘC `exact` — nếu không, `/quan-tri/to-chuc/tat-ca`
   * sẽ khớp cả mục "Tổ chức chờ duyệt" lẫn "Tất cả tổ chức" và antd highlight
   * cả hai.
   */
  exact?: boolean;
}

export const CONSOLE_MENU: readonly ConsoleMenuItem[] = [
  { key: 'tong-quan', label: MSG_ADM.MENU_OVERVIEW, path: '/quan-tri', exact: true },
  { key: 'to-chuc', label: 'Tổ chức chờ duyệt', path: '/quan-tri/to-chuc', exact: true },
  { key: 'to-chuc-tat-ca', label: MSG_ADM.MENU_ORG_ALL, path: '/quan-tri/to-chuc/tat-ca', exact: true },
  { key: 'module', label: MSG_ADM.MENU_MODULES, path: '/quan-tri/module' },
  { key: 'tai-khoan', label: MSG_ADM.MENU_ACCOUNTS, path: '/quan-tri/tai-khoan' },
  { key: 'nhat-ky', label: MSG_ADM.MENU_AUDIT, path: '/quan-tri/nhat-ky' },
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
