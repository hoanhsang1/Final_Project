import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs } from '../../features/admin/adminApi';
import { adminKeys } from '../../features/admin/adminKeys';

/** Số dòng / trang cho lịch sử 1 tổ chức. */
export const ORG_AUDIT_PAGE_SIZE = 20;

/**
 * Container — lịch sử duyệt của MỘT tổ chức.
 *
 * Dùng lại endpoint `GET /api/v1/audit-logs` (`D-22`) với filter `organizationId`
 * — không tách endpoint riêng (`D-23` đã bỏ, xem đặc tả §8 #1).
 */
export function useOrganizationAudit(orgId: string, page: number) {
  const query = { organizationId: orgId, page, size: ORG_AUDIT_PAGE_SIZE };
  return useQuery({
    queryKey: adminKeys.auditLogs(query),
    queryFn: () => fetchAuditLogs(query),
    enabled: Boolean(orgId),
    // Endpoint CHƯA có ở BE (`D-22`) → không retry để tránh gọi 404 hai lần.
    retry: false,
  });
}
