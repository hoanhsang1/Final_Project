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
  Text,
  TextInput,
  useTablePagination,
  useTableSortable,
} from '@astryxdesign/core';
import type { TableColumn, TableSortState } from '@astryxdesign/core';
import dayjs from 'dayjs';
import { useState } from 'react';
import { AppLink } from '../../components/AppLink/AppLink';
import EmptyState from '../../components/EmptyState/EmptyState';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import SuspendOrganizationModal from '../../components/SuspendOrganizationModal/SuspendOrganizationModal';
import { AdminApiError } from '../../features/admin/adminApi';
import {
  MSG_ORG,
  msgBackendPending,
  msgReactivated,
  msgSuspended,
  orgTotalLabel,
} from '../../features/admin/adminMessages';
import { organizationStatusLabel, orgTypeLabel } from '../../features/admin/statusLabels';
import { useSuspendOrganization } from '../../features/admin/use-suspend-organization';
import type { OrganizationAction } from '../../features/admin/use-suspend-organization';
import type { OrganizationListItem } from '../../features/admin/types';
import { useNotify } from '../../hooks/useNotify';
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  useAllOrganizationsPage,
} from './use-all-organizations';

/** Mã endpoint đang chờ — hiện trên UI để Vy đối chiếu với đặc tả §4.2. */
const ENDPOINT_CODE = 'D-20';

/** Giá trị hiển thị khi BE chưa trả (`D-19`). */
const EMPTY_VALUE = '—';

/**
 * `Table` của Astryx buộc `T extends Record<string, unknown>`, còn
 * `OrganizationListItem` là interface nên không tự thoả — giao thêm `Record`
 * để thoả ràng buộc mà **không** nới lỏng DTO (xem `docs/ui-conventions.md` §6.11).
 */
type OrgRow = OrganizationListItem & Record<string, unknown>;

/** Hai cột BE cho sắp xếp (`?sort=<key>,<asc|desc>`). */
const SORT_KEYS = ['name', 'created_at'] as const;
type OrgSortKey = (typeof SORT_KEYS)[number];

/** Dựng state sắp xếp của plugin từ tham số `sort` trên URL (nguồn sự thật). */
function parseSort(sort: string): TableSortState<OrgSortKey> {
  const [key, direction] = (sort ?? '').split(',');
  if (!(SORT_KEYS as readonly string[]).includes(key)) {
    return [];
  }
  return [{ sortKey: key as OrgSortKey, direction: direction === 'desc' ? 'descending' : 'ascending' }];
}

/** Lựa chọn bộ lọc trạng thái — giá trị là ENUM `organization.status`. */
const STATUS_OPTIONS = [
  { value: 'pending', label: organizationStatusLabel('pending').label },
  { value: 'active', label: organizationStatusLabel('active').label },
  { value: 'rejected', label: organizationStatusLabel('rejected').label },
  { value: 'suspended', label: organizationStatusLabel('suspended').label },
];

/** Lựa chọn bộ lọc loại tổ chức — giá trị là ENUM `organization.org_type`. */
const TYPE_OPTIONS = [
  { value: 'school', label: orgTypeLabel('school') },
  { value: 'center', label: orgTypeLabel('center') },
];

/** Định dạng ngày giờ; trả về "—" khi BE chưa trả (`D-19`). */
function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY HH:mm') : EMPTY_VALUE;
}

/**
 * Màn Tất cả tổ chức `/quan-tri/to-chuc/tat-ca`.
 *
 * ⚠️ Endpoint `GET /api/v1/organizations` (`D-20`) CHƯA có ở BE → tới khi Sang
 * làm xong, màn này hiện "Tính năng đang chờ backend" (xem §4.5 của đặc tả),
 * KHÔNG hiện Empty rỗng để tránh hiểu nhầm là không có tổ chức nào.
 *
 * Trạng thái: **loading** (PageLoading) · **empty** (EmptyState) · **error**
 * (Banner + Thử lại) · **success**. No-permission do `AdminGuard` chặn trước.
 */
export default function AllOrganizationsPage() {
  const notify = useNotify();
  const { result, page, size, keyword, status, orgType, sort, updateParams } =
    useAllOrganizationsPage();

  // Ô nhập tách khỏi tham số URL: gõ chưa xong thì chưa lọc (khớp `Input.Search` cũ).
  const [keywordInput, setKeywordInput] = useState(keyword);
  const [suspendTarget, setSuspendTarget] = useState<OrganizationListItem | null>(null);
  const [suspendAction, setSuspendAction] = useState<OrganizationAction>('suspend');
  /**
   * Lỗi của thao tác vô hiệu hoá / kích hoạt lại gần nhất.
   *
   * Chuyển từ `message.error` (toast tự biến mất, bị modal che) sang `Banner`
   * để người dùng đọc được lý do thất bại và bấm thử lại (NFR-REL-001).
   */
  const [actionError, setActionError] = useState<string | null>(null);

  const suspendMutation = useSuspendOrganization(suspendTarget?.id ?? '');

  // Server là nguồn sự thật cho phân trang (§3): dùng số BE trả về để nhãn
  // `aria-rowindex` và số trang khớp dữ liệu đang hiện.
  const currentPage = result.data?.page ?? page;
  const pageSize = result.data?.size ?? size;
  const total = result.data?.total ?? 0;
  const rows = (result.data?.items ?? []) as OrgRow[];

  const pagination = useTablePagination<OrgRow>({
    page: currentPage,
    onPageChange: (next) =>
      updateParams({ page: next > 1 ? String(next) : null }, { resetPage: false }),
    totalItems: total,
    pageSize,
    onPageSizeChange: (next) =>
      updateParams({ size: next !== DEFAULT_PAGE_SIZE ? String(next) : null, page: null }),
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    label: MSG_ORG.ALL_PAGINATION_LABEL,
  });

  // Sắp xếp điều khiển từ URL (`?sort=name,asc`) để mũi tên bảng luôn khớp với
  // thứ tự BE đang thực sự áp dụng (không lệch sau khi reload trang).
  const sortPlugin = useTableSortable<OrgRow, OrgSortKey>({
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

  const handleSuspendError = (error: unknown) => {
    const httpStatus = error instanceof AdminApiError ? error.status : null;
    if (httpStatus === 404) {
      setActionError(msgBackendPending(ENDPOINT_CODE));
      return;
    }
    if (httpStatus === 403) {
      setActionError(MSG_ORG.FORBIDDEN);
      return;
    }
    // NFR-REL-001: lỗi/timeout thì báo lỗi rõ, KHÔNG hiện thành công.
    setActionError(MSG_ORG.SAVE_FAILED);
  };

  const columns: TableColumn<OrgRow>[] = [
    {
      key: 'name',
      header: 'Tên tổ chức',
      width: proportional(1, { minWidth: 200 }),
      sortable: true,
      renderCell: (row) => row.name,
    },
    {
      key: 'org_type',
      header: MSG_ORG.FILTER_TYPE,
      width: pixel(110),
      renderCell: (row) => orgTypeLabel(row.org_type),
    },
    {
      key: 'owner_username',
      header: 'Người đại diện',
      width: pixel(170),
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
      header: MSG_ORG.FILTER_STATUS,
      width: pixel(130),
      // BR-08: Badge LUÔN kèm chữ, không chỉ dựa vào màu.
      renderCell: (row) => {
        const statusLabel = organizationStatusLabel(row.status);
        return <Badge variant={statusLabel.badge} label={statusLabel.label} />;
      },
    },
    {
      key: 'created_at',
      header: 'Ngày gửi',
      width: pixel(150),
      sortable: true,
      renderCell: (row) => formatDateTime(row.created_at),
    },
    {
      key: 'action',
      header: 'Hành động',
      width: pixel(200),
      renderCell: (row) => {
        // Ma trận đặc tả §3.3: `pending` → chỉ Duyệt/Từ chối ở màn chi tiết;
        // `active`/`rejected` → Vô hiệu hoá; `suspended` → Kích hoạt lại.
        const nextAction: OrganizationAction | null =
          row.status === 'suspended'
            ? 'reactivate'
            : row.status === 'pending'
              ? null
              : 'suspend';
        const nextLabel = nextAction === 'suspend' ? MSG_ORG.SUSPEND : MSG_ORG.REACTIVATE;

        return (
          <HStack gap={2} align="center">
            <AppLink
              to={`/quan-tri/to-chuc/${row.id}?from=to-chuc-tat-ca`}
              label={`Xem chi tiết tổ chức ${row.name}`}
            >
              {MSG_ORG.VIEW}
            </AppLink>
            {nextAction ? (
              <Button
                variant="ghost"
                size="sm"
                label={nextLabel}
                aria-label={`${nextLabel} tổ chức ${row.name}`}
                onClick={() => {
                  setActionError(null);
                  setSuspendTarget(row);
                  setSuspendAction(nextAction);
                }}
              />
            ) : null}
          </HStack>
        );
      },
    },
  ];

  // 404 từ endpoint COLLECTION = BE chưa làm endpoint → hiện "chờ backend", KHÔNG hiện Empty.
  const isEndpointMissing =
    result.isError && result.error instanceof AdminApiError && result.error.status === 404;

  if (isEndpointMissing) {
    return (
      <Stack direction="vertical" gap={4}>
        <PageHeader title={MSG_ORG.ALL_LIST_TITLE} subtitle={MSG_ORG.ALL_LIST_SUBTITLE} />
        <Banner
          status="info"
          title={msgBackendPending(ENDPOINT_CODE)}
          description="Backend cần thêm endpoint GET /api/v1/organizations để màn này hoạt động. Bấm Thử lại sau khi backend cập nhật."
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
        <PageHeader title={MSG_ORG.ALL_LIST_TITLE} subtitle={MSG_ORG.ALL_LIST_SUBTITLE} />
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
      <PageHeader title={MSG_ORG.ALL_LIST_TITLE} subtitle={MSG_ORG.ALL_LIST_SUBTITLE}>
        <HStack gap={3} wrap="wrap" align="end">
          <HStack gap={2} wrap="wrap" align="end">
            <TextInput
              type="search"
              label={MSG_ORG.SEARCH}
              isLabelHidden
              startIcon="search"
              enterKeyHint="search"
              hasClear
              placeholder="Tìm theo tên tổ chức hoặc email"
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
              label={MSG_ORG.SEARCH_ACTION}
              onClick={applySearch}
            />
          </HStack>

          <Selector
            label={MSG_ORG.FILTER_STATUS}
            isLabelHidden
            hasClear
            placeholder={MSG_ORG.ALL_STATUSES}
            options={STATUS_OPTIONS}
            value={status?.[0] ?? null}
            width={180}
            onChange={(value) => updateParams({ status: value || null })}
          />
          <Selector
            label={MSG_ORG.FILTER_TYPE}
            isLabelHidden
            hasClear
            placeholder={MSG_ORG.ALL_TYPES}
            options={TYPE_OPTIONS}
            value={orgType ?? null}
            width={160}
            onChange={(value) => updateParams({ orgType: value || null })}
          />
        </HStack>
      </PageHeader>

      {/* Lỗi thao tác — hiện khi modal đã đóng; khi modal còn mở thì lỗi nằm
          trong modal (Banner chồng lên bảng thì người dùng không thấy). */}
      {actionError && suspendTarget === null ? (
        <Banner status="error" title={actionError} collapsible={false} role="alert" />
      ) : null}

      {result.isPending ? (
        <PageLoading />
      ) : (
        <Stack direction="vertical" gap={3}>
          {/* `total` là số BE trả về (sau khi lọc), không phải số dòng một trang. */}
          <Text type="supporting">{orgTotalLabel(total)}</Text>
          <Table<OrgRow>
            data={rows}
            columns={columns}
            idKey="id"
            hasHover
            textOverflow="truncate"
            // `aria-rowindex` phải tính theo trang hiện tại, không theo thứ tự
            // trong mảng một trang.
            rowIndexStart={(currentPage - 1) * pageSize + 1}
            rowCount={total}
            emptyState={<EmptyState description={MSG_ORG.ALL_EMPTY} compact />}
            plugins={{ sort: sortPlugin, pagination }}
          />
        </Stack>
      )}

      <SuspendOrganizationModal
        open={suspendTarget !== null}
        mode={suspendAction}
        orgName={suspendTarget?.name ?? ''}
        loading={suspendMutation.isPending}
        error={actionError}
        onCancel={() => setSuspendTarget(null)}
        onConfirm={(reason) =>
          suspendMutation.mutate(
            { action: suspendAction, reason },
            {
              onSuccess: () => {
                notify.success(
                  suspendAction === 'suspend'
                    ? msgSuspended(suspendTarget?.name ?? '')
                    : msgReactivated(suspendTarget?.name ?? ''),
                );
                setActionError(null);
                setSuspendTarget(null);
              },
              onError: handleSuspendError,
            },
          )
        }
      />
    </Stack>
  );
}
