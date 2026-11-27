import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiCode } from '../../features/platform/errorCodes';
import { apiClient, onTokenRefreshed, onUnauthorized } from '../../lib/api';
import { syncSessionFromToken, useAuthStore } from '../../stores/authStore';
import ForcePasswordChangeModal from '../ForcePasswordChangeModal/ForcePasswordChangeModal';

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
 * Ngoài ra, component đăng ký MỘT response interceptor riêng để nhận mã lỗi
 * `PASSWORD_CHANGE_REQUIRED` (CHUỖI) từ bất kỳ request nào, bật cờ bắt đổi mật
 * khẩu và mount modal cưỡng chế. ⚠️ Không sửa luồng 401/refresh trong `lib/api.ts`.
 */
export default function SessionWatcher() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((s) => s.clearSession);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);

  useEffect(() => {
    onUnauthorized(() => {
      clearSession();
      navigate('/dang-nhap', { replace: true });
    });
    onTokenRefreshed(() => {
      syncSessionFromToken();
    });

    // Interceptor bổ sung: chỉ nhận code DẠNG CHUỖI. Số 1006 ở backend KHÔNG
    // phải mã FE dùng → getApiCode() trả undefined → không mở nhầm modal.
    const passwordInterceptor = apiClient.interceptors.response.use(undefined, (error: unknown) => {
      if (getApiCode(error) === 'PASSWORD_CHANGE_REQUIRED') {
        useAuthStore.getState().requirePasswordChange();
      }
      // Luôn trả lỗi lại cho caller — interceptor này chỉ "nghe", không nuốt lỗi.
      return Promise.reject(error);
    });

    return () => {
      apiClient.interceptors.response.eject(passwordInterceptor);
      onUnauthorized(null);
      onTokenRefreshed(null);
    };
  }, [navigate, clearSession]);

  if (mustChangePassword) {
    return <ForcePasswordChangeModal />;
  }

  return null;
}
