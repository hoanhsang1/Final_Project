import { create } from 'zustand';
import { clearTokens, getAccessToken, setTokens } from '../lib/api';
import type { LoginResponse } from '../features/auth/types';
import type { RoleId } from '../features/auth/roles';
import { mapBackendRole } from '../features/auth/backendRoles';

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

/** Đọc claim từ JWT (chỉ decode base64 để hiển thị — KHÔNG verify chữ ký, không dùng để bảo mật). */
function decodeJwtPayload(token: string): { userId?: string; username?: string; roles?: string[] } {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

/** Khôi phục phiên từ localStorage khi app khởi động (reload trang không bị đá ra). */
function restoreSession(): Pick<
  AuthSession,
  'userId' | 'username' | 'role' | 'backendRoles' | 'isAuthenticated'
> {
  const token = getAccessToken();
  if (!token) {
    return { userId: null, username: null, role: null, backendRoles: [], isAuthenticated: false };
  }
  const payload = decodeJwtPayload(token);
  return {
    userId: payload.userId ?? null,
    username: payload.username ?? null,
    role: mapBackendRole(payload.roles ?? []),
    backendRoles: payload.roles ?? [],
    isAuthenticated: true,
  };
}

export const useAuthStore = create<AuthSession>((set) => ({
  ...restoreSession(),
  setSession: (res) => {
    // Lưu token vào localStorage để sống sót qua reload.
    setTokens(res.accessToken, res.refreshToken);
    const payload = decodeJwtPayload(res.accessToken);
    set({
      userId: payload.userId ?? null,
      username: payload.username ?? null,
      role: mapBackendRole(payload.roles ?? []),
      backendRoles: payload.roles ?? [],
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
