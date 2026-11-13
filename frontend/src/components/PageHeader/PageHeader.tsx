import { Breadcrumb, Flex, Typography, theme } from 'antd';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const { Title, Text } = Typography;

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
 * Token-driven, Odoo-clean; tái dùng cho Lớp 2/3. Không hardcode màu/px.
 */
export default function PageHeader({ title, subtitle, breadcrumb, extra, children }: PageHeaderProps) {
  const { token } = theme.useToken();

  const breadcrumbItems = breadcrumb?.map((item, index) => ({
    key: `${index}-${typeof item.title === 'string' ? item.title : index}`,
    title: item.href ? <Link to={item.href}>{item.title}</Link> : item.title,
  }));

  return (
    <Flex vertical gap={token.marginXS} style={{ marginBottom: token.marginLG }}>
      {breadcrumbItems && breadcrumbItems.length > 0 && <Breadcrumb items={breadcrumbItems} />}
      <Flex
        align="flex-start"
        justify="space-between"
        wrap="wrap"
        gap={token.marginSM}
      >
        <Flex vertical gap={2} style={{ minWidth: 0, flex: '1 1 240px' }}>
          <Title
            level={1}
            style={{
              margin: 0,
              fontSize: 24,
              lineHeight: 1.3,
              fontWeight: 600,
              color: token.colorTextHeading,
            }}
          >
            {title}
          </Title>
          {subtitle ? (
            <Text style={{ fontSize: token.fontSize, color: token.colorTextSecondary }}>{subtitle}</Text>
          ) : null}
        </Flex>
        {extra ? <Flex gap={token.marginSM} align="center" wrap="wrap">{extra}</Flex> : null}
      </Flex>
      {children}
    </Flex>
  );
}
