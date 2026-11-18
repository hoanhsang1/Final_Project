import { Button, Heading, Text, VStack } from '@astryxdesign/core';
import { layoutBackground } from '../../theme';

export interface StatusScreenProps {
  /** Mã trạng thái hiển thị nhỏ phía trên tiêu đề — ví dụ `"403"`, `"404"`. */
  code: string;
  /** Tiêu đề chính, render bằng `h1` để màn luôn có heading cấp 1. */
  title: string;
  /** Mô tả ngắn dưới tiêu đề (không bắt buộc). */
  description?: string;
  /** Nhãn + hành động của nút chính. */
  action: { label: string; onClick: () => void };
  /**
   * `true` khi đây là **toàn bộ** nội dung trang (403/404): canh giữa theo chiều
   * dọc trong viewport và tô nền trang. `false` khi khối nằm trong khung có sẵn
   * (màn xem thử vai trò bọc trong `Card`).
   */
  fullHeight?: boolean;
}

/**
 * Màn trạng thái 403/404 dùng chung.
 *
 * Vì sao KHÔNG dùng `Result` của antd: hình minh hoạ của `Result` là một SVG có
 * `<title>` **tiếng Anh** ("Unauthorized", "No Found") nằm trong cây trợ năng →
 * trình đọc màn hình đọc chữ tiếng Anh trước nội dung tiếng Việt (WCAG 3.1.1,
 * 4.1.2); ngoài ra `Result` không tạo heading nào. Ở đây chỉ có chữ: một `h1`
 * tiếng Việt + mô tả + nút — không SVG, không chữ tiếng Anh.
 */
export default function StatusScreen({
  code,
  title,
  description,
  action,
  fullHeight = false,
}: StatusScreenProps) {
  const block = (
    <VStack gap={3} align="center" maxWidth={420}>
      <Text type="supporting" color="secondary" justify="center">
        {code}
      </Text>
      <Heading level={1} justify="center">
        {title}
      </Heading>
      {description && (
        <Text type="body" color="secondary" display="block" justify="center">
          {description}
        </Text>
      )}
      <Button variant="primary" size="lg" label={action.label} onClick={action.onClick} />
    </VStack>
  );

  if (!fullHeight) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 24px' }}>{block}</div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: layoutBackground,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      {block}
    </div>
  );
}
