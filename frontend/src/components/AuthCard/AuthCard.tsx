import { Card, Heading, HStack, Text, VStack } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import type { AuthCardProps } from './types';
import './AuthCard.css';

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
  return (
    <>
      <div>
        <HStack gap={3} align="center">
          <div className="mems-auth__mark" aria-hidden="true">
            M
          </div>
          <div>
            <Text type="large" weight="semibold" color="inherit" display="block">
              MEMS
            </Text>
            {/* Câu thường, không ALL-CAPS: chữ hoa toàn bộ ở cỡ 12px đọc chậm hơn
                và là mốt của landing page, không phải của phần mềm nghiệp vụ. */}
            <Text
              type="supporting"
              color="inherit"
              display="block"
              className="mems-auth__on-brand-muted"
            >
              Quản lý giáo dục theo module
            </Text>
          </div>
        </HStack>

        <Heading level={2} type="display-3" color="inherit" className="mems-auth__brand-title">
          Quản trị nhà trường trên một hệ thống.
        </Heading>
        <Text type="body" color="inherit" className="mems-auth__on-brand-muted">
          Đăng nhập bằng tài khoản do quản trị viên tổ chức cấp.
        </Text>

        <dl className="mems-auth__areas">
          {AREAS.map((area) => (
            <div key={area.name}>
              <dt>{area.name}</dt>
              <dd className="mems-auth__on-brand-muted">{area.detail}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Text type="supporting" color="inherit" className="mems-auth__on-brand-muted">
        © 2026 MEMS · Hệ thống Quản lý Giáo dục theo Module
      </Text>
    </>
  );
}

/**
 * Khung auth dùng chung:
 * - `variant='card'` (mặc định): panel brand trái (≥1024px) + Card trắng phải — Register/Forgot/Reset.
 * - `variant='split'`: hero trái + nội dung phải full-viewport, không bọc Card — Login.
 *
 * `useMediaQuery` thay cho `Grid.useBreakpoint` của antd: cùng một query
 * `min-width: 1024px` với breakpoint `lg` của Astryx, và ở jsdom (không có
 * `matchMedia`) nó trả `false` nên panel thương hiệu không render trong unit test.
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
  const isWide = useMediaQuery('(min-width: 1024px)');
  const left = hero ?? <BrandPanel />;

  const aside = isWide ? (
    <aside className="mems-auth__aside" aria-label="Giới thiệu MEMS">
      <div className="mems-auth__aside-inner">{left}</div>
    </aside>
  ) : null;

  if (variant === 'split') {
    return (
      <div className={isWide ? 'mems-auth mems-auth--split' : 'mems-auth'}>
        {aside}
        <main className="mems-auth__main">
          <div style={{ width: '100%', maxWidth: rightMaxWidth ?? '100%', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={isWide ? 'mems-auth mems-auth--card' : 'mems-auth'}>
      {aside}
      <main className="mems-auth__main mems-auth__main--center">
        <Card
          className={
            activeTab === 'register' ? 'mems-auth__card mems-auth__card--wide' : 'mems-auth__card'
          }
          padding={isWide ? 6 : 4}
        >
          <VStack gap={4}>
            <div>
              <div className="mems-auth__card-head">
                <div className="mems-auth__mark" aria-hidden="true">
                  M
                </div>
                <Text weight="semibold" type="large">
                  MEMS
                </Text>
              </div>

              <Heading level={1}>{title}</Heading>
              {subtitle && (
                <Text
                  type="body"
                  color="secondary"
                  display="block"
                  style={{ marginTop: 'var(--spacing-1)' }}
                >
                  {subtitle}
                </Text>
              )}
            </div>

            {children}

            <Text type="supporting" color="secondary" display="block" className="mems-auth__card-footnote">
              Cần hỗ trợ đăng nhập? Liên hệ quản trị viên hệ thống.
            </Text>
          </VStack>
        </Card>
      </main>
    </div>
  );
}
