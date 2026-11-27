import {
  Banner,
  Button,
  CheckboxList,
  CheckboxListItem,
  DateRangeInput,
  Field,
  HStack,
  NumberInput,
  SegmentedControl,
  SegmentedControlItem,
  Selector,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  VStack,
  pixel,
  proportional,
} from '@astryxdesign/core';
import type { DateRange, ISODateString, TableColumn } from '@astryxdesign/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import type * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import EmptyState from '../../components/EmptyState/EmptyState';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import { hasAnyPermissionWithAliases, isOwnerRole } from '../../features/auth/permissions';
import { generateAutoSchedule } from '../../features/schedule/autoScheduleApi';
import type {
  AutoSchedulePayload,
  AutoScheduleResult,
  AutoScheduleSlot,
  AutoScheduleUnscheduled,
} from '../../features/schedule/autoScheduleApi';
import {
  classOptionLabel,
  DAYS_OPTIONS,
  DEFAULT_TIME_SLOTS,
  isContiguous45Slots,
  sessionDaysFromValues,
} from '../../features/schedule/autoScheduleHelpers';
import { MSG_AUTO } from '../../features/schedule/autoScheduleMessages';
import { MSG_SCHEDULE } from '../../features/schedule/scheduleMessages';
import { scheduleErrorMessage as scheduleErrorText } from '../../features/schedule/scheduleApi';
import type { ScheduleItem } from '../../features/schedule/types';
import { formatDateTime } from '../../features/sprint4/labels';
import { fetchClasses } from '../../features/sprint4/sprint4Api';
import { linkWithDepartmentId } from '../../components/AppLink/AppLink';
import { useFormState } from '../../hooks/useFormState';
import { useNotify } from '../../hooks/useNotify';
import { useAuthStore } from '../../stores/authStore';

type AutoScheduleSource = 'curriculum' | 'manual';

type AutoScheduleValues = {
  classId: string | null;
  source: AutoScheduleSource;
  dateRange: DateRange | null;
  days: string[];
  sessionsPerWeek: number | null;
  minutesPerSession: number | null;
  auto: boolean;
  slots: AutoScheduleSlot[];
};

/** `Table` buộc `T extends Record<string, unknown>` — chỉ giao thêm kiểu ở render. */
type PreviewRow = ScheduleItem & Record<string, unknown>;
type UnscheduledRow = AutoScheduleUnscheduled & Record<string, unknown>;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function shift45(time: string): string {
  if (!TIME_PATTERN.test(time)) return '08:15';
  const [hours, minutes] = time.split(':').map(Number);
  const total = hours * 60 + minutes + 45;
  const nextHours = Math.floor(total / 60) % 24;
  return `${String(nextHours).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function isoDateOrNull(value: string | null): ISODateString | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? (value as ISODateString) : null;
}

/**
 * Màn xếp lịch tự động (`/dao-tao/tu-dong-xep-lich`).
 *
 * Luồng đã chốt (S5): "Tạo nháp lịch" gọi `dryRun=true` để xem trước, KHÔNG ghi
 * DB và KHÔNG báo đã xếp xong. Chỉ "Xác nhận xếp lịch" gọi `dryRun=false`, báo
 * thành công và invalidate `['schedules', departmentId]`.
 */
export default function AutoSchedulePage(): React.JSX.Element {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const departmentId = searchParams.get('departmentId') ?? '';

  const permissions = useAuthStore((s) => s.permissions);
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const isOwner = isOwnerRole(backendRoles);
  const canCreate = isOwner || hasAnyPermissionWithAliases(permissions, ['schedule.create']);

  const fromParam = isoDateOrNull(searchParams.get('from'));
  const toParam = isoDateOrNull(searchParams.get('to'));
  const initialValues: AutoScheduleValues = {
    classId: null,
    source: 'curriculum',
    dateRange: fromParam && toParam ? { start: fromParam, end: toParam } : null,
    days: [],
    sessionsPerWeek: 2,
    minutesPerSession: 45,
    auto: true,
    slots: DEFAULT_TIME_SLOTS.map((slot) => ({ ...slot })),
  };

  const form = useFormState<AutoScheduleValues>(initialValues, {
    classId: (value) => (value ? undefined : MSG_AUTO.REQUIRED_CLASS),
    dateRange: (value) =>
      value?.start && value?.end ? undefined : MSG_AUTO.REQUIRED_DATE,
    days: (value) => (value.length > 0 ? undefined : MSG_AUTO.REQUIRED_DAYS),
    slots: (value) => (isContiguous45Slots(value) ? undefined : MSG_AUTO.INVALID_SLOTS),
    minutesPerSession: (value) =>
      value !== null && value > 0 ? undefined : MSG_AUTO.INVALID_MINUTES,
    auto: (value) => (value ? undefined : MSG_AUTO.AUTO_REQUIRED),
  });
  const { values } = form;
  const sourceLabelId = useId();

  const [preview, setPreview] = useState<AutoScheduleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['auto-schedule', 'classes', { page: 1, size: 100 }],
    queryFn: () => fetchClasses({ page: 1, size: 100 }),
    // Màn này là màn ghi — chỉ tải lớp cho người có schedule.create.
    enabled: canCreate,
  });
  const classes = listQuery.data?.items ?? [];

  const update = <K extends keyof AutoScheduleValues>(key: K, value: AutoScheduleValues[K]) => {
    form.setValue(key, value);
    // Đổi cấu hình thì bản nháp cũ không còn đại diện cho form hiện tại.
    setPreview(null);
    setError(null);
    setSuccess(null);
  };

  const updateSlot = (index: number, field: keyof AutoScheduleSlot, value: string) => {
    const slots = values.slots.map((slot, i) =>
      i === index ? { ...slot, [field]: value } : slot,
    );
    update('slots', slots);
  };

  const addSlot = () => {
    const last = values.slots[values.slots.length - 1];
    const start = last?.endTime ?? '07:30';
    update('slots', [...values.slots, { startTime: start, endTime: shift45(start) }]);
  };

  const removeSlot = (index: number) => {
    update(
      'slots',
      values.slots.filter((_, i) => i !== index),
    );
  };

  const buildPayload = (): AutoSchedulePayload | null => {
    if (!departmentId) {
      setError(MSG_AUTO.REQUIRED_DEPARTMENT);
      return null;
    }
    if (!form.validate()) return null;
    if (!values.classId || !values.dateRange) return null;

    return {
      classIds: [values.classId],
      dateFrom: values.dateRange.start,
      dateTo: values.dateRange.end,
      slots: values.slots.map((slot) => ({
        startTime: slot.startTime.trim(),
        endTime: slot.endTime.trim(),
      })),
      sessionDays: sessionDaysFromValues(values.days),
      // S1/D8: chỉ nguồn "Nhập tay" mới override số buổi/phút; nguồn chương trình
      // dùng giá trị đã lưu trên class_subject.
      ...(values.source === 'manual'
        ? {
            sessionsPerWeek: values.sessionsPerWeek ?? undefined,
            sessionMinutes: values.minutesPerSession ?? undefined,
          }
        : {}),
    };
  };

  const draftMut = useMutation({
    mutationFn: (payload: AutoSchedulePayload) => generateAutoSchedule(departmentId, payload, true),
    onSuccess: (result) => {
      setPreview(result);
      setError(null);
      setSuccess(null);
    },
    onError: (cause) => {
      setPreview(null);
      setError(scheduleErrorText(cause));
    },
  });

  const confirmMut = useMutation({
    mutationFn: (payload: AutoSchedulePayload) =>
      generateAutoSchedule(departmentId, payload, false),
    onSuccess: () => {
      setSuccess(MSG_AUTO.CONFIRM_SUCCESS);
      setPreview(null);
      setError(null);
      notify.success(MSG_AUTO.CONFIRM_SUCCESS);
      // Chỉ invalidate sau khi BE xác nhận ghi DB thành công.
      void queryClient.invalidateQueries({ queryKey: ['schedules', departmentId] });
    },
    onError: (cause) => {
      setError(scheduleErrorText(cause));
      setSuccess(null);
    },
  });

  const pending = draftMut.isPending || confirmMut.isPending;

  const handleDraft = () => {
    const payload = buildPayload();
    if (payload) draftMut.mutate(payload);
  };

  const handleConfirm = () => {
    if (!preview) {
      setError(MSG_AUTO.NEED_DRAFT);
      return;
    }
    const payload = buildPayload();
    if (payload) confirmMut.mutate(payload);
  };

  const previewColumns: TableColumn<PreviewRow>[] = [
    {
      key: 'startTime',
      header: MSG_AUTO.PREVIEW_TIME,
      width: pixel(220),
      renderCell: (row) => `${formatDateTime(row.startTime)} — ${formatDateTime(row.endTime)}`,
    },
    {
      key: 'className',
      header: MSG_AUTO.PREVIEW_CLASS,
      width: proportional(1, { minWidth: 140 }),
      renderCell: (row) => row.className || row.classId,
    },
    {
      key: 'subjectName',
      header: MSG_AUTO.PREVIEW_SUBJECT,
      width: proportional(1, { minWidth: 140 }),
      renderCell: (row) => row.subjectName || '—',
    },
    {
      key: 'teacherName',
      header: MSG_AUTO.PREVIEW_TEACHER,
      width: proportional(1, { minWidth: 160 }),
      renderCell: (row) => row.teacherName || row.teacherId || '—',
    },
    {
      key: 'roomCode',
      header: MSG_AUTO.PREVIEW_ROOM,
      width: pixel(120),
      renderCell: (row) => row.roomCode || row.roomId || '—',
    },
  ];

  const unscheduledColumns: TableColumn<UnscheduledRow>[] = [
    {
      key: 'className',
      header: MSG_AUTO.UNSCHEDULED_CLASS,
      width: proportional(1, { minWidth: 140 }),
      renderCell: (row) => row.className || row.classId,
    },
    {
      key: 'subjectName',
      header: MSG_AUTO.UNSCHEDULED_SUBJECT,
      width: proportional(1, { minWidth: 140 }),
      renderCell: (row) => row.subjectName || '—',
    },
    {
      key: 'reason',
      header: MSG_AUTO.UNSCHEDULED_REASON,
      width: proportional(2, { minWidth: 240 }),
      renderCell: (row) => row.reason,
    },
  ];

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader
        title={MSG_AUTO.TITLE}
        breadcrumb={[
          {
            title: MSG_SCHEDULE.TITLE,
            href: linkWithDepartmentId('/dao-tao/lich', departmentId),
          },
          { title: MSG_AUTO.TITLE },
        ]}
      />

      {!canCreate ? (
        <ForbiddenNotice title={MSG_AUTO.NO_PERMISSION_MESSAGE} />
      ) : (
        <>
          <Text>{MSG_AUTO.ROOM_INFO}</Text>
          <Banner
            status="info"
            title={MSG_AUTO.BANNER_TITLE}
            description={MSG_AUTO.BANNER_DESCRIPTION}
            collapsible={false}
          />

          {listQuery.isPending ? (
            <VStack gap={2} role="status" aria-live="polite" aria-busy="true">
              <Text type="label">{MSG_AUTO.LOADING_LABEL}</Text>
              <Skeleton height={36} radius={2} />
            </VStack>
          ) : listQuery.isError ? (
            <Banner
              status="error"
              title={MSG_AUTO.ERROR_TITLE}
              description={MSG_AUTO.ERROR_DESCRIPTION}
              collapsible={false}
              role="alert"
              endContent={
                <Button
                  variant="secondary"
                  size="sm"
                  label={MSG_AUTO.RETRY_LABEL}
                  onClick={() => void listQuery.refetch()}
                />
              }
            />
          ) : classes.length === 0 ? (
            <EmptyState description={MSG_AUTO.EMPTY_TITLE} />
          ) : (
            <Selector
              label={MSG_AUTO.CLASS_LABEL}
              options={classes.map((c) => ({ value: c.id, label: classOptionLabel(c) }))}
              value={values.classId ?? undefined}
              onChange={(value) => update('classId', value)}
            />
          )}
          {form.errorOf('classId') ? (
            <Text type="supporting">{form.errorOf('classId')}</Text>
          ) : null}

          <Field
            label={MSG_AUTO.SOURCE_LABEL}
            inputID={sourceLabelId}
            labelID={sourceLabelId}
            isGroupLabel
          >
            <SegmentedControl
              label={MSG_AUTO.SOURCE_LABEL}
              aria-labelledby={sourceLabelId}
              value={values.source}
              onChange={(value) => update('source', value as AutoScheduleSource)}
            >
              <SegmentedControlItem value="curriculum" label={MSG_AUTO.SOURCE_CURRICULUM} />
              <SegmentedControlItem value="manual" label={MSG_AUTO.SOURCE_MANUAL} />
            </SegmentedControl>
          </Field>

          <DateRangeInput
            label={MSG_AUTO.DATE_LABEL}
            value={values.dateRange}
            onChange={(value) => update('dateRange', value)}
          />
          {form.errorOf('dateRange') ? (
            <Text type="supporting">{form.errorOf('dateRange')}</Text>
          ) : null}

          <CheckboxList
            label={MSG_AUTO.DAYS_LABEL}
            value={values.days}
            onChange={(days) => update('days', days)}
          >
            {DAYS_OPTIONS.map((day) => (
              <CheckboxListItem key={day.value} value={day.value} label={day.label} />
            ))}
          </CheckboxList>
          {form.errorOf('days') ? (
            <Text type="supporting">{form.errorOf('days')}</Text>
          ) : null}

          {values.source === 'manual' ? (
            <HStack gap={3} wrap="wrap">
              <NumberInput
                label={MSG_AUTO.SESSIONS_LABEL}
                value={values.sessionsPerWeek}
                onChange={(value) => update('sessionsPerWeek', value)}
                min={1}
                isIntegerOnly
              />
              <NumberInput
                label={MSG_AUTO.MINUTES_LABEL}
                value={values.minutesPerSession}
                onChange={(value) => update('minutesPerSession', value)}
                min={1}
                isIntegerOnly
              />
            </HStack>
          ) : null}
          {form.errorOf('minutesPerSession') ? (
            <Text type="supporting">{form.errorOf('minutesPerSession')}</Text>
          ) : null}

          <VStack gap={2} role="group" aria-label={MSG_AUTO.SLOT_TITLE}>
            <Text type="label">{MSG_AUTO.SLOT_TITLE}</Text>
            <Text type="supporting">{MSG_AUTO.SLOT_DESCRIPTION}</Text>
            {values.slots.map((slot, index) => (
              <HStack key={index} gap={2} wrap="wrap" align="end">
                <TextInput
                  label={`${MSG_AUTO.SLOT_START_LABEL} ${index + 1}`}
                  value={slot.startTime}
                  onChange={(value) => updateSlot(index, 'startTime', value)}
                  placeholder="07:30"
                  width={120}
                />
                <TextInput
                  label={`${MSG_AUTO.SLOT_END_LABEL} ${index + 1}`}
                  value={slot.endTime}
                  onChange={(value) => updateSlot(index, 'endTime', value)}
                  placeholder="08:15"
                  width={120}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  label={`${MSG_AUTO.SLOT_REMOVE} ${index + 1}`}
                  onClick={() => removeSlot(index)}
                />
              </HStack>
            ))}
            <Button variant="secondary" size="sm" label={MSG_AUTO.SLOT_ADD} onClick={addSlot} />
          </VStack>
          {form.errorOf('slots') ? (
            <Text type="supporting">{form.errorOf('slots')}</Text>
          ) : null}

          <Switch
            label={MSG_AUTO.AUTO_TOGGLE_LABEL}
            description={MSG_AUTO.AUTO_TOGGLE_HELP}
            value={values.auto}
            onChange={(checked) => update('auto', checked)}
          />

          <HStack gap={2} align="center" wrap="wrap">
            <Button
              type="button"
              variant="primary"
              size="lg"
              label={MSG_AUTO.SUBMIT_DRAFT}
              isDisabled={!canCreate || !departmentId || pending}
              isLoading={draftMut.isPending}
              onClick={handleDraft}
            />
            <Button
              type="button"
              variant="secondary"
              size="lg"
              label={MSG_AUTO.SUBMIT_CONFIRM}
              isDisabled={!canCreate || !departmentId || !preview || pending}
              isLoading={confirmMut.isPending}
              onClick={handleConfirm}
            />
          </HStack>

          {error ? (
            <Banner
              status="error"
              title={MSG_AUTO.GENERATE_ERROR_TITLE}
              description={error}
              collapsible={false}
              role="alert"
            />
          ) : null}

          {success ? (
            <Banner status="success" title={success} collapsible={false} role="status" />
          ) : null}

          {preview ? (
            <VStack gap={3}>
              <Banner
                status="info"
                title={MSG_AUTO.PREVIEW_TITLE}
                description={MSG_AUTO.PREVIEW_DESCRIPTION}
                collapsible={false}
                role="status"
              />
              <Table<PreviewRow>
                data={preview.scheduled as PreviewRow[]}
                columns={previewColumns}
                idKey="id"
                hasHover
                textOverflow="truncate"
                emptyState={<EmptyState description={MSG_AUTO.PREVIEW_EMPTY} compact />}
              />
              <Text type="label">{MSG_AUTO.UNSCHEDULED_TITLE}</Text>
              <Table<UnscheduledRow>
                data={preview.unscheduled as UnscheduledRow[]}
                columns={unscheduledColumns}
                idKey="classId"
                hasHover
                textOverflow="truncate"
                emptyState={<EmptyState description={MSG_AUTO.UNSCHEDULED_EMPTY} compact />}
              />
            </VStack>
          ) : null}
        </>
      )}
    </Stack>
  );
}
