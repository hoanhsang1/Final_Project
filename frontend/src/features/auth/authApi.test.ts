import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApiError } from '../platform/errorCodes';
import { changePassword, getAuthErrorMessage, login } from './authApi';

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

  it('ném lỗi tiếng Việt khi 401 (dịch từ "Invalid username or password")', async () => {
    mockPost.mockRejectedValue(
      axiosLikeError(401, { success: false, message: 'Invalid username or password', data: null }),
    );

    await expect(login({ username: 'x', password: 'y' })).rejects.toThrow(
      'Sai tên đăng nhập hoặc mật khẩu.',
    );
  });

  it('dịch "Invalid or expired refresh token" sang tiếng Việt khi 401', async () => {
    mockPost.mockRejectedValue(
      axiosLikeError(401, {
        success: false,
        message: 'Invalid or expired refresh token',
        data: null,
      }),
    );

    await expect(login({ username: 'x', password: 'y' })).rejects.toThrow(
      'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    );
  });

  it('giữ code LOGIN_RATE_LIMITED và status 429 trong ApiError', async () => {
    mockPost.mockRejectedValue(
      axiosLikeError(429, {
        success: false,
        code: 'LOGIN_RATE_LIMITED',
        message: 'Too many login attempts',
        data: null,
      }),
    );

    const result = login({ username: 'x', password: 'y' });
    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({
      name: 'ApiError',
      code: 'LOGIN_RATE_LIMITED',
      status: 429,
    });
  });
});

describe('changePassword', () => {
  it('POST /auth/change-password với currentPassword/newPassword và 204 không có body', async () => {
    mockPost.mockResolvedValue({ data: '', status: 204 });

    await expect(
      changePassword('MatKhauTam123', 'MatKhauMoi456'),
    ).resolves.toBeUndefined();
    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/change-password', {
      currentPassword: 'MatKhauTam123',
      newPassword: 'MatKhauMoi456',
    });
  });

  it('giữ code PASSWORD_CHANGE_REQUIRED (chuỗi) trong ApiError', async () => {
    mockPost.mockRejectedValue(
      axiosLikeError(403, {
        success: false,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Change your temporary password first',
        data: null,
      }),
    );

    const result = changePassword('tam', 'moi');
    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({
      code: 'PASSWORD_CHANGE_REQUIRED',
      status: 403,
    });
  });
});

describe('getAuthErrorMessage', () => {
  it('dịch "Invalid username or password" sang tiếng Việt', () => {
    const err = axiosLikeError(401, {
      success: false,
      message: 'Invalid username or password',
      data: null,
    });
    expect(getAuthErrorMessage(err)).toBe('Sai tên đăng nhập hoặc mật khẩu.');
  });

  it('dịch lỗi nghiệp vụ 403 "Account is not active" (dùng chữ "Vô hiệu hoá", BR-04)', () => {
    const err = axiosLikeError(403, {
      success: false,
      message: 'Account is not active',
      data: null,
    });
    expect(getAuthErrorMessage(err)).toBe('Tài khoản đã bị vô hiệu hoá.');
  });

  it('dịch lỗi nghiệp vụ 403 "Organization is not active"', () => {
    const err = axiosLikeError(403, {
      success: false,
      message: 'Organization is not active',
      data: null,
    });
    expect(getAuthErrorMessage(err)).toBe('Tổ chức đã bị vô hiệu hoá.');
  });

  it('giữ nguyên message nếu backend đã trả tiếng Việt', () => {
    const err = axiosLikeError(500, {
      success: false,
      message: 'Đã xảy ra lỗi hệ thống',
      data: null,
    });
    expect(getAuthErrorMessage(err)).toBe('Đã xảy ra lỗi hệ thống');
  });

  it('KHÔNG hiện thẳng message tiếng Anh chưa biết cho người dùng', () => {
    const err = axiosLikeError(500, {
      success: false,
      message: 'Something exploded in the server',
      data: null,
    });
    expect(getAuthErrorMessage(err)).toBe('Không thể thực hiện yêu cầu lúc này. Vui lòng thử lại.');
  });

  it('trả về thông báo mặc định khi lỗi mạng (không có response)', () => {
    const err = { isAxiosError: true, request: {} };
    expect(getAuthErrorMessage(err)).toBe('Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.');
  });

  it('trả về thông báo mặc định khi response không có body lỗi', () => {
    const err = { isAxiosError: true, response: { status: 500, data: null } };
    expect(getAuthErrorMessage(err)).toBe('Đã xảy ra lỗi. Vui lòng thử lại.');
  });
});
