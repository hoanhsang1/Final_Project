/**
 * Nhãn tiếng Việt cho mã quyền của BE.
 *
 * Nguồn mã: `IdentityService/service/PermissionCatalog.java` — đúng 5 mã. BE trả
 * `description` bằng tiếng Anh, không được hiện thẳng cho người dùng cuối.
 *
 * Mã lạ (BE thêm quyền mới mà FE chưa cập nhật) → hiện nguyên mã để người dùng
 * thấy có gì đó chưa đồng bộ, KHÔNG đoán bừa một nhãn sai.
 */
const PERMISSION_LABELS: Record<string, string> = {
  FACILITY_MANAGE: 'Quản lý phòng & thiết bị',
  SCHEDULE_CREATE: 'Tạo lịch phòng ban',
  SCHEDULE_VIEW: 'Xem lịch phòng ban',
  PEOPLE_VIEW: 'Xem nhân viên phòng ban',
  PEOPLE_EDIT: 'Quản lý nhân viên phòng ban',
};

export function permissionLabel(code: string): string {
  return PERMISSION_LABELS[code] ?? code;
}
