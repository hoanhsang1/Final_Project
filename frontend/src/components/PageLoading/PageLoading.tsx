import { Skeleton, VisuallyHidden, VStack } from '@astryxdesign/core';
import { MSG_S4 } from '../../features/sprint4/sprint4Messages';

/**
 * Trạng thái đang tải cho trang chi tiết.
 *
 * Dùng skeleton theo bố cục (khung xương) thay vì vòng xoay giữa màn: người
 * dùng thấy trước hình dạng nội dung sẽ hiện ra nên không bị "nhảy" layout, và
 * mắt không phải chờ một vòng xoay vô nghĩa. Chữ "Đang tải…" vẫn còn cho
 * screen reader (`role="status"`), chỉ ẩn khỏi màn hình.
 *
 * `Skeleton` của Astryx là **một** khối (không có bộ khung dựng sẵn), nên khung
 * xương được xếp từ nhiều khối: 3 dòng tiêu đề/phụ đề rồi 6 dòng nội dung.
 */
export default function PageLoading({ label = MSG_S4.LOADING }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <VisuallyHidden>{label}</VisuallyHidden>
      <div aria-hidden="true">
        <VStack gap={6}>
          <VStack gap={2}>
            <Skeleton width="32%" height={20} radius={1} />
            <Skeleton width="68%" height={14} radius={1} />
            <Skeleton width="44%" height={14} radius={1} />
          </VStack>
          <VStack gap={2}>
            <Skeleton width="22%" height={20} radius={1} />
            <Skeleton height={14} radius={1} />
            <Skeleton height={14} radius={1} />
            <Skeleton width="88%" height={14} radius={1} />
            <Skeleton height={14} radius={1} />
            <Skeleton width="72%" height={14} radius={1} />
          </VStack>
        </VStack>
      </div>
    </div>
  );
}
