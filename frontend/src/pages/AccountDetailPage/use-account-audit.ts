import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs } from '../../features/admin/adminApi';
import { adminKeys } from '../../features/admin/adminKeys';

/**
 * Container — nhật ký của MỘT tài khoản.
 *
 * Dùng lại endpoint `GET /api/v1/audit-logs` (`D-22`) với filter `accountId`
 * — không tách endpoint riêng (`D-23` đã bỏ, xem đặc tả §8 #1).
 *
 * Khối nhật ký ở màn chi tiết cố định trang 1 (không phân trang trong khối) —
 * Admin cần xem nhanh, muốn xem đầy đủ thì vào màn Nhật ký hệ thống.
 */
export function useAccountAudit(accountId: string, pageSize: number) {
  const query = { accountId, page: 1, size: pageSize };
  return useQuery({
    queryKey: adminKeys.auditLogs(query),
    queryFn: () => fetchAuditLogs(query),
    enabled: Boolean(accountId),
    // Endpoint CHƯA có ở BE (`D-22`) → không retry để tránh gọi 404 hai lần.
    retry: false,
  });
}
