import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Flex,
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
import { useNavigate, useParams } from 'react-router-dom';
import {
  enrollStudentInClass,
  fetchClassDetail,
  fetchClassStudents,
  fetchStudents,
  removeStudentFromClass,
} from '../../features/organization/organizationPortalApi';
import type { StudentItem } from '../../features/organization/types';
import { useAuthStore } from '../../stores/authStore';

const { Title, Text } = Typography;

export default function ClassDetailPage() {
  const { id: classId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const isOwner = backendRoles.includes('OWNER') || backendRoles.includes('ORG_OWNER');

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Lấy chi tiết lớp học
  const { data: classDetail, isLoading: isClassLoading } = useQuery({
    queryKey: ['classDetail', classId],
    queryFn: () => fetchClassDetail(classId!),
    enabled: !!classId,
  });

  // Lấy danh sách SV trong lớp
  const { data: classStudents, isLoading: isStudentsLoading } = useQuery({
    queryKey: ['classStudents', classId],
    queryFn: () => fetchClassStudents(classId!),
    enabled: !!classId,
  });

  // Lấy danh sách tất cả SV trong trường để xếp vào lớp
  const { data: allStudents } = useQuery({
    queryKey: ['allStudentsForEnrollment'],
    queryFn: () => fetchStudents({ page: 1, size: 100 }),
    enabled: addModalOpen,
  });

  const enrollMutation = useMutation({
    mutationFn: (studentId: string) => enrollStudentInClass(classId!, studentId),
    onSuccess: () => {
      message.success('Đã thêm sinh viên vào lớp');
      setAddModalOpen(false);
      setSelectedStudentId(null);
      queryClient.invalidateQueries({ queryKey: ['classStudents', classId] });
      queryClient.invalidateQueries({ queryKey: ['classDetail', classId] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (err: Error) => {
      message.error(err.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (studentId: string) => removeStudentFromClass(classId!, studentId),
    onSuccess: () => {
      message.success('Đã gỡ sinh viên khỏi lớp');
      queryClient.invalidateQueries({ queryKey: ['classStudents', classId] });
      queryClient.invalidateQueries({ queryKey: ['classDetail', classId] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (err: Error) => {
      message.error(err.message);
    },
  });

  const handleRemove = (student: StudentItem) => {
    modal.confirm({
      title: 'Gỡ sinh viên khỏi lớp',
      content: `Bạn có chắc muốn gỡ sinh viên ${student.fullName} khỏi lớp này?`,
      okText: 'Gỡ khỏi lớp',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: () => removeMutation.mutate(student.id),
    });
  };

  const handleEnrollSubmit = () => {
    if (!selectedStudentId) {
      message.warning('Vui lòng chọn một sinh viên');
      return;
    }
    enrollMutation.mutate(selectedStudentId);
  };

  const columns: ColumnsType<StudentItem> = [
    {
      title: 'Mã SV',
      dataIndex: 'studentCode',
      key: 'studentCode',
      width: 140,
      render: (code) => <strong>{code}</strong>,
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
      width: 130,
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
      width: 140,
      render: (phone) => phone || '—',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={status === 'active' ? 'success' : 'warning'}>
          {status === 'active' ? 'Đang học' : status}
        </Tag>
      ),
    },
    ...(!isOwner
      ? [
          {
            title: 'Thao tác',
            key: 'action',
            width: 120,
            render: (_: unknown, record: StudentItem) => (
              <Button danger size="small" type="link" onClick={() => handleRemove(record)}>
                Gỡ khỏi lớp
              </Button>
            ),
          },
        ]
      : []),
  ];

  // Lọc danh sách sinh viên chưa thuộc lớp này
  const enrolledStudentIds = new Set(classStudents?.map((s) => s.id) ?? []);
  const availableStudents = allStudents?.items.filter((s) => !enrolledStudentIds.has(s.id)) ?? [];

  return (
    <div>
      {isOwner && (
        <Alert
          type="info"
          showIcon
          message="Chế độ xem Quản trị viên (Read-only)"
          description="Chủ tổ chức theo dõi danh sách sinh viên đã được phân vào lớp. Thao tác xếp sinh viên vào lớp hoặc gỡ sinh viên do Nhân viên phòng Đào tạo (STAFF) phụ trách."
          style={{ marginBottom: 16 }}
        />
      )}

      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Space align="center">
          <Button onClick={() => navigate('/to-chuc/lop-hoc')}>← Quay lại</Button>
          <Title level={3} style={{ margin: 0 }}>
            Chi tiết lớp: {classDetail?.name}
          </Title>
        </Space>
        {!isOwner && (
          <Button type="primary" onClick={() => setAddModalOpen(true)}>
            + Xếp sinh viên vào lớp
          </Button>
        )}
      </Flex>

      <Card style={{ marginBottom: 20 }} loading={isClassLoading}>
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 4 }}>
          <Descriptions.Item label="Mã lớp">
            <strong>{classDetail?.classCode}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="Tên lớp">{classDetail?.name}</Descriptions.Item>
          <Descriptions.Item label="Niên khóa">{classDetail?.academicYear || '—'}</Descriptions.Item>
          <Descriptions.Item label="Sĩ số">{classStudents?.length ?? 0} sinh viên</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Danh sách sinh viên trong lớp">
        <Table<StudentItem>
          rowKey="id"
          columns={columns}
          dataSource={Array.isArray(classStudents) ? classStudents : []}
          loading={isStudentsLoading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title="Xếp sinh viên vào lớp học"
        open={addModalOpen}
        onOk={handleEnrollSubmit}
        onCancel={() => {
          setAddModalOpen(false);
          setSelectedStudentId(null);
        }}
        confirmLoading={enrollMutation.isPending}
      >
        <div style={{ marginBlock: 16 }}>
          <Text style={{ display: 'block', marginBottom: 8 }}>
            Chọn sinh viên từ danh sách của tổ chức:
          </Text>
          <Select
            showSearch
            style={{ width: '100%' }}
            placeholder="Tìm theo mã hoặc tên sinh viên..."
            value={selectedStudentId}
            onChange={(val) => setSelectedStudentId(val)}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={availableStudents.map((s) => ({
              value: s.id,
              label: `${s.studentCode} - ${s.fullName} ${
                s.classCode ? `(Đang ở lớp: ${s.classCode})` : '(Chưa có lớp)'
              }`,
            }))}
          />
        </div>
      </Modal>
    </div>
  );
}

