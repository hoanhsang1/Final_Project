> ⚠️ **Snapshot lịch sử — đối chiếu 2026-11-26.** Mọi trạng thái/số liệu/lệnh bên dưới là tại thời điểm soạn, không phải hiện tại. Nguồn chuẩn hiện tại: `D:\Final_Project\docs\trang-thai-hien-tai-2026-11-26.md`; quyết định P4: `D:\Final_Project\docs\scope-can-chot-xep-lich.md`. Giữ lại để tra cứu, không xoá.

# Sync IdentityService - internal endpoints cho slice Lớp/Giáo viên

> Trạng thái: **đã port an toàn, chưa compile/verify** (thiếu JDK).  
> Nhánh: `chore/sync-main-class-flow`. Nguồn: `origin/main`.  
> Mục tiêu: bổ sung các endpoint nội bộ mà PeopleService đã port cần, **không** đụng vào permission catalog hay FE.

## 1. Vì sao cần slice này

`OrganizationModuleGuard` và `IdentityClient` (đã port từ main vào PeopleService) gọi sang IdentityService:

| Endpoint FE/BE gọi | Mục đích | Trạng thái HEAD trước sync |
|---|---|---|
| `GET /internal/orgs/{orgId}/modules` | active module codes | **thiếu** |
| `GET /internal/orgs/{orgId}/modules/status` | trạng thái đầy đủ (code, status, is_core, is_locked_by_admin) | **thiếu** |
| `POST /internal/accounts/{id}/reset-password?orgId=` | HR-02 mật khẩu tạm, `Cache-Control: no-store` | **thiếu** |
| `PATCH /internal/accounts/{id}/disable?orgId=` | khoá tài khoản + thu hồi refresh token | **thiếu** |
| `PATCH /internal/accounts/{id}/enable?orgId=` | mở tài khoản | **thiếu** |
| `GET /internal/permissions` | danh mục quyền | đã có |
| `GET /internal/permissions/bundles` | bundle quyền cho chức danh | **thiếu — Cần xác minh** (xem mục 4) |

## 2. Đã áp dụng

| File | Thay đổi |
|---|---|
| `controller/InternalOrganizationController.java` | checkout từ main: `GET /internal/orgs/{orgId}/modules` và `/modules/status`, dùng `JdbcTemplate` trên `module` + `organization_module` |
| `controller/InternalAccountController.java` | thêm `reset-password` (trả header `Cache-Control: no-store`, `Pragma: no-cache`), `disable`, `enable`; giữ nguyên `create`/`delete` cũ |
| `service/AccountProvisioningService.java` | thêm `resetPassword` (sinh mật khẩu ngẫu nhiên 24 byte Base64URL, `must_change_password=TRUE`), `disable`, `enable`, `revokeSessions` (UPDATE `refresh_token.revoked_at`); giữ `create`/`compensate` cũ và dùng `ApiException` hiện có |

## 3. Kiểm tra tĩnh

- Quét 62 file Java (main + test) của IdentityService: **0 import `com.mems.*` bị thiếu**.
- `SecurityConfig` đã `requestMatchers("/internal/**").permitAll()` + `InternalApiFilter` kiểm tra `X-Internal-Api-Key` → không đổi security.
- `01_identity_db.sql` đã có bảng `module`, `organization_module`, `refresh_token.revoked_at`, **nhưng cột chưa khớp main** (xem mục 4) → code compile được nhưng chạy với schema HEAD sẽ lỗi SQL.
- **Không đổi** `PermissionCatalog.ENTRIES`, không đổi FE, không đổi build/lint/CI.

## 4. Cần xác minh / chưa làm

- **Schema chưa khớp (Cần xác minh, bắt buộc trước runtime)**: `InternalOrganizationController` query `module.is_core` — HEAD `module` **không có cột này**. HEAD `organization_module.status` là `ENUM('requested','active','rejected')`, trong khi controller/main cần `locked`/`disabled` và các cột `disabled_at`, `locked_by_admin`, `locked_reason`, `locked_at`, `status_before_lock`. Không tự đổi query (đổi logic module guard) cũng không tự ALTER DB; xem `docs/sync-schema-gap.md` mục 5.
- **`/internal/permissions/bundles`**: `IdentityClient.permissionBundles()` của main gọi endpoint này và `DefaultPositionSeeder` dùng bundle. HEAD IdentityService chỉ có `PermissionCatalog.ENTRIES` (5 mã cũ), thiếu `BundleDefinition`/`BUNDLES`. Port endpoint này bắt buộc phải định nghĩa lại danh mục bundle — tức là đổi logic nghiệp vụ/phân quyền. **Không tự làm**; để `Cần xác minh`, chờ chốt catalog. Xem `docs/sync-permission-code-conflict.md`.
- **Không có JDK/JAVA_HOME/Maven**: chưa compile, chưa chạy test IdentityService. Lệnh cần chạy khi có toolchain: `./mvnw -q -DskipTests compile` rồi `./mvnw test`.
- Runtime: cần kiểm tra seeder có fail khi `/internal/permissions/bundles` trả 404 không (có thể fallback/cache của `IdentityClient` xử lý, chưa xác minh được).
- Schema tổng thể vẫn thiếu 29 bảng so với `db.sql` — xem `docs/sync-schema-gap.md`; không apply `db.sql` trực tiếp.

## 5. Bước tiếp theo

1. Chạy build/test với JDK khi có môi trường.
2. Chốt catalog quyền (FE cũ vs BE granular) rồi mới quyết định port `/internal/permissions/bundles`.
3. Giữ P4 xếp lịch tự động **BLOCKED** theo `docs/scope-can-chot-xep-lich.md`.
