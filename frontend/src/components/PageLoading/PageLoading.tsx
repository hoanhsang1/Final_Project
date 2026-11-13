import { Flex, Spin, Typography, theme } from 'antd';
import { MSG_S4 } from '../../features/sprint4/sprint4Messages';

/**
 * Trạng thái đang tải cho trang chi tiết.
 *
 * Không dùng `<Spin tip>` một mình: antd 5 chỉ render `tip` khi Spin bọc nội
 * dung (nest pattern) hoặc `fullscreen`, nên tip sẽ mất và chỉ còn vòng xoay.
 * Ở đây chữ "Đang tải…" là text thật + `role="status"` để screen reader đọc.
 */
export default function PageLoading({ label = MSG_S4.LOADING }: { label?: string }) {
  const { token } = theme.useToken();

  return (
    <Flex
      vertical
      align="center"
      justify="center"
      gap={token.marginSM}
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{ minHeight: 200 }}
    >
      <Spin size="large" />
      <Typography.Text type="secondary">{label}</Typography.Text>
    </Flex>
  );
}
