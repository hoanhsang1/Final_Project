import { Button, Result } from 'antd';
import type { PropsWithChildren } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { canAccessAcademicArea } from '../../features/auth/permissions';
import { MSG_S4 } from '../../features/sprint4/sprint4Messages';
import { useAuthStore } from '../../stores/authStore';

/**
 * Chặn route khu vực đào tạo (`/dao-tao`) — Sprint 4 (option B).
 * Cho phép: OWNER/ORG_OWNER hoặc user có permission PEOPLE_* / CLASS_*.
 * ⚠️ Chỉ UX; quyền thật do backend chặn.
 */
export default function AcademicGuard({ children }: PropsWithChildren) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const navigate = useNavigate();

  if (!isAuthenticated) return <Navigate to="/dang-nhap" replace />;

  if (!canAccessAcademicArea({ backendRoles, permissions })) {
    return (
      <Result
        status="403"
        title="403"
        subTitle={MSG_S4.NO_PERMISSION}
        extra={
          <Button type="primary" onClick={() => navigate('/dang-nhap')}>
            Về trang đăng nhập
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
