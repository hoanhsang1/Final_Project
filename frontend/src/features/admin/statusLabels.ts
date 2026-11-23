/**
 * Nhãn trạng thái hiển thị trên UI — `BR-08`: trạng thái LUÔN kèm CHỮ, không chỉ màu.
 *
 * Bảng nhãn lấy đúng từ Đặc tả Sprint 2 §3.0, không tự chế.
 *
 * Lưu ý: cùng một giá trị thô có nghĩa khác nhau theo ngữ cảnh — tổ chức `active`
 * là "Đã duyệt" còn module `active` là "Đang dùng" — nên tách riêng từng hàm.
 */
import type { BadgeVariant } from '@astryxdesign/core';

/** Nhãn hiển thị của một trạng thái. */
export interface StatusLabel {
  label: string;
  /**
   * Biến thể `Badge` của Astryx. Luôn đi kèm `label`; màu chỉ là tín hiệu phụ (BR-08).
   */
  badge: BadgeVariant;
}

/**
 * Chuẩn hoá trạng thái trước khi so sánh.
 *
 * BE trả chữ thường (`pending`, `active`…) nhưng không phải chỗ nào cũng chắc
 * (`docs/api.md` ghi sai `"SCHOOL"` — `D-08`). So sánh không phân biệt hoa/thường
 * để UI không rơi vào nhánh `default` chỉ vì khác viết hoa.
 */
function norm(status: string): string {
  return status.toLowerCase();
}

/** Tổ chức còn ở trạng thái "chờ duyệt" không? (dùng để bật/tắt nút Duyệt · Từ chối) */
export function isPendingStatus(status: string | null | undefined): boolean {
  return norm(status ?? '') === 'pending';
}

/** Trạng thái TỔ CHỨC — bảng §3.0. */
export function organizationStatusLabel(status: string): StatusLabel {
  switch (norm(status)) {
    case 'pending':
      return { label: 'Chờ duyệt', badge: 'info' };
    case 'active':
      return { label: 'Đã duyệt', badge: 'success' };
    case 'rejected':
      return { label: 'Đã từ chối', badge: 'error' };
    case 'suspended':
      // BR-04: dùng "Vô hiệu hoá", KHÔNG dùng "Xoá"
      return { label: 'Vô hiệu hoá', badge: 'neutral' };
    default:
      return { label: status, badge: 'neutral' };
  }
}

/** Trạng thái MODULE CỦA TỔ CHỨC — bảng §3.0. */
export function moduleStatusLabel(status: string): StatusLabel {
  switch (norm(status)) {
    case 'requested':
      return { label: 'Chờ duyệt', badge: 'info' };
    case 'active':
      return { label: 'Đang dùng', badge: 'success' };
    case 'rejected':
      return { label: 'Đã từ chối', badge: 'error' };
    default:
      return { label: status, badge: 'neutral' };
  }
}

/** Trạng thái TÀI KHOẢN — bảng §3.0 (mở rộng console). */
export function accountStatusLabel(status: string): StatusLabel {
  switch (norm(status)) {
    case 'pending':
      return { label: 'Chờ duyệt', badge: 'info' };
    case 'active':
      return { label: 'Đang hoạt động', badge: 'success' };
    case 'locked':
      return { label: 'Đang khoá', badge: 'warning' };
    case 'disabled':
      // BR-04: dùng "Vô hiệu hoá", KHÔNG dùng "Xoá"
      return { label: 'Vô hiệu hoá', badge: 'neutral' };
    default:
      return { label: status, badge: 'neutral' };
  }
}

/** Nhãn loại tổ chức — hiển thị tiếng Việt, không hiện mã thô. */
export function orgTypeLabel(orgType: string): string {
  switch (norm(orgType)) {
    case 'school':
      return 'Trường học';
    case 'center':
      return 'Trung tâm';
    default:
      return orgType;
  }
}
