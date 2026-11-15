import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Form, Input, Modal, Select, Typography } from 'antd';
import { useState } from 'react';
import { fetchMembers } from '../../features/owner/ownerApi';
import { fetchDepartments, sprint4ErrorMessage } from '../../features/sprint4/sprint4Api';
import { createTransfer } from '../../features/transfer/transferApi';

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface FormValues {
  fromDepartmentId: string;
  userId: string;
  toDepartmentId: string;
  reason: string;
}

/**
 * Tạo yêu cầu chuyển phòng ban.
 *
 * Chọn phòng hiện tại chỉ để tải danh sách nhân sự; BE tự đọc lại phòng thật
 * của nhân sự từ DB nên client không gửi `fromDepartmentId`.
 */
export default function TransferCreateModal({ open, onClose, onCreated }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [error, setError] = useState<string | null>(null);
  const [fromDepartmentId, setFromDepartmentId] = useState<string | undefined>();

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
    enabled: open,
  });
  const membersQuery = useQuery({
    queryKey: ['department-members', fromDepartmentId],
    queryFn: () => fetchMembers(fromDepartmentId as string),
    enabled: open && !!fromDepartmentId,
  });

  const departments = departmentsQuery.data ?? [];
  const members = (membersQuery.data ?? []).filter((m) => m.status !== 'RESIGNED');

  const createMut = useMutation({
    mutationFn: (values: FormValues) =>
      createTransfer({
        userId: values.userId,
        toDepartmentId: values.toDepartmentId,
        reason: values.reason.trim(),
      }),
    onSuccess: () => {
      setError(null);
      form.resetFields();
      setFromDepartmentId(undefined);
      onCreated();
    },
    onError: (err) => setError(sprint4ErrorMessage(err)),
  });

  const close = () => {
    setError(null);
    form.resetFields();
    setFromDepartmentId(undefined);
    onClose();
  };

  return (
    <Modal
      title="Tạo yêu cầu chuyển phòng ban"
      open={open}
      onCancel={close}
      okText="Gửi yêu cầu"
      cancelText="Huỷ"
      confirmLoading={createMut.isPending}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Yêu cầu cần 4 bên duyệt: Trưởng phòng cũ, Trưởng phòng mới, HR và chính nhân sự."
      />
      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
      <Form<FormValues>
        form={form}
        layout="vertical"
        onFinish={(values) => createMut.mutate(values)}
        onValuesChange={(changed) => {
          if (changed.fromDepartmentId !== undefined) {
            setFromDepartmentId(changed.fromDepartmentId);
            form.setFieldValue('userId', undefined);
          }
        }}
      >
        <Form.Item
          name="fromDepartmentId"
          label="Phòng ban hiện tại"
          rules={[{ required: true, message: 'Chọn phòng ban hiện tại' }]}
        >
          <Select
            placeholder="Chọn phòng ban"
            loading={departmentsQuery.isLoading}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
          />
        </Form.Item>
        <Form.Item
          name="userId"
          label="Nhân sự được chuyển"
          rules={[{ required: true, message: 'Chọn nhân sự' }]}
        >
          <Select
            placeholder={fromDepartmentId ? 'Chọn nhân sự' : 'Chọn phòng ban trước'}
            disabled={!fromDepartmentId}
            loading={membersQuery.isLoading}
            showSearch
            optionFilterProp="label"
            options={members.map((m) => ({
              value: m.userId,
              label: m.username ?? m.userId,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="toDepartmentId"
          label="Phòng ban đích"
          dependencies={['fromDepartmentId']}
          rules={[
            { required: true, message: 'Chọn phòng ban đích' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || value !== getFieldValue('fromDepartmentId')) return Promise.resolve();
                return Promise.reject(new Error('Phòng ban đích phải khác phòng ban hiện tại'));
              },
            }),
          ]}
        >
          <Select
            placeholder="Chọn phòng ban"
            loading={departmentsQuery.isLoading}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
          />
        </Form.Item>
        <Form.Item
          name="reason"
          label="Lý do"
          rules={[
            { required: true, message: 'Nhập lý do chuyển phòng ban' },
            { max: 1000, message: 'Lý do tối đa 1000 ký tự' },
          ]}
        >
          <Input.TextArea rows={3} placeholder="Ví dụ: điều chuyển theo kế hoạch đào tạo" />
        </Form.Item>
      </Form>
      <Text type="secondary">
        Nếu một trong hai phòng chưa có Trưởng phòng, hệ thống sẽ từ chối tạo yêu cầu.
      </Text>
    </Modal>
  );
}
