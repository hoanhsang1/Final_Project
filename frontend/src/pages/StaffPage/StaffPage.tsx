import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Empty,
  Flex,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import { useNotify } from '../../components/LiveAnnouncer/LiveAnnouncer';
import MemberDetailDrawer from '../../components/MemberDetailDrawer/MemberDetailDrawer';
import MemberFormModal from '../../components/MemberFormModal/MemberFormModal';
import MemberPositionsModal from '../../components/MemberPositionsModal/MemberPositionsModal';
import PageHeader from '../../components/PageHeader/PageHeader';
import ResignationInboxDrawer from '../../components/ResignationInboxDrawer/ResignationInboxDrawer';
import ResignationRequestModal from '../../components/ResignationRequestModal/ResignationRequestModal';
import TempPasswordModal from '../../components/TempPasswordModal/TempPasswordModal';
import { canEditStaff, canViewStaff, isOwnerRole } from '../../features/auth/permissions';
import {
  createMember,
  createResignationRequest,
  deleteMember,
  fetchMembers,
  fetchPositions,
  ownerErrorMessage,
  updateMemberPositions,
} from '../../features/owner/ownerApi';
import type { Member, MemberPayload } from '../../features/owner/types';
import { formatDateTime } from '../../features/sprint4/labels';
import { fetchDepartments, fetchSpecialties } from '../../features/sprint4/sprint4Api';
import { MSG_S4, MSG_STAFF, ROLE_LABEL } from '../../features/sprint4/sprint4Messages';
import { usePermission } from '../../hooks/usePermission';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;

const ROLE_TAG_COLOR: Record<string, string | undefined> = {
  OWNER: 'gold',
  MANAGER: 'blue',
  STAFF: undefined,
};

/**
 * Màn "Nhân sự" — toàn bộ nhân viên của phòng ban.
 *
 * `/teachers` chỉ trả người có hồ sơ giáo viên, nên nhân sự/trưởng phòng không
 * xuất hiện ở đó. Màn này dùng `GET /departments/{id}/members`, BE tự giới hạn
 * phòng ban của người gọi (OWNER xem được mọi phòng ban).
 *
 * Quyền thao tác đến từ chức vụ (`PEOPLE_EDIT`), không từ role MANAGER: người
 * giữ chức vụ "Nhân sự phòng ban" thêm/xoá nhân viên và gán chức vụ cho STAFF
 * trong phòng mình; MANAGER chỉ có PEOPLE_VIEW thì chỉ xem.
 */
export default function StaffPage() {
  const { token } = theme.useToken();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const isOwner = isOwnerRole(backendRoles);
  const canView = canViewStaff(isOwner, permissions);
  const canEdit = canEditStaff(isOwner, permissions);
  const { canIn } = usePermission();

  const [departmentId, setDepartmentId] = useState<string | undefined>();
  const canResign = canIn('employee.resign', departmentId);
  const canApproveResignation = canIn('employee.approve_resignation', departmentId);

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [positionError, setPositionError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tempData, setTempData] = useState<{ username: string; password: string } | null>(null);
  const [editingPositions, setEditingPositions] = useState<Member | null>(null);
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [resignMember, setResignMember] = useState<Member | null>(null);
  const [resignError, setResignError] = useState<string | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
    enabled: canView,
  });
  const departments = departmentsQuery.data ?? [];

  const positionsQuery = useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
    enabled: canView,
  });

  const specialtiesQuery = useQuery({
    queryKey: ['specialties'],
    queryFn: fetchSpecialties,
    enabled: canView,
  });

  const membersQuery = useQuery({
    queryKey: ['department-members', departmentId],
    queryFn: () => fetchMembers(departmentId as string),
    enabled: canView && !!departmentId,
  });

  // Non-owner chỉ nhận đúng phòng ban của mình → tự chọn phòng đầu tiên.
  useEffect(() => {
    const list = departmentsQuery.data;
    if (!departmentId && list && list.length > 0) {
      setDepartmentId(list[0].id);
    }
  }, [departmentId, departmentsQuery.data]);

  const invalidateMembers = () =>
    queryClient.invalidateQueries({ queryKey: ['department-members', departmentId] });

  const createMut = useMutation({
    mutationFn: (payload: MemberPayload) => createMember(departmentId as string, payload),
    onSuccess: (created) => {
      notify.success(MSG_STAFF.CREATED);
      setCreateOpen(false);
      setTempData({
        username: created.member.username ?? '',
        password: created.temporaryPassword,
      });
      void invalidateMembers();
    },
    onError: (error) => setCreateError(ownerErrorMessage(error)),
  });

  const positionsMut = useMutation({
    mutationFn: ({
      userId,
      positionIds,
      reason,
    }: {
      userId: string;
      positionIds: string[];
      reason?: string;
    }) => updateMemberPositions(departmentId as string, userId, positionIds, reason),
    onSuccess: () => {
      notify.success(MSG_STAFF.POSITIONS_UPDATED);
      setEditingPositions(null);
      void invalidateMembers();
    },
    onError: (error) => setPositionError(ownerErrorMessage(error)),
  });

  const resignMut = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      createResignationRequest(departmentId as string, userId, reason),
    onSuccess: () => {
      notify.success(MSG_STAFF.RESIGN_CREATED);
      setResignMember(null);
      void invalidateMembers();
    },
    onError: (error) => setResignError(ownerErrorMessage(error)),
  });

  const removeMut = useMutation({
    mutationFn: (userId: string) => deleteMember(departmentId as string, userId),
    onSuccess: () => {
      notify.success(MSG_STAFF.REMOVED);
      void invalidateMembers();
    },
    onError: (error) => setActionError(ownerErrorMessage(error)),
  });

  const positionName = useMemo(() => {
    const map = new Map<string, string>();
    for (const position of positionsQuery.data ?? []) {
      map.set(position.id, position.name);
    }
    return map;
  }, [positionsQuery.data]);

  const columns = useMemo<ColumnsType<Member>>(() => {
    const base: ColumnsType<Member> = [
      {
        title: MSG_STAFF.COL_USERNAME,
        dataIndex: 'username',
        width: 200,
        render: (value: string | null | undefined) => value || '—',
      },
      {
        title: MSG_STAFF.COL_ROLE,
        dataIndex: 'role',
        width: 150,
        render: (value: string | null | undefined) =>
          value ? <Tag color={ROLE_TAG_COLOR[value]}>{ROLE_LABEL[value] ?? value}</Tag> : '—',
      },
      {
        title: MSG_STAFF.COL_STATUS,
        dataIndex: 'status',
        width: 140,
        render: (value: string | null | undefined) =>
          value === 'RESIGNED' ? (
            <Tag>{MSG_STAFF.STATUS_RESIGNED}</Tag>
          ) : (
            <Tag color="green">{MSG_STAFF.STATUS_ACTIVE}</Tag>
          ),
      },
      {
        title: MSG_STAFF.COL_POSITIONS,
        key: 'positions',
        render: (_, record) => {
          const ids = record.positionIds ?? [];
          if (ids.length === 0) return <Text type="secondary">{MSG_STAFF.NO_POSITION}</Text>;
          return (
            <Space size={[0, 4]} wrap>
              {ids.map((id) => (
                <Tag key={id}>{positionName.get(id) ?? id}</Tag>
              ))}
            </Space>
          );
        },
      },
      {
        title: MSG_STAFF.COL_APPOINTED_AT,
        dataIndex: 'appointedAt',
        width: 170,
        render: (value: string | null | undefined) => formatDateTime(value),
      },
    ];

    base.push({
      title: MSG_STAFF.COL_ACTIONS,
      key: 'actions',
      width: 320,
      render: (_, record) => {
        const active = record.status !== 'RESIGNED';
        return (
          <Space wrap>
            <Button type="link" size="small" onClick={() => setDetailMember(record)}>
              {MSG_STAFF.DETAIL_TITLE}
            </Button>
            {canResign && active && (
              <Button
                type="link"
                size="small"
                danger
                onClick={() => {
                  setResignError(null);
                  setResignMember(record);
                }}
              >
                {MSG_STAFF.RESIGN_TITLE}
              </Button>
            )}
            {canEdit && active && record.role === 'STAFF' && (
              <>
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    setPositionError(null);
                    setEditingPositions(record);
                  }}
                >
                  {MSG_STAFF.CHANGE_POSITIONS}
                </Button>
                <Popconfirm
                  title={MSG_STAFF.REMOVE_TITLE}
                  description={MSG_STAFF.REMOVE_CONFIRM}
                  okText={MSG_S4.CONFIRM}
                  cancelText={MSG_S4.CANCEL}
                  onConfirm={() => removeMut.mutate(record.userId)}
                >
                  <Button type="link" danger size="small">
                    {MSG_STAFF.REMOVE}
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
        );
      },
    });
    return base;
  }, [canEdit, canResign, positionName, removeMut]);

  return (
    <Flex vertical gap={token.marginMD}>
      <PageHeader
        title={MSG_STAFF.TITLE}
        subtitle={MSG_STAFF.SUBTITLE}
        extra={
          canView ? (
            <Flex gap={token.marginSM} wrap="wrap">
              <Select
                aria-label={MSG_STAFF.DEPARTMENT_LABEL}
                placeholder={MSG_STAFF.DEPARTMENT_LABEL}
                style={{ minWidth: 260 }}
                loading={departmentsQuery.isLoading}
                value={departmentId}
                onChange={setDepartmentId}
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
              />
              {canEdit && (
                <Button
                  type="primary"
                  disabled={!departmentId}
                  onClick={() => {
                    setCreateError(null);
                    setCreateOpen(true);
                  }}
                >
                  {MSG_STAFF.CREATE}
                </Button>
              )}
              {canApproveResignation && (
                <Button disabled={!departmentId} onClick={() => setInboxOpen(true)}>
                  {MSG_STAFF.RESIGN_INBOX}
                </Button>
              )}
            </Flex>
          ) : undefined
        }
      />

      {!canView ? (
        <ForbiddenNotice />
      ) : departmentsQuery.isError ? (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={MSG_STAFF.LIST_LOAD_ERROR}
          description={ownerErrorMessage(departmentsQuery.error)}
          action={
            <Button size="small" onClick={() => departmentsQuery.refetch()}>
              {MSG_S4.RETRY}
            </Button>
          }
        />
      ) : membersQuery.isError ? (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={MSG_STAFF.LIST_LOAD_ERROR}
          description={ownerErrorMessage(membersQuery.error)}
          action={
            <Button size="small" onClick={() => membersQuery.refetch()}>
              {MSG_S4.RETRY}
            </Button>
          }
        />
      ) : (
        <>
          {actionError && <Alert type="error" showIcon role="alert" message={actionError} />}
          {positionError && <Alert type="error" showIcon role="alert" message={positionError} />}
          <Table<Member>
            rowKey="userId"
            loading={membersQuery.isLoading || departmentsQuery.isLoading}
            columns={columns}
            dataSource={membersQuery.data ?? []}
            locale={{ emptyText: <Empty description={MSG_STAFF.EMPTY} /> }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `${total} nhân viên`,
            }}
            scroll={{ x: 1080 }}
          />
        </>
      )}

      <MemberFormModal
        open={createOpen}
        positions={positionsQuery.data ?? []}
        specialties={specialtiesQuery.data ?? []}
        submitting={createMut.isPending}
        error={createError}
        allowManagerRole={isOwner}
        onCancel={() => setCreateOpen(false)}
        onSubmit={(values) => createMut.mutate(values)}
      />

      <MemberPositionsModal
        open={!!editingPositions}
        member={editingPositions}
        positions={positionsQuery.data ?? []}
        submitting={positionsMut.isPending}
        onCancel={() => {
          setEditingPositions(null);
          setPositionError(null);
        }}
        onSubmit={(positionIds, reason) => {
          if (editingPositions) {
            positionsMut.mutate({ userId: editingPositions.userId, positionIds, reason });
          }
        }}
      />

      <MemberDetailDrawer
        open={!!detailMember}
        departmentId={departmentId}
        member={detailMember}
        positionName={positionName}
        onClose={() => setDetailMember(null)}
      />

      <ResignationRequestModal
        open={!!resignMember}
        member={resignMember}
        submitting={resignMut.isPending}
        error={resignError}
        onCancel={() => {
          setResignMember(null);
          setResignError(null);
        }}
        onSubmit={(reason) => {
          if (resignMember) {
            resignMut.mutate({ userId: resignMember.userId, reason });
          }
        }}
      />

      <ResignationInboxDrawer
        open={inboxOpen}
        departmentId={departmentId}
        canApprove={canApproveResignation}
        onClose={() => setInboxOpen(false)}
        onChanged={() => void invalidateMembers()}
      />

      <TempPasswordModal
        open={!!tempData}
        username={tempData?.username ?? ''}
        password={tempData?.password ?? ''}
        onClose={() => setTempData(null)}
      />
    </Flex>
  );
}
