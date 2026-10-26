import { Button, Flex, Result, theme } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { layoutBackground } from '../../theme';

/**
 * Trang 404 — trước đây chỉ là một `<div>` không style, không lối thoát.
 *
 * - Có phiên `SUPER_ADMIN`: đưa về console `/quan-tri`.
 * - Còn lại: về `/dang-nhap` (kể cả khi đã đăng nhập vai trò khác — màn duy nhất
 *   mọi vai trò đều dùng được).
 *
 * Tiêu đề giữ đúng chuỗi "Không tìm thấy trang" — `router.test` và e2e
 * `ux-console.spec` đang assert theo chuỗi này.
 */
export default function NotFoundPage() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const backendRoles = useAuthStore((s) => s.backendRoles);

  const isAdmin = isAuthenticated && backendRoles.includes('SUPER_ADMIN');

  return (
    <Flex
      align="center"
      justify="center"
      style={{ minHeight: '100vh', background: layoutBackground, padding: token.paddingLG }}
    >
      <Result
        status="404"
        title="Không tìm thấy trang"
        subTitle="Đường dẫn không tồn tại hoặc đã bị di chuyển."
        extra={
          <Button type="primary" onClick={() => navigate(isAdmin ? '/quan-tri' : '/dang-nhap')}>
            {isAdmin ? 'Về trang tổng quan' : 'Về trang đăng nhập'}
          </Button>
        }
      />
    </Flex>
  );
}
