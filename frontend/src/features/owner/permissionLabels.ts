/**
 * Nhãn tiếng Việt cho mã quyền của BE.
 *
 * Nguồn mã: `IdentityService/service/PermissionCatalog.java` — dạng
 * `<module>.<resource>.<action>`. BE trả `description` bằng tiếng Anh, không
 * được hiện thẳng cho người dùng cuối.
 *
 * Mã lạ (BE thêm quyền mới mà FE chưa cập nhật) → hiện nguyên mã để người dùng
 * thấy có gì đó chưa đồng bộ, KHÔNG đoán bừa một nhãn sai.
 */
const PERMISSION_LABELS: Record<string, string> = {
  'employee.view': 'Xem nhân viên',
  'employee.create': 'Thêm nhân viên',
  'employee.edit': 'Sửa hồ sơ nhân viên',
  'employee.delete': 'Xoá nhân viên',
  'employee.reset_password': 'Đặt lại mật khẩu nhân viên',
  'employee.assign_position': 'Gán chức vụ cho nhân viên',
  'employee.view_detail': 'Xem chi tiết nhạy cảm của nhân viên',
  'employee.resign': 'Đề nghị nghỉ việc',
  'employee.approve_resignation': 'Duyệt/từ chối nghỉ việc',
  'employee.transfer': 'Tạo yêu cầu chuyển phòng ban',
  'employee.approve_transfer': 'Duyệt bước nhân sự của chuyển phòng',
  'position.view': 'Xem chức vụ',
  'position.manage': 'Quản lý chức vụ',
  'department.view': 'Xem phòng ban',
  'department.manage': 'Quản lý phòng ban',
  'student.view': 'Xem học sinh',
  'student.create': 'Thêm học sinh',
  'student.edit': 'Sửa hồ sơ học sinh',
  'student.delete': 'Xoá học sinh',
  'student.create_account': 'Tạo tài khoản đăng nhập cho học sinh',
  'student.self_view': 'Xem hồ sơ học sinh của mình',
  'class.view': 'Xem lớp học',
  'class.create': 'Tạo lớp học',
  'class.edit': 'Sửa lớp học',
  'class.delete': 'Xoá lớp học',
  'class.assign_teacher': 'Gán giáo viên cho lớp',
  'class.teacher.reassign': 'Đổi giáo viên phụ trách lớp',
  'class.cancel': 'Huỷ lớp học',
  'class.request_close': 'Yêu cầu đóng lớp',
  'class.approve_close': 'Duyệt/từ chối đóng lớp',
  'class.reopen': 'Mở lại lớp đã đóng',
  'class.self_view': 'Xem lớp của mình',
  'schedule.view': 'Xem lịch phòng ban',
  'schedule.create': 'Tạo lịch phòng ban',
  'schedule.edit': 'Sửa lịch phòng ban',
  'schedule.delete': 'Xoá lịch phòng ban',
  'schedule.self_view': 'Xem lịch của mình',
  'facility.view': 'Xem phòng & thiết bị',
  'facility.manage': 'Quản lý phòng & thiết bị',
};

/** Nhãn module để nhóm quyền khi ủy quyền; `null` = quyền dùng chung. */
const MODULE_LABELS: Record<string, string> = {
  STUDENT_MANAGEMENT: 'Đào tạo (học sinh / lớp)',
  SCHEDULE_MANAGEMENT: 'Lịch học',
  FACILITY_MANAGEMENT: 'Cơ sở vật chất',
};

export function permissionLabel(code: string): string {
  return PERMISSION_LABELS[code] ?? code;
}

export function moduleLabel(moduleCode: string | null | undefined): string {
  if (!moduleCode) {
    return 'Quyền dùng chung';
  }
  return MODULE_LABELS[moduleCode] ?? moduleCode;
}
