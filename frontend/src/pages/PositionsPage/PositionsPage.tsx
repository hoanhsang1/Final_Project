import { Alert, App, Button, Empty, Flex, Popconfirm, Space, Table, Tag, Typography, theme } from 'antd';
import type { TableProps } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import ClonePositionModal from '../../components/ClonePositionModal/ClonePositionModal';
import PageHeader from '../../components/PageHeader/PageHeader';
import PositionFormModal from '../../components/PositionFormModal/PositionFormModal';
import { ownerErrorMessage } from '../../features/owner/ownerApi';
import { MSG_OWNER, MSG_POS } from '../../features/owner/ownerMessages';
import { permissionLabel } from '../../features/owner/permissionLabels';
import type {
  Position,
  PositionClonePayload,
  PositionCloneResult,
  PositionPayload,
} from '../../features/owner/types';
import { usePositionsPage } from './use-positions';

const { Text } = Typography;

const EMPTY_VALUE = '—';

function formatDate(value: string): string {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : EMPTY_VALUE;
}

export default function PositionsPage() {
  const { token } = theme.useToken();
  const { message, modal } = App.useApp();
  const { list, permissions, bundles, departments, create, update, remove, clone } =
    usePositionsPage();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [cloning, setCloning] = useState<Position | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Mọi hàm fetch danh sách đã chuẩn hoá qua `unwrapList`, nhưng vẫn chặn
  // trường hợp BE/proxy trả shape lạ để `.forEach`/`.map` không bao giờ nổ.
  const departmentList = useMemo(
    () => (Array.isArray(departments.data) ? departments.data : []),
    [departments.data],
  );
  const bundleList = useMemo(
    () => (Array.isArray(bundles.data) ? bundles.data : []),
    [bundles.data],
  );

  const departmentNames = useMemo(() => {
    const map = new Map<string, string>();
    departmentList.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [departmentList]);

  const bundleNames = useMemo(() => {
    const map = new Map<string, string>();
    bundleList.forEach((b) => map.set(b.code, b.name));
    return map;
  }, [bundleList]);

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

  const openClone = (position: Position) => {
    setCloning(position);
    setCloneError(null);
  };

  const closeClone = () => {
    setCloning(null);
    setCloneError(null);
  };

  const showCloneResult = (result: PositionCloneResult) => {
    if (result.removedPermissions.length === 0 && result.droppedBundles.length === 0) {
      return;
    }
    modal.info({
      title: MSG_POS.CLONE_REMOVED_TITLE,
      width: 520,
      content: (
        <Flex vertical gap={token.marginXS} style={{ marginTop: token.marginXS }}>
          {result.removedPermissions.length > 0 && (
            <div>
              <Text>{MSG_POS.CLONE_REMOVED_HINT(result.removedPermissions.length)}</Text>
              <Space wrap size={[token.marginXS, token.marginXS]} style={{ marginTop: token.marginXS }}>
                {result.removedPermissions.map((code) => (
                  <Tag key={code}>{permissionLabel(code)}</Tag>
                ))}
              </Space>
            </div>
          )}
          {result.droppedBundles.length > 0 && (
            <Text type="secondary">
              {MSG_POS.CLONE_DROPPED_BUNDLES(
                result.droppedBundles.map((code) => bundleNames.get(code) ?? code).join(', '),
              )}
            </Text>
          )}
        </Flex>
      ),
    });
  };

  const handleClone = async (payload: PositionClonePayload) => {
    if (!cloning) {
      return;
    }
    setCloneError(null);
    try {
      const result = await clone.mutateAsync({ id: cloning.id, payload });
      message.success(MSG_POS.CLONED);
      closeClone();
      showCloneResult(result);
    } catch (error) {
      setCloneError(ownerErrorMessage(error));
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
      title: MSG_POS.SCOPE,
      dataIndex: 'scope',
      key: 'scope',
      render: (_: string, position) => {
        if (position.scope === 'ORGANIZATION') {
          return <Tag color="blue">{MSG_POS.SCOPE_ORGANIZATION}</Tag>;
        }
        const name = position.departmentId
          ? departmentNames.get(position.departmentId)
          : null;
        return <Tag color="green">{name ? `${MSG_POS.SCOPE_DEPARTMENT} · ${name}` : MSG_POS.SCOPE_DEPARTMENT}</Tag>;
      },
    },
    {
      title: MSG_POS.BUNDLES,
      dataIndex: 'bundleCodes',
      key: 'bundleCodes',
      render: (codes: string[]) => {
        if (!codes || codes.length === 0) {
          return <Text type="secondary">{EMPTY_VALUE}</Text>;
        }
        return (
          <Space wrap size={[token.marginXS, token.marginXS]}>
            {codes.map((code) => (
              <Tag key={code}>{bundleNames.get(code) ?? code}</Tag>
            ))}
          </Space>
        );
      },
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
          <Button type="link" onClick={() => openClone(position)}>
            {MSG_POS.CLONE}
          </Button>
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
        bundles={bundleList}
        departments={departmentList}
        submitting={create.isPending || update.isPending}
        error={formError}
        onCancel={closeForm}
        onSubmit={(payload) => void handleSubmit(payload)}
      />

      <ClonePositionModal
        open={cloning !== null}
        position={cloning}
        departments={departmentList}
        submitting={clone.isPending}
        error={cloneError}
        onCancel={closeClone}
        onSubmit={(payload) => void handleClone(payload)}
      />
    </Flex>
  );
}
