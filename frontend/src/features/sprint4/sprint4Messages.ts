/** Câu chữ tiếng Việt — Sprint 4 (giáo viên & lớp). */

export const MSG_S4 = {
  TITLE: 'Đào tạo',
  MENU_ARIA: 'Menu đào tạo',
  OPEN_MENU: 'Mở menu đào tạo',
  MENU_TEACHERS: 'Giáo viên',
  MENU_CLASSES: 'Lớp học',

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
  CREATE_HINT: 'Hệ thống tạo tài khoản đăng nhập và trả về mật khẩu tạm sau khi tạo.',
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
} as const;
