/**
 * Đọc claim từ JWT — CHỈ để hiển thị phía client.
 *
 * ⚠️ KHÔNG verify chữ ký, KHÔNG dùng để bảo mật. BE luôn chặn lại (ADR-FE-003).
 * Việc duy nhất FE cần là: biết user đang đăng nhập với role nào để ẩn/hiện UI.
 */

/** Claim FE đọc từ access token. */
export interface JwtClaims {
  userId?: string;
  username?: string;
  /** Role backend GỐC, vd `["SUPER_ADMIN"]`. */
  roles?: unknown;
  /** Thời điểm hết hạn (giây kể từ epoch). */
  exp?: number;
}

/** Decode base64url → JSON. Trả `{}` nếu token hỏng. */
export function decodeJwtClaims(token: string): JwtClaims {
  try {
    const base64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/') ?? '';
    if (!base64) return {};
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload: unknown = JSON.parse(atob(padded));
    if (!payload || typeof payload !== 'object') return {};
    return payload as JwtClaims;
  } catch {
    return {};
  }
}

/**
 * Chuẩn hoá claim `roles` về **mảng chuỗi**.
 *
 * ⚠️ Bắt buộc: nếu `roles` là CHUỖI (vd `"NOT_SUPER_ADMIN"`), thì
 * `roles.includes('SUPER_ADMIN')` trả `true` → guard khu vực quản trị bị bypass.
 * Sai kiểu → coi như không có role nào.
 */
export function normalizeRoles(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [];
  return roles.filter((role): role is string => typeof role === 'string');
}

/**
 * Token đã hết hạn chưa?
 *
 * Không có claim `exp` → coi như còn hạn (BE sẽ là người báo 401 khi cần).
 */
export function isTokenExpired(token: string, now: number = Date.now()): boolean {
  const { exp } = decodeJwtClaims(token);
  if (typeof exp !== 'number') return false;
  return exp * 1000 <= now;
}
