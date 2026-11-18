import {
  AlertDialog,
  Banner,
  Button,
  HStack,
  paginateData,
  pixel,
  proportional,
  Stack,
  Table,
  useTablePagination,
} from '@astryxdesign/core';
import type { TableColumn } from '@astryxdesign/core';
import dayjs from 'dayjs';
import { useState } from 'react';
import { AppLink } from '../../components/AppLink/AppLink';
import DepartmentFormModal from '../../components/DepartmentFormModal/DepartmentFormModal';
import EmptyState from '../../components/EmptyState/EmptyState';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import { ownerErrorMessage } from '../../features/owner/ownerApi';
import { MSG_DEPT, MSG_OWNER } from '../../features/owner/ownerMessages';
import type { Department, DepartmentPayload } from '../../features/owner/types';
import { useNotify } from '../../hooks/useNotify';
import { useDepartmentsPage } from './use-departments';

/** Giá trị hiển thị khi BE trả `null` — không để ô trống, không hiện `null`. */
const EMPTY_VALUE = '—';

/** Số dòng mỗi trang. BE trả cả mảng nên phân trang ở client bằng `paginateData`. */
const PAGE_SIZE = 10;

/**
 * `Table` của Astryx buộc `T extends Record<string, unknown>`, còn `Department`
 * là interface nên không có index signature. Giao thêm `Record<string, unknown>`
 * để thoả ràng buộc mà **không** nới lỏng DTO — xem `docs/ui-conventions.md` §6.9.
 */
type DepartmentRow = Department & Record<string, unknown>;

function formatDate(value: string): string {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : EMPTY_VALUE;
}

/**
 * Màn danh sách phòng ban của Owner (`/to-chuc`) — Sprint 3.
 *
 * Mỗi dòng có 2 lối đi: bấm tên để mở nhân viên của phòng ban, hoặc Sửa/Xoá tại
 * chỗ. Không có cột "số nhân viên" vì PeopleService không trả số đếm — muốn có
 * thì phải gọi N lần `GET /departments/{id}/members`, không đáng.
 */
export default function DepartmentsPage() {
  const notify = useNotify();
  const { list, create, update, remove } = useDepartmentsPage();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  /** Phòng ban đang chờ xác nhận xoá; `null` = không mở hộp thoại. */
  const [pendingDelete, setPendingDelete] = useState<Department | null>(null);
  const [page, setPage] = useState(1);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (department: Department) => {
    setEditing(department);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const handleSubmit = async (payload: DepartmentPayload) => {
    setFormError(null);
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, payload });
        notify.success(MSG_DEPT.UPDATED);
      } else {
        await create.mutateAsync(payload);
        notify.success(MSG_DEPT.CREATED);
      }
      closeForm();
    } catch (error) {
      // `NFR-REL-001`: lỗi hiện trong modal, modal KHÔNG đóng, không báo thành công.
      setFormError(ownerErrorMessage(error));
    }
  };

  const handleDelete = async (department: Department) => {
    setActionError(null);
    try {
      await remove.mutateAsync(department.id);
      notify.success(MSG_DEPT.DELETED);
    } catch (error) {
      setActionError(ownerErrorMessage(error));
    } finally {
      // `AlertDialog` KHÔNG tự đóng (khác `Popconfirm` của antd): đóng sau khi
      // yêu cầu kết thúc, dù thành công hay lỗi — lỗi đã hiện ở `Banner` trên bảng.
      setPendingDelete(null);
    }
  };

  const rows = (list.data ?? []) as DepartmentRow[];
  // antd cũ dùng `hideOnSinglePage`: chỉ một trang thì không hiện thanh phân trang.
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagination = useTablePagination<DepartmentRow>({
    page: currentPage,
    onPageChange: setPage,
    totalItems: rows.length,
    pageSize: PAGE_SIZE,
    variant: totalPages > 1 ? 'pages' : 'none',
    label: MSG_DEPT.PAGINATION_LABEL,
  });

  const columns: TableColumn<DepartmentRow>[] = [
    {
      key: 'name',
      header: MSG_DEPT.NAME,
      width: proportional(1, { minWidth: 180 }),
      renderCell: (department) => (
        <AppLink to={`/to-chuc/phong-ban/${department.id}`}>{department.name}</AppLink>
      ),
    },
    {
      key: 'description',
      header: MSG_DEPT.DESCRIPTION,
      width: proportional(1, { minWidth: 220 }),
      renderCell: (department) => department.description || EMPTY_VALUE,
    },
    {
      key: 'createdAt',
      header: MSG_DEPT.CREATED_AT,
      width: pixel(120),
      renderCell: (department) => formatDate(department.createdAt),
    },
    {
      key: 'actions',
      header: MSG_DEPT.ACTIONS,
      width: pixel(150),
      renderCell: (department) => (
        <HStack gap={2}>
          <Button
            variant="ghost"
            size="sm"
            label={MSG_DEPT.EDIT_SHORT}
            aria-label={`${MSG_DEPT.EDIT} ${department.name}`}
            onClick={() => openEdit(department)}
          />
          <Button
            variant="ghost"
            size="sm"
            label={MSG_DEPT.DELETE}
            aria-label={`${MSG_DEPT.DELETE} phòng ban ${department.name}`}
            onClick={() => setPendingDelete(department)}
          />
        </HStack>
      ),
    },
  ];

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader
        title={MSG_DEPT.TITLE}
        subtitle={MSG_DEPT.SUBTITLE}
        extra={
          <Button variant="primary" size="lg" label={MSG_DEPT.CREATE} onClick={openCreate} />
        }
      />

      {actionError ? (
        <Banner status="error" title={actionError} collapsible={false} role="alert" />
      ) : null}

      {list.isError ? (
        <Banner
          status="error"
          title={MSG_DEPT.LOAD_ERROR}
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
        <Table<DepartmentRow>
          data={paginateData(rows, currentPage, PAGE_SIZE)}
          columns={columns}
          idKey="id"
          hasHover
          textOverflow="truncate"
          // `aria-rowindex` phải tính theo trang hiện tại, không theo thứ tự
          // trong mảng một trang.
          rowIndexStart={(currentPage - 1) * PAGE_SIZE + 1}
          rowCount={rows.length}
          emptyState={<EmptyState description={MSG_DEPT.EMPTY} compact />}
          plugins={{ pagination }}
        />
      )}

      <DepartmentFormModal
        open={formOpen}
        department={editing}
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
        title={MSG_DEPT.DELETE_CONFIRM_TITLE}
        description={
          pendingDelete
            ? `Phòng ban "${pendingDelete.name}" sẽ bị xoá. ${MSG_DEPT.DELETE_CONFIRM}`
            : ''
        }
        cancelLabel={MSG_OWNER.CANCEL}
        actionLabel={MSG_DEPT.DELETE}
        actionVariant="destructive"
        isActionLoading={remove.isPending}
        onAction={() => {
          if (pendingDelete) void handleDelete(pendingDelete);
        }}
      />
    </Stack>
  );
}
