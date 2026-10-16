/**
 * Type DTO cho luồng đăng nhập.
 *
 * ⚠️ TẠM THỜI VIẾT TAY theo contract đã kiểm chứng thực nghiệm với backend thật
 * (xem `Dac-ta-Sprint-1` mục contract). Backend CHƯA xuất file OpenAPI, nên
 * không thể sinh type tự động. Khi Sang xuất OpenAPI → thay file này bằng type
 * sinh tự động, không viết tay.
 *
 * Nguồn kiểm chứng: POST /api/v1/auth/login trên gateway :8080.
 */

/** Request body gửi lên khi đăng nhập. */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Response THÀNH CÔNG (HTTP 200).
 *
 * ⚠️ Backend trả thẳng 4 field này, KHÔNG bọc trong ApiResponse.
 * Nhưng response LỖI lại bọc trong ApiResponse ({success, message, data}).
 * Hai dạng khác nhau — xem `AuthError`.
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  /** Luôn là "Bearer" trong contract hiện tại. */
  tokenType: string;
  /** Số giây cho tới khi accessToken hết hạn (900 = 15 phút). */
  expiresIn: number;
}

/**
 * Response LỖI (HTTP 400 / 401).
 *
 * Lỗi CÓ bọc trong ApiResponse, khác với response thành công.
 */
export interface AuthError {
  success: false;
  message: string;
  data: null;
}

/** Các claim đọc được từ payload của JWT (không verify chữ ký — chỉ để hiển thị/điều hướng). */
export interface JwtPayload {
  /** userId dạng UUID. */
  userId: string;
  username: string;
  /** Vai trò theo backend, ví dụ "SUPER_ADMIN". Khác slug FE — xem `mapBackendRole`. */
  roles: string[];
  /** Tổ chức; null nếu là admin toàn nền tảng. */
  orgId: string | null;
  /** Thời điểm hết hạn (epoch giây). */
  exp: number;
}

/**
 * Loại tổ chức — khớp đúng enum OrgType phía backend.
 * Gửi lên dạng UPPERCASE: "SCHOOL" | "CENTER".
 */
export type OrgType = 'SCHOOL' | 'CENTER';

/**
 * Request body gửi lên khi đăng ký tổ chức.
 * Các field name khớp đúng record RegisterOrganizationRequest.java.
 */
export interface RegisterRequest {
  organizationName: string;
  orgType: OrgType;
  username: string;
  email: string;
  password: string;
  /** Danh sách mã module, ví dụ ["STUDENT_MANAGEMENT", "CLASS_MANAGEMENT"]. */
  modules: string[];
}

/**
 * Response thành công (HTTP 201) từ POST /api/v1/auth/register.
 * BE trả Map<String, Object> với các key sau.
 */
export interface RegisterResponse {
  organizationId: string;
  accountId: string;
  organizationStatus: 'PENDING';
  accountStatus: 'PENDING';
  requestedModules: string[];
}

