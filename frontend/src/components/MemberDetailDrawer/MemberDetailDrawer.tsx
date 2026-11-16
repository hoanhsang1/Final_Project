import { Alert, Descriptions, Drawer, Empty, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { fetchMemberAssignments, fetchMemberDetail, ownerErrorMessage } from '../../features/owner/ownerApi';
import type { AssignmentHistoryItem, Member } from '../../features/owner/types';
import { CONTRACT_TYPE_LABEL, TEACHING_STATUS_LABEL, formatDateTime } from '../../features/sprint4/labels';
import { MSG_STAFF, ROLE_LABEL } from '../../features/sprint4/sprint4Messages';

interface MemberDetailDrawerProps {
  open: boolean;
  departmentId: string | undefined;
  member: Member | null;
  positionName: Map<string, string>;
  onClose: () => void;
}

const EMPTY = '—';

function scopeLabel(scope: string): string {
  return scope === 'ORGANIZATION' ? 'Toàn tổ chức' : 'Phòng ban';
}

/** Chi tiết nhân sự + lịch sử bổ nhiệm. BE đã che email/SĐT nếu thiếu `employee.view_detail`. */
export default function MemberDetailDrawer({
  open,
  departmentId,
  member,
  positionName,
  onClose,
}: MemberDetailDrawerProps) {
  const detailQuery = useQuery({
    queryKey: ['member-detail', departmentId, member?.userId],
    queryFn: () => fetchMemberDetail(departmentId as string, member?.userId as string),
    enabled: open && !!departmentId && !!member,
  });
  const historyQuery = useQuery({
    queryKey: ['member-assignments', departmentId, member?.userId],
    queryFn: () => fetchMemberAssignments(departmentId as string, member?.userId as string),
    enabled: open && !!departmentId && !!member,
  });

  const detail = detailQuery.data;
  const history = historyQuery.data ?? detail?.assignmentHistory ?? [];

  const columns: ColumnsType<AssignmentHistoryItem> = [
    {
      title: MSG_STAFF.ASSIGNMENT_POSITION,
      dataIndex: 'positionName',
      render: (value: string) => value || EMPTY,
    },
    {
      title: MSG_STAFF.ASSIGNMENT_SCOPE,
      dataIndex: 'scopeType',
      render: (value: string) => <Tag>{scopeLabel(value)}</Tag>,
    },
    {
      title: MSG_STAFF.ASSIGNMENT_PERIOD,
      key: 'period',
      render: (_, row) => (
        <Typography.Text>
          {formatDateTime(row.effectiveFrom)} → {row.effectiveTo ? formatDateTime(row.effectiveTo) : 'nay'}
        </Typography.Text>
      ),
    },
    {
      title: MSG_STAFF.ASSIGNMENT_STATUS,
      dataIndex: 'status',
      render: (value: string) =>
        value === 'ACTIVE' ? <Tag color="green">Đang hiệu lực</Tag> : <Tag>Đã thu hồi</Tag>,
    },
    {
      title: MSG_STAFF.ASSIGNMENT_REASON,
      dataIndex: 'reason',
      render: (value: string | null) => value || EMPTY,
    },
    {
      title: MSG_STAFF.ASSIGNMENT_REVOKED,
      key: 'revoked',
      render: (_, row) =>
        row.revokedAt ? (
          <Space direction="vertical" size={0}>
            <Typography.Text>{formatDateTime(row.revokedAt)}</Typography.Text>
            <Typography.Text type="secondary">
              {row.revokedReason || EMPTY} · {row.revokedByName || row.revokedBy || EMPTY}
            </Typography.Text>
          </Space>
        ) : (
          EMPTY
        ),
    },
  ];

  return (
    <Drawer
      open={open}
      width={720}
      title={MSG_STAFF.DETAIL_TITLE}
      onClose={onClose}
      destroyOnClose
    >
      {detailQuery.isError && (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={MSG_STAFF.DETAIL_LOAD_ERROR}
          description={ownerErrorMessage(detailQuery.error)}
          style={{ marginBottom: 16 }}
        />
      )}

      {detail && (
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label={MSG_STAFF.COL_USERNAME}>{detail.username || EMPTY}</Descriptions.Item>
          <Descriptions.Item label="Họ và tên">{detail.fullName || EMPTY}</Descriptions.Item>
          <Descriptions.Item label="Mã nhân sự">{detail.staffCode || EMPTY}</Descriptions.Item>
          <Descriptions.Item label={MSG_STAFF.COL_ROLE}>
            {ROLE_LABEL[detail.role] ?? detail.role}
          </Descriptions.Item>
          <Descriptions.Item label={MSG_STAFF.COL_STATUS}>
            {detail.status === 'ACTIVE' ? (
              <Tag color="green">{MSG_STAFF.STATUS_ACTIVE}</Tag>
            ) : (
              <Tag>{MSG_STAFF.STATUS_RESIGNED}</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label={MSG_STAFF.DEPARTMENT_LABEL}>{detail.departmentName || EMPTY}</Descriptions.Item>
          <Descriptions.Item label="Email">{detail.email || MSG_STAFF.SENSITIVE_HIDDEN}</Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">{detail.phone || MSG_STAFF.SENSITIVE_HIDDEN}</Descriptions.Item>
          <Descriptions.Item label={MSG_STAFF.COL_APPOINTED_AT} span={2}>
            {formatDateTime(detail.appointedAt)}
          </Descriptions.Item>
          <Descriptions.Item label={MSG_STAFF.COL_POSITIONS} span={2}>
            {detail.positionIds.length === 0 ? (
              MSG_STAFF.NO_POSITION
            ) : (
              <Space size={[0, 4]} wrap>
                {detail.positionIds.map((id) => (
                  <Tag key={id}>{positionName.get(id) ?? id}</Tag>
                ))}
              </Space>
            )}
          </Descriptions.Item>
          {detail.teacher && (
            <>
              <Descriptions.Item label={MSG_STAFF.CONTRACT_TYPE}>
                {detail.contractType ? CONTRACT_TYPE_LABEL[detail.contractType] ?? detail.contractType : EMPTY}
              </Descriptions.Item>
              <Descriptions.Item label={MSG_STAFF.TEACHING_STATUS}>
                {detail.teachingStatus
                  ? TEACHING_STATUS_LABEL[detail.teachingStatus] ?? detail.teachingStatus
                  : EMPTY}
              </Descriptions.Item>
              <Descriptions.Item label={MSG_STAFF.NO_CLASS_LABEL} span={2}>
                {detail.classLabel ?? `${detail.classCount} lớp đang phụ trách`}
              </Descriptions.Item>
            </>
          )}
        </Descriptions>
      )}

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        {MSG_STAFF.ASSIGNMENT_HISTORY}
      </Typography.Title>
      <Table<AssignmentHistoryItem>
        rowKey="id"
        size="small"
        loading={historyQuery.isLoading}
        columns={columns}
        dataSource={history}
        pagination={false}
        locale={{ emptyText: <Empty description={MSG_STAFF.ASSIGNMENT_EMPTY} /> }}
        scroll={{ x: 620 }}
      />
    </Drawer>
  );
}
