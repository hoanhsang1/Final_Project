import {
  AlertDialog,
  Badge,
  Banner,
  Button,
  Dialog,
  DialogHeader,
  HStack,
  pixel,
  proportional,
  Stack,
  Table,
  Text,
  TextInput,
  VStack,
} from '@astryxdesign/core';
import type { TableColumn } from '@astryxdesign/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLink, linkWithDepartmentId } from '../../components/AppLink/AppLink';
import EmptyState from '../../components/EmptyState/EmptyState';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import {
  canAccessFacilityArea,
  hasAnyPermissionWithAliases,
  isOwnerRole,
} from '../../features/auth/permissions';
import {
  createEquipment,
  createRoom,
  deleteEquipment,
  deleteRoom,
  facilityErrorMessage,
  fetchEquipment,
  fetchRooms,
  updateEquipment,
  updateRoom,
} from '../../features/facility/facilityApi';
import { MSG_FACILITY } from '../../features/facility/facilityMessages';
import {
  EQUIPMENT_STATUSES,
  ROOM_STATUSES,
  ROOM_TYPES,
} from '../../features/facility/types';
import type {
  Equipment,
  EquipmentPayload,
  Room,
  RoomPayload,
} from '../../features/facility/types';
import { fetchRoomSuggestions, scheduleErrorMessage } from '../../features/schedule/scheduleApi';
import { useFormState } from '../../hooks/useFormState';
import { useNotify } from '../../hooks/useNotify';
import { useAuthStore } from '../../stores/authStore';

type RoomRow = Room & Record<string, unknown>;
type EquipmentRow = Equipment & Record<string, unknown>;

type RoomFormValues = {
  code: string;
  name: string;
  building: string;
  floor: string;
  capacity: string;
  roomType: string;
  status: string;
};

type EquipmentFormValues = {
  assetCode: string;
  name: string;
  equipmentType: string;
  roomId: string;
  status: string;
  purchaseDate: string;
};

const EMPTY_ROOM_FORM: RoomFormValues = {
  code: '',
  name: '',
  building: '',
  floor: '',
  capacity: '',
  roomType: 'classroom',
  status: 'active',
};

const EMPTY_EQUIPMENT_FORM: EquipmentFormValues = {
  assetCode: '',
  name: '',
  equipmentType: '',
  roomId: '',
  status: 'in_use',
  purchaseDate: '',
};

const trimmedOrNull = (value: string) => value.trim() || null;

function toRoomForm(room: Room | null): RoomFormValues {
  return {
    code: room?.code ?? '',
    name: room?.name ?? '',
    building: room?.building ?? '',
    floor: room?.floor ?? '',
    capacity: room ? String(room.capacity) : '',
    roomType: room?.roomType ?? 'classroom',
    status: room?.status ?? 'active',
  };
}

function buildRoomPayload(values: RoomFormValues): RoomPayload {
  return {
    code: values.code.trim(),
    name: values.name.trim(),
    building: trimmedOrNull(values.building),
    floor: trimmedOrNull(values.floor),
    capacity: Number(values.capacity),
    roomType: values.roomType as RoomPayload['roomType'],
    status: values.status as RoomPayload['status'],
  };
}

function toEquipmentForm(item: Equipment | null): EquipmentFormValues {
  return {
    assetCode: item?.assetCode ?? '',
    name: item?.name ?? '',
    equipmentType: item?.equipmentType ?? '',
    roomId: item?.roomId ?? '',
    status: item?.status ?? 'in_use',
    purchaseDate: item?.purchaseDate ?? '',
  };
}

function buildEquipmentPayload(values: EquipmentFormValues): EquipmentPayload {
  return {
    assetCode: values.assetCode.trim(),
    name: values.name.trim(),
    equipmentType: trimmedOrNull(values.equipmentType),
    roomId: trimmedOrNull(values.roomId),
    status: values.status as EquipmentPayload['status'],
    purchaseDate: trimmedOrNull(values.purchaseDate),
  };
}

/**
 * Màn cơ sở vật chất (`/co-so-vat-chat`) — phòng, thiết bị và room picker.
 *
 * - CRUD đi qua `/api/departments/{d}/facilities/**`, phân quyền alias-aware.
 * - Room picker gọi `fetchRoomSuggestions` với đúngStartTime/EndTime; **không**
 *   gửi `classId` (chờ S7) và **không** lọc `roomType` ở FE (solver chưa nối).
 * - P4 auto-submit vẫn BLOCKED: màn này không gọi `/auto-generate`.
 */
export default function RoomsPage() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const departmentId = searchParams.get('departmentId') ?? '';

  const permissions = useAuthStore((s) => s.permissions);
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const isOwner = isOwnerRole(backendRoles);
  const hasFacilityAreaAccess = canAccessFacilityArea({ backendRoles, permissions });
  // `/room-suggestions` thuộc hợp đồng schedule.create — không phải quyền facility.*.
  const canSuggestRooms =
    isOwner || hasAnyPermissionWithAliases(permissions, ['schedule.create']);
  // Quyền đọc mức khu vực (FACILITY_READ alias FACILITY_VIEW) cũng thấy phòng/thiết bị.
  const canViewRooms =
    hasFacilityAreaAccess || hasAnyPermissionWithAliases(permissions, ['facility.room.view']);
  const canViewEquipment =
    hasFacilityAreaAccess || hasAnyPermissionWithAliases(permissions, ['facility.equipment.view']);
  // Giữ nguyên các quyền đọc chi tiết; khớp gate chung của khu vực CSVC.
  const canView =
    hasFacilityAreaAccess ||
    hasAnyPermissionWithAliases(permissions, ['facility.room.view', 'facility.equipment.view']);
  const canCreateRoom =
    isOwner || hasAnyPermissionWithAliases(permissions, ['facility.room.create']);
  const canUpdateRoom =
    isOwner || hasAnyPermissionWithAliases(permissions, ['facility.room.update']);
  const canDeleteRoom =
    isOwner || hasAnyPermissionWithAliases(permissions, ['facility.room.delete']);
  const canCreateEquipment =
    isOwner || hasAnyPermissionWithAliases(permissions, ['facility.equipment.create']);
  const canUpdateEquipment =
    isOwner || hasAnyPermissionWithAliases(permissions, ['facility.equipment.update']);
  const canDeleteEquipment =
    isOwner || hasAnyPermissionWithAliases(permissions, ['facility.equipment.delete']);

  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomFormError, setRoomFormError] = useState<string | null>(null);
  const [pendingDeleteRoom, setPendingDeleteRoom] = useState<Room | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [equipmentFormOpen, setEquipmentFormOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [equipmentFormError, setEquipmentFormError] = useState<string | null>(null);
  const [pendingDeleteEquipment, setPendingDeleteEquipment] = useState<Equipment | null>(null);

  const [pickerStart, setPickerStart] = useState('');
  const [pickerEnd, setPickerEnd] = useState('');
  const [pickerApplied, setPickerApplied] = useState({ start: '', end: '' });
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const roomForm = useFormState<RoomFormValues>(EMPTY_ROOM_FORM, {
    code: (value) => (value.trim() ? undefined : MSG_FACILITY.REQUIRED_CODE),
    name: (value) => (value.trim() ? undefined : MSG_FACILITY.REQUIRED_NAME),
    capacity: (value) => {
      const capacity = Number(value);
      return Number.isInteger(capacity) && capacity > 0
        ? undefined
        : MSG_FACILITY.INVALID_CAPACITY;
    },
    roomType: (value) =>
      ROOM_TYPES.some((type) => type === value) ? undefined : MSG_FACILITY.INVALID_ROOM_TYPE,
    status: (value) =>
      ROOM_STATUSES.some((status) => status === value)
        ? undefined
        : MSG_FACILITY.INVALID_ROOM_STATUS,
  });

  const equipmentForm = useFormState<EquipmentFormValues>(EMPTY_EQUIPMENT_FORM, {
    assetCode: (value) => (value.trim() ? undefined : MSG_FACILITY.REQUIRED_ASSET_CODE),
    name: (value) => (value.trim() ? undefined : MSG_FACILITY.REQUIRED_NAME),
    status: (value) =>
      EQUIPMENT_STATUSES.some((status) => status === value)
        ? undefined
        : MSG_FACILITY.INVALID_EQUIPMENT_STATUS,
  });

  const roomsQuery = useQuery({
    queryKey: ['facility-rooms', departmentId],
    queryFn: () => fetchRooms(departmentId),
    enabled: canViewRooms && Boolean(departmentId),
  });

  const equipmentQuery = useQuery({
    queryKey: ['facility-equipment', departmentId],
    queryFn: () => fetchEquipment(departmentId),
    enabled: canViewEquipment && Boolean(departmentId),
  });

  /**
   * Task 4 đọc `/room-suggestions` — chỉ `startTime`/`endTime`. FE không gửi
   * `classId`, cũng không tự lọc `roomType`: BE là nguồn quyết định.
   */
  const suggestionsQuery = useQuery({
    queryKey: ['facility-room-suggestions', departmentId, pickerApplied.start, pickerApplied.end],
    queryFn: () =>
      fetchRoomSuggestions({
        departmentId,
        startTime: pickerApplied.start,
        endTime: pickerApplied.end,
      }),
    enabled:
      canSuggestRooms &&
      Boolean(departmentId) &&
      Boolean(pickerApplied.start && pickerApplied.end),
  });

  const invalidateRooms = () => queryClient.invalidateQueries({ queryKey: ['facility-rooms'] });
  const invalidateEquipment = () =>
    queryClient.invalidateQueries({ queryKey: ['facility-equipment'] });

  const closeRoomForm = () => {
    setRoomFormOpen(false);
    setEditingRoom(null);
    setRoomFormError(null);
    roomForm.reset(EMPTY_ROOM_FORM);
  };

  const openCreateRoom = () => {
    setEditingRoom(null);
    setRoomFormError(null);
    roomForm.reset(EMPTY_ROOM_FORM);
    setRoomFormOpen(true);
  };

  const openEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomFormError(null);
    roomForm.reset(toRoomForm(room));
    setRoomFormOpen(true);
  };

  const closeEquipmentForm = () => {
    setEquipmentFormOpen(false);
    setEditingEquipment(null);
    setEquipmentFormError(null);
    equipmentForm.reset(EMPTY_EQUIPMENT_FORM);
  };

  const openCreateEquipment = () => {
    setEditingEquipment(null);
    setEquipmentFormError(null);
    equipmentForm.reset(EMPTY_EQUIPMENT_FORM);
    setEquipmentFormOpen(true);
  };

  const openEditEquipment = (item: Equipment) => {
    setEditingEquipment(item);
    setEquipmentFormError(null);
    equipmentForm.reset(toEquipmentForm(item));
    setEquipmentFormOpen(true);
  };

  const createRoomMut = useMutation({
    mutationFn: (payload: RoomPayload) => createRoom(departmentId, payload),
    onSuccess: () => {
      notify.success(MSG_FACILITY.ROOM_CREATED);
      closeRoomForm();
      invalidateRooms();
    },
    onError: (error) => {
      const message = facilityErrorMessage(error);
      setRoomFormError(message);
      notify.error(message);
    },
  });

  const updateRoomMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RoomPayload }) =>
      updateRoom(departmentId, id, payload),
    onSuccess: () => {
      notify.success(MSG_FACILITY.ROOM_UPDATED);
      closeRoomForm();
      invalidateRooms();
    },
    onError: (error) => {
      const message = facilityErrorMessage(error);
      setRoomFormError(message);
      notify.error(message);
    },
  });

  const deleteRoomMut = useMutation({
    mutationFn: (id: string) => deleteRoom(departmentId, id),
    onSuccess: () => {
      notify.success(MSG_FACILITY.ROOM_DELETED);
      setPendingDeleteRoom(null);
      invalidateRooms();
    },
    onError: (error) => {
      // ROOM_IN_USE là mã CHUỖI — `facilityErrorMessage` dịch sang tiếng Việt.
      const message = facilityErrorMessage(error);
      setDeleteError(message);
      notify.error(message);
      setPendingDeleteRoom(null);
    },
  });

  const createEquipmentMut = useMutation({
    mutationFn: (payload: EquipmentPayload) => createEquipment(departmentId, payload),
    onSuccess: () => {
      notify.success(MSG_FACILITY.EQUIPMENT_CREATED);
      closeEquipmentForm();
      invalidateEquipment();
    },
    onError: (error) => {
      const message = facilityErrorMessage(error);
      setEquipmentFormError(message);
      notify.error(message);
    },
  });

  const updateEquipmentMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EquipmentPayload }) =>
      updateEquipment(departmentId, id, payload),
    onSuccess: () => {
      notify.success(MSG_FACILITY.EQUIPMENT_UPDATED);
      closeEquipmentForm();
      invalidateEquipment();
    },
    onError: (error) => {
      const message = facilityErrorMessage(error);
      setEquipmentFormError(message);
      notify.error(message);
    },
  });

  const deleteEquipmentMut = useMutation({
    mutationFn: (id: string) => deleteEquipment(departmentId, id),
    onSuccess: () => {
      notify.success(MSG_FACILITY.EQUIPMENT_DELETED);
      setPendingDeleteEquipment(null);
      invalidateEquipment();
    },
    onError: (error) => {
      notify.error(facilityErrorMessage(error));
      setPendingDeleteEquipment(null);
    },
  });

  const handleRoomSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!roomForm.validate()) return;
    const payload = buildRoomPayload(roomForm.values);
    if (editingRoom) {
      updateRoomMut.mutate({ id: editingRoom.id, payload });
    } else {
      createRoomMut.mutate(payload);
    }
  };

  const handleEquipmentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!equipmentForm.validate()) return;
    const payload = buildEquipmentPayload(equipmentForm.values);
    if (editingEquipment) {
      updateEquipmentMut.mutate({ id: editingEquipment.id, payload });
    } else {
      createEquipmentMut.mutate(payload);
    }
  };

  const roomColumns: TableColumn<RoomRow>[] = [
    {
      key: 'code',
      header: MSG_FACILITY.ROOM_CODE,
      width: pixel(120),
      renderCell: (row) => row.code,
    },
    {
      key: 'name',
      header: MSG_FACILITY.ROOM_NAME,
      width: proportional(1, { minWidth: 140 }),
      renderCell: (row) => row.name,
    },
    {
      key: 'building',
      header: MSG_FACILITY.BUILDING,
      width: pixel(120),
      renderCell: (row) => [row.building, row.floor].filter(Boolean).join(' · ') || '—',
    },
    {
      key: 'capacity',
      header: MSG_FACILITY.CAPACITY,
      width: pixel(100),
      renderCell: (row) => row.capacity,
    },
    {
      key: 'roomType',
      header: MSG_FACILITY.ROOM_TYPE,
      width: pixel(150),
      renderCell: (row) => row.roomType || '—',
    },
    {
      key: 'status',
      header: MSG_FACILITY.ROOM_STATUS,
      width: pixel(140),
      renderCell: (row) => <Badge variant="neutral" label={row.status || '—'} />,
    },
  ];

  if (canUpdateRoom || canDeleteRoom) {
    roomColumns.push({
      key: 'actions',
      header: MSG_FACILITY.ACTIONS,
      width: pixel(180),
      renderCell: (row) => (
        <HStack gap={2}>
          {canUpdateRoom ? (
            <Button
              variant="ghost"
              size="sm"
              label={MSG_FACILITY.EDIT_ROOM}
              aria-label={MSG_FACILITY.EDIT_ROOM}
              onClick={() => openEditRoom(row)}
            />
          ) : null}
          {canDeleteRoom ? (
            <Button
              variant="ghost"
              size="sm"
              label={MSG_FACILITY.DELETE_ROOM}
              aria-label={MSG_FACILITY.DELETE_ROOM}
              onClick={() => setPendingDeleteRoom(row)}
            />
          ) : null}
        </HStack>
      ),
    });
  }

  const equipmentColumns: TableColumn<EquipmentRow>[] = [
    {
      key: 'assetCode',
      header: MSG_FACILITY.ASSET_CODE,
      width: pixel(140),
      renderCell: (row) => row.assetCode,
    },
    {
      key: 'name',
      header: MSG_FACILITY.EQUIPMENT_NAME,
      width: proportional(1, { minWidth: 140 }),
      renderCell: (row) => row.name,
    },
    {
      key: 'equipmentType',
      header: MSG_FACILITY.EQUIPMENT_TYPE,
      width: pixel(150),
      renderCell: (row) => row.equipmentType || '—',
    },
    {
      key: 'room',
      header: MSG_FACILITY.ROOM_ID,
      width: pixel(140),
      renderCell: (row) => row.roomName || row.roomId || '—',
    },
    {
      key: 'status',
      header: MSG_FACILITY.EQUIPMENT_STATUS,
      width: pixel(150),
      renderCell: (row) => <Badge variant="neutral" label={row.status || '—'} />,
    },
    {
      key: 'purchaseDate',
      header: MSG_FACILITY.PURCHASE_DATE,
      width: pixel(180),
      renderCell: (row) => row.purchaseDate || '—',
    },
  ];

  if (canUpdateEquipment || canDeleteEquipment) {
    equipmentColumns.push({
      key: 'actions',
      header: MSG_FACILITY.ACTIONS,
      width: pixel(180),
      renderCell: (row) => (
        <HStack gap={2}>
          {canUpdateEquipment ? (
            <Button
              variant="ghost"
              size="sm"
              label={MSG_FACILITY.EDIT_EQUIPMENT}
              aria-label={MSG_FACILITY.EDIT_EQUIPMENT}
              onClick={() => openEditEquipment(row)}
            />
          ) : null}
          {canDeleteEquipment ? (
            <Button
              variant="ghost"
              size="sm"
              label={MSG_FACILITY.DELETE_EQUIPMENT}
              aria-label={MSG_FACILITY.DELETE_EQUIPMENT}
              onClick={() => setPendingDeleteEquipment(row)}
            />
          ) : null}
        </HStack>
      ),
    });
  }

  const saveRoomPending = createRoomMut.isPending || updateRoomMut.isPending;
  const saveEquipmentPending =
    createEquipmentMut.isPending || updateEquipmentMut.isPending;

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader
        title={MSG_FACILITY.TITLE}
        subtitle={MSG_FACILITY.SUBTITLE}
        extra={
          <AppLink to={linkWithDepartmentId('/co-so-vat-chat/su-co', departmentId)}>
            {MSG_FACILITY.ISSUES_LINK}
          </AppLink>
        }
      >
        {canView ? (
          <HStack gap={3} wrap="wrap" align="end">
            <TextInput
              label={MSG_FACILITY.DEPARTMENT}
              value={departmentId}
              onChange={(value) =>
                setSearchParams(value.trim() ? { departmentId: value.trim() } : {}, {
                  replace: true,
                })
              }
              placeholder="d1"
              width={180}
            />
          </HStack>
        ) : null}
      </PageHeader>

      {!canView ? (
        <ForbiddenNotice />
      ) : !departmentId ? (
        <Banner
          status="warning"
          title={MSG_FACILITY.DEPARTMENT_HINT}
          description={MSG_FACILITY.DEPARTMENT}
          collapsible={false}
          role="status"
        />
      ) : (
        <>
          {deleteError ? (
            <Banner status="error" title={deleteError} collapsible={false} role="alert" />
          ) : null}

          {canViewRooms ? (
            <Stack direction="vertical" gap={2}>
              <HStack justify="between" gap={3} wrap="wrap">
                <Text type="body">{MSG_FACILITY.ROOM_SECTION}</Text>
                {canCreateRoom ? (
                  <Button
                    variant="primary"
                    size="lg"
                    label={MSG_FACILITY.ADD_ROOM}
                    onClick={openCreateRoom}
                  />
                ) : null}
              </HStack>
              {roomsQuery.isError ? (
                <Banner
                  status="error"
                  title={MSG_FACILITY.LOAD_ROOM_ERROR}
                  description={facilityErrorMessage(roomsQuery.error)}
                  collapsible={false}
                  role="alert"
                  endContent={
                    <Button
                      variant="secondary"
                      size="sm"
                      label={MSG_FACILITY.RETRY}
                      onClick={() => roomsQuery.refetch()}
                    />
                  }
                />
              ) : roomsQuery.isLoading ? (
                <PageLoading />
              ) : (
                <Table<RoomRow>
                  data={(roomsQuery.data ?? []) as RoomRow[]}
                  columns={roomColumns}
                  idKey="id"
                  hasHover
                  textOverflow="truncate"
                  emptyState={<EmptyState description={MSG_FACILITY.EMPTY_ROOM} compact />}
                />
              )}
            </Stack>
          ) : null}

          {canViewEquipment ? (
            <Stack direction="vertical" gap={2}>
              <HStack justify="between" gap={3} wrap="wrap">
                <Text type="body">{MSG_FACILITY.EQUIPMENT_SECTION}</Text>
                {canCreateEquipment ? (
                  <Button
                    variant="primary"
                    size="lg"
                    label={MSG_FACILITY.ADD_EQUIPMENT}
                    onClick={openCreateEquipment}
                  />
                ) : null}
              </HStack>
              {equipmentQuery.isError ? (
                <Banner
                  status="error"
                  title={MSG_FACILITY.LOAD_EQUIPMENT_ERROR}
                  description={facilityErrorMessage(equipmentQuery.error)}
                  collapsible={false}
                  role="alert"
                  endContent={
                    <Button
                      variant="secondary"
                      size="sm"
                      label={MSG_FACILITY.RETRY}
                      onClick={() => equipmentQuery.refetch()}
                    />
                  }
                />
              ) : equipmentQuery.isLoading ? (
                <PageLoading />
              ) : (
                <Table<EquipmentRow>
                  data={(equipmentQuery.data ?? []) as EquipmentRow[]}
                  columns={equipmentColumns}
                  idKey="id"
                  hasHover
                  textOverflow="truncate"
                  emptyState={<EmptyState description={MSG_FACILITY.EMPTY_EQUIPMENT} compact />}
                />
              )}
            </Stack>
          ) : null}

          <Stack direction="vertical" gap={2}>
            <Text type="body">{MSG_FACILITY.PICKER_SECTION}</Text>
            <Text type="supporting">{MSG_FACILITY.ROOM_SUGGESTIONS_HINT}</Text>
            <HStack gap={3} wrap="wrap" align="end">
              <TextInput
                label={MSG_FACILITY.START_TIME}
                value={pickerStart}
                onChange={setPickerStart}
                placeholder="2026-12-01T07:30:00"
                width={220}
              />
              <TextInput
                label={MSG_FACILITY.END_TIME}
                value={pickerEnd}
                onChange={setPickerEnd}
                placeholder="2026-12-01T09:00:00"
                width={220}
              />
              <Button
                variant="secondary"
                size="lg"
                label={MSG_FACILITY.FIND_ROOMS}
                onClick={() => setPickerApplied({ start: pickerStart, end: pickerEnd })}
              />
            </HStack>
            {suggestionsQuery.isError ? (
              <Banner
                status="error"
                title={MSG_FACILITY.ROOM_SUGGESTIONS_ERROR}
                description={scheduleErrorMessage(suggestionsQuery.error)}
                collapsible={false}
                role="alert"
                endContent={
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    label={MSG_FACILITY.RETRY}
                    onClick={() => suggestionsQuery.refetch()}
                  />
                }
              />
            ) : null}
            <div role="group" aria-label={MSG_FACILITY.ROOM_SUGGESTIONS}>
              <HStack gap={2} wrap="wrap">
                {(suggestionsQuery.data ?? []).map((room) => (
                  <Button
                    key={room.id}
                    type="button"
                    size="sm"
                    variant={selectedRoomId === room.id ? 'primary' : 'secondary'}
                    label={`${room.code} — ${room.name} (${room.capacity})`}
                    aria-pressed={selectedRoomId === room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                  />
                ))}
              </HStack>
            </div>
            {suggestionsQuery.isSuccess && (suggestionsQuery.data?.length ?? 0) === 0 ? (
              <Text type="supporting">{MSG_FACILITY.ROOM_SUGGESTIONS_EMPTY}</Text>
            ) : null}
          </Stack>
        </>
      )}

      <Dialog
        isOpen={roomFormOpen}
        onOpenChange={(open) => {
          if (!open) closeRoomForm();
        }}
        purpose="form"
        width={720}
      >
        <DialogHeader
          title={editingRoom ? MSG_FACILITY.EDIT_ROOM : MSG_FACILITY.ADD_ROOM}
          onOpenChange={(open) => {
            if (!open) closeRoomForm();
          }}
        />
        {roomFormOpen ? (
          <form noValidate onSubmit={handleRoomSubmit} style={{ marginTop: 'var(--spacing-4)' }}>
            <VStack gap={4}>
              {roomFormError ? (
                <Banner status="error" title={roomFormError} collapsible={false} role="alert" />
              ) : null}
              <HStack gap={3} wrap="wrap">
                <TextInput
                  label={MSG_FACILITY.ROOM_CODE}
                  value={roomForm.values.code}
                  onChange={(value) => roomForm.setValue('code', value)}
                  isDisabled={saveRoomPending}
                  containerStyle={{ flex: '1 1 200px', minWidth: 0 }}
                  status={
                    roomForm.errorOf('code')
                      ? { type: 'error', message: roomForm.errorOf('code') }
                      : undefined
                  }
                />
                <TextInput
                  label={MSG_FACILITY.ROOM_NAME}
                  value={roomForm.values.name}
                  onChange={(value) => roomForm.setValue('name', value)}
                  isDisabled={saveRoomPending}
                  containerStyle={{ flex: '1 1 200px', minWidth: 0 }}
                  status={
                    roomForm.errorOf('name')
                      ? { type: 'error', message: roomForm.errorOf('name') }
                      : undefined
                  }
                />
              </HStack>
              <HStack gap={3} wrap="wrap">
                <TextInput
                  label={MSG_FACILITY.BUILDING}
                  value={roomForm.values.building}
                  onChange={(value) => roomForm.setValue('building', value)}
                  isDisabled={saveRoomPending}
                  width={200}
                />
                <TextInput
                  label={MSG_FACILITY.FLOOR}
                  value={roomForm.values.floor}
                  onChange={(value) => roomForm.setValue('floor', value)}
                  isDisabled={saveRoomPending}
                  width={120}
                />
                <TextInput
                  label={MSG_FACILITY.CAPACITY}
                  value={roomForm.values.capacity}
                  onChange={(value) => roomForm.setValue('capacity', value)}
                  isDisabled={saveRoomPending}
                  width={120}
                  status={
                    roomForm.errorOf('capacity')
                      ? { type: 'error', message: roomForm.errorOf('capacity') }
                      : undefined
                  }
                />
              </HStack>
              <HStack gap={3} wrap="wrap">
                <TextInput
                  label={MSG_FACILITY.ROOM_TYPE}
                  value={roomForm.values.roomType}
                  onChange={(value) => roomForm.setValue('roomType', value)}
                  isDisabled={saveRoomPending}
                  width={200}
                  status={
                    roomForm.errorOf('roomType')
                      ? { type: 'error', message: roomForm.errorOf('roomType') }
                      : undefined
                  }
                />
                <TextInput
                  label={MSG_FACILITY.ROOM_STATUS}
                  value={roomForm.values.status}
                  onChange={(value) => roomForm.setValue('status', value)}
                  isDisabled={saveRoomPending}
                  width={200}
                  status={
                    roomForm.errorOf('status')
                      ? { type: 'error', message: roomForm.errorOf('status') }
                      : undefined
                  }
                />
              </HStack>
              <HStack justify="end" gap={2}>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  label={MSG_FACILITY.CANCEL}
                  onClick={closeRoomForm}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  label={editingRoom ? MSG_FACILITY.SAVE_ROOM : MSG_FACILITY.CREATE_ROOM}
                  isLoading={saveRoomPending}
                />
              </HStack>
            </VStack>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        isOpen={equipmentFormOpen}
        onOpenChange={(open) => {
          if (!open) closeEquipmentForm();
        }}
        purpose="form"
        width={720}
      >
        <DialogHeader
          title={editingEquipment ? MSG_FACILITY.EDIT_EQUIPMENT : MSG_FACILITY.ADD_EQUIPMENT}
          onOpenChange={(open) => {
            if (!open) closeEquipmentForm();
          }}
        />
        {equipmentFormOpen ? (
          <form
            noValidate
            onSubmit={handleEquipmentSubmit}
            style={{ marginTop: 'var(--spacing-4)' }}
          >
            <VStack gap={4}>
              {equipmentFormError ? (
                <Banner
                  status="error"
                  title={equipmentFormError}
                  collapsible={false}
                  role="alert"
                />
              ) : null}
              <HStack gap={3} wrap="wrap">
                <TextInput
                  label={MSG_FACILITY.ASSET_CODE}
                  value={equipmentForm.values.assetCode}
                  onChange={(value) => equipmentForm.setValue('assetCode', value)}
                  isDisabled={saveEquipmentPending}
                  containerStyle={{ flex: '1 1 200px', minWidth: 0 }}
                  status={
                    equipmentForm.errorOf('assetCode')
                      ? { type: 'error', message: equipmentForm.errorOf('assetCode') }
                      : undefined
                  }
                />
                <TextInput
                  label={MSG_FACILITY.EQUIPMENT_NAME}
                  value={equipmentForm.values.name}
                  onChange={(value) => equipmentForm.setValue('name', value)}
                  isDisabled={saveEquipmentPending}
                  containerStyle={{ flex: '1 1 200px', minWidth: 0 }}
                />
              </HStack>
              <HStack gap={3} wrap="wrap">
                <TextInput
                  label={MSG_FACILITY.EQUIPMENT_TYPE}
                  value={equipmentForm.values.equipmentType}
                  onChange={(value) => equipmentForm.setValue('equipmentType', value)}
                  isDisabled={saveEquipmentPending}
                  width={200}
                />
                <TextInput
                  label={MSG_FACILITY.ROOM_ID}
                  value={equipmentForm.values.roomId}
                  onChange={(value) => equipmentForm.setValue('roomId', value)}
                  isDisabled={saveEquipmentPending}
                  width={160}
                />
              </HStack>
              <HStack gap={3} wrap="wrap">
                <TextInput
                  label={MSG_FACILITY.EQUIPMENT_STATUS}
                  value={equipmentForm.values.status}
                  onChange={(value) => equipmentForm.setValue('status', value)}
                  isDisabled={saveEquipmentPending}
                  width={200}
                  status={
                    equipmentForm.errorOf('status')
                      ? { type: 'error', message: equipmentForm.errorOf('status') }
                      : undefined
                  }
                />
                <TextInput
                  label={MSG_FACILITY.PURCHASE_DATE}
                  value={equipmentForm.values.purchaseDate}
                  onChange={(value) => equipmentForm.setValue('purchaseDate', value)}
                  isDisabled={saveEquipmentPending}
                  width={220}
                />
              </HStack>
              <HStack justify="end" gap={2}>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  label={MSG_FACILITY.CANCEL}
                  onClick={closeEquipmentForm}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  label={editingEquipment ? MSG_FACILITY.SAVE_EQUIPMENT : MSG_FACILITY.CREATE_EQUIPMENT}
                  isLoading={saveEquipmentPending}
                />
              </HStack>
            </VStack>
          </form>
        ) : null}
      </Dialog>

      <AlertDialog
        isOpen={pendingDeleteRoom !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteRoom(null);
        }}
        title={MSG_FACILITY.DELETE_ROOM_CONFIRM_TITLE}
        description={MSG_FACILITY.DELETE_ROOM_CONFIRM}
        cancelLabel={MSG_FACILITY.CANCEL}
        actionLabel={MSG_FACILITY.CONFIRM_DELETE}
        actionVariant="destructive"
        isActionLoading={deleteRoomMut.isPending}
        onAction={() => {
          if (pendingDeleteRoom) deleteRoomMut.mutate(pendingDeleteRoom.id);
        }}
      />

      <AlertDialog
        isOpen={pendingDeleteEquipment !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteEquipment(null);
        }}
        title={MSG_FACILITY.DELETE_EQUIPMENT_CONFIRM_TITLE}
        description={MSG_FACILITY.DELETE_EQUIPMENT_CONFIRM}
        cancelLabel={MSG_FACILITY.CANCEL}
        actionLabel={MSG_FACILITY.CONFIRM_DELETE}
        actionVariant="destructive"
        isActionLoading={deleteEquipmentMut.isPending}
        onAction={() => {
          if (pendingDeleteEquipment) deleteEquipmentMut.mutate(pendingDeleteEquipment.id);
        }}
      />
    </Stack>
  );
}
