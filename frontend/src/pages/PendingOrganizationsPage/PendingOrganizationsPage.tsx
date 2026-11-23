import {
  Badge,
  Banner,
  Button,
  paginateData,
  pixel,
  proportional,
  Stack,
  Table,
  useTablePagination,
  useTableSortable,
  useTableSortableState,
} from '@astryxdesign/core';
import type { TableColumn } from '@astryxdesign/core';
import { useState } from 'react';
import { AppLink } from '../../components/AppLink/AppLink';
import EmptyState from '../../components/EmptyState/EmptyState';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import { MSG_ORG } from '../../features/admin/adminMessages';
import { organizationStatusLabel, orgTypeLabel } from '../../features/admin/statusLabels';
import type { PendingOrganization } from '../../features/admin/types';
import { usePendingOrganizations } from './use-pending-organizations';

/** Số dòng mỗi trang. */
const PAGE_SIZE = 10;

/**
 * `Table` của Astryx buộc `T extends Record<string, unknown>`, còn `PendingOrganization`
 * là interface nên không tự thoả — giao thêm `Record` để thoả ràng buộc mà **không**
 * nới lỏng DTO (xem `docs/ui-conventions.md` §6.11).
 */
type PendingOrgRow = PendingOrganization & Record<string, unknown>;

/**
 * Màn danh sách tổ chức chờ duyệt — `UC-ORG-02` (Đặc tả Sprint 2 §3.2).
 *
 * Nguồn dữ liệu: `GET /api/v1/organizations/pending` qua TanStack Query.
 * Năm trạng thái bắt buộc: loading · empty · error · success · no-permission
 * (no-permission do guard `AdminGuard` xử lý trước — màn này không tới được
 * khi người dùng không có role `SUPER_ADMIN`).
 */
export default function PendingOrganizationsPage() {
  const query = usePendingOrganizations();
  const [page, setPage] = useState(1);

  const rows = (query.data ?? []) as PendingOrgRow[];

  // Sắp xếp + phân trang đều phía client (NFR-PER-001). `useTableSortableState`
  // giữ state sắp xếp và trả dữ liệu đã sắp — plugin `sort` chỉ vẽ nút trên
  // header chứ không tự sắp, nên nếu thiếu bước này mũi tên sẽ nói dối.
  const { sortedData, sortConfig } = useTableSortableState<PendingOrgRow, 'name'>({
    data: rows,
    comparators: {
      // Sắp xếp theo locale tiếng Việt để "Đ" xếp đúng chỗ.
      name: (a, b) => a.name.localeCompare(b.name, 'vi'),
    },
  });
  const sortPlugin = useTableSortable<PendingOrgRow, 'name'>(sortConfig);

  // Chỉ một trang thì không hiện thanh phân trang.
  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagination = useTablePagination<PendingOrgRow>({
    page: currentPage,
    onPageChange: setPage,
    totalItems: sortedData.length,
    pageSize: PAGE_SIZE,
    variant: totalPages > 1 ? 'pages' : 'none',
    label: MSG_ORG.PAGINATION_LABEL,
  });

  const columns: TableColumn<PendingOrgRow>[] = [
    {
      key: 'name',
      header: 'Tên tổ chức',
      width: proportional(1, { minWidth: 200 }),
      sortable: true,
      renderCell: (row) => row.name,
    },
    {
      key: 'org_type',
      header: 'Loại',
      width: pixel(120),
      renderCell: (row) => orgTypeLabel(row.org_type),
    },
    {
      key: 'owner_username',
      header: 'Người đại diện',
      width: pixel(180),
      renderCell: (row) => row.owner_username,
    },
    {
      key: 'owner_email',
      header: 'Email',
      width: pixel(220),
      renderCell: (row) => row.owner_email,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: pixel(130),
      // BR-08: Badge LUÔN kèm chữ, không chỉ dựa vào màu.
      renderCell: (row) => {
        const status = organizationStatusLabel(row.status);
        return <Badge variant={status.badge} label={status.label} />;
      },
    },
    {
      key: 'action',
      header: 'Hành động',
      width: pixel(110),
      renderCell: (row) => (
        <AppLink to={`/quan-tri/to-chuc/${row.id}`} label={`Xem chi tiết tổ chức ${row.name}`}>
          {MSG_ORG.VIEW}
        </AppLink>
      ),
    },
  ];

  return (
    <Stack direction="vertical" gap={4}>
      {/* Giữ header cả ở nhánh lỗi để người dùng luôn biết mình đang ở màn nào
          — theo mẫu `DepartmentsPage`. */}
      <PageHeader title={MSG_ORG.LIST_TITLE} subtitle={MSG_ORG.LIST_SUBTITLE} />

      {query.isError ? (
        <Banner
          status="error"
          title={MSG_ORG.LOAD_ERROR}
          description="Kiểm tra kết nối máy chủ rồi thử lại. Danh sách chưa được tải."
          collapsible={false}
          role="alert"
          endContent={
            <Button
              variant="secondary"
              size="sm"
              label={MSG_ORG.RETRY}
              isLoading={query.isFetching}
              onClick={() => void query.refetch()}
            />
          }
        />
      ) : query.isPending ? (
        // Trạng thái loading — `PageLoading` (NFR-PER-001, `TC-ORG-14`).
        // KHÔNG render bảng rỗng lúc đang tải để tránh nhấp nháy "không có dữ liệu".
        <PageLoading />
      ) : (
        <Table<PendingOrgRow>
          data={paginateData(sortedData, currentPage, PAGE_SIZE)}
          columns={columns}
          idKey="id"
          hasHover
          textOverflow="truncate"
          // `aria-rowindex` phải tính theo trang hiện tại, không theo thứ tự
          // trong mảng một trang.
          rowIndexStart={(currentPage - 1) * PAGE_SIZE + 1}
          rowCount={sortedData.length}
          // Trạng thái empty — KHÔNG để bảng trắng (TC-ORG-12).
          emptyState={<EmptyState description={MSG_ORG.EMPTY} compact />}
          plugins={{ sort: sortPlugin, pagination }}
        />
      )}
    </Stack>
  );
}
