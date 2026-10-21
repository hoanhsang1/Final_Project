import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onTokenRefreshed, onUnauthorized } from '../../lib/api';
import { syncSessionFromToken, useAuthStore } from '../../stores/authStore';

/**
 * Theo dõi phiên đăng nhập — ADR-FE-003 #3.
 *
 * Interceptor trong `lib/api.ts` nằm ngoài React nên không tự điều hướng được.
 * Khi refresh token thất bại, interceptor đã xoá token và gọi handler đăng ký ở đây:
 * xoá nốt phiên trong store + đưa người dùng về `/dang-nhap`.
 *
 * Khi refresh token THÀNH CÔNG, access token đổi mới → claim trong JWT có thể
 * khác (vd role bị thu hồi) → đồng bộ lại store để không giữ claim cũ.
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
    onTokenRefreshed(() => {
      syncSessionFromToken();
    });
    return () => {
      onUnauthorized(null);
      onTokenRefreshed(null);
    };
  }, [navigate, clearSession]);

  return null;
}
