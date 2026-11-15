import { Button, Flex, Result, theme } from 'antd';
import type { ReactNode } from 'react';
import { layoutBackground } from '../../theme';

interface AppErrorScreenProps {
  status?: '403' | '404' | '500' | 'error' | 'warning';
  title: string;
  subTitle: ReactNode;
  /** Nút hành động — đặt trong `extra` của `Result`. */
  actions: ReactNode;
  /** Chi tiết kỹ thuật; caller chỉ truyền ở môi trường dev. */
  details?: string | null;
}

/**
 * Khung chung cho trang 404 và trang lỗi runtime.
 *
 * Dùng chung để hai màn không lệch giao diện, đồng thời mọi trang lỗi đều có
 * lối thoát ("Tải lại" / "Về trang chính") thay vì màn trắng.
 */
export default function AppErrorScreen({
  status = 'error',
  title,
  subTitle,
  actions,
  details,
}: AppErrorScreenProps) {
  const { token } = theme.useToken();

  return (
    <Flex
      align="center"
      justify="center"
      style={{ minHeight: '100vh', background: layoutBackground, padding: token.paddingLG }}
    >
      <Flex vertical gap={token.margin} style={{ maxWidth: 640, width: '100%' }}>
        <Result status={status} title={title} subTitle={subTitle} extra={actions} />
        {details ? (
          <details>
            <summary style={{ cursor: 'pointer', color: token.colorTextSecondary }}>
              Chi tiết kỹ thuật (chỉ hiện khi chạy dev)
            </summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: token.fontSizeSM }}>{details}</pre>
          </details>
        ) : null}
      </Flex>
    </Flex>
  );
}

/** Trang đích an toàn cho mọi vai trò sau lỗi/404. */
export function homePathFor(isAuthenticated: boolean, backendRoles: readonly string[]): string {
  return isAuthenticated && backendRoles.includes('SUPER_ADMIN') ? '/quan-tri' : '/dang-nhap';
}

interface AppErrorActionsProps {
  onHome: () => void;
  homeLabel?: string;
}

/** Hai nút chuẩn của mọi màn lỗi. */
export function AppErrorActions({ onHome, homeLabel = 'Về trang chính' }: AppErrorActionsProps) {
  return (
    <Flex gap="small" justify="center" wrap>
      <Button type="primary" onClick={() => window.location.reload()}>
        Tải lại
      </Button>
      <Button onClick={onHome}>{homeLabel}</Button>
    </Flex>
  );
}
