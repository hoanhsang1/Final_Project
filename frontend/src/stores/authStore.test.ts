import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './authStore';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../lib/api';

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
});
