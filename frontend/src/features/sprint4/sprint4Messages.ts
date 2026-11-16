/** Câu chữ tiếng Việt — Sprint 4 (giáo viên & lớp). */

export const MSG_S4 = {
  TITLE: 'Đào tạo',
  MENU_ARIA: 'Menu đào tạo',
  OPEN_MENU: 'Mở menu đào tạo',
  MENU_TEACHERS: 'Giáo viên',
  MENU_CLASSES: 'Lớp học',
  MENU_STUDENTS: 'Sinh viên',
  MENU_STAFF: 'Nhân sự',
  MENU_TRANSFERS: 'Chuyển phòng ban',
  MENU_POSITIONS: 'Chức vụ',

  // Trạng thái chung
  NO_PERMISSION: 'Bạn không có quyền truy cập khu vực này.',
  NO_PERMISSION_HINT: 'Nếu bạn cho rằng đây là nhầm lẫn, hãy liên hệ quản trị viên tổ chức.',
  RETRY: 'Thử lại',
  BACK: 'Quay lại',
  CANCEL: 'Hủy',
  SAVE: 'Lưu',
  CREATE: 'Tạo mới',
  CONFIRM: 'Xác nhận',
  CLOSE: 'Đóng',
  LOADING: 'Đang tải…',
  COPY: 'Sao chép',
  COPIED: 'Đã sao chép.',

  // Lỗi chung
  NETWORK_ERROR: 'Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  NOT_FOUND: 'Không tìm thấy dữ liệu này.',
  SAVE_FAILED: 'Không lưu được, vui lòng thử lại.',
  INTERNAL_ERROR: 'Có lỗi xảy ra, vui lòng thử lại.',
  SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  IDENTITY_UNAVAILABLE: 'Không kiểm tra được quyền, vui lòng thử lại sau.',

  // Optimistic lock (§8.1) — luôn nhắc tải lại, không tự gửi lại version cũ.
  DATA_CHANGED: 'Dữ liệu vừa được thay đổi bởi người khác. Vui lòng tải lại.',
  STATUS_CHANGED: 'Trạng thái lớp vừa được thay đổi bởi người khác. Vui lòng tải lại.',
  CLOSE_STATE_CHANGED: 'Trạng thái đóng lớp vừa được thay đổi bởi người khác. Vui lòng tải lại.',
} as const;

export const MSG_TEACHER = {
  TITLE: 'Giáo viên',
  LIST_LOAD_ERROR: 'Không tải được danh sách giáo viên.',
  DETAIL_LOAD_ERROR: 'Không tải được thông tin giáo viên.',
  EMPTY: 'Chưa có giáo viên nào.',

  CREATE: 'Thêm giáo viên',
  CREATE_HINT:
    'Hệ thống tự sinh mã nhân sự (GV001, GV002…), tạo tài khoản đăng nhập và trả về mật khẩu tạm sau khi tạo.',
  EDIT: 'Chỉnh sửa',
  CREATED: 'Đã tạo giáo viên.',
  UPDATED: 'Đã cập nhật giáo viên.',
  STAFF_CODE_LOCKED: 'Mã nhân sự chỉ đọc, không thể sửa.',

  // Bộ lọc / danh sách
  SEARCH_LABEL: 'Tìm theo mã nhân sự hoặc họ tên',
  SPECIALTY_ALL: 'Tất cả chuyên môn',
  STATUS_ALL: 'Tất cả trạng thái dạy',
  NO_CLASS: 'Chưa có lớp',
  COL_CLASSES: 'Lớp đang phụ trách',

  // Chuyên môn
  MANAGE_SPECIALTIES: 'Quản lý chuyên môn',
  SPECIALTY_PLACEHOLDER: 'Tên chuyên môn mới',
  SPECIALTY_CREATED: 'Đã thêm chuyên môn.',
  SPECIALTY_LOAD_ERROR: 'Không tải được danh sách chuyên môn.',
  SPECIALTY_EMPTY: 'Chưa có chuyên môn nào.',
  SPECIALTY_REQUIRED: 'Vui lòng chọn ít nhất một chuyên môn.',

  // 409 SPECIALTY_MISMATCH (§5.1)
  MISMATCH_TITLE: 'Chuyên môn không còn phù hợp',
  MISMATCH_DESC: 'Chuyên môn mới không còn khớp với môn của các lớp sau:',
  CONFIRM_UPDATE: 'Vẫn lưu',

  // Modal mật khẩu tạm (§4.3)
  TEMP_PASSWORD_TITLE: 'Đã tạo giáo viên',
  TEMP_PASSWORD_LABEL: 'Mật khẩu tạm',
  TEMP_PASSWORD_HINT:
    'Hãy gửi mật khẩu này cho giáo viên. Họ bắt buộc phải đổi mật khẩu ở lần đăng nhập đầu tiên.',
  TEMP_PASSWORD_DONE: 'Tôi đã lưu mật khẩu',

  // Chi tiết
  TAB_INFO: 'Thông tin',
  TAB_CLASSES: 'Lớp phụ trách',
  TAB_HISTORY: 'Lịch sử thay đổi',
  CLASSES_EMPTY: 'Giáo viên chưa phụ trách lớp nào.',
  HISTORY_EMPTY: 'Chưa có lịch sử thay đổi.',
  POSITION_EMPTY_TEACHER: 'Chưa có chức vụ Giáo viên trong tổ chức. Hãy tạo chức vụ giáo viên trước.',
} as const;

export const MSG_CLASS = {
  TITLE: 'Lớp học',
  LIST_LOAD_ERROR: 'Không tải được danh sách lớp học.',
  DETAIL_LOAD_ERROR: 'Không tải được thông tin lớp học.',
  EMPTY: 'Chưa có lớp học nào.',

  ASSIGN: 'Gán giáo viên',
  CREATE: 'Thêm lớp học',
  CREATED: 'Đã tạo lớp học.',
  ASSIGN_TITLE: 'Gán/đổi giáo viên phụ trách',
  CANCEL: 'Hủy lớp',
  REQUEST_CLOSE: 'Yêu cầu đóng lớp',
  APPROVE_CLOSE: 'Duyệt đóng',
  REJECT_CLOSE: 'Từ chối',
  REOPEN: 'Mở lại lớp',

  TAB_INFO: 'Thông tin',
  TAB_STATUS_LOGS: 'Lịch sử trạng thái',
  TAB_CLOSE_EVENTS: 'Sự kiện đóng',

  ASSIGNED: 'Đã gán giáo viên.',
  CANCELED: 'Đã hủy lớp.',
  CLOSE_REQUESTED: 'Đã gửi yêu cầu đóng lớp.',
  CLOSE_APPROVED: 'Đã duyệt đóng lớp.',
  CLOSE_REJECTED: 'Đã từ chối yêu cầu đóng lớp.',
  REOPENED: 'Đã mở lại lớp.',
  ASSIGNMENT_BLOCKED:
    'Tổ chức đang dùng quy trình phân công của Epic 12 nên không thể gán giáo viên trực tiếp.',

  SEARCH_LABEL: 'Tìm theo mã lớp hoặc tên lớp',
  STATUS_ALL: 'Tất cả trạng thái',
  TEACHER_UNASSIGNED: 'Chưa phân công',
  TEACHER_SECTION: 'Giáo viên phụ trách',

  ASSIGN_SEARCH_LABEL: 'Tìm giáo viên theo mã hoặc họ tên',
  ASSIGN_EMPTY: 'Không có giáo viên phù hợp để gán.',
  ASSIGN_PICK: 'Chọn giáo viên ở bảng bên dưới.',

  LOGS_EMPTY: 'Chưa có lịch sử trạng thái.',
  EVENTS_EMPTY: 'Chưa có sự kiện đóng lớp.',
  LOGS_LOAD_ERROR: 'Không tải được lịch sử trạng thái.',
  EVENTS_LOAD_ERROR: 'Không tải được sự kiện đóng lớp.',

  CANCEL_REASON_LABEL: 'Lý do hủy',
  REQUEST_NOTE_LABEL: 'Ghi chú (tùy chọn)',
  REJECT_REASON_LABEL: 'Lý do từ chối',
  REOPEN_REASON_LABEL: 'Lý do mở lại',
  REASON_REQUIRED: 'Vui lòng nhập lý do.',

  APPROVE_CONFIRM: 'Duyệt yêu cầu đóng lớp này?',
  REOPEN_CONFIRM: 'Mở lại lớp này?',

  // Quy tắc 13 — môn học
  SUBJECT: 'Môn học',
  SUBJECT_PLACEHOLDER: 'Chọn môn học',
  SUBJECT_REQUIRED: 'Vui lòng chọn môn học để đối chiếu chuyên môn giáo viên.',
  SUBJECT_LOAD_ERROR: 'Không tải được danh sách môn học.',
  SUBJECT_UNASSIGNED: 'Chưa gán môn',

  // Quy tắc 17 — lớp cần phân công lại
  REASSIGN_NEEDED: 'Cần phân công lại',
  REASSIGN_BANNER_TITLE: 'Có lớp cần phân công lại giáo viên',
  REASSIGN_BANNER_DESC:
    'Giáo viên phụ trách đã chuyển phòng ban hoặc nghỉ việc. Lớp vẫn giữ nguyên dữ liệu; hãy gán giáo viên mới.',
  REASSIGN_FILTER: 'Chỉ lớp cần phân công lại',
  REASSIGN_ACTION: 'Phân công lại',
  REASSIGN_TITLE: 'Phân công lại giáo viên',
  REASSIGNED: 'Đã phân công lại giáo viên.',
  REASSIGN_REASON: 'Lý do gắn nhãn',

  // Quy tắc 14 — hủy lớp cần duyệt
  CANCEL_REQUESTED: 'Đã gửi yêu cầu hủy lớp tới trưởng phòng phụ trách đào tạo.',
  CANCEL_REQUEST_BANNER_TITLE: 'Yêu cầu hủy lớp đang chờ duyệt',
  CANCEL_REQUEST_BANNER_DESC:
    'Lớp còn sinh viên nên cần trưởng phòng phụ trách đào tạo duyệt trước khi hủy.',
  APPROVE_CANCEL: 'Duyệt hủy lớp',
  REJECT_CANCEL: 'Từ chối hủy',
  APPROVE_CANCEL_CONFIRM: 'Duyệt hủy lớp này? Dữ liệu lớp và sinh viên vẫn được giữ lại.',
  CANCEL_APPROVED: 'Đã duyệt hủy lớp.',
  CANCEL_REJECTED: 'Đã từ chối yêu cầu hủy lớp.',
  CANCEL_REQUEST_REASON_LABEL: 'Lý do xin hủy',

  // Sinh viên trong lớp
  TAB_STUDENTS: 'Sinh viên trong lớp',
  STUDENTS_EMPTY: 'Lớp chưa có sinh viên.',
  STUDENTS_LOAD_ERROR: 'Không tải được danh sách sinh viên của lớp.',
} as const;

export const MSG_STAFF = {
  TITLE: 'Nhân sự',
  SUBTITLE: 'Toàn bộ nhân viên thuộc phòng ban, không chỉ giáo viên.',
  LIST_LOAD_ERROR: 'Không tải được danh sách nhân sự.',
  EMPTY: 'Phòng ban chưa có nhân viên.',
  COL_USERNAME: 'Tên đăng nhập',
  COL_ROLE: 'Vai trò',
  COL_POSITIONS: 'Chức vụ',
  COL_APPOINTED_AT: 'Ngày bổ nhiệm',
  COL_STATUS: 'Trạng thái',
  DEPARTMENT_LABEL: 'Phòng ban',
  NO_POSITION: 'Chưa gán chức vụ',
  COL_ACTIONS: 'Thao tác',

  CREATE: 'Thêm nhân viên',
  CREATED: 'Đã thêm nhân viên.',
  CHANGE_POSITIONS: 'Chức vụ',
  POSITIONS_UPDATED: 'Đã cập nhật chức vụ.',
  REMOVE: 'Xóa',
  REMOVE_TITLE: 'Xóa nhân viên',
  REMOVE_CONFIRM: 'Nhân viên sẽ bị gỡ khỏi phòng ban và tài khoản bị vô hiệu hóa. Tiếp tục?',
  REMOVED: 'Đã xóa nhân viên.',

  STATUS_ACTIVE: 'Đang làm việc',
  STATUS_RESIGNED: 'Đã nghỉ việc',
  DETAIL: 'Chi tiết',
  DETAIL_TITLE: 'Chi tiết nhân sự',
  DETAIL_LOAD_ERROR: 'Không tải được chi tiết nhân sự.',
  SENSITIVE_HIDDEN: 'Không có quyền xem (cần employee.view_detail)',
  TEACHER_PROFILE: 'Hồ sơ giáo viên',
  CONTRACT_TYPE: 'Loại hợp đồng',
  TEACHING_STATUS: 'Trạng thái dạy',
  NO_CLASS_LABEL: 'Chưa có lớp',
  ASSIGNMENT_HISTORY: 'Lịch sử bổ nhiệm / thu hồi',
  ASSIGNMENT_EMPTY: 'Chưa có lịch sử bổ nhiệm.',
  ASSIGNMENT_POSITION: 'Chức vụ',
  ASSIGNMENT_SCOPE: 'Phạm vi',
  ASSIGNMENT_PERIOD: 'Hiệu lực',
  ASSIGNMENT_STATUS: 'Trạng thái',
  ASSIGNMENT_REASON: 'Lý do bổ nhiệm',
  ASSIGNMENT_REVOKED: 'Thu hồi',
  ASSIGNMENT_ASSIGNED_BY: 'Người bổ nhiệm',

  RESIGN: 'Nghỉ việc',
  RESIGN_TITLE: 'Yêu cầu nghỉ việc',
  RESIGN_HINT:
    'Yêu cầu chỉ cần HR duyệt một bước. Khi duyệt: tài khoản bị vô hiệu hoá, mọi chức danh bị thu hồi và lịch sử được ghi lại.',
  RESIGN_REASON: 'Lý do nghỉ việc',
  RESIGN_REASON_REQUIRED: 'Vui lòng nhập lý do nghỉ việc',
  RESIGN_CREATED: 'Đã tạo yêu cầu nghỉ việc.',
  RESIGN_INBOX: 'Hộp thư nghỉ việc',
  RESIGN_INBOX_TITLE: 'Yêu cầu nghỉ việc chờ duyệt',
  RESIGN_EMPTY: 'Không có yêu cầu nghỉ việc nào.',
  RESIGN_LOAD_ERROR: 'Không tải được yêu cầu nghỉ việc.',
  RESIGN_APPROVE: 'Duyệt',
  RESIGN_REJECT: 'Từ chối',
  RESIGN_APPROVED: 'Đã duyệt nghỉ việc.',
  RESIGN_REJECTED: 'Đã từ chối yêu cầu nghỉ việc.',
  RESIGN_APPROVE_CONFIRM:
    'Duyệt nghỉ việc sẽ vô hiệu hoá tài khoản và thu hồi mọi chức danh của nhân sự. Tiếp tục?',
  RESIGN_REJECT_CONFIRM: 'Từ chối yêu cầu nghỉ việc này?',
  RESIGN_REQUESTER: 'Người yêu cầu',
  RESIGN_REQUESTED_AT: 'Thời điểm yêu cầu',
  RESIGN_STATUS: 'Trạng thái',
} as const;

export const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Chủ tổ chức',
  MANAGER: 'Quản lý',
  STAFF: 'Nhân viên',
  STUDENT: 'Sinh viên',
};

/** Quy tắc 12 — cổng thông tin riêng của sinh viên (chỉ dữ liệu SELF/CLASS). */
export const MSG_PORTAL = {
  TITLE: 'Cổng thông tin sinh viên',
  PROFILE_SECTION: 'Hồ sơ của tôi',
  CLASSES_SECTION: 'Lớp học của tôi',
  CLASSES_EMPTY: 'Bạn chưa được xếp vào lớp nào.',
  LOAD_ERROR: 'Không tải được dữ liệu của bạn.',
  NO_ACCESS: 'Bạn không có quyền truy cập cổng sinh viên.',
  LOGOUT: 'Đăng xuất',
} as const;

export const MSG_STUDENT = {
  TITLE: 'Sinh viên',
  LIST_LOAD_ERROR: 'Không tải được danh sách sinh viên.',
  EMPTY: 'Chưa có sinh viên nào.',

  CREATE: 'Thêm sinh viên',
  CREATED: 'Đã thêm sinh viên.',
  EDIT: 'Cập nhật sinh viên',
  UPDATED: 'Đã cập nhật sinh viên.',
  DELETED: 'Đã xóa sinh viên.',
  DELETE_TITLE: 'Xóa sinh viên',
  DELETE_CONFIRM: 'Sinh viên sẽ được xóa mềm và gỡ khỏi lớp đang học. Tiếp tục?',
  AUTO_CODE: 'Mã sinh viên do hệ thống tự sinh theo chuẩn SV001, SV002…',

  SEARCH_LABEL: 'Tìm theo mã hoặc tên sinh viên',
  STATUS_ALL: 'Tất cả trạng thái',
  NO_CLASS: 'Chưa xếp lớp',

  // Quy tắc 12 — tài khoản đăng nhập
  COL_ACCOUNT: 'Tài khoản',
  ACCOUNT_NONE: 'Chưa có tài khoản',
  ACCOUNT_EMAIL_REQUIRED: 'Cần nhập email sinh viên trước khi tạo tài khoản.',
  CREATE_ACCOUNT: 'Tạo tài khoản',
  ACCOUNT_CREATE_TITLE: 'Tạo tài khoản đăng nhập',
  ACCOUNT_CREATE_CONFIRM:
    'Tạo tài khoản đăng nhập vai trò Sinh viên cho hồ sơ này? Tên đăng nhập là email của sinh viên.',
  ACCOUNT_CREATED: 'Đã tạo tài khoản sinh viên.',
  ACCOUNT_TEMP_TITLE: 'Đã tạo tài khoản sinh viên',
  ACCOUNT_TEMP_LABEL: 'Mật khẩu tạm',
  ACCOUNT_TEMP_HINT:
    'Gửi tên đăng nhập và mật khẩu này cho sinh viên. Sinh viên bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên.',
  ACCOUNT_TEMP_DONE: 'Tôi đã lưu mật khẩu',
} as const;
