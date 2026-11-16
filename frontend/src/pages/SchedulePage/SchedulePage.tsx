import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  AutoComplete,
  Button,
  DatePicker,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useMemo, useState } from 'react';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import { useNotify } from '../../components/LiveAnnouncer/LiveAnnouncer';
import PageHeader from '../../components/PageHeader/PageHeader';
import {
  canCancelSchedule,
  canCreateSchedule,
  canDeleteSchedule,
  canUpdateSchedule,
  canViewClasses,
  canViewSchedule,
  isOwnerRole,
} from '../../features/auth/permissions';
import DepartmentSelect from '../../features/operations/DepartmentSelect';
import { MSG_OPS, MSG_SCHEDULE } from '../../features/operations/operationsMessages';
import {
  cancelSchedule,
  createSchedule,
  deleteSchedule,
  fetchRoomSuggestions,
  fetchSchedules,
  isModuleDisabledError,
  operationsErrorMessage,
  updateSchedule,
} from '../../features/operations/operationsApi';
import type { ScheduleItem, SchedulePayload } from '../../features/operations/types';
import { useDepartmentScope } from '../../features/operations/useDepartmentScope';
import { fetchClasses } from '../../features/sprint4/sprint4Api';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface ScheduleFormValues {
  classId: string;
  teacherId?: string;
  roomId?: string;
  time: [Dayjs, Dayjs];
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: MSG_SCHEDULE.STATUS_SCHEDULED,
  cancelled: MSG_SCHEDULE.STATUS_CANCELLED,
  completed: MSG_SCHEDULE.STATUS_COMPLETED,
};

const STATUS_TAG: Record<string, string> = {
  scheduled: 'blue',
  cancelled: 'default',
  completed: 'green',
};

function formatWindow(start: string, end: string): string {
  return `${dayjs(start).format('DD/MM/YYYY HH:mm')} – ${dayjs(end).format('HH:mm')}`;
}

/** Màn lịch học của phòng ban: xem, thêm, sửa, hủy và xóa buổi học. */
export default function SchedulePage() {
  const { token } = theme.useToken();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const isOwner = isOwnerRole(backendRoles);

  const canView = canViewSchedule(isOwner, permissions);
  const canCreate = canCreateSchedule(isOwner, permissions);
  const canUpdate = canUpdateSchedule(isOwner, permissions);
  const canCancel = canCancelSchedule(isOwner, permissions);
  const canDelete = canDeleteSchedule(isOwner, permissions);
  const canSeeClassOptions = canViewClasses(isOwner, permissions);

  const scope = useDepartmentScope();
  const departmentId = scope.departmentId;

  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [
    dayjs().startOf('week'),
    dayjs().startOf('week').add(7, 'day'),
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form] = Form.useForm<ScheduleFormValues>();
  const watchedTime = Form.useWatch('time', form) as [Dayjs, Dayjs] | undefined;

  const from = range[0].startOf('day').toISOString();
  const to = range[1].endOf('day').toISOString();

  const listQuery = useQuery({
    queryKey: ['schedules', departmentId, from, to],
    queryFn: () => fetchSchedules(departmentId as string, { from, to }),
    enabled: canView && !!departmentId,
  });

  const classOptionsQuery = useQuery({
    queryKey: ['classes', 'schedule-options'],
    queryFn: () => fetchClasses({ page: 1, size: 100 }),
    enabled: canSeeClassOptions && modalOpen,
  });

  const suggestionsQuery = useQuery({
    queryKey: ['room-suggestions', departmentId, watchedTime?.[0]?.valueOf(), watchedTime?.[1]?.valueOf()],
    queryFn: () =>
      fetchRoomSuggestions(
        departmentId as string,
        watchedTime![0].toISOString(),
        watchedTime![1].toISOString(),
      ),
    enabled:
      modalOpen &&
      canCreate &&
      !!departmentId &&
      !!watchedTime?.[0] &&
      !!watchedTime?.[1] &&
      watchedTime[1].isAfter(watchedTime[0]),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string | null; payload: SchedulePayload }) =>
      id ? updateSchedule(departmentId as string, id, payload) : createSchedule(departmentId as string, payload),
    onSuccess: (_data, variables) => {
      notify.success(variables.id ? MSG_SCHEDULE.UPDATED : MSG_SCHEDULE.CREATED);
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (error) => setFormError(operationsErrorMessage(error)),
  });

  const cancelMutation = useMutation({
    mutationFn: (sessionId: string) => cancelSchedule(departmentId as string, sessionId),
    onSuccess: () => {
      notify.success(MSG_SCHEDULE.CANCELLED);
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (error) => notify.error(operationsErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => deleteSchedule(departmentId as string, sessionId),
    onSuccess: () => {
      notify.success(MSG_SCHEDULE.DELETED);
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (error) => notify.error(operationsErrorMessage(error)),
  });

  const classOptions = useMemo(
    () =>
      (classOptionsQuery.data?.items ?? []).map((item) => ({
        value: item.id,
        label: `${item.classCode ?? item.id} — ${item.name ?? ''}`.trim(),
      })),
    [classOptionsQuery.data],
  );

  const roomOptions = useMemo(
    () =>
      (suggestionsQuery.data ?? []).map((room) => ({
        value: room.id,
        label: `${room.code} — ${room.name} (${room.capacity} chỗ)`,
      })),
    [suggestionsQuery.data],
  );

  function openCreate() {
    setEditing(null);
    setFormError(null);
    form.resetFields();
    const start = dayjs().add(1, 'day').hour(8).minute(0).second(0).millisecond(0);
    form.setFieldsValue({ time: [start, start.add(90, 'minute')] });
    setModalOpen(true);
  }

  const openEdit = useCallback(
    (record: ScheduleItem) => {
      setEditing(record);
      setFormError(null);
      form.setFieldsValue({
        classId: record.classId,
        teacherId: record.teacherId ?? undefined,
        roomId: record.roomId ?? undefined,
        time: [dayjs(record.startTime), dayjs(record.endTime)],
      });
      setModalOpen(true);
    },
    [form],
  );

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setFormError(null);
    form.resetFields();
  }

  function submit(values: ScheduleFormValues) {
    saveMutation.mutate({
      id: editing?.id ?? null,
      payload: {
        classId: values.classId.trim(),
        teacherId: values.teacherId?.trim() || null,
        roomId: values.roomId || null,
        startTime: values.time[0].toISOString(),
        endTime: values.time[1].toISOString(),
      },
    });
  }

  const columns = useMemo<ColumnsType<ScheduleItem>>(
    () => [
      {
        title: MSG_SCHEDULE.COL_TIME,
        key: 'time',
        width: 230,
        render: (_, record) => formatWindow(record.startTime, record.endTime),
      },
      {
        title: MSG_SCHEDULE.COL_CLASS,
        dataIndex: 'className',
        render: (value: string | null, record) => value || record.classId,
      },
      {
        title: MSG_SCHEDULE.COL_TEACHER,
        dataIndex: 'teacherId',
        width: 220,
        render: (value: string | null) =>
          value || <Text type="secondary">{MSG_SCHEDULE.TEACHER_UNASSIGNED}</Text>,
      },
      {
        title: MSG_SCHEDULE.COL_ROOM,
        dataIndex: 'roomId',
        width: 160,
        render: (value: string | null) =>
          value || <Text type="secondary">{MSG_SCHEDULE.ROOM_NONE}</Text>,
      },
      {
        title: MSG_SCHEDULE.COL_STATUS,
        dataIndex: 'status',
        width: 130,
        render: (value: string) => (
          <Tag color={STATUS_TAG[value] ?? 'default'}>{STATUS_LABEL[value] ?? value}</Tag>
        ),
      },
      {
        title: MSG_SCHEDULE.COL_ACTIONS,
        key: 'actions',
        width: 230,
        render: (_, record) => (
          <Space size={4} wrap>
            {canUpdate && record.status !== 'cancelled' && (
              <Button size="small" onClick={() => openEdit(record)}>
                {MSG_OPS.EDIT}
              </Button>
            )}
            {canCancel && record.status === 'scheduled' && (
              <Popconfirm
                title={MSG_SCHEDULE.CANCEL_TITLE}
                description={MSG_SCHEDULE.CANCEL_CONFIRM}
                okText={MSG_SCHEDULE.CANCEL_TITLE}
                cancelText={MSG_OPS.CLOSE}
                onConfirm={() => cancelMutation.mutate(record.id)}
              >
                <Button size="small">{MSG_SCHEDULE.CANCEL_TITLE}</Button>
              </Popconfirm>
            )}
            {canDelete && (
              <Popconfirm
                title={MSG_SCHEDULE.DELETE_TITLE}
                description={MSG_SCHEDULE.DELETE_CONFIRM}
                okText={MSG_OPS.DELETE}
                cancelText={MSG_OPS.CLOSE}
                onConfirm={() => deleteMutation.mutate(record.id)}
              >
                <Button size="small" danger>
                  {MSG_OPS.DELETE}
                </Button>
              </Popconfirm>
            )}
          </Space>
        ),
      },
    ],
    [canUpdate, canCancel, canDelete, cancelMutation, deleteMutation, openEdit],
  );

  return (
    <Flex vertical gap={token.marginMD}>
      <PageHeader
        title={MSG_SCHEDULE.TITLE}
        extra={
          canCreate && departmentId ? (
            <Button type="primary" onClick={openCreate}>
              {MSG_SCHEDULE.CREATE}
            </Button>
          ) : undefined
        }
      >
        <Flex gap={token.marginSM} wrap="wrap" align="center" style={{ marginTop: token.marginXS }}>
          <DepartmentSelect scope={scope} />
          <RangePicker
            allowClear={false}
            format="DD/MM/YYYY"
            value={range}
            onChange={(value) => {
              if (value?.[0] && value?.[1]) setRange([value[0], value[1]]);
            }}
          />
          <Text type="secondary">{MSG_SCHEDULE.SUBTITLE}</Text>
        </Flex>
      </PageHeader>

      {!canView ? (
        <ForbiddenNotice />
      ) : !departmentId ? (
        <Alert type="warning" showIcon message={MSG_OPS.DEPARTMENT_REQUIRED} />
      ) : listQuery.isError ? (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={isModuleDisabledError(listQuery.error) ? MSG_OPS.MODULE_DISABLED : MSG_SCHEDULE.LIST_LOAD_ERROR}
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
          locale={{ emptyText: <Empty description={MSG_SCHEDULE.EMPTY} /> }}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          scroll={{ x: 1100 }}
        />
      )}

      <Modal
        title={editing ? MSG_SCHEDULE.EDIT : MSG_SCHEDULE.CREATE}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        okText={MSG_OPS.SAVE}
        cancelText={MSG_OPS.CANCEL}
        confirmLoading={saveMutation.isPending}
        width={640}
        forceRender
      >
        {formError && (
          <Alert type="error" showIcon message={formError} style={{ marginBottom: token.margin }} />
        )}

        <Form form={form} layout="vertical" requiredMark onFinish={submit}>
          <Form.Item
            name="classId"
            label={MSG_SCHEDULE.CLASS}
            rules={[{ required: true, message: MSG_SCHEDULE.CLASS_REQUIRED }]}
          >
            <AutoComplete
              options={classOptions}
              placeholder={MSG_SCHEDULE.CLASS_PLACEHOLDER}
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item name="teacherId" label={MSG_SCHEDULE.TEACHER}>
            <Input allowClear placeholder={MSG_SCHEDULE.TEACHER_PLACEHOLDER} />
          </Form.Item>

          <Form.Item name="roomId" label={MSG_SCHEDULE.ROOM}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              loading={suggestionsQuery.isLoading}
              placeholder={MSG_SCHEDULE.ROOM_PLACEHOLDER}
              options={roomOptions}
              notFoundContent={MSG_SCHEDULE.ROOM_EMPTY}
            />
          </Form.Item>

          <Form.Item
            name="time"
            label={`${MSG_SCHEDULE.START_TIME} – ${MSG_SCHEDULE.END_TIME}`}
            rules={[
              {
                validator: (_, value: [Dayjs, Dayjs] | undefined) => {
                  if (!value?.[0] || !value?.[1]) return Promise.reject(new Error(MSG_SCHEDULE.TIME_REQUIRED));
                  if (!value[1].isAfter(value[0])) return Promise.reject(new Error(MSG_SCHEDULE.TIME_INVALID));
                  return Promise.resolve();
                },
              },
            ]}
          >
            <DatePicker.RangePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  );
}
