/**
 * Câu chữ tiếng Việt của khu vực Owner (Sprint 3).
 *
 * Tách khỏi `features/admin/adminMessages.ts` vì hai console là hai khu vực
 * nghiệp vụ khác nhau; gộp lại sẽ khiến file message phình to và khó tra.
 */

/** Khung console của Owner (`/to-chuc`). */
export const MSG_OWNER = {
  /** Tiêu đề trên header console. */
  TITLE: 'Khu vực tổ chức',
  /** Nhãn cho trình đọc màn hình của menu. */
  MENU_ARIA: 'Menu quản lý tổ chức',
  /** `aria-label` của nút mở menu ở màn hình nhỏ. */
  OPEN_MENU: 'Mở menu quản lý tổ chức',
  /** Mục menu: phòng ban. */
  MENU_DEPARTMENTS: 'Phòng ban',
  /** Mục menu: chức vụ. */
  MENU_POSITIONS: 'Chức vụ',
  /** Không đủ quyền vào khu vực tổ chức (403 tại chỗ). */
  NO_PERMISSION: 'Bạn không có quyền truy cập khu vực quản lý tổ chức.',
  /** Câu chung khi lưu thất bại (NFR-REL-001: lỗi không bao giờ hiện thành công). */
  SAVE_FAILED: 'Không lưu được, vui lòng thử lại.',
  /** Không kết nối được máy chủ (không có response). */
  NETWORK_ERROR: 'Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.',
  /** Không có quyền (403 từ BE). */
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  /** Không tìm thấy đối tượng (404). */
  NOT_FOUND: 'Không tìm thấy dữ liệu này.',
  /** Mã quyền không có trong danh mục (400 `UNKNOWN_PERMISSION`). */
  UNKNOWN_PERMISSION: 'Có quyền không hợp lệ trong danh sách. Vui lòng tải lại trang và thử lại.',
  /** Dịch vụ tài khoản (Identity) không phản hồi (503). */
  IDENTITY_UNAVAILABLE: 'Hệ thống tài khoản đang không phản hồi. Vui lòng thử lại sau ít phút.',
  /** Dữ liệu vi phạm ràng buộc (400 `VALIDATION_ERROR`). */
  INVALID_INPUT: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các trường đã nhập.',
  /** Nút thử lại khi tải lỗi. */
  RETRY: 'Thử lại',
  /** Nút huỷ trong modal. */
  CANCEL: 'Huỷ',
  /** Nút lưu trong modal. */
  SAVE: 'Lưu',
} as const;

/** Màn Phòng ban `/to-chuc`. */
export const MSG_DEPT = {
  TITLE: 'Phòng ban',
  SUBTITLE: 'Phòng ban là đơn vị tổ chức dùng để giới hạn phạm vi dữ liệu của nhân viên.',
  EMPTY: 'Chưa có phòng ban nào. Tạo phòng ban đầu tiên để bắt đầu.',
  LOAD_ERROR: 'Không tải được danh sách phòng ban.',
  CREATE: 'Thêm phòng ban',
  EDIT: 'Sửa phòng ban',
  NAME: 'Tên phòng ban',
  DESCRIPTION: 'Mô tả',
  CREATED_AT: 'Ngày tạo',
  ACTIONS: 'Thao tác',
  NAME_REQUIRED: 'Vui lòng nhập tên phòng ban',
  NAME_TOO_LONG: 'Tên phòng ban tối đa 200 ký tự',
  DESCRIPTION_TOO_LONG: 'Mô tả tối đa 1000 ký tự',
  CREATED: 'Đã tạo phòng ban.',
  UPDATED: 'Đã cập nhật phòng ban.',
  DELETE: 'Xoá',
  /** Nhãn ngắn trên nút trong bảng (nhãn đầy đủ nằm ở `EDIT`). */
  EDIT_SHORT: 'Sửa',
  DELETE_CONFIRM_TITLE: 'Xoá phòng ban?',
  DELETE_CONFIRM: 'Thao tác này không hoàn tác được.',
  DELETED: 'Đã xoá phòng ban.',
  VIEW_MEMBERS: 'Xem nhân viên',
} as const;

/** Màn chi tiết phòng ban (nhân viên) `/to-chuc/phong-ban/:id`. */
export const MSG_MEM = {
  TITLE: 'Nhân viên phòng ban',
  BACK: 'Quay lại danh sách phòng ban',
  EMPTY: 'Phòng ban chưa có nhân viên nào.',
  LOAD_ERROR: 'Không tải được danh sách nhân viên.',
  NOT_FOUND: 'Không tìm thấy phòng ban này.',
  NOT_FOUND_HINT: 'Phòng ban có thể đã bị xoá, hoặc bạn không có quyền xem.',
  ADD: 'Thêm nhân viên',
  ADD_TITLE: 'Thêm nhân viên vào phòng ban',
  USER_ID: 'Mã nhân viên',
  USERNAME: 'Tên đăng nhập',
  EMAIL: 'Email',
  ROLE: 'Vai trò trong phòng ban',
  ROLE_REQUIRED: 'Vui lòng chọn vai trò',
  POSITIONS: 'Chức vụ',
  NO_POSITIONS: 'Chưa gán chức vụ',
  POSITIONS_REQUIRED: 'Chọn ít nhất một chức vụ',
  NO_POSITION_CATALOG: 'Chưa có chức vụ nào trong tổ chức. Hãy tạo chức vụ trước khi thêm nhân viên.',
  GO_TO_POSITIONS: 'Tới trang Chức vụ',
  USERNAME_REQUIRED: 'Vui lòng nhập tên đăng nhập',
  USERNAME_TOO_LONG: 'Tên đăng nhập tối đa 100 ký tự',
  EMAIL_REQUIRED: 'Vui lòng nhập email',
  EMAIL_INVALID: 'Email không hợp lệ',
  APPOINTED_AT: 'Ngày bổ nhiệm',
  CREATED: 'Đã tạo nhân viên.',
  CREATE_HINT: 'Hệ thống tự sinh mật khẩu tạm; nhân viên phải đổi khi đăng nhập lần đầu.',
  TEMP_PASSWORD_TITLE: 'Mật khẩu tạm của nhân viên',
  TEMP_PASSWORD_HINT:
    'Mật khẩu này chỉ hiện một lần. Hãy sao chép và gửi cho nhân viên ngay bây giờ — đóng hộp thoại là không xem lại được.',
  TEMP_PASSWORD_ACK: 'Tôi đã lưu mật khẩu',
  COPY: 'Sao chép',
  COPIED: 'Đã sao chép.',
  COPY_FAILED: 'Không sao chép được. Hãy chọn và sao chép thủ công.',
  CHANGE_POSITIONS: 'Đổi chức vụ',
  POSITIONS_UPDATED: 'Đã cập nhật chức vụ cho nhân viên.',
  REMOVE: 'Xoá khỏi phòng ban',
  REMOVE_CONFIRM_TITLE: 'Xoá nhân viên khỏi phòng ban?',
  REMOVE_CONFIRM: 'Nhân viên sẽ mất quyền truy cập dữ liệu của phòng ban này.',
  REMOVED: 'Đã xoá nhân viên khỏi phòng ban.',
  ACTIONS: 'Thao tác',
} as const;

/** Màn Chức vụ `/to-chuc/chuc-vu`. */
export const MSG_POS = {
  TITLE: 'Chức vụ',
  SUBTITLE:
    'Chức vụ là mẫu gồm một tập quyền. Gán chức vụ cho từng nhân viên — phòng ban không có quyền riêng.',
  EMPTY: 'Chưa có chức vụ nào. Tạo chức vụ đầu tiên để có thể gán cho nhân viên.',
  LOAD_ERROR: 'Không tải được danh sách chức vụ.',
  PERMISSIONS_LOAD_ERROR: 'Không tải được danh mục quyền.',
  CREATE: 'Thêm chức vụ',
  EDIT: 'Sửa chức vụ',
  NAME: 'Tên chức vụ',
  DESCRIPTION: 'Mô tả',
  PERMISSIONS: 'Quyền',
  CREATED_AT: 'Ngày tạo',
  ACTIONS: 'Thao tác',
  NAME_REQUIRED: 'Vui lòng nhập tên chức vụ',
  NAME_TOO_LONG: 'Tên chức vụ tối đa 200 ký tự',
  DESCRIPTION_TOO_LONG: 'Mô tả tối đa 1000 ký tự',
  PERMISSIONS_REQUIRED: 'Chọn ít nhất một quyền cho chức vụ',
  CREATED: 'Đã tạo chức vụ.',
  UPDATED: 'Đã cập nhật chức vụ.',
  DELETE: 'Xoá',
  DELETE_CONFIRM_TITLE: 'Xoá chức vụ?',
  DELETE_CONFIRM: 'Thao tác này không hoàn tác được.',
  DELETED: 'Đã xoá chức vụ.',
  NO_PERMISSIONS: 'Chưa có quyền nào',
} as const;
