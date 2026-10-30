import { Alert, App, Button, Empty, Flex, Popconfirm, Space, Table, Typography, theme } from 'antd';
import type { TableProps } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import DepartmentFormModal from '../../components/DepartmentFormModal/DepartmentFormModal';
import { ownerErrorMessage } from '../../features/owner/ownerApi';
import { MSG_DEPT, MSG_OWNER } from '../../features/owner/ownerMessages';
import type { Department, DepartmentPayload } from '../../features/owner/types';
import { useDepartmentsPage } from './use-departments';

const { Title, Text, Paragraph } = Typography;

/** Giá trị hiển thị khi BE trả `null` — không để ô trống, không hiện `null`. */
const EMPTY_VALUE = '—';

function formatDate(value: string): string {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : EMPTY_VALUE;
}

/**
 * Màn danh sách phòng ban của Owner (`/to-chuc`) — Sprint 3.
 *
 * Mỗi dòng có 2 lối đi: bấm tên để mở nhân viên của phòng ban, hoặc Sửa/Xoá tại
 * chỗ. Không có cột "số nhân viên" vì PeopleService không trả số đếm — muốn có
 * thì phải gọi N lần `GET /departments/{id}/members`, không đáng.
 */
export default function DepartmentsPage() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { list, create, update, remove } = useDepartmentsPage();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (department: Department) => {
    setEditing(department);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const handleSubmit = async (payload: DepartmentPayload) => {
    setFormError(null);
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, payload });
        message.success(MSG_DEPT.UPDATED);
      } else {
        await create.mutateAsync(payload);
        message.success(MSG_DEPT.CREATED);
      }
      closeForm();
    } catch (error) {
      // `NFR-REL-001`: lỗi hiện trong modal, modal KHÔNG đóng, không báo thành công.
      setFormError(ownerErrorMessage(error));
    }
  };

  const handleDelete = async (department: Department) => {
    setActionError(null);
    try {
      await remove.mutateAsync(department.id);
      message.success(MSG_DEPT.DELETED);
    } catch (error) {
      setActionError(ownerErrorMessage(error));
    }
  };

  const columns: TableProps<Department>['columns'] = [
    {
      title: MSG_DEPT.NAME,
      dataIndex: 'name',
      key: 'name',
      render: (_, department) => (
        <Link to={`/to-chuc/phong-ban/${department.id}`}>{department.name}</Link>
      ),
    },
    {
      title: MSG_DEPT.DESCRIPTION,
      dataIndex: 'description',
      key: 'description',
      render: (value: string | null) => value || EMPTY_VALUE,
    },
    {
      title: MSG_DEPT.CREATED_AT,
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => formatDate(value),
    },
    {
      title: MSG_DEPT.ACTIONS,
      key: 'actions',
      render: (_, department) => (
        <Space size={token.marginXS}>
          <Button
            type="link"
            aria-label={`${MSG_DEPT.EDIT} ${department.name}`}
            onClick={() => openEdit(department)}
          >
            {MSG_DEPT.EDIT_SHORT}
          </Button>
          <Popconfirm
            title={MSG_DEPT.DELETE_CONFIRM_TITLE}
            description={`Phòng ban "${department.name}" sẽ bị xoá. ${MSG_DEPT.DELETE_CONFIRM}`}
            okText={MSG_DEPT.DELETE}
            cancelText={MSG_OWNER.CANCEL}
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(department)}
          >
            <Button
              type="link"
              danger
              aria-label={`${MSG_DEPT.DELETE} phòng ban ${department.name}`}
            >
              {MSG_DEPT.DELETE}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const isEmpty = list.isSuccess && list.data.length === 0;

  return (
    <div>
      <Flex justify="space-between" align="flex-start" gap={token.margin} wrap>
        <div>
          <Title level={2} style={{ marginBottom: token.marginXS }}>
            {MSG_DEPT.TITLE}
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {MSG_DEPT.SUBTITLE}
          </Paragraph>
        </div>
        {!isEmpty && (
          <Button type="primary" onClick={openCreate}>
            {MSG_DEPT.CREATE}
          </Button>
        )}
      </Flex>

      {actionError && (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={actionError}
          style={{ marginTop: token.margin }}
        />
      )}

      {list.isError && (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={MSG_DEPT.LOAD_ERROR}
          style={{ marginTop: token.margin }}
          action={<Button onClick={() => void list.refetch()}>{MSG_OWNER.RETRY}</Button>}
        />
      )}

      {isEmpty && (
        <Empty
          description={<Text type="secondary">{MSG_DEPT.EMPTY}</Text>}
          style={{ marginTop: token.marginLG }}
        >
          <Button type="primary" onClick={openCreate}>
            {MSG_DEPT.CREATE}
          </Button>
        </Empty>
      )}

      {!isEmpty && !list.isError && (
        <Table<Department>
          rowKey="id"
          columns={columns}
          dataSource={list.data ?? []}
          loading={list.isPending}
          style={{ marginTop: token.margin }}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
        />
      )}

      <DepartmentFormModal
        open={formOpen}
        department={editing}
        submitting={create.isPending || update.isPending}
        error={formError}
        onCancel={closeForm}
        onSubmit={(payload) => void handleSubmit(payload)}
      />
    </div>
  );
}
