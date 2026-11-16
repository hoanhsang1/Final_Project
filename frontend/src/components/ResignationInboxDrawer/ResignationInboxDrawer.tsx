import { Alert, App, Button, Drawer, Empty, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveResignation,
  fetchResignationRequests,
  ownerErrorMessage,
  rejectResignation,
} from '../../features/owner/ownerApi';
import type { ResignationRequest } from '../../features/owner/types';
import { formatDateTime } from '../../features/sprint4/labels';
import { MSG_S4, MSG_STAFF } from '../../features/sprint4/sprint4Messages';

interface ResignationInboxDrawerProps {
  open: boolean;
  departmentId: string | undefined;
  canApprove: boolean;
  onClose: () => void;
  onChanged: () => void;
}

/** Hộp thư yêu cầu nghỉ việc — HR duyệt/từ chối một bước. */
export default function ResignationInboxDrawer({
  open,
  departmentId,
  canApprove,
  onClose,
  onChanged,
}: ResignationInboxDrawerProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const queryKey = ['resignation-requests', departmentId];

  const requestsQuery = useQuery({
    queryKey,
    queryFn: () => fetchResignationRequests(departmentId as string),
    enabled: open && !!departmentId,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey });
    onChanged();
  };

  const approveMut = useMutation({
    mutationFn: (id: string) => approveResignation(departmentId as string, id),
    onSuccess: () => {
      message.success(MSG_STAFF.RESIGN_APPROVED);
      invalidate();
    },
    onError: (error) => message.error(ownerErrorMessage(error)),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectResignation(departmentId as string, id),
    onSuccess: () => {
      message.success(MSG_STAFF.RESIGN_REJECTED);
      invalidate();
    },
    onError: (error) => message.error(ownerErrorMessage(error)),
  });

  const columns: ColumnsType<ResignationRequest> = [
    {
      title: 'Nhân sự',
      key: 'member',
      render: (_, row) => row.fullName || row.username || row.userId,
    },
    {
      title: MSG_STAFF.RESIGN_REASON,
      dataIndex: 'reason',
      render: (value: string) => <Typography.Text>{value}</Typography.Text>,
    },
    {
      title: MSG_STAFF.RESIGN_REQUESTER,
      key: 'requester',
      render: (_, row) => row.requestedByName || row.requestedBy,
    },
    {
      title: MSG_STAFF.RESIGN_REQUESTED_AT,
      dataIndex: 'requestedAt',
      render: (value: string) => formatDateTime(value),
    },
    {
      title: MSG_STAFF.RESIGN_STATUS,
      dataIndex: 'status',
      render: (value: string) => <Tag color={value === 'PENDING' ? 'gold' : undefined}>{value}</Tag>,
    },
  ];

  if (canApprove) {
    columns.push({
      title: MSG_STAFF.COL_ACTIONS,
      key: 'actions',
      render: (_, row) =>
        row.status === 'PENDING' ? (
          <Space>
            <Popconfirm
              title={MSG_STAFF.RESIGN_APPROVE}
              description={MSG_STAFF.RESIGN_APPROVE_CONFIRM}
              okText={MSG_S4.CONFIRM}
              cancelText={MSG_S4.CANCEL}
              onConfirm={() => approveMut.mutate(row.id)}
            >
              <Button type="link" size="small" loading={approveMut.isPending}>
                {MSG_STAFF.RESIGN_APPROVE}
              </Button>
            </Popconfirm>
            <Popconfirm
              title={MSG_STAFF.RESIGN_REJECT}
              description={MSG_STAFF.RESIGN_REJECT_CONFIRM}
              okText={MSG_S4.CONFIRM}
              cancelText={MSG_S4.CANCEL}
              onConfirm={() => rejectMut.mutate(row.id)}
            >
              <Button type="link" danger size="small" loading={rejectMut.isPending}>
                {MSG_STAFF.RESIGN_REJECT}
              </Button>
            </Popconfirm>
          </Space>
        ) : null,
    });
  }

  return (
    <Drawer open={open} width={760} title={MSG_STAFF.RESIGN_INBOX_TITLE} onClose={onClose} destroyOnClose>
      {requestsQuery.isError && (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={MSG_STAFF.RESIGN_LOAD_ERROR}
          description={ownerErrorMessage(requestsQuery.error)}
          style={{ marginBottom: 16 }}
        />
      )}
      <Table<ResignationRequest>
        rowKey="id"
        size="small"
        loading={requestsQuery.isLoading}
        columns={columns}
        dataSource={requestsQuery.data ?? []}
        pagination={false}
        locale={{ emptyText: <Empty description={MSG_STAFF.RESIGN_EMPTY} /> }}
        scroll={{ x: 680 }}
      />
    </Drawer>
  );
}
