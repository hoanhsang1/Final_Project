import type { RoleId } from './roles';

/**
 * Bảng ánh xạ vai trò backend → slug vai trò phía FE.
 *
 * Backend có 6 role (kiểm chứng trong bảng `role` của DB):
 *   SUPER_ADMIN, ORG_ADMIN, ACADEMIC_STAFF, FACILITY_STAFF, TEACHER, STUDENT
 * FE Sprint 1 chỉ có 4 slug (xem `roles.ts`).
 *
 * ⚠️ FACILITY_STAFF và ORG_ADMIN CHƯA có màn hình tương ứng ở Sprint 1.
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
 * Nhận mảng role từ JWT (vd: ["SUPER_ADMIN"]) và trả về slug FE tương ứng.
 * Nếu user có nhiều role, lấy role đầu tiên khớp với FE; không khớp → null.
 */
export function mapBackendRole(roles: string[]): RoleId | null {
  for (const role of roles) {
    const mapped = ROLE_MAP[role];
    if (mapped) {
      return mapped;
    }
  }
  return null;
}
