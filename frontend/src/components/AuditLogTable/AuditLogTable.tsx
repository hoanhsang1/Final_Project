import { Alert, Button, Empty, Skeleton, Table, Tag, Typography } from 'antd';
import type { TableProps } from 'antd';
import type { UseQueryResult } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import {
  auditActionLabel,
  auditTargetPath,
  auditTargetTypeLabel,
} from '../../features/admin/auditLabels';
import { MSG_AUD } from '../../features/admin/adminMessages';
import type { AuditLogItem, PageResponse } from '../../features/admin/types';

const { Text } = Typography;

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
 * `dangerouslySetInnerHTML` (`ADR-FE-003` §9). `BR-08`: Tag hành động luôn kèm chữ.
 */
export default function AuditLogTable({
  query,
  page,
  pageSize,
  showTarget = false,
  onPaginationChange,
  emptyText,
  errorText,
}: AuditLogTableProps) {
  const columns = [
    {
      title: MSG_AUD.TIME,
      key: 'created_at',
      render: (_value: unknown, record: AuditLogItem) => formatDateTime(record.created_at),
    },
    {
      title: MSG_AUD.ACTION,
      key: 'action',
      render: (_value: unknown, record: AuditLogItem) => {
        const actionLabel = auditActionLabel(record.action);
        // BR-08: Tag LUÔN kèm chữ, không chỉ màu.
        return <Tag color={actionLabel.color}>{actionLabel.label}</Tag>;
      },
    },
    ...(showTarget
      ? [
          {
            title: MSG_AUD.TARGET,
            key: 'target',
            render: (_value: unknown, record: AuditLogItem) => {
              const path = auditTargetPath(record);
              const label = `${auditTargetTypeLabel(record.target_type)}: ${record.target_name}`;
              return path ? (
                <Link to={path} aria-label={`Xem chi tiết ${label}`}>
                  {label}
                </Link>
              ) : (
                <Text aria-label={label}>{label}</Text>
              );
            },
          },
        ]
      : []),
    {
      title: MSG_AUD.ACTOR,
      key: 'actor_username',
      render: (_value: unknown, record: AuditLogItem) => record.actor_username || EMPTY_VALUE,
    },
    {
      title: MSG_AUD.DESCRIPTION,
      key: 'description',
      render: (_value: unknown, record: AuditLogItem) => record.description || EMPTY_VALUE,
    },
  ] satisfies TableProps<AuditLogItem>['columns'];

  if (query.isPending) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }

  if (query.isError) {
    return (
      <Alert
        type="error"
        showIcon
        role="alert"
        message={errorText}
        description="Kiểm tra kết nối máy chủ rồi thử lại."
        action={
          <Button onClick={() => void query.refetch()} loading={query.isFetching}>
            Thử lại
          </Button>
        }
      />
    );
  }

  return (
    <Table<AuditLogItem>
      rowKey="id"
      size="small"
      columns={columns}
      dataSource={query.data?.items ?? []}
      locale={{ emptyText: <Empty description={emptyText} /> }}
      onChange={onPaginationChange ? (pag) => onPaginationChange(pag.current ?? 1) : undefined}
      pagination={
        onPaginationChange
          ? {
              current: page,
              pageSize,
              total: query.data?.total ?? 0,
              showSizeChanger: false,
              showTotal: (total) => `Tổng ${total} sự kiện`,
            }
          : false
      }
      // Ở 320px bảng cuộn ngang thay vì vỡ layout.
      scroll={{ x: showTarget ? 900 : 720 }}
    />
  );
}
