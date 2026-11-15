import { Banner } from '@astryxdesign/core';
import { MSG_S4 } from '../../features/sprint4/sprint4Messages';

/**
 * Trạng thái "không có quyền" (một trong 5 state bắt buộc).
 *
 * `role="status"` (không phải `alert`) vì đây là kết quả của việc mở trang, không
 * phải sự cố bất ngờ cần cắt ngang. Banner đặt `role` lên đúng khối chữ, nên
 * trình đọc màn hình đọc được lý do mà không kéo theo nút đóng.
 */
export default function ForbiddenNotice({ title = MSG_S4.NO_PERMISSION }: { title?: string }) {
  return (
    <Banner
      status="warning"
      title={title}
      description={MSG_S4.NO_PERMISSION_HINT}
      collapsible={false}
      role="status"
    />
  );
}
