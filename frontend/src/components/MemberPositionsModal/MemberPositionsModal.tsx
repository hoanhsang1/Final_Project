import { Form, Modal, Select } from 'antd';
import { useEffect } from 'react';
import { MSG_MEM, MSG_OWNER } from '../../features/owner/ownerMessages';
import type { Member, Position } from '../../features/owner/types';

interface MemberPositionsModalProps {
  open: boolean;
  member: Member | null;
  positions: Position[];
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (positionIds: string[]) => void;
}

interface FormValues {
  positionIds: string[];
}

export default function MemberPositionsModal({
  open,
  member,
  positions,
  submitting,
  onCancel,
  onSubmit,
}: MemberPositionsModalProps) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!open || !member) {
      return;
    }
    form.setFieldsValue({ positionIds: member.positionIds });
  }, [open, member, form]);

  return (
    <Modal
      open={open}
      title={MSG_MEM.CHANGE_POSITIONS}
      okText={MSG_OWNER.SAVE}
      cancelText={MSG_OWNER.CANCEL}
      confirmLoading={submitting}
      okButtonProps={{ disabled: submitting }}
      onOk={() => form.submit()}
      onCancel={onCancel}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => onSubmit(values.positionIds)}
      >
        <Form.Item
          label={MSG_MEM.POSITIONS}
          name="positionIds"
          rules={[{ required: true, type: 'array', min: 1, message: MSG_MEM.POSITIONS_REQUIRED }]}
        >
          <Select
            mode="multiple"
            options={positions.map((p) => ({ value: p.id, label: p.name }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
