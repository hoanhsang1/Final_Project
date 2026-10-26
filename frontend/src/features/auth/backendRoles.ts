import type { RoleId } from './roles';

/**
 * Bảng ánh xạ vai trò backend → slug vai trò phía FE.
 *
 * Backend có 7 role (kiểm chứng trong bảng `role` của DB — `01_identity_db.sql`
 * + `05_seed_admin.sql`):
 *   SUPER_ADMIN, ORG_OWNER, ORG_ADMIN, ACADEMIC_STAFF, FACILITY_STAFF, TEACHER, STUDENT
 * FE có 5 slug (xem `roles.ts`).
 *
 * ⚠️ FACILITY_STAFF và ORG_ADMIN CHƯA có màn hình tương ứng.
 * Khi user có role chưa có trang → map về null để UI hiển thị "chưa hỗ trợ",
 * KHÔNG đoán bừa.
 */
const ROLE_MAP: Record<string, RoleId> = {
  SUPER_ADMIN: 'platform-admin',
  ORG_OWNER: 'org-owner',
  ACADEMIC_STAFF: 'academic-staff',
  TEACHER: 'teacher',
  STUDENT: 'student',
  // TODO(Sprint sau): ORG_ADMIN, FACILITY_STAFF chưa có slug FE.
};

/**
 * Thứ tự ưu tiên khi tài khoản có NHIỀU role.
 *
 * ⚠️ KHÔNG lấy "role đầu tiên trong mảng JWT": thứ tự mảng do BE quyết định,
 * không bảo đảm theo đặc quyền. Ví dụ user `["TEACHER","SUPER_ADMIN"]` sẽ bị
 * đưa tới màn xem thử giáo viên thay vì console quản trị.
 * Thứ tự này ưu tiên role quyền cao trước; role không có slug FE bị bỏ qua.
 */
const ROLE_PRIORITY: readonly string[] = [
  'SUPER_ADMIN',
  'ORG_OWNER',
  'ACADEMIC_STAFF',
  'TEACHER',
  'STUDENT',
];

/**
 * Nhận mảng role từ JWT (vd: ["SUPER_ADMIN"]) và trả về slug FE tương ứng.
 * Nhiều role → lấy role ưu tiên cao nhất (xem `ROLE_PRIORITY`); không khớp → null.
 */
export function mapBackendRole(roles: string[]): RoleId | null {
  for (const role of ROLE_PRIORITY) {
    if (!roles.includes(role)) {
      continue;
    }
    const mapped = ROLE_MAP[role];
    if (mapped) {
      return mapped;
    }
  }
  return null;
}
