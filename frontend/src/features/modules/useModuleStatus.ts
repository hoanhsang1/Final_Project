import { useQuery } from '@tanstack/react-query';
import {
  fetchModuleStatus,
  MODULE_STATUS_STALE_TIME,
  moduleStatusKey,
  type ModuleStatusMap,
} from './moduleApi';

/**
 * Trạng thái module của tổ chức hiện tại (`GET /api/v1/modules/status`).
 *
 * Trả về map `{ code: status }` để menu (và page) tra cứu O(1). Lỗi được ném ra
 * nguyên với `ModuleApiError` — hook KHÔNG trả map rỗng giả thành công, tránh
 * hiện menu sai khi không tải được trạng thái (`NFR-REL-001`).
 */
export function useModuleStatus() {
  return useQuery<ModuleStatusMap>({
    queryKey: moduleStatusKey,
    queryFn: async () => {
      const items = await fetchModuleStatus();
      return Object.fromEntries(items.map((item) => [item.code, item.status])) as ModuleStatusMap;
    },
    staleTime: MODULE_STATUS_STALE_TIME,
  });
}
