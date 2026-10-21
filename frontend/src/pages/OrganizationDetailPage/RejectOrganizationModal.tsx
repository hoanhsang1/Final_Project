import { Form, Input, Modal, Typography, theme } from 'antd';
import { useEffect } from 'react';
import { MSG_ORG } from '../../features/admin/adminMessages';

const { Text } = Typography;

interface RejectOrganizationModalProps {
  open: boolean;
  /** Tên tổ chức — hiện trong nội dung modal. */
  orgName: string;
  /** Đang gửi yêu cầu → nút xác nhận khoá + loading. */
  loading: boolean;
  onCancel: () => void;
  /** Nhận lý do đã TRIM. */
  onConfirm: (reason: string) => void;
}

/**
 * Modal TỪ CHỐI tổ chức — Đặc tả Sprint 2 §3.5.
 *
 * Lý do từ chối là **BẮT BUỘC** (`Q-14`), tối đa 500 ký tự — khớp cột
 * `rejection_reason VARCHAR(500)` trong DB. `showCount` + `maxLength` cho bộ đếm
 * và chặn cứng (`TC-ORG-29`).
 *
 * ⚠️ Lý do là dữ liệu người dùng nhập → khi hiển thị lại phải render bằng TEXT THUẦN,
 * tuyệt đối không `dangerouslySetInnerHTML` (ADR-FE-003).
 */
export default function RejectOrganizationModal({
  open,
  orgName,
  loading,
  onCancel,
  onConfirm,
}: RejectOrganizationModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<{ reason: string }>();

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  return (
    <Modal
      open={open}
      title={MSG_ORG.REJECT_TITLE}
      okText={MSG_ORG.REJECT}
      cancelText={MSG_ORG.CANCEL}
      confirmLoading={loading}
      okButtonProps={{ danger: true, disabled: loading }}
      onOk={() => form.submit()}
      onCancel={onCancel}
      // `forceRender` giữ Form luôn gắn với form instance (tránh cảnh báo antd).
      forceRender
    >
      <Text>
        Tổ chức <Text strong>{orgName}</Text> sẽ không hoạt động và tài khoản chủ tổ chức sẽ bị{' '}
        <Text strong>vô hiệu hoá</Text>.
      </Text>

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        style={{ marginTop: token.margin }}
        onFinish={(values) => onConfirm(values.reason.trim())}
      >
        <Form.Item
          label={MSG_ORG.REASON_LABEL}
          name="reason"
          rules={[
            // `whitespace: true` ⇒ chỉ gõ toàn dấu cách vẫn tính là TRỐNG (TC-ORG-28).
            { required: true, whitespace: true, message: MSG_ORG.REASON_REQUIRED },
            { max: 500, message: MSG_ORG.REASON_TOO_LONG },
          ]}
        >
          <Input.TextArea
            rows={4}
            showCount
            maxLength={500}
            placeholder="Nêu rõ lý do để tổ chức biết cần bổ sung hồ sơ gì."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
