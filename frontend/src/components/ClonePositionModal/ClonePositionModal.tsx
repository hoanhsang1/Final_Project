import { Alert, Form, Input, Modal, Select, theme } from 'antd';
import { useEffect } from 'react';
import { MSG_OWNER, MSG_POS } from '../../features/owner/ownerMessages';
import type { Department, Position, PositionClonePayload } from '../../features/owner/types';

interface ClonePositionModalProps {
  open: boolean;
  /** Chức vụ nguồn — mở modal chỉ khi đã chọn được một chức vụ. */
  position: Position | null;
  departments: Department[];
  submitting: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (values: PositionClonePayload) => void;
}

interface FormValues {
  name?: string;
  departmentId: string;
}

export default function ClonePositionModal({
  open,
  position,
  departments,
  submitting,
  error,
  onCancel,
  onSubmit,
}: ClonePositionModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  return (
    <Modal
      open={open}
      title={position ? `${MSG_POS.CLONE_TITLE} · ${position.name}` : MSG_POS.CLONE_TITLE}
      okText={MSG_POS.CLONE}
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

      <Alert
        type="info"
        showIcon
        message={MSG_POS.CLONE_HINT}
        style={{ marginBottom: token.margin }}
      />

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) =>
          onSubmit({
            name: values.name?.trim() || undefined,
            departmentId: values.departmentId,
          })
        }
      >
        <Form.Item label={MSG_POS.CLONE_DEPARTMENT} name="departmentId" rules={[{ required: true, message: MSG_POS.CLONE_DEPARTMENT_REQUIRED }]}>
          <Select
            placeholder={MSG_POS.CLONE_DEPARTMENT}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
          />
        </Form.Item>

        <Form.Item
          label={MSG_POS.CLONE_NAME}
          name="name"
          rules={[{ max: 200, message: MSG_POS.NAME_TOO_LONG }]}
        >
          <Input autoComplete="off" placeholder={MSG_POS.CLONE_NAME_PLACEHOLDER} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
