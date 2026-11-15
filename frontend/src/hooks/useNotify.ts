import { useToast } from '@astryxdesign/core';
import { useMemo } from 'react';

export interface Notify {
  /**
   * Báo một thao tác đã xong.
   *
   * Toast của Astryx chỉ có `info` và `error`, nên "thành công" đi qua `info` và
   * câu phải nêu rõ việc đã làm ("Đã sao chép…"). Khi kết quả còn hiện ngay trên
   * màn (lưu lớp, duyệt giáo viên), dùng `Banner status="success"` thay toast —
   * xem `docs/ui-conventions.md` mục 6.4.
   */
  success(text: string): void;
  error(text: string): void;
}

/**
 * Thay `App.useApp().message` của antd ở các màn Sprint 4.
 *
 * `useToast` của Astryx tự đọc nội dung qua live region (lỗi là `assertive`),
 * nên không cần thêm `LiveAnnouncer`/`role="status"` riêng như bản antd — bản
 * antd phải tự dựng vùng ẩn vì `message` chỉ là toast hình ảnh.
 */
export function useNotify(): Notify {
  const toast = useToast();

  return useMemo<Notify>(
    () => ({
      success(text: string) {
        toast({ body: text, type: 'info' });
      },
      error(text: string) {
        toast({ body: text, type: 'error' });
      },
    }),
    [toast],
  );
}
