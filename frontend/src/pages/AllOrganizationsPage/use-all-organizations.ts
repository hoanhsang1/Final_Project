import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { fetchOrganizations } from '../../features/admin/adminApi';
import { adminKeys } from '../../features/admin/adminKeys';
import type { OrgStatus, OrgType } from '../../features/admin/types';

/** Số dòng / trang mặc định — `D-20` (`Q-30`: page 1-based, size 20). */
export const DEFAULT_PAGE_SIZE = 20;

/** Các lựa chọn số dòng / trang — khớp quy ước đặc tả §4.1. */
export const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];

/**
 * Container — server state + bộ lọc của màn Tất cả tổ chức `/quan-tri/to-chuc/tat-ca`.
 *
 * Bộ lọc + trang + sắp xếp lưu **trong URL** nên deep-link được, nút
 * "Quay lại danh sách" ở màn chi tiết giữ nguyên bộ lọc, và trình duyệt quay
 * lại không mất trạng thái (quyết định đặc tả §8 #11).
 */
export function useAllOrganizationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get('page') ?? '1') || 1;
  const size = Number(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE;
  const keyword = searchParams.get('q') ?? '';
  const statusParam = searchParams.get('status') ?? '';
  const orgTypeParam = searchParams.get('orgType') ?? '';
  const sort = searchParams.get('sort') ?? 'name,asc';

  const status: OrgStatus[] | undefined = statusParam
    ? (statusParam.split(',') as OrgStatus[])
    : undefined;
  const orgType: OrgType | null = orgTypeParam ? (orgTypeParam as OrgType) : null;

  const query = { page, size, keyword, status, orgType, sort };

  const result = useQuery({
    queryKey: adminKeys.list(query),
    queryFn: () => fetchOrganizations(query),
    // Endpoint CHƯA có ở BE (`D-20`) → không retry để tránh gọi 404 hai lần.
    retry: false,
  });

  /**
   * Ghi / xoá nhiều query param trong CÙNG một lần cập nhật URL.
   *
   * Gọi `setParam` nhiều lần sẽ race (mỗi lần đọc `searchParams` cũ) → mất
   * tham số vừa ghi, nên luôn gộp vào 1 object rồi cập nhật 1 lần.
   *
   * Đổi bộ lọc → luôn reset về **trang 1** (`resetPage: true`, mặc định).
   */
  const updateParams = (
    patch: Record<string, string | null>,
    { resetPage = true }: { resetPage?: boolean } = {},
  ) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    if (resetPage && !('page' in patch)) {
      next.delete('page');
    }
    setSearchParams(next, { replace: true });
  };

  return { result, page, size, keyword, status, orgType, sort, updateParams };
}
