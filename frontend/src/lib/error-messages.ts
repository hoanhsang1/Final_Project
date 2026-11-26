const MESSAGES: Record<string, string> = {
  // Xác thực & tài khoản
  INVALID_CREDENTIALS: 'Tên đăng nhập hoặc mật khẩu không đúng.',
  ACCOUNT_NOT_ACTIVE: 'Tài khoản chưa được kích hoạt hoặc đã bị khoá.',
  ACCOUNT_LOCKED: 'Tài khoản đang bị tạm khoá do đăng nhập sai nhiều lần. Vui lòng thử lại sau.',
  ORGANIZATION_REQUIRED: 'Tài khoản chưa gắn với tổ chức nào.',
  ORGANIZATION_NOT_FOUND: 'Không tìm thấy tổ chức của tài khoản.',
  ORGANIZATION_INACTIVE: 'Tổ chức đang bị tạm ngưng. Vui lòng liên hệ quản trị hệ thống.',
  INVALID_SUPER_ADMIN: 'Cấu hình tài khoản quản trị hệ thống không hợp lệ.',
  UNAUTHENTICATED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  PASSWORD_CHANGE_REQUIRED: 'Bạn cần đổi mật khẩu tạm trước khi tiếp tục.',
  CURRENT_PASSWORD_INCORRECT: 'Mật khẩu hiện tại không đúng.',
  NEW_PASSWORD_INVALID: 'Mật khẩu mới phải từ 12 đến 72 ký tự.',
  PASSWORD_UNCHANGED: 'Mật khẩu mới trùng với mật khẩu hiện tại.',
  VALIDATION_ERROR: 'Dữ liệu gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.',

  // Tổ chức & module
  ORGANIZATION_ALREADY_REVIEWED: 'Tổ chức này đã được xử lý trước đó.',
  ORGANIZATION_SUSPENDED: 'Tổ chức đang bị tạm ngưng nên không thể thay đổi module.',
  MODULES_EMPTY: 'Cần chọn ít nhất một module.',
  INVALID_MODULE: 'Module không tồn tại hoặc đã ngừng hoạt động.',
  MODULE_NOT_ENABLED: 'Module này chưa được bật cho tổ chức hoặc phòng ban của bạn.',
  MODULE_IS_CORE: 'Đây là module lõi, không thể tắt.',
  MODULE_LOCKED_BY_ADMIN: 'Module đang bị quản trị hệ thống khóa. Chủ tổ chức không thể bật lại.',
  MODULE_ALREADY_IN_STATE: 'Module đã ở trạng thái bạn chọn.',
  MODULES_REQUIRED: 'Cần chọn ít nhất một module khi đăng ký.',
  REGISTER_PASSWORD_TOO_SHORT: 'Mật khẩu phải có ít nhất 12 ký tự.',
  EMAIL_INVALID: 'Email không hợp lệ.',
  ORGANIZATION_TYPE_REQUIRED: 'Cần chọn loại tổ chức.',
  USERNAME_EXISTS: 'Tên đăng nhập đã tồn tại.',
  EMAIL_EXISTS: 'Email đã được sử dụng.',
  ACCOUNT_EXISTS: 'Tên đăng nhập đã tồn tại trong hệ thống.',
  ROLE_NOT_ASSIGNABLE: 'Không thể gán vai trò này cho tài khoản.',

  // Phòng ban & chức vụ
  DEPARTMENT_NOT_FOUND: 'Không tìm thấy phòng ban.',
  DEPARTMENT_NOT_EMPTY: 'Phòng ban vẫn còn nhân sự. Hãy chuyển hoặc gỡ nhân sự trước khi xoá.',
  POSITION_NOT_FOUND: 'Không tìm thấy chức vụ.',
  POSITION_IN_USE: 'Chức vụ đang được gán cho nhân sự, không thể xoá.',
  UNKNOWN_PERMISSION: 'Có quyền không tồn tại trong danh mục.',
  PERMISSION_OUT_OF_MODULE: 'Quyền đã chọn không thuộc module đang bật của phòng ban.',
  STAFF_CODE_EXISTS: 'Mã nhân viên đã tồn tại trong tổ chức.',
  INVALID_POSITION: 'Chức vụ đã chọn không hợp lệ cho nhân sự này.',
  INVALID_SPECIALTY: 'Chuyên môn đã chọn không hợp lệ.',
  SPECIALTY_EXISTS: 'Chuyên môn này đã tồn tại.',
  SELF_ESCALATION_NOT_ALLOWED: 'Bạn không thể cấp quyền vượt quá quyền hiện có của mình.',
  VALIDATION_ERROR_POSITION: 'Danh sách chức vụ chưa hợp lệ.',

  // Nhân sự & duyệt
  MEMBER_NOT_FOUND: 'Không tìm thấy nhân sự trong phòng ban.',
  MEMBER_NOT_ACTIVE: 'Nhân sự không còn ở trạng thái đang làm việc.',
  SELF_APPROVAL_NOT_ALLOWED: 'Bạn không thể tự duyệt yêu cầu của chính mình.',
  TRANSFER_NOT_FOUND: 'Không tìm thấy yêu cầu chuyển phòng.',
  TRANSFER_SAME_DEPARTMENT: 'Phòng ban nguồn và đích phải khác nhau.',
  TRANSFER_HEAD_MISSING: 'Phòng ban nguồn hoặc đích chưa có Trưởng phòng nên không thể tạo yêu cầu.',
  TRANSFER_ALREADY_PENDING: 'Nhân sự này đang có một yêu cầu chuyển phòng chờ duyệt.',
  TRANSFER_OWNER_NOT_ALLOWED: 'Chủ tổ chức không thể chuyển phòng ban.',
  TRANSFER_STEP_NOT_ALLOWED: 'Bạn không phải người duyệt của bước này.',
  TRANSFER_CANCEL_NOT_ALLOWED: 'Chỉ người tạo mới huỷ được yêu cầu đang chờ.',
  RESIGNATION_ALREADY_PENDING: 'Nhân sự này đã có yêu cầu nghỉ việc đang chờ.',
  RESIGNATION_NOT_PENDING: 'Yêu cầu nghỉ việc không còn ở trạng thái chờ duyệt.',

  // Uỷ quyền
  DELEGATION_NOT_FOUND: 'Không tìm thấy uỷ quyền.',
  DELEGATION_NOT_ACTIVE: 'Uỷ quyền đã hết hiệu lực hoặc bị thu hồi.',
  DELEGATION_SELF_NOT_ALLOWED: 'Không thể uỷ quyền cho chính mình.',
  DELEGATION_RE_DELEGATION_FORBIDDEN: 'Không được uỷ quyền lại quyền đã nhận.',
  DELEGATION_PERMISSION_NOT_HELD: 'Bạn chỉ có thể uỷ quyền quyền mà mình đang có.',
  DELEGATION_INVALID_WINDOW: 'Thời hạn uỷ quyền không hợp lệ.',
  DELEGATION_SCOPE_NOT_SUPPORTED: 'Phạm vi uỷ quyền này chưa được hỗ trợ.',
  DELEGATE_NOT_GENERAL_MANAGER: 'Người nhận uỷ quyền phải là Tổng quản lý.',
  GENERAL_MANAGER_ALREADY_APPOINTED: 'Nhân sự này đã là Tổng quản lý.',
  GENERAL_MANAGER_NOT_APPOINTED: 'Nhân sự này chưa được bổ nhiệm Tổng quản lý.',

  // Lịch học & phòng học
  ROOM_NOT_AVAILABLE: 'Phòng học không khả dụng (đang bảo trì, có thiết bị hỏng hoặc không đủ chỗ).',
  ROOM_TYPE_MISMATCH: 'Môn này cần phòng máy — vui lòng chọn phòng máy tính.',

  // Môn học & danh mục
  SUBJECT_CATEGORY_NOT_FOUND: 'Không tìm thấy danh mục môn học.',
  SUBJECT_CATEGORY_EXISTS: 'Tên danh mục môn học đã tồn tại trong tổ chức.',
  SUBJECT_CATEGORY_INVALID: 'Danh mục môn học không hợp lệ hoặc đã ngừng hoạt động.',
  ROOM_REQUIREMENT_INVALID: 'Yêu cầu phòng không hợp lệ. Chỉ chọn "Bất kỳ" hoặc "Phòng máy".',
  SUBJECT_USAGE_CONFIRMATION_REQUIRED:
    'Môn học đang được lớp hoặc chương trình sử dụng. Xác nhận để vẫn lưu thay đổi.',

  // Dịch vụ nội bộ
  IDENTITY_UNAVAILABLE: 'Dịch vụ tài khoản tạm thời không phản hồi. Vui lòng thử lại.',
  PEOPLE_UNAVAILABLE: 'Dịch vụ nhân sự tạm thời không phản hồi. Vui lòng thử lại.',
  FACILITY_UNAVAILABLE: 'Dịch vụ cơ sở vật chất tạm thời không phản hồi. Vui lòng thử lại.',
  DEPARTMENT_PERMISSIONS_UNAVAILABLE: 'Chưa tải được danh mục quyền của phòng ban.',
}

const STATUS_FALLBACK: Record<number, string> = {
  400: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các trường được đánh dấu.',
  401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu yêu cầu.',
  409: 'Dữ liệu đã thay đổi hoặc xung đột. Vui lòng tải lại và thử lại.',
  422: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.',
  429: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
  500: 'Máy chủ gặp sự cố. Vui lòng thử lại sau.',
  503: 'Dịch vụ tạm thời không sẵn sàng. Vui lòng thử lại sau.',
}

/**
 * Dịch lỗi từ backend sang tiếng Việt. Backend trả message tiếng Anh —
 * không bao giờ hiển thị nguyên văn.
 */
export function translateError(input: {
  code?: string | null
  status?: number | null
  message?: string | null
}): string {
  const code = input.code?.trim()
  if (code && MESSAGES[code]) return MESSAGES[code]!
  if (code && code.startsWith('TEACHER')) {
    return 'Không thể gán giáo viên: giáo viên phải đang ở trạng thái “Đang dạy”.'
  }
  if (input.status && STATUS_FALLBACK[input.status]) return STATUS_FALLBACK[input.status]!
  if (!input.status) return 'Không kết nối được tới máy chủ. Kiểm tra đường truyền và thử lại.'
  return 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.'
}
