import { Avatar, Card, Flex, theme, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { cardStyle, layoutBackground } from '../../theme';
import type { AuthCardProps, AuthTab } from './types';

const { Text, Title } = Typography;

interface TabDef {
  id: AuthTab;
  label: string;
  to: string;
}

/**
 * Hai tab phải là LIÊN KẾT thật (không phải state nội bộ) để nút Back của trình duyệt
 * quay về đúng tab trước đó.
 */
const TABS: readonly TabDef[] = [
  { id: 'login', label: 'Đăng nhập', to: '/dang-nhap' },
  { id: 'register', label: 'Đăng ký', to: '/dang-ky' },
];

export function AuthCard({ activeTab, title, subtitle, children }: AuthCardProps) {
  const { token } = theme.useToken();

  return (
    <Flex
      align="center"
      justify="center"
      style={{ minHeight: '100vh', background: layoutBackground, padding: token.paddingLG }}
    >
      <Card style={cardStyle} styles={{ body: { padding: token.paddingLG } }}>
        <Flex
          vertical
          align="center"
          gap={token.marginXXS}
          style={{ marginBottom: token.marginLG }}
        >
          <Avatar size="large" aria-hidden="true" style={{ backgroundColor: token.colorPrimary }}>
            M
          </Avatar>
          <Title level={3} style={{ margin: 0 }}>
            MEMS
          </Title>
          <Text type="secondary" style={{ textAlign: 'center' }}>
            Hệ thống Quản lý Giáo dục theo Module
          </Text>
        </Flex>

        <Flex
          component="nav"
          aria-label="Chuyển giữa đăng nhập và đăng ký"
          gap={token.marginXXS}
          style={{ marginBottom: token.marginLG }}
        >
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <Link
                key={tab.id}
                to={tab.to}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  paddingBlock: token.paddingXS,
                  paddingInline: token.paddingSM,
                  borderRadius: token.borderRadius,
                  fontWeight: isActive ? token.fontWeightStrong : undefined,
                  color: isActive ? token.colorPrimary : token.colorTextSecondary,
                  background: isActive ? token.colorPrimaryBg : undefined,
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </Flex>

        <Title level={4} style={{ marginTop: 0, marginBottom: token.marginXXS }}>
          {title}
        </Title>
        <Text type="secondary">{subtitle}</Text>

        <div style={{ marginTop: token.margin }}>{children}</div>
      </Card>
    </Flex>
  );
}
