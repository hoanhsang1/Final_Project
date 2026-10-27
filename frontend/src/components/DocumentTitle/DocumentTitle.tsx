import { useEffect } from 'react';
import { useMatches } from 'react-router-dom';

/** Tiêu đề gốc — khớp `index.html`, dùng cho route không khai báo tiêu đề. */
export const DEFAULT_DOCUMENT_TITLE = 'MEMS — Hệ thống Quản lý Giáo dục theo Module';

/** Metadata khai báo trên route trong `router.tsx`. */
export interface RouteHandle {
  title?: string;
}

/**
 * Cập nhật `document.title` theo route hiện tại.
 *
 * Trước đây toàn app chỉ có 1 tiêu đề cố định → mở 9 tab console không phân
 * biệt được và bookmark lưu sai tên trang. Tiêu đề khai báo bằng `handle` ngay
 * trên route nên không màn nào bị bỏ sót; route con khai báo sẽ ghi đè route cha.
 *
 * Component phải là **con** của router nhưng không cần nằm cạnh trang —
 * `useMatches()` đọc dữ liệu route chứ không phụ thuộc vị trí trong cây.
 */
export default function DocumentTitle() {
  const matches = useMatches();

  // Lấy `handle` của route sâu nhất có khai báo tiêu đề.
  let title: string | undefined;
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const routeTitle = (matches[i].handle as RouteHandle | undefined)?.title;
    if (routeTitle) {
      title = routeTitle;
      break;
    }
  }

  useEffect(() => {
    document.title = title ? `${title} — MEMS` : DEFAULT_DOCUMENT_TITLE;
  }, [title]);

  return null;
}
