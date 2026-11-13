import { Alert, App, Button, Empty, Flex, Popconfirm, Result, Skeleton, Space, Table, Tag, Typography, theme } from 'antd';
import type { TableProps } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader/PageHeader';
import MemberFormModal from '../../components/MemberFormModal/MemberFormModal';
import MemberPositionsModal from '../../components/MemberPositionsModal/MemberPositionsModal';
import TempPasswordModal from '../../components/TempPasswordModal/TempPasswordModal';
import { ownerErrorMessage } from '../../features/owner/ownerApi';
import { MSG_DEPT, MSG_MEM, MSG_OWNER } from '../../features/owner/ownerMessages';
import { roleLabel } from '../../features/admin/roleLabels';
import type { CreatedMember, Member, MemberPayload } from '../../features/owner/types';
import { useDepartmentDetail } from './use-department-detail';

const { Text } = Typography;

const EMPTY_VALUE = '—';

function formatDate(value: string): string {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : EMPTY_VALUE;
}

function shortId(value: string): string {
  return value.length > 8 ? `${value.slice(0, 8)}...` : value;
}

export default function DepartmentDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const { message } = App.useApp();

  const {
    department,
    isLoading,
    isMissing,
    departmentsError,
    refetchDepartments,
    members,
    positions,
    create,
    updatePositions,
    remove,
  } = useDepartmentDetail(id);

  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [tempOpen, setTempOpen] = useState(false);
  const [tempData, setTempData] = useState<CreatedMember | null>(null);

  const [posOpen, setPosOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  const positionMap = new Map((positions.data ?? []).map((p) => [p.id, p.name]));

  const handleAdd = async (payload: MemberPayload) => {
    setAddError(null);
    try {
      const created = await create.mutateAsync(payload);
      setAddOpen(false);
      setTempData(created);
      setTempOpen(true);
      message.success(MSG_MEM.CREATED);
    } catch (error) {
      setAddError(ownerErrorMessage(error));
    }
  };

  const openChangePositions = (member: Member) => {
    setEditingMember(member);
    setPosOpen(true);
  };

  const handleChangePositions = async (positionIds: string[]) => {
    if (!editingMember) return;
    setActionError(null);
    try {
      await updatePositions.mutateAsync({ userId: editingMember.userId, positionIds });
      setPosOpen(false);
      setEditingMember(null);
      message.success(MSG_MEM.POSITIONS_UPDATED);
    } catch (error) {
      setActionError(ownerErrorMessage(error));
    }
  };

  const handleRemove = async (member: Member) => {
    setActionError(null);
    try {
      await remove.mutateAsync(member.userId);
      message.success(MSG_MEM.REMOVED);
    } catch (error) {
      setActionError(ownerErrorMessage(error));
    }
  };

  const columns: TableProps<Member>['columns'] = [
    {
      title: MSG_MEM.USERNAME,
      dataIndex: 'username',
      key: 'username',
      render: (value: string | null) => value || EMPTY_VALUE,
    },
    {
      title: MSG_MEM.USER_ID,
      dataIndex: 'userId',
      key: 'userId',
      render: (value: string) => <Typography.Text code>{shortId(value)}</Typography.Text>,
    },
    {
      title: MSG_MEM.ROLE,
      dataIndex: 'role',
      key: 'role',
      render: (value: string) => roleLabel(value),
    },
    {
      title: MSG_MEM.POSITIONS,
      dataIndex: 'positionIds',
      key: 'positions',
      render: (ids: string[]) => {
        if (!ids || ids.length === 0) {
          return <Text type="secondary">{MSG_MEM.NO_POSITIONS}</Text>;
        }
        return (
          <Space wrap size={[token.marginXS, token.marginXS]}>
            {ids.map((pid) => (
              <Tag key={pid}>{positionMap.get(pid) ?? pid}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: MSG_MEM.APPOINTED_AT,
      dataIndex: 'appointedAt',
      key: 'appointedAt',
      render: (value: string) => formatDate(value),
    },
    {
      title: MSG_MEM.ACTIONS,
      key: 'actions',
      render: (_, member) => (
        <Space size={token.marginXS}>
          <Button type="link" onClick={() => openChangePositions(member)}>
            {MSG_MEM.CHANGE_POSITIONS}
          </Button>
          <Popconfirm
            title={MSG_MEM.REMOVE_CONFIRM_TITLE}
            description={MSG_MEM.REMOVE_CONFIRM}
            okText={MSG_MEM.REMOVE}
            cancelText={MSG_OWNER.CANCEL}
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleRemove(member)}
          >
            <Button type="link" danger>
              {MSG_MEM.REMOVE}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }

  if (departmentsError) {
    return (
      <Alert
        type="error"
        showIcon
        role="alert"
        message={MSG_DEPT.LOAD_ERROR}
        action={
          <Space>
            <Button onClick={() => void refetchDepartments()}>{MSG_OWNER.RETRY}</Button>
            <Button type="primary" onClick={() => navigate('/to-chuc')}>
              {MSG_MEM.BACK}
            </Button>
          </Space>
        }
      />
    );
  }

  if (isMissing || !department) {
    return (
      <Result
        status="404"
        title={MSG_MEM.NOT_FOUND}
        subTitle={MSG_MEM.NOT_FOUND_HINT}
        extra={
          <Button type="primary" onClick={() => navigate('/to-chuc')}>
            {MSG_MEM.BACK}
          </Button>
        }
      />
    );
  }

  const data = members.data ?? [];
  const isEmpty = members.isSuccess && data.length === 0;

  return (
    <Flex vertical gap={token.marginMD}>
      <PageHeader
        breadcrumb={[{ title: 'Tổ chức', href: '/to-chuc' }, { title: department.name }]}
        title={department.name}
        subtitle={department.description || EMPTY_VALUE}
        extra={
          <Button type="primary" onClick={() => setAddOpen(true)}>
            {MSG_MEM.ADD}
          </Button>
        }
      />

      {actionError && (
        <Alert type="error" showIcon role="alert" message={actionError} />
      )}

      {members.isError && (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={MSG_MEM.LOAD_ERROR}
          action={<Button onClick={() => void members.refetch()}>{MSG_OWNER.RETRY}</Button>}
        />
      )}

      {isEmpty && !members.isError && (
        <Empty description={<Text type="secondary">{MSG_MEM.EMPTY}</Text>} style={{ marginTop: token.marginLG }}>
          <Button type="primary" onClick={() => setAddOpen(true)}>
            {MSG_MEM.ADD}
          </Button>
        </Empty>
      )}

      {!isEmpty && !members.isError && (
        <Table<Member>
          rowKey="userId"
          columns={columns}
          dataSource={data}
          loading={members.isPending}
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
          size="middle"
        />
      )}

      <MemberFormModal
        open={addOpen}
        positions={positions.data ?? []}
        submitting={create.isPending}
        error={addError}
        onCancel={() => {
          setAddOpen(false);
          setAddError(null);
        }}
        onSubmit={(payload) => void handleAdd(payload)}
      />

      <MemberPositionsModal
        open={posOpen}
        member={editingMember}
        positions={positions.data ?? []}
        submitting={updatePositions.isPending}
        onCancel={() => {
          setPosOpen(false);
          setEditingMember(null);
        }}
        onSubmit={(ids) => void handleChangePositions(ids)}
      />

      <TempPasswordModal
        open={tempOpen}
        username={tempData?.member.username ?? ''}
        password={tempData?.temporaryPassword ?? ''}
        onClose={() => {
          setTempOpen(false);
          setTempData(null);
        }}
      />
    </Flex>
  );
}
