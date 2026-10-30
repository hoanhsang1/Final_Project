import { Button, Result } from 'antd';
import type { PropsWithChildren } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { MSG_OWNER } from '../../features/owner/ownerMessages';
import { useAuthStore } from '../../stores/authStore';

/**
 * Chặn route khu vực quản lý tổ chức của Owner (`/to-chuc`).
 *
 * Thứ tự kiểm (quan trọng):
 * 1. Chưa đăng nhập → chuyển về `/dang-nhap`.
 * 2. Đã đăng nhập nhưng không phải Owner → hiện 403 **tại chỗ**.
 * 3. Hợp lệ → render con.
 *
 * Chấp nhận cả `OWNER` (mã hiện hành) lẫn `ORG_OWNER` (mã cũ trong seed) để tài
 * khoản tạo trước Sprint 3 không bị khoá ngoài.
 *
 * ⚠️ Guard chỉ để UX: quyền thật do PeopleService chặn bằng
 * `@PreAuthorize("hasRole('OWNER')")`. Ẩn UI KHÔNG phải bảo mật.
 */
export default function OwnerGuard({ children }: PropsWithChildren) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const navigate = useNavigate();

  // 1. Chưa đăng nhập.
  if (!isAuthenticated) {
    return <Navigate to="/dang-nhap" replace />;
  }

  // 2. Đã đăng nhập nhưng không phải chủ tổ chức.
  if (!backendRoles.includes('OWNER') && !backendRoles.includes('ORG_OWNER')) {
    return (
      <Result
        status="403"
        title="403"
        subTitle={MSG_OWNER.NO_PERMISSION}
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
