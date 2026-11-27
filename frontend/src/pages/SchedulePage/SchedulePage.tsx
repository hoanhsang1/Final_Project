import {
  AlertDialog,
  Banner,
  Button,
  DateInput,
  Dialog,
  DialogHeader,
  HStack,
  Stack,
  Text,
  TextInput,
  VStack,
} from '@astryxdesign/core';
import type { ISODateString } from '@astryxdesign/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLink, linkWithDepartmentId } from '../../components/AppLink/AppLink';
import CompactScheduleGrid from '../../components/CompactScheduleGrid/CompactScheduleGrid';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import WeeklyScheduleGrid from '../../components/WeeklyScheduleGrid/WeeklyScheduleGrid';
import { hasAnyPermissionWithAliases, isOwnerRole } from '../../features/auth/permissions';
import {
  cancelSession,
  createSchedule,
  deleteSession,
  fetchRoomSuggestions,
  fetchSchedules,
  scheduleErrorMessage,
  updateSchedule,
} from '../../features/schedule/scheduleApi';
import { MSG_AUTO } from '../../features/schedule/autoScheduleMessages';
import { MSG_SCHEDULE } from '../../features/schedule/scheduleMessages';
import type { ScheduleMode } from '../../features/schedule/scheduleViewMode';
import { canToggleScheduleMode, initialScheduleMode } from '../../features/schedule/scheduleViewMode';
import { dayEndIso, dayStartIso, isIsoLike } from '../../features/schedule/scheduleTime';
import type { ScheduleItem, SchedulePayload } from '../../features/schedule/types';
import { useFormState } from '../../hooks/useFormState';
import { useNotify } from '../../hooks/useNotify';
import { useAuthStore } from '../../stores/authStore';

type ScheduleFormValues = {
  classId: string;
  startTime: string;
  endTime: string;
  teacherId: string;
  subjectName: string;
  roomId: string;
};

const EMPTY_FORM: ScheduleFormValues = {
  classId: '',
  startTime: '',
  endTime: '',
  teacherId: '',
  subjectName: '',
  roomId: '',
};

function toFormValues(item: ScheduleItem | null): ScheduleFormValues {
  return {
    classId: item?.classId ?? '',
    startTime: item?.startTime ?? '',
    endTime: item?.endTime ?? '',
    teacherId: item?.teacherId ?? '',
    subjectName: item?.subjectName ?? '',
    roomId: item?.roomId ?? '',
  };
}

function buildPayload(values: ScheduleFormValues): SchedulePayload {
  return {
    classId: values.classId.trim(),
    teacherId: values.teacherId.trim() || null,
    subjectName: values.subjectName.trim() || null,
    roomId: values.roomId.trim() || null,
    startTime: values.startTime.trim(),
    endTime: values.endTime.trim(),
  };
}

function sessionLabel(row: ScheduleItem): string {
  return row.className || row.classId;
}

/**
 * Màn lịch theo phòng ban (`/dao-tao/lich`).
 *
 * - Lọc tuần (from/to) + lớp (classId) qua query string của API.
 * - Room picker gọi `fetchRoomSuggestions` với startTime/endTime.
 * - 5 state: loading / empty / error(+retry) / success / forbidden.
 * - Người có `schedule.create` thấy liên kết sang màn tự động xếp lịch; màn này
 *   không gọi `/auto-generate` (đó là việc của `AutoSchedulePage`).
 */
export default function SchedulePage() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const departmentId = searchParams.get('departmentId') ?? '';

  const permissions = useAuthStore((s) => s.permissions);
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const isOwner = isOwnerRole(backendRoles);
  const canView = isOwner || hasAnyPermissionWithAliases(permissions, ['schedule.view']);
  const canCreate = isOwner || hasAnyPermissionWithAliases(permissions, ['schedule.create']);
  // `schedule.edit` là alias legacy của `schedule.update`; vẫn chấp nhận để không
  // khoá người dùng có token cũ (Task 1 giữ alias này trong bảng quyền).
  const canUpdate =
    isOwner || hasAnyPermissionWithAliases(permissions, ['schedule.update', 'schedule.edit']);
  const canCancel =
    isOwner || hasAnyPermissionWithAliases(permissions, ['schedule.cancel_session']);
  const canDelete = isOwner || hasAnyPermissionWithAliases(permissions, ['schedule.delete']);

  // Chế độ xem quyết định theo `backendRoles` hiện tại (Task 1), không theo permission
  // quản lý: TEACHER luôn lưới giờ, STUDENT luôn lịch gọn, vai trò khác được chuyển đổi.
  // `syncSessionFromToken()` có thể đổi role giữa phiên, nên override của người dùng
  // chỉ có hiệu lực khi role hiện tại còn cho phép công tắc.
  const showModeToggle = canToggleScheduleMode(backendRoles);
  const [userMode, setUserMode] = useState<ScheduleMode | null>(null);
  const mode = showModeToggle ? (userMode ?? 'compact') : initialScheduleMode(backendRoles);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [applied, setApplied] = useState({ from: '', to: '', classId: '' });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ScheduleItem | null>(null);

  const form = useFormState<ScheduleFormValues>(EMPTY_FORM, {
    classId: (value) => (value.trim() ? undefined : MSG_SCHEDULE.REQUIRED_CLASS),
    startTime: (value) => {
      if (!value.trim()) return MSG_SCHEDULE.REQUIRED_START;
      return isIsoLike(value) ? undefined : 'Nhập thời gian theo định dạng ISO';
    },
    endTime: (value, values) => {
      if (!value.trim()) return MSG_SCHEDULE.REQUIRED_END;
      if (!isIsoLike(value)) return 'Nhập thời gian theo định dạng ISO';
      if (
        isIsoLike(values.startTime) &&
        new Date(value).getTime() <= new Date(values.startTime).getTime()
      ) {
        return MSG_SCHEDULE.INVALID_RANGE;
      }
      return undefined;
    },
  });

  const listQuery = useQuery({
    queryKey: ['schedules', departmentId, applied.from, applied.to, applied.classId],
    queryFn: () =>
      fetchSchedules({
        departmentId,
        from: dayStartIso(applied.from),
        to: dayEndIso(applied.to),
        classId: applied.classId || undefined,
      }),
    enabled: canView && Boolean(departmentId),
  });

  const suggestionStart = form.values.startTime.trim();
  const suggestionEnd = form.values.endTime.trim();
  const suggestionsQuery = useQuery({
    queryKey: ['room-suggestions', departmentId, suggestionStart, suggestionEnd],
    queryFn: () =>
      fetchRoomSuggestions({
        departmentId,
        startTime: suggestionStart,
        endTime: suggestionEnd,
      }),
    // room-suggestions cần schedule.create; chỉ schedule.update không đủ (BE 403).
    enabled: formOpen && canCreate && isIsoLike(suggestionStart) && isIsoLike(suggestionEnd),
  });

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
    form.reset(EMPTY_FORM);
  };

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    form.reset(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (item: ScheduleItem) => {
    setEditing(item);
    setFormError(null);
    form.reset(toFormValues(item));
    setFormOpen(true);
  };

  const invalidateSchedules = () => queryClient.invalidateQueries({ queryKey: ['schedules'] });

  const createMut = useMutation({
    mutationFn: (payload: SchedulePayload) => createSchedule(departmentId, payload),
    onSuccess: () => {
      notify.success(MSG_SCHEDULE.CREATED);
      closeForm();
      invalidateSchedules();
    },
    onError: (error) => setFormError(scheduleErrorMessage(error)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SchedulePayload }) =>
      updateSchedule(departmentId, id, payload),
    onSuccess: () => {
      notify.success(MSG_SCHEDULE.UPDATED);
      closeForm();
      invalidateSchedules();
    },
    onError: (error) => setFormError(scheduleErrorMessage(error)),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelSession(departmentId, id),
    onSuccess: () => {
      notify.success(MSG_SCHEDULE.CANCELLED);
      invalidateSchedules();
    },
    onError: (error) => notify.error(scheduleErrorMessage(error)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSession(departmentId, id),
    onSuccess: () => {
      notify.success(MSG_SCHEDULE.DELETED);
      setPendingDelete(null);
      invalidateSchedules();
    },
    onError: (error) => {
      notify.error(scheduleErrorMessage(error));
      setPendingDelete(null);
    },
  });

  const applyFilters = () =>
    setApplied({ from: fromDate, to: toDate, classId: classFilter.trim() });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.validate()) return;
    const payload = buildPayload(form.values);
    if (editing) {
      updateMut.mutate({ id: editing.id, payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const savePending = createMut.isPending || updateMut.isPending;
  const showActions = canUpdate || canCancel || canDelete;
  const readOnly = editing !== null && !canUpdate;

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader
        title={MSG_SCHEDULE.TITLE}
        extra={
          canCreate ? (
            <Button
              variant="primary"
              size="lg"
              label={MSG_SCHEDULE.CREATE}
              onClick={openCreate}
            />
          ) : undefined
        }
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
            <TextInput
              label={MSG_SCHEDULE.CLASS_ID}
              value={classFilter}
              onChange={setClassFilter}
              placeholder="c1"
              width={160}
            />
            <Button variant="secondary" size="lg" label={MSG_SCHEDULE.SEARCH} onClick={applyFilters} />
            {canCreate ? (
              <AppLink to={linkWithDepartmentId('/dao-tao/tu-dong-xep-lich', departmentId)}>
                {MSG_AUTO.AUTO_SCHEDULE_LINK}
              </AppLink>
            ) : null}
            <AppLink to={linkWithDepartmentId('/dao-tao/lich/buoi-bi-anh-huong', departmentId)}>
              {MSG_SCHEDULE.IMPACTS_LINK}
            </AppLink>
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
          title={MSG_SCHEDULE.LOAD_ERROR}
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
          emptyText={MSG_SCHEDULE.EMPTY}
          onSelect={showActions ? openEdit : undefined}
        />
      ) : (
        <WeeklyScheduleGrid
          items={listQuery.data ?? []}
          emptyText={MSG_SCHEDULE.EMPTY}
          onSelect={showActions ? openEdit : undefined}
        />
      )}

      <Dialog
        isOpen={formOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        purpose="form"
        width={720}
      >
        <DialogHeader
          title={readOnly ? 'Chi tiết buổi học' : editing ? MSG_SCHEDULE.EDIT : MSG_SCHEDULE.CREATE}
          onOpenChange={(open) => {
            if (!open) closeForm();
          }}
        />
        {formOpen ? (
          <form noValidate onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-4)' }}>
            <VStack gap={4}>
              {formError ? (
                <Banner status="error" title={formError} collapsible={false} role="alert" />
              ) : null}

              <HStack gap={3} wrap="wrap">
                <TextInput
                  label={MSG_SCHEDULE.CLASS_ID}
                  value={form.values.classId}
                  onChange={(value) => form.setValue('classId', value)}
                  isDisabled={savePending || readOnly}
                  containerStyle={{ flex: '1 1 220px', minWidth: 0 }}
                  status={
                    form.errorOf('classId')
                      ? { type: 'error', message: form.errorOf('classId') }
                      : undefined
                  }
                />
                <TextInput
                  label={MSG_SCHEDULE.START_TIME}
                  value={form.values.startTime}
                  onChange={(value) => form.setValue('startTime', value)}
                  placeholder="2026-12-01T07:30:00"
                  isDisabled={savePending || readOnly}
                  containerStyle={{ flex: '1 1 220px', minWidth: 0 }}
                  status={
                    form.errorOf('startTime')
                      ? { type: 'error', message: form.errorOf('startTime') }
                      : undefined
                  }
                />
                <TextInput
                  label={MSG_SCHEDULE.END_TIME}
                  value={form.values.endTime}
                  onChange={(value) => form.setValue('endTime', value)}
                  placeholder="2026-12-01T09:00:00"
                  isDisabled={savePending || readOnly}
                  containerStyle={{ flex: '1 1 220px', minWidth: 0 }}
                  status={
                    form.errorOf('endTime')
                      ? { type: 'error', message: form.errorOf('endTime') }
                      : undefined
                  }
                />
              </HStack>

              <HStack gap={3} wrap="wrap">
                <TextInput
                  label={MSG_SCHEDULE.TEACHER_ID}
                  value={form.values.teacherId}
                  onChange={(value) => form.setValue('teacherId', value)}
                  isDisabled={savePending || readOnly}
                  containerStyle={{ flex: '1 1 220px', minWidth: 0 }}
                />
                <TextInput
                  label={MSG_SCHEDULE.SUBJECT}
                  value={form.values.subjectName}
                  onChange={(value) => form.setValue('subjectName', value)}
                  isDisabled={savePending || readOnly}
                  containerStyle={{ flex: '1 1 220px', minWidth: 0 }}
                />
              </HStack>

              <VStack gap={2}>
                <Text type="supporting">{MSG_SCHEDULE.ROOM_SUGGESTIONS_HINT}</Text>
                {suggestionsQuery.isError ? (
                  <Banner
                    status="error"
                    title={MSG_SCHEDULE.ROOM_SUGGESTIONS_ERROR}
                    description={scheduleErrorMessage(suggestionsQuery.error)}
                    collapsible={false}
                    role="alert"
                    endContent={
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        label={MSG_SCHEDULE.RETRY}
                        onClick={() => suggestionsQuery.refetch()}
                      />
                    }
                  />
                ) : null}
                <div role="group" aria-label={MSG_SCHEDULE.ROOM_SUGGESTIONS}>
                  <HStack gap={2} wrap="wrap">
                    {(suggestionsQuery.data ?? []).map((room) => (
                      <Button
                        key={room.id}
                        type="button"
                        size="sm"
                        variant={form.values.roomId === room.id ? 'primary' : 'secondary'}
                        label={`${room.code} — ${room.name} (${room.capacity})`}
                        aria-pressed={form.values.roomId === room.id}
                        onClick={() => form.setValue('roomId', room.id)}
                      />
                    ))}
                  </HStack>
                </div>
                {suggestionsQuery.isSuccess && (suggestionsQuery.data?.length ?? 0) === 0 ? (
                  <Text type="supporting">{MSG_SCHEDULE.ROOM_SUGGESTIONS_EMPTY}</Text>
                ) : null}
                <TextInput
                  label={MSG_SCHEDULE.ROOM_ID}
                  value={form.values.roomId}
                  onChange={(value) => form.setValue('roomId', value)}
                  isDisabled={savePending || readOnly}
                  width={240}
                />
              </VStack>

              <HStack justify="end" gap={2}>
                {editing !== null && canCancel ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    label={MSG_SCHEDULE.CANCEL_SESSION}
                    aria-label={MSG_SCHEDULE.CANCEL_SESSION}
                    isDisabled={cancelMut.isPending}
                    onClick={() => cancelMut.mutate(editing.id)}
                  />
                ) : null}
                {editing !== null && canDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    label={MSG_SCHEDULE.DELETE_SESSION}
                    aria-label={MSG_SCHEDULE.DELETE_SESSION}
                    onClick={() => setPendingDelete(editing)}
                  />
                ) : null}
                <Button type="button" variant="secondary" size="lg" label="Hủy" onClick={closeForm} />
                {readOnly ? null : (
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    label={editing ? MSG_SCHEDULE.SAVE : MSG_SCHEDULE.SAVE_NEW}
                    isLoading={savePending}
                  />
                )}
              </HStack>
            </VStack>
          </form>
        ) : null}
      </Dialog>

      <AlertDialog
        isOpen={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={MSG_SCHEDULE.DELETE_SESSION}
        description={
          pendingDelete
            ? `Buổi học của ${sessionLabel(pendingDelete)} sẽ bị xoá. Bạn có chắc muốn xoá?`
            : ''
        }
        cancelLabel="Hủy"
        actionLabel="Xoá"
        actionVariant="destructive"
        isActionLoading={deleteMut.isPending}
        onAction={() => {
          if (pendingDelete) deleteMut.mutate(pendingDelete.id);
        }}
      />
    </Stack>
  );
}
