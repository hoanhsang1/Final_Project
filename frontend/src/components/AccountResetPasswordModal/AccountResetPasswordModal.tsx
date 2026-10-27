import { Alert, Form, Input, Modal, Radio, theme } from 'antd';
import { useEffect } from 'react';
import { MSG_ACC, MSG_ORG } from '../../features/admin/adminMessages';

/** Chế độ đặt lại mật khẩu (`D-31`). */
export type PasswordResetMode = 'email' | 'manual';

interface AccountResetPasswordModalProps {
  open: boolean;
  /** Tên đăng nhập — hiện trong nội dung modal. */
  username: string;
  loading: boolean;
  /** Lỗi từ BE — hiển thị bằng `Alert` trong modal (NFR-REL-001). */
  error?: string | null;
  onCancel: () => void;
  /**
   * `mode = 'email'` → không truyền mật khẩu (BE sinh tạm + gửi email);
   * `mode = 'manual'` → truyền mật khẩu đã trim (≥ 8 ký tự).
   */
  onConfirm: (mode: PasswordResetMode, newPassword?: string) => void;
}

/**
 * Modal **đặt lại mật khẩu** — `POST /accounts/{id}/reset-password` (`D-31`).
 *
 * Hai chế độ (Q-37):
 * - **Gửi mật khẩu tạm qua email** (mặc định) — admin không thấy/đặt được mật
 *   khẩu người khác; cần mail service (`D-27`) chạy thật thì luồng mới trọn.
 * - **Đặt mật khẩu mới thủ công** — cho trường hợp người dùng không nhận được
 *   email; FE validate ≥ 8 ký tự, BE validate lại là chốt.
 */
export default function AccountResetPasswordModal({
  open,
  username,
  loading,
  error,
  onCancel,
  onConfirm,
}: AccountResetPasswordModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<{ resetMode: PasswordResetMode; newPassword?: string }>();

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  return (
    <Modal
      open={open}
      title={`${MSG_ACC.RESET_TITLE}: ${username}`}
      okText={MSG_ACC.RESET_TITLE}
      cancelText={MSG_ORG.CANCEL}
      confirmLoading={loading}
      okButtonProps={{ disabled: loading }}
      onOk={() => form.submit()}
      onCancel={onCancel}
      // `forceRender` giữ Form luôn gắn với antd Form instance (tránh cảnh báo).
      forceRender
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

      <Alert
        type="info"
        showIcon
        message={MSG_ACC.RESET_HINT_EMAIL}
        style={{ marginBottom: token.margin }}
      />

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ resetMode: 'email' }}
        onFinish={(values) => {
          const mode = values.resetMode ?? 'email';
          onConfirm(mode, mode === 'manual' ? values.newPassword?.trim() : undefined);
        }}
      >
        <Form.Item
          label="Cách đặt lại"
          // Tên field RIÊNG — không trùng các field của modal trạng thái / vai trò.
          name="resetMode"
        >
          <Radio.Group
            options={[
              { value: 'email', label: MSG_ACC.RESET_SEND_EMAIL },
              { value: 'manual', label: MSG_ACC.RESET_MANUAL },
            ]}
          />
        </Form.Item>

        {/* Chỉ hiện ô mật khẩu khi chọn chế độ thủ công — validate ≥ 8 ký tự. */}
        <Form.Item noStyle shouldUpdate={(prev, cur) => prev.resetMode !== cur.resetMode}>
          {({ getFieldValue }) =>
            getFieldValue('resetMode') === 'manual' ? (
              <Form.Item
                label={MSG_ACC.PASSWORD_LABEL}
                name="newPassword"
                rules={[
                  { required: true, message: MSG_ACC.PASSWORD_REQUIRED },
                  { min: 8, message: MSG_ACC.PASSWORD_TOO_SHORT },
                ]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
            ) : null
          }
        </Form.Item>
      </Form>
    </Modal>
  );
}
