# 00 — Discovery: bảng route, quyền, API, trạng thái cần giả lập

> Nguồn: `frontend/src/router.tsx` (đọc hết), các `*Guard`, `authStore`, `features/*/ *Api.ts`.
> Mục tiêu: biết mỗi route cần gì để dump được bằng Playwright (Giai đoạn 2).

---

## 1. Cách app lưu phiên & xác định đăng nhập

- **Token ở `localStorage`** (không phải cookie): `mems.accessToken`, `mems.refreshToken` (`lib/api.ts:15-16`).
- `authStore.restoreSession()` đọc access token lúc khởi động; **hết hạn → coi như chưa đăng nhập** (`authStore.ts:48-73`).
- Claims đọc từ **payload của JWT** (`jwt.ts:21-32`, không verify chữ ký):
  - `userId`, `username`
  - `roles` (mảng chuỗi backend, vd `["SUPER_ADMIN"]`)
  - `permissions` (mảng chuỗi, vd `["PEOPLE_VIEW","CLASS_VIEW"]`)
  - `exp` (giây epoch) — không có `exp` ⇒ coi như còn hạn.
- `backendRoles` + `permissions` là căn cứ **duy nhất** để guard ẩn/hiện UI.
- `401` từ API → interceptor gọi `/api/v1/auth/refresh`; refresh thất bại → xoá token + về `/dang-nhap` (`lib/api.ts`, `SessionWatcher`).

> **Hệ quả cho Playwright:** có thể "đăng nhập giả" bằng 2 cách:
> 1. `page.route('**/api/v1/auth/login', …)` trả `LoginResponse` với `accessToken` là **JWT giả** (payload base64url) → chạy đúng luồng login thật.
> 2. `page.addInitScript` ghi thẳng `localStorage['mems.accessToken'] = <JWT giả>` trước khi app load → vào thẳng màn console.
>
> JWT giả chỉ cần 3 phần ngăn bởi `.`; phần thứ 2 là base64url của JSON claims. Ví dụ claims:
> `{"userId":"u1","username":"demo","roles":["SUPER_ADMIN"],"permissions":[],"exp":9999999999}`.

---

## 2. Bảng route đầy đủ

| # | Route | Trang | Cần đăng nhập? | Vai trò / quyền | API chính | Trạng thái cần giả lập |
|---|-------|-------|----------------|-----------------|-----------|------------------------|
| 1 | `/` | (redirect) | không | — | — | → `/dang-nhap` |
| 2 | `/dang-nhap` | LoginPage | không | — | `POST /api/v1/auth/login` | default, loading, sai mật khẩu (401), tài khoản bị vô hiệu (403), vai trò chưa có màn hình |
| 3 | `/dang-ky` | RegisterPage | không | — | `GET /api/v1/modules`, `POST /api/v1/auth/register` | default, module loading (skeleton), module empty, module error, submit success, submit lỗi |
| 4 | `/quen-mat-khau` | ForgotPasswordPage | không | — | `POST /api/v1/auth/forgot-password` (`D-32` chưa có) | default, gửi thành công (trung tính), 404 → "chưa sẵn sàng", 429 |
| 5 | `/dat-lai-mat-khau?token=…` | ResetPasswordPage | không | — | `POST /api/v1/auth/reset-password` (`D-33` chưa có) | thiếu token, token hết hạn (400), thành công (204), 404 |
| 6 | `/xem-thu/:vaiTro` | RolePreviewPage (**demo**) | không | — | — (chỉ dựng bố cục) | slug hợp lệ, slug sai, có phiên (hiện nút Đăng xuất) |
| 7 | `/quan-tri` (index) | OverviewPage | **có** | `SUPER_ADMIN` | `GET /api/v1/organizations/pending`, `GET /api/v1/modules` | loading, error, success; **no-permission** → 403 guard |
| 8 | `/quan-tri/to-chuc` | PendingOrganizationsPage | có | `SUPER_ADMIN` | `GET /api/v1/organizations/pending` | loading, empty, error, success |
| 9 | `/quan-tri/to-chuc/tat-ca` | AllOrganizationsPage | có | `SUPER_ADMIN` | `GET /api/v1/organizations` (`D-20` chưa có) | loading, empty, error, **404 → "chờ backend"**, success |
| 10 | `/quan-tri/to-chuc/:id` | OrganizationDetailPage | có | `SUPER_ADMIN` | `GET /api/v1/organizations/{id}`, `PATCH …/approve`, `PATCH …/reject`, `PUT …/modules` (`D-16`) | loading, 404 (không thấy), error, success; modal duyệt/từ chối/cấu hình module |
| 11 | `/quan-tri/to-chuc/:id/lich-su` | OrganizationAuditPage | có | `SUPER_ADMIN` | `GET /api/v1/audit-logs?organizationId=` | loading, empty, error, 404 "chờ backend" |
| 12 | `/quan-tri/module` | ModuleCatalogPage (**read-only**) | có | `SUPER_ADMIN` | `GET /api/v1/modules` | loading, empty, error, success |
| 13 | `/quan-tri/tai-khoan` | AccountsPage | có | `SUPER_ADMIN` | `GET /api/v1/accounts` (`D-24`), `GET …/options` (`D-20b`), `POST /api/v1/accounts` (`D-29`) | loading, empty, error, 404 "chờ backend", success; modal tạo tài khoản |
| 14 | `/quan-tri/tai-khoan/:id` | AccountDetailPage | có | `SUPER_ADMIN` | `GET …/accounts/{id}`, `PATCH …/status`, `PATCH …/role`, `POST …/reset-password`, `GET …/audit-logs?accountId=` | loading, 404, error, success; 3 modal (trạng thái/vai trò/mật khẩu) |
| 15 | `/quan-tri/nhat-ky` | AuditLogPage | có | `SUPER_ADMIN` | `GET /api/v1/audit-logs` | loading, empty, error, 404 "chờ backend", success |
| 16 | `/to-chuc` (index) | DepartmentsPage | **có** | `OWNER`/`ORG_OWNER` | `GET /departments`, `POST/PUT/DELETE /departments/{id}` | loading, empty, error, success; modal form; xoá (Popconfirm) |
| 17 | `/to-chuc/chuc-vu` | PositionsPage | có | `OWNER`/`ORG_OWNER` | `GET /positions`, `GET /permissions`, `POST/PUT/DELETE /positions/{id}` | loading, empty, error, success; modal form |
| 18 | `/to-chuc/phong-ban/:id` | DepartmentDetailPage | có | `OWNER`/`ORG_OWNER` | `GET /departments/{id}/members`, `POST …/members`, `PUT …/members/{userId}/positions`, `DELETE …/members/{userId}` | loading, empty, error, success; modal tạo nhân viên; modal mật khẩu tạm |
| 19 | `/dao-tao` (index) | (redirect) | có | OWNER hoặc PEOPLE_*/CLASS_* | — | → `giao-vien` |
| 20 | `/dao-tao/giao-vien` | TeachersPage | **có** | `PEOPLE_VIEW`/`PEOPLE_EDIT` hoặc OWNER | `GET /api/teachers`, `GET /api/specialties`, `GET /positions`, `GET /departments`, `POST /api/teachers`, `POST /api/specialties` | loading, empty, error, no-permission, success; modal tạo GV, modal mật khẩu tạm, modal chuyên môn |
| 21 | `/dao-tao/giao-vien/:id` | TeacherDetailPage | có | như trên | `GET /api/teachers/{id}`, `PUT /api/teachers/{id}` | loading, 404, error, success; **noClass → "Chưa có lớp"** |
| 22 | `/dao-tao/lop-hoc` | ClassesPage | có | `CLASS_VIEW` hoặc OWNER | `GET /api/classes` | loading, empty, error, no-permission, success |
| 23 | `/dao-tao/lop-hoc/:id` | ClassDetailPage | có | `CLASS_VIEW` hoặc OWNER | `GET /api/classes/{id}`, `GET /api/teachers/assignable`, `GET …/status-logs`, `GET …/close-events`, `PUT …/teacher`, `POST …/cancel`, `POST …/close-requests[/approve\|/reject]`, `POST …/reopen` | loading, 404, error, success; modal gán GV / huỷ / yêu cầu đóng / duyệt / từ chối / mở lại |
| 24 | `*` | NotFoundPage | không | — | — | 404 |

---

## 3. Quyền & menu theo khu vực

- **`/quan-tri`** — `AdminGuard`: phải có `backendRoles.includes('SUPER_ADMIN')`; chưa đăng nhập → `/dang-nhap`; sai role → 403 tại chỗ (`AdminGuard.tsx:19-47`).
- **`/to-chuc`** — `OwnerGuard`: `OWNER` **hoặc** `ORG_OWNER` (`OwnerGuard.tsx:21-49`).
- **`/dao-tao`** — `AcademicGuard`: OWNER/ORG_OWNER **hoặc** có bất kỳ quyền trong `SPRINT4_PERMISSIONS` (`permissions.ts:23-57`).
  - Menu Đào tạo **ẩn mục theo quyền** (`academicMenu.ts:12-28`): chỉ hiện "Giáo viên" nếu `canViewTeachers`, chỉ hiện "Lớp học" nếu `canViewClasses`. ⇒ **Vai trò quyết định menu**, đừng coi "thiếu mục menu" là lỗi.

### Ma trận quyền nhanh (để tạo nhiều phiên khác nhau)

| Phiên giả | roles | permissions | Vào được |
|-----------|-------|-------------|----------|
| Super admin | `["SUPER_ADMIN"]` | `[]` | `/quan-tri/*` |
| Owner | `["OWNER"]` | `[]` | `/to-chuc/*` + `/dao-tao/*` (OWNER luôn được) |
| Giáo vụ (chỉ xem GV) | `["ACADEMIC_STAFF"]` | `["PEOPLE_VIEW"]` | `/dao-tao/giao-vien` (menu chỉ có GV) |
| Giáo vụ (chỉ xem lớp) | `["ACADEMIC_STAFF"]` | `["CLASS_VIEW"]` | `/dao-tao/lop-hoc` (menu chỉ có Lớp) |
| Giáo viên | `["TEACHER"]` | `[]` | **không** vào `/dao-tao` → 403 |
| Người dùng thường | `["STUDENT"]` | `[]` | không console nào → 403 |

---

## 4. Trạng thái chuẩn cần phủ cho MỌI màn dữ liệu (5 state)

Theo `docs/ui-conventions.md:164` (5 trạng thái bắt buộc): **loading · empty · error · success · no-permission**.

Với Playwright, mỗi màn dữ liệu cần ≥ 4 kịch bản:
1. **loading** — `page.route` giữ request treo (không fulfill) → chụp khi đang `Skeleton`/`PageLoading`.
2. **empty** — fulfill mảng rỗng / `items: []`.
3. **error** — fulfill `500` (và một ca `404` cho endpoint "chờ backend").
4. **success** — fulfill dữ liệu mẫu.

Riêng **no-permission** kiểm bằng phiên sai role (mục 3), không cần route.

---

## 5. Ghi chú kỹ thuật cho script dump

- Dev server: `npm run dev` (Vite, port **5173**) — proxy `/api`, `/departments`, `/positions`, `/permissions` sang `127.0.0.1:8080` (`vite.config.ts:14-30`). **BE không chạy** ⇒ mọi request phải bị `page.route` chặn (nếu lọt ra proxy sẽ treo/timeout).
- Endpoint **không** nằm dưới `/api`: `/departments*`, `/positions*`, `/permissions*` — nhớ mock cả nhóm này.
- Playwright: **chưa có browser trong cache** (`%USERPROFILE%\AppData\Local\ms-playwright` trống) nhưng máy có **Chrome** + **Edge** ⇒ dùng `channel: 'chrome'` hoặc `'msedge'` (không tải browser).
- Viewport: **desktop 1366×768** và **mobile 375×667** (ràng buộc responsive 320/768/1024/1440 — dùng 375 thay 320 cho đỡ vỡ, bổ sung 320 nếu cần).
- Ghi dump **UTF-8** vào `ux-review/`, đọc lại bằng công cụ đọc file (không `cat`/`type`).
