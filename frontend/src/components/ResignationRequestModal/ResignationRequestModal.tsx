import { Alert, Form, Input, Modal } from 'antd';
import { useEffect } from 'react';
import { MSG_STAFF } from '../../features/sprint4/sprint4Messages';
import { MSG_OWNER } from '../../features/owner/ownerMessages';
import type { Member } from '../../features/owner/types';

interface ResignationRequestModalProps {
  open: boolean;
  member: Member | null;
  submitting: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}

interface FormValues {
  reason: string;
}

/** Tạo yêu cầu nghỉ việc — chỉ cần HR duyệt một bước (quy tắc 16). */
export default function ResignationRequestModal({
  open,
  member,
  submitting,
  error,
  onCancel,
  onSubmit,
}: ResignationRequestModalProps) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  return (
    <Modal
      open={open}
      title={MSG_STAFF.RESIGN_TITLE}
      okText={MSG_OWNER.SAVE}
      cancelText={MSG_OWNER.CANCEL}
      confirmLoading={submitting}
      okButtonProps={{ disabled: submitting }}
      onOk={() => form.submit()}
      onCancel={onCancel}
      destroyOnClose
    >
      <Alert
        type="warning"
        showIcon
        message={MSG_STAFF.RESIGN_HINT}
        style={{ marginBottom: 16 }}
      />
      {member && (
        <p>
          Nhân sự: <strong>{member.username || member.userId}</strong>
        </p>
      )}
      {error && <Alert type="error" showIcon role="alert" message={error} style={{ marginBottom: 16 }} />}
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => onSubmit(values.reason.trim())}
      >
        <Form.Item
          label={MSG_STAFF.RESIGN_REASON}
          name="reason"
          rules={[
            { required: true, message: MSG_STAFF.RESIGN_REASON_REQUIRED },
            { max: 1000, message: 'Lý do tối đa 1000 ký tự' },
          ]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
