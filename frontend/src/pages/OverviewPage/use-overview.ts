import { useQuery } from '@tanstack/react-query';
import { fetchPendingOrganizations } from '../../features/admin/adminApi';
import { adminKeys } from '../../features/admin/adminKeys';
import {
  fetchModuleCatalog,
  MODULE_CATALOG_STALE_TIME,
  moduleCatalogKey,
} from '../../features/modules/moduleApi';

/**
 * Container — server state của màn Tổng quan (`/quan-tri`).
 *
 * Dùng lại ĐÚNG 2 query key đã có (`adminKeys.pending` và `moduleCatalogKey`)
 * nên không phát sinh thêm request: màn danh sách chờ duyệt và khối cấu hình
 * module ở màn chi tiết đều đọc từ chính cache này.
 */
export function useOverview() {
  const pendingQuery = useQuery({
    queryKey: adminKeys.pending,
    queryFn: fetchPendingOrganizations,
  });

  const modulesQuery = useQuery({
    queryKey: moduleCatalogKey,
    queryFn: fetchModuleCatalog,
    staleTime: MODULE_CATALOG_STALE_TIME,
  });

  return { pendingQuery, modulesQuery };
}
