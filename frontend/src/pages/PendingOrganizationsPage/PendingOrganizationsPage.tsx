import { Alert, Button, Empty, Flex, Skeleton, Table, Tag, Typography, theme } from 'antd';
import type { TableProps } from 'antd';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MSG_ORG } from '../../features/admin/adminMessages';
import { organizationStatusLabel, orgTypeLabel } from '../../features/admin/statusLabels';
import type { PendingOrganization } from '../../features/admin/types';
import { usePendingOrganizations } from './use-pending-organizations';

const { Text, Title } = Typography;

/**
 * Màn danh sách tổ chức chờ duyệt — `UC-ORG-02` (Đặc tả Sprint 2 §3.2).
 *
 * Nguồn dữ liệu: `GET /api/v1/organizations/pending` qua TanStack Query.
 * Năm trạng thái bắt buộc: loading · empty · error · success · no-permission
 * (no-permission do guard `AdminGuard` xử lý trước — màn này không tới được
 * khi người dùng không có role `SUPER_ADMIN`).
 */
export default function PendingOrganizationsPage() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const query = usePendingOrganizations();

  // Cột bảng không phụ thuộc state → dựng 1 lần, tránh dựng lại mỗi render.
  const columns = useMemo<TableProps<PendingOrganization>['columns']>(
    () => [
      {
        title: 'Tên tổ chức',
        dataIndex: 'name',
        key: 'name',
        sorter: (a, b) => a.name.localeCompare(b.name, 'vi'),
      },
      {
        title: 'Loại',
        dataIndex: 'org_type',
        key: 'org_type',
        render: (value: string) => orgTypeLabel(value),
      },
      {
        title: 'Người đại diện',
        dataIndex: 'owner_username',
        key: 'owner_username',
      },
      {
        title: 'Email',
        dataIndex: 'owner_email',
        key: 'owner_email',
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        // BR-08: Tag luôn kèm CHỮ, không chỉ dựa vào màu.
        render: (value: string) => {
          const status = organizationStatusLabel(value);
          return <Tag color={status.color}>{status.label}</Tag>;
        },
      },
      {
        title: 'Hành động',
        key: 'action',
        render: (_value, record) => (
          <Button
            type="link"
            aria-label={`Xem chi tiết tổ chức ${record.name}`}
            onClick={() => navigate(`/quan-tri/to-chuc/${record.id}`)}
          >
            {MSG_ORG.VIEW}
          </Button>
        ),
      },
    ],
    [navigate],
  );

  if (query.isError) {
    return (
      <Alert
        type="error"
        showIcon
        role="alert"
        message={MSG_ORG.LOAD_ERROR}
        description="Kiểm tra kết nối máy chủ rồi thử lại. Danh sách chưa được tải."
        action={
          <Button onClick={() => query.refetch()} loading={query.isFetching}>
            {MSG_ORG.RETRY}
          </Button>
        }
      />
    );
  }

  return (
    <Flex vertical gap={token.marginMD}>
      <div>
        <Title level={1} style={{ margin: 0 }}>
          {MSG_ORG.LIST_TITLE}
        </Title>
        <Text type="secondary">{MSG_ORG.LIST_SUBTITLE}</Text>
      </div>

      {/* Trạng thái loading — `Skeleton` (NFR-PER-001, `TC-ORG-14`).
          KHÔNG render bảng rỗng lúc đang tải để tránh nhấp nháy "không có dữ liệu". */}
      {query.isPending ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <Table<PendingOrganization>
          rowKey="id"
          columns={columns}
          dataSource={query.data ?? []}
          // Trạng thái empty — KHÔNG để bảng trắng (TC-ORG-12).
          locale={{ emptyText: <Empty description={MSG_ORG.EMPTY} /> }}
          // Phân trang phía client (NFR-PER-001); `showTotal` tiếng Việt nhờ locale vi_VN.
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (total) => `Tổng ${total} tổ chức`,
          }}
          // Ở màn hình 320px bảng cuộn ngang thay vì vỡ layout (TC-ADM-10).
          scroll={{ x: 860 }}
        />
      )}
    </Flex>
  );
}
