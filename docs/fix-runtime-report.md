# Báo cáo sửa lỗi runtime — PHẦN 7

Ngày: 2026-11-15
Phạm vi: chỉ sửa lỗi runtime, KHÔNG thêm màn hình mới, KHÔNG thêm API mới, KHÔNG đổi quy tắc nghiệp vụ đã chốt.

## Kết luận nhanh

| Lỗi | Nguyên nhân gốc | Cách xử lý |
| --- | --- | --- |
| 1. `GET /api/delegations/me` → 404 | Backend + gateway **đã có** endpoint/route, nhưng bản đang chạy là build cũ trước PHẦN 6 (`DelegationController` còn untracked, route `people-delegations-api` mới chỉ nằm trong working tree). | Giữ nguyên code backend; thêm cờ `VITE_ENABLE_DELEGATION_UI` **mặc định TẮT** để FE không gọi endpoint này khi môi trường chưa deploy route. Bật lại bằng biến môi trường sau khi rebuild. |
| 2. `(bundles.data ?? []).forEach is not a function` | `/permission-bundles` **không có** route ở gateway, **không được** proxy ở Vite, **không được** rewrite ở Vercel → response là HTML/404, không phải mảng. | Thêm `unwrapList` dùng chung ở tầng API; mọi fetch danh sách đi qua `requestList`; thêm route/proxy/rewrite `/permission-bundles`; `Array.isArray` trước `forEach` ở trang Chức vụ. |
| 3. Trang lỗi mặc định "Unexpected Application Error!" | Router chưa khai báo `errorElement` ở đâu cả. | Thêm `RouteErrorBoundary` + khung `AppErrorScreen` dùng chung, gắn ở route gốc và 3 khu vực chính; ẩn stack ở production; trang 404 dùng cùng khung. |

## Lỗi 1 — `GET /api/delegations/me` trả 404

### Điều tra

- Backend: `PeopleService/.../controller/DelegationController.java` **có** `@GetMapping("/me")` (class map `/delegations`), trả `List<DelegationResponse>`.
- Gateway: `APIGateway/src/main/resources/application.yml` **có** route:

  ```yaml
  - id: people-delegations-api
    uri: ${PEOPLE_SERVICE_URL:http://localhost:8082}
    predicates:
      - Path=/api/delegations/**,/api/delegations
    filters:
      - StripPrefix=1
  ```

- Nhưng `git status` cho thấy `DelegationController`/`DelegationService` đang **untracked**, còn route gateway là **thay đổi chưa commit**. Nghĩa là container/jar đang chạy (gateway + PeopleService) được build **trước** khi PHẦN 6 được thêm vào working tree → gateway không khớp route (trả 404), hoặc PeopleService không có controller.
- Đã thử `curl` cả `127.0.0.1:8080` và tunnel Cloudflare: hiện không có dịch vụ nào phản hồi, nên không thể tái hiện trực tiếp; kết luận dựa trên mã nguồn + trạng thái git.

### Cách xử lý đã chọn

Vì endpoint **có thật trong mã nguồn**, không xoá tính năng; chỉ tách FE khỏi môi trường chưa deploy:

- Thêm `frontend/src/lib/featureFlags.ts`:

  ```ts
  export const DELEGATION_UI_ENABLED =
    import.meta.env.VITE_ENABLE_DELEGATION_UI === 'true';
  ```

  Mặc định **TẮT**.
- `RolePreviewPage`: ẩn nút "Xem quyền được ủy quyền" khi cờ tắt.
- `MyDelegationsPage`: query có `enabled: isAuthenticated && DELEGATION_UI_ENABLED` → **không phát sinh request** `/api/delegations/me`; khi cờ tắt hiện `Alert` thông báo tính năng chưa bật.

Để bật lại sau khi rebuild/deploy gateway + PeopleService:

```bash
# frontend/.env.local hoặc biến build trên Vercel
VITE_ENABLE_DELEGATION_UI=true
```

### File đã sửa

- `frontend/src/lib/featureFlags.ts` (mới)
- `frontend/src/pages/RolePreviewPage/RolePreviewPage.tsx`
- `frontend/src/pages/MyDelegationsPage/MyDelegationsPage.tsx`
- `frontend/src/features/owner/ownerMessages.ts` (thêm `MY_DISABLED`)

### Việc cần làm khi triển khai (không phải sửa code)

- `mvn package` lại **PeopleService** (để có `DelegationController`) và **APIGateway** (để có route `/api/delegations/**`), rồi khởi động lại container tương ứng.
- Khi Network tab không còn 404, đặt `VITE_ENABLE_DELEGATION_UI=true` và build lại FE.

## Lỗi 2 — `(bundles.data ?? []).forEach is not a function`

### Chuỗi nguyên nhân

1. `PositionsPage` gọi `fetchPermissionBundles()` → `GET /permission-bundles`.
2. Đường dẫn này **không có** trong:
   - gateway `application.yml` (chỉ có `/permissions`),
   - `vite.config.ts` (`backendPrefixes` thiếu `/permission-bundles`),
   - `vercel.json` (rewrite thiếu `/permission-bundles`).
3. Vite/Vercel trả `index.html` (hoặc 404), axios nhận `data` là **chuỗi HTML**, `data ?? []` vẫn là chuỗi → `.forEach` không tồn tại.
4. Backend `PositionController` có `@GetMapping({"/permission-bundles", "/permission-bundles/"})` trả `List<PermissionBundleResponse>` — dữ liệu đúng, chỉ thiếu đường đi.

### Cách xử lý

- Thêm **một** hàm chuẩn hoá dùng chung ở tầng API: `unwrapList<T>(payload)` trong `frontend/src/lib/api.ts`.
  - Nhận mảng thuần, `{ data: [] }`, `{ content: [] }`, `{ items: [] }`, `{ results: [] }`.
  - Mọi shape khác (HTML, `null`, object lạ) → `[]`.
- Mỗi module API có `requestList<T>()` bọc `request()` + `unwrapList`; toàn bộ hàm fetch danh sách được chuyển sang dùng nó:
  - `features/owner/ownerApi.ts` (phòng ban, quyền, bộ quyền, chức vụ, nhân viên, lịch sử, nghỉ việc, tổng quản lý, ủy quyền)
  - `features/sprint4/sprint4Api.ts` (chức vụ, phòng ban, thành viên, chuyên môn, môn học, sinh viên lớp, status log, close event, lớp của tôi; `normalizePaged` cũng fallback qua `unwrapList`)
  - `features/operations/operationsApi.ts` (lịch, gợi ý phòng, lịch của tôi, phòng, thiết bị, sự cố)
  - `features/transfer/transferApi.ts` (inbox, mine)
  - `features/modules/moduleApi.ts`
  - `features/admin/adminApi.ts` (tổ chức chờ duyệt, options)
  - `features/organization/organizationPortalApi.ts` (thay các guard `Array.isArray` lặp lại bằng `unwrapList`)
- `PositionsPage`: `Array.isArray` trước khi `forEach`, dùng `useMemo` cho danh sách phòng ban/bộ quyền.
- Bổ sung đường đi (không phải API mới, chỉ mở route cho endpoint đã có):
  - gateway: route `people-permission-bundles` → PeopleService;
  - `vite.config.ts`: thêm `/permission-bundles` và `/classes` (dev proxy);
  - `vercel.json`: rewrite `/permission-bundles` + `/permission-bundles/:path+`.

### File đã sửa

- `frontend/src/lib/api.ts`
- `frontend/src/features/owner/ownerApi.ts`
- `frontend/src/features/sprint4/sprint4Api.ts`
- `frontend/src/features/operations/operationsApi.ts`
- `frontend/src/features/transfer/transferApi.ts`
- `frontend/src/features/modules/moduleApi.ts`
- `frontend/src/features/admin/adminApi.ts`
- `frontend/src/features/organization/organizationPortalApi.ts`
- `frontend/src/pages/PositionsPage/PositionsPage.tsx`
- `frontend/vite.config.ts`
- `frontend/vercel.json`
- `backend/APIGateway/src/main/resources/application.yml`

## Lỗi 3 — Trang lỗi mặc định "Unexpected Application Error!"

### Nguyên nhân

`frontend/src/router.tsx` không khai báo `errorElement` ở bất kỳ route nào, nên React Router dùng màn lỗi mặc định (kèm stack trace) khi một component ném lỗi.

### Cách xử lý

- `components/AppErrorScreen/AppErrorScreen.tsx` (mới): khung chung `Result` + nền `layoutBackground`, nhận `status/title/subTitle/actions/details`. Kèm `AppErrorActions` ("Tải lại" + "Về trang chính") và `homePathFor()`.
- `components/RouteErrorBoundary/RouteErrorBoundary.tsx` (mới): `useRouteError()` + `isRouteErrorResponse()`, thông báo tiếng Việt; **chỉ hiện chi tiết kỹ thuật khi `!import.meta.env.PROD`**; "Tải lại" gọi `window.location.reload()`, "Về trang chính" điều hướng theo vai trò (SUPER_ADMIN → `/quan-tri`, còn lại → `/dang-nhap`).
- `router.tsx`: gắn `errorElement: <RouteErrorBoundary />` ở route gốc và 3 khu vực `/quan-tri`, `/to-chuc`, `/dao-tao`.
- `NotFoundPage`: giữ nguyên tiêu đề/nhãn nút (để không vỡ `router.test` và e2e `ux-console.spec`) nhưng dùng chung `AppErrorScreen`.

### File đã sửa

- `frontend/src/components/AppErrorScreen/AppErrorScreen.tsx` (mới)
- `frontend/src/components/RouteErrorBoundary/RouteErrorBoundary.tsx` (mới)
- `frontend/src/pages/NotFoundPage/NotFoundPage.tsx`
- `frontend/src/router.tsx`

## Kiểm chứng

| Hạng mục | Kết quả |
| --- | --- |
| `npx tsc -b` (frontend) | Pass |
| `npx vitest run` | 150/150 pass (thêm 6 test: `unwrapList`, `RouteErrorBoundary`) |
| `npx eslint .` | 0 error; 1 warning **có sẵn** ở `DelegationPage.tsx` (không thuộc phạm vi sửa) |
| `npm run build` (frontend) | Pass |
| `mvn -DskipTests package` (APIGateway) | Pass |
| Kiểm thử live/E2E | Không chạy được: gateway + tunnel đều không phản hồi tại thời điểm kiểm tra |

## Nơi khác có nguy cơ cùng lỗi

1. **`/to-chuc/uy-quyen` (DelegationPage)** gọi `/api/delegations` + `/api/general-manager` — cùng phụ thuộc bản runtime đã rebuild của gateway/People. Nếu môi trường vẫn là build cũ, màn này cũng 404. Có thể xử lý bằng cùng cơ chế cờ nếu muốn ẩn toàn bộ PHẦN 6.
2. **Endpoint danh sách mới thêm sau này** phải đi qua `requestList`/`unwrapList`; nếu gọi `apiClient.get` trực tiếp rồi `data.map` sẽ lặp lại đúng lỗi 2.
3. **Response phân trang** (`PageResponse` ở Admin/Tổ chức) dùng `.content`; nếu BE đổi sang bọc `{ data: { content } }` thì cần mở rộng `unwrapList` (hiện chỉ bóc một tầng).
4. **Proxy/rewrite**: mỗi path gốc mới (`/permission-bundles` vừa thêm, `/classes`) phải khai báo đồng thời ở gateway + Vite + Vercel, nếu không sẽ tái diễn "nhận HTML thay vì JSON".
5. Các trang còn dùng `query.data ?? []` (StaffPage, TeachersPage, SchedulePage, FacilityPage, …) giờ an toàn vì API đã trả mảng, nhưng `Array.isArray` chỉ được thêm ở nơi trực tiếp `forEach`/`for…of`; nếu sau này có nguồn dữ liệu khác (không qua `requestList`) thì phải tự guard.
