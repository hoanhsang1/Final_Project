import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import AppErrorScreen, { homePathFor } from '../../components/AppErrorScreen/AppErrorScreen';
import { useAuthStore } from '../../stores/authStore';

/**
 * Trang 404 dùng chung khung `AppErrorScreen` với lỗi runtime.
 *
 * - Có phiên `SUPER_ADMIN`: đưa về console `/quan-tri`.
 * - Còn lại: về `/dang-nhap`.
 *
 * Tiêu đề và nhãn nút giữ nguyên — `router.test` và e2e `ux-console.spec`
 * đang assert theo các chuỗi này.
 */
export default function NotFoundPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const backendRoles = useAuthStore((s) => s.backendRoles);

  const target = homePathFor(isAuthenticated, backendRoles);

  return (
    <AppErrorScreen
      status="404"
      title="Không tìm thấy trang"
      subTitle="Đường dẫn không tồn tại hoặc đã bị di chuyển."
      actions={
        <Button type="primary" onClick={() => navigate(target)}>
          {target === '/quan-tri' ? 'Về trang tổng quan' : 'Về trang đăng nhập'}
        </Button>
      }
    />
  );
}
