# Báo cáo: sửa 404 lặp lại, lệch triển khai và chức năng theo vai trò

Ngày: 2026-11-16 · Nhánh: `fixFlowCreateEmployee` · HEAD: `ef71576c36b4fdb657805fd6c5fdd022cbc2d81a`

## 1. Kết luận ngắn

Năm endpoint **đã tồn tại trong source** và **gateway ở HEAD định tuyến đúng** (kiểm chứng runtime
bên dưới). 404 trên UI không phải do thiếu controller/mapping mà do **bản chạy thực tế cũ hơn source**:

- Gateway live (image build `2026-11-13T05:27:12Z`) **không có** route `/users/**`,
  `/transfer-requests/**`, `/notifications/**`, `/permission-bundles/**`.
- PeopleService live **không có** các controller Transfer/Notification/ApprovalCapability/
  EffectivePermission/SelfService/Resignation/GeneralManager/Delegation.
- IdentityService live **không có** `GET /api/v1/modules/status`.
- Frontend production **mất `frontend/vercel.json`** (bị xoá ở commit `7471662`) nên Vercel trả
  404/HTML cho mọi path API tương đối.

Không tạo endpoint trùng, không fallback mock, không trả danh sách rỗng khi 404.

## 2. Bảng nguyên nhân gốc

Bằng chứng runtime: giải nén `app.jar` trong container live; chạy gateway HEAD trên cổng 18080
với upstream stub; chạy Vite dev trên 5174 trỏ `VITE_API_PROXY_TARGET=http://localhost:18080`.

| Endpoint | Source (controller) | Direct Service | Gateway Test (HEAD) | Gateway Live | FE | Root cause |
|---|---|---|---|---|---|---|
| `GET /transfer-requests/inbox` | `TransferController:30` | 200 (stub/kiểm chứng trước) | **200**, path giữ nguyên, `Authorization` được chuyển tiếp | **404** (gateway không có route) | Path đúng; proxy Vite 200 | Gateway live cũ + People live cũ |
| `GET /notifications` | `NotificationController:20` | 200 | **200** | **404** (không có route) | Path đúng; proxy 200 | Gateway live cũ + People live cũ |
| `GET /users/me/approval-capabilities` | `ApprovalCapabilityController:33` | 200 | **200** | **404** (không có route `/users/**`) | Path đúng; proxy 200 | Gateway live cũ + People live cũ |
| `GET /api/v1/modules/status` | `ModuleController:39` | 200 | **200** (route `identity-modules`) | **404 khi có token** (401 khi không token ⇒ route có, Identity live thiếu `/status`) | Path đúng; proxy 200 | Identity live cũ |
| `GET /users/me/permissions` | `EffectivePermissionController:36` | 200 | **200** | **404** (không có route `/users/**`) | Path đúng; proxy 200 | Gateway live cũ + People live cũ |

Bằng chứng bản live (đọc từ jar đang chạy, không suy đoán):

- `docker cp mems-api-gateway:/app/app.jar` → `BOOT-INF/classes/application.yml` **thiếu**
  `people-users`, `people-transfer-requests`, `people-notifications`, `people-permission-bundles`.
- `mems-people` jar chỉ có 9 controller: Department, Teacher, SchoolClass, Student,
  InternalAuthorization, Position, Specialty, People, DepartmentMember.
- `javap` trên `ModuleController.class` của `mems-identity-org`: chỉ có `getModules()` (`/api/v1/modules`),
  **không có** `status()`.
- Image/container tạo cách đây 3 ngày (`docker compose images`), trong khi route/endpoint mới được
  thêm ngày 2026-11-15/16 (`ebbac40`, `e0b6886`, `ef71576`).

## 3. Đã sửa (source)

| File | Thay đổi |
|---|---|
| `frontend/vercel.json` (khôi phục) | Rewrite đủ 12 tiền tố API (`/api`, `/users`, `/departments`, `/positions`, `/permissions`, `/permission-bundles`, `/students`, `/classes`, `/teachers`, `/specialties`, `/transfer-requests`, `/notifications`) về tunnel, cộng SPA fallback **loại trừ** các tiền tố API để lỗi cấu hình vẫn 404 rõ ràng thay vì trả HTML 200. Script `scripts/start-tunnel.ps1` tự thay URL tunnel. |
| `frontend/src/services/http.ts` | Phát hiện phản hồi HTML ở path API (200 hoặc lỗi) → `ApiDeploymentMismatchError` với thông báo chỉ đúng rewrite/proxy. Không che lỗi, không logout. |
| `frontend/src/app/providers.tsx` | Retry chỉ với lỗi mạng/5xx; **không retry 4xx** (404/403 không bị gọi lặp). |
| `frontend/src/features/workflows/hooks.ts` | Dùng chung `queryKeys.transferInbox` với dashboard/nav badge → hết gọi trùng `GET /transfer-requests/inbox`. |
| `backend/APIGateway/src/test/java/com/mems/RouteContractTest.java` | Test hợp đồng route: bắt buộc có 5 route liên quan, không `StripPrefix` cho path gốc, các route `/api/*` có `StripPrefix=1`. |
| `backend/PeopleService/src/test/java/com/mems/controller/WorkflowEndpointMappingTest.java` | MockMvc standalone khoá đúng URL 4 endpoint People. |
| `backend/IdentityService/src/test/java/com/mems/controller/ModuleEndpointMappingTest.java` | Khoá annotation `GET /api/v1/modules/status`. |
| `frontend/src/services/http.test.ts` | Test phát hiện HTML, giữ nguyên lỗi 404 JSON, chính sách retry. |

Backend **không cần sửa mapping/route** — source đã đúng; sửa ở tầng triển khai (mục 4).

## 4. Triển khai (chờ phê duyệt — chưa thực thi)

Trạng thái hiện tại: container tạo 3 ngày trước; image `final_project-*:latest` build 2026-11-13.
Đây là `STALE_RUNTIME` **có bằng chứng phiên bản runtime** (mục 2).

```bash
# 0) Kiểm tra lại trước khi thao tác
git rev-parse HEAD            # ef71576...
docker compose images
docker compose ps

# 1) Chỉ rebuild 3 service liên quan 5 endpoint (không đụng MySQL/volume)
docker compose build identity-org-service people-service api-gateway
docker compose up -d identity-org-service people-service api-gateway

# 2) Migration (SAU khi backup; cần phê duyệt riêng cho DB live)
mysqldump -h 127.0.0.1 -P 3306 -u <user> -p mems_identity_db > mems_identity_db_backup_$(date +%Y%m%d_%H%M).sql
mysql -h 127.0.0.1 -P 3306 -u <user> -p mems_identity_db < 38_identity_permission_allowed_scopes.sql
mysql -h 127.0.0.1 -P 3306 -u <user> -p mems_identity_db < 39_identity_self_permissions_and_department_class_scope.sql
mysql -h 127.0.0.1 -P 3306 -u <user> -p mems_people_db   < 36_people_permission_backfill.sql
mysql -h 127.0.0.1 -P 3306 -u <user> -p mems_facility_db < 37_facility_department_scope_catchup.sql

# 3) Frontend production: cập nhật URL tunnel rồi deploy
powershell -ExecutionPolicy Bypass -File scripts/start-tunnel.ps1   # tự sửa frontend/vercel.json
git add frontend/vercel.json && git commit -m "chore: update tunnel url" && git push
```

Kiểm tra sau deploy (thay `<TOKEN>` bằng token đăng nhập thật):

```bash
for p in /transfer-requests/inbox /notifications /users/me/approval-capabilities \
         /api/v1/modules/status /users/me/permissions; do
  curl -s -o /dev/null -w "%{http_code} $p\n" -H "Authorization: Bearer <TOKEN>" "http://localhost:8080$p"
done
```

## 5. Kiểm thử

| Bộ | Kết quả | Ghi chú |
|---|---|---|
| Frontend `vitest` | **27 file / 129 test pass** | Thêm 3 test HTTP/retry |
| Frontend `tsc -b` | pass | |
| Frontend `npm run lint` | 0 error, 13 warning (có sẵn) | |
| Frontend `npm run build` | pass | cảnh báo chunk > 900 kB (có sẵn) |
| PeopleService | **205 test, 0 fail** | gồm 4 test mapping mới |
| IdentityService | **40 test, 0 fail** | gồm 1 test mapping mới |
| APIGateway | **3 test, 0 fail** | hợp đồng route |
| Gateway runtime (HEAD) | 5/5 endpoint **200** qua cổng 18080, path không đổi, header Authorization được giữ; path lạ vẫn 404 | upstream stub |
| Vite proxy runtime | 5/5 endpoint **200** qua cổng 5174 → gateway 18080 | đúng cấu hình dev |
| MySQL integration | **CHƯA CHẠY** | Truy cập credential DB bị chặn; không thể tạo container/DB tạm nếu chưa được duyệt |
| HTTP integration trên stack thật | **CHƯA CHẠY** | Cùng lý do trên; cần DB test 3307 hoặc phê duyệt DB tạm |
| Browser E2E | **CHƯA CHẠY** | Không có tài khoản đăng nhập được (mật khẩu mẫu đã đổi; ghi DB bị cấm) |

Phát hiện thêm khi kiểm tra máy: một Vite dev server cũ vẫn chiếm cổng 5173 và proxy tới gateway
live cũ — chính là môi trường tái hiện 404. Không dừng tiến trình này (không phải do phiên hiện tại
khởi động); phiên kiểm chứng dùng cổng 5174.

## 6. Chức năng theo vai trò

- Ở tầng source: policy duyệt (HR phòng → trưởng phòng → GM có uỷ quyền → OWNER, không tự duyệt),
  quyền hiệu lực theo DB, capability API và self-service đã có test (People 205 pass) và đã được
  kiểm chứng API với user thật trong test DB ở phiên trước.
- Ở bản live: **không thể kiểm tra** vì People/Identity live thiếu endpoint; sau khi rebuild phải
  đăng nhập thật từng vai trò và đối chiếu menu/quyền/nút. Chưa đạt điều kiện DONE cho P1 role.

## 7. Trạng thái cuối

| Hạng mục | Trạng thái |
|---|---|
| P0 — 5 endpoint 404 | **SOURCE FIXED / LIVE_BLOCKED** (nguyên nhân đã chứng minh; rebuild chờ duyệt) |
| Source stack | Controller mapping + gateway runtime **VERIFIED**; stack thật với DB **BLOCKED** |
| Gateway live | **STALE_RUNTIME** (bằng chứng jar live thiếu route) |
| Frontend live | **STALE/THIẾU CẤU HÌNH** — `vercel.json` đã khôi phục trong source, chờ deploy |
| Chức năng vai trò | Source **VERIFIED** (test + phiên trước); live **NOT VERIFIED** |
| DB audit/migration | **BLOCKED** — không truy cập credential DB |
| Regression tests | **PASS** (FE 129, People 205, Identity 40, Gateway 3) |

Không đạt DONE theo định nghĩa của yêu cầu cho đến khi: rebuild 3 service, chạy migration 38/39,
deploy lại frontend kèm tunnel URL, rồi đăng nhập thật để kiểm tra 5 endpoint + vai trò.
