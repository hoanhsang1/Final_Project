import { apiClient } from '../../lib/api';

/**
 * Danh mục module hệ thống — `GET /api/v1/modules`.
 *
 * Dùng CHUNG cho 3 nơi:
 * 1. Form đăng ký tổ chức (`D-03` — trước đây FE hardcode danh sách và còn
 *    chứa `FACILITY_MANAGEMENT` — mã KHÔNG tồn tại trong DB).
 * 2. Khối cấu hình module của Admin hệ thống (Sprint 2 §3.6).
 * 3. Màn Danh mục module `/quan-tri/module` (mở rộng console).
 *
 * BE trả `[{ code, name }]` — chỉ module có `is_active = TRUE`.
 */
export interface ModuleCatalogItem {
  code: string;
  name: string;
  /** `D-28` — BE chưa trả, UI hiện "—" khi thiếu. */
  description?: string;
}

/** Query key danh mục module — danh mục ít đổi nên cache lâu (`staleTime` lớn). */
export const moduleCatalogKey = ['modules'] as const;

/** Thời gian cache danh mục module: 10 phút (danh mục hiếm khi đổi). */
export const MODULE_CATALOG_STALE_TIME = 10 * 60 * 1000;

export async function fetchModuleCatalog(): Promise<ModuleCatalogItem[]> {
  const { data } = await apiClient.get<ModuleCatalogItem[]>('/api/v1/modules');
  return data;
}
