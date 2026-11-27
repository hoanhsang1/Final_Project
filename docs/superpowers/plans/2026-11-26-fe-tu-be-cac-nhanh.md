# FE từ BE có trên các nhánh — Implementation Plan (bản rà soát 26/11)

> **For agentic workers:** REQUIRED SUB-SKILL: Dùng `superpowers:subagent-driven-development`
> (khuyến nghị) hoặc `superpowers:executing-plans`, làm từng task một. Checkbox `- [ ]` dùng để tracking.
>
> Bản này đã đối chiếu trực tiếp `origin/main` (`8b15596`) và working tree bằng `git show`/`read`.
> Các bản trước có 5 điểm sai đã sửa: envelope `code` là **chuỗi tên enum** (không phải số), cờ đổi
> mật khẩu là **JWT claim** (không có trong `LoginResponse`), `room-suggestions?classId` chỉ có trên
> nhánh room-type, component nằm trong thư mục con, gateway working tree chưa có route Schedule/Facility.

**Goal:** Đưa vào FE repo chính các màn/API theo contract BE đã có trên các ref khác. **Chưa dùng được**
tới khi port Phase 0; không bật auto-submit xếp lịch.

**Architecture:** Mỗi nhóm nghiệp vụ là feature module mới (`features/platform`, `features/schedule`,
`features/facility`) theo mẫu `features/sprint4`: `types.ts` + `<name>Api.ts` + `<name>Messages.ts`,
page dùng `PageHeader`/`Table`/`Dialog`/`useFormState`/`useNotify`, query/mutation inline với
TanStack Query. Mọi request đi qua `apiClient` (`lib/api.ts`). `vite.config.ts:14,26-30` proxy
`['/api','/departments','/positions','/permissions']` → gateway `http://127.0.0.1:8080`;
**không** hardcode port, và **không** dùng đường dẫn bare `/schedules|/facilities|/internal|/outbox`
(vượt proxy).

**Tech Stack:** React 19 + TypeScript + Vite + TanStack Query + Zustand + `@astryxdesign/core`
0.7.16 + Axios + Vitest/RTL. Không đổi build/lint/CI.

**Nguồn contract:** `docs/be-co-tren-nhanh-ma-chua-co-hien-tai-de-lam-fe.md` (inventory §2/§4/§5)
+ `docs/scope-can-chot-xep-lich.md` (chốt 26/11).

**Execution method:** Chưa chọn — hỏi user trước khi chạy (subagent-driven hay executing-plans).

## Global Constraints

- **Không commit/push/merge.** HEAD vẫn `5a4a286`; working tree chỉ `M`/`??`, staged rỗng, 0 file `D`.
- Không checkout nhánh khác, không port nguyên FE `origin/main`, không đụng copy docs trong worktree
  FE shell `C:\Users\night\.local\share\opencode\worktree\fab303\auto-schedule-fe-shell` (submit vẫn disabled).
- Chỉ Astryx. Không dùng tên gói sai quy ước: **Gói chuẩn / Gói doanh nghiệp (Enterprise)**.
- Không chạy/sửa E2E; không chạy DB, migration, build BE (thiếu JDK). Chỉ unit test FE.
- Hồ sơ học sinh giữ nguyên theo BE hiện có: không bịa `gender`, `version`, lịch sử thay đổi, lớp quá khứ.
- **Envelope lỗi:** `ApiResponse<T>` trên cả 3 service = `{success:boolean, code:string|null,
  message:string, data:T}`; `code` là **tên enum** (`"MODULE_LOCKED_BY_ADMIN"`, `"LOGIN_RATE_LIMITED"`),
  `code:null` khi success. Số `1006/1128/1133/3111/4104` là hằng số trong `ErrorCode`, **không** được
  serialize lên wire. FE so sánh **chuỗi**, không so sánh số.
- **Session:** `permissions`, `mustChangePassword`, `permissionScopes`, `delegatedPermissions`,
  `permissionsStale` là **JWT claim** (`JwtService.java:34-43`); `LoginResponse` chỉ có 4 field
  (`accessToken, refreshToken, tokenType, expiresIn`). Không thêm field vào `LoginResponse`.
- **Quyền FE** chỉ để ẩn/hiện; backend chặn thật (ADR-FE-003). Giữ alias mã cũ (`STUDENT_VIEW`, …)
  song song mã dotted (`student.view`, …); **không xoá** helper cũ. Alias đặc biệt:
  `employee.view` ↔ `PEOPLE_VIEW`, `employee.edit` ↔ `PEOPLE_EDIT` (không dịch cơ học thành `EMPLOYEE_*`).
- `getAcademicMenu(permissions, isOwner)` nhận mảng quyền; `canViewTeachers/canViewClasses/
  canViewStudents` và `canAccessAcademicArea` phải **alias-aware**, nếu không người chỉ có
  `schedule.view` bị chặn ở `/dao-tao`, hoặc vào được nhưng menu trống.
- Mọi field/endpoint mới phải có trong inventory. Chỗ chưa chốt ghi rõ "Cần chốt", không tự suy.
- Phase 0 là việc BE/gateway, **không nằm trong phạm vi code FE của plan này**; tách slice riêng.

## Thứ tự phase

| Phase | Việc | Trạng thái |
|---|---|---|
| 0 | Port có chọn lọc route gateway + BE contract (`origin/main`) — slice riêng, cần duyệt | BLOCKED (chưa port) |
| 1 | Task 1: envelope lỗi (chuỗi), alias permission, JWT claims, guard `/dao-tao` | Làm ngay được |
| 2 | Task 2–3: Identity module + auth/account | Sau Phase 0 |
| 3 | Task 4–5: Schedule + Facility | Sau Phase 0 |
| 4 | Task 6: verify toàn branch + cập nhật status doc | Sau Task 1–5 |

**Phase 0 — chi tiết route cần port** (đối chiếu `origin/main:backend/APIGateway/.../application.yml`):
`schedule-department-api` `Path=/api/departments/*/schedules/**,/api/departments/*/schedules`
`StripPrefix=1` → 8083; `schedule-self-api` `/api/schedules/**` → 8083;
`facility-department-api` `/api/departments/*/facilities/**` → 8084; route Identity
(`/api/v1/auth/**`, `/api/v1/accounts/**`, `/api/v1/organizations/**`, `/api/v1/modules/**`)
**đã có** trong working tree. Working tree hiện có 12 route, `origin/main` 30 (tức **+18**);
main dùng bare `/students/**`, working tree dùng `/api/students/**` — **giữ nguyên route hiện có**,
không xoá khi port. Số route: HEAD 11 → `origin/main` 30 (**+19**); working tree 12 → 30 (**+18**).

**Không đưa vào plan này (chờ chốt):** subject-category/`roomRequirement` (S6/S7, migration 53
DRAFT ONLY), phòng cấp tổ chức/`roomType`/`SchoolClock` (S7), auto-submit/solver/nháp → xem trước →
xác nhận/LLM (P4 BLOCKED: D1, D8, D9, D10, D11, S1, S2, S3, S5, S6, S7).

---

### Task 1: Envelope lỗi + alias permission + JWT claims + guard `/dao-tao`

**Files:**
- Modify: `frontend/src/lib/api.ts`, `frontend/src/features/auth/permissions.ts`,
  `frontend/src/features/auth/jwt.ts`, `frontend/src/features/auth/types.ts`,
  `frontend/src/features/auth/authApi.ts`
- Create: `frontend/src/features/platform/errorCodes.ts`
- Test: `frontend/src/features/platform/errorCodes.test.ts`, `frontend/src/features/auth/permissions.test.ts`,
  `frontend/src/features/auth/authApi.test.ts`

**Interfaces:**
- Consumes: interceptors 401/refresh hiện có trong `lib/api.ts` (**giữ nguyên hành vi**).
- Produces:
  - `type ApiEnvelope<T> = { success: boolean; code: string | null; message: string; data: T }`
  - `getApiCode(error: unknown): string | undefined` — đọc `error.response.data.code` (chuỗi).
  - `class ApiError extends Error { code?: string; status?: number }` — `authApi.login` ném `ApiError`
    thay vì `new Error(message)` để Task 3 đọc được `LOGIN_RATE_LIMITED`/`PASSWORD_CHANGE_REQUIRED`;
    vẫn giữ `getAuthErrorMessage` để copy tiếng Việt.
  - `PERMISSION_ALIASES` map dotted ↔ UPPERCASE, gồm alias đặc biệt `employee.view` ↔ `PEOPLE_VIEW`
    và `employee.edit` ↔ `PEOPLE_EDIT`, cùng `student.view` ↔ `STUDENT_VIEW`,
    `schedule.view` ↔ `SCHEDULE_VIEW`, `class.view` ↔ `CLASS_VIEW`, …;
    `hasAnyPermissionWithAliases(permissions, perms)`; helper cũ không đổi chữ ký.
  - `ACADEMIC_AREA_PERMISSIONS` = `SPRINT4_PERMISSIONS` + mã dotted `employee.view/edit`,
    `schedule.view/create/update/edit/cancel_session/delete/self_view`, `facility.view/manage`,
    `facility.room.view/create/update/delete`, `facility.equipment.view/create/update/delete`,
    `facility.issue.report/resolve`; `canAccessAcademicArea` và 3 hàm `canView*`/`canEdit*` dùng
    alias-aware helper. (`schedule.edit` tồn tại nhưng là legacy; chuẩn là `schedule.update`.)
    Trường hợp `getAcademicMenu` không đổi chữ ký: chuẩn hoá mảng quyền qua alias trước khi truyền.
  - `JwtClaims` bổ sung optional `mustChangePassword?: boolean`, `permissionScopes?: unknown`,
    `delegatedPermissions?: unknown`, `permissionsStale?: boolean` + `normalizeBoolean()`.
  - `LoginResponse` **giữ nguyên 4 field**.

- [ ] **Step 1: Viết test lỗi** — `errorCodes.test.ts`: envelope có `code` chuỗi, success `code:null`,
  lỗi không có response → `undefined`, **không** nhận diện số `1133`. `permissions.test.ts`: mã cũ,
  mã dotted, trộn 2 dạng đều thỏa; `canAccessAcademicArea` với chỉ `schedule.view`; chỉ `employee.view`
  vẫn thấy mục giáo viên; `class.view` ↔ `CLASS_VIEW`; `getAcademicMenu` với mảng dotted-only vẫn trả item.
  `authApi.test.ts`: login 429 giữ `code:'LOGIN_RATE_LIMITED'` và `status:429`.
- [ ] **Step 2: Chạy test, xác nhận fail** (dùng lệnh Step 4, đổi tên file test).
- [ ] **Step 3: Implement** đúng interface trên; không đổi interceptor; không xoá helper cũ.
- [ ] **Step 4: Verify**

```powershell
# Chạy từ D:\Final_Project\frontend:
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' 'D:\Final_Project\frontend\node_modules\vitest\vitest.mjs' run src/features/platform src/features/auth/permissions.test.ts src/features/auth/authApi.test.ts
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' 'D:\Final_Project\frontend\node_modules\typescript\bin\tsc' -b --pretty false
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' 'D:\Final_Project\frontend\node_modules\eslint\bin\eslint.js' src/features/platform src/features/auth
```

Expected: pass / EXIT 0; không commit.

---

### Task 2: Module tổ chức — OWNER toggle + SUPER_ADMIN lock + lọc menu

**Files:**
- Modify: `frontend/src/features/modules/moduleApi.ts`, `frontend/src/features/admin/consoleMenu.ts`,
  `frontend/src/features/owner/ownerMenu.ts`, `frontend/src/router.tsx`
- Create: `frontend/src/features/modules/useModuleStatus.ts`,
  `frontend/src/pages/OrganizationModulesPage/OrganizationModulesPage.tsx`,
  `frontend/src/pages/AdminModulesPage/AdminModulesPage.tsx`
- Test: `frontend/src/features/modules/moduleApi.test.ts`,
  `frontend/src/pages/OrganizationModulesPage/OrganizationModulesPage.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`getApiCode`), `OwnerConsoleLayout`, `AdminConsoleLayout`, `PageHeader`, `Dialog`, `useNotify`.
- Produces (đúng path inventory §2.1–2.2):
  - `fetchMyModules()` → `GET /api/v1/organizations/my/modules`
  - `toggleMyModule(code, enabled)` → `PATCH /api/v1/organizations/my/modules/{code}` body `{enabled}`, 204
  - `fetchAdminModules(orgId)` → `GET /api/v1/organizations/{orgId}/modules/admin`
  - `lockAdminModule(orgId, code, {lock, reason})` → `PATCH /api/v1/organizations/{orgId}/modules/{code}/lock`, 204
  - `useModuleStatus()` → đọc `GET /api/v1/modules/status`, trả map `{code,status}` cho menu.
  - Routes: `quan-tri/to-chuc/:id/module` (AdminGuard/`SUPER_ADMIN`) và `to-chuc/module` (OwnerGuard).
    `quan-tri/module` **đã tồn tại** (`ModuleCatalogPage`) — không trùng/ghi đè.
- Contract: `status ∈ active|disabled|locked|not_registered`; core không toggle/lock; lỗi so theo **chuỗi**
  `"MODULE_IS_CORE"`, `"MODULE_LOCKED_BY_ADMIN"`, `"MODULE_PENDING_WORKFLOWS"`. BE yêu cầu `reason` không
  rỗng cho **cả lock lẫn unlock** (`OrganizationModuleService.adminLockToggle` → `MODULE_LOCK_REASON_REQUIRED`),
  nên form luôn bắt nhập `reason` ở 2 chế độ.

- [ ] **Step 1: Viết test lỗi** — path/body đúng, 204 rỗng, lỗi 3 mã chuỗi hiện message riêng;
  page: core disable nút, locked hiện lý do/thời gian, toggle fail giữ state cũ, **lock và unlock thiếu reason
  đều không gọi API**.
- [ ] **Step 2: Chạy test, xác nhận fail.**
- [ ] **Step 3: Implement** 4 hàm API (giữ `fetchModuleCatalog`), 2 page, 2 route, `useModuleStatus`;
  `CONSOLE_MENU` nhận bộ lọc status tuỳ chọn; thêm matcher
  `/^\/quan-tri\/to-chuc\/[^/]+\/module$/` trước regex chi tiết ở `consoleMenu.ts:126`.
  **Không** thêm item CSVC ở đây — đưa cùng Task 5 để tránh link chết tạm thời.
- [ ] **Step 4: Verify** (lệnh mẫu Task 1, đổi đường dẫn sang `features/modules` + 2 page + `router.tsx`).

Expected: pass / EXIT 0; không commit.

---

### Task 3: Auth/account — cờ từ JWT, đổi mật khẩu cưỡng chế, mật khẩu tạm, 429

**Files:**
- Modify: `frontend/src/stores/authStore.ts`, `frontend/src/features/auth/authApi.ts` (Task 1),
  `frontend/src/components/SessionWatcher/SessionWatcher.tsx`,
  `frontend/src/pages/LoginPage/LoginPage.tsx`, `frontend/src/pages/AccountsPage/AccountsPage.tsx`,
  `frontend/src/pages/AccountDetailPage/AccountDetailPage.tsx`, `frontend/src/features/admin/adminApi.ts`,
  `frontend/src/components/AccountResetPasswordModal/AccountResetPasswordModal.tsx`
- Create: `frontend/src/components/ForcePasswordChangeModal/ForcePasswordChangeModal.tsx`
- Test: `frontend/src/pages/LoginPage/LoginPage.test.tsx`, `frontend/src/stores/authStore.test.ts`

**Interfaces:**
- Consumes: Task 1, `components/TempPasswordModal/TempPasswordModal.tsx` (props
  `{open, username, password, onClose}` — **chỉ hiển thị/copy mật khẩu tạm**, không có input),
  `components/AccountResetPasswordModal/AccountResetPasswordModal.tsx` (props
  `{open, username, loading, error?, onCancel, onConfirm(mode, newPassword?)}`).
- Produces:
  - `authStore` lưu `mustChangePassword` đọc từ `decodeJwtClaims(accessToken)` lúc hydrate /
    login / refresh; **không** đọc từ `LoginResponse`. `jwt.ts:9-18` là nguồn claim.
  - `ForcePasswordChangeModal` (mới) gọi `POST /api/v1/auth/change-password` → **204**;
    `code:'PASSWORD_CHANGE_REQUIRED'` (1006) → mở modal, chặn màn khác.
  - `adminApi.resetAccountPassword` đổi `Promise<void>` → trả body phẳng `{}` hoặc
    `{temporaryPassword}` từ **HTTP 200** (request key `new_password`, snake_case); sau đó dùng
    `TempPasswordModal` để hiện/copy.
  - `createAccount` đổi `Promise<AccountItem>` → `Promise<AccountItem & {temporaryPassword: string}>`;
    `AccountsPage` tạo tài khoản xong truyền response vào `TempPasswordModal` (BE trả 201 kèm
    `temporaryPassword`), hiện tại `onSuccess` đang bỏ qua response.
  - `AccountResetPasswordModal` nâng `MIN_PASSWORD_LENGTH` 8 → **12** và kiểm tra **≤72 byte UTF-8**
    theo `PasswordPolicy.java` (`MIN_LENGTH=12`, `MAX_BYTES=72`); cập nhật text/lỗi tiếng Việt.
  - Login 429 / `code:'LOGIN_RATE_LIMITED'` → thông báo riêng, không hiện "sai mật khẩu".
  - Refresh reuse → 401 + `onUnauthorized` đăng xuất; **không** đổi luồng refresh trong `lib/api.ts`.

- [ ] **Step 1: Viết test lỗi** — claim `mustChangePassword:true` → store bật cờ; 429 giữ code;
  reset 200 có `temporaryPassword` → modal nhận đúng password; create 201 có `temporaryPassword` →
  `TempPasswordModal` mở; mật khẩu 11 ký tự hoặc >72 byte bị chặn trước khi gọi API;
  login response không có flag vẫn chạy.
- [ ] **Step 2: Chạy test, xác nhận fail.**
- [ ] **Step 3: Implement** modal mới + store + API; giữ nguyên `TempPasswordModal` (display-only).
- [ ] **Step 4: Verify** (lệnh mẫu, đổi đường dẫn `stores/authStore.test.ts` + `pages/LoginPage` + `features/admin`).

Expected: pass / EXIT 0; không commit.

---

### Task 4: Schedule — lịch tuần/lớp, room picker, impacts, lịch cá nhân (KHÔNG auto-submit)

**Files:**
- Create: `frontend/src/features/schedule/types.ts`, `scheduleApi.ts`, `scheduleMessages.ts`
- Modify: `frontend/src/features/sprint4/academicMenu.ts`, `frontend/src/router.tsx`
- Create: `frontend/src/pages/SchedulePage/SchedulePage.tsx`, `frontend/src/pages/ImpactsPage/ImpactsPage.tsx`,
  `frontend/src/pages/MySchedulePage/MySchedulePage.tsx`
- Test: `frontend/src/features/schedule/scheduleApi.test.ts`, `frontend/src/pages/SchedulePage/SchedulePage.test.tsx`,
  `frontend/src/pages/MySchedulePage/MySchedulePage.test.tsx`

**Interfaces:**
- Consumes: Task 1 (guard + `getApiCode`), `PageHeader`, `Table`, `useFormState`, `useNotify`.
- Produces: `fetchSchedules({departmentId, from, to, classId})` → `GET /api/departments/{d}/schedules`;
  `createSchedule`/`updateSchedule`/`cancelSession`/`deleteSession`;
  `fetchRoomSuggestions({departmentId, startTime, endTime})` → `GET /api/departments/{d}/schedules/room-suggestions`;
  `fetchImpacts({departmentId, status})` → `GET /api/departments/{d}/schedules/impacts`;
  `fetchMySchedule({from,to})` → `GET /api/schedules/me` (**không** gửi `departmentId`).
  Routes `dao-tao/lich`, `dao-tao/lich/buoi-bi-anh-huong` và **`dao-tao/lich-cua-toi`** (trang của
  `fetchMySchedule`); `getAcademicMenu` thêm item `lich` (cần `schedule.view`) và `lich-cua-toi`
  (cần `schedule.self_view`) qua helper alias-aware của Task 1; mở rộng `activeAcademicMenuKey`
  cho `/dao-tao/lich*` và `/dao-tao/lich-cua-toi`. Nếu không, người chỉ có `schedule.self_view` vào được
  `/dao-tao` nhưng menu trống và không có trang cá nhân.
- Contract: quyền `schedule.view/create/update/cancel_session/delete/self_view` (`schedule.edit` chỉ alias legacy).
  Lỗi so theo chuỗi `"ROOM_SCHEDULE_CONFLICT"`, `"TEACHER_SCHEDULE_CONFLICT"`, `"CLASS_SCHEDULE_CONFLICT"`.
  **`room-suggestions` trên `origin/main` chỉ nhận `startTime`/`endTime`**; tham số `classId` chỉ có trên
  `origin/feature/auto-schedule-room-type` → **không gửi `classId`** cho tới khi chốt S7. Chặn trùng/sức
  chứa là BE; FE chỉ hiển thị lỗi. **Không** gọi `/auto-generate`, không render nút "Tự xếp lịch".
  Múi giờ: FE format theo local; `app.timezone` chỉ có trên nhánh room-type (D7 đã chốt 26/11;
  chỉ chờ S7 cho phạm vi `roomType`/org-wide/timezone).

- [ ] **Step 1: Viết test lỗi** — params lọc tuần/lớp đúng, cancel/delete đúng method, suggestions **không**
  gửi `classId`, impacts lọc `status`, `/schedules/me` không gửi `departmentId`; 5 trạng thái loading/empty/error/retry/forbidden.
  Với `permissions=['schedule.self_view']` → menu có `lich-cua-toi`, route render trang cá nhân; với chỉ
  `schedule.view` → menu có `lich`, không có `lich-cua-toi`.
- [ ] **Step 2: Chạy test, xác nhận fail.**
- [ ] **Step 3: Implement** API + 3 page + 3 route + menu; guard `/dao-tao` đã được mở ở Task 1.
- [ ] **Step 4: Verify** (lệnh mẫu, đổi đường dẫn `features/schedule` + 3 page + `router.tsx`).

Expected: pass / EXIT 0; không commit; không gọi `/internal/**`.

---

### Task 5: Facility — phòng / thiết bị / sự cố + picker phòng

**Files:**
- Create: `frontend/src/features/facility/types.ts`, `facilityApi.ts`, `facilityMessages.ts`
- Modify: `frontend/src/router.tsx`, `frontend/src/features/owner/ownerMenu.ts`
- Create: `frontend/src/pages/RoomsPage/RoomsPage.tsx`, `frontend/src/pages/FacilityIssuesPage/FacilityIssuesPage.tsx`
- Test: `frontend/src/features/facility/facilityApi.test.ts`, `frontend/src/pages/RoomsPage/RoomsPage.test.tsx`

**Interfaces:**
- Consumes: Task 1 (guard), Task 4 (`fetchRoomSuggestions`), `PageHeader`, `Table`, `Dialog`.
- Produces: CRUD phòng/thiết bị/sự cố tại `/api/departments/{d}/facilities/**`; route
  **`to-chuc/co-so-vat-chat` dưới `OwnerGuard`** (endpoint theo `departmentId`, quyền
  `facility.*` cấp org/dept — **không** đặt dưới `quan-tri/` vì khu vực đó là `SUPER_ADMIN`);
  cập nhật `ownerMenu.ts`: thêm item `{key:'co-so-vat-chat', path:'/to-chuc/co-so-vat-chat', exact:true}`
  và check `startsWith('/to-chuc/co-so-vat-chat')` **trước** fallback `/to-chuc` ở `ownerMenu.ts:58-71`,
  nếu không highlight nhầm "Phòng ban".
- Contract: `facility.room.view/create/update/delete`, `facility.equipment.view/create/update/delete`,
  `facility.issue.report/resolve` (không có `facility.issue.view`); `room_type ∈ classroom|computer_room`,
  status `active|maintenance|closed`; lỗi `"ROOM_IN_USE"`. Room picker dùng `/room-suggestions`,
  **không** tự lọc `roomType` (chưa nối solver — Cần chốt S7). Không gọi `/internal/rooms`, `/outbox/**`.

- [ ] **Step 1: Viết test lỗi** — path/method CRUD, lọc `status` issues, resolve đúng POST,
  `"ROOM_IN_USE"` hiện message, picker lấy suggestions theo khung giờ.
- [ ] **Step 2: Chạy test, xác nhận fail.**
- [ ] **Step 3: Implement** API + 2 page + route + item/menu highlight dưới OwnerGuard (item CSVC chuyển từ Task 2).
- [ ] **Step 4: Verify** (lệnh mẫu, đổi đường dẫn `features/facility` + 2 page + `router.tsx`).

Expected: pass / EXIT 0; không commit.

---

### Task 6: Verify toàn branch + cập nhật trạng thái

**Files:** Modify `docs/trang-thai-hien-tai-2026-11-26.md` (thêm mục "FE từ BE các nhánh: đã làm / còn chờ").

- [ ] **Step 1: Chạy full kiểm chứng** (từ `D:\Final_Project\frontend`)

```powershell
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' 'D:\Final_Project\frontend\node_modules\vitest\vitest.mjs' run
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' 'D:\Final_Project\frontend\node_modules\typescript\bin\tsc' -b --pretty false
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' 'D:\Final_Project\frontend\node_modules\eslint\bin\eslint.js' .
git rev-parse --short HEAD
git diff --cached --name-only
git status --short
```

Expected: vitest pass, `tsc`/`eslint` EXIT 0, HEAD `5a4a286`, staged rỗng, **0 file `D`**, không commit. Không chạy E2E.

- [ ] **Step 2: Ghi status** — route gateway/BE **chưa port, chưa smoke test** (thiếu JDK),
  auto-submit vẫn disabled, danh sách chốt còn chờ (D1/D8/D9/D10/D11/S1/S2/S3/S5/S6/S7), migration 53 DRAFT ONLY.

---

## Definition of done

- Task 1–5 có unit test pass, `tsc`/`eslint` sạch, working tree chưa commit, 0 file bị xoá.
- Envelope lỗi so bằng **chuỗi tên enum**; cờ đổi mật khẩu đọc từ **JWT claim**; `:classId` không gửi trước S7.
- `/dao-tao` mở cho permission dotted (kể cả `employee.view/edit`); mọi `canView*`/menu alias-aware;
  menu highlight đúng route mới; facility nằm dưới OwnerGuard.
- Chính sách mật khẩu FE khớp 12 ký tự/≤72 byte; create/reset đều hiện `temporaryPassword`.
- Không endpoint nào bị gọi khi gateway chưa có route; P4 vẫn BLOCKED; worktree FE shell không bị đụng.
