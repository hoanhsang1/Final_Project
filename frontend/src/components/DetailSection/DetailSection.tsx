import { Flex, Typography, theme } from 'antd';
import type { ReactNode } from 'react';
import { typeScale, weight } from '../../theme';

const { Title, Text } = Typography;

export interface DetailSectionProps {
  /** Tiêu đề khối — render thành H2 để không phá cấu trúc heading của trang. */
  title: ReactNode;
  /** Một câu mô tả ngắn (tuỳ chọn). Đừng lặp lại tiêu đề. */
  description?: ReactNode;
  /** Hành động của riêng khối (tối đa 1 nút, thường là `type="text"`). */
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
 */
export default function DetailSection({
  title,
  description,
  extra,
  children,
}: DetailSectionProps) {
  const { token } = theme.useToken();

  return (
    <section style={{ marginBottom: token.marginXL }}>
      <Flex
        align="baseline"
        justify="space-between"
        gap={token.marginSM}
        style={{
          paddingBottom: token.paddingXS,
          marginBottom: token.margin,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Flex vertical gap={2} style={{ minWidth: 0 }}>
          <Title
            level={2}
            style={{
              margin: 0,
              fontSize: typeScale.section,
              lineHeight: 1.4,
              fontWeight: weight.strong,
              letterSpacing: '-0.01em',
              color: token.colorTextHeading,
            }}
          >
            {title}
          </Title>
          {description ? (
            <Text style={{ fontSize: typeScale.body, color: token.colorTextSecondary }}>
              {description}
            </Text>
          ) : null}
        </Flex>
        {extra}
      </Flex>
      {children}
    </section>
  );
}
