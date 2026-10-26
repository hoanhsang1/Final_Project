import { Alert, Form, Input, Modal, Select, theme } from 'antd';
import { useEffect } from 'react';
import { MSG_ACC, MSG_ORG } from '../../features/admin/adminMessages';
import { CREATE_ROLE_OPTIONS } from '../../features/admin/roleLabels';
import type { AccountCreatePayload } from '../../features/admin/types';

/** Giá trị form của modal tạo tài khoản. */
interface AccountCreateFormValues {
  email: string;
  fullName: string;
  role: string;
  organizationId: string;
}

interface AccountCreateModalProps {
  open: boolean;
  /** Tổ chức cho ô Select — lấy từ `GET /organizations/options` (`D-20b`). */
  orgOptions: ReadonlyArray<{ value: string; label: string }>;
  /** Đang gửi yêu cầu → nút xác nhận khoá + loading. */
  loading: boolean;
  /**
   * Lỗi từ BE — hiện bằng `Alert` trong modal (khác toast: toast tự biến mất
   * và bị modal che — NFR-REL-001).
   */
  error?: string | null;
  onCancel: () => void;
  /** Nhận payload đã trim — `organization_id` LUÔN có (mọi role đều gắn tổ chức). */
  onConfirm: (payload: AccountCreatePayload) => void;
}

/**
 * Modal **tạo tài khoản** — `POST /api/v1/accounts` (`D-29`).
 *
 * Không có ô username/mật khẩu: BE sinh từ email + gửi mật khẩu tạm qua email
 * (Q-36). Vai trò chỉ nhận các role `CREATE_ROLE_OPTIONS` — **không** có
 * `SUPER_ADMIN` (Q-35). Validate bằng antd `rules` (FE cho UX; BE là chốt).
 */
export default function AccountCreateModal({
  open,
  orgOptions,
  loading,
  error,
  onCancel,
  onConfirm,
}: AccountCreateModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<AccountCreateFormValues>();

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  return (
    <Modal
      open={open}
      title={MSG_ACC.CREATE_TITLE}
      okText={MSG_ACC.CREATE_TITLE}
      cancelText={MSG_ORG.CANCEL}
      confirmLoading={loading}
      okButtonProps={{ disabled: loading }}
      onOk={() => form.submit()}
      onCancel={onCancel}
      // `forceRender` giữ Form luôn gắn với antd Form instance (tránh cảnh báo).
      forceRender
    >
      {/* Lỗi BE xếp trên form — `open` phải đúng vì modal mount sẵn cả khi đóng. */}
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
        message={MSG_ACC.CREATE_HINT}
        style={{ marginBottom: token.margin }}
      />

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => {
          onConfirm({
            email: values.email.trim(),
            full_name: values.fullName.trim(),
            role: values.role,
            organization_id: values.organizationId,
          });
        }}
      >
        <Form.Item
          label={MSG_ACC.EMAIL_LABEL}
          name="email"
          rules={[
            { required: true, message: MSG_ACC.EMAIL_REQUIRED },
            { type: 'email', message: MSG_ACC.EMAIL_INVALID },
          ]}
        >
          <Input autoComplete="off" placeholder="ten@example.edu.vn" />
        </Form.Item>
        <Form.Item
          label={MSG_ACC.FULL_NAME}
          name="fullName"
          rules={[{ required: true, message: MSG_ACC.FULL_NAME_REQUIRED }]}
        >
          <Input autoComplete="off" placeholder="Nguyễn Văn A" />
        </Form.Item>
        <Form.Item
          label={MSG_ACC.ROLE}
          name="role"
          rules={[{ required: true, message: MSG_ACC.ROLE_REQUIRED }]}
        >
          {/* Không có `SUPER_ADMIN` trong danh sách (Q-35). */}
          <Select options={[...CREATE_ROLE_OPTIONS]} placeholder={MSG_ACC.ROLE_REQUIRED} />
        </Form.Item>
        <Form.Item
          label={MSG_ACC.ORGANIZATION}
          name="organizationId"
          rules={[{ required: true, message: MSG_ACC.ORG_REQUIRED }]}
        >
          <Select
            options={[...orgOptions]}
            showSearch
            optionFilterProp="label"
            placeholder={MSG_ACC.ORG_REQUIRED}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
