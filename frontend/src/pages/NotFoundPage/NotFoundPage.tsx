import { useNavigate } from 'react-router-dom';
import StatusScreen from '../../components/StatusScreen/StatusScreen';
import { useAuthStore } from '../../stores/authStore';

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
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const backendRoles = useAuthStore((s) => s.backendRoles);

  const isAdmin = isAuthenticated && backendRoles.includes('SUPER_ADMIN');

  return (
    <StatusScreen
      code="404"
      title="Không tìm thấy trang"
      description="Đường dẫn bạn truy cập không tồn tại hoặc đã được chuyển sang nơi khác. Bạn có thể quay lại trang quen thuộc để tiếp tục."
      action={{
        label: isAdmin ? 'Về trang tổng quan' : 'Về trang đăng nhập',
        onClick: () => navigate(isAdmin ? '/quan-tri' : '/dang-nhap'),
      }}
      fullHeight
    />
  );
}
