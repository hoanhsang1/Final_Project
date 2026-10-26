import { useEffect, useState } from 'react';

/**
 * Theo dõi 1 media query — dùng để biết lúc nào `Sider` của console bị antd ẩn.
 *
 * Không thêm dependency (`react-responsive`/`usehooks-ts`): chỉ cần đúng 1 điều
 * kiện ở đây nên viết thẳng bằng `matchMedia`. Giá trị khởi tạo đọc đồng bộ từ
 * `window.matchMedia` nên lần render đầu đã đúng, không bị nháy menu trên desktop.
 *
 * @param query Chuỗi media query hợp lệ, ví dụ `'(min-width: 1024px)'`.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener('change', handleChange);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}
