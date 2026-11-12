import { Alert, App, Button, Empty, Flex, Popconfirm, Space, Table, Tag, Typography, theme } from 'antd';
import type { TableProps } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import PageHeader from '../../components/PageHeader/PageHeader';
import PositionFormModal from '../../components/PositionFormModal/PositionFormModal';
import { ownerErrorMessage } from '../../features/owner/ownerApi';
import { MSG_OWNER, MSG_POS } from '../../features/owner/ownerMessages';
import { permissionLabel } from '../../features/owner/permissionLabels';
import type { Position, PositionPayload } from '../../features/owner/types';
import { usePositionsPage } from './use-positions';

const { Text } = Typography;

const EMPTY_VALUE = '—';

function formatDate(value: string): string {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : EMPTY_VALUE;
}

export default function PositionsPage() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { list, permissions, create, update, remove } = usePositionsPage();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (position: Position) => {
    setEditing(position);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const handleSubmit = async (payload: PositionPayload) => {
    setFormError(null);
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, payload });
        message.success(MSG_POS.UPDATED);
      } else {
        await create.mutateAsync(payload);
        message.success(MSG_POS.CREATED);
      }
      closeForm();
    } catch (error) {
      setFormError(ownerErrorMessage(error));
    }
  };

  const handleDelete = async (position: Position) => {
    setActionError(null);
    try {
      await remove.mutateAsync(position.id);
      message.success(MSG_POS.DELETED);
    } catch (error) {
      setActionError(ownerErrorMessage(error));
    }
  };

  const columns: TableProps<Position>['columns'] = [
    {
      title: MSG_POS.NAME,
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: MSG_POS.DESCRIPTION,
      dataIndex: 'description',
      key: 'description',
      render: (value: string | null) => value || EMPTY_VALUE,
    },
    {
      title: MSG_POS.PERMISSIONS,
      dataIndex: 'permissions',
      key: 'permissions',
      render: (perms: string[]) => {
        if (!perms || perms.length === 0) {
          return <Text type="secondary">{MSG_POS.NO_PERMISSIONS}</Text>;
        }
        return (
          <Space wrap size={[token.marginXS, token.marginXS]}>
            {perms.map((code) => (
              <Tag key={code}>{permissionLabel(code)}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: MSG_POS.CREATED_AT,
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => formatDate(value),
    },
    {
      title: MSG_POS.ACTIONS,
      key: 'actions',
      render: (_, position) => (
        <Space size={token.marginXS}>
          <Button type="link" onClick={() => openEdit(position)}>
            {MSG_POS.EDIT}
          </Button>
          <Popconfirm
            title={MSG_POS.DELETE_CONFIRM_TITLE}
            description={MSG_POS.DELETE_CONFIRM}
            okText={MSG_POS.DELETE}
            cancelText={MSG_OWNER.CANCEL}
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleDelete(position)}
          >
            <Button type="link" danger>
              {MSG_POS.DELETE}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const isEmpty = list.isSuccess && (list.data?.length ?? 0) === 0;

  return (
    <Flex vertical gap={token.marginMD}>
      <PageHeader
        title={MSG_POS.TITLE}
        subtitle={MSG_POS.SUBTITLE}
        extra={
          !isEmpty ? (
            <Button type="primary" onClick={openCreate}>
              {MSG_POS.CREATE}
            </Button>
          ) : undefined
        }
      />

      {actionError && (
        <Alert type="error" showIcon role="alert" message={actionError} />
      )}

      {permissions.isError && (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={MSG_POS.PERMISSIONS_LOAD_ERROR}
          action={<Button onClick={() => void permissions.refetch()}>{MSG_OWNER.RETRY}</Button>}
        />
      )}

      {list.isError && (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={MSG_POS.LOAD_ERROR}
          action={<Button onClick={() => void list.refetch()}>{MSG_OWNER.RETRY}</Button>}
        />
      )}

      {isEmpty && (
        <Empty description={<Text type="secondary">{MSG_POS.EMPTY}</Text>} style={{ marginTop: token.marginLG }}>
          <Button type="primary" onClick={openCreate}>
            {MSG_POS.CREATE}
          </Button>
        </Empty>
      )}

      {!isEmpty && !list.isError && (
        <Table<Position>
          rowKey="id"
          columns={columns}
          dataSource={list.data ?? []}
          loading={list.isPending}
          pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
          size="middle"
        />
      )}

      <PositionFormModal
        open={formOpen}
        position={editing}
        permissions={permissions.data ?? []}
        submitting={create.isPending || update.isPending}
        error={formError}
        onCancel={closeForm}
        onSubmit={(payload) => void handleSubmit(payload)}
      />
    </Flex>
  );
}
