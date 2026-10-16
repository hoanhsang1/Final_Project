import { apiClient } from '../../lib/api';
import type { LoginRequest, LoginResponse } from './types';

/**
 * Gọi API đăng nhập thật.
 *
 * Contract (đã kiểm chứng qua gateway :8080):
 * - POST /api/v1/auth/login
 * - Thành công 200 → trả thẳng LoginResponse (KHÔNG bọc ApiResponse)
 * - Lỗi 401 → {"success":false,"message":"Invalid username or password","data":null}
 * - Lỗi 403 → {"success":false,"message":"Account is not active",...} (validateAccount)
 *
 * ⚠️ Thiếu/rỗng field hiện trả 500 "Đã xảy ra lỗi hệ thống", KHÔNG phải 400 —
 * do GlobalExceptionHandler của backend chưa bắt MethodArgumentNotValidException.
 * Đã báo Sang. FE tự validate trước khi gửi nên bình thường sẽ không chạm nhánh này.
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
 * Bảng dịch message backend (tiếng Anh) sang tiếng Việt.
 *
 * Backend trả message tiếng Anh; yêu cầu dự án là UI copy tiếng Việt.
 * Chỉ dịch những message ĐÃ đối chiếu với source backend + kiểm chứng thực nghiệm.
 * Message lạ → fallback tiếng Việt chung, KHÔNG hiện thẳng tiếng Anh cho người dùng cuối.
 *
 * Nguồn: AuthService.java, RefreshTokenService.java (IdentityService).
 * Các message này có thể đổi khi Sang sửa backend → khi đó cập nhật lại bảng này.
 */
const MESSAGE_VI: Record<string, string> = {
  // --- 401: lỗi xác thực ---
  // MSG-LOGIN-10: cố ý gộp "sai tên đăng nhập HOẶC sai mật khẩu" — backend đã trả
  // CÙNG một message cho cả hai ca (username không tồn tại và sai mật khẩu) để chống dò tài khoản.
  'Invalid username or password': 'Sai tên đăng nhập hoặc mật khẩu.',
  'Invalid or expired refresh token': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'Account not found': 'Không tìm thấy tài khoản.',

  // --- 403: lỗi nghiệp vụ (AuthService.validateAccount) ---
  // BR-04: dùng chữ "Vô hiệu hoá", KHÔNG dùng "Xoá".
  'Account is not active': 'Tài khoản đã bị vô hiệu hoá.',
  'Account has no assigned roles': 'Tài khoản chưa được gán vai trò. Vui lòng liên hệ quản trị viên.',
  'Invalid SUPER_ADMIN account configuration': 'Cấu hình tài khoản quản trị không hợp lệ.',
  'Organization is required': 'Tài khoản chưa thuộc tổ chức nào.',
  'Organization not found': 'Không tìm thấy tổ chức của tài khoản.',
  'Organization is not active': 'Tổ chức đã bị vô hiệu hoá.',
};

/**
 * Rút message lỗi thân thiện (tiếng Việt) từ axios error.
 *
 * Ưu tiên dịch `response.data.message` mà backend trả về; nếu lỗi mạng hoặc
 * response không có body lỗi thì dùng thông báo mặc định.
 */
export function getAuthErrorMessage(error: unknown): string {
  const err = error as {
    isAxiosError?: boolean;
    response?: { data?: { message?: string } | null };
    request?: unknown;
  };

  const serverMessage = err?.response?.data?.message;
  if (typeof serverMessage === 'string' && serverMessage.length > 0) {
    // Message đã có trong bảng dịch → dùng bản tiếng Việt.
    if (MESSAGE_VI[serverMessage]) {
      return MESSAGE_VI[serverMessage];
    }
    // Backend có thể đã trả tiếng Việt sẵn (vd "Đã xảy ra lỗi hệ thống") → giữ nguyên.
    if (/[àáảãạăâđêôơư]/i.test(serverMessage)) {
      return serverMessage;
    }
    // Message tiếng Anh chưa biết → không hiện thẳng cho người dùng cuối.
    return 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }

  // Không có response → lỗi mạng / backend chưa chạy.
  if (err?.request) {
    return 'Không kết nối được máy chủ. Vui lòng thử lại.';
  }

  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}
