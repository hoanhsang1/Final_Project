import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getAuthErrorMessage, login } from './authApi';

/**
 * Mock tầng HTTP (axios client) để test riêng logic của authApi,
 * không phụ thuộc mạng hay backend đang chạy.
 */
const mockPost = vi.fn();
vi.mock('../../lib/api', () => ({
  apiClient: { post: (...args: unknown[]) => mockPost(...args) },
}));

/** Tạo error giống axios ném ra khi response lỗi (có `response.status` + `response.data`). */
function axiosLikeError(status: number, data: unknown) {
  return { isAxiosError: true, response: { status, data } };
}

beforeEach(() => {
  mockPost.mockReset();
});

describe('login', () => {
  it('trả về LoginResponse khi 200', async () => {
    const okData = {
      accessToken: 'jwt-token',
      refreshToken: 'refresh-abc',
      tokenType: 'Bearer',
      expiresIn: 900,
    };
    mockPost.mockResolvedValue({ data: okData });

    const result = await login({ username: 'platform_admin', password: '123456' });

    expect(result).toEqual(okData);
    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/login', {
      username: 'platform_admin',
      password: '123456',
    });
  });

  it('ném lỗi có message "Invalid username or password" khi 401', async () => {
    mockPost.mockRejectedValue(
      axiosLikeError(401, { success: false, message: 'Invalid username or password', data: null }),
    );

    await expect(login({ username: 'x', password: 'y' })).rejects.toThrow(
      'Invalid username or password',
    );
  });

  it('dịch message kỹ thuật "MethodArgumentNotValid" sang thông báo dễ hiểu khi 400', async () => {
    mockPost.mockRejectedValue(
      axiosLikeError(400, { success: false, message: 'MethodArgumentNotValid', data: null }),
    );

    await expect(login({ username: '', password: '' })).rejects.toThrow(
      'Vui lòng nhập tên đăng nhập và mật khẩu.',
    );
  });
});

describe('getAuthErrorMessage', () => {
  it('lấy message từ response.data.message khi backend trả lỗi có cấu trúc', () => {
    const err = axiosLikeError(401, {
      success: false,
      message: 'Invalid username or password',
      data: null,
    });
    expect(getAuthErrorMessage(err)).toBe('Invalid username or password');
  });

  it('dịch "MethodArgumentNotValid" (tên kỹ thuật) sang thông báo người dùng hiểu', () => {
    const err = axiosLikeError(400, {
      success: false,
      message: 'MethodArgumentNotValid',
      data: null,
    });
    expect(getAuthErrorMessage(err)).toBe('Vui lòng nhập tên đăng nhập và mật khẩu.');
  });

  it('trả về thông báo mặc định khi lỗi mạng (không có response)', () => {
    const err = { isAxiosError: true, request: {} };
    expect(getAuthErrorMessage(err)).toBe('Không kết nối được máy chủ. Vui lòng thử lại.');
  });

  it('trả về thông báo mặc định khi response không có body lỗi', () => {
    const err = { isAxiosError: true, response: { status: 500, data: null } };
    expect(getAuthErrorMessage(err)).toBe('Đã xảy ra lỗi. Vui lòng thử lại.');
  });
});
