import { Divider, Heading, HStack, Text, VStack } from '@astryxdesign/core';
import type { ReactNode } from 'react';

export interface DetailSectionProps {
  /** Tiêu đề khối — render thành H2 để không phá cấu trúc heading của trang. */
  title: ReactNode;
  /** Một câu mô tả ngắn (tuỳ chọn). Đừng lặp lại tiêu đề. */
  description?: ReactNode;
  /** Hành động của riêng khối (tối đa 1 nút, thường là `variant="ghost"`). */
  extra?: ReactNode;
  children: ReactNode;
}

/**
 * Khối nội dung trong trang chi tiết: `h2` + hairline, **không** dùng `Card`.
 *
 * Lý do: trang chi tiết lớp/giáo viên có 4–6 nhóm thông tin. Bọc mỗi nhóm bằng
 * một `Card` sinh ra "card kit" — mọi khối cùng bo góc, cùng đổ bóng, không
 * khối nào quan trọng hơn khối nào. Hairline + khoảng trắng phân cấp rẻ hơn và
 * đọc nhanh hơn, đúng quy ước `docs/ui-conventions.md` mục 4.
 *
 * `Heading level={2}` = 20px theo thang v2 (bản trước dùng cỡ 16px cho tiêu đề
 * khối — mốc không còn trong thang hiện tại, nên giữ theo thang mới).
 */
export default function DetailSection({
  title,
  description,
  extra,
  children,
}: DetailSectionProps) {
  return (
    <section style={{ marginBottom: 'var(--spacing-8)' }}>
      <HStack align="start" justify="between" gap={3} wrap="wrap">
        <VStack gap={0.5} style={{ minWidth: 0 }}>
          <Heading level={2}>{title}</Heading>
          {description ? (
            <Text type="body" color="secondary">
              {description}
            </Text>
          ) : null}
        </VStack>
        {extra}
      </HStack>
      <Divider variant="subtle" style={{ marginBlock: 'var(--spacing-2)' }} />
      {children}
    </section>
  );
}
