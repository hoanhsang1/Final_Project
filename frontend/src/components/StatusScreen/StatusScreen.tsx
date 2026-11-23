import { Button, Heading, Text, VStack } from '@astryxdesign/core';
import { layoutBackground } from '../../theme';

export interface StatusScreenProps {
  /**
   * Nhãn trạng thái hiển thị phía trên tiêu đề (ví dụ "Không tìm thấy",
   * "Không có quyền truy cập"). Truyền mã HTTP (403/404) vẫn được hỗ trợ và sẽ
   * được chuyển thành nhãn tiếng Việt dễ hiểu cho người dùng.
   */
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

/** Nhãn thân thiện thay cho mã kỹ thuật (HTTP/…) để người dùng dễ hiểu. */
const FRIENDLY_CODE_LABEL: Record<string, string> = {
  '401': 'Phiên đăng nhập',
  '403': 'Truy cập bị hạn chế',
  '404': 'Không tìm thấy',
  '500': 'Đã xảy ra lỗi',
};

function displayCode(code: string): string {
  return FRIENDLY_CODE_LABEL[code] ?? code;
}

/**
 * Màn trạng thái 403/404/lỗi dùng chung.
 *
 * Không dùng thành phần trạng thái có hình minh hoạ SVG kèm nhãn tiếng Anh
 * trong cây trợ năng, vì trình đọc màn hình có thể đọc nhãn tiếng Anh trước nội
 * dung tiếng Việt (WCAG 3.1.1, 4.1.2). Ở đây chỉ có chữ: một `h1` tiếng Việt +
 * mô tả + nút — không SVG, không nhãn tiếng Anh.
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
        {displayCode(code)}
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
