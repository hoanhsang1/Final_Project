import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import { useNotify } from '../../components/LiveAnnouncer/LiveAnnouncer';
import PageHeader from '../../components/PageHeader/PageHeader';
import { canEditTeachers, canViewTeachers, isOwnerRole } from '../../features/auth/permissions';
import {
  CONTRACT_TYPE_LABEL,
  TEACHING_STATUS_LABEL,
  TEACHING_STATUS_TAG,
  labelOf,
} from '../../features/sprint4/labels';
import { MSG_S4, MSG_TEACHER } from '../../features/sprint4/sprint4Messages';
import {
  createSpecialty,
  createTeacher,
  fetchDepartments,
  fetchPositions,
  fetchSpecialties,
  fetchTeachers,
  sprint4ErrorMessage,
} from '../../features/sprint4/sprint4Api';
import type {
  ContractType,
  TeacherCreatedResponse,
  TeacherListItem,
} from '../../features/sprint4/types';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;

/** §7 — 3 trạng thái dạy. */
const TEACHING_STATUS_OPTIONS = [
  { value: 'DANG_DAY', label: TEACHING_STATUS_LABEL.DANG_DAY },
  { value: 'TAM_NGHI', label: TEACHING_STATUS_LABEL.TAM_NGHI },
  { value: 'NGHI_VIEC', label: TEACHING_STATUS_LABEL.NGHI_VIEC },
];

const CONTRACT_TYPE_OPTIONS = [
  { value: 'CO_HUU', label: CONTRACT_TYPE_LABEL.CO_HUU },
  { value: 'THINH_GIANG', label: CONTRACT_TYPE_LABEL.THINH_GIANG },
];

/** Giá trị form "Thêm giáo viên" (§4.1 + §4.4). */
interface TeacherFormValues {
  staffCode: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  departmentId: string;
  positionIds: string[];
  specialtyIds: string[];
  contractType?: ContractType;
}

/**
 * Màn 1 + 2 — danh sách giáo viên và modal tạo giáo viên.
 *
 * - Lọc theo `q`, `specialtyId`, `teachingStatus`; phân trang `page`, `size` (§3).
 * - Tạo bằng cách B `POST /api/teachers` (§4.2) và hiện modal mật khẩu tạm (§4.3).
 * - 5 state: loading / empty / error / success / không có quyền.
 */
export default function TeachersPage() {
  const { token } = theme.useToken();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const isOwner = isOwnerRole(backendRoles);
  const canView = canViewTeachers(isOwner, permissions);
  const canEdit = canEditTeachers(isOwner, permissions);

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [specialtyId, setSpecialtyId] = useState<string | undefined>();
  const [teachingStatus, setTeachingStatus] = useState<string | undefined>();

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdTeacher, setCreatedTeacher] = useState<TeacherCreatedResponse | null>(null);
  const [specOpen, setSpecOpen] = useState(false);
  const [specError, setSpecError] = useState<string | null>(null);

  const [createForm] = Form.useForm<TeacherFormValues>();
  const [specForm] = Form.useForm<{ name: string }>();

  const listQuery = useQuery({
    queryKey: ['teachers', { page, size, keyword, specialtyId, teachingStatus }],
    queryFn: () =>
      fetchTeachers({
        page,
        size,
        q: keyword || undefined,
        specialtyId,
        teachingStatus,
      }),
    enabled: canView,
  });

  const specialtiesQuery = useQuery({
    queryKey: ['specialties'],
    queryFn: fetchSpecialties,
    enabled: canView,
  });

  const positionsQuery = useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
    enabled: createOpen,
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
    enabled: createOpen,
  });

  const createMut = useMutation({
    mutationFn: createTeacher,
    onSuccess: (created) => {
      notify.success(MSG_TEACHER.CREATED);
      setCreateError(null);
      setCreateOpen(false);
      createForm.resetFields();
      // §4.3 — mật khẩu tạm chỉ hiện một lần, ngay sau khi tạo.
      setCreatedTeacher(created);
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (error) => setCreateError(sprint4ErrorMessage(error)),
  });

  const createSpecMut = useMutation({
    mutationFn: createSpecialty,
    onSuccess: () => {
      notify.success(MSG_TEACHER.SPECIALTY_CREATED);
      setSpecError(null);
      specForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['specialties'] });
    },
    onError: (error) => setSpecError(sprint4ErrorMessage(error)),
  });

  const specialties = specialtiesQuery.data ?? [];
  const specialtyOptions = specialties.map((s) => ({ value: s.id, label: s.name }));

  // §4.1 — chỉ chức vụ TEACHER mới dùng để tạo giáo viên.
  const positions = positionsQuery.data ?? [];
  const hasProfileType = positions.some((p) => !!p.profileType);
  const teacherPositions = hasProfileType
    ? positions.filter((p) => p.profileType === 'TEACHER')
    : positions;
  const positionOptions = teacherPositions.map((p) => ({ value: p.id, label: p.name }));
  const missingTeacherPosition = hasProfileType && teacherPositions.length === 0;

  const departmentOptions = (departmentsQuery.data ?? []).map((d) => ({ value: d.id, label: d.name }));

  const columns = useMemo<ColumnsType<TeacherListItem>>(() => {
    const base: ColumnsType<TeacherListItem> = [
      {
        title: 'Mã nhân sự',
        dataIndex: 'staffCode',
        width: 130,
        render: (value: string | null | undefined) => value || '—',
      },
      {
        title: 'Họ tên',
        key: 'fullName',
        render: (_, record) => (
          <Link to={`/dao-tao/giao-vien/${record.userId}`}>{record.fullName || record.userId}</Link>
        ),
      },
      {
        title: 'Email',
        dataIndex: 'email',
        width: 220,
        render: (value: string | null | undefined) => value || '—',
      },
      {
        title: 'Số điện thoại',
        dataIndex: 'phone',
        width: 150,
        render: (value: string | null | undefined) => value || '—',
      },
      {
        title: 'Chuyên môn',
        key: 'specialties',
        render: (_, record) =>
          record.specialties && record.specialties.length > 0
            ? record.specialties.map((s) => s.name).join(', ')
            : '—',
      },
      {
        title: 'Loại hợp đồng',
        dataIndex: 'contractType',
        width: 150,
        render: (value: string | null | undefined) => labelOf(CONTRACT_TYPE_LABEL, value),
      },
      {
        title: 'Trạng thái dạy',
        dataIndex: 'teachingStatus',
        width: 150,
        render: (value: string | null | undefined) =>
          value ? (
            <Tag color={TEACHING_STATUS_TAG[value]}>{labelOf(TEACHING_STATUS_LABEL, value)}</Tag>
          ) : (
            '—'
          ),
      },
      {
        title: MSG_TEACHER.COL_CLASSES,
        key: 'classes',
        width: 160,
        // §3 — server tính `noClass`/`classLabel`, FE không tự đếm lại.
        render: (_, record) =>
          record.noClass ? (
            <Text type="secondary">{record.classLabel || MSG_TEACHER.NO_CLASS}</Text>
          ) : (
            `${record.classCount ?? 0} lớp`
          ),
      },
    ];

    if (!canEdit) return base;
    return [
      ...base,
      {
        title: 'Thao tác',
        key: 'actions',
        width: 90,
        render: (_, record) => (
          <Link to={`/dao-tao/giao-vien/${record.userId}?edit=1`}>{MSG_TEACHER.EDIT}</Link>
        ),
      },
    ];
  }, [canEdit]);

  const onTableChange = (pagination: TablePaginationConfig) => {
    if (pagination.current) setPage(pagination.current);
    if (pagination.pageSize) setSize(pagination.pageSize);
  };

  const openCreate = () => {
    createForm.resetFields();
    setCreateError(null);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setCreateError(null);
    createForm.resetFields();
  };

  const openSpecialties = () => {
    specForm.resetFields();
    setSpecError(null);
    setSpecOpen(true);
  };

  const closeSpecialties = () => {
    setSpecOpen(false);
    setSpecError(null);
    specForm.resetFields();
  };

  const copyTemporaryPassword = async () => {
    if (!createdTeacher) return;
    try {
      await navigator.clipboard.writeText(createdTeacher.temporaryPassword);
      notify.success(MSG_S4.COPIED);
    } catch {
      notify.error('Không sao chép được tự động. Hãy chọn mật khẩu và sao chép thủ công.');
    }
  };

  return (
    <Flex vertical gap={token.marginMD}>
      <PageHeader
        title={MSG_TEACHER.TITLE}
        extra={
          canEdit ? (
            <Space wrap>
              <Button onClick={openSpecialties}>{MSG_TEACHER.MANAGE_SPECIALTIES}</Button>
              <Button type="primary" onClick={openCreate}>
                {MSG_TEACHER.CREATE}
              </Button>
            </Space>
          ) : undefined
        }
      >
        {canView ? (
          <Flex gap={token.marginSM} wrap="wrap" style={{ marginTop: token.marginXS }}>
            <Select
              allowClear
              aria-label={MSG_TEACHER.SPECIALTY_ALL}
              placeholder={MSG_TEACHER.SPECIALTY_ALL}
              options={specialtyOptions}
              loading={specialtiesQuery.isLoading}
              value={specialtyId}
              onChange={(value) => {
                setSpecialtyId(value);
                setPage(1);
              }}
              style={{ minWidth: 200 }}
            />
            <Select
              allowClear
              aria-label={MSG_TEACHER.STATUS_ALL}
              placeholder={MSG_TEACHER.STATUS_ALL}
              options={TEACHING_STATUS_OPTIONS}
              value={teachingStatus}
              onChange={(value) => {
                setTeachingStatus(value);
                setPage(1);
              }}
              style={{ minWidth: 200 }}
            />
            <Input.Search
              allowClear
              aria-label={MSG_TEACHER.SEARCH_LABEL}
              placeholder={MSG_TEACHER.SEARCH_LABEL}
              value={keywordInput}
              onChange={(event) => {
                const next = event.target.value;
                setKeywordInput(next);
                // Xoá nhanh: bỏ luôn điều kiện lọc thay vì phải bấm nút tìm.
                if (next === '') {
                  setKeyword('');
                  setPage(1);
                }
              }}
              onSearch={(value) => {
                setKeyword(value);
                setPage(1);
              }}
              style={{ width: 300 }}
            />
          </Flex>
        ) : null}
      </PageHeader>

      {!canView ? (
        <ForbiddenNotice />
      ) : listQuery.isError ? (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={MSG_TEACHER.LIST_LOAD_ERROR}
          description={sprint4ErrorMessage(listQuery.error)}
          action={
            <Button size="small" onClick={() => listQuery.refetch()}>
              {MSG_S4.RETRY}
            </Button>
          }
        />
      ) : (
        <Table<TeacherListItem>
          rowKey="userId"
          loading={listQuery.isLoading}
          columns={columns}
          dataSource={listQuery.data?.items ?? []}
          locale={{ emptyText: <Empty description={MSG_TEACHER.EMPTY} /> }}
          onChange={onTableChange}
          pagination={{
            current: listQuery.data?.page ?? page,
            pageSize: listQuery.data?.size ?? size,
            total: listQuery.data?.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} giáo viên`,
          }}
          scroll={{ x: 1120 }}
        />
      )}

      {/* Màn 2 — tạo giáo viên (§4). */}
      <Modal
        title={MSG_TEACHER.CREATE}
        open={createOpen}
        onCancel={closeCreate}
        onOk={() => createForm.submit()}
        okText={MSG_S4.CREATE}
        cancelText={MSG_S4.CANCEL}
        confirmLoading={createMut.isPending}
        width={720}
        forceRender
      >
        {createError && (
          <Alert
            type="error"
            showIcon
            role="alert"
            message={createError}
            style={{ marginBottom: token.margin }}
          />
        )}
        {missingTeacherPosition && (
          <Alert
            type="warning"
            showIcon
            message={MSG_TEACHER.POSITION_EMPTY_TEACHER}
            style={{ marginBottom: token.margin }}
          />
        )}

        <Form
          form={createForm}
          layout="vertical"
          requiredMark
          onFinish={(values) =>
            createMut.mutate({
              departmentId: values.departmentId,
              username: values.username.trim(),
              email: values.email.trim(),
              role: 'STAFF',
              positionIds: values.positionIds,
              staffCode: values.staffCode.trim(),
              fullName: values.fullName.trim(),
              phone: values.phone.trim(),
              teacherProfile: {
                specialtyIds: values.specialtyIds,
                contractType: values.contractType ?? null,
              },
            })
          }
        >
          <Flex gap={token.marginSM} wrap="wrap">
            <Form.Item
              name="staffCode"
              label="Mã nhân sự"
              style={{ flex: 1, minWidth: 220 }}
              rules={[
                { required: true, message: 'Vui lòng nhập mã nhân sự' },
                { max: 50, message: 'Mã nhân sự tối đa 50 ký tự' },
              ]}
            >
              <Input autoComplete="off" placeholder="VD: GV001" />
            </Form.Item>
            <Form.Item
              name="fullName"
              label="Họ tên"
              style={{ flex: 1, minWidth: 220 }}
              rules={[
                { required: true, message: 'Vui lòng nhập họ tên' },
                { max: 200, message: 'Họ tên tối đa 200 ký tự' },
              ]}
            >
              <Input autoComplete="off" placeholder="Nguyễn Văn An" />
            </Form.Item>
          </Flex>

          <Flex gap={token.marginSM} wrap="wrap">
            <Form.Item
              name="username"
              label="Tên đăng nhập"
              style={{ flex: 1, minWidth: 220 }}
              rules={[
                { required: true, message: 'Vui lòng nhập tên đăng nhập' },
                {
                  pattern: /^[a-zA-Z0-9._-]{3,100}$/,
                  message: 'Chỉ dùng chữ, số và . _ - (3–100 ký tự)',
                },
              ]}
            >
              <Input autoComplete="off" placeholder="gv.an" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              style={{ flex: 1, minWidth: 220 }}
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Email không hợp lệ' },
              ]}
            >
              <Input autoComplete="off" placeholder="an@example.edu.vn" />
            </Form.Item>
          </Flex>

          <Flex gap={token.marginSM} wrap="wrap">
            <Form.Item
              name="phone"
              label="Số điện thoại"
              style={{ flex: 1, minWidth: 220 }}
              rules={[
                { required: true, message: 'Vui lòng nhập số điện thoại' },
                { pattern: /^(\+84|0)\d{9,10}$/, message: 'Số điện thoại không hợp lệ' },
              ]}
            >
              <Input autoComplete="off" placeholder="0901234567" />
            </Form.Item>
            <Form.Item
              name="departmentId"
              label="Bộ phận"
              style={{ flex: 1, minWidth: 220 }}
              rules={[{ required: true, message: 'Vui lòng chọn bộ phận' }]}
            >
              <Select
                options={departmentOptions}
                loading={departmentsQuery.isLoading}
                placeholder="Chọn bộ phận"
              />
            </Form.Item>
          </Flex>

          <Form.Item
            name="positionIds"
            label="Chức vụ"
            rules={[
              { required: true, type: 'array', min: 1, message: 'Cần chọn chức vụ Giáo viên' },
            ]}
          >
            <Select
              mode="multiple"
              options={positionOptions}
              loading={positionsQuery.isLoading}
              placeholder="Chọn ít nhất một chức vụ Giáo viên"
            />
          </Form.Item>

          <Form.Item
            name="specialtyIds"
            label="Chuyên môn"
            rules={[
              { required: true, type: 'array', min: 1, message: MSG_TEACHER.SPECIALTY_REQUIRED },
            ]}
          >
            <Select
              mode="multiple"
              options={specialtyOptions}
              loading={specialtiesQuery.isLoading}
              placeholder="Chọn chuyên môn"
            />
          </Form.Item>

          <Form.Item name="contractType" label="Loại hợp đồng">
            <Select allowClear options={CONTRACT_TYPE_OPTIONS} placeholder="Không bắt buộc" />
          </Form.Item>

          {specialtiesQuery.isError && (
            <Alert type="warning" showIcon message={MSG_TEACHER.SPECIALTY_LOAD_ERROR} />
          )}
        </Form>
      </Modal>

      {/* §4.3 — modal mật khẩu tạm, không đóng khi bấm ra ngoài. */}
      <Modal
        title={MSG_TEACHER.TEMP_PASSWORD_TITLE}
        open={!!createdTeacher}
        onCancel={() => setCreatedTeacher(null)}
        maskClosable={false}
        // Mật khẩu tạm chỉ hiện một lần — chặn cả ESC để không mất do bấm nhầm.
        keyboard={false}
        footer={
          <Button type="primary" onClick={() => setCreatedTeacher(null)}>
            {MSG_TEACHER.TEMP_PASSWORD_DONE}
          </Button>
        }
        width={520}
      >
        {createdTeacher ? (
          <Flex vertical gap={token.marginSM}>
            <Text>
              <Text strong>{createdTeacher.fullName || '—'}</Text>
              {createdTeacher.staffCode ? ` — ${createdTeacher.staffCode}` : null}
            </Text>
            <Alert type="warning" showIcon message={MSG_TEACHER.TEMP_PASSWORD_HINT} />
            <Text strong>{MSG_TEACHER.TEMP_PASSWORD_LABEL}</Text>
            <Input
              readOnly
              aria-label={MSG_TEACHER.TEMP_PASSWORD_LABEL}
              value={createdTeacher.temporaryPassword}
              addonAfter={
                <Button size="small" onClick={copyTemporaryPassword}>
                  {MSG_S4.COPY}
                </Button>
              }
            />
          </Flex>
        ) : null}
      </Modal>

      {/* Màn 4 — danh mục chuyên môn (modal). */}
      <Modal
        title={MSG_TEACHER.MANAGE_SPECIALTIES}
        open={specOpen}
        onCancel={closeSpecialties}
        footer={null}
        forceRender
      >
        <Flex vertical gap={token.marginSM}>
          {specError && <Alert type="error" showIcon role="alert" message={specError} />}
          <Form form={specForm} layout="inline" onFinish={(values) => createSpecMut.mutate(values.name)}>
            <Form.Item
              name="name"
              rules={[{ required: true, message: 'Nhập tên chuyên môn' }]}
              style={{ flex: 1, minWidth: 200 }}
            >
              <Input aria-label={MSG_TEACHER.SPECIALTY_PLACEHOLDER} placeholder={MSG_TEACHER.SPECIALTY_PLACEHOLDER} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={createSpecMut.isPending}>
                Thêm
              </Button>
            </Form.Item>
          </Form>

          {specialtiesQuery.isLoading ? (
            <Text type="secondary">{MSG_S4.LOADING}</Text>
          ) : specialtiesQuery.isError ? (
            <Alert type="error" showIcon message={MSG_TEACHER.SPECIALTY_LOAD_ERROR} />
          ) : specialties.length === 0 ? (
            <Empty description={MSG_TEACHER.SPECIALTY_EMPTY} />
          ) : (
            <Space wrap>
              {specialties.map((specialty) => (
                <Tag key={specialty.id}>{specialty.name}</Tag>
              ))}
            </Space>
          )}
        </Flex>
      </Modal>
    </Flex>
  );
}
