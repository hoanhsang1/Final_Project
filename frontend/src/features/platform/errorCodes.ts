/**
 * Envelope lỗi chung của API + mã máy đọc được (code).
 *
 * ⚠️ FE chỉ dùng `code` để điều hướng/hiện UI; BE vẫn là nguồn quyết định.
 * Luồng refresh 401 nằm riêng ở `lib/api.ts`, không đổi ở đây.
 */

/** Envelope { success, code, message, data } do backend trả cho cả success lẫn lỗi. */
export type ApiEnvelope<T> = {
  success: boolean;
  /** `null` khi thành công; chuỗi mã lỗi (vd `LOGIN_RATE_LIMITED`) khi thất bại. */
  code: string | null;
  message: string;
  data: T;
};

/** Lỗi API kèm mã máy đọc được để caller (vd luồng đăng nhập) xử lý tiếp. */
export class ApiError extends Error {
  readonly code?: string;
  readonly status?: number;

  constructor(message: string, options: { code?: string; status?: number } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = options.code;
    this.status = options.status;
  }
}

/**
 * Đọc `error.response.data.code` — CHỈ nhận chuỗi.
 *
 * Backend có thể trả code dạng số (vd `1133`): số đó KHÔNG phải mã lỗi FE dùng,
 * nên trả `undefined` thay vì ép kiểu.
 */
export function getApiCode(error: unknown): string | undefined {
  const data = (error as { response?: { data?: { code?: unknown } | null } } | null)?.response?.data;
  const code = data?.code;
  return typeof code === 'string' ? code : undefined;
}
