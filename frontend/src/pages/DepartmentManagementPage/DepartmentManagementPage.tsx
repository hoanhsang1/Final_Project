import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Card,
  Checkbox,
  Flex,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState } from 'react';
import {
  createDepartment,
  deleteDepartment,
  fetchDepartments,
  updateDepartment,
} from '../../features/organization/organizationPortalApi';
import type { DepartmentItem, DepartmentPayload } from '../../features/organization/types';

const { Title, Text } = Typography;

export default function DepartmentManagementPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [form] = Form.useForm();

  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  });

  const createMutation = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      message.success('Thêm phòng ban thành công');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err: Error) => {
      message.error(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DepartmentPayload }) =>
      updateDepartment(id, payload),
    onSuccess: () => {
      message.success('Cập nhật phòng ban thành công');
      setModalOpen(false);
      setEditingDept(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err: Error) => {
      message.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      message.success('Đã xóa phòng ban');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err: Error) => {
      message.error(err.message);
    },
  });

  const handleOpenCreate = () => {
    setEditingDept(null);
    form.resetFields();
    // Mặc định không chọn module để tránh gọi IdentityService validate
    // User có thể chọn module sau khi phòng ban được tạo
    form.setFieldsValue({ moduleCodes: [] });
    setModalOpen(true);
  };

  const handleOpenEdit = (dept: DepartmentItem) => {
    setEditingDept(dept);
    form.setFieldsValue({
      name: dept.name,
      description: dept.description,
      moduleCodes: dept.modules ?? [],
    });
    setModalOpen(true);
  };

  const handleDelete = (dept: DepartmentItem) => {
    modal.confirm({
      title: 'Xóa phòng ban',
      content: `Bạn có chắc muốn xóa phòng ${dept.name}?`,
      okText: 'Xác nhận xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: () => deleteMutation.mutate(dept.id),
    });
  };

  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: DepartmentPayload = {
        name: values.name,
        description: values.description,
        moduleCodes: values.moduleCodes ?? [],
      };

      if (editingDept) {
        updateMutation.mutate({ id: editingDept.id, payload });
      } else {
        createMutation.mutate(payload);
      }
    } catch {
      // validation error
    }
  };

  const columns: ColumnsType<DepartmentItem> = [
    {
      title: 'Tên phòng ban',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <strong>{name}</strong>,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (desc) => desc || '—',
    },
    {
      title: 'Module phụ trách',
      dataIndex: 'modules',
      key: 'modules',
      render: (mods: string[]) =>
        mods && mods.length > 0 ? (
          <Space wrap>
            {mods.map((m) => (
              <Tag color="geekblue" key={m}>
                {m}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">Chưa gắn module</Text>
        ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '—'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleOpenEdit(record)}>
            Sửa
          </Button>
          <Button type="link" danger size="small" onClick={() => handleDelete(record)}>
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          Quản lý Phòng ban & Module
        </Title>
        <Button type="primary" onClick={handleOpenCreate}>
          + Thêm phòng ban
        </Button>
      </Flex>

      <Card>
        <Table<DepartmentItem>
          rowKey="id"
          columns={columns}
          dataSource={Array.isArray(departments) ? departments : []}
          loading={isLoading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingDept ? 'Cập nhật phòng ban' : 'Thêm phòng ban mới'}
        open={modalOpen}
        onOk={handleFormSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Tên phòng ban"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên phòng ban' }]}
          >
            <Input placeholder="Ví dụ: Phòng Đào tạo & Quản lý Sinh viên" />
          </Form.Item>

          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={3} placeholder="Mô tả chức năng của phòng ban..." />
          </Form.Item>

          <Form.Item
            label="Module chuyên trách"
            name="moduleCodes"
            extra="Lưu ý: Chọn module yêu cầu dịch vụ xác thực nội bộ hoạt động. Nếu gặp lỗi, hãy để trống và thêm module sau."
          >
            <Checkbox.Group
              options={[
                {
                  label: 'STUDENT_MANAGEMENT (Quản lý Sinh viên & Lớp học)',
                  value: 'STUDENT_MANAGEMENT',
                },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

