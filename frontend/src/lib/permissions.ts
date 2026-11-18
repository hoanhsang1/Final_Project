/**
 * Danh mục quyền (permission catalog) — trích từ sơ đồ chức năng v2, trang 5.
 *
 * Chỉ dùng để:
 *  - ẩn/hiện menu và nút (UX),
 *  - hiển thị giải thích quyền cho người dùng,
 *  - khoá route phía client.
 * Backend luôn kiểm tra lại quyền thật. Không có logic bảo mật nào ở đây.
 */
export const PERM = {
  // Nhân sự
  employeeView: 'employee.view',
  employeeCreate: 'employee.create',
  employeeEdit: 'employee.edit',
  employeeDelete: 'employee.delete',
  employeeViewDetail: 'employee.view_detail',
  employeeResetPassword: 'employee.reset_password',
  employeeAssignPosition: 'employee.assign_position',
  employeeResign: 'employee.resign',
  employeeApproveResignation: 'employee.approve_resignation',
  employeeTransfer: 'employee.transfer',
  employeeApproveTransfer: 'employee.approve_transfer',
  positionView: 'position.view',
  positionManage: 'position.manage',
  departmentView: 'department.view',
  departmentManage: 'department.manage',

  // Đào tạo
  studentView: 'student.view',
  studentCreate: 'student.create',
  studentEdit: 'student.edit',
  studentDelete: 'student.delete',
  studentCreateAccount: 'student.create_account',
  studentChangeStatus: 'student.change_status',
  studentResetAccount: 'student.reset_account',
  classView: 'class.view',
  classCreate: 'class.create',
  classEdit: 'class.edit',
  classDelete: 'class.delete',
  classAssignTeacher: 'class.assign_teacher',
  classTeacherReassign: 'class.teacher.reassign',
  classCancel: 'class.cancel',
  classRequestClose: 'class.request_close',
  classApproveClose: 'class.approve_close',
  classReopen: 'class.reopen',
  classViewReassign: 'class.view_reassign',
  subjectView: 'subject.view',
  subjectManage: 'subject.manage',

  // Lịch học
  scheduleView: 'schedule.view',
  scheduleCreate: 'schedule.create',
  scheduleEdit: 'schedule.edit',
  scheduleCancelSession: 'schedule.cancel_session',
  scheduleDelete: 'schedule.delete',
  scheduleRecurringCreate: 'schedule.recurring.create',
  schedulePreview: 'schedule.preview',
  scheduleAttendanceMark: 'schedule.attendance.mark',
  scheduleAttendanceView: 'schedule.attendance.view',
  scheduleChangeRequestCreate: 'schedule.change_request.create',
  scheduleChangeRequestApprove: 'schedule.change_request.approve',

  // Cơ sở vật chất
  facilityView: 'facility.view',
  facilityManage: 'facility.manage',
  facilityRoomView: 'facility.room.view',
  facilityRoomCreate: 'facility.room.create',
  facilityRoomUpdate: 'facility.room.update',
  facilityRoomDelete: 'facility.room.delete',
  facilityEquipmentView: 'facility.equipment.view',
  facilityEquipmentCreate: 'facility.equipment.create',
  facilityEquipmentUpdate: 'facility.equipment.update',
  facilityEquipmentDelete: 'facility.equipment.delete',
  facilityIssueReport: 'facility.issue.report',
  facilityIssueResolve: 'facility.issue.resolve',

  // Quyền self (gắn trực tiếp role STUDENT / mọi người dùng)
  studentSelfView: 'student.self_view',
  classSelfView: 'class.self_view',
  scheduleSelfView: 'schedule.self_view',
  attendanceSelfView: 'attendance.self_view',

  // Tài khoản, hồ sơ, thông báo
  accountProfileView: 'account.profile.view',
  accountProfileEdit: 'account.profile.edit',
  authChangePassword: 'auth.change_password',
  notificationView: 'notification.view',
  approvalInboxView: 'approval.inbox.view',

  // Tổ chức (OWNER)
  orgModuleToggle: 'org.module.toggle',
  orgAuditView: 'org.audit.view',

  // Nền tảng (SUPER_ADMIN)
  moduleCatalogManage: 'module.catalog.manage',
  orgModuleOverride: 'org.module.override',

  // Nhân sự (bổ sung v2)
  teacherChangeStatus: 'teacher.change_status',
} as const

export type PermissionCode = (typeof PERM)[keyof typeof PERM]

export interface PermissionMeta {
  code: string
  label: string
  bundle: BundleCode | 'SELF' | 'ORG' | 'PLATFORM' | 'COMMON'
  description?: string
}

export type BundleCode =
  | 'HR_MANAGEMENT'
  | 'ACADEMIC_MANAGEMENT'
  | 'SCHEDULE_MANAGEMENT'
  | 'FACILITY_MANAGEMENT'

export const BUNDLES: Record<BundleCode, { label: string; description: string }> = {
  HR_MANAGEMENT: {
    label: 'Quản lý nhân sự',
    description: 'Hồ sơ nhân viên, chức vụ, điều chuyển và nghỉ việc trong phòng ban.',
  },
  ACADEMIC_MANAGEMENT: {
    label: 'Quản lý đào tạo',
    description: 'Sinh viên, lớp học, phân công giáo viên và môn học.',
  },
  SCHEDULE_MANAGEMENT: {
    label: 'Quản lý lịch học',
    description: 'Xếp lịch, điểm danh, yêu cầu đổi lịch và dạy bù.',
  },
  FACILITY_MANAGEMENT: {
    label: 'Quản lý cơ sở vật chất',
    description: 'Phòng học, thiết bị và xử lý sự cố.',
  },
}

/** Nhóm quyền dùng cho màn hình "Chức vụ & quyền". */
export const PERMISSION_GROUPS: { label: string; permissions: PermissionMeta[] }[] = [
  {
    label: 'Nhân sự',
    permissions: [
      { code: PERM.employeeView, label: 'Xem danh sách nhân sự', bundle: 'HR_MANAGEMENT' },
      { code: PERM.employeeViewDetail, label: 'Xem chi tiết nhạy cảm', bundle: 'HR_MANAGEMENT' },
      { code: PERM.employeeCreate, label: 'Tạo nhân sự', bundle: 'HR_MANAGEMENT' },
      { code: PERM.employeeEdit, label: 'Sửa hồ sơ nhân sự', bundle: 'HR_MANAGEMENT' },
      { code: PERM.employeeDelete, label: 'Xoá / vô hiệu hoá nhân sự', bundle: 'HR_MANAGEMENT' },
      { code: PERM.employeeResetPassword, label: 'Reset mật khẩu nhân sự', bundle: 'HR_MANAGEMENT' },
      { code: PERM.employeeAssignPosition, label: 'Gán / thay đổi chức vụ', bundle: 'HR_MANAGEMENT' },
      { code: PERM.employeeResign, label: 'Tạo yêu cầu nghỉ việc', bundle: 'HR_MANAGEMENT' },
      { code: PERM.employeeApproveResignation, label: 'Duyệt nghỉ việc', bundle: 'HR_MANAGEMENT' },
      { code: PERM.employeeTransfer, label: 'Tạo yêu cầu chuyển phòng', bundle: 'HR_MANAGEMENT' },
      { code: PERM.employeeApproveTransfer, label: 'Duyệt chuyển phòng', bundle: 'HR_MANAGEMENT' },
      { code: PERM.positionView, label: 'Xem chức vụ', bundle: 'HR_MANAGEMENT' },
      { code: PERM.positionManage, label: 'Quản lý chức vụ', bundle: 'HR_MANAGEMENT' },
      { code: PERM.departmentView, label: 'Xem phòng ban', bundle: 'HR_MANAGEMENT' },
      { code: PERM.departmentManage, label: 'Quản lý phòng ban', bundle: 'HR_MANAGEMENT' },
      { code: PERM.teacherChangeStatus, label: 'Đổi trạng thái giáo viên', bundle: 'HR_MANAGEMENT' },
    ],
  },
  {
    label: 'Đào tạo',
    permissions: [
      { code: PERM.studentView, label: 'Xem sinh viên', bundle: 'ACADEMIC_MANAGEMENT' },
      { code: PERM.studentCreate, label: 'Tạo sinh viên', bundle: 'ACADEMIC_MANAGEMENT' },
      { code: PERM.studentEdit, label: 'Sửa sinh viên', bundle: 'ACADEMIC_MANAGEMENT' },
      { code: PERM.studentDelete, label: 'Xoá sinh viên', bundle: 'ACADEMIC_MANAGEMENT' },
      { code: PERM.studentCreateAccount, label: 'Cấp tài khoản sinh viên', bundle: 'ACADEMIC_MANAGEMENT' },
      { code: PERM.studentChangeStatus, label: 'Đổi trạng thái sinh viên', bundle: 'ACADEMIC_MANAGEMENT' },
      { code: PERM.studentResetAccount, label: 'Reset / khoá tài khoản sinh viên', bundle: 'ACADEMIC_MANAGEMENT' },
      { code: PERM.classView, label: 'Xem lớp học', bundle: 'ACADEMIC_MANAGEMENT' },
      { code: PERM.classCreate, label: 'Tạo lớp', bundle: 'ACADEMIC_MANAGEMENT' },
      { code: PERM.classEdit, label: 'Sửa lớp', bundle: 'ACADEMIC_MANAGEMENT' },
      { code: PERM.classDelete, label: 'Xoá lớp', bundle: 'ACADEMIC_MANAGEMENT' },
      { code: PERM.classAssignTeacher, label: 'Gán giáo viên', bundle: 'ACADEMIC_MANAGEMENT' },
      { code: PERM.classTeacherReassign, label: 'Phân công lại giáo viên', bundle: 'ACADEMIC_MANAGEMENT' },
      { code: PERM.classCancel, label: 'Huỷ lớp / yêu cầu huỷ', bundle: 'ACADEMIC_MANAGEMENT' },
      { code: PERM.classRequestClose, label: 'Yêu cầu đóng lớp', bundle: 'ACADEMIC_MANAGEMENT' },
      { code: PERM.classApproveClose, label: 'Duyệt huỷ / đóng lớp', bundle: 'ACADEMIC_MANAGEMENT' },
      { code: PERM.classReopen, label: 'Mở lại lớp đã đóng', bundle: 'ACADEMIC_MANAGEMENT' },
      { code: PERM.classViewReassign, label: 'Xem lớp cần phân công lại', bundle: 'ACADEMIC_MANAGEMENT' },
      { code: PERM.subjectView, label: 'Xem môn học', bundle: 'ACADEMIC_MANAGEMENT' },
      { code: PERM.subjectManage, label: 'Quản lý môn học', bundle: 'ACADEMIC_MANAGEMENT' },
    ],
  },
  {
    label: 'Lịch học',
    permissions: [
      { code: PERM.scheduleView, label: 'Xem lịch phòng ban', bundle: 'SCHEDULE_MANAGEMENT' },
      { code: PERM.scheduleCreate, label: 'Tạo buổi học', bundle: 'SCHEDULE_MANAGEMENT' },
      { code: PERM.scheduleEdit, label: 'Sửa buổi học', bundle: 'SCHEDULE_MANAGEMENT' },
      { code: PERM.scheduleCancelSession, label: 'Huỷ buổi học', bundle: 'SCHEDULE_MANAGEMENT' },
      { code: PERM.scheduleDelete, label: 'Xoá buổi học', bundle: 'SCHEDULE_MANAGEMENT' },
      { code: PERM.scheduleRecurringCreate, label: 'Xếp lịch lặp', bundle: 'SCHEDULE_MANAGEMENT' },
      { code: PERM.schedulePreview, label: 'Xem trước lịch lặp', bundle: 'SCHEDULE_MANAGEMENT' },
      { code: PERM.scheduleAttendanceMark, label: 'Điểm danh', bundle: 'SCHEDULE_MANAGEMENT' },
      { code: PERM.scheduleAttendanceView, label: 'Xem báo cáo chuyên cần', bundle: 'SCHEDULE_MANAGEMENT' },
      { code: PERM.scheduleChangeRequestCreate, label: 'Gửi yêu cầu đổi lịch', bundle: 'SCHEDULE_MANAGEMENT' },
      { code: PERM.scheduleChangeRequestApprove, label: 'Duyệt yêu cầu đổi lịch', bundle: 'SCHEDULE_MANAGEMENT' },
    ],
  },
  {
    label: 'Cơ sở vật chất',
    permissions: [
      { code: PERM.facilityView, label: 'Xem cơ sở vật chất', bundle: 'FACILITY_MANAGEMENT' },
      { code: PERM.facilityRoomView, label: 'Xem phòng học', bundle: 'FACILITY_MANAGEMENT' },
      { code: PERM.facilityRoomCreate, label: 'Tạo phòng học', bundle: 'FACILITY_MANAGEMENT' },
      { code: PERM.facilityRoomUpdate, label: 'Sửa phòng học', bundle: 'FACILITY_MANAGEMENT' },
      { code: PERM.facilityRoomDelete, label: 'Xoá phòng học', bundle: 'FACILITY_MANAGEMENT' },
      { code: PERM.facilityEquipmentView, label: 'Xem thiết bị', bundle: 'FACILITY_MANAGEMENT' },
      { code: PERM.facilityEquipmentCreate, label: 'Tạo thiết bị', bundle: 'FACILITY_MANAGEMENT' },
      { code: PERM.facilityEquipmentUpdate, label: 'Sửa thiết bị', bundle: 'FACILITY_MANAGEMENT' },
      { code: PERM.facilityEquipmentDelete, label: 'Xoá thiết bị', bundle: 'FACILITY_MANAGEMENT' },
      { code: PERM.facilityIssueReport, label: 'Báo sự cố', bundle: 'FACILITY_MANAGEMENT' },
      { code: PERM.facilityIssueResolve, label: 'Xử lý sự cố', bundle: 'FACILITY_MANAGEMENT' },
    ],
  },
  {
    label: 'Tài khoản & thông báo',
    permissions: [
      { code: PERM.accountProfileView, label: 'Xem hồ sơ cá nhân', bundle: 'COMMON' },
      { code: PERM.accountProfileEdit, label: 'Sửa hồ sơ cá nhân', bundle: 'COMMON' },
      { code: PERM.authChangePassword, label: 'Đổi mật khẩu', bundle: 'COMMON' },
      { code: PERM.notificationView, label: 'Xem thông báo', bundle: 'COMMON' },
      { code: PERM.approvalInboxView, label: 'Việc chờ tôi duyệt', bundle: 'COMMON' },
    ],
  },
  {
    label: 'Quyền self (chỉ dùng cho chính mình)',
    permissions: [
      { code: PERM.studentSelfView, label: 'Xem hồ sơ của tôi', bundle: 'SELF' },
      { code: PERM.classSelfView, label: 'Xem lớp của tôi', bundle: 'SELF' },
      { code: PERM.scheduleSelfView, label: 'Xem lịch của tôi', bundle: 'SELF' },
      { code: PERM.attendanceSelfView, label: 'Xem chuyên cần của tôi', bundle: 'SELF' },
    ],
  },
  {
    label: 'Cấp tổ chức / nền tảng',
    permissions: [
      { code: PERM.orgModuleToggle, label: 'Bật / tắt module tổ chức', bundle: 'ORG' },
      { code: PERM.orgAuditView, label: 'Xem nhật ký tổ chức', bundle: 'ORG' },
      { code: PERM.orgModuleOverride, label: 'Ghi đè / khoá module', bundle: 'PLATFORM' },
      { code: PERM.moduleCatalogManage, label: 'Quản lý danh mục module', bundle: 'PLATFORM' },
    ],
  },
]

export const ALL_PERMISSION_META: PermissionMeta[] = PERMISSION_GROUPS.flatMap((group) => group.permissions)
