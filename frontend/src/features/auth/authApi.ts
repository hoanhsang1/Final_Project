import { apiClient } from '../../lib/api';
import type { LoginRequest, LoginResponse } from './types';

/**
 * Gọi API đăng nhập thật.
 *
 * Contract (đã kiểm chứng qua gateway :8080):
 * - POST /api/v1/auth/login
 * - Thành công 200 → trả thẳng LoginResponse (KHÔNG bọc ApiResponse)
 * - Lỗi 401 → {"success":false,"message":"Invalid username or password","data":null}
 * - Lỗi 400 → {"success":false,"message":"MethodArgumentNotValid","data":null}
 *
 * Ném lỗi kèm message thân thiện để UI hiện ngay cho người dùng (NFR-REL-001:
 * khi lỗi thì KHÔNG được hiện thành công).
 */
export async function login(request: LoginRequest): Promise<LoginResponse> {
  try {
    const { data } = await apiClient.post<LoginResponse>('/api/v1/auth/login', request);
    return data;
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

/**
 * Rút message lỗi thân thiện từ axios error.
 *
 * Ưu tiên `response.data.message` mà backend trả về; nếu lỗi mạng hoặc
 * response không có body lỗi thì dùng thông báo mặc định.
 */
export function getAuthErrorMessage(error: unknown): string {
  const err = error as {
    isAxiosError?: boolean;
    response?: { data?: { message?: string } | null };
    request?: unknown;
  };

  // Lỗi từ backend có cấu trúc {success, message, data} → lấy message.
  const serverMessage = err?.response?.data?.message;
  if (typeof serverMessage === 'string' && serverMessage.length > 0) {
    // "MethodArgumentNotValid" là tên kỹ thuật, không thân thiện → thay bằng thông báo người dùng hiểu.
    if (serverMessage === 'MethodArgumentNotValid') {
      return 'Vui lòng nhập tên đăng nhập và mật khẩu.';
    }
    return serverMessage;
  }

  // Không có response → lỗi mạng / backend chưa chạy.
  if (err?.request) {
    return 'Không kết nối được máy chủ. Vui lòng thử lại.';
  }

  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}
