import { Button, Result } from 'antd';
import type { PropsWithChildren } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePermission } from '../../hooks/usePermission';
import { MSG_S4 } from '../../features/sprint4/sprint4Messages';
import { useAuthStore } from '../../stores/authStore';

/**
 * Chặn trang quản lý chức vụ khi người dùng không có `position.manage`.
 * Quyền thật vẫn do PeopleService chặn.
 */
export default function PeopleEditGuard({ children }: PropsWithChildren) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { can } = usePermission();
  const navigate = useNavigate();

  if (!isAuthenticated) return <Navigate to="/dang-nhap" replace />;

  if (!can('position.manage')) {
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
