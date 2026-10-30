import {
  Alert,
  App,
  Button,
  Card,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import {
  createDepartmentMember,
  fetchDepartmentMembers,
  fetchDepartments,
  fetchPositions,
  removeDepartmentMember,
  updateDepartmentMemberPositions,
} from '../../features/organization/organizationPortalApi';
import type {
  CreateMemberPayload,
  CreatedMemberResult,
  DepartmentItem,
  DepartmentMemberItem,
  PositionItem,
} from '../../features/organization/types';
import { useAuthStore } from '../../stores/authStore';

const { Title, Text, Paragraph } = Typography;

export default function MemberManagementPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const backendRoles = useAuthStore((s) => s.backendRoles);
  const isOwner = backendRoles.includes('OWNER') || backendRoles.includes('ORG_OWNER');

  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [positionModalOpen, setPositionModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<DepartmentMemberItem | null>(null);

  const [createForm] = Form.useForm<CreateMemberPayload>();
  const [positionForm] = Form.useForm<{ positionIds: string[] }>();

  // Danh sách phòng ban
  const { data: departments = [], isLoading: isLoadingDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  });

  // Tự động chọn phòng ban đầu tiên nếu chưa chọn
  useEffect(() => {
    if (!selectedDeptId && departments.length > 0) {
      setSelectedDeptId(departments[0].id);
    }
  }, [departments, selectedDeptId]);

  // Danh sách chức vụ
  const { data: positions = [] } = useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
  });

  // Danh sách nhân sự trong phòng ban đã chọn
  const { data: members = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ['department-members', selectedDeptId],
    queryFn: () => fetchDepartmentMembers(selectedDeptId),
    enabled: !!selectedDeptId,
  });

  const positionMap = new Map<string, string>();
  positions.forEach((p) => positionMap.set(p.id, p.name));

  // Mutation tạo thành viên
  const createMutation = useMutation({
    mutationFn: (values: CreateMemberPayload) =>
      createDepartmentMember(selectedDeptId, values),
    onSuccess: (result: CreatedMemberResult) => {
      queryClient.invalidateQueries({ queryKey: ['department-members', selectedDeptId] });
      setCreateModalOpen(false);
      createForm.resetFields();

      // Hiển thị modal mật khẩu tạm cho người dùng
      modal.success({
        title: 'Bổ nhiệm thành viên thành công!',
        content: (
          <div>
            <Paragraph>
              Thành viên <strong>{result.member.userId}</strong> đã được thêm vào phòng ban với vai trò{' '}
              <Tag color={result.member.role === 'MANAGER' ? 'purple' : 'green'}>
                {result.member.role === 'MANAGER' ? 'Trưởng phòng (MANAGER)' : 'Nhân viên (STAFF)'}
              </Tag>
              .
            </Paragraph>
            {result.temporaryPassword && (
              <Alert
                type="warning"
                message="Mật khẩu tạm thời"
                description={
                  <div>
                    <Paragraph copyable style={{ fontSize: 16, fontWeight: 'bold', margin: '8px 0' }}>
                      {result.temporaryPassword}
                    </Paragraph>
                    <Text type="secondary">
                      Vui lòng sao chép và gửi mật khẩu này cho thành viên. Người dùng sẽ phải đổi mật khẩu trong lần đăng nhập đầu tiên.
                    </Text>
                  </div>
                }
              />
            )}
          </div>
        ),
      });
    },
    onError: (err: Error) => {
      message.error(err.message || 'Không thể bổ nhiệm thành viên.');
    },
  });

  // Mutation cập nhật chức vụ
  const updatePositionsMutation = useMutation({
    mutationFn: (values: { positionIds: string[] }) => {
      if (!editingMember) throw new Error('Không tìm thấy thành viên');
      return updateDepartmentMemberPositions(selectedDeptId, editingMember.userId, values.positionIds);
    },
    onSuccess: () => {
      message.success('Cập nhật chức vụ thành công.');
      queryClient.invalidateQueries({ queryKey: ['department-members', selectedDeptId] });
      setPositionModalOpen(false);
      setEditingMember(null);
    },
    onError: (err: Error) => {
      message.error(err.message || 'Không thể cập nhật chức vụ.');
    },
  });

  // Mutation xóa thành viên
  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeDepartmentMember(selectedDeptId, userId),
    onSuccess: () => {
      message.success('Đã gỡ thành viên khỏi phòng ban.');
      queryClient.invalidateQueries({ queryKey: ['department-members', selectedDeptId] });
    },
    onError: (err: Error) => {
      message.error(err.message || 'Không thể gỡ thành viên.');
    },
  });

  const handleOpenPositionsModal = (member: DepartmentMemberItem) => {
    setEditingMember(member);
    positionForm.setFieldsValue({ positionIds: member.positionIds || [] });
    setPositionModalOpen(true);
  };

  const currentDept = departments.find((d: DepartmentItem) => d.id === selectedDeptId);

  const columns: ColumnsType<DepartmentMemberItem> = [
    {
      title: 'Tài khoản (Username)',
      dataIndex: 'userId',
      key: 'userId',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: 160,
      render: (role: string) =>
        role === 'MANAGER' ? (
          <Tag color="purple">Trưởng phòng (MANAGER)</Tag>
        ) : (
          <Tag color="green">Nhân viên (STAFF)</Tag>
        ),
    },
    {
      title: 'Chức vụ đảm nhiệm',
      dataIndex: 'positionIds',
      key: 'positionIds',
      render: (posIds: string[]) => (
        <Space wrap size={[4, 4]}>
          {posIds && posIds.length > 0 ? (
            posIds.map((id) => (
              <Tag key={id} color="geekblue">
                {positionMap.get(id) || id}
              </Tag>
            ))
          ) : (
            <Text type="secondary">Chưa gán chức vụ</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Quyền hiệu lực',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (perms: string[]) => (
        <Space wrap size={[2, 2]}>
          {perms && perms.length > 0 ? (
            perms.map((p) => {
              const isStudent = p.startsWith('STUDENT_') || p.startsWith('CLASS_');
              return (
                <Tag color={isStudent ? 'success' : 'default'} key={p} style={{ fontSize: 11 }}>
                  {p}
                </Tag>
              );
            })
          ) : (
            <Text type="secondary">Không có quyền trong module phòng</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Ngày bổ nhiệm',
      dataIndex: 'appointedAt',
      key: 'appointedAt',
      width: 140,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '—'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => handleOpenPositionsModal(record)}>
            Đổi chức vụ
          </Button>
          <Popconfirm
            title="Gỡ khỏi phòng ban"
            description="Bạn có chắc chắn muốn gỡ thành viên này khỏi phòng không?"
            okText="Gỡ"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => removeMutation.mutate(record.userId)}
          >
            <Button type="link" danger loading={removeMutation.isPending}>
              Gỡ
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            {isOwner ? 'Bổ nhiệm & Quản lý Nhân sự' : 'Nhân sự Phòng ban'}
          </Title>
          <Text type="secondary">
            {isOwner
              ? 'Chủ tổ chức bổ nhiệm Trưởng phòng (MANAGER) hoặc Nhân viên và phân công chức vụ theo từng phòng ban'
              : 'Trưởng phòng quản lý và phân công chức vụ cho các nhân viên trong phòng'}
          </Text>
        </div>

        <Button
          type="primary"
          disabled={!selectedDeptId}
          onClick={() => {
            createForm.resetFields();
            createForm.setFieldsValue({
              role: isOwner ? 'MANAGER' : 'STAFF',
              positionIds: [],
            });
            setCreateModalOpen(true);
          }}
        >
          + {isOwner ? 'Bổ nhiệm thành viên' : 'Thêm nhân viên'}
        </Button>
      </Flex>

      <Card style={{ marginBottom: 16 }}>
        <Flex align="center" gap={12}>
          <Text strong>Chọn Phòng ban:</Text>
          <Select
            style={{ width: 320 }}
            placeholder="Chọn phòng ban để xem nhân sự"
            value={selectedDeptId || undefined}
            onChange={(val) => setSelectedDeptId(val)}
            loading={isLoadingDepts}
            options={(Array.isArray(departments) ? departments : []).map((d: DepartmentItem) => ({
              label: `${d.name} ${d.modules && d.modules.length > 0 ? `(${d.modules.join(', ')})` : ''}`,
              value: d.id,
            }))}
          />
          {currentDept && currentDept.modules?.includes('STUDENT_MANAGEMENT') && (
            <Tag color="cyan">Phụ trách Module: STUDENT_MANAGEMENT</Tag>
          )}
        </Flex>
      </Card>

      <Card>
        <Table<DepartmentMemberItem>
          rowKey="userId"
          columns={columns}
          dataSource={Array.isArray(members) ? members : []}
          loading={isLoadingMembers}
          pagination={false}
          locale={{ emptyText: selectedDeptId ? 'Chưa có nhân sự trong phòng ban này' : 'Vui lòng chọn phòng ban' }}
        />
      </Card>

      {/* Modal Bổ nhiệm / Thêm thành viên */}
      <Modal
        title={isOwner ? 'Bổ nhiệm Thành viên mới vào Phòng ban' : 'Thêm Nhân viên mới vào Phòng ban'}
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
        destroyOnClose
      >
        <Form<CreateMemberPayload>
          form={createForm}
          layout="vertical"
          onFinish={(vals) => createMutation.mutate(vals)}
        >
          <Form.Item
            label="Tên đăng nhập (Username)"
            name="username"
            rules={[
              { required: true, message: 'Vui lòng nhập tên đăng nhập' },
              { max: 100, message: 'Tối đa 100 ký tự' },
            ]}
          >
            <Input placeholder="Ví dụ: van.tran, nghia.ledai" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input placeholder="Ví dụ: vantran@mems.edu.vn" />
          </Form.Item>

          <Form.Item
            label="Vai trò"
            name="role"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select
              options={
                isOwner
                  ? [
                      { label: 'Trưởng phòng (MANAGER)', value: 'MANAGER' },
                      { label: 'Nhân viên (STAFF)', value: 'STAFF' },
                    ]
                  : [{ label: 'Nhân viên (STAFF)', value: 'STAFF' }]
              }
            />
          </Form.Item>

          <Form.Item
            label="Chức vụ đảm nhiệm"
            name="positionIds"
            rules={[{ required: true, message: 'Vui lòng chọn ít nhất một chức vụ' }]}
          >
            <Select
              mode="multiple"
              placeholder="Chọn chức vụ"
              options={positions.map((p: PositionItem) => ({
                label: `${p.name} (${p.permissions?.length ?? 0} quyền)`,
                value: p.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Đổi Chức vụ */}
      <Modal
        title={`Cập nhật Chức vụ cho: ${editingMember?.userId}`}
        open={positionModalOpen}
        onCancel={() => setPositionModalOpen(false)}
        onOk={() => positionForm.submit()}
        confirmLoading={updatePositionsMutation.isPending}
        destroyOnClose
      >
        <Form<{ positionIds: string[] }>
          form={positionForm}
          layout="vertical"
          onFinish={(vals) => updatePositionsMutation.mutate(vals)}
        >
          <Form.Item
            label="Danh sách chức vụ"
            name="positionIds"
            rules={[{ required: true, message: 'Vui lòng chọn ít nhất một chức vụ' }]}
          >
            <Select
              mode="multiple"
              placeholder="Chọn chức vụ"
              options={positions.map((p: PositionItem) => ({
                label: `${p.name} (${p.permissions?.length ?? 0} quyền)`,
                value: p.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

