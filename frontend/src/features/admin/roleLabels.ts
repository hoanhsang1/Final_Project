/**
 * Nhãn vai trò backend trên UI — dùng cho màn Quản lý tài khoản (`UC-19`).
 *
 * Backend có **7 role** (kiểm chứng trong bảng `role` của DB — `01_identity_db.sql`
 * + `05_seed_admin.sql`). Màn Quản lý tài khoản cần hiện **tất cả 7**, nên bảng
 * nhãn này RIÊNG và đầy đủ hơn `backendRoles.ts` (bảng đó chỉ map về 5 slug FE
 * để quyết định điều hướng — không phải để hiển thị).
 *
 * `ORG_ADMIN` và `FACILITY_STAFF` chưa có màn hình tương ứng → vẫn có nhãn tiếng Việt
 * để Admin hệ thống nhận ra được.
 */

/** Nhãn tiếng Việt cho một role backend. */
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Admin hệ thống',
  ORG_OWNER: 'Chủ tổ chức',
  ORG_ADMIN: 'Quản trị tổ chức',
  ACADEMIC_STAFF: 'Cán bộ quản lý',
  FACILITY_STAFF: 'Nhân viên phòng / thiết bị',
  TEACHER: 'Giáo viên',
  STUDENT: 'Sinh viên',
};

/**
 * Nhãn role backend → tiếng Việt.
 *
 * Không đoán: role lạ (BE thêm role mới mà FE chưa cập nhật) → hiện nguyên mã
 * gốc để Admin thấy được sự lệch, thay vì hiện một nhãn sai.
 */
export function roleLabel(backendRole: string): string {
  const normalized = backendRole?.trim().toUpperCase() ?? '';
  return ROLE_LABELS[normalized] ?? backendRole;
}

/** Giá trị + nhãn cho bộ lọc "Vai trò" — gửi lên query param `role` là **giá trị backend gốc**. */
export const ROLE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = Object.entries(
  ROLE_LABELS,
).map(([value, label]) => ({ value, label }));

/**
 * Role backend gốc của Admin hệ thống — **không** cho tạo mới qua console
 * (Q-35: SUPER_ADMIN khác phải do chính SUPER_ADMIN hiện tại tạo ở nơi khác).
 */
export const PLATFORM_ADMIN_ROLE = 'SUPER_ADMIN';

/**
 * Lựa chọn vai trò khi **tạo tài khoản / đổi vai trò** — mọi role trừ
 * `SUPER_ADMIN` (Q-35).
 */
export const CREATE_ROLE_OPTIONS: ReadonlyArray<{ value: string; label: string }> =
  ROLE_OPTIONS.filter((option) => option.value !== PLATFORM_ADMIN_ROLE);
