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
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  theme,
} from 'antd';
import type { TabsProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import { useNotify } from '../../components/LiveAnnouncer/LiveAnnouncer';
import PageHeader from '../../components/PageHeader/PageHeader';
import {
  canManageEquipment,
  canManageRooms,
  canReportIssues,
  canResolveIssues,
  canViewEquipment,
  canViewFacility,
  canViewIssues,
  canViewRooms,
  isOwnerRole,
} from '../../features/auth/permissions';
import DepartmentSelect from '../../features/operations/DepartmentSelect';
import { MSG_FACILITY, MSG_OPS } from '../../features/operations/operationsMessages';
import {
  createEquipment,
  createRoom,
  deleteEquipment,
  deleteRoom,
  fetchEquipment,
  fetchIssues,
  fetchRooms,
  isModuleDisabledError,
  operationsErrorMessage,
  reportIssue,
  resolveIssue,
  updateEquipment,
  updateRoom,
} from '../../features/operations/operationsApi';
import type {
  EquipmentItem,
  IssueItem,
  RoomItem,
  RoomPayload,
} from '../../features/operations/types';
import { useDepartmentScope } from '../../features/operations/useDepartmentScope';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;
const ACTIONS_COLUMN = 'Thao tác';

const ROOM_TYPE_LABEL: Record<string, string> = {
  classroom: MSG_FACILITY.ROOM_TYPE_CLASSROOM,
  computer_room: MSG_FACILITY.ROOM_TYPE_COMPUTER,
};

const ROOM_STATUS_LABEL: Record<string, string> = {
  active: MSG_FACILITY.ROOM_STATUS_ACTIVE,
  maintenance: MSG_FACILITY.ROOM_STATUS_MAINTENANCE,
  closed: MSG_FACILITY.ROOM_STATUS_CLOSED,
};

const ROOM_STATUS_TAG: Record<string, string> = {
  active: 'green',
  maintenance: 'orange',
  closed: 'default',
};

const EQUIPMENT_STATUS_LABEL: Record<string, string> = {
  in_use: MSG_FACILITY.EQUIPMENT_STATUS_IN_USE,
  broken: MSG_FACILITY.EQUIPMENT_STATUS_BROKEN,
  maintenance: MSG_FACILITY.EQUIPMENT_STATUS_MAINTENANCE,
  in_storage: MSG_FACILITY.EQUIPMENT_STATUS_IN_STORAGE,
  retired: MSG_FACILITY.EQUIPMENT_STATUS_RETIRED,
};

const EQUIPMENT_STATUS_TAG: Record<string, string> = {
  in_use: 'green',
  broken: 'red',
  maintenance: 'orange',
  in_storage: 'blue',
  retired: 'default',
};

interface RoomFormValues {
  code: string;
  name: string;
  building?: string;
  floor?: string;
  capacity: number;
  roomType?: string;
  status?: string;
}

interface EquipmentFormValues {
  assetCode: string;
  name: string;
  equipmentType?: string;
  roomId?: string;
  status?: string;
  purchaseDate?: Dayjs | null;
}

interface IssueFormValues {
  equipmentId: string;
  description: string;
  photoUrl?: string;
}

/** Màn quản lý phòng/thiết bị/sự cố của phòng ban. Mỗi tab theo một nhóm quyền riêng. */
export default function FacilityPage() {
  const { token } = theme.useToken();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const isOwner = isOwnerRole(backendRoles);

  const allowed = canViewFacility(isOwner, permissions);
  const roomsAllowed = canViewRooms(isOwner, permissions);
  const canEditRooms = canManageRooms(isOwner, permissions);
  const equipmentAllowed = canViewEquipment(isOwner, permissions);
  const canEditEquipment = canManageEquipment(isOwner, permissions);
  const issuesAllowed = canViewIssues(isOwner, permissions);
  const canReport = canReportIssues(isOwner, permissions);
  const canResolve = canResolveIssues(isOwner, permissions);

  const scope = useDepartmentScope();
  const departmentId = scope.departmentId;

  const [tab, setTab] = useState<string>('rooms');
  const [roomModal, setRoomModal] = useState<{ open: boolean; editing: RoomItem | null }>({
    open: false,
    editing: null,
  });
  const [equipmentModal, setEquipmentModal] = useState<{ open: boolean; editing: EquipmentItem | null }>({
    open: false,
    editing: null,
  });
  const [issueModal, setIssueModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [roomForm] = Form.useForm<RoomFormValues>();
  const [equipmentForm] = Form.useForm<EquipmentFormValues>();
  const [issueForm] = Form.useForm<IssueFormValues>();

  const roomsQuery = useQuery({
    queryKey: ['facility', 'rooms', departmentId],
    queryFn: () => fetchRooms(departmentId as string),
    enabled: !!departmentId && (roomsAllowed || equipmentAllowed || issuesAllowed),
  });

  const equipmentQuery = useQuery({
    queryKey: ['facility', 'equipment', departmentId],
    queryFn: () => fetchEquipment(departmentId as string),
    enabled: !!departmentId && (equipmentAllowed || issuesAllowed),
  });

  const issuesQuery = useQuery({
    queryKey: ['facility', 'issues', departmentId],
    queryFn: () => fetchIssues(departmentId as string),
    enabled: !!departmentId && issuesAllowed && tab === 'issues',
  });

  const roomSave = useMutation({
    mutationFn: ({ id, payload }: { id: string | null; payload: RoomPayload }) =>
      id ? updateRoom(departmentId as string, id, payload) : createRoom(departmentId as string, payload),
    onSuccess: (_data, variables) => {
      notify.success(variables.id ? MSG_FACILITY.ROOM_UPDATED : MSG_FACILITY.ROOM_CREATED);
      closeRoomModal();
      queryClient.invalidateQueries({ queryKey: ['facility', 'rooms'] });
    },
    onError: (error) => setFormError(operationsErrorMessage(error)),
  });

  const roomDelete = useMutation({
    mutationFn: (roomId: string) => deleteRoom(departmentId as string, roomId),
    onSuccess: () => {
      notify.success(MSG_FACILITY.ROOM_DELETED);
      queryClient.invalidateQueries({ queryKey: ['facility', 'rooms'] });
    },
    onError: (error) => notify.error(operationsErrorMessage(error)),
  });

  const equipmentSave = useMutation({
    mutationFn: ({ id, payload }: { id: string | null; payload: Parameters<typeof createEquipment>[1] }) =>
      id
        ? updateEquipment(departmentId as string, id, payload)
        : createEquipment(departmentId as string, payload),
    onSuccess: (_data, variables) => {
      notify.success(variables.id ? MSG_FACILITY.EQUIPMENT_UPDATED : MSG_FACILITY.EQUIPMENT_CREATED);
      closeEquipmentModal();
      queryClient.invalidateQueries({ queryKey: ['facility', 'equipment'] });
    },
    onError: (error) => setFormError(operationsErrorMessage(error)),
  });

  const equipmentDelete = useMutation({
    mutationFn: (equipmentId: string) => deleteEquipment(departmentId as string, equipmentId),
    onSuccess: () => {
      notify.success(MSG_FACILITY.EQUIPMENT_DELETED);
      queryClient.invalidateQueries({ queryKey: ['facility', 'equipment'] });
    },
    onError: (error) => notify.error(operationsErrorMessage(error)),
  });

  const issueReport = useMutation({
    mutationFn: (payload: Parameters<typeof reportIssue>[1]) =>
      reportIssue(departmentId as string, payload),
    onSuccess: () => {
      notify.success(MSG_FACILITY.ISSUE_REPORTED);
      setIssueModal(false);
      setFormError(null);
      issueForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['facility', 'issues'] });
      queryClient.invalidateQueries({ queryKey: ['facility', 'equipment'] });
    },
    onError: (error) => setFormError(operationsErrorMessage(error)),
  });

  const issueResolve = useMutation({
    mutationFn: (issueId: string) => resolveIssue(departmentId as string, issueId),
    onSuccess: () => {
      notify.success(MSG_FACILITY.ISSUE_RESOLVED);
      queryClient.invalidateQueries({ queryKey: ['facility', 'issues'] });
      queryClient.invalidateQueries({ queryKey: ['facility', 'equipment'] });
    },
    onError: (error) => notify.error(operationsErrorMessage(error)),
  });

  function closeRoomModal() {
    setRoomModal({ open: false, editing: null });
    setFormError(null);
    roomForm.resetFields();
  }

  function closeEquipmentModal() {
    setEquipmentModal({ open: false, editing: null });
    setFormError(null);
    equipmentForm.resetFields();
  }

  const roomOptions = useMemo(
    () => (roomsQuery.data ?? []).map((room) => ({ value: room.id, label: `${room.code} — ${room.name}` })),
    [roomsQuery.data],
  );

  const equipmentOptions = useMemo(
    () =>
      (equipmentQuery.data ?? []).map((item) => ({
        value: item.id,
        label: `${item.assetCode} — ${item.name}`,
      })),
    [equipmentQuery.data],
  );

  const roomColumns = useMemo<ColumnsType<RoomItem>>(
    () => [
      { title: MSG_FACILITY.ROOM_CODE, dataIndex: 'code', width: 120 },
      { title: MSG_FACILITY.ROOM_NAME, dataIndex: 'name' },
      {
        title: MSG_FACILITY.ROOM_BUILDING,
        dataIndex: 'building',
        width: 140,
        render: (value: string | null) => value || '—',
      },
      {
        title: MSG_FACILITY.ROOM_FLOOR,
        dataIndex: 'floor',
        width: 90,
        render: (value: string | null) => value || '—',
      },
      { title: MSG_FACILITY.ROOM_CAPACITY, dataIndex: 'capacity', width: 110, align: 'right' },
      {
        title: MSG_FACILITY.ROOM_TYPE,
        dataIndex: 'roomType',
        width: 150,
        render: (value: string) => ROOM_TYPE_LABEL[value] ?? value,
      },
      {
        title: MSG_FACILITY.ROOM_STATUS,
        dataIndex: 'status',
        width: 130,
        render: (value: string) => (
          <Tag color={ROOM_STATUS_TAG[value] ?? 'default'}>{ROOM_STATUS_LABEL[value] ?? value}</Tag>
        ),
      },
      {
        title: ACTIONS_COLUMN,
        key: 'actions',
        width: 180,
        render: (_, record) =>
          canEditRooms ? (
            <Space size={4}>
              <Button
                size="small"
                onClick={() => {
                  setFormError(null);
                  roomForm.resetFields();
                  roomForm.setFieldsValue({
                    code: record.code,
                    name: record.name,
                    building: record.building ?? undefined,
                    floor: record.floor ?? undefined,
                    capacity: record.capacity,
                    roomType: record.roomType,
                    status: record.status,
                  });
                  setRoomModal({ open: true, editing: record });
                }}
              >
                {MSG_OPS.EDIT}
              </Button>
              <Popconfirm
                title={MSG_FACILITY.ROOM_DELETE_TITLE}
                description={MSG_FACILITY.ROOM_DELETE_CONFIRM}
                okText={MSG_OPS.DELETE}
                cancelText={MSG_OPS.CLOSE}
                onConfirm={() => roomDelete.mutate(record.id)}
              >
                <Button size="small" danger>
                  {MSG_OPS.DELETE}
                </Button>
              </Popconfirm>
            </Space>
          ) : null,
      },
    ],
    [canEditRooms, roomDelete, roomForm],
  );

  const equipmentColumns = useMemo<ColumnsType<EquipmentItem>>(
    () => [
      { title: MSG_FACILITY.EQUIPMENT_ASSET_CODE, dataIndex: 'assetCode', width: 140 },
      { title: MSG_FACILITY.EQUIPMENT_NAME, dataIndex: 'name' },
      {
        title: MSG_FACILITY.EQUIPMENT_TYPE,
        dataIndex: 'equipmentType',
        width: 160,
        render: (value: string | null) => value || '—',
      },
      {
        title: MSG_FACILITY.EQUIPMENT_ROOM,
        dataIndex: 'roomName',
        width: 180,
        render: (value: string | null) => value || <Text type="secondary">{MSG_FACILITY.EQUIPMENT_ROOM_NONE}</Text>,
      },
      {
        title: MSG_FACILITY.EQUIPMENT_STATUS,
        dataIndex: 'status',
        width: 130,
        render: (value: string) => (
          <Tag color={EQUIPMENT_STATUS_TAG[value] ?? 'default'}>
            {EQUIPMENT_STATUS_LABEL[value] ?? value}
          </Tag>
        ),
      },
      {
        title: MSG_FACILITY.EQUIPMENT_PURCHASE_DATE,
        dataIndex: 'purchaseDate',
        width: 130,
        render: (value: string | null) => (value ? dayjs(value).format('DD/MM/YYYY') : '—'),
      },
      {
        title: ACTIONS_COLUMN,
        key: 'actions',
        width: 180,
        render: (_, record) =>
          canEditEquipment ? (
            <Space size={4}>
              <Button
                size="small"
                onClick={() => {
                  setFormError(null);
                  equipmentForm.resetFields();
                  equipmentForm.setFieldsValue({
                    assetCode: record.assetCode,
                    name: record.name,
                    equipmentType: record.equipmentType ?? undefined,
                    roomId: record.roomId ?? undefined,
                    status: record.status,
                    purchaseDate: record.purchaseDate ? dayjs(record.purchaseDate) : null,
                  });
                  setEquipmentModal({ open: true, editing: record });
                }}
              >
                {MSG_OPS.EDIT}
              </Button>
              <Popconfirm
                title={MSG_FACILITY.EQUIPMENT_DELETE_TITLE}
                description={MSG_FACILITY.EQUIPMENT_DELETE_CONFIRM}
                okText={MSG_OPS.DELETE}
                cancelText={MSG_OPS.CLOSE}
                onConfirm={() => equipmentDelete.mutate(record.id)}
              >
                <Button size="small" danger>
                  {MSG_OPS.DELETE}
                </Button>
              </Popconfirm>
            </Space>
          ) : null,
      },
    ],
    [canEditEquipment, equipmentDelete, equipmentForm],
  );

  const issueColumns = useMemo<ColumnsType<IssueItem>>(
    () => [
      {
        title: MSG_FACILITY.ISSUE_EQUIPMENT,
        dataIndex: 'equipmentName',
        render: (value: string | null, record) => value || record.equipmentId,
      },
      { title: MSG_FACILITY.ISSUE_DESCRIPTION_COL, dataIndex: 'description' },
      {
        title: MSG_FACILITY.ISSUE_REPORTED_BY,
        dataIndex: 'reportedBy',
        width: 180,
        render: (value: string | null) => value || '—',
      },
      {
        title: MSG_FACILITY.ISSUE_CREATED_AT,
        dataIndex: 'createdAt',
        width: 160,
        render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm'),
      },
      {
        title: MSG_FACILITY.ISSUE_STATUS,
        dataIndex: 'status',
        width: 130,
        render: (value: string) =>
          value === 'resolved' ? (
            <Tag color="green">{MSG_FACILITY.ISSUE_STATUS_RESOLVED}</Tag>
          ) : (
            <Tag color="orange">{MSG_FACILITY.ISSUE_STATUS_OPEN}</Tag>
          ),
      },
      {
        title: ACTIONS_COLUMN,
        key: 'actions',
        width: 130,
        render: (_, record) =>
          canResolve && record.status !== 'resolved' ? (
            <Popconfirm
              title={MSG_FACILITY.ISSUE_RESOLVE}
              description={MSG_FACILITY.ISSUE_RESOLVE_CONFIRM}
              okText={MSG_OPS.SAVE}
              cancelText={MSG_OPS.CLOSE}
              onConfirm={() => issueResolve.mutate(record.id)}
            >
              <Button size="small">{MSG_FACILITY.ISSUE_RESOLVE}</Button>
            </Popconfirm>
          ) : null,
      },
    ],
    [canResolve, issueResolve],
  );

  if (!allowed) {
    return (
      <Flex vertical gap={token.marginMD}>
        <PageHeader title={MSG_FACILITY.TITLE} />
        <ForbiddenNotice title={MSG_OPS.NO_PERMISSION} />
      </Flex>
    );
  }

  const tabs: TabsProps['items'] = [];
  if (roomsAllowed) {
    tabs.push({
      key: 'rooms',
      label: MSG_FACILITY.TAB_ROOMS,
      children: (
        <Flex vertical gap={token.marginSM}>
          {canEditRooms && (
            <Flex justify="flex-end">
              <Button
                type="primary"
                onClick={() => {
                  setFormError(null);
                  roomForm.resetFields();
                  roomForm.setFieldsValue({ capacity: 30, roomType: 'classroom', status: 'active' });
                  setRoomModal({ open: true, editing: null });
                }}
              >
                {MSG_FACILITY.ROOM_CREATE}
              </Button>
            </Flex>
          )}
          {renderList(roomsQuery, roomColumns, MSG_FACILITY.ROOM_EMPTY, 'id')}
        </Flex>
      ),
    });
  }
  if (equipmentAllowed) {
    tabs.push({
      key: 'equipment',
      label: MSG_FACILITY.TAB_EQUIPMENT,
      children: (
        <Flex vertical gap={token.marginSM}>
          {canEditEquipment && (
            <Flex justify="flex-end">
              <Button
                type="primary"
                onClick={() => {
                  setFormError(null);
                  equipmentForm.resetFields();
                  equipmentForm.setFieldsValue({ status: 'in_use' });
                  setEquipmentModal({ open: true, editing: null });
                }}
              >
                {MSG_FACILITY.EQUIPMENT_CREATE}
              </Button>
            </Flex>
          )}
          {renderList(equipmentQuery, equipmentColumns, MSG_FACILITY.EQUIPMENT_EMPTY, 'id')}
        </Flex>
      ),
    });
  }
  if (issuesAllowed) {
    tabs.push({
      key: 'issues',
      label: MSG_FACILITY.TAB_ISSUES,
      children: (
        <Flex vertical gap={token.marginSM}>
          {canReport && (
            <Flex justify="flex-end">
              <Button
                type="primary"
                onClick={() => {
                  setFormError(null);
                  issueForm.resetFields();
                  setIssueModal(true);
                }}
              >
                {MSG_FACILITY.ISSUE_REPORT}
              </Button>
            </Flex>
          )}
          {renderList(issuesQuery, issueColumns, MSG_FACILITY.ISSUE_EMPTY, 'id')}
        </Flex>
      ),
    });
  }

  return (
    <Flex vertical gap={token.marginMD}>
      <PageHeader title={MSG_FACILITY.TITLE}>
        <Flex gap={token.marginSM} wrap="wrap" align="center" style={{ marginTop: token.marginXS }}>
          <DepartmentSelect scope={scope} />
          <Text type="secondary">{MSG_FACILITY.SUBTITLE}</Text>
        </Flex>
      </PageHeader>

      {!departmentId ? (
        <Alert type="warning" showIcon message={MSG_OPS.DEPARTMENT_REQUIRED} />
      ) : (
        <Tabs
          activeKey={tabs.some((item) => item.key === tab) ? tab : tabs[0]?.key}
          onChange={setTab}
          items={tabs}
        />
      )}

      <Modal
        title={roomModal.editing ? MSG_FACILITY.ROOM_EDIT : MSG_FACILITY.ROOM_CREATE}
        open={roomModal.open}
        onCancel={closeRoomModal}
        onOk={() => roomForm.submit()}
        okText={MSG_OPS.SAVE}
        cancelText={MSG_OPS.CANCEL}
        confirmLoading={roomSave.isPending}
        forceRender
      >
        {formError && <Alert type="error" showIcon message={formError} style={{ marginBottom: token.margin }} />}
        <Form
          form={roomForm}
          layout="vertical"
          requiredMark
          onFinish={(values) =>
            roomSave.mutate({
              id: roomModal.editing?.id ?? null,
              payload: {
                code: values.code.trim(),
                name: values.name.trim(),
                building: values.building?.trim() || null,
                floor: values.floor?.trim() || null,
                capacity: values.capacity,
                roomType: values.roomType ?? null,
                status: values.status ?? null,
              },
            })
          }
        >
          <Flex gap={token.marginSM} wrap="wrap">
            <Form.Item
              name="code"
              label={MSG_FACILITY.ROOM_CODE}
              style={{ flex: 1, minWidth: 200 }}
              rules={[{ required: true, message: 'Vui lòng nhập mã phòng' }]}
            >
              <Input autoComplete="off" placeholder="VD: P101" />
            </Form.Item>
            <Form.Item
              name="name"
              label={MSG_FACILITY.ROOM_NAME}
              style={{ flex: 1, minWidth: 200 }}
              rules={[{ required: true, message: 'Vui lòng nhập tên phòng' }]}
            >
              <Input autoComplete="off" placeholder="Phòng học 101" />
            </Form.Item>
          </Flex>
          <Flex gap={token.marginSM} wrap="wrap">
            <Form.Item name="building" label={MSG_FACILITY.ROOM_BUILDING} style={{ flex: 1, minWidth: 180 }}>
              <Input autoComplete="off" />
            </Form.Item>
            <Form.Item name="floor" label={MSG_FACILITY.ROOM_FLOOR} style={{ flex: 1, minWidth: 120 }}>
              <Input autoComplete="off" />
            </Form.Item>
            <Form.Item
              name="capacity"
              label={MSG_FACILITY.ROOM_CAPACITY}
              style={{ flex: 1, minWidth: 140 }}
              rules={[{ required: true, message: 'Vui lòng nhập sức chứa' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Flex>
          <Flex gap={token.marginSM} wrap="wrap">
            <Form.Item name="roomType" label={MSG_FACILITY.ROOM_TYPE} style={{ flex: 1, minWidth: 200 }}>
              <Select
                options={[
                  { value: 'classroom', label: MSG_FACILITY.ROOM_TYPE_CLASSROOM },
                  { value: 'computer_room', label: MSG_FACILITY.ROOM_TYPE_COMPUTER },
                ]}
              />
            </Form.Item>
            <Form.Item name="status" label={MSG_FACILITY.ROOM_STATUS} style={{ flex: 1, minWidth: 200 }}>
              <Select
                options={[
                  { value: 'active', label: MSG_FACILITY.ROOM_STATUS_ACTIVE },
                  { value: 'maintenance', label: MSG_FACILITY.ROOM_STATUS_MAINTENANCE },
                  { value: 'closed', label: MSG_FACILITY.ROOM_STATUS_CLOSED },
                ]}
              />
            </Form.Item>
          </Flex>
        </Form>
      </Modal>

      <Modal
        title={equipmentModal.editing ? MSG_FACILITY.EQUIPMENT_EDIT : MSG_FACILITY.EQUIPMENT_CREATE}
        open={equipmentModal.open}
        onCancel={closeEquipmentModal}
        onOk={() => equipmentForm.submit()}
        okText={MSG_OPS.SAVE}
        cancelText={MSG_OPS.CANCEL}
        confirmLoading={equipmentSave.isPending}
        forceRender
      >
        {formError && <Alert type="error" showIcon message={formError} style={{ marginBottom: token.margin }} />}
        <Form
          form={equipmentForm}
          layout="vertical"
          requiredMark
          onFinish={(values) =>
            equipmentSave.mutate({
              id: equipmentModal.editing?.id ?? null,
              payload: {
                assetCode: values.assetCode.trim(),
                name: values.name.trim(),
                equipmentType: values.equipmentType?.trim() || null,
                roomId: values.roomId || null,
                status: values.status ?? null,
                purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : null,
              },
            })
          }
        >
          <Flex gap={token.marginSM} wrap="wrap">
            <Form.Item
              name="assetCode"
              label={MSG_FACILITY.EQUIPMENT_ASSET_CODE}
              style={{ flex: 1, minWidth: 200 }}
              rules={[{ required: true, message: 'Vui lòng nhập mã tài sản' }]}
            >
              <Input autoComplete="off" placeholder="VD: TB001" />
            </Form.Item>
            <Form.Item
              name="name"
              label={MSG_FACILITY.EQUIPMENT_NAME}
              style={{ flex: 1, minWidth: 200 }}
              rules={[{ required: true, message: 'Vui lòng nhập tên thiết bị' }]}
            >
              <Input autoComplete="off" placeholder="Máy chiếu" />
            </Form.Item>
          </Flex>
          <Flex gap={token.marginSM} wrap="wrap">
            <Form.Item name="equipmentType" label={MSG_FACILITY.EQUIPMENT_TYPE} style={{ flex: 1, minWidth: 180 }}>
              <Input autoComplete="off" placeholder="projector, pc, …" />
            </Form.Item>
            <Form.Item name="roomId" label={MSG_FACILITY.EQUIPMENT_ROOM} style={{ flex: 1, minWidth: 220 }}>
              <AutoComplete allowClear options={roomOptions} placeholder={MSG_FACILITY.EQUIPMENT_ROOM_NONE} />
            </Form.Item>
          </Flex>
          <Flex gap={token.marginSM} wrap="wrap">
            <Form.Item name="status" label={MSG_FACILITY.EQUIPMENT_STATUS} style={{ flex: 1, minWidth: 200 }}>
              <Select
                options={Object.entries(EQUIPMENT_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
              />
            </Form.Item>
            <Form.Item name="purchaseDate" label={MSG_FACILITY.EQUIPMENT_PURCHASE_DATE} style={{ flex: 1, minWidth: 200 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Flex>
        </Form>
      </Modal>

      <Modal
        title={MSG_FACILITY.ISSUE_REPORT_TITLE}
        open={issueModal}
        onCancel={() => {
          setIssueModal(false);
          setFormError(null);
          issueForm.resetFields();
        }}
        onOk={() => issueForm.submit()}
        okText={MSG_FACILITY.ISSUE_REPORT}
        cancelText={MSG_OPS.CANCEL}
        confirmLoading={issueReport.isPending}
        forceRender
      >
        {formError && <Alert type="error" showIcon message={formError} style={{ marginBottom: token.margin }} />}
        <Form
          form={issueForm}
          layout="vertical"
          requiredMark
          onFinish={(values) =>
            issueReport.mutate({
              equipmentId: values.equipmentId.trim(),
              description: values.description.trim(),
              photoUrl: values.photoUrl?.trim() || null,
            })
          }
        >
          <Form.Item
            name="equipmentId"
            label={MSG_FACILITY.ISSUE_EQUIPMENT}
            rules={[{ required: true, message: MSG_FACILITY.ISSUE_EQUIPMENT_REQUIRED }]}
          >
            <AutoComplete options={equipmentOptions} placeholder="Chọn hoặc nhập ID thiết bị" />
          </Form.Item>
          <Form.Item
            name="description"
            label={MSG_FACILITY.ISSUE_DESCRIPTION}
            rules={[{ required: true, message: MSG_FACILITY.ISSUE_DESCRIPTION_REQUIRED }]}
          >
            <Input.TextArea rows={3} maxLength={2000} showCount />
          </Form.Item>
          <Form.Item name="photoUrl" label={MSG_FACILITY.ISSUE_PHOTO_URL}>
            <Input autoComplete="off" />
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  );
}

/** Bảng danh sách dùng chung cho 3 tab — xử lý loading/empty/lỗi giống nhau. */
function renderList<T extends object>(
  query: { data?: T[]; isLoading: boolean; isError: boolean; error: unknown; refetch: () => void },
  columns: ColumnsType<T>,
  emptyText: string,
  rowKey: keyof T,
) {
  if (query.isError) {
    return (
      <Alert
        type="error"
        showIcon
        message={isModuleDisabledError(query.error) ? MSG_OPS.MODULE_DISABLED : MSG_FACILITY.LOAD_ERROR}
        description={operationsErrorMessage(query.error)}
        action={
          <Button size="small" onClick={() => query.refetch()}>
            {MSG_OPS.RETRY}
          </Button>
        }
      />
    );
  }
  return (
    <Table<T>
      rowKey={rowKey as string}
      loading={query.isLoading}
      columns={columns}
      dataSource={query.data ?? []}
      locale={{ emptyText: <Empty description={emptyText} /> }}
      pagination={{ pageSize: 20 }}
      scroll={{ x: 900 }}
    />
  );
}
