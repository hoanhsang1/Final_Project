import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  fetchModuleCatalog,
  MODULE_CATALOG_STALE_TIME,
  moduleCatalogKey,
} from '../../features/modules/moduleApi';

/** Tên query param lưu bộ lọc phân loại — `?loi=core` | `?loi=mo-rong`. */
export const MODULE_CATEGORY_PARAM = 'loi';

/** Tên query param lưu từ khoá tìm kiếm — `?q=...`. */
export const MODULE_SEARCH_PARAM = 'q';

/**
 * Container — server state + bộ lọc của màn Danh mục module `/quan-tri/module`.
 *
 * Bộ lọc lưu **trong URL** (quyết định đặc tả §8 #11) nên Admin gửi link được
 * cho người khác và trình duyệt quay lại vẫn giữ nguyên bộ lọc.
 */
export function useModuleCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useQuery({
    queryKey: moduleCatalogKey,
    queryFn: fetchModuleCatalog,
    staleTime: MODULE_CATALOG_STALE_TIME,
  });

  const category = searchParams.get(MODULE_CATEGORY_PARAM);
  const keyword = searchParams.get(MODULE_SEARCH_PARAM) ?? '';

  /** Ghi/ xoá 1 query param; luôn `replace` để không xếp lịch sử trang. */
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  return { query, category, keyword, setParam };
}
