import { Alert, Form, Input, Modal, Typography, theme } from 'antd';
import { useEffect } from 'react';
import { MSG_ACC, MSG_ORG } from '../../features/admin/adminMessages';
import { accountStatusLabel } from '../../features/admin/statusLabels';
import type { AccountStatus } from '../../features/admin/types';

const { Text } = Typography;

/** Lý do tối đa — khớp `rejection_reason VARCHAR(500)` trong DB. */
const MAX_REASON_LENGTH = 500;

/** Trạng thái CHUYỂN TỚI — không có `pending` (không thể tự đưa tài khoản về chờ duyệt). */
export type TargetAccountStatus = Exclude<AccountStatus, 'pending'>;

interface AccountStatusModalProps {
  open: boolean;
  /** Tên đăng nhập — hiện trong nội dung modal. */
  username: string;
  /** Trạng thái HIỆN TẠI của tài khoản. */
  currentStatus: AccountStatus;
  /** Trạng thái CHUYỂN TỚI. */
  targetStatus: TargetAccountStatus;
  /** Đang gửi yêu cầu → nút xác nhận khoá + loading. */
  loading: boolean;
  /**
   * Lỗi từ BE — hiển thị bằng `Alert` trong modal.
   *
   * Toast `message.error` tự biến mất và bị modal che → chuyển vào đây để
   * người dùng đọc được lý do thất bại và thử lại (NFR-REL-001).
   */
  error?: string | null;
  onCancel: () => void;
  /** Nhận lý do đã TRIM (hoặc `undefined` nếu để trống — lý do TUỲ CHỌN). */
  onConfirm: (reason: string | undefined) => void;
}

/**
 * Modal xác nhận **đổi trạng thái tài khoản** — `PATCH /accounts/{id}/status` (`D-24c`).
 *
 * `BR-04`: chữ trên UI là "Vô hiệu hoá", **không** phải "Xoá".
 * Lý do là dữ liệu người dùng nhập → hiển thị lại phải render TEXT THUẦN,
 * không `dangerouslySetInnerHTML` (ADR-FE-003 §9).
 *
 * Lý do **TUỲ CHỌN** (đặc tả §4.4): nếu có thì ≤ 500 ký tự.
 */
export default function AccountStatusModal({
  open,
  username,
  currentStatus,
  targetStatus,
  loading,
  error,
  onCancel,
  onConfirm,
}: AccountStatusModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<{ statusReason?: string }>();

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const currentLabel = accountStatusLabel(currentStatus);
  const targetLabel = accountStatusLabel(targetStatus);
  const isDangerous = targetStatus === 'disabled' || targetStatus === 'locked';

  return (
    <Modal
      open={open}
      title={`${MSG_ACC.CHANGE_STATUS}: ${username}`}
      okText={targetLabel.label}
      cancelText={MSG_ORG.CANCEL}
      confirmLoading={loading}
      okButtonProps={{ danger: isDangerous, disabled: loading }}
      onOk={() => form.submit()}
      onCancel={onCancel}
      // `forceRender` giữ Form luôn gắn với antd Form instance (tránh cảnh báo).
      forceRender
    >
      {/* Lỗi xếp trên thông tin hành động — `open` phải đúng vì modal mount sẵn
          cả khi đóng. */}
      {open && error && (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={error}
          style={{ marginBottom: token.margin }}
        />
      )}

      <Alert
        type={isDangerous ? 'warning' : 'info'}
        showIcon
        message={
          <>
            Chuyển tài khoản <Text strong>{username}</Text> từ{' '}
            <Text strong>{currentLabel.label}</Text> sang{' '}
            <Text strong>{targetLabel.label}</Text>.
          </>
        }
      />

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        style={{ marginTop: token.margin }}
        onFinish={(values) => {
          const reason = values.statusReason?.trim();
          onConfirm(reason || undefined);
        }}
      >
        <Form.Item
          label={MSG_ACC.STATUS_REASON_LABEL}
          // Tên field RIÊNG — không dùng chung `reason` với modal Từ chối /
          // Vô hiệu hoá tổ chức, nếu không antd sinh trùng `id` (a11y).
          name="statusReason"
          rules={[{ max: MAX_REASON_LENGTH, message: MSG_ACC.STATUS_REASON_TOO_LONG }]}
        >
          <Input.TextArea
            rows={3}
            showCount
            maxLength={MAX_REASON_LENGTH}
            placeholder="Ghi chú lý do (không bắt buộc) — được lưu vào nhật ký."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
