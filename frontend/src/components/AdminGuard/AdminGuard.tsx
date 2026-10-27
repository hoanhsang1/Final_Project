import { Button, Result } from 'antd';
import type { PropsWithChildren } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { MSG_ADM } from '../../features/admin/adminMessages';
import { useAuthStore } from '../../stores/authStore';

/**
 * Chặn route khu vực quản trị — `UC-ADMIN-01`.
 *
 * Thứ tự kiểm (quan trọng):
 * 1. Chưa đăng nhập → chuyển về `/dang-nhap`.
 * 2. Đã đăng nhập nhưng không phải `SUPER_ADMIN` → hiện 403 **tại chỗ**.
 * 3. Hợp lệ → render con.
 *
 * Vì sao cần bước 2: nếu chỉ ẩn menu, người dùng vẫn gõ thẳng URL vào được.
 * ⚠️ Ẩn UI KHÔNG phải bảo mật — BE vẫn phải chặn (`SUPER_ADMIN` trên cả 4 endpoint).
 * Guard chỉ để UX, không phải lớp bảo vệ.
 */
export default function AdminGuard({ children }: PropsWithChildren) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const navigate = useNavigate();

  // 1. Chưa đăng nhập.
  if (!isAuthenticated) {
    return <Navigate to="/dang-nhap" replace />;
  }

  // 2. Đã đăng nhập nhưng không có role quản trị.
  if (!backendRoles.includes('SUPER_ADMIN')) {
    return (
      <Result
        status="403"
        title="403"
        subTitle={MSG_ADM.NO_PERMISSION}
        extra={
          <Button type="primary" onClick={() => navigate('/dang-nhap')}>
            Về trang đăng nhập
          </Button>
        }
      />
    );
  }

  // 3. Hợp lệ.
  return <>{children}</>;
}
