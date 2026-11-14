import { Card, Flex, Grid, Typography, theme } from 'antd';
import { color, typeScale, weight } from '../../theme';
import type { AuthCardProps } from './types';

const { Text, Title } = Typography;

/**
 * Ba khu vực **thật** của sản phẩm.
 *
 * Trước đây panel này liệt kê ba "lợi ích": Quản lý tập trung / Linh hoạt theo
 * module / An toàn và minh bạch. Câu nào cũng đúng với mọi phần mềm, nên không
 * giúp người dùng biết mình đang đăng nhập vào đâu — và đó chính là dấu hiệu dễ
 * nhận nhất của nội dung do máy viết. Tên khu vực + việc nó làm thì kiểm chứng
 * được và chỉ đúng với hệ thống này.
 */
const AREAS: readonly { name: string; detail: string }[] = [
  { name: 'Quản trị hệ thống', detail: 'Tài khoản, vai trò, quyền theo module' },
  { name: 'Tổ chức', detail: 'Đơn vị, phòng ban, chức vụ' },
  { name: 'Đào tạo', detail: 'Giáo viên, lớp học, trạng thái lớp' },
];

function BrandPanel() {
  const { token } = theme.useToken();
  return (
    <>
      <div>
        <Flex align="center" gap={token.marginSM}>
          <Flex
            align="center"
            justify="center"
            aria-hidden="true"
            style={{
              width: 32,
              height: 32,
              flex: 'none',
              borderRadius: token.borderRadius,
              background: color.onBrandSubtle,
              color: color.onBrand,
              fontWeight: weight.strong,
              fontSize: typeScale.section,
            }}
          >
            M
          </Flex>
          <Flex vertical gap={2}>
            <Text
              style={{
                color: color.onBrand,
                fontWeight: weight.strong,
                fontSize: typeScale.section,
                lineHeight: 1.2,
              }}
            >
              MEMS
            </Text>
            {/* Câu thường, không ALL-CAPS: chữ hoa toàn bộ ở cỡ 12px đọc chậm hơn
                và là mốt của landing page, không phải của phần mềm nghiệp vụ. */}
            <Text style={{ color: color.onBrandMuted, fontSize: typeScale.caption }}>
              Quản lý giáo dục theo module
            </Text>
          </Flex>
        </Flex>

        <Title
          level={2}
          style={{
            color: color.onBrand,
            fontSize: typeScale.h1,
            lineHeight: 1.25,
            fontWeight: weight.strong,
            letterSpacing: '-0.02em',
            marginTop: token.marginXL,
            marginBottom: token.marginSM,
            maxWidth: '18ch',
          }}
        >
          Quản trị nhà trường trên một hệ thống.
        </Title>
        <Text style={{ color: color.onBrandMuted, fontSize: typeScale.body }}>
          Đăng nhập bằng tài khoản do quản trị viên tổ chức cấp.
        </Text>

        <dl
          style={{
            margin: 0,
            marginTop: token.marginXL,
            display: 'grid',
            gap: token.margin,
          }}
        >
          {AREAS.map((area) => (
            <div key={area.name}>
              <dt
                style={{
                  color: color.onBrand,
                  fontSize: typeScale.body,
                  fontWeight: weight.medium,
                }}
              >
                {area.name}
              </dt>
              <dd style={{ margin: 0, color: color.onBrandMuted, fontSize: typeScale.body }}>
                {area.detail}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <Text style={{ color: color.onBrandMuted, fontSize: typeScale.caption }}>
        © 2026 MEMS · Hệ thống Quản lý Giáo dục theo Module
      </Text>
    </>
  );
}

/**
 * Khung auth dùng chung (Layer 2, tương thích ngược):
 * - `variant='card'` (mặc định): panel brand trái (≥lg) + Card trắng phải — Register/Forgot/Reset.
 * - `variant='split'`: hero trái + nội dung phải full-viewport, không bọc Card — Login.
 * Token-driven, responsive; không hardcode màu brand ngoài token/theme.
 */
export function AuthCard({
  activeTab,
  title,
  subtitle,
  children,
  hero,
  variant = 'card',
  rightMaxWidth,
}: AuthCardProps) {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const isWide = Boolean(screens.lg);
  const left = hero ?? <BrandPanel />;

  if (variant === 'split') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: token.colorBgLayout,
          display: isWide ? 'grid' : 'block',
          gridTemplateColumns: isWide ? 'minmax(320px, 420px) 1fr' : undefined,
        }}
      >
        {isWide && (
          <Flex
            component="aside"
            aria-label="Giới thiệu MEMS"
            vertical
            justify="space-between"
            style={{
              minHeight: '100vh',
              padding: token.paddingXL,
              background: color.brand,
              color: token.colorWhite,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {left}
          </Flex>
        )}
        <div
          style={{
            minWidth: 0,
            minHeight: '100vh',
            padding: isWide ? token.paddingXL : token.padding,
            overflow: 'auto',
          }}
        >
          <div style={{ width: '100%', maxWidth: rightMaxWidth ?? '100%', margin: '0 auto' }}>{children}</div>
        </div>
      </div>
    );
  }

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
          {left}
        </Flex>
      )}

      <Flex
        align="center"
        justify="center"
        style={{ flex: 1, paddingBlock: token.paddingXL, paddingInline: token.padding }}
      >
        <Card
          style={{
            width: '100%',
            maxWidth: cardMaxWidth,
            borderRadius: token.borderRadiusLG,
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
            <Text strong style={{ fontSize: typeScale.section }}>
              MEMS
            </Text>
          </Flex>

          <Title level={1} style={{ marginTop: 0, marginBottom: token.marginXXS, lineHeight: 1.3 }}>
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
