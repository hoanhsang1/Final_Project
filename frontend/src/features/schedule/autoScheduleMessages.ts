/**
 * Câu chữ tiếng Việt — màn Tự động xếp lịch (`/dao-tao/tu-dong-xep-lich`).
 *
 * Các quyết nghiệp vụ đã chốt 27/11 (D10/D11/S1/S5/S7) được thể hiện trực tiếp
 * ở đây: tiết 45 phút, 2 nguồn dữ liệu, nháp → xem trước → xác nhận, phòng cấp
 * tổ chức. Không dùng cụm "Cần xác nhận" nữa.
 */

export const MSG_AUTO = {
  TITLE: 'Tự động xếp lịch',
  MENU_AUTO_SCHEDULE: 'Tự động xếp lịch',
  AUTO_SCHEDULE_LINK: 'Tự động xếp lịch',

  CLASS_LABEL: 'Chọn lớp',
  SOURCE_LABEL: 'Nguồn đầu vào',
  SOURCE_CURRICULUM: 'Chương trình có sẵn',
  SOURCE_MANUAL: 'Nhập tay',
  DATE_LABEL: 'Từ ngày — Đến ngày',
  DAYS_LABEL: 'Ngày học',
  SESSIONS_LABEL: 'Số buổi/tuần',
  MINUTES_LABEL: 'Số phút/buổi',

  ROOM_INFO: 'Phòng dùng chung cấp tổ chức; ưu tiên phòng thường, kiểm tra sức chứa và trùng lịch.',
  BANNER_TITLE: 'Bảng tiết 45 phút',
  BANNER_DESCRIPTION:
    'Mỗi tiết dài 45 phút; một buổi là chuỗi tiết liền nhau, không ghép qua giờ nghỉ.',

  SLOT_TITLE: 'Khung giờ',
  SLOT_DESCRIPTION: 'Chỉnh giờ bắt đầu/kết thúc cho từng tiết 45 phút.',
  SLOT_START_LABEL: 'Bắt đầu tiết',
  SLOT_END_LABEL: 'Kết thúc tiết',
  SLOT_ADD: 'Thêm tiết',
  SLOT_REMOVE: 'Bỏ tiết',

  AUTO_TOGGLE_LABEL: 'Tự động xếp',
  AUTO_TOGGLE_HELP: 'Mặc định bật; chạy khi đã có lớp, môn, giáo viên, phòng và khung giờ hợp lệ.',

  SUBMIT_DRAFT: 'Tạo nháp lịch',
  SUBMIT_CONFIRM: 'Xác nhận xếp lịch',
  DRAFT_INFO: 'Đã tạo bản nháp để xem trước. Bản nháp chưa được ghi vào cơ sở dữ liệu.',
  CONFIRM_SUCCESS: 'Đã xếp xong',

  PREVIEW_TITLE: 'Xem trước lịch nháp',
  PREVIEW_DESCRIPTION: 'Các buổi bên dưới chỉ là kết quả tính toán, chưa lưu vào lịch đào tạo.',
  PREVIEW_TIME: 'Bắt đầu — Kết thúc',
  PREVIEW_CLASS: 'Lớp',
  PREVIEW_SUBJECT: 'Môn học',
  PREVIEW_TEACHER: 'Giáo viên',
  PREVIEW_ROOM: 'Phòng',
  PREVIEW_EMPTY: 'Không có buổi học nào trong bản nháp.',

  UNSCHEDULED_TITLE: 'Lớp chưa xếp được',
  UNSCHEDULED_CLASS: 'Lớp',
  UNSCHEDULED_SUBJECT: 'Môn học',
  UNSCHEDULED_REASON: 'Lý do',
  UNSCHEDULED_EMPTY: 'Không có lớp nào bị bỏ sót.',

  LOADING_LABEL: 'Đang tải…',
  EMPTY_TITLE: 'Chưa có lớp để xếp lịch',
  ERROR_TITLE: 'Không tải được danh sách lớp.',
  ERROR_DESCRIPTION: 'Vui lòng kiểm tra kết nối và thử lại.',
  GENERATE_ERROR_TITLE: 'Không tạo được lịch tự động.',
  RETRY_LABEL: 'Thử lại',
  NO_PERMISSION_MESSAGE: 'Bạn không có quyền tự động xếp lịch.',

  REQUIRED_DEPARTMENT: 'Vui lòng nhập mã phòng ban trong địa chỉ trang.',
  REQUIRED_CLASS: 'Vui lòng chọn lớp.',
  REQUIRED_DATE: 'Vui lòng chọn khoảng ngày học.',
  REQUIRED_DAYS: 'Vui lòng chọn ít nhất một ngày học.',
  REQUIRED_SLOTS: 'Vui lòng giữ ít nhất một tiết hợp lệ.',
  INVALID_SLOTS: 'Mỗi tiết phải dài đúng bội của 45 phút và liền nhau.',
  INVALID_MINUTES: 'Số phút/buổi phải lớn hơn 0.',
  AUTO_REQUIRED: 'Chỉ xếp lịch khi bật chế độ tự động.',
  NEED_DRAFT: 'Vui lòng tạo nháp lịch trước khi xác nhận.',
} as const;

/** `mon`…`sun` — dùng cho `CheckboxList` ngày học; map sang 1..7 khi gửi BE. */
export const DAYS_OPTIONS: { value: string; label: string }[] = [
  { value: 'mon', label: 'Thứ Hai' },
  { value: 'tue', label: 'Thứ Ba' },
  { value: 'wed', label: 'Thứ Tư' },
  { value: 'thu', label: 'Thứ Năm' },
  { value: 'fri', label: 'Thứ Sáu' },
  { value: 'sat', label: 'Thứ Bảy' },
  { value: 'sun', label: 'Chủ Nhật' },
];

/**
 * Nhãn một lớp trong `Selector`: ưu tiên mã lớp, rồi mới tới `id`; tên thiếu
 * thì ghi rõ "Chưa có tên" thay vì để trống.
 */
export function classOptionLabel(c: {
  classCode?: string | null;
  name?: string | null;
  id: string;
}): string {
  return `${c.classCode || c.id} — ${c.name || 'Chưa có tên'}`;
}
