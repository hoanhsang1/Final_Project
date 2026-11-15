import {
  BreadcrumbItem,
  Breadcrumbs,
  Heading,
  HStack,
  Stack,
  Text,
  VStack,
} from '@astryxdesign/core';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

export interface PageHeaderBreadcrumbItem {
  title: ReactNode;
  href?: string;
}

export interface PageHeaderProps {
  /** Tiêu đề trang — render thành H1 (mỗi trang chỉ một PageHeader H1). */
  title: ReactNode;
  subtitle?: ReactNode;
  breadcrumb?: PageHeaderBreadcrumbItem[];
  /** Vùng hành động chính/phụ (nút, liên kết). */
  extra?: ReactNode;
  /** Hàng phụ tùy chọn (bộ lọc/toolbar) dưới tiêu đề. */
  children?: ReactNode;
}

/**
 * Header trang dùng chung (Layer 1) — ngữ cảnh + tiêu đề H1 + hành động.
 *
 * Chỉ dùng token của Astryx: `Heading level={1}` = 24px (thang 12/14/17/20/24),
 * `Text type="body" color="secondary"` cho phụ đề. Không còn `theme.useToken()`
 * nên component này không cần `ConfigProvider` — nhờ vậy dùng được ở cả trang
 * đã port lẫn trang còn antd trong lúc chuyển tiếp.
 *
 * Breadcrumb cuối cùng là `isCurrent`: nó không phải liên kết, đúng ngữ nghĩa
 * "bạn đang ở đây" thay vì một link trỏ về chính trang hiện tại.
 */
export default function PageHeader({ title, subtitle, breadcrumb, extra, children }: PageHeaderProps) {
  const items = breadcrumb ?? [];

  return (
    <Stack direction="vertical" gap={2} style={{ marginBottom: 'var(--spacing-6)' }}>
      {items.length > 0 ? (
        <Breadcrumbs>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <BreadcrumbItem
                key={`${index}-${typeof item.title === 'string' ? item.title : index}`}
                as={item.href ? RouterLink : undefined}
                href={item.href}
                isCurrent={isLast}
              >
                {item.title}
              </BreadcrumbItem>
            );
          })}
        </Breadcrumbs>
      ) : null}

      <HStack align="start" justify="between" gap={3} wrap="wrap">
        <VStack gap={0.5} style={{ minWidth: 0, flex: '1 1 240px' }}>
          <Heading level={1}>{title}</Heading>
          {subtitle ? (
            <Text type="body" color="secondary" style={{ maxWidth: '76ch' }}>
              {subtitle}
            </Text>
          ) : null}
        </VStack>
        {extra ? (
          <HStack gap={3} align="center" wrap="wrap">
            {extra}
          </HStack>
        ) : null}
      </HStack>

      {children}
    </Stack>
  );
}
