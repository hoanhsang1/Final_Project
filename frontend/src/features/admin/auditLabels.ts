import type { BadgeVariant } from '@astryxdesign/core';
import type { AuditAction, AuditLogItem, AuditTargetType } from './types';

/**
 * Nhãn hành động nhật ký hệ thống — `BR-08`: Tag luôn kèm CHỮ, không chỉ màu.
 *
 * Giá trị thô (`action`) do BE quy định ở Đặc tả "Sprint 2 — Mở rộng console" §4.3.
 * ⚠️ Hợp đồng này CHƯA có ở BE (`D-22`) — khi Sang đổi tên hằng, chỉ cần sửa file này.
 */

/** Nhãn + màu của một hành động. */
export interface AuditActionLabel {
  label: string;
  /**
   * Màu `Tag` antd — còn dùng ở màn CHƯA port; sẽ bỏ khi gỡ antd (P5-D).
   * Luôn đi kèm `label` để không dùng màu làm tín hiệu duy nhất (BR-08).
   */
  color: string;
  /**
   * Biến thể `Badge` của Astryx — bản thay `color` cho các màn đã port. Luôn đi
   * kèm `label`; màu chỉ là tín hiệu phụ (BR-08).
   */
  badge: BadgeVariant;
}

const ACTION_LABELS: Record<AuditAction, AuditActionLabel> = {
  ORG_APPROVED: { label: 'Duyệt tổ chức', color: 'success', badge: 'success' },
  ORG_REJECTED: { label: 'Từ chối tổ chức', color: 'error', badge: 'error' },
  ORG_SUSPENDED: { label: 'Vô hiệu hoá tổ chức', color: 'default', badge: 'neutral' },
  ORG_REACTIVATED: { label: 'Kích hoạt lại tổ chức', color: 'processing', badge: 'info' },
  ORG_MODULES_UPDATED: { label: 'Đổi cấu hình module', color: 'warning', badge: 'warning' },
  ACCOUNT_STATUS_CHANGED: { label: 'Đổi trạng thái tài khoản', color: 'warning', badge: 'warning' },
  ACCOUNT_CREATED: { label: 'Tạo tài khoản', color: 'success', badge: 'success' },
  ACCOUNT_ROLE_CHANGED: { label: 'Đổi vai trò tài khoản', color: 'warning', badge: 'warning' },
  ACCOUNT_PASSWORD_RESET: { label: 'Đặt lại mật khẩu', color: 'processing', badge: 'info' },
};

/**
 * Nhãn hành động → tiếng Việt.
 *
 * Không đoán: hành động lạ → hiện nguyên mã gốc để Admin thấy được sự lệch.
 */
export function auditActionLabel(action: string): AuditActionLabel {
  return (
    ACTION_LABELS[action as AuditAction] ?? { label: action, color: 'default', badge: 'neutral' }
  );
}

/** Loại đối tượng → nhãn tiếng Việt. */
export function auditTargetTypeLabel(targetType: AuditTargetType | string): string {
  switch (targetType) {
    case 'ORGANIZATION':
      return 'Tổ chức';
    case 'ACCOUNT':
      return 'Tài khoản';
    default:
      return targetType;
  }
}

/**
 * Đường dẫn màn chi tiết tương ứng với đối tượng bị tác động.
 *
 * Trả `null` khi `target_type` lạ → UI hiện tên thuần, không tạo link hỏng.
 */
export function auditTargetPath(item: Pick<AuditLogItem, 'target_type' | 'target_id'>): string | null {
  switch (item.target_type) {
    case 'ORGANIZATION':
      return `/quan-tri/to-chuc/${item.target_id}`;
    case 'ACCOUNT':
      return `/quan-tri/tai-khoan/${item.target_id}`;
    default:
      return null;
  }
}

/** Giá trị + nhãn cho bộ lọc "Hành động" — gửi query param `action` là **giá trị thô**. */
export const AUDIT_ACTION_OPTIONS: ReadonlyArray<{ value: AuditAction; label: string }> =
  Object.entries(ACTION_LABELS).map(([value, { label }]) => ({
    value: value as AuditAction,
    label,
  }));
