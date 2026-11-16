import { useQuery } from '@tanstack/react-query';
import { Alert, Button, DatePicker, Empty, Flex, Table, Tag, Typography, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import { canViewOwnSchedule, canViewSchedule, isOwnerRole } from '../../features/auth/permissions';
import { MSG_MY_SCHEDULE, MSG_OPS } from '../../features/operations/operationsMessages';
import { fetchMySchedule, operationsErrorMessage } from '../../features/operations/operationsApi';
import type { ScheduleItem } from '../../features/operations/types';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Đã xếp',
  cancelled: 'Đã hủy',
  completed: 'Đã hoàn thành',
};

const STATUS_TAG: Record<string, string> = {
  scheduled: 'blue',
  cancelled: 'default',
  completed: 'green',
};

/** Lịch của chính người dùng: giáo viên xem buổi mình dạy, sinh viên xem buổi của lớp mình. */
export default function MySchedulePage() {
  const { token } = theme.useToken();
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const isOwner = isOwnerRole(backendRoles);
  const allowed = canViewOwnSchedule(permissions) || canViewSchedule(isOwner, permissions) || isOwner;

  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [dayjs(), dayjs().add(30, 'day')]);

  const listQuery = useQuery({
    queryKey: ['schedules', 'me', range[0].valueOf(), range[1].valueOf()],
    queryFn: () =>
      fetchMySchedule({
        from: range[0].startOf('day').toISOString(),
        to: range[1].endOf('day').toISOString(),
      }),
    enabled: allowed,
  });

  const columns = useMemo<ColumnsType<ScheduleItem>>(
    () => [
      {
        title: 'Thời gian',
        key: 'time',
        width: 230,
        render: (_, record) =>
          `${dayjs(record.startTime).format('DD/MM/YYYY HH:mm')} – ${dayjs(record.endTime).format('HH:mm')}`,
      },
      {
        title: 'Lớp',
        dataIndex: 'className',
        render: (value: string | null, record) => value || record.classId,
      },
      {
        title: 'Phòng',
        dataIndex: 'roomId',
        width: 160,
        render: (value: string | null) => value || <Text type="secondary">Chưa xếp phòng</Text>,
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        width: 140,
        render: (value: string) => (
          <Tag color={STATUS_TAG[value] ?? 'default'}>{STATUS_LABEL[value] ?? value}</Tag>
        ),
      },
    ],
    [],
  );

  if (!allowed) {
    return (
      <Flex vertical gap={token.marginMD}>
        <PageHeader title={MSG_MY_SCHEDULE.TITLE} />
        <ForbiddenNotice title={MSG_OPS.NO_PERMISSION} />
      </Flex>
    );
  }

  return (
    <Flex vertical gap={token.marginMD}>
      <PageHeader title={MSG_MY_SCHEDULE.TITLE}>
        <Flex gap={token.marginSM} wrap="wrap" align="center" style={{ marginTop: token.marginXS }}>
          <RangePicker
            allowClear={false}
            format="DD/MM/YYYY"
            value={range}
            onChange={(value) => {
              if (value?.[0] && value?.[1]) setRange([value[0], value[1]]);
            }}
          />
          <Text type="secondary">{MSG_MY_SCHEDULE.SUBTITLE}</Text>
        </Flex>
      </PageHeader>

      {listQuery.isError ? (
        <Alert
          type="error"
          showIcon
          message={MSG_MY_SCHEDULE.LOAD_ERROR}
          description={operationsErrorMessage(listQuery.error)}
          action={
            <Button size="small" onClick={() => listQuery.refetch()}>
              {MSG_OPS.RETRY}
            </Button>
          }
        />
      ) : (
        <Table<ScheduleItem>
          rowKey="id"
          loading={listQuery.isLoading}
          columns={columns}
          dataSource={listQuery.data ?? []}
          locale={{ emptyText: <Empty description={MSG_MY_SCHEDULE.EMPTY} /> }}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 720 }}
        />
      )}
    </Flex>
  );
}
