import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onUnauthorized } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

/**
 * Theo dõi phiên đăng nhập — ADR-FE-003 #3.
 *
 * Interceptor trong `lib/api.ts` nằm ngoài React nên không tự điều hướng được.
 * Khi refresh token thất bại, interceptor đã xoá token và gọi handler đăng ký ở đây:
 * xoá nốt phiên trong store + đưa người dùng về `/dang-nhap`.
 *
 * Component không render gì — chỉ là "đầu nối" giữa interceptor và router.
 */
export default function SessionWatcher() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    onUnauthorized(() => {
      clearSession();
      navigate('/dang-nhap', { replace: true });
    });
    return () => onUnauthorized(null);
  }, [navigate, clearSession]);

  return null;
}
