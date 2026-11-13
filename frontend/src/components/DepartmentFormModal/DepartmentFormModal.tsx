import { Alert, Form, Input, Modal, Select, theme } from 'antd';
import { useEffect } from 'react';
import type { ModuleCatalogItem } from '../../features/modules/moduleApi';
import { MSG_DEPT, MSG_OWNER } from '../../features/owner/ownerMessages';
import type { Department, DepartmentPayload } from '../../features/owner/types';

interface DepartmentFormValues {
  name: string;
  description?: string;
  moduleCodes: string[];
}

interface DepartmentFormModalProps {
  open: boolean;
  /** `null` = tạo mới; có giá trị = sửa phòng ban đó. */
  department: Department | null;
  /** Danh mục module lấy từ `GET /api/v1/modules`. */
  moduleOptions: ModuleCatalogItem[];
  /** Đang gửi yêu cầu → khoá nút xác nhận. */
  submitting: boolean;
  /** Lỗi BE đã dịch sang tiếng Việt — hiện trong modal, không dùng toast. */
  error?: string | null;
  onCancel: () => void;
  onSubmit: (values: DepartmentPayload) => void;
}

/**
 * Modal tạo / sửa phòng ban — `POST /departments`, `PUT /departments/{id}`.
 *
 * Validate ở FE chỉ để UX; `DepartmentRequest` của BE (name ≤200, description
 * ≤1000, `moduleCodes` không null) mới là chốt cuối.
 */
export default function DepartmentFormModal({
  open,
  department,
  moduleOptions,
  submitting,
  error,
  onCancel,
  onSubmit,
}: DepartmentFormModalProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<DepartmentFormValues>();
  const isEditing = department !== null;

  useEffect(() => {
    if (!open) {
      return;
    }
    if (department) {
      form.setFieldsValue({
        name: department.name,
        description: department.description ?? '',
        moduleCodes: department.modules ?? [],
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ moduleCodes: [] });
    }
  }, [open, department, form]);

  return (
    <Modal
      open={open}
      title={isEditing ? MSG_DEPT.EDIT : MSG_DEPT.CREATE}
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
            moduleCodes: values.moduleCodes ?? [],
          })
        }
      >
        <Form.Item
          label={MSG_DEPT.NAME}
          name="name"
          rules={[
            { required: true, whitespace: true, message: MSG_DEPT.NAME_REQUIRED },
            { max: 200, message: MSG_DEPT.NAME_TOO_LONG },
          ]}
        >
          <Input autoComplete="off" placeholder="Ví dụ: Khoa Công nghệ thông tin" />
        </Form.Item>

        <Form.Item
          label={MSG_DEPT.DESCRIPTION}
          name="description"
          rules={[{ max: 1000, message: MSG_DEPT.DESCRIPTION_TOO_LONG }]}
        >
          <Input.TextArea rows={3} maxLength={1000} showCount />
        </Form.Item>

        <Form.Item label={MSG_DEPT.MODULES} name="moduleCodes">
          <Select
            mode="multiple"
            allowClear
            options={moduleOptions.map((m) => ({ value: m.code, label: `${m.code} — ${m.name}` }))}
            placeholder="Chọn module phòng ban phụ trách (có thể bỏ trống)"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
