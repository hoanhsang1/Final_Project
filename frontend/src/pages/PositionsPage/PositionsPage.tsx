import {
  AlertDialog,
  Badge,
  Banner,
  Button,
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
import EmptyState from '../../components/EmptyState/EmptyState';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import PositionFormModal from '../../components/PositionFormModal/PositionFormModal';
import { ownerErrorMessage } from '../../features/owner/ownerApi';
import { MSG_OWNER, MSG_POS } from '../../features/owner/ownerMessages';
import { permissionLabel } from '../../features/owner/permissionLabels';
import type { Position, PositionPayload } from '../../features/owner/types';
import { useNotify } from '../../hooks/useNotify';
import { usePositionsPage } from './use-positions';

const EMPTY_VALUE = '—';

/** Số dòng mỗi trang. BE trả cả mảng nên phân trang ở client bằng `paginateData`. */
const PAGE_SIZE = 10;

/**
 * `Table` của Astryx buộc `T extends Record<string, unknown>`, còn `Position` là
 * interface nên không có index signature — giao thêm `Record<string, unknown>`
 * để thoả ràng buộc mà **không** nới lỏng DTO (`docs/ui-conventions.md` §6.9).
 */
type PositionRow = Position & Record<string, unknown>;

function formatDate(value: string): string {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : EMPTY_VALUE;
}

export default function PositionsPage() {
  const notify = useNotify();
  const { list, permissions, create, update, remove } = usePositionsPage();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  /** Chức vụ đang chờ xác nhận xoá; `null` = không mở hộp thoại. */
  const [pendingDelete, setPendingDelete] = useState<Position | null>(null);
  const [page, setPage] = useState(1);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (position: Position) => {
    setEditing(position);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const handleSubmit = async (payload: PositionPayload) => {
    setFormError(null);
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, payload });
        notify.success(MSG_POS.UPDATED);
      } else {
        await create.mutateAsync(payload);
        notify.success(MSG_POS.CREATED);
      }
      closeForm();
    } catch (error) {
      setFormError(ownerErrorMessage(error));
    }
  };

  const handleDelete = async (position: Position) => {
    setActionError(null);
    try {
      await remove.mutateAsync(position.id);
      notify.success(MSG_POS.DELETED);
    } catch (error) {
      setActionError(ownerErrorMessage(error));
    } finally {
      setPendingDelete(null);
    }
  };

  const rows = (list.data ?? []) as PositionRow[];
  // antd cũ dùng `hideOnSinglePage`: chỉ một trang thì không hiện thanh phân trang.
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagination = useTablePagination<PositionRow>({
    page: currentPage,
    onPageChange: setPage,
    totalItems: rows.length,
    pageSize: PAGE_SIZE,
    variant: totalPages > 1 ? 'pages' : 'none',
    label: MSG_POS.PAGINATION_LABEL,
  });

  const columns: TableColumn<PositionRow>[] = [
    {
      key: 'name',
      header: MSG_POS.NAME,
      width: proportional(1, { minWidth: 160 }),
      renderCell: (position) => position.name,
    },
    {
      key: 'description',
      header: MSG_POS.DESCRIPTION,
      width: proportional(1, { minWidth: 180 }),
      renderCell: (position) => position.description || EMPTY_VALUE,
    },
    {
      key: 'permissions',
      header: MSG_POS.PERMISSIONS,
      width: proportional(1, { minWidth: 220 }),
      renderCell: (position) => {
        const codes = position.permissions;
        if (!codes || codes.length === 0) {
          return <Text type="supporting">{MSG_POS.NO_PERMISSIONS}</Text>;
        }
        // BR-08: `Badge` luôn kèm NHÃN CHỮ, màu chỉ là tín hiệu phụ.
        return (
          <HStack gap={2} wrap="wrap">
            {codes.map((code) => (
              <Badge key={code} label={permissionLabel(code)} />
            ))}
          </HStack>
        );
      },
    },
    {
      key: 'createdAt',
      header: MSG_POS.CREATED_AT,
      width: pixel(120),
      renderCell: (position) => formatDate(position.createdAt),
    },
    {
      key: 'actions',
      header: MSG_POS.ACTIONS,
      width: pixel(150),
      renderCell: (position) => (
        <HStack gap={2}>
          <Button
            variant="ghost"
            size="sm"
            label={MSG_POS.EDIT_SHORT}
            aria-label={`${MSG_POS.EDIT} ${position.name}`}
            onClick={() => openEdit(position)}
          />
          <Button
            variant="ghost"
            size="sm"
            label={MSG_POS.DELETE}
            aria-label={`${MSG_POS.DELETE} chức vụ ${position.name}`}
            onClick={() => setPendingDelete(position)}
          />
        </HStack>
      ),
    },
  ];

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader
        title={MSG_POS.TITLE}
        subtitle={MSG_POS.SUBTITLE}
        extra={<Button variant="primary" size="lg" label={MSG_POS.CREATE} onClick={openCreate} />}
      />

      {actionError ? (
        <Banner status="error" title={actionError} collapsible={false} role="alert" />
      ) : null}

      {permissions.isError ? (
        <Banner
          status="error"
          title={MSG_POS.PERMISSIONS_LOAD_ERROR}
          collapsible={false}
          role="alert"
          endContent={
            <Button
              variant="secondary"
              size="sm"
              label={MSG_OWNER.RETRY}
              onClick={() => void permissions.refetch()}
            />
          }
        />
      ) : null}

      {list.isError ? (
        <Banner
          status="error"
          title={MSG_POS.LOAD_ERROR}
          collapsible={false}
          role="alert"
          endContent={
            <Button
              variant="secondary"
              size="sm"
              label={MSG_OWNER.RETRY}
              onClick={() => void list.refetch()}
            />
          }
        />
      ) : list.isPending ? (
        <PageLoading />
      ) : (
        <Table<PositionRow>
          data={paginateData(rows, currentPage, PAGE_SIZE)}
          columns={columns}
          idKey="id"
          hasHover
          textOverflow="truncate"
          rowIndexStart={(currentPage - 1) * PAGE_SIZE + 1}
          rowCount={rows.length}
          emptyState={<EmptyState description={MSG_POS.EMPTY} compact />}
          plugins={{ pagination }}
        />
      )}

      <PositionFormModal
        open={formOpen}
        position={editing}
        permissions={permissions.data ?? []}
        submitting={create.isPending || update.isPending}
        error={formError}
        onCancel={closeForm}
        onSubmit={(payload) => void handleSubmit(payload)}
      />

      {/* Xác nhận xoá: Astryx không có `Popconfirm` nên dùng `AlertDialog` —
          hộp thoại giữa màn hình thay vì bong bóng neo nút. */}
      <AlertDialog
        isOpen={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={MSG_POS.DELETE_CONFIRM_TITLE}
        description={
          pendingDelete
            ? `Chức vụ "${pendingDelete.name}" sẽ bị xoá. ${MSG_POS.DELETE_CONFIRM}`
            : ''
        }
        cancelLabel={MSG_OWNER.CANCEL}
        actionLabel={MSG_POS.DELETE}
        actionVariant="destructive"
        isActionLoading={remove.isPending}
        onAction={() => {
          if (pendingDelete) void handleDelete(pendingDelete);
        }}
      />
    </Stack>
  );
}
