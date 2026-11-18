import {
  Badge,
  Banner,
  Button,
  pixel,
  proportional,
  Stack,
  Table,
  Text,
  useTablePagination,
} from '@astryxdesign/core';
import type { TableColumn } from '@astryxdesign/core';
import type { UseQueryResult } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { AppLink } from '../AppLink/AppLink';
import EmptyState from '../EmptyState/EmptyState';
import PageLoading from '../PageLoading/PageLoading';
import {
  auditActionLabel,
  auditTargetPath,
  auditTargetTypeLabel,
} from '../../features/admin/auditLabels';
import { MSG_AUD, MSG_ORG, auditTotalLabel } from '../../features/admin/adminMessages';
import type { AuditLogItem, PageResponse } from '../../features/admin/types';

/** Giá trị hiển thị khi BE chưa trả. */
const EMPTY_VALUE = '—';

/** Định dạng ngày giờ; trả về "—" khi dữ liệu thiếu hoặc không hợp lệ. */
function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY HH:mm') : EMPTY_VALUE;
}

/**
 * `Table` của Astryx buộc `T extends Record<string, unknown>`, còn `AuditLogItem`
 * là interface nên không tự thoả — giao thêm `Record` để thoả ràng buộc mà
 * **không** nới lỏng DTO (xem `docs/ui-conventions.md` §6.11).
 */
type AuditRow = AuditLogItem & Record<string, unknown>;

interface AuditLogTableProps {
  /** Kết quả query danh sách nhật ký — component này xử lý cả 4 trạng thái loading/error/empty/success. */
  query: UseQueryResult<PageResponse<AuditLogItem>>;
  /** Trang hiện tại (1-based). */
  page: number;
  /** Số dòng / trang hiện tại. */
  pageSize: number;
  /**
   * Có hiện cột **Đối tượng** không?
   *
   * Màn "Lịch sử duyệt tổ chức" và "Nhật ký của tài khoản" đã biết đối tượng
   * (đang đứng trên chính nó) → ẩn cột để bảng gọn hơn.
   */
  showTarget?: boolean;
  /** Bấm đổi trang — bỏ trống nếu màn không phân trang. */
  onPaginationChange?: (page: number) => void;
  /** Câu chữ khi không có sự kiện nào. */
  emptyText: string;
  /** Câu chữ khi tải lỗi. */
  errorText: string;
  /** Nhãn phân trang (tiếng Việt) — mặc định nhãn của màn Nhật ký hệ thống. */
  paginationLabel?: string;
  /**
   * Cấp heading của câu rỗng. Mặc định 2 vì trang đã có H1; đặt 3 khi bảng nằm
   * trong một `DetailSection` (đã có H2) để heading không nhảy cấp.
   */
  emptyHeadingLevel?: 2 | 3 | 4;
}

/**
 * Bảng nhật ký hệ thống — dùng **chung** cho 3 chỗ:
 * 1. Màn Nhật ký hệ thống `/quan-tri/nhat-ky`.
 * 2. Màn Lịch sử duyệt tổ chức `/quan-tri/to-chuc/:id/lich-su`.
 * 3. Khối "Nhật ký của tài khoản" ở màn Chi tiết tài khoản.
 *
 * Nguồn dữ liệu: `GET /api/v1/audit-logs` (`D-22`) với tham số lọc khác nhau.
 *
 * ⚠️ Ghi chú là dữ liệu người dùng nhập ⇒ render **TEXT THUẦN**, không
 * `dangerouslySetInnerHTML` (`ADR-FE-003` §9). `BR-08`: Badge hành động luôn kèm chữ.
 */
export default function AuditLogTable({
  query,
  page,
  pageSize,
  showTarget = false,
  onPaginationChange,
  emptyText,
  errorText,
  paginationLabel,
  emptyHeadingLevel = 2,
}: AuditLogTableProps) {
  const total = query.data?.total ?? 0;
  const rows = (query.data?.items ?? []) as AuditRow[];

  // Hook phân trang phải gọi vô điều kiện (rules of hooks). Khi màn không phân
  // trang (`onPaginationChange` trống) thì plugin vẫn dựng nhưng không truyền vào
  // `Table` — điều khiển không xuất hiện.
  const pagination = useTablePagination<AuditRow>({
    page,
    onPageChange: onPaginationChange ?? (() => {}),
    totalItems: total,
    pageSize,
    label: paginationLabel ?? MSG_AUD.PAGINATION_LABEL,
  });

  const targetColumn: TableColumn<AuditRow> = {
    key: 'target',
    header: MSG_AUD.TARGET,
    width: proportional(1, { minWidth: 200 }),
    renderCell: (row) => {
      const path = auditTargetPath(row);
      const label = `${auditTargetTypeLabel(row.target_type)}: ${row.target_name}`;
      return path ? (
        <AppLink to={path} label={`Xem chi tiết ${label}`}>
          {label}
        </AppLink>
      ) : (
        <Text aria-label={label}>{label}</Text>
      );
    },
  };

  const columns: TableColumn<AuditRow>[] = [
    {
      key: 'created_at',
      header: MSG_AUD.TIME,
      width: pixel(150),
      renderCell: (row) => formatDateTime(row.created_at),
    },
    {
      key: 'action',
      header: MSG_AUD.ACTION,
      width: proportional(1, { minWidth: 180 }),
      // BR-08: Badge LUÔN kèm chữ, không chỉ màu.
      renderCell: (row) => {
        const actionLabel = auditActionLabel(row.action);
        return <Badge variant={actionLabel.badge} label={actionLabel.label} />;
      },
    },
    ...(showTarget ? [targetColumn] : []),
    {
      key: 'actor_username',
      header: MSG_AUD.ACTOR,
      width: pixel(160),
      renderCell: (row) => row.actor_username || EMPTY_VALUE,
    },
    {
      key: 'description',
      header: MSG_AUD.DESCRIPTION,
      width: proportional(1, { minWidth: 200 }),
      renderCell: (row) => row.description || EMPTY_VALUE,
    },
  ];

  if (query.isPending) {
    return <PageLoading />;
  }

  if (query.isError) {
    return (
      <Banner
        status="error"
        role="alert"
        collapsible={false}
        title={errorText}
        description="Kiểm tra kết nối máy chủ rồi thử lại."
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
    );
  }

  return (
    <Stack direction="vertical" gap={3}>
      {/* `total` là số BE trả về (sau khi lọc), không phải số dòng một trang. */}
      {onPaginationChange ? <Text type="supporting">{auditTotalLabel(total)}</Text> : null}
      <Table<AuditRow>
        data={rows}
        columns={columns}
        idKey="id"
        density="compact"
        hasHover
        textOverflow="truncate"
        // `aria-rowindex` phải tính theo trang hiện tại, không theo thứ tự trong
        // mảng một trang.
        rowIndexStart={(page - 1) * pageSize + 1}
        rowCount={total}
        emptyState={<EmptyState description={emptyText} compact headingLevel={emptyHeadingLevel} />}
        plugins={onPaginationChange ? { pagination } : undefined}
      />
    </Stack>
  );
}
