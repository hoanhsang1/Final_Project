import {
  Badge,
  Banner,
  Button,
  HStack,
  pixel,
  proportional,
  Selector,
  Stack,
  Table,
  TextInput,
  useTablePagination,
  useTableSortable,
} from '@astryxdesign/core';
import type { TableColumn, TableSortState } from '@astryxdesign/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import { AppLink } from '../../components/AppLink/AppLink';
import AccountCreateModal from '../../components/AccountCreateModal/AccountCreateModal';
import EmptyState from '../../components/EmptyState/EmptyState';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import {
  AdminApiError,
  createAccount,
  fetchOrganizationOptions,
} from '../../features/admin/adminApi';
import { adminKeys } from '../../features/admin/adminKeys';
import { MSG_ACC, MSG_ORG, msgBackendPending } from '../../features/admin/adminMessages';
import { ROLE_OPTIONS, roleLabel } from '../../features/admin/roleLabels';
import { accountStatusLabel } from '../../features/admin/statusLabels';
import type { AccountCreatePayload, AccountItem } from '../../features/admin/types';
import { useNotify } from '../../hooks/useNotify';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, useAccountsPage } from './use-accounts';

/** Mã endpoint đang chờ — hiện trên UI để Vy đối chiếu với đặc tả §4.2. */
const ENDPOINT_CODE = 'D-24';

/** Giá trị hiển thị khi BE chưa trả. */
const EMPTY_VALUE = '—';

/**
 * `Table` của Astryx buộc `T extends Record<string, unknown>`, còn `AccountItem`
 * là interface nên không tự thoả — giao thêm `Record` để thoả ràng buộc mà
 * **không** nới lỏng DTO (xem `docs/ui-conventions.md` §6.11).
 */
type AccountRow = AccountItem & Record<string, unknown>;

/** Hai cột BE cho sắp xếp (`?sort=<key>,<asc|desc>`). */
const SORT_KEYS = ['username', 'created_at'] as const;
type AccountSortKey = (typeof SORT_KEYS)[number];

/** Dựng state sắp xếp của plugin từ tham số `sort` trên URL (nguồn sự thật). */
function parseSort(sort: string): TableSortState<AccountSortKey> {
  const [key, direction] = (sort ?? '').split(',');
  if (!(SORT_KEYS as readonly string[]).includes(key)) {
    return [];
  }
  return [
    {
      sortKey: key as AccountSortKey,
      direction: direction === 'desc' ? 'descending' : 'ascending',
    },
  ];
}

/** Lựa chọn bộ lọc trạng thái — giá trị là ENUM `account.status`. */
const STATUS_OPTIONS = [
  { value: 'pending', label: accountStatusLabel('pending').label },
  { value: 'active', label: accountStatusLabel('active').label },
  { value: 'locked', label: accountStatusLabel('locked').label },
  { value: 'disabled', label: accountStatusLabel('disabled').label },
];

/** Định dạng ngày giờ; trả về "—" khi BE chưa trả. */
function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY HH:mm') : EMPTY_VALUE;
}

/**
 * Màn Quản lý tài khoản `/quan-tri/tai-khoan` (`UC-19`).
 *
 * ⚠️ Endpoint `GET /api/v1/accounts` (`D-24`) CHƯA có ở BE → tới khi Sang làm
 * xong, màn hiện "Tính năng đang chờ backend" (§4.5), KHÔNG hiện Empty rỗng.
 *
 * Đổi trạng thái tài khoản nằm ở màn **chi tiết** — màn này giữ vai trò liệt kê
 * + lọc + tìm kiếm + **tạo tài khoản** (`D-29`), bấm 1 dòng → chi tiết (`/:id`).
 *
 * Trạng thái: **loading** (PageLoading) · **empty** (EmptyState) · **error**
 * (Banner + Thử lại) · **success**. No-permission do `AdminGuard` chặn trước.
 */
export default function AccountsPage() {
  const notify = useNotify();
  const { result, page, size, keyword, status, organizationId, role, sort, updateParams } =
    useAccountsPage();

  // Ô nhập tách khỏi tham số URL: gõ chưa xong thì chưa lọc (khớp `Input.Search` cũ).
  const [keywordInput, setKeywordInput] = useState(keyword);

  // Dropdown "Tổ chức" (`D-20b`) — query riêng, lỗi KHÔNG chặn màn (chỉ mất
  // lựa chọn lọc; bảng vẫn hiện bình thường).
  const orgOptionsQuery = useQuery({
    queryKey: adminKeys.options,
    queryFn: fetchOrganizationOptions,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const orgFilterOptions = (orgOptionsQuery.data ?? []).map((option) => ({
    value: option.id,
    label: option.name,
  }));

  // Modal tạo tài khoản (`D-29`) — lỗi hiện TRONG modal, không toast (NFR-REL-001).
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: AccountCreatePayload) => createAccount(payload),
    onSuccess: () => {
      notify.success(MSG_ACC.CREATE_SUCCESS);
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      // Tạo tài khoản cũng ghi nhật ký hệ thống (`D-22`).
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (error) => {
      const httpStatus = error instanceof AdminApiError ? error.status : null;
      if (httpStatus === 409) {
        setCreateError(MSG_ACC.DUPLICATE);
      } else if (httpStatus === 403) {
        setCreateError(MSG_ORG.FORBIDDEN);
      } else if (httpStatus === 404) {
        setCreateError(msgBackendPending('D-29'));
      } else {
        setCreateError(MSG_ACC.CREATE_FAILED);
      }
    },
  });

  // Server là nguồn sự thật cho phân trang (§3): dùng số BE trả về để nhãn
  // `aria-rowindex` và số trang khớp dữ liệu đang hiện.
  const currentPage = result.data?.page ?? page;
  const pageSize = result.data?.size ?? size;
  const total = result.data?.total ?? 0;
  const rows = (result.data?.items ?? []) as AccountRow[];

  const pagination = useTablePagination<AccountRow>({
    page: currentPage,
    onPageChange: (next) =>
      updateParams({ page: next > 1 ? String(next) : null }, { resetPage: false }),
    totalItems: total,
    pageSize,
    onPageSizeChange: (next) =>
      updateParams({ size: next !== DEFAULT_PAGE_SIZE ? String(next) : null, page: null }),
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    label: MSG_ACC.PAGINATION_LABEL,
  });

  // Sắp xếp điều khiển từ URL (`?sort=username,asc`) để mũi tên bảng luôn khớp
  // với thứ tự BE đang thực sự áp dụng (không lệch sau khi reload trang).
  const sortPlugin = useTableSortable<AccountRow, AccountSortKey>({
    sort: parseSort(sort),
    onSortChange: (next) => {
      const first = next[0];
      updateParams(
        {
          sort: first
            ? `${first.sortKey},${first.direction === 'ascending' ? 'asc' : 'desc'}`
            : null,
        },
        { resetPage: false },
      );
    },
  });

  const applySearch = () => {
    updateParams({ q: keywordInput.trim() || null });
  };

  const columns: TableColumn<AccountRow>[] = [
    {
      key: 'username',
      header: 'Tên đăng nhập',
      width: proportional(1, { minWidth: 160 }),
      sortable: true,
      renderCell: (row) => row.username,
    },
    {
      key: 'email',
      header: 'Email',
      width: pixel(220),
      renderCell: (row) => row.email || EMPTY_VALUE,
    },
    {
      key: 'full_name',
      header: MSG_ACC.FULL_NAME,
      width: pixel(180),
      renderCell: (row) => row.full_name || EMPTY_VALUE,
    },
    {
      key: 'organization_name',
      header: MSG_ACC.ORGANIZATION,
      width: pixel(200),
      renderCell: (row) => row.organization_name || EMPTY_VALUE,
    },
    {
      key: 'role',
      header: MSG_ACC.ROLE,
      width: pixel(150),
      renderCell: (row) => roleLabel(row.role),
    },
    {
      key: 'status',
      header: MSG_ACC.FILTER_STATUS,
      width: pixel(130),
      // BR-08: Badge LUÔN kèm chữ, không chỉ dựa vào màu.
      renderCell: (row) => {
        const statusLabel = accountStatusLabel(row.status);
        return <Badge variant={statusLabel.badge} label={statusLabel.label} />;
      },
    },
    {
      key: 'created_at',
      header: MSG_ACC.CREATED_AT,
      width: pixel(150),
      sortable: true,
      renderCell: (row) => formatDateTime(row.created_at),
    },
    {
      key: 'last_login_at',
      header: MSG_ACC.LAST_LOGIN,
      width: pixel(150),
      renderCell: (row) => formatDateTime(row.last_login_at),
    },
    {
      key: 'action',
      header: 'Hành động',
      width: pixel(110),
      renderCell: (row) => (
        <AppLink
          to={`/quan-tri/tai-khoan/${row.id}?from=tai-khoan`}
          label={`Xem chi tiết tài khoản ${row.username}`}
        >
          {MSG_ORG.VIEW}
        </AppLink>
      ),
    },
  ];

  // 404 từ endpoint COLLECTION = BE chưa làm endpoint → hiện "chờ backend", KHÔNG hiện Empty.
  const isEndpointMissing =
    result.isError && result.error instanceof AdminApiError && result.error.status === 404;

  if (isEndpointMissing) {
    return (
      <Stack direction="vertical" gap={4}>
        <PageHeader title={MSG_ACC.LIST_TITLE} subtitle={MSG_ACC.LIST_SUBTITLE} />
        <Banner
          status="info"
          title={msgBackendPending(ENDPOINT_CODE)}
          description="Backend cần thêm endpoint GET /api/v1/accounts để màn này hoạt động. Bấm Thử lại sau khi backend cập nhật."
          collapsible={false}
          role="status"
          endContent={
            <Button
              variant="secondary"
              size="sm"
              label={MSG_ORG.RETRY}
              isLoading={result.isFetching}
              onClick={() => void result.refetch()}
            />
          }
        />
      </Stack>
    );
  }

  if (result.isError) {
    return (
      <Stack direction="vertical" gap={4}>
        {/* Giữ header cả ở nhánh lỗi (khác bản antd cũ vốn bỏ header) để người
            dùng luôn biết mình đang ở màn nào — theo mẫu `PendingOrganizationsPage`. */}
        <PageHeader title={MSG_ACC.LIST_TITLE} subtitle={MSG_ACC.LIST_SUBTITLE} />
        <Banner
          status="error"
          title={MSG_ACC.LOAD_ERROR}
          description="Kiểm tra kết nối máy chủ rồi thử lại. Danh sách chưa được tải."
          collapsible={false}
          role="alert"
          endContent={
            <Button
              variant="secondary"
              size="sm"
              label={MSG_ORG.RETRY}
              isLoading={result.isFetching}
              onClick={() => void result.refetch()}
            />
          }
        />
      </Stack>
    );
  }

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader
        title={MSG_ACC.LIST_TITLE}
        subtitle={MSG_ACC.LIST_SUBTITLE}
        extra={
          <Button
            variant="primary"
            size="lg"
            label={MSG_ACC.CREATE_TITLE}
            onClick={() => {
              setCreateError(null);
              setCreateOpen(true);
            }}
          />
        }
      >
        <HStack gap={3} wrap="wrap" align="end">
          <HStack gap={2} wrap="wrap" align="end">
            <TextInput
              type="search"
              label={MSG_ACC.SEARCH}
              isLabelHidden
              startIcon="search"
              enterKeyHint="search"
              hasClear
              placeholder="Tìm theo tên đăng nhập, email hoặc họ tên"
              value={keywordInput}
              width={320}
              onChange={(value) => {
                setKeywordInput(value);
                // Xoá nhanh: bỏ luôn điều kiện lọc thay vì phải bấm nút tìm.
                if (value === '') {
                  updateParams({ q: null });
                }
              }}
              onEnter={applySearch}
            />
            <Button
              variant="secondary"
              size="lg"
              label={MSG_ACC.SEARCH_ACTION}
              onClick={applySearch}
            />
          </HStack>

          <Selector
            label={MSG_ACC.FILTER_ORG}
            isLabelHidden
            hasClear
            placeholder={MSG_ACC.ALL_ORGS}
            options={orgFilterOptions}
            value={organizationId}
            isLoading={orgOptionsQuery.isFetching}
            width={200}
            onChange={(value) => updateParams({ organizationId: value || null })}
          />
          <Selector
            label={MSG_ACC.FILTER_ROLE}
            isLabelHidden
            hasClear
            placeholder={MSG_ACC.ALL_ROLES}
            options={[...ROLE_OPTIONS]}
            value={role}
            width={180}
            onChange={(value) => updateParams({ role: value || null })}
          />
          <Selector
            label={MSG_ACC.FILTER_STATUS}
            isLabelHidden
            hasClear
            placeholder={MSG_ACC.ALL_STATUSES}
            options={STATUS_OPTIONS}
            value={status?.[0] ?? null}
            width={170}
            onChange={(value) => updateParams({ status: value || null })}
          />
        </HStack>
      </PageHeader>

      {result.isPending ? (
        // Trạng thái loading — `PageLoading`. KHÔNG render bảng rỗng lúc đang tải
        // để tránh nhấp nháy "không có dữ liệu".
        <PageLoading />
      ) : (
        <Table<AccountRow>
          data={rows}
          columns={columns}
          idKey="id"
          hasHover
          textOverflow="truncate"
          // `aria-rowindex` phải tính theo trang hiện tại, không theo thứ tự
          // trong mảng một trang.
          rowIndexStart={(currentPage - 1) * pageSize + 1}
          rowCount={total}
          emptyState={<EmptyState description={MSG_ACC.EMPTY} compact />}
          plugins={{ sort: sortPlugin, pagination }}
        />
      )}

      <AccountCreateModal
        open={createOpen}
        // Danh sách tổ chức THẬT từ query (bỏ lựa chọn "Tất cả tổ chức").
        orgOptions={orgFilterOptions}
        loading={createMutation.isPending}
        error={createError}
        onCancel={() => setCreateOpen(false)}
        onConfirm={(payload) => createMutation.mutate(payload)}
      />
    </Stack>
  );
}
