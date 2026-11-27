/** Câu chữ tiếng Việt + mã lỗi của khu vực lịch (Task 4). */

export const MSG_SCHEDULE = {
  TITLE: 'Lịch đào tạo',
  MENU_SCHEDULE: 'Lịch',
  MENU_MY_SCHEDULE: 'Lịch cá nhân',
  IMPACTS_TITLE: 'Buổi bị ảnh hưởng',

  DEPARTMENT: 'Phòng ban (mã)',
  DEPARTMENT_HINT: 'Nhập mã phòng ban để xem lịch.',
  FROM: 'Từ ngày',
  TO: 'Đến ngày',
  CLASS_ID: 'Mã lớp',
  STATUS: 'Trạng thái',
  SEARCH: 'Tìm',

  CREATE: 'Thêm buổi học',
  EDIT: 'Sửa buổi học',
  CANCEL_SESSION: 'Huỳ buổi',
  DELETE_SESSION: 'Xoá buổi',
  SAVE: 'Lưu',
  SAVE_NEW: 'Tạo buổi học',
  CREATED: 'Đã tạo buổi học.',
  UPDATED: 'Đã cập nhật buổi học.',
  CANCELLED: 'Đã huỳ buổi học.',
  DELETED: 'Đã xoá buổi học.',

  START_TIME: 'Bắt đầu (ISO)',
  END_TIME: 'Kết thúc (ISO)',
  TEACHER_ID: 'Mã giáo viên',
  SUBJECT: 'Môn học',
  ROOM_ID: 'Phòng học (mã)',
  ROOM_SUGGESTIONS: 'Phòng gợi ý',
  ROOM_SUGGESTIONS_HINT: 'Chọn phòng trống trong khung giờ đã nhập.',
  ROOM_SUGGESTIONS_EMPTY: 'Không có phòng trống trong khung giờ này.',
  ROOM_SUGGESTIONS_ERROR: 'Không tải được danh sách phòng.',
  REQUIRED_CLASS: 'Vui lòng nhập mã lớp',
  REQUIRED_START: 'Vui lòng nhập thời gian bắt đầu',
  REQUIRED_END: 'Vui lòng nhập thời gian kết thúc',
  INVALID_RANGE: 'Thời gian kết thúc phải sau thời gian bắt đầu',

  EMPTY: 'Chưa có buổi học nào.',
  MY_EMPTY: 'Chưa có buổi học nào trong khoảng này.',
  IMPACTS_EMPTY: 'Chưa có buổi học nào bị ảnh hưởng.',
  LOAD_ERROR: 'Không tải được lịch đào tạo.',
  MY_LOAD_ERROR: 'Không tải được lịch cá nhân.',
  IMPACTS_LOAD_ERROR: 'Không tải được danh sách buổi bị ảnh hưởng.',
  RETRY: 'Thử lại',

  NETWORK_ERROR: 'Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.',
  SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  SAVE_FAILED: 'Không lưu được lịch, vui lòng thử lại.',

  IMPACTS_LINK: 'Buổi bị ảnh hưởng',
  BACK_TO_SCHEDULE: 'Về lịch đào tạo',

  VIEW_HOURLY: 'Theo giờ',
  VIEW_COMPACT: '3 buổi',
  VIEW_MODE_GROUP: 'Chế độ xem lịch',
  CANCELLED_RIBBON: 'Đã hủy',
} as const;

/**
 * Mã lỗi là CHUỖI — BE trả `code: "ROOM_SCHEDULE_CONFLICT"` v.v.
 * `getApiCode()` của Task 1 bỏ qua mã số, nên bảng này không bao giờ so số.
 */
export const SCHEDULE_ERROR_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  ROOM_SCHEDULE_CONFLICT: 'Phòng học đã được đặt trong khung giờ này.',
  TEACHER_SCHEDULE_CONFLICT: 'Giáo viên đã có buổi học trong khung giờ này.',
  CLASS_SCHEDULE_CONFLICT: 'Lớp học đã có buổi học trong khung giờ này.',
  VALIDATION_ERROR: 'Thông tin xếp lịch chưa hợp lệ. Vui lòng kiểm tra lại.',
  MODULE_NOT_ENABLED: 'Tổ chức chưa bật module Quản lý lịch.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  ROOM_NOT_AVAILABLE: 'Không có phòng phù hợp hoặc phòng đã được sử dụng.',
  ROOM_TYPE_MISMATCH: 'Loại phòng không phù hợp với yêu cầu của môn học.',
  CONFLICT: 'Lịch bị xung đột, vui lòng thử lại.',
});
