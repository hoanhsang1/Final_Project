import { Alert, Form, Modal, Select, Typography, theme } from 'antd';
import { useEffect } from 'react';
import { MSG_ACC, MSG_ORG } from '../../features/admin/adminMessages';
import { CREATE_ROLE_OPTIONS, roleLabel } from '../../features/admin/roleLabels';

const { Text } = Typography;

interface AccountRoleModalProps {
  open: boolean;
  /** Tên đăng nhập — hiện trong nội dung modal. */
  username: string;
  /** Vai trò HIỆN TẠI của tài khoản (`account.role`, role backend gốc). */
  currentRole: string;
  loading: boolean;
  /** Lỗi từ BE — hiển thị bằng `Alert` trong modal (NFR-REL-001). */
  error?: string | null;
  onCancel: () => void;
  /** Nhận vai trò MỚI (role backend gốc) — FE đã chặn vai trò trùng. */
  onConfirm: (role: string) => void;
}

/**
 * Modal **đổi vai trò tài khoản** — `PATCH /accounts/{id}/role` (`D-30`).
 *
 * Validate FE: vai trò mới phải **khác** vai trò hiện tại; danh sách chỉ gồm
 * `CREATE_ROLE_OPTIONS` (không có `SUPER_ADMIN` — Q-35). BE chặn thêm trường
 * hợp admin tự đổi vai trò chính mình (409 → `MSG-ACC-27`).
 */
export default function AccountRoleModal({
  open,
  username,
  currentRole,
  loading,
  error,
  onCancel,
  onConfirm,
}: AccountRoleModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<{ newRole: string }>();

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  return (
    <Modal
      open={open}
      title={`${MSG_ACC.CHANGE_ROLE_TITLE}: ${username}`}
      okText={MSG_ACC.CHANGE_ROLE_TITLE}
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
        message={
          <>
            Vai trò hiện tại: <Text strong>{roleLabel(currentRole)}</Text>
          </>
        }
        style={{ marginBottom: token.margin }}
      />

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => onConfirm(values.newRole)}
      >
        <Form.Item
          label={MSG_ACC.ROLE}
          // Tên field RIÊNG — không trùng `role` của form tạo tài khoản hay
          // `statusReason` của modal trạng thái (antd sinh trùng `id` nếu alike).
          name="newRole"
          rules={[
            { required: true, message: MSG_ACC.ROLE_REQUIRED },
            {
              validator: (_, value: string | undefined) =>
                value && value === currentRole
                  ? Promise.reject(new Error(MSG_ACC.ROLE_UNCHANGED))
                  : Promise.resolve(),
            },
          ]}
        >
          <Select options={[...CREATE_ROLE_OPTIONS]} placeholder={MSG_ACC.ROLE_REQUIRED} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
