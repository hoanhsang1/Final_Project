/**
 * Câu chữ tiếng Việt cho khu vực quản trị (Sprint 2).
 *
 * Mã `MSG-*` bám đúng hệ mã của Đặc tả Sprint 2 §3. BE trả message tiếng Anh →
 * FE dịch qua đây, không hiện thẳng tiếng Anh cho người dùng cuối.
 *
 * Các mã `MSG-ORG-01/13/15/16/17` chưa được đặc tả gán câu chữ cụ thể — đây là
 * câu chữ FE chốt, giữ mã để sau này khớp với tài liệu.
 */

/** `MSG-ADM-*` — khung console quản trị. */
export const MSG_ADM = {
  /** `MSG-ADM-01` — tiêu đề console. */
  TITLE: 'Khu vực quản trị',
  /** `MSG-ADM-02` — không đủ quyền vào khu vực quản trị. */
  NO_PERMISSION: 'Bạn không có quyền truy cập khu vực quản trị.',
  /** `MSG-ADM-03` — nút đăng xuất. */
  LOGOUT: 'Đăng xuất',
  /** `MSG-ADM-04` — mục menu: Tổng quan. */
  MENU_OVERVIEW: 'Tổng quan',
  /** `MSG-ADM-05` — mục menu: Tất cả tổ chức. */
  MENU_ORG_ALL: 'Tất cả tổ chức',
  /** `MSG-ADM-06` — mục menu: Danh mục module. */
  MENU_MODULES: 'Danh mục module',
  /** `MSG-ADM-07` — mục menu: Quản lý tài khoản. */
  MENU_ACCOUNTS: 'Quản lý tài khoản',
  /** `MSG-ADM-08` — mục menu: Nhật ký hệ thống. */
  MENU_AUDIT: 'Nhật ký hệ thống',
  /** `MSG-ADM-09` — nhãn menu cho trình đọc màn hình. */
  MENU_ARIA: 'Menu quản trị',
  /** `MSG-ADM-10` — nhãn nút mở menu ở màn hình nhỏ (`aria-label`). */
  OPEN_MENU: 'Mở menu quản trị',
} as const;

/** `MSG-ORG-*` — duyệt / từ chối tổ chức. */
export const MSG_ORG = {
  /** `MSG-ORG-01` — mục menu. */
  MENU: 'Tổ chức chờ duyệt',
  /** `MSG-ORG-02` — danh sách rỗng. */
  EMPTY: 'Không có tổ chức nào đang chờ duyệt',
  /** `MSG-ORG-03` — không tải được danh sách. */
  LOAD_ERROR: 'Không tải được danh sách tổ chức.',
  /** Không tải được chi tiết tổ chức (màn chi tiết). */
  DETAIL_ERROR: 'Không tải được thông tin tổ chức.',
  /** `MSG-ORG-04` — nút thử lại. */
  RETRY: 'Thử lại',
  /** `MSG-ORG-05` — lý do từ chối bắt buộc. */
  REASON_REQUIRED: 'Vui lòng nhập lý do từ chối',
  /** `MSG-ORG-06` — lý do từ chối quá dài. */
  REASON_TOO_LONG: 'Lý do từ chối tối đa 500 ký tự',
  /** `MSG-ORG-09` — tổ chức đã được xử lý. */
  ALREADY_REVIEWED: 'Tổ chức này đã được xử lý.',
  /** `MSG-ORG-10` — không tìm thấy tổ chức (404). */
  NOT_FOUND: 'Không tìm thấy tổ chức.',
  /** `MSG-ORG-11` — lỗi/timeout khi lưu (NFR-REL-001). */
  SAVE_FAILED: 'Không lưu được, vui lòng thử lại.',
  /** `MSG-ORG-12` — không đủ quyền (403 từ BE). */
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  /** `MSG-ORG-13` — tiêu đề khối thông tin tổ chức. */
  INFO: 'Thông tin tổ chức',
  /** `MSG-ORG-14` — phiên đăng nhập hết hạn. */
  SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  /** `MSG-ORG-15` — tiêu đề khối người đại diện. */
  OWNERS: 'Người đại diện',
  /** `MSG-ORG-16` — nút xem chi tiết. */
  VIEW: 'Xem',
  /** `MSG-ORG-17` — nút quay lại danh sách. */
  BACK_TO_LIST: 'Quay lại danh sách',
  /** `MSG-ORG-18` — tiêu đề màn danh sách. */
  LIST_TITLE: 'Tổ chức chờ duyệt',
  /** Phụ đề màn danh sách. */
  LIST_SUBTITLE: 'Duyệt để tổ chức có thể bắt đầu sử dụng hệ thống.',
  /** Tiêu đề modal duyệt. */
  APPROVE_TITLE: 'Duyệt tổ chức',
  /** Tiêu đề modal từ chối. */
  REJECT_TITLE: 'Từ chối tổ chức',
  /** Nút xác nhận modal duyệt. */
  APPROVE: 'Duyệt',
  /** Nút xác nhận modal từ chối. */
  REJECT: 'Từ chối',
  /** Nút huỷ. */
  CANCEL: 'Huỷ',
  /** Nhãn ô nhập lý do từ chối. */
  REASON_LABEL: 'Lý do từ chối',
  /** `MSG-ORG-19` — tiêu đề màn tất cả tổ chức. */
  ALL_LIST_TITLE: 'Tất cả tổ chức',
  /** Phụ đề màn tất cả tổ chức. */
  ALL_LIST_SUBTITLE: 'Xem và quản lý mọi tổ chức trên hệ thống.',
  /** `MSG-ORG-20` — nút vô hiệu hoá tổ chức (`BR-04`: chữ là "Vô hiệu hoá", không phải "Xoá"). */
  SUSPEND: 'Vô hiệu hoá',
  /** `MSG-ORG-21` — nút kích hoạt lại tổ chức. */
  REACTIVATE: 'Kích hoạt lại',
  /** Tiêu đề modal vô hiệu hoá. */
  SUSPEND_TITLE: 'Vô hiệu hoá tổ chức',
  /** Tiêu đề modal kích hoạt lại. */
  REACTIVATE_TITLE: 'Kích hoạt lại tổ chức',
  /** Nhãn ô nhập lý do vô hiệu hoá (bắt buộc — cần audit). */
  SUSPEND_REASON_LABEL: 'Lý do vô hiệu hoá',
  /** Lý do vô hiệu hoá bắt buộc. */
  SUSPEND_REASON_REQUIRED: 'Vui lòng nhập lý do vô hiệu hoá',
  /** Lý do vô hiệu hoá quá dài. */
  SUSPEND_REASON_TOO_LONG: 'Lý do tối đa 500 ký tự',
  /** Thông báo vô hiệu hoá thành công. */
  SUSPENDED: 'Đã vô hiệu hoá tổ chức.',
  /** Thông báo kích hoạt lại thành công. */
  REACTIVATED: 'Đã kích hoạt lại tổ chức.',
  /** Nút "Xem lịch sử" trên màn chi tiết. */
  HISTORY: 'Xem lịch sử',
  /** Nhãn checkbox gửi email thông báo (C3, `D-27`). */
  NOTIFY_EMAIL: 'Gửi email thông báo cho chủ tổ chức',
  /** Tooltip nút "Duyệt lại" — BE chưa cho duyệt lại tổ chức đã từ chối (`Q-18`). */
  REAPPROVE_DISABLED: 'BE chưa cho duyệt lại tổ chức đã từ chối',
  /** Ghi chú khi màn còn chờ endpoint `D-20`. */
  ENDPOINT_PENDING_20: 'Danh sách mọi tổ chức đang chờ backend.',
  /** Danh sách tất cả tổ chức rỗng. */
  ALL_EMPTY: 'Không có tổ chức nào',
  /** Ô tìm kiếm trong màn tất cả tổ chức. */
  SEARCH: 'Tìm kiếm',
  /** Bộ lọc: trạng thái. */
  FILTER_STATUS: 'Trạng thái',
  /** Bộ lọc: loại tổ chức. */
  FILTER_TYPE: 'Loại',
  /** Giá trị mặc định của bộ lọc trạng thái. */
  ALL_STATUSES: 'Tất cả trạng thái',
  /** Giá trị mặc định của bộ lọc loại. */
  ALL_TYPES: 'Tất cả loại',
} as const;

/** `MSG-ORG-07` — duyệt thành công. */
export function msgApproved(orgName: string): string {
  return `Đã duyệt tổ chức "${orgName}".`;
}

/** `MSG-ORG-08` — từ chối thành công. */
export function msgRejected(orgName: string): string {
  return `Đã từ chối tổ chức "${orgName}".`;
}

/** `MSG-MOD-*` — cấu hình module cho tổ chức. */
export const MSG_MOD = {
  /** `MSG-MOD-01` — tiêu đề khối module. */
  TITLE: 'Module đã đăng ký',
  /** `MSG-MOD-02` — phải chọn ít nhất 1 module. */
  REQUIRED: 'Phải chọn ít nhất 1 module',
  /** `MSG-MOD-03` — tooltip module lõi. */
  CORE_LOCKED: 'Module lõi, không thể bỏ',
  /** `MSG-MOD-04` — lưu thành công. */
  SAVED: 'Đã lưu cấu hình module.',
  /** `MSG-MOD-05` — lỗi/timeout khi lưu (NFR-REL-001). */
  SAVE_FAILED: 'Không lưu được cấu hình module, vui lòng thử lại.',
  /** `MSG-MOD-06` — module không hợp lệ (400 từ BE). */
  INVALID_MODULE: 'Module không hợp lệ hoặc chưa được kích hoạt.',
  /** `MSG-MOD-07` — không tải được danh mục module. */
  LOAD_FAILED: 'Không tải được danh sách module.',
  /** Nút lưu cấu hình module. */
  SAVE: 'Lưu cấu hình module',
  /** `MSG-MOD-08` — tiêu đề hộp thoại khi rời trang còn thay đổi chưa lưu. */
  UNSAVED_TITLE: 'Có thay đổi chưa lưu',
  /** `MSG-MOD-09` — nội dung cảnh báo rời trang (nháp vẫn được giữ). */
  UNSAVED_CONTENT:
    'Thay đổi cấu hình module chưa được lưu. Rời trang thì thay đổi mất, nhưng bản nháp vẫn được giữ để bạn quay lại làm tiếp.',
  /** `MSG-MOD-10` — nút xác nhận rời trang. */
  UNSAVED_LEAVE: 'Rời trang',
  /** `MSG-MOD-11` — nút ở lại tiếp tục chỉnh sửa. */
  UNSAVED_STAY: 'Ở lại',
  /** `MSG-MOD-12` — báo có bản nháp từ lần chỉnh sửa trước. */
  DRAFT_FOUND: 'Bạn có bản nháp cấu hình module chưa lưu.',
  /** `MSG-MOD-13` — nút áp dụng bản nháp. */
  DRAFT_APPLY: 'Áp dụng nháp',
  /** `MSG-MOD-14` — nút bỏ bản nháp. */
  DRAFT_DISCARD: 'Bỏ nháp',
  /** `MSG-MOD-15` — đã khôi phục nháp vào biểu mẫu. */
  DRAFT_APPLIED: 'Đã khôi phục bản nháp chưa lưu.',
} as const;

/** `MSG-MOD-03` có thêm tên module cụ thể. */
export function msgCoreLocked(moduleName: string): string {
  return `Module lõi, không thể bỏ: ${moduleName}`;
}

/* -------------------------------------------------------------------------- */
/*  Mở rộng console Super Admin (Đặc tả "Sprint 2 — Mở rộng console")          */
/* -------------------------------------------------------------------------- */

/** `MSG-OVW-*` — màn Tổng quan `/quan-tri`. */
export const MSG_OVW = {
  /** `MSG-OVW-01` — tiêu đề màn. */
  TITLE: 'Tổng quan',
  /** `MSG-OVW-02` — phụ đề màn. */
  SUBTITLE: 'Số liệu toàn hệ thống quản trị.',
  /** `MSG-OVW-03` — thẻ: số tổ chức chờ duyệt. */
  PENDING_CARD: 'Tổ chức chờ duyệt',
  /** `MSG-OVW-04` — thẻ: tổng số module trong danh mục. */
  MODULES_TOTAL: 'Module trong danh mục',
  /** `MSG-OVW-05` — thẻ: số module lõi (`BR-06`). */
  MODULES_CORE: 'Module lõi',
  /** `MSG-OVW-06` — thẻ: số module mở rộng. */
  MODULES_OPTIONAL: 'Module mở rộng',
  /** `MSG-OVW-07` — tiêu đề khối lối tắt. */
  QUICK_LINKS: 'Các mục quản trị',
  /** Không tải được số liệu. */
  LOAD_ERROR: 'Không tải được số liệu tổng quan.',
} as const;

/** `MSG-MDL-*` — màn Danh mục module `/quan-tri/module`. */
export const MSG_MDL = {
  /** `MSG-MDL-01` — tiêu đề màn. */
  TITLE: 'Danh mục module',
  /** `MSG-MDL-02` — phụ đề màn. */
  SUBTITLE: 'Các module hệ thống đang có trong danh mục.',
  /** `MSG-MDL-03` — tiêu đề bảng phân loại. */
  CATEGORY: 'Phân loại',
  /** `MSG-MDL-04` — nhãn module lõi. */
  CORE: 'Lõi',
  /** `MSG-MDL-05` — nhãn module mở rộng. */
  OPTIONAL: 'Mở rộng',
  /** Danh mục module rỗng. */
  EMPTY: 'Danh mục module đang trống.',
  /** Không tìm thấy module nào khớp bộ lọc/từ khoá. */
  NO_MATCH: 'Không tìm thấy module phù hợp.',
  /** Không tải được danh mục module. */
  LOAD_ERROR: 'Không tải được danh mục module.',
  /** Ghi chú: đang chờ BE thêm cột `is_core` (`D-15`). */
  IS_CORE_NOTICE:
    'Đang chờ backend bổ sung cột is_core (D-15) — hiện phân loại module lõi do frontend quy định.',
} as const;

/** `MSG-HIS-*` — màn Lịch sử duyệt tổ chức `/quan-tri/to-chuc/:id/lich-su`. */
export const MSG_HIS = {
  /** `MSG-HIS-01` — tiêu đề màn. */
  TITLE: 'Lịch sử duyệt tổ chức',
  /** `MSG-HIS-02` — chưa có sự kiện nào. */
  EMPTY: 'Chưa có sự kiện nào',
  /** `MSG-HIS-03` — không tải được lịch sử. */
  LOAD_ERROR: 'Không tải được lịch sử tổ chức.',
} as const;

/** `MSG-ACC-*` — màn Quản lý tài khoản (`UC-19`). */
export const MSG_ACC = {
  /** `MSG-ACC-01` — tiêu đề màn danh sách. */
  LIST_TITLE: 'Quản lý tài khoản',
  /** `MSG-ACC-02` — phụ đề màn danh sách. */
  LIST_SUBTITLE: 'Tài khoản trên toàn hệ thống.',
  /** `MSG-ACC-03` — tiêu đề khối thông tin chi tiết. */
  DETAIL_TITLE: 'Thông tin tài khoản',
  /** `MSG-ACC-04` — nhãn "Họ tên". */
  FULL_NAME: 'Họ tên',
  /** `MSG-ACC-05` — nhãn "Tổ chức". */
  ORGANIZATION: 'Tổ chức',
  /** `MSG-ACC-06` — nhãn "Vai trò". */
  ROLE: 'Vai trò',
  /** `MSG-ACC-07` — nhãn "Ngày tạo". */
  CREATED_AT: 'Ngày tạo',
  /** `MSG-ACC-08` — nhãn "Đăng nhập gần nhất". */
  LAST_LOGIN: 'Đăng nhập gần nhất',
  /** `MSG-ACC-09` — nút "Kích hoạt" (pending → active). */
  ACTIVATE: 'Kích hoạt',
  /** `MSG-ACC-10` — nút "Kích hoạt lại" (disabled → active). */
  REACTIVATE: 'Kích hoạt lại',
  /** `MSG-ACC-11` — nút "Khoá". */
  LOCK: 'Khoá',
  /** `MSG-ACC-12` — nút "Mở khoá". */
  UNLOCK: 'Mở khoá',
  /** `MSG-ACC-13` — nút "Vô hiệu hoá" (`BR-04`). */
  DISABLE: 'Vô hiệu hoá',
  /** Danh sách tài khoản rỗng. */
  EMPTY: 'Không có tài khoản nào',
  /** Không tải được danh sách tài khoản. */
  LOAD_ERROR: 'Không tải được danh sách tài khoản.',
  /** Không tải được chi tiết tài khoản. */
  DETAIL_ERROR: 'Không tải được thông tin tài khoản.',
  /** Không tìm thấy tài khoản (404 item). */
  NOT_FOUND: 'Không tìm thấy tài khoản.',
  /** Cập nhật trạng thái tài khoản thành công. */
  STATUS_UPDATED: 'Đã cập nhật trạng thái tài khoản.',
  /** Không cập nhật được trạng thái tài khoản. */
  STATUS_UPDATE_FAILED: 'Không cập nhật được trạng thái tài khoản, vui lòng thử lại.',
  /** Bộ lọc: tổ chức. */
  FILTER_ORG: 'Tổ chức',
  /** Bộ lọc: vai trò. */
  FILTER_ROLE: 'Vai trò',
  /** Bộ lọc: trạng thái. */
  FILTER_STATUS: 'Trạng thái',
  /** Ô tìm kiếm. */
  SEARCH: 'Tìm kiếm',
  /** Giá trị mặc định của bộ lọc tổ chức. */
  ALL_ORGS: 'Tất cả tổ chức',
  /** Giá trị mặc định của bộ lọc trạng thái. */
  ALL_STATUSES: 'Tất cả trạng thái',
  /** Giá trị mặc định của bộ lọc vai trò. */
  ALL_ROLES: 'Tất cả vai trò',
  /** Tiêu đề khối nhật ký của tài khoản. */
  AUDIT_TITLE: 'Nhật ký của tài khoản',
  /** Tiêu modal đổi trạng thái tài khoản. */
  CHANGE_STATUS: 'Đổi trạng thái tài khoản',
  /** Nhãn ô nhập lý do đổi trạng thái (TUỲ CHỌN). */
  STATUS_REASON_LABEL: 'Lý do (không bắt buộc)',
  /** Lý do đổi trạng thái quá dài. */
  STATUS_REASON_TOO_LONG: 'Lý do tối đa 500 ký tự',
  /** `MSG-ACC-14` — nút "Tạo tài khoản" (UC-19). */
  CREATE_TITLE: 'Tạo tài khoản',
  /** `MSG-ACC-15` — toast tạo tài khoản thành công. */
  CREATE_SUCCESS: 'Đã tạo tài khoản.',
  /** `MSG-ACC-16` — không tạo được (lỗi khác 409/400 validate). */
  CREATE_FAILED: 'Không tạo được tài khoản, vui lòng thử lại.',
  /** `MSG-ACC-17` — email/username đã tồn tại (409). */
  DUPLICATE: 'Email hoặc tên đăng nhập đã tồn tại.',
  /** `MSG-ACC-18` — nhãn ô "Email" trong form tạo tài khoản. */
  EMAIL_LABEL: 'Email',
  /** `MSG-ACC-19` — email bắt buộc. */
  EMAIL_REQUIRED: 'Vui lòng nhập email',
  /** `MSG-ACC-20` — email sai định dạng. */
  EMAIL_INVALID: 'Email không hợp lệ',
  /** `MSG-ACC-21` — họ tên bắt buộc. */
  FULL_NAME_REQUIRED: 'Vui lòng nhập họ tên',
  /** `MSG-ACC-22` — vai trò bắt buộc (form tạo + form đổi vai trò). */
  ROLE_REQUIRED: 'Vui lòng chọn vai trò',
  /** `MSG-ACC-23` — tổ chức bắt buộc (mọi role tạo mới đều gắn tổ chức). */
  ORG_REQUIRED: 'Vui lòng chọn tổ chức',
  /** `MSG-ACC-24` — nút "Đổi vai trò". */
  CHANGE_ROLE_TITLE: 'Đổi vai trò',
  /** `MSG-ACC-25` — toast đổi vai trò thành công. */
  ROLE_UPDATED: 'Đã đổi vai trò tài khoản.',
  /** `MSG-ACC-26` — không đổi được vai trò. */
  ROLE_UPDATE_FAILED: 'Không đổi được vai trò, vui lòng thử lại.',
  /** `MSG-ACC-27` — BE chặn tự đổi vai trò chính mình (409). */
  CANNOT_CHANGE_OWN_ROLE: 'Không thể đổi vai trò của chính mình.',
  /** `MSG-ACC-28` — vai trò mới phải khác vai trò hiện tại (validate FE). */
  ROLE_UNCHANGED: 'Vai trò mới phải khác vai trò hiện tại.',
  /** `MSG-ACC-29` — nút "Đặt lại mật khẩu". */
  RESET_TITLE: 'Đặt lại mật khẩu',
  /** `MSG-ACC-30` — chế độ mặc định: BE sinh mật khẩu tạm + gửi email. */
  RESET_SEND_EMAIL: 'Gửi mật khẩu tạm qua email',
  /** `MSG-ACC-31` — chế độ tuỳ chọn: admin tự đặt mật khẩu mới. */
  RESET_MANUAL: 'Đặt mật khẩu mới thủ công',
  /** `MSG-ACC-32` — nhãn ô mật khẩu mới (chế độ thủ công). */
  PASSWORD_LABEL: 'Mật khẩu mới',
  /** `MSG-ACC-33` — mật khẩu tối thiểu 8 ký tự (`D-31` validate cả FE và BE). */
  PASSWORD_TOO_SHORT: 'Mật khẩu tối thiểu 8 ký tự',
  /** `MSG-ACC-34` — toast đã gửi email mật khẩu tạm. */
  RESET_SENT: 'Đã gửi mật khẩu tạm tới email của tài khoản.',
  /** `MSG-ACC-35` — toast đã đặt mật khẩu mới (chế độ thủ công). */
  PASSWORD_UPDATED: 'Đã đặt lại mật khẩu tài khoản.',
  /** `MSG-ACC-36` — không đặt lại được mật khẩu. */
  RESET_FAILED: 'Không đặt lại được mật khẩu, vui lòng thử lại.',
  /** `MSG-ACC-37` — mô tả trong form tạo tài khoản. */
  CREATE_HINT: 'Tên đăng nhập và mật khẩu tạm sẽ do hệ thống sinh và gửi qua email.',
  /** `MSG-ACC-38` — mô tả 2 chế độ đặt lại mật khẩu. */
  RESET_HINT_EMAIL: 'Mật khẩu tạm sẽ được gửi tới email của tài khoản này.',
  /** `MSG-ACC-39` — bắt buộc nhập mật khẩu mới ở chế độ thủ công. */
  PASSWORD_REQUIRED: 'Vui lòng nhập mật khẩu mới',
} as const;

/** `MSG-AUD-*` — màn Nhật ký hệ thống `/quan-tri/nhat-ky`. */
export const MSG_AUD = {
  /** `MSG-AUD-01` — tiêu đề màn. */
  TITLE: 'Nhật ký hệ thống',
  /** `MSG-AUD-02` — phụ đề màn. */
  SUBTITLE: 'Các thao tác quản trị đã được ghi nhận.',
  /** `MSG-AUD-03` — tiêu đề cột "Thời điểm". */
  TIME: 'Thời điểm',
  /** `MSG-AUD-04` — tiêu đề cột "Hành động". */
  ACTION: 'Hành động',
  /** `MSG-AUD-05` — tiêu đề cột "Đối tượng". */
  TARGET: 'Đối tượng',
  /** `MSG-AUD-06` — tiêu đề cột "Người thực hiện". */
  ACTOR: 'Người thực hiện',
  /** `MSG-AUD-07` — tiêu đề cột "Ghi chú". */
  DESCRIPTION: 'Ghi chú',
  /** Chưa có sự kiện nào. */
  EMPTY: 'Chưa có sự kiện nào',
  /** Không tải được nhật ký hệ thống. */
  LOAD_ERROR: 'Không tải được nhật ký hệ thống.',
  /** Bộ lọc: hành động. */
  FILTER_ACTION: 'Hành động',
  /** Bộ lọc: khoảng thời gian. */
  FILTER_RANGE: 'Khoảng thời gian',
  /** Giá trị mặc định của bộ lọc hành động. */
  ALL_ACTIONS: 'Tất cả hành động',
} as const;

/** `MSG-ORG-20` — vô hiệu hoá thành công (có tên tổ chức). */
export function msgSuspended(orgName: string): string {
  return `Đã vô hiệu hoá tổ chức "${orgName}".`;
}

/** `MSG-ORG-21` — kích hoạt lại thành công (có tên tổ chức). */
export function msgReactivated(orgName: string): string {
  return `Đã kích hoạt lại tổ chức "${orgName}".`;
}

/**
 * Thông báo "tính năng đang chờ backend" — kèm mã `D-nn` để Vy đối chiếu
 * với danh sách endpoint trong đặc tả.
 *
 * Dùng khi endpoint dạng **collection** trả 404 (BE chưa làm endpoint).
 */
export function msgBackendPending(code: string): string {
  return `Tính năng đang chờ backend (${code}).`;
}

/** `MSG-ACC-09` — cập nhật trạng thái tài khoản thành công (có tên đăng nhập). */
export function msgAccountStatusUpdated(username: string): string {
  return `Đã cập nhật trạng thái tài khoản "${username}".`;
}
