import {
  AlertDialog,
  Badge,
  Banner,
  Button,
  Code,
  HStack,
  paginateData,
  pixel,
  proportional,
  Stack,
  Table,
  Text,
  useTablePagination,
} from '@astryxdesign/core';
import type { TableColumn } from '@astryxdesign/core';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EmptyState from '../../components/EmptyState/EmptyState';
import MemberFormModal from '../../components/MemberFormModal/MemberFormModal';
import MemberPositionsModal from '../../components/MemberPositionsModal/MemberPositionsModal';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import StatusScreen from '../../components/StatusScreen/StatusScreen';
import TempPasswordModal from '../../components/TempPasswordModal/TempPasswordModal';
import { roleLabel } from '../../features/admin/roleLabels';
import { ownerErrorMessage } from '../../features/owner/ownerApi';
import { MSG_DEPT, MSG_MEM, MSG_OWNER } from '../../features/owner/ownerMessages';
import type { CreatedMember, Member, MemberPayload } from '../../features/owner/types';
import { useNotify } from '../../hooks/useNotify';
import { useDepartmentDetail } from './use-department-detail';

const EMPTY_VALUE = '—';

/** Số dòng mỗi trang. BE trả cả mảng nên phân trang ở client bằng `paginateData`. */
const PAGE_SIZE = 20;

/**
 * `Table` của Astryx buộc `T extends Record<string, unknown>`, còn `Member` là
 * interface nên không có index signature — giao thêm `Record<string, unknown>`
 * để thoả ràng buộc mà **không** nới lỏng DTO (`docs/ui-conventions.md` §6.9).
 */
type MemberRow = Member & Record<string, unknown>;

function formatDate(value: string): string {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : EMPTY_VALUE;
}

/** BE không trả tên/username của nhân viên → định danh bằng `userId` rút gọn. */
function shortId(value: string): string {
  return value.length > 8 ? `${value.slice(0, 8)}...` : value;
}

/**
 * Màn chi tiết phòng ban (`/to-chuc/phong-ban/:id`) — danh sách nhân viên.
 *
 * Ba thao tác ghi: thêm nhân viên (BE sinh mật khẩu tạm, hiện một lần), đổi chức
 * vụ, và xoá khỏi phòng ban. Mọi lỗi hiện trong `Banner`/modal — KHÔNG báo thành
 * công khi lỗi (NFR-REL-001).
 */
export default function DepartmentDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();

  const {
    department,
    isLoading,
    isMissing,
    departmentsError,
    refetchDepartments,
    members,
    positions,
    create,
    updatePositions,
    remove,
  } = useDepartmentDetail(id);

  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [tempOpen, setTempOpen] = useState(false);
  const [tempData, setTempData] = useState<CreatedMember | null>(null);

  const [posOpen, setPosOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  /** Nhân viên đang chờ xác nhận xoá; `null` = không mở hộp thoại. */
  const [pendingRemove, setPendingRemove] = useState<Member | null>(null);
  const [page, setPage] = useState(1);

  const positionMap = new Map((positions.data ?? []).map((p) => [p.id, p.name]));

  const handleAdd = async (payload: MemberPayload) => {
    setAddError(null);
    try {
      const created = await create.mutateAsync(payload);
      setAddOpen(false);
      setTempData(created);
      setTempOpen(true);
      notify.success(MSG_MEM.CREATED);
    } catch (error) {
      // Lỗi hiện trong modal, modal KHÔNG đóng, không báo thành công.
      setAddError(ownerErrorMessage(error));
    }
  };

  const openChangePositions = (member: Member) => {
    setEditingMember(member);
    setPosOpen(true);
  };

  const closeChangePositions = () => {
    setPosOpen(false);
    setEditingMember(null);
  };

  const handleChangePositions = async (positionIds: string[]) => {
    if (!editingMember) return;
    setActionError(null);
    try {
      await updatePositions.mutateAsync({ userId: editingMember.userId, positionIds });
      closeChangePositions();
      notify.success(MSG_MEM.POSITIONS_UPDATED);
    } catch (error) {
      setActionError(ownerErrorMessage(error));
    }
  };

  const handleRemove = async (member: Member) => {
    setActionError(null);
    try {
      await remove.mutateAsync(member.userId);
      notify.success(MSG_MEM.REMOVED);
    } catch (error) {
      setActionError(ownerErrorMessage(error));
    } finally {
      // `AlertDialog` KHÔNG tự đóng: đóng sau khi yêu cầu kết thúc, dù thành công
      // hay lỗi — lỗi đã hiện ở `Banner` trên bảng.
      setPendingRemove(null);
    }
  };

  // Tính phân trang TRƯỚC các `return` sớm: `useTablePagination` là hook nên
  // phải gọi vô điều kiện, cùng thứ tự ở mọi lần render.
  const rows = (members.data ?? []) as MemberRow[];
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagination = useTablePagination<MemberRow>({
    page: currentPage,
    onPageChange: setPage,
    totalItems: rows.length,
    pageSize: PAGE_SIZE,
    variant: totalPages > 1 ? 'pages' : 'none',
    label: MSG_MEM.PAGINATION_LABEL,
  });

  if (isLoading) {
    return <PageLoading />;
  }

  if (departmentsError) {
    return (
      <Banner
        status="error"
        title={MSG_DEPT.LOAD_ERROR}
        collapsible={false}
        role="alert"
        endContent={
          <HStack gap={2}>
            <Button
              variant="secondary"
              size="sm"
              label={MSG_OWNER.RETRY}
              onClick={() => void refetchDepartments()}
            />
            <Button
              variant="primary"
              size="sm"
              label={MSG_MEM.BACK}
              onClick={() => navigate('/to-chuc')}
            />
          </HStack>
        }
      />
    );
  }

  if (isMissing || !department) {
    return (
      <StatusScreen
        code="404"
        title={MSG_MEM.NOT_FOUND}
        description={MSG_MEM.NOT_FOUND_HINT}
        action={{ label: MSG_MEM.BACK, onClick: () => navigate('/to-chuc') }}
      />
    );
  }

  const columns: TableColumn<MemberRow>[] = [
    {
      key: 'userId',
      header: MSG_MEM.USER_ID,
      width: proportional(1, { minWidth: 140 }),
      renderCell: (member) => <Code>{shortId(member.userId)}</Code>,
    },
    {
      key: 'role',
      header: MSG_MEM.ROLE,
      width: proportional(1, { minWidth: 140 }),
      renderCell: (member) => roleLabel(member.role),
    },
    {
      key: 'positions',
      header: MSG_MEM.POSITIONS,
      width: proportional(1, { minWidth: 180 }),
      renderCell: (member) => {
        const ids = member.positionIds;
        if (!ids || ids.length === 0) {
          return <Text type="supporting">{MSG_MEM.NO_POSITIONS}</Text>;
        }
        // BR-08: `Badge` luôn kèm NHÃN CHỮ, màu chỉ là tín hiệu phụ.
        return (
          <HStack gap={2} wrap="wrap">
            {ids.map((pid) => (
              <Badge key={pid} label={positionMap.get(pid) ?? pid} />
            ))}
          </HStack>
        );
      },
    },
    {
      key: 'appointedAt',
      header: MSG_MEM.APPOINTED_AT,
      width: pixel(120),
      renderCell: (member) => formatDate(member.appointedAt),
    },
    {
      key: 'actions',
      header: MSG_MEM.ACTIONS,
      width: pixel(240),
      renderCell: (member) => (
        <HStack gap={2}>
          <Button
            variant="ghost"
            size="sm"
            label={MSG_MEM.CHANGE_POSITIONS}
            aria-label={`${MSG_MEM.CHANGE_POSITIONS} ${shortId(member.userId)}`}
            onClick={() => openChangePositions(member)}
          />
          <Button
            variant="ghost"
            size="sm"
            label={MSG_MEM.REMOVE}
            aria-label={`${MSG_MEM.REMOVE} ${shortId(member.userId)}`}
            onClick={() => setPendingRemove(member)}
          />
        </HStack>
      ),
    },
  ];

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader
        breadcrumb={[{ title: 'Tổ chức', href: '/to-chuc' }, { title: department.name }]}
        title={department.name}
        subtitle={department.description || EMPTY_VALUE}
        extra={
          <Button variant="primary" size="lg" label={MSG_MEM.ADD} onClick={() => setAddOpen(true)} />
        }
      />

      {actionError ? (
        <Banner status="error" title={actionError} collapsible={false} role="alert" />
      ) : null}

      {members.isError ? (
        <Banner
          status="error"
          title={MSG_MEM.LOAD_ERROR}
          collapsible={false}
          role="alert"
          endContent={
            <Button
              variant="secondary"
              size="sm"
              label={MSG_OWNER.RETRY}
              onClick={() => void members.refetch()}
            />
          }
        />
      ) : members.isPending ? (
        <PageLoading />
      ) : (
        <Table<MemberRow>
          data={paginateData(rows, currentPage, PAGE_SIZE)}
          columns={columns}
          idKey="userId"
          hasHover
          textOverflow="truncate"
          rowIndexStart={(currentPage - 1) * PAGE_SIZE + 1}
          rowCount={rows.length}
          emptyState={
            <EmptyState
              description={MSG_MEM.EMPTY}
              compact
              action={{ label: MSG_MEM.ADD, onClick: () => setAddOpen(true) }}
            />
          }
          plugins={{ pagination }}
        />
      )}

      <MemberFormModal
        open={addOpen}
        positions={positions.data ?? []}
        submitting={create.isPending}
        error={addError}
        onCancel={() => {
          setAddOpen(false);
          setAddError(null);
        }}
        onSubmit={(payload) => void handleAdd(payload)}
      />

      <MemberPositionsModal
        open={posOpen}
        member={editingMember}
        positions={positions.data ?? []}
        submitting={updatePositions.isPending}
        onCancel={closeChangePositions}
        onSubmit={(ids) => void handleChangePositions(ids)}
      />

      <TempPasswordModal
        open={tempOpen}
        username={tempData?.member.userId ?? ''}
        password={tempData?.temporaryPassword ?? ''}
        onClose={() => {
          setTempOpen(false);
          setTempData(null);
        }}
      />

      {/* Xác nhận xoá: Astryx không có `Popconfirm` nên dùng `AlertDialog`. */}
      <AlertDialog
        isOpen={pendingRemove !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
        title={MSG_MEM.REMOVE_CONFIRM_TITLE}
        description={
          pendingRemove
            ? `Nhân viên "${shortId(pendingRemove.userId)}" sẽ bị xoá khỏi phòng ban. ${MSG_MEM.REMOVE_CONFIRM}`
            : ''
        }
        cancelLabel={MSG_OWNER.CANCEL}
        actionLabel={MSG_MEM.REMOVE}
        actionVariant="destructive"
        isActionLoading={remove.isPending}
        onAction={() => {
          if (pendingRemove) void handleRemove(pendingRemove);
        }}
      />
    </Stack>
  );
}
