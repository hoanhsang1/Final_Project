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
  /** Mục menu: Tổng quản lý và ủy quyền. */
  MENU_DELEGATION: 'Ủy quyền',
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
  /** Module không tồn tại hoặc tổ chức chưa bật (400 `MODULE_NOT_ENABLED`). */
  MODULE_NOT_ENABLED: 'Module chưa được bật cho tổ chức hoặc không hợp lệ.',
  /** Quyền/bundle nằm ngoài module của phòng ban (403 `PERMISSION_OUT_OF_MODULE`). */
  PERMISSION_OUT_OF_MODULE:
    'Có quyền hoặc gói quyền không thuộc module của phòng ban đã chọn. Hãy bật module tương ứng hoặc bỏ quyền đó.',
  /** Dịch vụ tài khoản (Identity) không phản hồi (503). */
  IDENTITY_UNAVAILABLE: 'Hệ thống tài khoản đang không phản hồi. Vui lòng thử lại sau ít phút.',
  /** Dữ liệu vi phạm ràng buộc (mọi lỗi 400, kể cả mã theo trường). */
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
  MODULES: 'Module phụ trách',
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
  MODULE_REMOVAL_TITLE: 'Gỡ module khỏi phòng ban?',
  MODULE_REMOVAL_HINT:
    'Các chức danh dưới đây đang giữ quyền thuộc module bị gỡ. Quyền không bị xoá tự động nhưng sẽ mất hiệu lực cho tới khi module được bật lại.',
  MODULE_REMOVAL_MEMBERS: (count: number) => `${count} người đang bị ảnh hưởng.`,
  MODULE_REMOVAL_CONFIRM: 'Vẫn lưu thay đổi',
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
  NO_ASSIGNABLE_POSITION:
    'Các chức vụ hiện có đều dành cho giáo viên. Hãy tạo chức vụ khác, hoặc thêm giáo viên ở màn Giáo viên.',
  GO_TO_POSITIONS: 'Tới trang Chức vụ',
  TEACHER_POSITION_HINT:
    'Chức vụ giáo viên cần hồ sơ giáo viên; chọn chức vụ này để nhập chuyên môn ngay tại đây.',
  TEACHER_SECTION: 'Hồ sơ giáo viên',
  TEACHER_SECTION_HINT:
    'Đã chọn chức vụ giáo viên: nhập họ tên, điện thoại và chuyên môn (có thể chọn nhiều môn). Trạng thái mặc định là "Chưa có lớp".',
  FULL_NAME: 'Họ và tên',
  FULL_NAME_REQUIRED: 'Vui lòng nhập họ và tên giáo viên',
  FULL_NAME_TOO_LONG: 'Họ và tên tối đa 200 ký tự',
  PHONE: 'Số điện thoại',
  PHONE_REQUIRED: 'Vui lòng nhập số điện thoại giáo viên',
  PHONE_TOO_LONG: 'Số điện thoại tối đa 30 ký tự',
  STAFF_CODE: 'Mã nhân sự',
  STAFF_CODE_HINT: 'Để trống để hệ thống tự sinh theo chuẩn GV001, GV002…',
  SPECIALTIES: 'Chuyên môn (môn học)',
  SPECIALTIES_PLACEHOLDER: 'Chọn một hoặc nhiều môn',
  SPECIALTIES_REQUIRED: 'Chọn ít nhất một chuyên môn',
  CONTRACT_TYPE: 'Loại hợp đồng',
  CONTRACT_TYPE_PLACEHOLDER: 'Không bắt buộc',
  GO_TO_TEACHERS: 'Tới trang Giáo viên',
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
  REASON: 'Lý do',
  REASON_PLACEHOLDER: 'Ví dụ: bổ sung phụ trách tổ chuyên môn (không bắt buộc)',
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
    'Chức vụ là mẫu gồm một tập quyền (quyền lẻ và/hoặc gói quyền) trong một phạm vi. Gán chức vụ cho từng nhân viên — phòng ban không có quyền riêng.',
  EMPTY: 'Chưa có chức vụ nào. Tạo chức vụ đầu tiên để có thể gán cho nhân viên.',
  LOAD_ERROR: 'Không tải được danh sách chức vụ.',
  PERMISSIONS_LOAD_ERROR: 'Không tải được danh mục quyền.',
  CREATE: 'Thêm chức vụ',
  EDIT: 'Sửa chức vụ',
  NAME: 'Tên chức vụ',
  DESCRIPTION: 'Mô tả',
  PERMISSIONS: 'Quyền',
  BUNDLES: 'Gói quyền',
  SCOPE: 'Phạm vi',
  SCOPE_ORGANIZATION: 'Toàn tổ chức',
  SCOPE_DEPARTMENT: 'Theo phòng ban',
  DEPARTMENT: 'Phòng ban',
  DEPARTMENT_PLACEHOLDER: 'Để trống = theo phòng ban của nhân viên',
  CREATED_AT: 'Ngày tạo',
  ACTIONS: 'Thao tác',
  NAME_REQUIRED: 'Vui lòng nhập tên chức vụ',
  NAME_TOO_LONG: 'Tên chức vụ tối đa 200 ký tự',
  DESCRIPTION_TOO_LONG: 'Mô tả tối đa 1000 ký tự',
  NO_PERMISSION_HINT: 'Chức vụ không có quyền nào vẫn hợp lệ (ví dụ: chức vụ chỉ để phân loại).',
  CREATED: 'Đã tạo chức vụ.',
  UPDATED: 'Đã cập nhật chức vụ.',
  DELETE: 'Xoá',
  DELETE_CONFIRM_TITLE: 'Xoá chức vụ?',
  DELETE_CONFIRM: 'Thao tác này không hoàn tác được.',
  DELETED: 'Đã xoá chức vụ.',
  NO_PERMISSIONS: 'Chưa có quyền nào',
  CLONE: 'Nhân bản',
  CLONE_TITLE: 'Nhân bản chức vụ',
  CLONE_HINT:
    'Chức vụ mới thuộc phạm vi phòng ban đích. Quyền nằm ngoài module của phòng đích sẽ bị loại bỏ.',
  CLONE_NAME: 'Tên chức vụ mới',
  CLONE_NAME_PLACEHOLDER: 'Để trống = "<tên gốc> (bản sao)"',
  CLONE_DEPARTMENT: 'Phòng ban đích',
  CLONE_DEPARTMENT_REQUIRED: 'Vui lòng chọn phòng ban đích',
  CLONED: 'Đã nhân bản chức vụ.',
  CLONE_REMOVED_TITLE: 'Quyền bị loại khi nhân bản',
  CLONE_REMOVED_HINT: (count: number) => `${count} quyền không thuộc module của phòng đích đã bị loại.`,
  CLONE_DROPPED_BUNDLES: (names: string) => `Gói quyền bị loại: ${names}`,
  IMPACT_HINT: (holders: number) =>
    `${holders} người đang giữ chức vụ này. Nếu gỡ quyền, họ sẽ mất quyền tương ứng ngay khi lưu.`,
  MODULE_FILTERED_HINT:
    'Danh sách quyền đã lọc theo module của phòng ban đã chọn (quyền nhân sự dùng chung luôn hiển thị).',
} as const;

/** Màn Tổng quản lý & ủy quyền `/to-chuc/uy-quyen`, và trang tự xem `/uy-quyen`. */
export const MSG_DEL = {
  TITLE: 'Tổng quản lý & ủy quyền',
  SUBTITLE:
    'Tổng quản lý là chức danh cấp tổ chức và KHÔNG có quyền mặc định. Chủ tổ chức cấp quyền bằng một lần ủy quyền có thời hạn; thu hồi hoặc hết hạn có hiệu lực ngay ở lần kiểm tra quyền kế tiếp.',
  GM_SECTION: 'Tổng quản lý',
  GM_EMPTY: 'Chưa bổ nhiệm Tổng quản lý nào.',
  GM_APPOINT: 'Bổ nhiệm Tổng quản lý',
  GM_APPOINT_HINT:
    'Chức danh được tạo tự động nếu chưa có. Người được bổ nhiệm chỉ có quyền sau khi bạn ủy quyền bên dưới.',
  GM_CANDIDATE: 'Nhân sự',
  GM_CANDIDATE_REQUIRED: 'Vui lòng chọn nhân sự',
  GM_APPOINTED: 'Đã bổ nhiệm Tổng quản lý.',
  GM_REMOVE: 'Bãi nhiệm',
  GM_REMOVE_CONFIRM: 'Bãi nhiệm Tổng quản lý này? Mọi ủy quyền của họ sẽ mất hiệu lực ngay.',
  GM_REMOVED: 'Đã bãi nhiệm Tổng quản lý.',
  GM_NO_CANDIDATE: 'Không còn nhân sự nào có thể bổ nhiệm.',

  DELEGATION_SECTION: 'Ủy quyền đang có',
  DELEGATION_EMPTY: 'Chưa có ủy quyền nào.',
  DELEGATION_CREATE: 'Tạo ủy quyền',
  DELEGATION_EDIT: 'Điều chỉnh ủy quyền',
  DELEGATION_DELEGATE: 'Người nhận',
  DELEGATION_DELEGATE_REQUIRED: 'Vui lòng chọn Tổng quản lý',
  DELEGATION_NO_MANAGER: 'Hãy bổ nhiệm Tổng quản lý trước khi ủy quyền.',
  DELEGATION_PERMISSIONS: 'Quyền được ủy quyền',
  DELEGATION_PERMISSIONS_REQUIRED: 'Chọn ít nhất một quyền',
  DELEGATION_DURATION: 'Thời hạn',
  DELEGATION_DURATION_REQUIRED: 'Vui lòng chọn thời hạn',
  DURATION_7: '7 ngày',
  DURATION_30: '30 ngày',
  DURATION_90: '90 ngày',
  DURATION_NONE: 'Không đặt hạn',
  DURATION_CUSTOM: 'Tùy chọn ngày kết thúc',
  DELEGATION_UNTIL: 'Kết thúc lúc',
  DELEGATION_UNTIL_REQUIRED: 'Vui lòng chọn ngày kết thúc',
  DELEGATION_UNTIL_FUTURE: 'Ngày kết thúc phải ở tương lai',
  DELEGATION_REASON: 'Lý do',
  DELEGATION_REASON_PLACEHOLDER: 'Ví dụ: điều hành trong thời gian Chủ tổ chức vắng mặt',
  DELEGATION_CREATED: 'Đã tạo ủy quyền.',
  DELEGATION_UPDATED: 'Đã cập nhật ủy quyền.',
  DELEGATION_REVOKE: 'Thu hồi',
  DELEGATION_REVOKE_CONFIRM: 'Thu hồi ủy quyền này? Quyền sẽ mất hiệu lực ngay.',
  DELEGATION_REVOKE_REASON: 'Lý do thu hồi (không bắt buộc)',
  DELEGATION_REVOKED: 'Đã thu hồi ủy quyền.',
  DELEGATION_STATUS: 'Trạng thái',
  DEPARTMENT: 'Phòng ban',
  ACTIONS: 'Thao tác',
  STATUS_ACTIVE: 'Đang hiệu lực',
  STATUS_SCHEDULED: 'Chờ hiệu lực',
  STATUS_EXPIRED: 'Hết hạn',
  STATUS_REVOKED: 'Đã thu hồi',
  WINDOW: 'Hiệu lực',
  WINDOW_FROM: (from: string) => `Từ ${from}`,
  WINDOW_UNTIL: (to: string) => `đến ${to}`,
  WINDOW_FOREVER: 'không đặt hạn',
  ALL: 'Tất cả',
  ONLY_ACTIVE: 'Chỉ đang hiệu lực',

  MY_TITLE: 'Quyền được ủy quyền',
  MY_SUBTITLE:
    'Đây là những quyền Chủ tổ chức ủy quyền riêng cho bạn. Quyền không có trong danh sách này thì bạn không có, dù chức danh Tổng quản lý nghe rất cao.',
  MY_EMPTY: 'Bạn chưa được ủy quyền quyền nào.',
  MY_DELEGATOR: 'Người ủy quyền',
  MY_REVOKED_NOTE: 'Danh sách này cập nhật từ máy chủ mỗi lần mở trang; quyền bị thu hồi/hết hạn sẽ biến mất.',
  MY_DISABLED:
    'Tính năng xem quyền được ủy quyền chưa được bật ở môi trường này. Vui lòng liên hệ quản trị viên.',
  BACK_HOME: 'Về trang chủ',

  NOT_ACTIVE: 'Ủy quyền không còn hiệu lực hoặc đã bị thu hồi.',
  SELF_NOT_ALLOWED: 'Không thể tự ủy quyền cho chính mình.',
  RE_DELEGATION_FORBIDDEN: 'Người đang nhận ủy quyền không được ủy quyền lại cho người khác.',
  DELEGATE_NOT_MANAGER: 'Người nhận phải là Tổng quản lý đang được bổ nhiệm.',
  PERMISSION_NOT_HELD: 'Bạn chỉ được ủy quyền những quyền mình đang có.',
  ALREADY_MANAGER: 'Nhân sự này đã là Tổng quản lý.',
  NOT_MANAGER: 'Nhân sự này không còn là Tổng quản lý đang hiệu lực.',
  SELF_ESCALATION: 'Bạn không thể tự thay đổi chức danh của mình.',
  INVALID_WINDOW: 'Thời điểm kết thúc phải sau thời điểm bắt đầu.',
  SCOPE_UNSUPPORTED: 'Giai đoạn này chỉ hỗ trợ ủy quyền phạm vi toàn tổ chức.',
} as const;
