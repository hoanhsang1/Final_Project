import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import {
  createPosition,
  deletePosition,
  fetchDepartments,
  fetchPermissions,
  fetchPositions,
  updatePosition,
} from '../../features/organization/organizationPortalApi';
import type {
  DepartmentItem,
  PermissionItem,
  PositionItem,
  PositionPayload,
} from '../../features/organization/types';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function PositionManagementPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<PositionItem | null>(null);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [form] = Form.useForm<PositionPayload>();

  const { data: positions = [], isLoading } = useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: fetchPermissions,
  });

  const saveMutation = useMutation({
    mutationFn: (values: PositionPayload) => {
      if (editingPosition) {
        return updatePosition(editingPosition.id, values);
      }
      return createPosition(values);
    },
    onSuccess: () => {
      message.success(editingPosition ? 'Cập nhật chức vụ thành công.' : 'Tạo chức vụ mới thành công.');
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      handleCloseModal();
    },
    onError: (err: Error) => {
      message.error(err.message || 'Không thể lưu chức vụ.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePosition,
    onSuccess: () => {
      message.success('Đã xóa chức vụ thành công.');
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
    onError: (err: Error) => {
      message.error(err.message || 'Không thể xóa chức vụ.');
    },
  });

  const handleOpenModal = (pos?: PositionItem) => {
    if (pos) {
      setEditingPosition(pos);
      setSelectedDeptIds([]);
      form.setFieldsValue({
        name: pos.name,
        description: pos.description ?? '',
        permissions: pos.permissions ?? [],
      });
    } else {
      setEditingPosition(null);
      // Mặc định chọn phòng ban đầu tiên nếu có
      if (departments.length > 0) {
        setSelectedDeptIds([departments[0].id]);
      } else {
        setSelectedDeptIds([]);
      }
      form.resetFields();
      form.setFieldsValue({ permissions: [] });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingPosition(null);
    setSelectedDeptIds([]);
    form.resetFields();
  };

  // Tính toán các module thuộc các phòng ban đã chọn
  const activeModulesFromSelectedDepts = useMemo(() => {
    if (selectedDeptIds.length === 0) return [];
    const mods = new Set<string>();
    departments
      .filter((d: DepartmentItem) => selectedDeptIds.includes(d.id))
      .forEach((d: DepartmentItem) => {
        d.modules?.forEach((m) => mods.add(m));
      });
    return Array.from(mods);
  }, [departments, selectedDeptIds]);

  // Lọc quyền hiển thị theo phòng ban được chọn:
  // Nếu chưa chọn phòng ban nào -> Hiển thị tất cả quyền
  // Nếu đã chọn phòng ban -> Hiển thị các quyền thuộc module của các phòng ban đó + quyền cơ bản
  const filteredPermissions = useMemo(() => {
    if (selectedDeptIds.length === 0) {
      return permissions;
    }
    return permissions.filter((p: PermissionItem) => {
      if (!p.moduleCode) {
        // Quyền dùng chung không phụ thuộc module
        return true;
      }
      return activeModulesFromSelectedDepts.includes(p.moduleCode);
    });
  }, [permissions, selectedDeptIds, activeModulesFromSelectedDepts]);

  const studentPermissions = useMemo(
    () =>
      filteredPermissions.filter(
        (p) => p.moduleCode === 'STUDENT_MANAGEMENT' || p.code.startsWith('STUDENT_') || p.code.startsWith('CLASS_'),
      ),
    [filteredPermissions],
  );

  const otherPermissions = useMemo(
    () => filteredPermissions.filter((p) => !studentPermissions.some((sp) => sp.code === p.code)),
    [filteredPermissions, studentPermissions],
  );

  const handleSelectAllFiltered = () => {
    const current = form.getFieldValue('permissions') || [];
    const allFilteredCodes = filteredPermissions.map((p) => p.code);
    const merged = Array.from(new Set([...current, ...allFilteredCodes]));
    form.setFieldsValue({ permissions: merged });
  };

  const handleDeselectFiltered = () => {
    const current: string[] = form.getFieldValue('permissions') || [];
    const allFilteredCodes = new Set(filteredPermissions.map((p) => p.code));
    const remaining = current.filter((code) => !allFilteredCodes.has(code));
    form.setFieldsValue({ permissions: remaining });
  };

  const columns: ColumnsType<PositionItem> = [
    {
      title: 'Tên chức vụ',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc) => desc || <Text type="secondary">—</Text>,
    },
    {
      title: 'Các quyền được gán',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (perms: string[]) => (
        <Space wrap size={[4, 4]}>
          {perms && perms.length > 0 ? (
            perms.map((p) => {
              const isStudent = p.startsWith('STUDENT_') || p.startsWith('CLASS_');
              return (
                <Tag color={isStudent ? 'green' : 'blue'} key={p}>
                  {p}
                </Tag>
              );
            })
          ) : (
            <Text type="secondary">Chưa có quyền</Text>
          )}
        </Space>
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
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => handleOpenModal(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa chức vụ"
            description="Bạn có chắc chắn muốn xóa chức vụ này không?"
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="link" danger loading={deleteMutation.isPending}>
              Xóa
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
            Quản lý Chức vụ
          </Title>
          <Text type="secondary">
            Chủ tổ chức định nghĩa các chức vụ kèm tập quyền để gán cho Trưởng phòng và Nhân viên
          </Text>
        </div>
        <Button type="primary" onClick={() => handleOpenModal()}>
          + Tạo chức vụ mới
        </Button>
      </Flex>

      <Card>
        <Table<PositionItem>
          rowKey="id"
          columns={columns}
          dataSource={Array.isArray(positions) ? positions : []}
          loading={isLoading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingPosition ? 'Cập nhật Chức vụ' : 'Tạo Chức vụ mới'}
        open={modalOpen}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        width={760}
        destroyOnClose
      >
        <Form<PositionPayload> form={form} layout="vertical" onFinish={(vals) => saveMutation.mutate(vals)}>
          <Form.Item
            label="Tên chức vụ"
            name="name"
            rules={[
              { required: true, message: 'Vui lòng nhập tên chức vụ' },
              { max: 200, message: 'Tối đa 200 ký tự' },
            ]}
          >
            <Input placeholder="Ví dụ: Trưởng phòng Đào tạo, Chuyên viên Quản lý Sinh viên" />
          </Form.Item>

          <Form.Item
            label="Mô tả"
            name="description"
            rules={[{ max: 1000, message: 'Tối đa 1000 ký tự' }]}
          >
            <TextArea rows={2} placeholder="Mô tả vai trò và trách nhiệm của chức vụ này" />
          </Form.Item>

          {/* Chọn phòng ban để lọc quyền */}
          <Card
            size="small"
            style={{ marginBottom: 16, backgroundColor: '#f9f9f9', borderColor: '#d9d9d9' }}
          >
            <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
              <Text strong>🏢 Chọn Phòng ban để hiển thị danh sách quyền tương ứng:</Text>
              <Space>
                <Button size="small" onClick={() => setSelectedDeptIds(departments.map((d: DepartmentItem) => d.id))}>
                  Chọn tất cả phòng
                </Button>
                <Button size="small" onClick={() => setSelectedDeptIds([])}>
                  Bỏ lọc (Hiện toàn bộ)
                </Button>
              </Space>
            </Flex>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Chọn 1 hoặc nhiều phòng ban (ví dụ: Phòng 1, Phòng 2...)"
              value={selectedDeptIds}
              onChange={(val) => setSelectedDeptIds(val)}
              options={departments.map((d: DepartmentItem) => ({
                label: `${d.name} ${d.modules && d.modules.length > 0 ? `[Module: ${d.modules.join(', ')}]` : '(Chưa gắn module)'}`,
                value: d.id,
              }))}
            />
            {activeModulesFromSelectedDepts.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Module phụ trách:{' '}
                </Text>
                {activeModulesFromSelectedDepts.map((m) => (
                  <Tag color="cyan" key={m} style={{ fontSize: 12 }}>
                    {m}
                  </Tag>
                ))}
              </div>
            )}
          </Card>

          <Form.Item
            label={
              <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                <span>Danh sách quyền được gán cho Chức vụ</span>
                <Space>
                  <Button type="link" size="small" onClick={handleSelectAllFiltered}>
                    Chọn tất cả quyền hiển thị
                  </Button>
                  <Button type="link" size="small" danger onClick={handleDeselectFiltered}>
                    Bỏ chọn quyền hiển thị
                  </Button>
                </Space>
              </Flex>
            }
            name="permissions"
            rules={[{ required: true, message: 'Vui lòng chọn ít nhất một quyền' }]}
          >
            <Checkbox.Group style={{ width: '100%' }}>
              {filteredPermissions.length === 0 ? (
                <Empty description="Không có quyền nào phù hợp với phòng ban đã chọn" />
              ) : (
                <>
                  {studentPermissions.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <Text strong style={{ color: '#52c41a', display: 'block', marginBottom: 8 }}>
                        📌 Quyền thuộc Module Quản lý Sinh viên & Lớp học (STUDENT_MANAGEMENT):
                      </Text>
                      <Row gutter={[12, 10]}>
                        {studentPermissions.map((perm: PermissionItem) => (
                          <Col span={12} key={perm.code}>
                            <Checkbox value={perm.code}>
                              <Text strong>{perm.code}</Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {perm.description}
                              </Text>
                            </Checkbox>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  )}

                  {otherPermissions.length > 0 && (
                    <div>
                      {studentPermissions.length > 0 && <Divider style={{ margin: '12px 0' }} />}
                      <Text strong style={{ color: '#1677ff', display: 'block', marginBottom: 8 }}>
                        ⚙️ Quyền Hệ thống & Phòng ban chung:
                      </Text>
                      <Row gutter={[12, 10]}>
                        {otherPermissions.map((perm: PermissionItem) => (
                          <Col span={12} key={perm.code}>
                            <Checkbox value={perm.code}>
                              <Text strong>{perm.code}</Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {perm.description}
                              </Text>
                            </Checkbox>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  )}
                </>
              )}
            </Checkbox.Group>
          </Form.Item>

          <Alert
            type="info"
            showIcon
            message="Cơ chế Quyền hiệu lực"
            description="Chức vụ có thể bao gồm nhiều quyền, nhưng khi gán cho nhân viên thuộc một phòng ban, chỉ các quyền phù hợp với module của phòng ban đó mới có hiệu lực hoạt động."
          />
        </Form>
      </Modal>
    </div>
  );
}
