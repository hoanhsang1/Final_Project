import { apiClient } from '../../lib/api';
import { getApiCode } from '../platform/errorCodes';

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

/* -------------------------------------------------------------------------- */
/*  Module theo tổ chức (OWNER / SUPER_ADMIN)                                   */
/* -------------------------------------------------------------------------- */

/** Trạng thái module theo tổ chức — BE trả lowercase. */
export type ModuleStatusCode = 'active' | 'disabled' | 'locked' | 'not_registered';

/** `GET /api/v1/organizations/my/modules` — góc nhìn OWNER. */
export interface OwnerModuleItem {
  code: string;
  name: string;
  is_core: boolean;
  status: ModuleStatusCode;
  is_locked_by_admin: boolean;
  /** BE OWNER không trả lý do/thời gian lock; giữ optional để UI vẫn hiện khi có. */
  locked_reason?: string | null;
  locked_at?: string | null;
}

/** `GET /api/v1/organizations/{orgId}/modules/admin` — góc nhìn SUPER_ADMIN. */
export interface AdminModuleItem {
  code: string;
  name: string;
  is_core: boolean;
  status: ModuleStatusCode;
  locked_by_admin: boolean;
  locked_reason: string | null;
  locked_at: string | null;
  disabled_at: string | null;
}

/** `GET /api/v1/modules/status` — chỉ các field cần để lọc menu. */
export interface ModuleStatusItem {
  code: string;
  name: string;
  is_core: boolean;
  status: ModuleStatusCode;
}

/** Map `code → status` — dạng `useModuleStatus()` trả cho menu. */
export type ModuleStatusMap = Record<string, ModuleStatusCode>;

/** Body của `PATCH …/{code}/lock` — `reason` bắt buộc cho CẢ lock lẫn unlock. */
export interface ModuleLockPayload {
  lock: boolean;
  reason: string;
}

export const myModulesKey = ['organization', 'my', 'modules'] as const;
export const adminModulesKey = (orgId: string) =>
  ['organization', orgId, 'modules', 'admin'] as const;
export const moduleStatusKey = ['modules', 'status'] as const;
/** Trạng thái module đổi thường xuyên hơn danh mục → cache ngắn hơn. */
export const MODULE_STATUS_STALE_TIME = 60 * 1000;

/** Lỗi API module — giữ `code` dạng CHUỖI để caller so sánh đúng enum BE. */
export class ModuleApiError extends Error {
  readonly code?: string;
  readonly status?: number;

  constructor(message: string, options: { code?: string; status?: number } = {}) {
    super(message);
    this.name = 'ModuleApiError';
    this.code = options.code;
    this.status = options.status;
  }
}

function codeOf(error: unknown): string | undefined {
  if (error instanceof ModuleApiError) {
    return error.code;
  }
  return getApiCode(error);
}

/**
 * Dịch mã lỗi module sang tiếng Việt (`NFR-REL-001`: không hiện message tiếng Anh).
 *
 * ⚠️ Chỉ nhận mã CHUỖI. BE từng trả mã số (`1128` cho `MODULE_LOCKED_BY_ADMIN`)
 * ở một số envelope cũ — `getApiCode` lọc số đó ra để FE không nhầm thành enum.
 */
export function moduleErrorMessage(error: unknown): string {
  switch (codeOf(error)) {
    case 'MODULE_IS_CORE':
      return 'Module lõi, không thể thay đổi trạng thái.';
    case 'MODULE_LOCKED_BY_ADMIN':
      return 'Module đã bị khoá bởi quản trị viên. Vui lòng liên hệ quản trị viên để mở khoá.';
    case 'MODULE_PENDING_WORKFLOWS':
      return 'Module vẫn còn quy trình đang xử lý. Hãy hoàn tất trước khi tắt module.';
    case 'MODULE_LOCK_REASON_REQUIRED':
      return 'Vui lòng nhập lý do';
    default:
      return 'Không thể thực hiện thao tác này. Vui lòng thử lại.';
  }
}

function toModuleApiError(error: unknown): ModuleApiError {
  if (error instanceof ModuleApiError) {
    return error;
  }
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return new ModuleApiError(moduleErrorMessage(error), {
    code: getApiCode(error),
    status: typeof status === 'number' ? status : undefined,
  });
}

async function request<T>(call: () => Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await call();
    return data;
  } catch (error) {
    throw toModuleApiError(error);
  }
}

/** PATCH 204 không có body — caller chỉ cần biết thao tác xong hay lỗi. */
async function requestVoid(call: () => Promise<unknown>): Promise<void> {
  try {
    await call();
  } catch (error) {
    throw toModuleApiError(error);
  }
}

/** Module của chính tổ chức OWNER — `GET /api/v1/organizations/my/modules`. */
export function fetchMyModules(): Promise<OwnerModuleItem[]> {
  return request(() => apiClient.get<OwnerModuleItem[]>('/api/v1/organizations/my/modules'));
}

/** Bật/tắt module của OWNER — `PATCH …/my/modules/{code}` → 204. */
export function toggleMyModule(code: string, enabled: boolean): Promise<void> {
  return requestVoid(() =>
    apiClient.patch(`/api/v1/organizations/my/modules/${code}`, { enabled }),
  );
}

/** Module của 1 tổ chức dưới góc nhìn SUPER_ADMIN. */
export function fetchAdminModules(orgId: string): Promise<AdminModuleItem[]> {
  return request(() =>
    apiClient.get<AdminModuleItem[]>(`/api/v1/organizations/${orgId}/modules/admin`),
  );
}

/** Khoá/mở khoá module — `PATCH …/{code}/lock` → 204, `reason` luôn bắt buộc. */
export function lockAdminModule(
  orgId: string,
  code: string,
  payload: ModuleLockPayload,
): Promise<void> {
  return requestVoid(() =>
    apiClient.patch(`/api/v1/organizations/${orgId}/modules/${code}/lock`, payload),
  );
}

/** Trạng thái module của tổ chức hiện tại — dùng để lọc menu. */
export function fetchModuleStatus(): Promise<ModuleStatusItem[]> {
  return request(() => apiClient.get<ModuleStatusItem[]>('/api/v1/modules/status'));
}
