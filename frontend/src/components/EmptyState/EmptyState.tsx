import { Button, EmptyState as AstryxEmptyState } from '@astryxdesign/core';

export interface EmptyStateProps {
  /** Nói **việc cần làm**, không chỉ "Không có dữ liệu". */
  description: string;
  /** Hành động gợi ý (chỉ truyền khi người dùng có quyền thực hiện). */
  action?: { label: string; onClick: () => void };
  /** `true` khi đặt trong ô bảng — bố cục gọn, không giữ chiều cao tối thiểu. */
  compact?: boolean;
  /**
   * Cấp heading của câu rỗng. Mặc định 2 vì trang đã có H1; đặt 3 khi khối này
   * nằm trong một `DetailSection` (đã có H2) để heading không nhảy cấp.
   */
  headingLevel?: 2 | 3 | 4;
}

/**
 * Trạng thái rỗng dùng chung.
 *
 * `EmptyState` của Astryx tự đọc câu rỗng qua live region khi nó xuất hiện
 * (loading → empty vẫn được thông báo), nên không cần thêm `role="status"`.
 *
 * Không truyền `icon`: icon mặc định là hình minh hoạ chung chung, gặp ở mọi
 * app nên đọc ra ngay là template. Chữ + một hành động cụ thể hữu ích hơn.
 */
export default function EmptyState({
  description,
  action,
  compact,
  headingLevel = 2,
}: EmptyStateProps) {
  return (
    <AstryxEmptyState
      title={description}
      headingLevel={headingLevel}
      isCompact={compact}
      actions={
        action ? (
          <Button variant="ghost" size="lg" label={action.label} onClick={action.onClick} />
        ) : undefined
      }
    />
  );
}
