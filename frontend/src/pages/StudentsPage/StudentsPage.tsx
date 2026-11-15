import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  DatePicker,
  Empty,
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
  theme,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import { useNotify } from '../../components/LiveAnnouncer/LiveAnnouncer';
import PageHeader from '../../components/PageHeader/PageHeader';
import {
  canCreateStudentAccount,
  canCreateStudents,
  canDeleteStudents,
  canEditStudents,
  canViewStudents,
  isOwnerRole,
} from '../../features/auth/permissions';
import {
  STUDENT_STATUS_LABEL,
  STUDENT_STATUS_TAG,
  formatDate,
  labelOf,
} from '../../features/sprint4/labels';
import { MSG_S4, MSG_STUDENT } from '../../features/sprint4/sprint4Messages';
import {
  createStudent,
  createStudentAccount,
  deleteStudent,
  fetchStudents,
  sprint4ErrorMessage,
  updateStudent,
} from '../../features/sprint4/sprint4Api';
import type {
  StudentAccountResponse,
  StudentListItem,
  StudentStatus,
} from '../../features/sprint4/types';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;

const STATUS_OPTIONS: { value: StudentStatus; label: string }[] = [
  { value: 'active', label: STUDENT_STATUS_LABEL.active },
  { value: 'inactive', label: STUDENT_STATUS_LABEL.inactive },
  { value: 'suspended', label: STUDENT_STATUS_LABEL.suspended },
];

/** Giá trị form thêm/sửa sinh viên. Mã sinh viên do BE tự sinh nên không có trong form. */
interface StudentFormValues {
  fullName: string;
  dateOfBirth?: Dayjs | null;
  email?: string;
  phone?: string;
  status: StudentStatus;
}

/**
 * Màn danh sách sinh viên (/dao-tao/sinh-vien).
 *
 * Quyền theo `STUDENT_*`; OWNER luôn được. Nút thêm/sửa/xoá ẩn theo quyền —
 * quyền thật vẫn do backend chặn (401/403).
 */
export default function StudentsPage() {
  const { token } = theme.useToken();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const isOwner = isOwnerRole(backendRoles);
  const canView = canViewStudents(isOwner, permissions);
  const canCreate = canCreateStudents(isOwner, permissions);
  const canEdit = canEditStudents(isOwner, permissions);
  const canDelete = canDeleteStudents(isOwner, permissions);
  const canCreateAccount = canCreateStudentAccount(isOwner, permissions);

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [status, setStatus] = useState<StudentStatus | undefined>();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudentListItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form] = Form.useForm<StudentFormValues>();

  const listQuery = useQuery({
    queryKey: ['students', { page, size, keyword, status }],
    queryFn: () =>
      fetchStudents({
        page,
        size,
        q: keyword || undefined,
        status,
      }),
    enabled: canView,
  });

  const createMut = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      notify.success(MSG_STUDENT.CREATED);
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error) => setFormError(sprint4ErrorMessage(error)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateStudent>[1] }) =>
      updateStudent(id, payload),
    onSuccess: () => {
      notify.success(MSG_STUDENT.UPDATED);
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error) => setFormError(sprint4ErrorMessage(error)),
  });

  const deleteMut = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      notify.success(MSG_STUDENT.DELETED);
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error) => notify.error(sprint4ErrorMessage(error)),
  });

  /** Quy tắc 12 — mật khẩu tạm chỉ hiện một lần sau khi cấp tài khoản. */
  const [accountResult, setAccountResult] = useState<StudentAccountResponse | null>(null);
  const createAccountMut = useMutation({
    mutationFn: createStudentAccount,
    onSuccess: (result) => {
      notify.success(MSG_STUDENT.ACCOUNT_CREATED);
      setAccountResult(result);
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error) => notify.error(sprint4ErrorMessage(error)),
  });

  function closeForm() {
    setModalOpen(false);
    setEditing(null);
    setFormError(null);
    form.resetFields();
  }

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active' });
    setModalOpen(true);
  };

  const columns = useMemo<ColumnsType<StudentListItem>>(() => {
    const base: ColumnsType<StudentListItem> = [
      {
        title: 'Mã sinh viên',
        dataIndex: 'studentCode',
        width: 130,
        render: (value: string | null | undefined) => value || '—',
      },
      {
        title: 'Họ tên',
        dataIndex: 'fullName',
        render: (value: string | null | undefined) => value || '—',
      },
      {
        title: 'Ngày sinh',
        dataIndex: 'dateOfBirth',
        width: 130,
        render: (value: string | null | undefined) => formatDate(value),
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
        title: 'Lớp học',
        key: 'class',
        width: 200,
        render: (_, record) =>
          record.classCode ? (
            <Tag color="cyan">
              {record.classCode}
              {record.className ? ` (${record.className})` : ''}
            </Tag>
          ) : (
            <Text type="secondary">{MSG_STUDENT.NO_CLASS}</Text>
          ),
      },
      {
        title: 'Tài khoản',
        key: 'account',
        width: 190,
        render: (_, record) =>
          record.accountUsername ? (
            <Tag color="green">{record.accountUsername}</Tag>
          ) : (
            <Text type="secondary">{MSG_STUDENT.ACCOUNT_NONE}</Text>
          ),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        width: 140,
        render: (value: string | null | undefined) =>
          value ? (
            <Tag color={STUDENT_STATUS_TAG[value]}>{labelOf(STUDENT_STATUS_LABEL, value)}</Tag>
          ) : (
            '—'
          ),
      },
    ];

    if (!canEdit && !canDelete && !canCreateAccount) return base;

    base.push({
      title: 'Thao tác',
      key: 'actions',
      width: 220,
      render: (_, record) => (
        <Space wrap>
          {canEdit && (
            <Button
              type="link"
              size="small"
              onClick={() => {
                setEditing(record);
                setFormError(null);
                form.setFieldsValue({
                  fullName: record.fullName ?? '',
                  dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : null,
                  email: record.email ?? undefined,
                  phone: record.phone ?? undefined,
                  status: record.status ?? 'active',
                });
                setModalOpen(true);
              }}
            >
              Sửa
            </Button>
          )}
          {canCreateAccount && !record.accountUsername && (
            <Popconfirm
              title={MSG_STUDENT.ACCOUNT_CREATE_TITLE}
              description={MSG_STUDENT.ACCOUNT_CREATE_CONFIRM}
              okText={MSG_S4.CONFIRM}
              cancelText={MSG_S4.CANCEL}
              onConfirm={() => createAccountMut.mutate(record.id)}
            >
              <Button
                type="link"
                size="small"
                disabled={!record.email}
                title={!record.email ? MSG_STUDENT.ACCOUNT_EMAIL_REQUIRED : undefined}
                loading={createAccountMut.isPending && createAccountMut.variables === record.id}
              >
                {MSG_STUDENT.CREATE_ACCOUNT}
              </Button>
            </Popconfirm>
          )}
          {canDelete && (
            <Popconfirm
              title={MSG_STUDENT.DELETE_TITLE}
              description={MSG_STUDENT.DELETE_CONFIRM}
              okText={MSG_S4.CONFIRM}
              cancelText={MSG_S4.CANCEL}
              onConfirm={() => deleteMut.mutate(record.id)}
            >
              <Button type="link" danger size="small">
                Xóa
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    });
    return base;
  }, [canEdit, canDelete, canCreateAccount, deleteMut, createAccountMut, form]);

  const onTableChange = (pagination: TablePaginationConfig) => {
    if (pagination.current) setPage(pagination.current);
    if (pagination.pageSize) setSize(pagination.pageSize);
  };

  return (
    <Flex vertical gap={token.marginMD}>
      <PageHeader
        title={MSG_STUDENT.TITLE}
        extra={
          canCreate ? (
            <Button type="primary" onClick={openCreate}>
              {MSG_STUDENT.CREATE}
            </Button>
          ) : undefined
        }
      >
        {canView ? (
          <Flex gap={token.marginSM} wrap="wrap" style={{ marginTop: token.marginXS }}>
            <Select<StudentStatus>
              allowClear
              aria-label={MSG_STUDENT.STATUS_ALL}
              placeholder={MSG_STUDENT.STATUS_ALL}
              options={STATUS_OPTIONS}
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              style={{ minWidth: 200 }}
            />
            <Input.Search
              allowClear
              aria-label={MSG_STUDENT.SEARCH_LABEL}
              placeholder={MSG_STUDENT.SEARCH_LABEL}
              value={keywordInput}
              onChange={(event) => {
                const next = event.target.value;
                setKeywordInput(next);
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
          message={MSG_STUDENT.LIST_LOAD_ERROR}
          description={sprint4ErrorMessage(listQuery.error)}
          action={
            <Button size="small" onClick={() => listQuery.refetch()}>
              {MSG_S4.RETRY}
            </Button>
          }
        />
      ) : (
        <Table<StudentListItem>
          rowKey="id"
          loading={listQuery.isLoading}
          columns={columns}
          dataSource={listQuery.data?.items ?? []}
          locale={{ emptyText: <Empty description={MSG_STUDENT.EMPTY} /> }}
          onChange={onTableChange}
          pagination={{
            current: listQuery.data?.page ?? page,
            pageSize: listQuery.data?.size ?? size,
            total: listQuery.data?.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} sinh viên`,
          }}
          scroll={{ x: 1100 }}
        />
      )}

      <Modal
        title={editing ? MSG_STUDENT.EDIT : MSG_STUDENT.CREATE}
        open={modalOpen}
        onCancel={closeForm}
        onOk={() => form.submit()}
        okText={editing ? MSG_S4.SAVE : MSG_S4.CREATE}
        cancelText={MSG_S4.CANCEL}
        confirmLoading={createMut.isPending || updateMut.isPending}
        width={640}
        forceRender
      >
        {formError && (
          <Alert
            type="error"
            showIcon
            role="alert"
            message={formError}
            style={{ marginBottom: token.margin }}
          />
        )}

        {!editing && (
          <Text type="secondary" style={{ display: 'block', marginBottom: token.margin }}>
            {MSG_STUDENT.AUTO_CODE}
          </Text>
        )}

        <Form
          form={form}
          layout="vertical"
          requiredMark
          onFinish={(values) => {
            const dateOfBirth = values.dateOfBirth
              ? values.dateOfBirth.format('YYYY-MM-DD')
              : null;
            if (editing) {
              updateMut.mutate({
                id: editing.id,
                payload: {
                  fullName: values.fullName.trim(),
                  dateOfBirth,
                  email: values.email?.trim() || null,
                  phone: values.phone?.trim() || null,
                  status: values.status,
                },
              });
              return;
            }
            createMut.mutate({
              fullName: values.fullName.trim(),
              dateOfBirth,
              email: values.email?.trim() || null,
              phone: values.phone?.trim() || null,
              status: values.status,
            });
          }}
        >
          <Flex gap={token.marginSM} wrap="wrap">
            <Form.Item
              name="fullName"
              label="Họ tên"
              style={{ flex: 1, minWidth: 220 }}
              rules={[
                { required: true, message: 'Vui lòng nhập họ tên' },
                { max: 200, message: 'Họ tên tối đa 200 ký tự' },
              ]}
            >
              <Input autoComplete="off" placeholder="Nguyễn Văn A" />
            </Form.Item>
          </Flex>

          <Flex gap={token.marginSM} wrap="wrap">
            <Form.Item name="dateOfBirth" label="Ngày sinh" style={{ flex: 1, minWidth: 220 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
            </Form.Item>
            <Form.Item name="phone" label="Số điện thoại" style={{ flex: 1, minWidth: 220 }}>
              <Input autoComplete="off" placeholder="0901234567" />
            </Form.Item>
          </Flex>

          <Flex gap={token.marginSM} wrap="wrap">
            <Form.Item
              name="email"
              label="Email"
              style={{ flex: 1, minWidth: 220 }}
              rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
            >
              <Input autoComplete="off" placeholder="sinhvien@example.edu.vn" />
            </Form.Item>
            <Form.Item
              name="status"
              label="Trạng thái"
              style={{ flex: 1, minWidth: 220 }}
              rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
            >
              <Select options={STATUS_OPTIONS} />
            </Form.Item>
          </Flex>
        </Form>
      </Modal>

      {/* Quy tắc 12 — mật khẩu tạm chỉ hiển thị một lần. */}
      <Modal
        title={MSG_STUDENT.ACCOUNT_TEMP_TITLE}
        open={!!accountResult}
        onCancel={() => setAccountResult(null)}
        onOk={() => setAccountResult(null)}
        okText={MSG_STUDENT.ACCOUNT_TEMP_DONE}
        cancelButtonProps={{ style: { display: 'none' } }}
        maskClosable={false}
      >
        {accountResult && (
          <Flex vertical gap={token.marginSM}>
            <Text>
              {MSG_STUDENT.CREATE_ACCOUNT}: <Text strong>{accountResult.username}</Text>
            </Text>
            <Text>
              {MSG_STUDENT.ACCOUNT_TEMP_LABEL}:{' '}
              <Text strong copyable>
                {accountResult.temporaryPassword}
              </Text>
            </Text>
            <Text type="secondary">{MSG_STUDENT.ACCOUNT_TEMP_HINT}</Text>
          </Flex>
        )}
      </Modal>
    </Flex>
  );
}
