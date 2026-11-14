import { Skeleton } from 'antd';
import type { CSSProperties } from 'react';
import { MSG_S4 } from '../../features/sprint4/sprint4Messages';

/** Ẩn khỏi màn hình nhưng vẫn cho screen reader đọc. */
const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * Trạng thái đang tải cho trang chi tiết.
 *
 * Dùng skeleton theo bố cục (khung xương) thay vì vòng xoay giữa màn: người
 * dùng thấy trước hình dạng nội dung sẽ hiện ra nên không bị "nhảy" layout, và
 * mắt không phải chờ một vòng xoay vô nghĩa. Chữ "Đang tải…" vẫn còn cho
 * screen reader (`role="status"`), chỉ ẩn khỏi màn hình.
 */
export default function PageLoading({ label = MSG_S4.LOADING }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span style={visuallyHidden}>{label}</span>
      <div aria-hidden="true">
        <Skeleton
          active
          title={{ width: '32%' }}
          paragraph={{ rows: 2, width: ['68%', '44%'] }}
          style={{ marginBottom: 32 }}
        />
        <Skeleton active title={{ width: '22%' }} paragraph={{ rows: 6 }} />
      </div>
    </div>
  );
}
