import { Alert, Form, Input, Modal, Radio, Select, theme } from 'antd';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MSG_MEM, MSG_OWNER } from '../../features/owner/ownerMessages';
import type { MemberPayload, Position } from '../../features/owner/types';

interface MemberFormModalProps {
  open: boolean;
  positions: Position[];
  submitting: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (values: MemberPayload) => void;
}

interface MemberFormValues {
  username: string;
  email: string;
  role: 'MANAGER' | 'STAFF';
  positionIds: string[];
}

export default function MemberFormModal({
  open,
  positions,
  submitting,
  error,
  onCancel,
  onSubmit,
}: MemberFormModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<MemberFormValues>();
  const hasPositions = positions.length > 0;

  useEffect(() => {
    if (!open) {
      return;
    }
    form.resetFields();
    form.setFieldsValue({ role: 'STAFF' });
  }, [open, form]);

  return (
    <Modal
      open={open}
      title={MSG_MEM.ADD_TITLE}
      okText={MSG_OWNER.SAVE}
      cancelText={MSG_OWNER.CANCEL}
      confirmLoading={submitting}
      okButtonProps={{ disabled: submitting || !hasPositions }}
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

      {!hasPositions && (
        <Alert
          type="warning"
          showIcon
          message={MSG_MEM.NO_POSITION_CATALOG}
          action={<Link to="/to-chuc/chuc-vu">{MSG_MEM.GO_TO_POSITIONS}</Link>}
          style={{ marginBottom: token.margin }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) =>
          onSubmit({
            username: values.username.trim(),
            email: values.email.trim(),
            role: values.role,
            positionIds: values.positionIds,
          })
        }
      >
        <Form.Item
          label={MSG_MEM.USERNAME}
          name="username"
          rules={[
            { required: true, message: MSG_MEM.USERNAME_REQUIRED },
            { max: 100, message: MSG_MEM.USERNAME_TOO_LONG },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>

        <Form.Item
          label={MSG_MEM.EMAIL}
          name="email"
          rules={[
            { required: true, message: MSG_MEM.EMAIL_REQUIRED },
            { type: 'email', message: MSG_MEM.EMAIL_INVALID },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>

        <Form.Item
          label={MSG_MEM.ROLE}
          name="role"
          rules={[{ required: true, message: MSG_MEM.ROLE_REQUIRED }]}
        >
          <Radio.Group>
            <Radio value="STAFF">Nhân viên phòng ban</Radio>
            <Radio value="MANAGER">Quản lý phòng ban</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label={MSG_MEM.POSITIONS}
          name="positionIds"
          rules={[{ required: true, type: 'array', min: 1, message: MSG_MEM.POSITIONS_REQUIRED }]}
        >
          <Select
            mode="multiple"
            options={positions.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Chọn chức vụ"
            disabled={!hasPositions}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
