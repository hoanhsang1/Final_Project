/**
 * Nhãn trạng thái hiển thị trên UI — `BR-08`: trạng thái LUÔN kèm CHỮ, không chỉ màu.
 *
 * Bảng nhãn lấy đúng từ Đặc tả Sprint 2 §3.0, không tự chế.
 *
 * Lưu ý: cùng một giá trị thô có nghĩa khác nhau theo ngữ cảnh — tổ chức `active`
 * là "Đã duyệt" còn module `active` là "Đang dùng" — nên tách riêng từng hàm.
 */

/** Nhãn + màu Tag của một trạng thái. */
export interface StatusLabel {
  label: string;
  /** Màu Tag antd — luôn đi kèm `label` để không dùng màu làm tín hiệu duy nhất. */
  color: string;
}

/**
 * Chuẩn hoá trạng thái trước khi so sánh.
 *
 * BE trả chữ thường (`pending`, `active`…) nhưng không phải chỗ nào cũng chắc
 * (`docs/api.md` ghi sai `"SCHOOL"` — `D-08`). So sánh không phân biệt hoa/thường
 * để UI không rơi vào nhánh `default` chỉ vì lỗi chính tả của BE.
 */
function normalizeStatus(status: string): string {
  return status?.trim().toLowerCase() ?? '';
}

/** Tổ chức còn ở trạng thái "chờ duyệt" không? (dùng để bật/tắt nút Duyệt · Từ chối) */
export function isPendingStatus(status: string | null | undefined): boolean {
  return normalizeStatus(status ?? '') === 'pending';
}

/** Trạng thái tổ chức — ENUM `organization.status`. */
export function organizationStatusLabel(status: string): StatusLabel {
  switch (normalizeStatus(status)) {
    case 'pending':
      return { label: 'Chờ duyệt', color: 'processing' };
    case 'active':
      return { label: 'Đã duyệt', color: 'success' };
    case 'rejected':
      return { label: 'Đã từ chối', color: 'error' };
    // BR-04: chữ là "Vô hiệu hoá", KHÔNG phải "Xoá".
    case 'suspended':
      return { label: 'Vô hiệu hoá', color: 'default' };
    default:
      return { label: status, color: 'default' };
  }
}

/** Trạng thái module của tổ chức — ENUM `organization_module.status`. */
export function moduleStatusLabel(status: string): StatusLabel {
  switch (normalizeStatus(status)) {
    case 'requested':
      return { label: 'Chờ duyệt', color: 'processing' };
    case 'active':
      return { label: 'Đang dùng', color: 'success' };
    case 'rejected':
      return { label: 'Đã từ chối', color: 'error' };
    default:
      return { label: status, color: 'default' };
  }
}

/** Trạng thái tài khoản — ENUM `account.status`. */
export function accountStatusLabel(status: string): StatusLabel {
  switch (normalizeStatus(status)) {
    case 'pending':
      return { label: 'Chờ duyệt', color: 'processing' };
    case 'active':
      return { label: 'Đang hoạt động', color: 'success' };
    case 'locked':
      return { label: 'Đang khoá', color: 'warning' };
    // BR-04: chữ là "Vô hiệu hoá", KHÔNG phải "Xoá".
    case 'disabled':
      return { label: 'Vô hiệu hoá', color: 'default' };
    default:
      return { label: status, color: 'default' };
  }
}

/** Loại tổ chức → nhãn tiếng Việt. BE trả CHỮ THƯỜNG (`school` / `center`). */
export function orgTypeLabel(orgType: string): string {
  switch (normalizeStatus(orgType)) {
    case 'school':
      return 'Trường học';
    case 'center':
      return 'Trung tâm';
    default:
      return orgType;
  }
}
