/**
 * Nhãn hiển thị + định dạng ngày cho Sprint 4.
 *
 * Một nguồn duy nhất cho §7 (nhãn trạng thái) để 4 màn hình không lệch nhau.
 * Không hardcode màu hex — dùng bảng màu preset của antd `Tag`.
 */
import dayjs from 'dayjs';

export const CLASS_STATUS_LABEL: Record<string, string> = {
  CHUA_BAT_DAU: 'Chưa bắt đầu',
  DANG_DIEN_RA: 'Đang diễn ra',
  DA_KET_THUC: 'Đã kết thúc',
  DA_HUY: 'Đã hủy',
};

/** Màu gợi ý §7: xám / xanh dương / xanh lá / đỏ. `undefined` = Tag mặc định. */
export const CLASS_STATUS_TAG: Record<string, string | undefined> = {
  CHUA_BAT_DAU: undefined,
  DANG_DIEN_RA: 'blue',
  DA_KET_THUC: 'green',
  DA_HUY: 'red',
};

export const CLOSE_STATE_LABEL: Record<string, string> = {
  NONE: '',
  PENDING: 'Chờ duyệt đóng',
  CLOSED: 'Đã đóng',
};

/** Vàng cho "chờ duyệt", xám đậm (Tag mặc định) cho "đã đóng". */
export const CLOSE_STATE_TAG: Record<string, string | undefined> = {
  NONE: undefined,
  PENDING: 'gold',
  CLOSED: undefined,
};

export const TEACHING_STATUS_LABEL: Record<string, string> = {
  DANG_DAY: 'Đang dạy',
  TAM_NGHI: 'Tạm nghỉ',
  NGHI_VIEC: 'Nghỉ việc',
};

export const TEACHING_STATUS_TAG: Record<string, string | undefined> = {
  DANG_DAY: 'green',
  TAM_NGHI: 'gold',
  NGHI_VIEC: undefined,
};

export const CONTRACT_TYPE_LABEL: Record<string, string> = {
  CO_HUU: 'Cơ hữu',
  THINH_GIANG: 'Thỉnh giảng',
};

/** Hành động trong tab "Sự kiện đóng" (§6.5). */
export const CLOSE_ACTION_LABEL: Record<string, string> = {
  REQUESTED: 'Gửi yêu cầu đóng',
  APPROVED: 'Duyệt đóng',
  REJECTED: 'Từ chối đóng',
  REOPENED: 'Mở lại lớp',
};

/** Hành động trong tab "Lịch sử thay đổi" của giáo viên (§5.2). */
export const TEACHER_HISTORY_ACTION_LABEL: Record<string, string> = {
  CREATE: 'Tạo hồ sơ',
  CREATED: 'Tạo hồ sơ',
  UPDATE: 'Cập nhật hồ sơ',
  UPDATED: 'Cập nhật hồ sơ',
  CHANGE_SPECIALTY: 'Đổi chuyên môn',
  CHANGE_STATUS: 'Đổi trạng thái dạy',
};

/** Nhãn field trong `history.details` (§5.2). */
export const FIELD_LABEL: Record<string, string> = {
  fullName: 'Họ tên',
  email: 'Email',
  phone: 'Số điện thoại',
  specialtyIds: 'Chuyên môn',
  contractType: 'Loại hợp đồng',
  teachingStatus: 'Trạng thái dạy',
  departmentId: 'Bộ phận',
  staffCode: 'Mã nhân sự',
};

/** Tra nhãn, trả lại giá trị gốc nếu chưa có trong bảng (BE thêm enum mới). */
export function labelOf(map: Record<string, string>, value?: string | null): string {
  if (!value) return '—';
  return map[value] ?? value;
}

/** Ngày `DD/MM/YYYY`; giá trị không parse được thì giữ nguyên để không mất dữ liệu. */
export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : value;
}

/** `HH:mm DD/MM/YYYY` cho log/sự kiện. */
export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('HH:mm DD/MM/YYYY') : value;
}

/** `startDate → endDate`; thiếu một đầu thì hiện đầu còn lại. */
export function formatPeriod(start?: string | null, end?: string | null): string {
  if (start && end) return `${formatDate(start)} → ${formatDate(end)}`;
  return formatDate(start ?? end);
}

/** Hiển thị giá trị trong `history.details` (mảng id chuyên môn → tên). */
export function formatChangeValue(value: unknown, specialtyName?: (id: string) => string): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value.map((item) => (specialtyName ? specialtyName(String(item)) : String(item))).join(', ');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
