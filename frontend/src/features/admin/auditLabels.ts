import type { BadgeVariant } from '@astryxdesign/core';
import type { AuditAction, AuditLogItem, AuditTargetType } from './types';

/**
 * Nhãn hành động nhật ký hệ thống — `BR-08`: luôn kèm CHỮ, không chỉ màu.
 *
 * Giá trị thô (`action`) do BE quy định ở Đặc tả "Sprint 2 — Mở rộng console" §4.3.
 * ⚠️ Hợp đồng này CHƯA có ở BE (`D-22`) — khi Sang đổi tên hằng, chỉ cần sửa file này.
 */

/** Nhãn hiển thị của một hành động. */
export interface AuditActionLabel {
  label: string;
  /**
   * Biến thể `Badge` của Astryx. Luôn đi kèm `label`; màu chỉ là tín hiệu phụ (BR-08).
   */
  badge: BadgeVariant;
}

const ACTION_LABELS: Record<AuditAction, AuditActionLabel> = {
  ORG_APPROVED: { label: 'Duyệt tổ chức', badge: 'success' },
  ORG_REJECTED: { label: 'Từ chối tổ chức', badge: 'error' },
  ORG_SUSPENDED: { label: 'Vô hiệu hoá tổ chức', badge: 'neutral' },
  ORG_REACTIVATED: { label: 'Kích hoạt lại tổ chức', badge: 'info' },
  ORG_MODULES_UPDATED: { label: 'Đổi cấu hình module', badge: 'warning' },
  ACCOUNT_STATUS_CHANGED: { label: 'Đổi trạng thái tài khoản', badge: 'warning' },
  ACCOUNT_CREATED: { label: 'Tạo tài khoản', badge: 'success' },
  ACCOUNT_ROLE_CHANGED: { label: 'Đổi vai trò tài khoản', badge: 'warning' },
  ACCOUNT_PASSWORD_RESET: { label: 'Đặt lại mật khẩu', badge: 'info' },
};

/**
 * Lấy nhãn hiển thị của hành động. Giá trị lạ (BE thêm mới mà FE chưa biết)
 * → hiện mã gốc + biến thể trung tính, KHÔNG crash.
 */
export function auditActionLabel(action: string): AuditActionLabel {
  return ACTION_LABELS[action as AuditAction] ?? { label: action, badge: 'neutral' };
}

/** Nhãn loại đối tượng — dùng ở cột "Đối tượng" (tên + loại). */
export const TARGET_TYPE_LABEL: Record<AuditTargetType, string> = {
  ORGANIZATION: 'Tổ chức',
  ACCOUNT: 'Tài khoản',
};

export function auditTargetTypeLabel(type: AuditTargetType): string {
  return TARGET_TYPE_LABEL[type] ?? type;
}

/**
 * Đường dẫn sang trang chi tiết của đối tượng bị tác động (Q-28):
 * - `ORGANIZATION` → `/quan-tri/to-chuc/:id`
 * - `ACCOUNT` → `/quan-tri/tai-khoan/:id`
 */
export function auditTargetPath(item: Pick<AuditLogItem, 'target_type' | 'target_id'>): string {
  if (item.target_type === 'ORGANIZATION') {
    return `/quan-tri/to-chuc/${item.target_id}`;
  }
  return `/quan-tri/tai-khoan/${item.target_id}`;
}

/**
 * Danh sách lựa chọn cho bộ lọc hành động — value là mã thô, label là tiếng Việt.
 * Bám đúng danh sách Đặc tả §4.3 (Q-29: dùng chuỗi này, không dùng mã nhóm).
 */
export const AUDIT_ACTION_OPTIONS: ReadonlyArray<{ value: AuditAction; label: string }> =
  (Object.entries(ACTION_LABELS) as Array<[AuditAction, AuditActionLabel]>).map(
    ([value, { label }]) => ({ value, label }),
  );
