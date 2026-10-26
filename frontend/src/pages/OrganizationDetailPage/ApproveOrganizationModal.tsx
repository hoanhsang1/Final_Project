import { Alert, Checkbox, Modal, Typography, theme } from 'antd';
import { useEffect, useState } from 'react';
import { MSG_ORG } from '../../features/admin/adminMessages';

const { Text } = Typography;

interface ApproveOrganizationModalProps {
  open: boolean;
  /** Tên tổ chức — hiện trong nội dung modal. */
  orgName: string;
  /** Số module sẽ được kích hoạt khi duyệt. */
  moduleCount: number;
  /** Đang gửi yêu cầu → nút xác nhận khoá + loading. */
  loading: boolean;
  /** Lỗi từ BE — hiện bằng `Alert` trong modal thay cho toast dễ bị bỏ lỡ. */
  error?: string | null;
  onCancel: () => void;
  /** `notifyEmail` — `D-27` (C3): BE gửi email cho chủ tổ chức nếu `true`. */
  onConfirm: (notifyEmail: boolean) => void;
}

/**
 * Modal xác nhận DUYỆT tổ chức — Đặc tả Sprint 2 §3.4.
 *
 * Nội dung nêu rõ tên tổ chức và số module sẽ được kích hoạt (`TC-APPR-01`).
 *
 * **C3** — checkbox `notifyEmail` (`D-27`): mặc định **BẬT**, gửi kèm trong body
 * `PATCH …/approve`. BE hiện chưa đọc body này (`D-05` + `D-27`) nên nó chưa
 * làm thay đổi gì ở backend — FE gửi đúng contract để sẵn sàng khi Sang sửa.
 */
export default function ApproveOrganizationModal({
  open,
  orgName,
  moduleCount,
  loading,
  error,
  onCancel,
  onConfirm,
}: ApproveOrganizationModalProps) {
  const { token } = theme.useToken();
  // Mặc định tick — người dùng phải chủ động BỎ tick thì mới không gửi email.
  const [notifyEmail, setNotifyEmail] = useState(true);

  // Mở modal → về lại mặc định (không nhớ lựa chọn lần trước của lần duyệt khác).
  useEffect(() => {
    if (open) {
      setNotifyEmail(true);
    }
  }, [open]);

  return (
    <Modal
      open={open}
      title={MSG_ORG.APPROVE_TITLE}
      okText={MSG_ORG.APPROVE}
      cancelText={MSG_ORG.CANCEL}
      confirmLoading={loading}
      // Nút chỉ khoá KHI đang gửi — không tắt trước khi gửi (Đặc tả §3.0).
      okButtonProps={{ disabled: loading }}
      onOk={() => onConfirm(notifyEmail)}
      onCancel={onCancel}
      destroyOnHidden
    >
      {open && error && (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={error}
          style={{ marginBottom: token.margin }}
        />
      )}

      <Text>
        Bạn sắp duyệt <Text strong>{orgName}</Text>. Toàn bộ <Text strong>{moduleCount}</Text>{' '}
        module đang chọn sẽ được kích hoạt và tài khoản chủ tổ chức sẽ hoạt động.
      </Text>

      <div style={{ marginTop: token.margin }}>
        <Checkbox
          checked={notifyEmail}
          onChange={(event) => setNotifyEmail(event.target.checked)}
        >
          {MSG_ORG.NOTIFY_EMAIL}
        </Checkbox>
      </div>
    </Modal>
  );
}
