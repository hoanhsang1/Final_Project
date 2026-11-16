import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Empty, Flex, Table, Tabs, Tag, Typography, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import PageHeader from '../../components/PageHeader/PageHeader';
import TransferCreateModal from '../../components/TransferCreateModal/TransferCreateModal';
import TransferDetailDrawer, {
  TRANSFER_STEP_LABEL,
} from '../../components/TransferDetailDrawer/TransferDetailDrawer';
import { formatDateTime } from '../../features/sprint4/labels';
import { MSG_S4 } from '../../features/sprint4/sprint4Messages';
import { sprint4ErrorMessage } from '../../features/sprint4/sprint4Api';
import { fetchMyTransfers, fetchTransferInbox } from '../../features/transfer/transferApi';
import type { TransferRequestItem } from '../../features/transfer/transferTypes';
import { usePermission } from '../../hooks/usePermission';

const { Text } = Typography;

const STATUS_TAG: Record<TransferRequestItem['status'], { color?: string; label: string }> = {
  PENDING: { color: 'blue', label: 'Chờ duyệt' },
  APPROVED: { color: 'green', label: 'Đã duyệt' },
  REJECTED: { color: 'red', label: 'Bị từ chối' },
  CANCELLED: { label: 'Đã huỷ' },
};

/**
 * Quy tắc 15 — chuyển phòng ban 4 bên.
 *
 * Tab "Hộp duyệt" chỉ chứa yêu cầu mà người đang đăng nhập còn bước PENDING
 * của chính mình (BE trả `actionableSteps`). Tab "Của tôi" là các yêu cầu họ
 * khởi tạo hoặc là người được chuyển.
 */
export default function TransferPage() {
  const { token } = theme.useToken();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const canCreate = can('employee.transfer');

  const [tab, setTab] = useState<'inbox' | 'mine'>('inbox');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const inboxQuery = useQuery({
    queryKey: ['transfers', 'inbox'],
    queryFn: fetchTransferInbox,
    enabled: tab === 'inbox',
  });
  const mineQuery = useQuery({
    queryKey: ['transfers', 'mine'],
    queryFn: fetchMyTransfers,
    enabled: tab === 'mine',
  });

  const activeQuery = tab === 'inbox' ? inboxQuery : mineQuery;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['transfers'] });
    queryClient.invalidateQueries({ queryKey: ['transfer-request'] });
  };

  const columns = useMemo<ColumnsType<TransferRequestItem>>(
    () => [
      {
        title: 'Nhân sự',
        key: 'employee',
        render: (_, record) => record.fullName || record.username || record.userId,
      },
      {
        title: 'Luồng chuyển',
        key: 'flow',
        render: (_, record) => (
          <Text>
            {record.fromDepartmentName ?? record.fromDepartmentId} →{' '}
            {record.toDepartmentName ?? record.toDepartmentId}
          </Text>
        ),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        width: 130,
        render: (value: TransferRequestItem['status']) => (
          <Tag color={STATUS_TAG[value].color}>{STATUS_TAG[value].label}</Tag>
        ),
      },
      {
        title: 'Bước của bạn',
        key: 'actionable',
        width: 210,
        render: (_, record) =>
          record.actionableSteps.length > 0 ? (
            <Flex gap={4} wrap="wrap">
              {record.actionableSteps.map((step) => (
                <Tag key={step} color="geekblue">
                  {TRANSFER_STEP_LABEL[step]}
                </Tag>
              ))}
            </Flex>
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
      {
        title: 'Tạo lúc',
        dataIndex: 'requestedAt',
        width: 160,
        render: (value: string | null | undefined) => formatDateTime(value),
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 110,
        render: (_, record) => (
          <Button type="link" style={{ padding: 0 }} onClick={() => setDetailId(record.id)}>
            Xem chi tiết
          </Button>
        ),
      },
    ],
    [],
  );

  const table = (
    <Flex vertical gap={token.marginSM}>
      {activeQuery.isError ? (
        <Alert
          type="error"
          showIcon
          message="Không tải được danh sách yêu cầu"
          description={sprint4ErrorMessage(activeQuery.error)}
          action={
            <Button size="small" onClick={() => activeQuery.refetch()}>
              {MSG_S4.RETRY}
            </Button>
          }
        />
      ) : (
        <Table<TransferRequestItem>
          rowKey="id"
          loading={activeQuery.isLoading}
          columns={columns}
          dataSource={activeQuery.data ?? []}
          locale={{
            emptyText: (
              <Empty
                description={
                  tab === 'inbox'
                    ? 'Không có yêu cầu nào cần bạn duyệt.'
                    : 'Bạn chưa có yêu cầu chuyển phòng ban nào.'
                }
              />
            ),
          }}
          pagination={false}
          scroll={{ x: 900 }}
        />
      )}
    </Flex>
  );

  return (
    <Flex vertical gap={token.marginMD}>
      <PageHeader
        title="Chuyển phòng ban"
        extra={
          canCreate ? (
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              Tạo yêu cầu
            </Button>
          ) : undefined
        }
      />

      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as 'inbox' | 'mine')}
        items={[
          { key: 'inbox', label: 'Hộp duyệt', children: tab === 'inbox' ? table : null },
          { key: 'mine', label: 'Của tôi', children: tab === 'mine' ? table : null },
        ]}
      />

      <TransferCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          setTab('mine');
          invalidate();
        }}
      />

      <TransferDetailDrawer
        requestId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        onChanged={invalidate}
      />
    </Flex>
  );
}
