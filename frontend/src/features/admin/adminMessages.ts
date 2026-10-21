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
} as const;

/** `MSG-MOD-03` có thêm tên module cụ thể. */
export function msgCoreLocked(moduleName: string): string {
  return `Module lõi, không thể bỏ: ${moduleName}`;
}
