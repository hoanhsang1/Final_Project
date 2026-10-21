import { useQuery } from '@tanstack/react-query';
import { fetchOrganizationDetail } from '../../features/admin/adminApi';
import { adminKeys } from '../../features/admin/adminKeys';

/**
 * Container — server state của màn chi tiết tổ chức.
 *
 * `retry: false` vì 404 (không có tổ chức) thử lại cũng vô nghĩa, và retry ẩn mất
 * trạng thái lỗi mà người dùng cần thấy.
 */
export function useOrganizationDetail(orgId: string) {
  return useQuery({
    queryKey: adminKeys.detail(orgId),
    queryFn: () => fetchOrganizationDetail(orgId),
    enabled: Boolean(orgId),
    retry: false,
  });
}
