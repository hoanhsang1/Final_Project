import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
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
import dayjs from 'dayjs';
import { useState } from 'react';
import {
  createStudent,
  deleteStudent,
  fetchStudents,
  updateStudent,
} from '../../features/organization/organizationPortalApi';
import type {
  StudentItem,
  StudentUpdatePayload,
} from '../../features/organization/types';
import { useAuthStore } from '../../stores/authStore';

const { Title, Text } = Typography;

export default function StudentManagementPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const isOwner = backendRoles.includes('OWNER') || backendRoles.includes('ORG_OWNER');

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // Form modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['students', page, size, searchTerm, statusFilter],
    queryFn: () =>
      fetchStudents({
        page,
        size,
        q: searchTerm || undefined,
        status: statusFilter,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      message.success('Thêm sinh viên thành công');
      setModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: Error) => {
      message.error(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: StudentUpdatePayload }) =>
      updateStudent(id, payload),
    onSuccess: () => {
      message.success('Cập nhật sinh viên thành công');
      setModalOpen(false);
      setEditingStudent(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: Error) => {
      message.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      message.success('Đã xóa sinh viên');
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: Error) => {
      message.error(err.message);
    },
  });

  const handleOpenCreate = () => {
    setEditingStudent(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active' });
    setModalOpen(true);
  };

  const handleOpenEdit = (student: StudentItem) => {
    setEditingStudent(student);
    form.setFieldsValue({
      studentCode: student.studentCode,
      fullName: student.fullName,
      dateOfBirth: student.dateOfBirth ? dayjs(student.dateOfBirth) : null,
      email: student.email,
      phone: student.phone,
      status: student.status,
    });
    setModalOpen(true);
  };

  const handleDelete = (student: StudentItem) => {
    modal.confirm({
      title: 'Xóa sinh viên',
      content: `Bạn có chắc muốn xóa sinh viên ${student.fullName} (${student.studentCode})? Sinh viên sẽ được xóa mềm và gỡ khỏi lớp học.`,
      okText: 'Xác nhận xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: () => deleteMutation.mutate(student.id),
    });
  };

  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      const dob = values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null;

      if (editingStudent) {
        updateMutation.mutate({
          id: editingStudent.id,
          payload: {
            fullName: values.fullName,
            dateOfBirth: dob,
            email: values.email,
            phone: values.phone,
            status: values.status,
          },
        });
      } else {
        createMutation.mutate({
          studentCode: values.studentCode,
          fullName: values.fullName,
          dateOfBirth: dob,
          email: values.email,
          phone: values.phone,
          status: values.status,
        });
      }
    } catch {
      // Form validation failed
    }
  };

  const columns: ColumnsType<StudentItem> = [
    {
      title: 'Mã SV',
      dataIndex: 'studentCode',
      key: 'studentCode',
      width: 130,
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      key: 'fullName',
    },
    {
      title: 'Ngày sinh',
      dataIndex: 'dateOfBirth',
      key: 'dateOfBirth',
      width: 120,
      render: (dob) => (dob ? dayjs(dob).format('DD/MM/YYYY') : '—'),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => email || '—',
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (phone) => phone || '—',
    },
    {
      title: 'Lớp học',
      key: 'class',
      width: 160,
      render: (_, record) =>
        record.classCode ? (
          <Tag color="cyan">
            {record.classCode} {record.className ? `(${record.className})` : ''}
          </Tag>
        ) : (
          <Tag color="default">Chưa xếp lớp</Tag>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status) => {
        if (status === 'active') return <Tag color="success">Hoạt động</Tag>;
        if (status === 'inactive') return <Tag color="warning">Nghỉ học</Tag>;
        return <Tag color="error">Đình chỉ</Tag>;
      },
    },
    ...(!isOwner
      ? [
          {
            title: 'Thao tác',
            key: 'actions',
            width: 150,
            render: (_: unknown, record: StudentItem) => (
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
        ]
      : []),
  ];

  return (
    <div>
      {isOwner && (
        <Alert
          type="info"
          showIcon
          message="Chế độ xem Quản trị viên (Read-only)"
          description="Chủ tổ chức xem dữ liệu tổng quan sinh viên của trường. Việc thêm mới, cập nhật hồ sơ và xóa sinh viên do Nhân viên phòng Đào tạo (STAFF) phụ trách."
          style={{ marginBottom: 16 }}
        />
      )}

      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Quản lý Sinh viên
          </Title>
          <Text type="secondary">
            {isOwner
              ? 'Theo dõi danh sách sinh viên thuộc các khoa/lớp trong tổ chức'
              : 'Tiếp nhận hồ sơ, chỉnh sửa thông tin và theo dõi tình trạng học tập của sinh viên'}
          </Text>
        </div>
        {!isOwner && (
          <Button type="primary" onClick={handleOpenCreate}>
            + Thêm sinh viên
          </Button>
        )}
      </Flex>

      <Card style={{ marginBottom: 16 }}>
        <Flex gap="middle" wrap="wrap">
          <Input.Search
            placeholder="Tìm theo mã hoặc tên sinh viên..."
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
              { label: 'Hoạt động', value: 'active' },
              { label: 'Nghỉ học', value: 'inactive' },
              { label: 'Đình chỉ', value: 'suspended' },
            ]}
          />
        </Flex>
      </Card>

      <Card>
        <Table<StudentItem>
          rowKey="id"
          columns={columns}
          dataSource={Array.isArray(data?.items) ? data.items : []}
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
        title={editingStudent ? 'Cập nhật sinh viên' : 'Thêm sinh viên mới'}
        open={modalOpen}
        onOk={handleFormSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Mã sinh viên"
            name="studentCode"
            rules={[{ required: true, message: 'Vui lòng nhập mã sinh viên' }]}
          >
            <Input placeholder="Ví dụ: SV2026001" disabled={!!editingStudent} />
          </Form.Item>

          <Form.Item
            label="Họ và tên"
            name="fullName"
            rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
          >
            <Input placeholder="Ví dụ: Nguyễn Văn A" />
          </Form.Item>

          <Form.Item label="Ngày sinh" name="dateOfBirth">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày sinh" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
          >
            <Input placeholder="Ví dụ: nguyenvana@example.com" />
          </Form.Item>

          <Form.Item label="Số điện thoại" name="phone">
            <Input placeholder="Ví dụ: 0912345678" />
          </Form.Item>

          <Form.Item label="Trạng thái" name="status" initialValue="active">
            <Select
              options={[
                { label: 'Hoạt động', value: 'active' },
                { label: 'Nghỉ học', value: 'inactive' },
                { label: 'Đình chỉ', value: 'suspended' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

