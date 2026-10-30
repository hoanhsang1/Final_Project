import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Card,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createClass,
  deleteClass,
  fetchClasses,
  updateClass,
} from '../../features/organization/organizationPortalApi';
import type {
  SchoolClassItem,
  SchoolClassUpdatePayload,
} from '../../features/organization/types';
import { useAuthStore } from '../../stores/authStore';

const { Title, Text } = Typography;

export default function ClassManagementPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const isOwner = backendRoles.includes('OWNER') || backendRoles.includes('ORG_OWNER');

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClassItem | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['classes', page, size, searchTerm, statusFilter],
    queryFn: () =>
      fetchClasses({
        page,
        size,
        q: searchTerm || undefined,
        status: statusFilter,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createClass,
    onSuccess: () => {
      message.success('Tạo lớp học thành công');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (err: Error) => {
      message.error(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SchoolClassUpdatePayload }) =>
      updateClass(id, payload),
    onSuccess: () => {
      message.success('Cập nhật lớp học thành công');
      setModalOpen(false);
      setEditingClass(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (err: Error) => {
      message.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClass,
    onSuccess: () => {
      message.success('Đã xóa lớp học');
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (err: Error) => {
      message.error(err.message);
    },
  });

  const handleOpenCreate = () => {
    setEditingClass(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active' });
    setModalOpen(true);
  };

  const handleOpenEdit = (cls: SchoolClassItem) => {
    setEditingClass(cls);
    form.setFieldsValue({
      classCode: cls.classCode,
      name: cls.name,
      academicYear: cls.academicYear,
      status: cls.status,
    });
    setModalOpen(true);
  };

  const handleDelete = (cls: SchoolClassItem) => {
    if (cls.studentCount > 0) {
      modal.error({
        title: 'Không thể xóa lớp học',
        content: `Lớp ${cls.name} hiện đang có ${cls.studentCount} sinh viên. Bạn phải gỡ hết sinh viên khỏi lớp trước khi xóa.`,
      });
      return;
    }

    modal.confirm({
      title: 'Xóa lớp học',
      content: `Bạn có chắc muốn xóa lớp ${cls.name} (${cls.classCode})?`,
      okText: 'Xác nhận xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: () => deleteMutation.mutate(cls.id),
    });
  };

  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingClass) {
        updateMutation.mutate({
          id: editingClass.id,
          payload: {
            name: values.name,
            academicYear: values.academicYear,
            status: values.status,
          },
        });
      } else {
        createMutation.mutate({
          classCode: values.classCode,
          name: values.name,
          academicYear: values.academicYear,
          status: values.status,
        });
      }
    } catch {
      // validation failed
    }
  };

  const columns: ColumnsType<SchoolClassItem> = [
    {
      title: 'Mã lớp',
      dataIndex: 'classCode',
      key: 'classCode',
      width: 140,
      render: (code) => <strong>{code}</strong>,
    },
    {
      title: 'Tên lớp học',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Niên khóa',
      dataIndex: 'academicYear',
      key: 'academicYear',
      width: 140,
      render: (year) => year || '—',
    },
    {
      title: 'Số sinh viên',
      dataIndex: 'studentCount',
      key: 'studentCount',
      width: 120,
      render: (count) => <Tag color={count > 0 ? 'blue' : 'default'}>{count} SV</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        if (status === 'active') return <Tag color="success">Đang mở</Tag>;
        if (status === 'inactive') return <Tag color="warning">Tạm khóa</Tag>;
        return <Tag color="default">Lưu trữ</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: isOwner ? 140 : 220,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            onClick={() => navigate(`/to-chuc/lop-hoc/${record.id}`)}
          >
            Danh sách SV
          </Button>
          {!isOwner && (
            <>
              <Button type="link" size="small" onClick={() => handleOpenEdit(record)}>
                Sửa
              </Button>
              <Button type="link" danger size="small" onClick={() => handleDelete(record)}>
                Xóa
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {isOwner && (
        <Alert
          type="info"
          showIcon
          message="Chế độ xem Quản trị viên (Read-only)"
          description="Chủ tổ chức theo dõi danh sách lớp học và số lượng sinh viên. Việc tạo lớp, sửa đổi hoặc xóa lớp do Nhân viên phòng Đào tạo (STAFF) phụ trách."
          style={{ marginBottom: 16 }}
        />
      )}

      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Quản lý Lớp học
          </Title>
          <Text type="secondary">
            {isOwner
              ? 'Theo dõi danh sách các lớp học và sĩ số sinh viên'
              : 'Tổ chức các lớp học theo niên khóa và phân bổ sinh viên vào lớp'}
          </Text>
        </div>
        {!isOwner && (
          <Button type="primary" onClick={handleOpenCreate}>
            + Thêm lớp học
          </Button>
        )}
      </Flex>

      <Card style={{ marginBottom: 16 }}>
        <Flex gap="middle" wrap="wrap">
          <Input.Search
            placeholder="Tìm theo mã hoặc tên lớp..."
            allowClear
            onSearch={(value) => {
              setSearchTerm(value);
              setPage(1);
            }}
            style={{ width: 300 }}
          />
          <Select
            placeholder="Lọc theo trạng thái"
            allowClear
            style={{ width: 180 }}
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            options={[
              { label: 'Đang mở', value: 'active' },
              { label: 'Tạm khóa', value: 'inactive' },
              { label: 'Lưu trữ', value: 'archived' },
            ]}
          />
        </Flex>
      </Card>

      <Card>
        <Table<SchoolClassItem>
          rowKey="id"
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: size,
            total: data?.total ?? 0,
            showSizeChanger: true,
            onChange: (p, s) => {
              setPage(p);
              setSize(s);
            },
          }}
        />
      </Card>

      <Modal
        title={editingClass ? 'Cập nhật lớp học' : 'Thêm lớp học mới'}
        open={modalOpen}
        onOk={handleFormSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Mã lớp học"
            name="classCode"
            rules={[{ required: true, message: 'Vui lòng nhập mã lớp học' }]}
          >
            <Input placeholder="Ví dụ: CNTT-K18A" disabled={!!editingClass} />
          </Form.Item>

          <Form.Item
            label="Tên lớp học"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên lớp học' }]}
          >
            <Input placeholder="Ví dụ: Công nghệ thông tin K18 Lớp A" />
          </Form.Item>

          <Form.Item label="Niên khóa" name="academicYear">
            <Input placeholder="Ví dụ: 2024-2028" />
          </Form.Item>

          <Form.Item label="Trạng thái" name="status" initialValue="active">
            <Select
              options={[
                { label: 'Đang mở', value: 'active' },
                { label: 'Tạm khóa', value: 'inactive' },
                { label: 'Lưu trữ', value: 'archived' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

