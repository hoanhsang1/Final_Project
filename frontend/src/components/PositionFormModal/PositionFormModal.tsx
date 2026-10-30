import { Alert, Checkbox, Form, Input, Modal, theme } from 'antd';
import { useEffect } from 'react';
import { MSG_OWNER, MSG_POS } from '../../features/owner/ownerMessages';
import { permissionLabel } from '../../features/owner/permissionLabels';
import type { Permission, Position, PositionPayload } from '../../features/owner/types';

interface PositionFormModalProps {
  open: boolean;
  position: Position | null;
  permissions: Permission[];
  submitting: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (values: PositionPayload) => void;
}

interface FormValues {
  name: string;
  description?: string;
  permissions: string[];
}

export default function PositionFormModal({
  open,
  position,
  permissions,
  submitting,
  error,
  onCancel,
  onSubmit,
}: PositionFormModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<FormValues>();
  const isEditing = position !== null;

  useEffect(() => {
    if (!open) {
      return;
    }
    if (position) {
      form.setFieldsValue({
        name: position.name,
        description: position.description ?? '',
        permissions: position.permissions,
      });
    } else {
      form.resetFields();
    }
  }, [open, position, form]);

  return (
    <Modal
      open={open}
      title={isEditing ? MSG_POS.EDIT : MSG_POS.CREATE}
      okText={MSG_OWNER.SAVE}
      cancelText={MSG_OWNER.CANCEL}
      confirmLoading={submitting}
      okButtonProps={{ disabled: submitting }}
      onOk={() => form.submit()}
      onCancel={onCancel}
      destroyOnClose
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

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) =>
          onSubmit({
            name: values.name.trim(),
            description: values.description?.trim() || undefined,
            permissions: values.permissions ?? [],
          })
        }
      >
        <Form.Item
          label={MSG_POS.NAME}
          name="name"
          rules={[
            { required: true, whitespace: true, message: MSG_POS.NAME_REQUIRED },
            { max: 200, message: MSG_POS.NAME_TOO_LONG },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>

        <Form.Item
          label={MSG_POS.DESCRIPTION}
          name="description"
          rules={[{ max: 1000, message: MSG_POS.DESCRIPTION_TOO_LONG }]}
        >
          <Input.TextArea rows={3} maxLength={1000} showCount />
        </Form.Item>

        <Form.Item
          label={MSG_POS.PERMISSIONS}
          name="permissions"
          rules={[{ required: true, type: 'array', min: 1, message: MSG_POS.PERMISSIONS_REQUIRED }]}
        >
          <Checkbox.Group style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}>
            {permissions.map((p) => (
              <Checkbox key={p.code} value={p.code}>
                {permissionLabel(p.code)} ({p.description})
              </Checkbox>
            ))}
          </Checkbox.Group>
        </Form.Item>
      </Form>
    </Modal>
  );
}
