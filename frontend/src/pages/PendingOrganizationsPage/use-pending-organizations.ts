import { useQuery } from '@tanstack/react-query';
import { fetchPendingOrganizations } from '../../features/admin/adminApi';
import { adminKeys } from '../../features/admin/adminKeys';

/**
 * Container — server state của màn danh sách tổ chức chờ duyệt.
 *
 * TanStack Query giữ cache (NFR-PER-001), tự refetch khi focus lại tab, và cho
 * `refetch()` để nút "Thử lại" gọi lại được.
 */
export function usePendingOrganizations() {
  return useQuery({
    queryKey: adminKeys.pending,
    queryFn: fetchPendingOrganizations,
  });
}
