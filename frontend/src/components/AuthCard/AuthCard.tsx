import { Card, Flex, Grid, Typography, theme } from 'antd';
import type { ReactNode } from 'react';
import { color, typeScale } from '../../theme';
import type { AuthCardProps } from './types';

const { Text, Title } = Typography;

/** Nội dung panel thương hiệu bên trái — lấy từ frame `02/03` của Figma. */
const FEATURES: readonly { icon: ReactNode; title: string; description: string }[] = [
  {
    icon: <GridIcon />,
    title: 'Quản lý tập trung',
    description: 'Dữ liệu tổ chức và vận hành trên một hệ thống.',
  },
  {
    icon: <ModuleIcon />,
    title: 'Linh hoạt theo module',
    description: 'Chọn công cụ phù hợp với nhu cầu của đơn vị.',
  },
  {
    icon: <ShieldIcon />,
    title: 'An toàn và minh bạch',
    description: 'Quy trình xác thực rõ ràng, trạng thái dễ theo dõi.',
  },
];

/** Icon vẽ bằng SVG thuần — repo không khai báo `@ant-design/icons`. */
function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="5" height="5" rx="1.2" />
      <rect x="9" y="2" width="5" height="5" rx="1.2" />
      <rect x="2" y="9" width="5" height="5" rx="1.2" />
      <rect x="9" y="9" width="5" height="5" rx="1.2" />
    </svg>
  );
}

function ModuleIcon() {
  return (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M8 2 14 5.2 8 8.4 2 5.2 8 2Z" />
      <path d="M2 8.4 8 11.6l6-3.2" />
      <path d="M2 11.4 8 14.6l6-3.2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 16 16" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M8 1.8 13.2 3.8v4.3c0 3-2.1 5.2-5.2 6.1-3.1-.9-5.2-3.1-5.2-6.1V3.8L8 1.8Z" />
      <path d="m5.9 7.9 1.5 1.5 2.8-2.9" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Khung hai màn Đăng nhập / Đăng ký — dựng theo frame `03 · Login UI` và
 * `02 · Organization Registration UI` của Figma:
 * - **≥992px**: panel thương hiệu bên trái (nền Brand/600) + card trắng bên phải.
 * - **<992px**: ẩn panel, card chiếm toàn bộ chiều rộng (mobile-first, 320px vẫn dùng được).
 */
export function AuthCard({ activeTab, title, subtitle, children }: AuthCardProps) {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const isWide = Boolean(screens.lg);

  const cardMaxWidth = activeTab === 'register' ? 720 : 520;

  return (
    <Flex style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      {isWide && (
        <Flex
          component="aside"
          aria-label="Giới thiệu MEMS"
          vertical
          justify="space-between"
          style={{
            width: 420,
            flex: '0 0 420px',
            padding: token.paddingXL,
            background: color.brand,
            color: token.colorWhite,
          }}
        >
          <div>
            <Flex align="center" gap={token.marginSM}>
              <Flex
                align="center"
                justify="center"
                aria-hidden="true"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: token.borderRadiusLG,
                  background: 'rgba(255, 255, 255, 0.16)',
                  fontWeight: token.fontWeightStrong,
                  fontSize: typeScale.section,
                }}
              >
                M
              </Flex>
              <Flex vertical>
                <Text style={{ color: token.colorWhite, fontWeight: 700, fontSize: typeScale.section }}>
                  MEMS
                </Text>
                <Text
                  style={{
                    color: 'rgba(255, 255, 255, 0.72)',
                    fontSize: typeScale.caption,
                    letterSpacing: 1.2,
                  }}
                >
                  EDUCATION MANAGEMENT
                </Text>
              </Flex>
            </Flex>

            <Title
              level={2}
              style={{
                color: token.colorWhite,
                fontSize: typeScale.hero - 6,
                lineHeight: 1.15,
                marginTop: token.marginXL,
                marginBottom: token.marginSM,
              }}
            >
              Quản lý giáo dục,
              <br />
              đơn giản hơn mỗi ngày
            </Title>
            <Text style={{ color: 'rgba(255, 255, 255, 0.78)', fontSize: typeScale.body }}>
              Kết nối quy trình, dữ liệu và đội ngũ trong một nền tảng thống nhất.
            </Text>

            <Flex vertical gap={token.margin} style={{ marginTop: token.marginXL }}>
              {FEATURES.map((feature) => (
                <Flex key={feature.title} align="start" gap={token.marginSM}>
                  <Flex
                    align="center"
                    justify="center"
                    aria-hidden="true"
                    style={{
                      width: 36,
                      height: 36,
                      flex: '0 0 36px',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.16)',
                      fontSize: typeScale.body,
                    }}
                  >
                    {feature.icon}
                  </Flex>
                  <div>
                    <Text style={{ display: 'block', color: token.colorWhite, fontWeight: 600 }}>
                      {feature.title}
                    </Text>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.72)', fontSize: 14 }}>
                      {feature.description}
                    </Text>
                  </div>
                </Flex>
              ))}
            </Flex>
          </div>

          <Text style={{ color: 'rgba(255, 255, 255, 0.64)', fontSize: typeScale.caption }}>
            © 2026 MEMS · Hệ thống Quản lý Giáo dục theo Module
          </Text>
        </Flex>
      )}

      <Flex
        align="center"
        justify="center"
        style={{
          flex: 1,
          paddingBlock: token.paddingXL,
          paddingInline: token.padding,
        }}
      >
        <Card
          style={{
            width: '100%',
            maxWidth: cardMaxWidth,
            borderRadius: 20,
            borderColor: token.colorBorderSecondary,
            boxShadow: token.boxShadow,
          }}
          styles={{ body: { padding: isWide ? token.paddingXL : token.paddingLG } }}
        >
          <Flex align="center" gap={token.marginXS} style={{ marginBottom: token.margin }}>
            <Flex
              align="center"
              justify="center"
              aria-hidden="true"
              style={{
                width: 32,
                height: 32,
                borderRadius: token.borderRadius,
                background: token.colorPrimary,
                color: token.colorWhite,
                fontWeight: token.fontWeightStrong,
                fontSize: typeScale.body,
              }}
            >
              M
            </Flex>
            {/* Logo/brand — không phải heading để `<h1>` của trang là tiêu đề màn hình. */}
            <Text strong style={{ fontSize: typeScale.section }}>
              MEMS
            </Text>
          </Flex>

          <Title
            level={1}
            style={{
              marginTop: 0,
              marginBottom: token.marginXXS,
              lineHeight: 1.3,
            }}
          >
            {title}
          </Title>
          {subtitle && (
            <Text type="secondary" style={{ fontSize: typeScale.body }}>
              {subtitle}
            </Text>
          )}

          <div style={{ marginTop: token.margin }}>{children}</div>

          <Text
            type="secondary"
            style={{
              display: 'block',
              marginTop: token.marginLG,
              fontSize: typeScale.caption,
              textAlign: 'center',
            }}
          >
            Cần hỗ trợ đăng nhập? Liên hệ quản trị viên hệ thống.
          </Text>
        </Card>
      </Flex>
    </Flex>
  );
}
