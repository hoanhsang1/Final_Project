import { Alert, Divider, Form, Input, Modal, Radio, Select, theme } from 'antd';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CONTRACT_TYPE_LABEL } from '../../features/sprint4/labels';
import type { Specialty } from '../../features/sprint4/types';
import { MSG_MEM, MSG_OWNER } from '../../features/owner/ownerMessages';
import type { MemberPayload, Position } from '../../features/owner/types';

interface MemberFormModalProps {
  open: boolean;
  positions: Position[];
  specialties?: Specialty[];
  submitting: boolean;
  error?: string | null;
  /** OWNER mới được bổ nhiệm MANAGER; người quản lý nhân sự chỉ thêm STAFF. */
  allowManagerRole?: boolean;
  onCancel: () => void;
  onSubmit: (values: MemberPayload) => void;
}

interface MemberFormValues {
  username: string;
  email: string;
  role: 'MANAGER' | 'STAFF';
  positionIds: string[];
  fullName?: string;
  phone?: string;
  staffCode?: string;
  specialtyIds?: string[];
  contractType?: 'CO_HUU' | 'THINH_GIANG' | null;
}

/**
 * Form tạo nhân viên: trường nhập thay đổi theo chức danh.
 *
 * Chọn chức danh `TEACHER` → hiện hồ sơ giáo viên (họ tên, điện thoại, chuyên
 * môn — nhiều môn). Trạng thái dạy mặc định do BE đặt (`DANG_DAY`); nhân sự mới
 * chưa có lớp nên danh sách hiện "Chưa có lớp".
 */
export default function MemberFormModal({
  open,
  positions,
  specialties = [],
  submitting,
  error,
  allowManagerRole = true,
  onCancel,
  onSubmit,
}: MemberFormModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<MemberFormValues>();
  const selectedIds = Form.useWatch('positionIds', form) ?? [];
  const teacherById = new Map(positions.map((p) => [p.id, p.profileType === 'TEACHER']));
  const teacherSelected = selectedIds.some((id) => teacherById.get(id));
  const hasPositions = positions.length > 0;

  useEffect(() => {
    if (!open) {
      return;
    }
    form.resetFields();
    form.setFieldsValue({ role: 'STAFF' });
  }, [open, form]);

  const handleFinish = (values: MemberFormValues) => {
    const teacher = values.positionIds.some((id) => teacherById.get(id));
    const payload: MemberPayload = {
      username: values.username.trim(),
      email: values.email.trim(),
      role: values.role,
      positionIds: values.positionIds,
    };
    if (teacher) {
      payload.fullName = values.fullName?.trim();
      payload.phone = values.phone?.trim();
      if (values.staffCode?.trim()) payload.staffCode = values.staffCode.trim();
      payload.teacherProfile = {
        specialtyIds: values.specialtyIds ?? [],
        contractType: values.contractType ?? null,
      };
    }
    onSubmit(payload);
  };

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
          action={<Link to="/dao-tao/chuc-vu">{MSG_MEM.GO_TO_POSITIONS}</Link>}
          style={{ marginBottom: token.margin }}
        />
      )}

      {teacherSelected && (
        <Alert
          type="info"
          showIcon
          message={MSG_MEM.TEACHER_SECTION_HINT}
          style={{ marginBottom: token.margin }}
        />
      )}

      <Form form={form} layout="vertical" requiredMark={false} onFinish={handleFinish}>
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
            {allowManagerRole && <Radio value="MANAGER">Quản lý phòng ban</Radio>}
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

        {teacherSelected && (
          <>
            <Divider orientation="left" plain>
              {MSG_MEM.TEACHER_SECTION}
            </Divider>
            <Form.Item
              label={MSG_MEM.FULL_NAME}
              name="fullName"
              rules={[
                { required: true, message: MSG_MEM.FULL_NAME_REQUIRED },
                { max: 200, message: MSG_MEM.FULL_NAME_TOO_LONG },
              ]}
            >
              <Input autoComplete="off" />
            </Form.Item>
            <Form.Item
              label={MSG_MEM.PHONE}
              name="phone"
              rules={[
                { required: true, message: MSG_MEM.PHONE_REQUIRED },
                { max: 30, message: MSG_MEM.PHONE_TOO_LONG },
              ]}
            >
              <Input autoComplete="off" />
            </Form.Item>
            <Form.Item label={MSG_MEM.STAFF_CODE} name="staffCode" extra={MSG_MEM.STAFF_CODE_HINT}>
              <Input autoComplete="off" placeholder="GV001" />
            </Form.Item>
            <Form.Item
              label={MSG_MEM.SPECIALTIES}
              name="specialtyIds"
              rules={[
                { required: true, type: 'array', min: 1, message: MSG_MEM.SPECIALTIES_REQUIRED },
              ]}
            >
              <Select
                mode="multiple"
                options={specialties.map((s) => ({ value: s.id, label: s.name }))}
                placeholder={MSG_MEM.SPECIALTIES_PLACEHOLDER}
              />
            </Form.Item>
            <Form.Item label={MSG_MEM.CONTRACT_TYPE} name="contractType">
              <Select
                allowClear
                placeholder={MSG_MEM.CONTRACT_TYPE_PLACEHOLDER}
                options={Object.entries(CONTRACT_TYPE_LABEL).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
}
