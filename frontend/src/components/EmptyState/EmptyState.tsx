import { Button, Empty, Flex, theme } from 'antd';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /** Nói **việc cần làm**, không chỉ "Không có dữ liệu". */
  description: ReactNode;
  /** Hành động gợi ý (chỉ truyền khi người dùng có quyền thực hiện). */
  action?: { label: string; onClick: () => void };
  /** `true` khi đặt trong ô bảng — bỏ min-height để hàng không cao bất thường. */
  compact?: boolean;
}

/**
 * Trạng thái rỗng dùng chung.
 *
 * Dùng `PRESENTED_IMAGE_SIMPLE` thay vì ảnh mặc định của antd: ảnh mặc định là
 * hình minh hoạ generic, xuất hiện ở mọi app dùng antd nên đọc ra ngay là
 * template. Chữ + một hành động cụ thể hữu ích hơn một hình vẽ.
 */
export default function EmptyState({ description, action, compact }: EmptyStateProps) {
  const { token } = theme.useToken();

  return (
    <Flex
      vertical
      align="center"
      justify="center"
      gap={token.marginXS}
      style={{ minHeight: compact ? undefined : 220, paddingBlock: token.paddingMD }}
    >
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={<span style={{ color: token.colorTextSecondary }}>{description}</span>}
        style={{ margin: 0 }}
      />
      {action ? (
        <Button type="link" size="small" onClick={action.onClick} style={{ paddingInline: 0 }}>
          {action.label}
        </Button>
      ) : null}
    </Flex>
  );
}
