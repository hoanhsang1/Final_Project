import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { fetchAuditLogs } from '../../features/admin/adminApi';
import { adminKeys } from '../../features/admin/adminKeys';
import type { AuditAction } from '../../features/admin/types';

/** Số dòng / trang mặc định — `D-22` (`Q-30`: page 1-based, size 20). */
export const AUDIT_PAGE_SIZE = 20;

/**
 * Container — server state + bộ lọc của màn Nhật ký hệ thống `/quan-tri/nhat-ky`.
 *
 * Bộ lọc + trang lưu trong URL để deep-link được và quay lại không mất trạng thái.
 *
 * ⚠️ Endpoint `GET /api/v1/audit-logs` (`D-22`) CHƯA có ở BE → tới khi Sang làm
 * xong, màn hiện "Tính năng đang chờ backend".
 */
export function useAuditLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get('page') ?? '1') || 1;
  const keyword = searchParams.get('q') ?? '';
  const actionParam = searchParams.get('action') ?? '';
  const from = searchParams.get('from') || null;
  const to = searchParams.get('to') || null;

  const action: AuditAction[] | undefined = actionParam
    ? (actionParam.split(',') as AuditAction[])
    : undefined;

  const query = { page, size: AUDIT_PAGE_SIZE, keyword, action, from, to };

  const result = useQuery({
    queryKey: adminKeys.auditLogs(query),
    queryFn: () => fetchAuditLogs(query),
    // Endpoint CHƯA có ở BE (`D-22`) → không retry để tránh gọi 404 hai lần.
    retry: false,
  });

  /** Ghi / xoá nhiều query param trong CÙNG một lần cập nhật URL. */
  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    if (!('page' in patch)) {
      next.delete('page');
    }
    setSearchParams(next, { replace: true });
  };

  return { result, page, keyword, action, from, to, updateParams };
}
