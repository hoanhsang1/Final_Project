# MEMS FE-00 — Báo cáo thiết kế & triển khai Frontend v2

Ngày: 16/11/2026 · Phạm vi: FE-00 (nền tảng + 4 màn hình mẫu) · Không commit/push.

Tài liệu nguồn đã đọc: kế hoạch triển khai v2 (286 dòng), sơ đồ chức năng v2 (7 trang), đặc tả
nghiệp vụ v3 (draft), `docs/api.md`, `docs/sprint4-*.md`, controller + `JwtService` +
`PermissionCatalog` của 4 service, Frontend cũ (contract only).

Tài liệu kèm theo: [Design System](02-DESIGN-SYSTEM.md) · [Sitemap](03-SITEMAP.md) ·
[Ma trận tích hợp](04-INTEGRATION-MATRIX.md) · [README](../README.md).

---

## 1. Frontend Assessment (bản cũ)

| Khía cạnh | Quan sát |
|---|---|
| Công nghệ | React 19 + TS + Vite + Ant Design 5 + TanStack Query + Zustand |
| Điểm mạnh giữ lại về contract | Refresh-token queue đúng (một refresh tại một thời điểm); tách `apiClient` khỏi UI; guard là UX-only; dịch lỗi theo `code`; có Playwright |
| Vấn đề kiến trúc | Menu admin/owner tĩnh, chỉ chặn theo role; quyền hiệu lực chỉ được dùng ở menu Đào tạo; guard và menu lệch nhau (menu Chức vụ yêu cầu `employee.*` nhưng route yêu cầu `position.manage`) |
| Vấn đề dữ liệu | `MemberResponse` thiếu họ tên/email → bảng nhân sự cũ hiển thị `userId`; 3 nhóm tiền tố API; snake_case lẫn camelCase; lỗi 500 khi thiếu field đăng nhập |
| Vấn đề UX | Mỗi module một trang CRUD; dashboard không có nội dung; nhiều route chết (`/to-chuc/sinh-vien`, `/xem-thu/*`); phụ thuộc AntD khiến khó tạo bản sắc |
| Kết luận | **Không gia cố tiếp**. Xây mới trong `frontend-v2/`, giữ contract đã xác minh, không giữ layout/màu/UX |

## 2. User Role & Sitemap Analysis

- **Role JWT thực tế:** `SUPER_ADMIN`, `OWNER`/`ORG_OWNER`, `MANAGER`, `STAFF`, `STUDENT`; các mã
  `ORG_ADMIN`, `ACADEMIC_STAFF`, `FACILITY_STAFF`, `TEACHER` là legacy (không cấp mới).
- **Chức vụ** (Giáo vụ, Trưởng phòng, HR, Giáo viên, CSVC…) là template quyền + phạm vi; **không**
  phải role. Một người có thể giữ nhiều chức vụ.
- **Quyền hiệu lực** = quyền role ∪ chức vụ ∪ bundle ∪ ủy quyền, đã lọc theo membership, assignment,
  scope và module. FE nhận `permissions[]` + `permissionScopes` từ JWT và **không tự suy ra**.
- **Ủy quyền** có thời hạn, chỉ OWNER cấp cho Tổng quản lý, không ủy quyền lại.
- **Hệ quả cho điều hướng:** 4 không gian (Hệ thống / Tổ chức / Đào tạo / Cá nhân) + menu lọc theo
  `quyền` và `module`; ẩn menu không phải bảo mật.

Sitemap đầy đủ, route và trạng thái: [03-SITEMAP.md](03-SITEMAP.md).

## 3. UX/UI Design Proposal

**Định hướng:** sản phẩm quản trị giáo dục chuyên nghiệp, tối giản nhưng có bản sắc — chrome tối
“xanh rêu”, nội dung sáng ấm, nhấn hổ phách; không gradient/hoạt ảnh trang trí.

1. **Điều hướng theo không gian làm việc.** Sidebar tối cố định, switcher “Không gian” cho người
   kiêm nhiệm; nhóm mục có nhãn; badge số việc chờ; thu gọn được, mobile dùng drawer.
2. **Dashboard ghép từ dữ liệu thật.** Không bịa KPI/trend. Super Admin: tổng tổ chức theo trạng
   thái, hàng chờ duyệt có thao tác ngay, tổ chức mới nhất, nhật ký. Owner: quy mô phòng ban/nhân
   sự/chức vụ, phân bố nhân sự, việc chờ duyệt, thông báo.
3. **Danh mục quản trị thay vì CRUD rời.** Toolbar tìm kiếm + lọc + đếm kết quả; bảng có sắp xếp,
   phân trang, empty/error; hành động nguy hiểm qua hộp xác nhận nêu hậu quả.
4. **Luồng nhân sự đúng nghiệp vụ.** Chọn phòng ban → gán nhiều chức vụ → nếu có chức vụ giáo viên
   thì mở khối hồ sơ giáo viên (mã NV, họ tên, SĐT, hợp đồng, chuyên môn) → tạo tài khoản → hiện
   mật khẩu tạm một lần. Hồ sơ mở bằng drawer để không mất ngữ cảnh; hiển thị quyền hiệu lực và
   lịch sử bổ nhiệm.
5. **Trung thực với phần chưa làm.** Màn PLANNED có mô tả phạm vi, quyền cần, module, API phụ
   thuộc; không gọi API, không hiển thị dữ liệu giả; nhãn “Dữ liệu demo” khi chạy mock.
6. **Tìm nhanh ⌘K** trên toàn bộ màn hình người dùng được thấy — cần thiết khi hệ thống nhiều module.
7. **Responsive:** desktop 3 cột → tablet 2 → mobile 1; bảng cuộn ngang, sidebar thành drawer;
   ảnh mobile: [đăng nhập](screenshots/09-mobile-login.png), [dashboard](screenshots/10-mobile-dashboard.png).

Ảnh: [đăng nhập](screenshots/01-login.png) · [Owner dashboard](screenshots/02-owner-dashboard.png) ·
[phòng ban](screenshots/03-departments.png) · [nhân sự](screenshots/04-employees.png) ·
[hồ sơ nhân sự](screenshots/05-employee-profile.png) ·
[chi tiết phòng ban](screenshots/06-department-detail.png) ·
[Super Admin dashboard](screenshots/07-platform-dashboard.png) ·
[tất cả tổ chức](screenshots/08-organizations.png).

## 4. Design System

Chọn **Tailwind CSS v4 + Radix primitives + CVA**, không dùng Ant Design:

- AntD cho cảm giác “admin template”, khó thoát khỏi nhận diện mặc định và bundle lớn; yêu cầu
  “không đơn điệu” khó đạt nếu chỉ đổi theme.
- Tailwind v4 token-first cho phép định nghĩa palette/typography riêng trong một file, component
  nào cũng dùng chung token; Radix đảm bảo a11y cho dialog/select/dropdown (focus trap, ARIA) mà
  không áp đặt giao diện.
- Bỏ thư viện bảng (TanStack Table v9 vừa đổi API) và date-picker ngoài; tự viết `DataTable` nhỏ
  (sắp xếp, phân trang client/server) và dùng input ngày gốc của trình duyệt — ít rủi ro, a11y tốt.

Chi tiết token, component, quy ước a11y: [02-DESIGN-SYSTEM.md](02-DESIGN-SYSTEM.md).

## 5. Component Architecture

```
Trang (features/*/pages)
  └─ domain components (EmployeeTable, PositionPicker, TempPasswordDialog…)
      └─ UI kit (components/ui) — không biết gì về API
Services (features/*/api.ts) — DTO ↔ domain, không chứa JSX
Hooks (features/*/hooks.ts) — TanStack Query: query key, cache, invalidate
Stores — session (token + JWT) & UI (sidebar) — chỉ client state
lib — jwt, permission, nav, format, error, query keys
```

- **Tách server state / client state:** TanStack Query cho mọi dữ liệu API; Zustand chỉ giữ token,
  phiên suy ra từ JWT và trạng thái sidebar. Không copy dữ liệu API vào store.
- **Query key & invalidate:** `lib/query-keys.ts`; mutation phòng ban/nhân sự invalidate
  `['departments']`, duyệt tổ chức invalidate `['organizations']` + `['audit-logs']`.
- **Auth:** access token 15 phút, refresh xoay vòng; interceptor 401 xếp hàng chờ đúng một refresh;
  lỗi → xoá phiên + sự kiện `mems:session-expired` → về đăng nhập.
- **Route guard:** `RequireAuth`, `GuestOnly`, `WorkspaceGuard`, `PermissionGuard` — chỉ UX.
- **Error boundary** cấp app + `errorElement` tương đương; đề xuất bổ sung sau.
- **Tenant isolation:** không nhận `orgId` từ client; mọi path dùng id bản ghi; org lấy từ JWT.
- **Mock tách biệt:** `services/mock` chỉ nạp bằng `import()` động khi `VITE_DATA_SOURCE=mock`;
  build API không tải fixtures vào bundle chính (đã kiểm: chunk `api-*.js` riêng).

## 6. Folder Structure

```
frontend-v2/
  docs/                     báo cáo, ảnh
  scripts/visual-check.mjs  chụp ảnh kiểm tra bằng Chrome
  src/
    app/            app.tsx, providers.tsx, error-boundary.tsx, app-flow.test.tsx
    layouts/        app-shell, sidebar, topbar, auth-layout, command-palette, session-watcher
    routes/         guards, planned-page, planned-content, not-found, module-label-list, access
    features/
      auth/         api, bootstrap, hooks, pages/{login,change-password,profile,public-planned}
      platform/     api, hooks, types, pages/{platform-dashboard,organizations}
      organization/ api, hooks, types, use-headcounts, components/*, pages/*
    components/
      ui/           24 component Design System
      brand/ layout/
    services/       http.ts, mock/{adapter,fixtures}
    stores/         session-store, ui-store
    hooks/          use-breadcrumbs, use-debounce, use-nav-badges
    lib/            jwt, nav, permissions, modules, api-error, error-messages, format, query-keys, env
    styles/         globals.css (tokens)
    tests/          setup.ts
    types/          api, session
```

## 7. FE–BE Integration Dependency Matrix

Bảng đầy đủ theo màn hình, DTO, quyền, lỗi và khoảng trống: [04-INTEGRATION-MATRIX.md](04-INTEGRATION-MATRIX.md).

Tóm tắt phụ thuộc của 4 màn hình mẫu:

| Màn | API chính | Quyền |
|---|---|---|
| Đăng nhập | `POST /auth/login`, `/refresh`, `/logout`, `/change-password` | công khai / đăng nhập |
| Super Admin dashboard | `GET /organizations`, `/organizations/pending`, `PATCH approve|reject`, `GET /audit-logs` | role SUPER_ADMIN |
| Owner dashboard | `GET /departments`, `/departments/{id}/members`, `/positions`, `/transfer-requests/inbox`, `/notifications` | OWNER / `department.view`, `employee.view`… |
| Phòng ban | `GET/POST/PUT/DELETE /departments`, `GET /departments/{id}` | `department.view` / `department.manage` |
| Nhân sự | members list/detail/create/positions/reset/delete, `/positions`, `/specialties` | `employee.*` + `MembershipPolicy` |

Chênh lệch tài liệu ↔ code quan trọng (chi tiết ở mục 3 của ma trận): thiếu `GET /me`; thiếu họ tên
trong `MemberResponse`; OWNER chưa có endpoint bật/tắt module; lý do từ chối tổ chức không được lưu;
nhật ký cấp tổ chức chưa có API đọc; tên quyền dotted vs UPPER_SNAKE legacy.

## 8. FE-00 Implementation

Đã làm (READY):

1. **Đăng nhập** thật theo contract: validate, hiện/ẩn mật khẩu, lỗi dịch tiếng Việt, tài khoản demo
   điền nhanh, điều hướng theo quyền; buộc đổi mật khẩu khi `mustChangePassword`.
2. **Super Admin dashboard**: KPI theo trạng thái (4 truy vấn tổng), hàng chờ duyệt có duyệt/từ chối
   (dialog lý do), tổ chức mới nhất, phân bố trạng thái, nhật ký gần đây.
3. **Owner dashboard**: quy mô tổ chức, phân bố nhân sự theo phòng, việc chờ duyệt, thông báo, lối tắt.
4. **Phòng ban**: danh sách + tìm kiếm, tạo/sửa (tên, mô tả, module), xoá có xác nhận và xử lý
   `DEPARTMENT_NOT_EMPTY`, trang chi tiết với nhân sự + module.
5. **Nhân sự**: danh bạ toàn tổ chức (tìm không dấu, lọc phòng ban/loại/trạng thái/vai trò), bảng
   có sắp xếp/phân trang, drawer hồ sơ (liên hệ, chức vụ, quyền hiệu lực, lịch sử bổ nhiệm), tạo
   nhân sự có khối giáo viên + mật khẩu tạm một lần, đổi chức vụ, reset mật khẩu, gỡ khỏi phòng ban.
6. **Nền tảng**: shell responsive, sidebar thu gọn, breadcrumb, command palette, badge, user menu,
   hồ sơ cá nhân (JWT), đổi mật khẩu, đổi vai trò demo, error boundary, 404, forbidden.
7. **Sitemap đầy đủ**: mọi màn chưa làm có route PLANNED mô tả phạm vi/quyền/API.

Chưa làm (PLANNED, không tuyên bố hoàn thành): chức vụ & quyền, điều chuyển/nghỉ việc, ủy quyền,
module tổ chức, nhật ký tổ chức, tài khoản SA, module catalog, giáo viên/sinh viên/môn học/lớp,
lịch/điểm danh/đổi lịch, CSVC, thông báo, việc chờ duyệt, cổng sinh viên, đăng ký/quên mật khẩu.

## 9. Test Results

| Kiểm tra | Lệnh | Kết quả |
|---|---|---|
| Type-check | `npx tsc -b` | pass (0 lỗi) |
| Lint | `npm run lint` | **0 error**, 7 warning `react-hooks/set-state-in-effect` (reset form khi mở dialog — có chủ đích) |
| Unit/UI test | `npm test` | **45 test / 9 file pass** (xem mục 12) |
| Build | `npm run build` | pass; `dist` ~729 KB JS (217 KB gzip), CSS 55 KB (10,6 KB gzip) |
| Visual E2E | Chrome headless qua CDP + `scripts/visual-check.mjs` | 10 ảnh, **0 console error / 0 page error** |

Test có ý nghĩa nhất:
- `app-flow.test.tsx` — chưa đăng nhập bị chặn; đăng nhập `sample_owner` → dashboard hiển thị dữ
  liệu thật từ mock (5 phòng ban, 14 nhân sự); menu điều hướng sang phòng ban; OWNER nạp đúng tập
  module `active`; HR chỉ thấy nhân sự phòng mình.
- `nav.test.ts` — giáo viên chỉ thấy mục theo quyền; MANAGER không tự có quyền; OWNER bypass; module
  tắt thì ẩn; chưa có dữ liệu module thì không ẩn nhầm; route mặc định theo vai trò.
- `jwt.test.ts` — claim tiếng Việt giải mã đúng UTF-8 (lỗi thật đã phát hiện qua ảnh chụp và sửa),
  hết hạn, scopes.
- `data-table.test.tsx` — sắp xếp, phân trang, empty, error.
- `error-messages.test.ts` — không lộ message tiếng Anh, fallback theo status.
- `login-page.test.tsx`, `temp-password-dialog.test.tsx`, `button.test.tsx`.

Chưa có bằng chứng: tích hợp backend thật (cần docker-compose), E2E với API thật, test trình duyệt
tự động trong CI (script hiện cần Chrome cài sẵn).

## 10. File Change Report

**Thêm mới** `frontend-v2/` — 110 file trong `src/` (13.007 dòng), gồm:
- 24 component UI, 10 layout/route, 3 feature, 10 trang, 15 file hạ tầng (http, jwt, nav, quyền, mock).
- 8 file test (40 test), setup.
- Cấu hình: `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, `eslint.config.js`,
  `.prettierrc.json`, `.env*`, `.gitignore`, `index.html`.
- Tài liệu: `README.md`, `docs/01..04`, 10 ảnh PNG, `scripts/visual-check.mjs`.

**Không sửa:** `frontend/**` (prototype cũ), `backend/**`, migration, docker-compose, tài liệu gốc.
Working tree hiện có thay đổi backend/module-toggle và file `.scratch/` **không do báo cáo này tạo**;
cần phân biệt khi commit.

**Dependency thêm:** react-router-dom, @tanstack/react-query, axios, zustand, tailwindcss,
@tailwindcss/vite, Radix (dialog/dropdown/select/tabs/tooltip/checkbox/popover/avatar/slot),
class-variance-authority, clsx, tailwind-merge, lucide-react, sonner, date-fns; dev: vitest,
testing-library, jsdom, eslint + plugin, prettier, typescript. Lý do chọn ở mục 4.

## 11. Next Feature Packages

| Gói | Nội dung | Phụ thuộc backend | DoD chính |
|---|---|---|---|
| **FE-01** | Chi tiết tổ chức SA + bật/tắt/khóa module; danh mục module | `GET /organizations/{id}`, `PUT modules`, API OWNER toggle (đang thay đổi trong working tree) | Duyệt/từ chối/khóa có audit; chặn module lõi; test 403 |
| **FE-02** | Chức vụ & quyền: danh sách, form bundle/quyền, clone, impact | `positions`, `permissions`, `permission-bundles`, impact/clone | Chọn quyền theo module; chặn `POSITION_IN_USE`; hiển thị tác động |
| **FE-03** | Điều chuyển 4 bên + nghỉ việc + hộp việc chờ duyệt | `transfer-requests/*`, `resignation-requests/*`; `GET /approvals/inbox` (PROPOSED) | Đúng bước, đúng người, từ chối có lý do, lịch sử |
| **FE-04** | Giáo viên, sinh viên, môn học | `teachers`, `students`, `subjects` (CRUD môn PROPOSED) | Tạo tài khoản + mật khẩu tạm; trạng thái dạy/học; chặn trùng |
| **FE-05** | Lớp học + lịch tuần/tháng + xếp lịch lặp | `classes`, `schedules`, `preview/bulk` (PROPOSED) | Vòng đời lớp, chặn trùng, preview trước khi lưu |
| **FE-06** | Điểm danh + chuyên cần + đổi lịch | attendance/change-request (PROPOSED) | Chỉ giáo viên được phân công; sinh viên xem của mình |
| **FE-07** | CSVC: phòng, thiết bị, sự cố, ảnh hưởng lịch | facility APIs + severity/out_of_service (PROPOSED) | Báo → xử lý; liệt kê buổi bị ảnh hưởng |
| **FE-08** | Thông báo + cổng sinh viên + ủy quyền của tôi | `notifications`, `/students/me*`, `/delegations/me` | Đã đọc/đọc tất cả; self-scope chỉ dùng JWT |

Điều kiện trước FE-01/FE-02: chốt hợp đồng `MemberResponse` (thêm họ tên/mã NV) và thống nhất
endpoint module của OWNER; trước FE-03: chốt DEC-01 (bước nhân viên xác nhận) và enum trạng thái
yêu cầu chuyển phòng.

## 12. Cập nhật tiếp nhận FE-00 — 16/11/2026

Đối chiếu lại checklist FE-00 với code hiện tại, không xây lại phần đã có. Kiểm tra thực tế:
`tsc -b` 0 lỗi · `npm run lint` 0 error / 7 warning có chủ đích · `npm test` **45 test / 9 file** ·
`npm run build` pass.

Bổ sung:

1. **Menu theo module (điều kiện 4.3).** Backend đã có `GET /api/v1/organizations/my/modules`
   (`OwnerModuleController`, migrations 28–29). FE nạp module đang bật (`status = active`) sau
   đăng nhập/khôi phục phiên, giữ nguyên qua refresh token, nhờ đó menu OWNER ẩn module đã tắt.
   Vai trò khác chưa có nguồn module → giữ “chưa xác định = không ẩn”; backend vẫn chặn bằng
   `MODULE_NOT_ENABLED`. Endpoint ghi module (PATCH toggle, PUT/lock của SUPER_ADMIN) để FE-01.
2. **Xử lý 401 (điều kiện 4.4).** Refresh thất bại → `SessionWatcher` đưa về `/dang-nhap` kèm state
   `expired`; trang đăng nhập hiện banner cố định “Phiên đăng nhập đã hết hạn (401)” thay vì chỉ
   toast vài giây. 403 và 404 giữ nguyên (`ForbiddenState`, `NotFoundPage`).

Kiểm chứng API: đối chiếu toàn bộ đường dẫn FE gọi với controller backend — không có endpoint tự tạo.

File thay đổi chính: `lib/modules.ts`, `features/organization/{api,types}.ts`,
`stores/session-store.ts`, `features/auth/{module-hydration.ts,hooks.ts,bootstrap.ts}`,
`layouts/session-watcher.tsx`, `features/auth/pages/login-page.tsx`,
`services/mock/{fixtures,adapter}.ts`, test và tài liệu `README`, `03-SITEMAP`, `04-INTEGRATION-MATRIX`.

### 12.1 Kiểm chứng lại phần tiếp nhận (lượt này)

Đã đối chiếu từng thay đổi với backend và giữ lại vì đúng contract:

1. `GET /api/v1/organizations/my/modules` tồn tại trong `OwnerModuleController`; `SecurityConfig`
   đặt matcher `/api/v1/organizations/my/**` **trước** wildcard `organizations/**` và yêu cầu
   `ROLE_OWNER` → OWNER gọi được, SUPER_ADMIN không bị ảnh hưởng.
2. `OrganizationModuleService.listForOwner` trả đúng các khóa FE đang đọc: `code`, `name`,
   `is_core`, `status` (`active|disabled|locked|not_registered`), `is_locked_by_admin`.
3. Chỉ OWNER nạp module; MANAGER/STAFF/giáo viên/sinh viên không gọi endpoint này (tránh 403) và
   menu của họ vẫn “chưa xác định = không ẩn” — đúng thiết kế.
4. Banner 401 dùng `location.state.expired`, không phụ thuộc toast; 403/404 giữ nguyên.
5. Bổ sung 2 test tích hợp: nạp module OWNER đúng tập `active`; HR chỉ thấy nhân sự phòng mình.
   Tổng **45 test / 9 file**.
6. Sửa thêm một rủi ro phát hiện khi rà: dashboard/nhân sự trước đây gọi thành viên **mọi** phòng
   ban, sẽ 403 với HR (scope `DEPARTMENT`). Nay `useEmployeeDirectory`/`useHeadcounts` giới hạn
   theo `departmentId`, trang Nhân sự khóa bộ lọc phòng ban, trang Phòng ban hiển thị “—” ngoài
   phạm vi.
