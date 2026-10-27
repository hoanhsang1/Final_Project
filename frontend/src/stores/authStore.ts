import { create } from 'zustand';
import { clearTokens, getAccessToken, setTokens } from '../lib/api';
import type { LoginResponse } from '../features/auth/types';
import type { RoleId } from '../features/auth/roles';
import { mapBackendRole } from '../features/auth/backendRoles';
import { decodeJwtClaims, isTokenExpired, normalizeRoles } from '../features/auth/jwt';

/**
 * Phiên đăng nhập phía client (Zustand — client state).
 *
 * Chỉ giữ những thứ UI cần để hiển thị/điều hướng: ai đang đăng nhập, vai trò nào.
 * KHÔNG nhét dữ liệu server vào đây (server state → TanStack Query).
 *
 * Token thật nằm ở localStorage (ADR-FE-003) để sống sót qua reload trang;
 * store chỉ đọc lại khi khởi tạo.
 */
interface AuthSession {
  userId: string | null;
  username: string | null;
  /** Slug vai trò phía FE, đã ánh xạ từ role backend. */
  role: RoleId | null;
  /**
   * Danh sách role backend GỐC lấy từ JWT (vd: `["SUPER_ADMIN"]`).
   *
   * Giữ riêng vì `role` chỉ chứa MỘT slug đã ánh xạ — không đủ để chặn quyền:
   * tài khoản có nhiều role sẽ bị mất thông tin. Guard khu vực quản trị kiểm
   * `backendRoles.includes('SUPER_ADMIN')`.
   */
  backendRoles: string[];
  isAuthenticated: boolean;
  setSession: (res: LoginResponse) => void;
  clearSession: () => void;
}

/**
 * Khôi phục phiên từ localStorage khi app khởi động (reload trang không bị đá ra).
 *
 * Token đã hết hạn → coi như chưa đăng nhập, tránh hiện "nháy" console quản trị
 * rồi mới bị đá ra khi API trả 401.
 */
function restoreSession(): Pick<
  AuthSession,
  'userId' | 'username' | 'role' | 'backendRoles' | 'isAuthenticated'
> {
  const token = getAccessToken();
  if (!token || isTokenExpired(token)) {
    return { userId: null, username: null, role: null, backendRoles: [], isAuthenticated: false };
  }
  const payload = decodeJwtClaims(token);
  const roles = normalizeRoles(payload.roles);
  return {
    userId: payload.userId ?? null,
    username: payload.username ?? null,
    role: mapBackendRole(roles),
    backendRoles: roles,
    isAuthenticated: true,
  };
}

export const useAuthStore = create<AuthSession>((set) => ({
  ...restoreSession(),
  setSession: (res) => {
    // Lưu token vào localStorage để sống sót qua reload.
    setTokens(res.accessToken, res.refreshToken);
    const payload = decodeJwtClaims(res.accessToken);
    const roles = normalizeRoles(payload.roles);
    set({
      userId: payload.userId ?? null,
      username: payload.username ?? null,
      role: mapBackendRole(roles),
      backendRoles: roles,
      isAuthenticated: true,
    });
  },
  clearSession: () => {
    clearTokens();
    set({
      userId: null,
      username: null,
      role: null,
      backendRoles: [],
      isAuthenticated: false,
    });
  },
}));

/**
 * Đồng bộ lại phiên từ access token trong localStorage.
 *
 * Gọi sau khi interceptor refresh token thành công: JWT mới có thể mang claim
 * khác (vd role bị thu hồi) → store phải theo kịp, không giữ claim cũ.
 */
export function syncSessionFromToken(): void {
  const token = getAccessToken();
  if (!token) {
    useAuthStore.getState().clearSession();
    return;
  }
  const payload = decodeJwtClaims(token);
  const roles = normalizeRoles(payload.roles);
  useAuthStore.setState({
    userId: payload.userId ?? null,
    username: payload.username ?? null,
    role: mapBackendRole(roles),
    backendRoles: roles,
    isAuthenticated: true,
  });
}
