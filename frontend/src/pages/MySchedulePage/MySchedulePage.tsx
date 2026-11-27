import { Banner, Button, DateInput, HStack, Stack } from '@astryxdesign/core';
import type { ISODateString } from '@astryxdesign/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import CompactScheduleGrid from '../../components/CompactScheduleGrid/CompactScheduleGrid';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import WeeklyScheduleGrid from '../../components/WeeklyScheduleGrid/WeeklyScheduleGrid';
import { hasAnyPermissionWithAliases, isOwnerRole } from '../../features/auth/permissions';
import { fetchMySchedule, scheduleErrorMessage } from '../../features/schedule/scheduleApi';
import { MSG_SCHEDULE } from '../../features/schedule/scheduleMessages';
import type { ScheduleMode } from '../../features/schedule/scheduleViewMode';
import { canToggleScheduleMode, initialScheduleMode } from '../../features/schedule/scheduleViewMode';
import { dayEndIso, dayStartIso } from '../../features/schedule/scheduleTime';
import { useAuthStore } from '../../stores/authStore';

/**
 * Lịch của chính người đăng nhập (`/dao-tao/lich-cua-toi`).
 *
 * Gọi `/api/schedules/me` qua `fetchMySchedule({from, to})` — KHÔNG gửi
 * `departmentId`, không đọc `/internal/**` hay `/outbox/**`.
 * 5 state: loading / empty / error(+retry) / success / forbidden.
 *
 * Chế độ xem quyết định theo `backendRoles` (Task 1), không theo permission quản lý:
 * TEACHER luôn lưới giờ, STUDENT luôn lịch gọn, vai trò khác được chuyển đổi.
 * Trang này chỉ đọc nên không truyền `onSelect` cho lưới nào.
 */
export default function MySchedulePage() {
  const permissions = useAuthStore((s) => s.permissions);
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const canView =
    isOwnerRole(backendRoles) || hasAnyPermissionWithAliases(permissions, ['schedule.self_view']);

  // Override của người dùng chỉ có hiệu lực khi role hiện tại còn cho phép công tắc;
  // `syncSessionFromToken()` có thể đổi backendRoles giữa phiên (xem SchedulePage).
  const showModeToggle = canToggleScheduleMode(backendRoles);
  const [userMode, setUserMode] = useState<ScheduleMode | null>(null);
  const mode = showModeToggle ? (userMode ?? 'compact') : initialScheduleMode(backendRoles);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [applied, setApplied] = useState({ from: '', to: '' });

  const listQuery = useQuery({
    queryKey: ['my-schedule', applied.from, applied.to],
    queryFn: () =>
      fetchMySchedule({
        from: dayStartIso(applied.from),
        to: dayEndIso(applied.to),
      }),
    enabled: canView,
  });

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader title={MSG_SCHEDULE.MENU_MY_SCHEDULE}>
        {canView ? (
          <HStack gap={3} wrap="wrap" align="end">
            <DateInput
              label={MSG_SCHEDULE.FROM}
              value={(fromDate || undefined) as ISODateString | undefined}
              onChange={(value) => setFromDate(value ?? '')}
              width={180}
            />
            <DateInput
              label={MSG_SCHEDULE.TO}
              value={(toDate || undefined) as ISODateString | undefined}
              onChange={(value) => setToDate(value ?? '')}
              width={180}
            />
            <Button
              variant="secondary"
              size="lg"
              label={MSG_SCHEDULE.SEARCH}
              onClick={() => setApplied({ from: fromDate, to: toDate })}
            />
          </HStack>
        ) : null}
      </PageHeader>

      {canView && showModeToggle ? (
        <HStack role="group" aria-label={MSG_SCHEDULE.VIEW_MODE_GROUP} gap={2} wrap="wrap">
          <Button
            type="button"
            size="sm"
            variant={mode === 'hourly' ? 'primary' : 'secondary'}
            label={MSG_SCHEDULE.VIEW_HOURLY}
            aria-pressed={mode === 'hourly'}
            onClick={() => setUserMode('hourly')}
          />
          <Button
            type="button"
            size="sm"
            variant={mode === 'compact' ? 'primary' : 'secondary'}
            label={MSG_SCHEDULE.VIEW_COMPACT}
            aria-pressed={mode === 'compact'}
            onClick={() => setUserMode('compact')}
          />
        </HStack>
      ) : null}

      {!canView ? (
        <ForbiddenNotice />
      ) : listQuery.isError ? (
        <Banner
          status="error"
          title={MSG_SCHEDULE.MY_LOAD_ERROR}
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
      ) : mode === 'compact' ? (
        <CompactScheduleGrid
          items={listQuery.data ?? []}
          emptyText={MSG_SCHEDULE.MY_EMPTY}
        />
      ) : (
        <WeeklyScheduleGrid
          items={listQuery.data ?? []}
          emptyText={MSG_SCHEDULE.MY_EMPTY}
        />
      )}
    </Stack>
  );
}
