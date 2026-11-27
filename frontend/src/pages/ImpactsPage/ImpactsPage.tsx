import {
  Badge,
  Banner,
  Button,
  HStack,
  pixel,
  proportional,
  Stack,
  Table,
  TextInput,
} from '@astryxdesign/core';
import type { TableColumn } from '@astryxdesign/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLink } from '../../components/AppLink/AppLink';
import EmptyState from '../../components/EmptyState/EmptyState';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import { hasAnyPermissionWithAliases, isOwnerRole } from '../../features/auth/permissions';
import { formatDateTime } from '../../features/sprint4/labels';
import { fetchImpacts, scheduleErrorMessage } from '../../features/schedule/scheduleApi';
import { MSG_SCHEDULE } from '../../features/schedule/scheduleMessages';
import type { SessionImpact } from '../../features/schedule/types';
import { useAuthStore } from '../../stores/authStore';

type ImpactRow = SessionImpact & Record<string, unknown>;

/** Màn danh sách buổi bị ảnh hưởng (`/dao-tao/lich/buoi-bi-anh-huong`). */
export default function ImpactsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const departmentId = searchParams.get('departmentId') ?? '';
  const permissions = useAuthStore((s) => s.permissions);
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const canView =
    isOwnerRole(backendRoles) || hasAnyPermissionWithAliases(permissions, ['schedule.view']);

  const [statusInput, setStatusInput] = useState('');
  const [status, setStatus] = useState('');

  const listQuery = useQuery({
    queryKey: ['schedule-impacts', departmentId, status],
    queryFn: () => fetchImpacts({ departmentId, status: status || undefined }),
    enabled: canView && Boolean(departmentId),
  });

  const columns: TableColumn<ImpactRow>[] = [
    {
      key: 'className',
      header: 'Lớp',
      width: proportional(1, { minWidth: 140 }),
      renderCell: (row) => row.className || row.classId,
    },
    {
      key: 'source',
      header: 'Nguồn ảnh hưởng',
      width: proportional(1, { minWidth: 180 }),
      renderCell: (row) =>
        row.sourceType ? `${row.sourceType}${row.sourceId ? ` · ${row.sourceId}` : ''}` : '—',
    },
    {
      key: 'startTime',
      header: 'Bắt đầu',
      width: pixel(180),
      renderCell: (row) => formatDateTime(row.startTime),
    },
    {
      key: 'roomId',
      header: 'Phòng',
      width: pixel(120),
      renderCell: (row) => row.roomId || '—',
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: pixel(140),
      renderCell: (row) => <Badge variant="neutral" label={row.status || '—'} />,
    },
    {
      key: 'details',
      header: 'Chi tiết',
      width: proportional(1, { minWidth: 200 }),
      renderCell: (row) => row.details || '—',
    },
  ];

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader
        title={MSG_SCHEDULE.IMPACTS_TITLE}
        extra={<AppLink to="/dao-tao/lich">{MSG_SCHEDULE.BACK_TO_SCHEDULE}</AppLink>}
      >
        {canView ? (
          <HStack gap={3} wrap="wrap" align="end">
            <TextInput
              label={MSG_SCHEDULE.DEPARTMENT}
              value={departmentId}
              onChange={(value) =>
                setSearchParams(value.trim() ? { departmentId: value.trim() } : {}, {
                  replace: true,
                })
              }
              placeholder="d1"
              width={180}
            />
            <TextInput
              label={MSG_SCHEDULE.STATUS}
              value={statusInput}
              onChange={setStatusInput}
              placeholder="PENDING"
              width={180}
            />
            <Button
              variant="secondary"
              size="lg"
              label={MSG_SCHEDULE.SEARCH}
              onClick={() => setStatus(statusInput.trim())}
            />
          </HStack>
        ) : null}
      </PageHeader>

      {!canView ? (
        <ForbiddenNotice />
      ) : !departmentId ? (
        <Banner
          status="warning"
          title={MSG_SCHEDULE.DEPARTMENT_HINT}
          description={MSG_SCHEDULE.DEPARTMENT}
          collapsible={false}
          role="status"
        />
      ) : listQuery.isError ? (
        <Banner
          status="error"
          title={MSG_SCHEDULE.IMPACTS_LOAD_ERROR}
          description={scheduleErrorMessage(listQuery.error)}
          collapsible={false}
          role="alert"
          endContent={
            <Button
              variant="secondary"
              size="sm"
              label={MSG_SCHEDULE.RETRY}
              onClick={() => listQuery.refetch()}
            />
          }
        />
      ) : listQuery.isLoading ? (
        <PageLoading />
      ) : (
        <Table<ImpactRow>
          data={(listQuery.data ?? []) as ImpactRow[]}
          columns={columns}
          idKey="id"
          hasHover
          textOverflow="truncate"
          emptyState={<EmptyState description={MSG_SCHEDULE.IMPACTS_EMPTY} compact />}
        />
      )}
    </Stack>
  );
}
