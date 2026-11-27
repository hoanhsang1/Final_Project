import { beforeEach, describe, expect, it, vi } from 'vitest';
import { syncSessionFromToken, useAuthStore } from './authStore';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../lib/api';
import { normalizeBoolean } from '../features/auth/jwt';

/** Tạo JWT giả có payload userId/username/roles (chỉ đủ để decode, không cần chữ ký đúng). */
function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.sig`;
}

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({
    userId: null,
    username: null,
    role: null,
    backendRoles: [],
    mustChangePassword: false,
    passwordChangeRequiredByApi: false,
    isAuthenticated: false,
  });
});

describe('useAuthStore', () => {
  it('ban đầu chưa đăng nhập', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().role).toBeNull();
  });

  it('setSession lưu token vào localStorage và set vai trò', () => {
    const jwt = fakeJwt({
      userId: 'uuid-123',
      username: 'platform_admin',
      roles: ['SUPER_ADMIN'],
    });

    useAuthStore.getState().setSession({
      accessToken: jwt,
      refreshToken: 'refresh-xyz',
      tokenType: 'Bearer',
      expiresIn: 900,
    });

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.username).toBe('platform_admin');
    expect(s.role).toBe('platform-admin');
    // Role backend GỐC giữ lại để guard kiểm quyền chặt (UC-ADMIN-01).
    expect(s.backendRoles).toEqual(['SUPER_ADMIN']);
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe(jwt);
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-xyz');
  });

  it('clearSession xóa sạch token và phiên', () => {
    const jwt = fakeJwt({ userId: 'u', username: 't', roles: ['TEACHER'] });
    useAuthStore.getState().setSession({
      accessToken: jwt,
      refreshToken: 'r',
      tokenType: 'Bearer',
      expiresIn: 900,
    });

    useAuthStore.getState().clearSession();

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.role).toBeNull();
    expect(s.backendRoles).toEqual([]);
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });

  it('role backend chưa có màn hình FE → role null nhưng vẫn đăng nhập', () => {
    const jwt = fakeJwt({ userId: 'u', username: 'ketoan', roles: ['FACILITY_STAFF'] });
    useAuthStore.getState().setSession({
      accessToken: jwt,
      refreshToken: 'r',
      tokenType: 'Bearer',
      expiresIn: 900,
    });

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.role).toBeNull();
  });

  it('claim mustChangePassword:true → store bật cờ bắt đổi mật khẩu', () => {
    const jwt = fakeJwt({
      userId: 'u',
      username: 'temp',
      roles: ['TEACHER'],
      mustChangePassword: true,
    });

    useAuthStore.getState().setSession({
      accessToken: jwt,
      refreshToken: 'r',
      tokenType: 'Bearer',
      expiresIn: 900,
    });

    expect(useAuthStore.getState().mustChangePassword).toBe(true);
  });

  it('LoginResponse KHÔNG có flag vẫn đăng nhập bình thường', () => {
    const jwt = fakeJwt({ userId: 'u', username: 'normal', roles: ['TEACHER'] });

    useAuthStore.getState().setSession({
      accessToken: jwt,
      refreshToken: 'r',
      tokenType: 'Bearer',
      expiresIn: 900,
    });

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.username).toBe('normal');
    expect(s.mustChangePassword).toBe(false);
  });

  it('hydrate đọc cờ từ claim trong access token (không đọc LoginResponse)', async () => {
    localStorage.setItem(
      ACCESS_TOKEN_KEY,
      fakeJwt({
        userId: 'u',
        username: 'temp',
        roles: ['TEACHER'],
        mustChangePassword: true,
        exp: Math.floor(Date.now() / 1000) + 900,
      }),
    );
    vi.resetModules();

    const { useAuthStore: hydrated } = await import('./authStore');

    expect(hydrated.getState().isAuthenticated).toBe(true);
    expect(hydrated.getState().mustChangePassword).toBe(true);
  });

  it('syncSessionFromToken (sau refresh) cập nhật lại cờ từ JWT mới', () => {
    localStorage.setItem(
      ACCESS_TOKEN_KEY,
      fakeJwt({ userId: 'u', username: 'temp', roles: ['TEACHER'], mustChangePassword: true }),
    );
    syncSessionFromToken();
    expect(useAuthStore.getState().mustChangePassword).toBe(true);

    localStorage.setItem(
      ACCESS_TOKEN_KEY,
      fakeJwt({ userId: 'u', username: 'temp', roles: ['TEACHER'], mustChangePassword: false }),
    );
    syncSessionFromToken();
    expect(useAuthStore.getState().mustChangePassword).toBe(false);
  });

  it('cờ từ API PASSWORD_CHANGE_REQUIRED sống sót qua refresh JWT không có claim', () => {
    useAuthStore.getState().requirePasswordChange();
    expect(useAuthStore.getState().mustChangePassword).toBe(true);

    localStorage.setItem(
      ACCESS_TOKEN_KEY,
      fakeJwt({ userId: 'u', username: 'temp', roles: ['TEACHER'], mustChangePassword: false }),
    );
    syncSessionFromToken();

    const s = useAuthStore.getState();
    expect(s.mustChangePassword).toBe(true);
    expect(s.passwordChangeRequiredByApi).toBe(true);
  });

  it('chỉ clearSession (đổi mật khẩu thành công / đăng xuất) mới xoá override từ API', () => {
    useAuthStore.getState().requirePasswordChange();

    useAuthStore.getState().clearSession();

    expect(useAuthStore.getState().mustChangePassword).toBe(false);
    expect(useAuthStore.getState().passwordChangeRequiredByApi).toBe(false);
  });

  it('đăng nhập lại bằng setSession reset override, vẫn đọc cờ từ JWT mới', () => {
    useAuthStore.getState().requirePasswordChange();
    const jwt = fakeJwt({ userId: 'u', username: 'fresh', roles: ['TEACHER'] });

    useAuthStore.getState().setSession({
      accessToken: jwt,
      refreshToken: 'r',
      tokenType: 'Bearer',
      expiresIn: 900,
    });

    const s = useAuthStore.getState();
    expect(s.passwordChangeRequiredByApi).toBe(false);
    expect(s.mustChangePassword).toBe(false);
    expect(s.username).toBe('fresh');
  });

  it('clearSession xoá luôn cờ bắt đổi mật khẩu', () => {
    const jwt = fakeJwt({
      userId: 'u',
      username: 'temp',
      roles: ['TEACHER'],
      mustChangePassword: true,
    });
    useAuthStore.getState().setSession({
      accessToken: jwt,
      refreshToken: 'r',
      tokenType: 'Bearer',
      expiresIn: 900,
    });

    useAuthStore.getState().clearSession();

    expect(useAuthStore.getState().mustChangePassword).toBe(false);
  });
});

describe('normalizeBoolean', () => {
  it('nhận boolean true và chuỗi "true" (kể cả có dấu cách / viết hoa)', () => {
    expect(normalizeBoolean(true)).toBe(true);
    expect(normalizeBoolean(' true ')).toBe(true);
    expect(normalizeBoolean('TRUE')).toBe(true);
  });

  it('mọi giá trị khác → false (fail-safe, không mở nhầm guard)', () => {
    expect(normalizeBoolean(false)).toBe(false);
    expect(normalizeBoolean(1)).toBe(false);
    expect(normalizeBoolean(null)).toBe(false);
    expect(normalizeBoolean({})).toBe(false);
  });
});
