import { Alert, Form, Input, Modal, Typography, theme } from 'antd';
import { useEffect } from 'react';
import { MSG_ORG } from '../../features/admin/adminMessages';

const { Text } = Typography;

/** Lý do tối đa — khớp cột `rejection_reason VARCHAR(500)` trong DB. */
const MAX_REASON_LENGTH = 500;

type SuspendMode = 'suspend' | 'reactivate';

interface SuspendOrganizationModalProps {
  open: boolean;
  /** Chế độ: `suspend` = vô hiệu hoá · `reactivate` = kích hoạt lại. */
  mode: SuspendMode;
  /** Tên tổ chức — hiện trong nội dung modal. */
  orgName: string;
  /** Đang gửi yêu cầu → nút xác nhận khoá + loading. */
  loading: boolean;
  /**
   * Lỗi từ BE — hiển thị bằng `Alert` ngay trong modal.
   *
   * Trước đây lỗi hiện qua `message.error` (toast) nhưng toast tự biến mất sau
   * vài giây và nằm dưới lớp phủ của modal → người dùng dễ bỏ lỡ, không đọc
   * được vì sao thao tác thất bại.
   */
  error?: string | null;
  onCancel: () => void;
  /**
   * Nhận lý do đã TRIM (hoặc `undefined` nếu để trống).
   *
   * `suspend`: lý do BẮT BUỘC (cần audit) · `reactivate`: lý do tuỳ chọn.
   */
  onConfirm: (reason: string | undefined) => void;
}

/**
 * Modal xác nhận **Vô hiệu hoá / Kích hoạt lại** tổ chức (`C1`, `D-21`).
 *
 * `BR-04`: chữ trên UI là "Vô hiệu hoá", **không** phải "Xoá".
 * Lý do vô hiệu hoá là dữ liệu người dùng nhập → khi hiển thị lại phải render
 * bằng TEXT THUẦN, không `dangerouslySetInnerHTML` (ADR-FE-003).
 */
export default function SuspendOrganizationModal({
  open,
  mode,
  orgName,
  loading,
  error,
  onCancel,
  onConfirm,
}: SuspendOrganizationModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<{ suspendReason?: string }>();

  const isSuspend = mode === 'suspend';

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  return (
    <Modal
      open={open}
      title={isSuspend ? MSG_ORG.SUSPEND_TITLE : MSG_ORG.REACTIVATE_TITLE}
      okText={isSuspend ? MSG_ORG.SUSPEND : MSG_ORG.REACTIVATE}
      cancelText={MSG_ORG.CANCEL}
      confirmLoading={loading}
      okButtonProps={{ danger: isSuspend, disabled: loading }}
      onOk={() => form.submit()}
      onCancel={onCancel}
      // `forceRender` giữ Form luôn gắn với form instance (tránh cảnh báo antd).
      // Lưu ý: modal này mount sẵn cả khi đóng → trên trang có NHIỀU modal thì
      // sẽ có nhiều `.ant-input-data-count` — test phải scope theo modal đang thấy.
      forceRender
    >
      {/* Chỉ hiện khi modal đang mở — modal mount sẵn cả khi đóng nên nếu không
          kiểm tra `open` thì Alert này vẫn nằm trong DOM ẩn (role="alert" giả). */}
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
        {isSuspend ? (
          <>
            Tổ chức <Text strong>{orgName}</Text> sẽ bị <Text strong>vô hiệu hoá</Text>: tài khoản
            chủ tổ chức bị tạm khoá và tổ chức không thể đăng nhập cho tới khi được kích hoạt lại.
          </>
        ) : (
          <>
            Tổ chức <Text strong>{orgName}</Text> sẽ được <Text strong>hoạt động trở lại</Text> và
            tài khoản chủ tổ chức có thể đăng nhập bình thường.
          </>
        )}
      </Text>

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        style={{ marginTop: token.margin }}
        onFinish={(values) => {
          const reason = values.suspendReason?.trim();
          onConfirm(reason || undefined);
        }}
      >
        <Form.Item
          label={MSG_ORG.SUSPEND_REASON_LABEL}
          // Tên field RIÊNG — không dùng chung `reason` với modal Từ chối / Đổi
          // trạng thái, nếu không antd sinh trùng `id` và label trỏ nhầm ô (a11y).
          name="suspendReason"
          rules={[
            // `whitespace: true` ⇒ chỉ gõ toàn dấu cách vẫn tính là TRỐNG.
            // `suspend`: BẮT BUỘC nhập lý do (cần audit) · `reactivate`: tuỳ chọn.
            isSuspend
              ? { required: true, whitespace: true, message: MSG_ORG.SUSPEND_REASON_REQUIRED }
              : {},
            { max: MAX_REASON_LENGTH, message: MSG_ORG.SUSPEND_REASON_TOO_LONG },
          ]}
        >
          <Input.TextArea
            rows={3}
            showCount
            maxLength={MAX_REASON_LENGTH}
            placeholder={
              isSuspend
                ? 'Nêu lý do tổ chức bị vô hiệu hoá để lưu vào nhật ký.'
                : 'Nếu có, ghi rõ lý do kích hoạt lại (không bắt buộc).'
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
