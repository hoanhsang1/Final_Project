# Vá lỗ hổng page theo vai trò Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm cho mọi role backend có quyền đều tới được màn có nội dung: hiểu mã quyền legacy, mở cửa facility không cần owner, sửa dead-end `/dao-tao`, thêm chi tiết lớp cho học sinh và các mục menu thiếu.

**Architecture:** Chuẩn hoá mã legacy tại một điểm trong `permissions.ts` rồi dùng lại mọi helper alias-aware; tách `landing.ts` để chọn đích đăng nhập từ menu thật (tránh vòng import với `academicMenu.ts`); facility mượn `OwnerConsoleLayout` qua prop `variant` và có guard riêng; chi tiết lớp HS đọc từ endpoint self có sẵn.

**Tech Stack:** React + TypeScript + Vitest + Testing Library + React Router v6 + TanStack Query + Astryx `@astryxdesign/core`; Node portable `C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64`.

**Spec:** `docs/superpowers/specs/2026-11-27-role-page-gaps-design.md`

## Global Constraints

- Không commit/push/merge; HEAD phải vẫn là `5a4a286c7c097ffc046a04413e23630d9379b975`, staged `0`, deleted `0`.
- Không đổi BE/contract/seed/migration; không đổi build/lint/CI/dependency; không thêm dependency.
- FE giữ Astryx; chạm thử chỉ dùng `http://localhost:5173`; gateway chỉ origin này.
- Không copy FE `origin/main`; không dùng từ “VIP”; không đụng worktree `C:\Users\night\.local\share\opencode\worktree\fab303\auto-schedule-fe-shell`; không tạo worktree mới; không sửa `07_people_department_access.sql`.
- Self pages chỉ đọc, gate bằng `backendRoles`, không dùng permission quản lý cho quyết định chế độ xem.
- Mọi lệnh kiểm tra đặt Node portable lên `PATH` trước; dùng `npx.cmd vitest run`, `npm.cmd run lint`, `npx.cmd tsc -b --pretty false`.
- P0 xong mới làm P1; mỗi task kết thúc bằng “không commit”.

## Review Focus

- Token legacy (`CLASS_READ`, `FACILITY_READ`, `INCIDENT_CREATE`, …) phải được hiểu **mà không làm đè reverse map** `employee.view → PEOPLE_VIEW`; test Task 1 kiểm tra cả hai chiều.
- User có `class.view`/`student.view`/`schedule.view` nhưng không có `PEOPLE_VIEW` không được dừng ở `ForbiddenNotice`; test Task 2 (landing helper + router).
- FACILITY_STAFF bấm URL cũ `/to-chuc/co-so-vat-chat/su-co?departmentId=d1` phải tới màn mới và giữ query; test Task 3.
- TEACHER và STUDENT có cùng self-permission → không được lẫn page; test forbidden trong Task 4.
- `/dao-tao/lich/buoi-bi-anh-huong` không được highlight nhầm mục “Lịch”; test Task 5.

---

### Task 1: Chuẩn hoá mã quyền legacy và gate facility (P0) ✅

**Files:**
- Modify: `frontend/src/features/auth/permissions.ts`
- Modify: `frontend/src/features/auth/permissions.test.ts`

**Interfaces:**
- Consumes: `PERMISSION_ALIASES`, `normalizePermissionCode()`, `hasAnyPermissionWithAliases()`, `canAccessAcademicArea()`, `canViewTeachers()`, `canViewClasses()` hiện có.
- Produces:
  - `export const LEGACY_PERMISSION_ALIASES: Readonly<Record<string, string>>`
  - `export function canAccessFacilityArea(state: { backendRoles: string[]; permissions: string[] }): boolean`
  - `normalizePermissionCode()` trả về mã UPPERCASE chuẩn cho cả 10 mã legacy trong spec.

- [ ] **Step 1: Viết test failing cho 10 cặp legacy và reverse map**

Trong `permissions.test.ts`, thêm describe mới với các assert:

```ts
expect(normalizePermissionCode('PEOPLE_READ')).toBe('PEOPLE_VIEW');
expect(normalizePermissionCode('PEOPLE_WRITE')).toBe('PEOPLE_EDIT');
expect(normalizePermissionCode('CLASS_READ')).toBe('CLASS_VIEW');
expect(normalizePermissionCode('CLASS_WRITE')).toBe('CLASS_EDIT');
expect(normalizePermissionCode('SCHEDULE_READ')).toBe('SCHEDULE_VIEW');
expect(normalizePermissionCode('SCHEDULE_WRITE')).toBe('SCHEDULE_UPDATE');
expect(normalizePermissionCode('FACILITY_READ')).toBe('FACILITY_VIEW');
expect(normalizePermissionCode('FACILITY_WRITE')).toBe('FACILITY_MANAGE');
expect(normalizePermissionCode('INCIDENT_CREATE')).toBe('FACILITY_ISSUE_REPORT');
expect(normalizePermissionCode('INCIDENT_MANAGE')).toBe('FACILITY_ISSUE_RESOLVE');
// reverse map cũ không bị đè
expect(PERMISSION_ALIASES['employee.view']).toBe('PEOPLE_VIEW');
expect(PERMISSION_ALIASES.CLASS_VIEW).toBe('class.view');
expect(PERMISSION_ALIASES.FACILITY_ISSUE_REPORT).toBe('facility.issue.report');
```

- [ ] **Step 2: Viết test failing cho gate theo token legacy**

```ts
expect(hasAnyPermissionWithAliases(['CLASS_READ'], ['class.view'])).toBe(true);
expect(canViewTeachers(false, ['PEOPLE_READ'])).toBe(true);
expect(canViewClasses(false, ['CLASS_READ'])).toBe(true);
expect(
  canAccessAcademicArea({
    backendRoles: ['ACADEMIC_STAFF'],
    permissions: ['CLASS_READ', 'PEOPLE_READ', 'SCHEDULE_READ', 'REPORT_READ'],
  }),
).toBe(true);
expect(
  canAccessFacilityArea({
    backendRoles: ['FACILITY_STAFF'],
    permissions: ['FACILITY_READ', 'INCIDENT_CREATE'],
  }),
).toBe(true);
expect(
  canAccessFacilityArea({ backendRoles: [], permissions: ['facility.issue.resolve'] }),
).toBe(true);
expect(canAccessFacilityArea({ backendRoles: [], permissions: ['CLASS_READ'] })).toBe(false);
```

- [ ] **Step 3: Chạy test để thấy fail**

Run (từ `frontend/`): `$env:PATH='C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64;'+$env:PATH; npx.cmd vitest run src/features/auth/permissions.test.ts`

Expected: FAIL — export `canAccessFacilityArea` chưa có; `normalizePermissionCode('CLASS_READ')` vẫn trả `'CLASS_READ'`.

- [ ] **Step 4: Implement alias và gate**

Trong `permissions.ts`, thêm `LEGACY_PERMISSION_ALIASES` ánh xạ UPPERCASE → UPPERCASE chuẩn như bảng Step 1. Đổi `normalizePermissionCode()` thành: nếu `UPPERCASE_CODE.test(code)` thì trả `LEGACY_PERMISSION_ALIASES[code] ?? code`, nếu không trả `PERMISSION_ALIASES[code] ?? code`. **Không** thêm legacy vào `PERMISSION_ALIASES` (map 2 chiều sẽ đè reverse map). Thêm `canAccessFacilityArea()` = owner (`isOwnerRole`) hoặc `hasAnyPermissionWithAliases(permissions, ['FACILITY_VIEW', 'FACILITY_MANAGE', 'FACILITY_ISSUE_REPORT', 'FACILITY_ISSUE_RESOLVE'])`.

- [ ] **Step 5: Chạy lại test**

Run: lệnh Step 3. Expected: PASS (cả test cũ).

- [ ] **Step 6: Không commit** — không chạy `git add`/`git commit`.

---

### Task 2: Chọn đích đăng nhập theo menu thực tế (P0) ✅

**Files:**
- Create: `frontend/src/features/auth/landing.ts`
- Create: `frontend/src/features/auth/landing.test.ts`
- Modify: `frontend/src/pages/LoginPage/LoginPage.tsx`
- Modify: `frontend/src/pages/LoginPage/LoginPage.test.tsx`
- Modify: `frontend/src/router.tsx` (chỉ `AcademicIndexRedirect`)
- Modify: `frontend/src/router.test.tsx`

**Interfaces:**
- Consumes: `canAccessFacilityArea()` (Task 1), `isOwnerRole()`, `getAcademicMenu()`, `rolePreviewPath()`.
- Produces:
  - `export type LandingTarget = string | null`
  - `export function landingPathFor(state: { backendRoles: string[]; permissions: string[]; role: RoleId | null }): LandingTarget`

- [ ] **Step 1: Viết test failing cho `landingPathFor`**

Trong `landing.test.ts`:

```ts
expect(landingPathFor({ backendRoles: ['SUPER_ADMIN'], permissions: [], role: 'platform-admin' })).toBe('/quan-tri');
expect(landingPathFor({ backendRoles: ['OWNER'], permissions: [], role: 'org-owner' })).toBe('/to-chuc');
expect(landingPathFor({
  backendRoles: ['ACADEMIC_STAFF'],
  permissions: ['CLASS_READ', 'PEOPLE_READ', 'SCHEDULE_READ'],
  role: 'academic-staff',
})).toBe('/dao-tao');
expect(landingPathFor({
  backendRoles: ['STAFF'], permissions: ['class.view', 'student.view'], role: 'academic-staff',
})).toBe('/dao-tao');
expect(landingPathFor({
  backendRoles: ['FACILITY_STAFF'], permissions: ['FACILITY_READ', 'INCIDENT_CREATE'], role: null,
})).toBe('/co-so-vat-chat');
expect(landingPathFor({ backendRoles: ['TEACHER'], permissions: [], role: 'teacher' })).toBe('/xem-thu/teacher');
expect(landingPathFor({ backendRoles: ['FACILITY_STAFF'], permissions: [], role: null })).toBeNull();
```

- [ ] **Step 2: Viết test failing cho login và index redirect**

Trong `LoginPage.test.tsx`, dùng `fakeJwt({ userId:'u4', username:'nv', roles:['FACILITY_STAFF'], permissions:['FACILITY_READ','INCIDENT_CREATE'] })`, đăng nhập rồi `await waitFor(() => expect(router.state.location.pathname).toBe('/co-so-vat-chat'))`. Thêm case `roles:['ACADEMIC_STAFF'], permissions:['CLASS_READ']` → `/dao-tao`.

Trong `router.test.tsx`, thêm test: set `backendRoles:['STAFF']`, `permissions:['class.view']`, renderAt `/dao-tao`, đợi `router.state.location.pathname === '/dao-tao/lop-hoc'`.

- [ ] **Step 3: Chạy test để thấy fail**

Run: `$env:PATH='C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64;'+$env:PATH; npx.cmd vitest run src/features/auth/landing.test.ts src/pages/LoginPage/LoginPage.test.tsx src/router.test.tsx`

Expected: FAIL — module `landing` chưa có; login facility vẫn ở `/dang-nhap` với thông báo cũ; index vẫn tới `trang-ca-nhan`.

- [ ] **Step 4: Implement helper và thay 3 nhánh if**

`landing.ts`: thứ tự `SUPER_ADMIN` → `/quan-tri`; owner → `/to-chuc`; nếu `permissions.length === 0` → `role ? rolePreviewPath(role) : null`; nếu `getAcademicMenu(permissions, false, backendRoles).length > 0` → `/dao-tao`; nếu `canAccessFacilityArea` → `/co-so-vat-chat`; cuối cùng `role ? rolePreviewPath(role) : null`. Đặt helper ở file riêng để tránh vòng import `permissions.ts` ↔ `academicMenu.ts`.

`LoginPage.tsx`: thay 3 nhánh if ở `onSuccess` (admin/owner/canAccessAcademicArea) bằng `const to = landingPathFor({ backendRoles: state.backendRoles, permissions: state.permissions, role: state.role })`; nếu `to` thì `navigate(to)`, nếu không thì giữ nguyên `setNotice(...)`. Giữ nguyên bước `mustChangePassword` trước khi tính đích.

`router.tsx`: `AcademicIndexRedirect` gọi `landingPathFor({ backendRoles, permissions, role: null })` rồi `Navigate to={to ?? '/dang-nhap'}` (owner/admin không bao giờ đi qua index này vì đã có đích riêng; nếu có thì vẫn đúng).

- [ ] **Step 5: Chạy lại test**

Run: lệnh Step 3. Expected: PASS, trong đó test cũ “TEACHER không có permission → `/xem-thu/teacher`” và test cũ “vai trò chưa có màn hình → thông báo” vẫn giữ nguyên.

- [ ] **Step 6: Không commit.**

---

### Task 3: Cửa vào facility theo permission (P0) ✅

**Files:**
- Create: `frontend/src/components/FacilityGuard/FacilityGuard.tsx`
- Create: `frontend/src/components/FacilityGuard/FacilityGuard.test.tsx`
- Modify: `frontend/src/features/owner/ownerMenu.ts`
- Modify: `frontend/src/features/owner/ownerMenu.test.ts`
- Modify: `frontend/src/components/OwnerConsoleLayout/OwnerConsoleLayout.tsx`
- Modify: `frontend/src/router.tsx`
- Modify: `frontend/src/router.test.tsx`
- Modify: `frontend/src/pages/RoomsPage/RoomsPage.tsx:559`
- Modify: `frontend/src/pages/RoomsPage/RoomsPage.test.tsx:426`
- Modify: `frontend/src/pages/FacilityIssuesPage/FacilityIssuesPage.tsx:58,200`
- Modify: `frontend/src/pages/FacilityIssuesPage/FacilityIssuesPage.test.tsx:202`

**Interfaces:**
- Consumes: `canAccessFacilityArea()` (Task 1), `ConsoleMenuItem`, `ConsoleShell`, `RoomsPage`, `FacilityIssuesPage`, `linkWithDepartmentId()`.
- Produces:
  - `export const FACILITY_MENU: readonly ConsoleMenuItem[]` với path `/co-so-vat-chat` và `/co-so-vat-chat/su-co`
  - `export function activeFacilityMenuKey(pathname: string): string | null`
  - `export default function FacilityGuard({ children }: PropsWithChildren)`
  - `OwnerConsoleLayoutProps.variant?: 'owner' | 'facility'` (mặc định `'owner'`)

- [ ] **Step 1: Viết test failing cho guard và menu**

`FacilityGuard.test.tsx`: với session authenticated, `[FACILITY_STAFF]` + `['FACILITY_READ']` → render được children; `['CLASS_READ']` → hiện `MSG_S4.NO_PERMISSION`; chưa đăng nhập → `Navigate` tới `/dang-nhap` (dùng `createMemoryRouter`, pattern giữa `AcademicGuard.test.tsx`).

`ownerMenu.test.ts`:

```ts
expect(OWNER_MENU.find((i) => i.key === 'co-so-vat-chat')?.path).toBe('/co-so-vat-chat');
expect(FACILITY_MENU.map((i) => i.path)).toEqual(['/co-so-vat-chat', '/co-so-vat-chat/su-co']);
expect(activeFacilityMenuKey('/co-so-vat-chat')).toBe('co-so-vat-chat');
expect(activeFacilityMenuKey('/co-so-vat-chat/su-co')).toBe('su-co');
```

- [ ] **Step 2: Viết test failing cho URL cũ và link trong trang**

Trong `router.test.tsx`: set session facility (`['FACILITY_STAFF']`, `['FACILITY_READ','INCIDENT_CREATE']`), renderAt `/to-chuc/co-so-vat-chat/su-co?departmentId=d1`, đợi `router.state.location.pathname === '/co-so-vat-chat/su-co'` và `location.search === '?departmentId=d1'`. Thêm case renderAt `/co-so-vat-chat?departmentId=d1` với `permissions:['CLASS_READ']` → hiện `MSG_S4.NO_PERMISSION`.

Trong `RoomsPage.test.tsx` và `FacilityIssuesPage.test.tsx`, đổi kỳ vọng link chéo từ `/to-chuc/co-so-vat-chat…` sang `/co-so-vat-chat…` (giữ encode `departmentId`).

- [ ] **Step 3: Chạy test để thấy fail**

Run: `$env:PATH='C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64;'+$env:PATH; npx.cmd vitest run src/components/FacilityGuard/FacilityGuard.test.tsx src/features/owner/ownerMenu.test.ts src/router.test.tsx src/pages/RoomsPage/RoomsPage.test.tsx src/pages/FacilityIssuesPage/FacilityIssuesPage.test.tsx`

Expected: FAIL — component/export mới chưa có; link vẫn trỏ URL cũ.

- [ ] **Step 4: Implement guard, menu và route**

`FacilityGuard` theo mẫu `AcademicGuard` (unauthenticated → `/dang-nhap`; không thoả → `StatusScreen code="403"` với `MSG_S4.NO_PERMISSION` + nút “Về trang đăng nhập”).

`ownerMenu.ts`: đổi item `co-so-vat-chat` path thành `/co-so-vat-chat`; thêm `FACILITY_MENU` (2 mục, dùng lại `FacilityIcon` và `svgIcon`) và `activeFacilityMenuKey()` nhận diện 2 path trên. Giữ `activeOwnerMenuKey()` cho các path `/to-chuc`.

`OwnerConsoleLayout.tsx`: nhận `variant: 'owner' | 'facility' = 'owner'`; chọn `items`/`selectedKey` theo variant.

`router.tsx`: bỏ 2 children facility khỏi nhóm `/to-chuc`; thêm route cấp cao `co-so-vat-chat` với `element = <FacilityGuard><OwnerConsoleLayout variant="facility" /></FacilityGuard>`, children: index `RoomsPage`, `su-co` `FacilityIssuesPage`. Thêm 2 route redirect tĩnh `to-chuc/co-so-vat-chat` và `to-chuc/co-so-vat-chat/su-co` (component nhỏ đọc `useLocation()` map path + giữ `search`, đặt trước `/to-chuc`). Cập nhật `RoomsPage`/`FacilityIssuesPage` link sang path mới.

- [ ] **Step 5: Chạy lại test**

Run: lệnh Step 3. Expected: PASS; các test cũ của owner menu được cập nhật kỳ vọng path mới.

- [ ] **Step 6: Chạy lint/tsc cho riêng phần này**

Run: `$env:PATH='C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64;'+$env:PATH; npm.cmd run lint; npx.cmd tsc -b --pretty false`

Expected: exit 0.

- [ ] **Step 7: Không commit.**

---

### Task 4: Chi tiết lớp của học sinh (P1) ✅

**Files:**
- Create: `frontend/src/pages/StudentClassDetailPage/StudentClassDetailPage.tsx`
- Create: `frontend/src/pages/StudentClassDetailPage/StudentClassDetailPage.test.tsx`
- Modify: `frontend/src/features/sprint4/sprint4Messages.ts`
- Modify: `frontend/src/pages/StudentMyClassesPage/StudentMyClassesPage.tsx`
- Modify: `frontend/src/pages/StudentMyClassesPage/StudentMyClassesPage.test.tsx`
- Modify: `frontend/src/router.tsx`
- Modify: `frontend/src/router.test.tsx`

**Interfaces:**
- Consumes: `fetchStudentSelfClasses()`, `StudentClass`, `canViewStudentClasses()`, `labelOf()`, `formatPeriod()`, `MSG_SELF`, `AppLink`.
- Produces: route `/dao-tao/hoc-sinh/lop-cua-toi/:id` + default export `StudentClassDetailPage`; 3 message key mới `CLASS_DETAIL_TITLE`, `CLASS_DETAILS`, `CLASS_DETAIL_EMPTY`.

- [ ] **Step 1: Viết test failing cho 5 state của trang mới**

Trong `StudentClassDetailPage.test.tsx`, mock `fetchStudentSelfClasses`, render component trong `MemoryRouter` với `Routes` khai báo `:id` (pattern lấy từ `MyClassStudentsPage.test.tsx`). Assert:

```ts
// forbidden
renderPage(['TEACHER'], ['student.self_view']);
expect(await screen.findByText(MSG_S4.NO_PERMISSION)).toBeInTheDocument();
expect(mockFetch).not.toHaveBeenCalled();

// success — CLASS_1 từ StudentMyClassesPage.test.tsx
expect(await screen.findByText('LOP-01')).toBeInTheDocument();
expect(screen.getByText('Vũ Vân Anh')).toBeInTheDocument();
expect(screen.getByText('Toán')).toBeInTheDocument();

// error + retry, empty (id không có trong danh sách), loading (PageLoading)
```

- [ ] **Step 2: Viết test failing cho link từ danh sách**

Trong `StudentMyClassesPage.test.tsx`, mock resolve `[CLASS_1]`, assert `expect(screen.getByRole('link', { name: 'LOP-01' })).toHaveAttribute('href', '/dao-tao/hoc-sinh/lop-cua-toi/c1')`. Thêm assert trong `router.test.tsx`: renderAt `/dao-tao/hoc-sinh/lop-cua-toi/c1` với session HS + `['student.self_view']` → hiện `MSG_SELF.CLASS_DETAIL_TITLE`.

- [ ] **Step 3: Chạy test để thấy fail**

Run: `$env:PATH='C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64;'+$env:PATH; npx.cmd vitest run src/pages/StudentClassDetailPage/StudentClassDetailPage.test.tsx src/pages/StudentMyClassesPage/StudentMyClassesPage.test.tsx src/router.test.tsx`

Expected: FAIL — component/route/message chưa có.

- [ ] **Step 4: Implement trang và link**

Trang mới: `useQuery({ queryKey:['student-self-classes'], queryFn: fetchStudentSelfClasses, enabled: canView })` rồi `data?.find(item => item.id === id)`; KHÔNG gọi `fetchClassDetail`/`fetchStudents`. Dùng `DetailSection` hiển thị các field `classCode/name/academicYear/startDate–endDate/status/closeState/teacherName/subjectName` (dùng `labelOf`, `formatPeriod`, `—` khi null), `PageHeader`, `AppLink` về `/dao-tao/hoc-sinh/lop-cua-toi`. Gate `canViewStudentClasses({ backendRoles, permissions })`; 5 state theo mẫu `StudentMyClassesPage`.

Thêm 3 key vào `MSG_SELF`. Trong `StudentMyClassesPage`, đổi cột `classCode` thành `<AppLink to={`/dao-tao/hoc-sinh/lop-cua-toi/${row.id}`}>` và sửa comment dòng 42–43 (giờ đã có route chi tiết). Trong `router.tsx`, khai báo route `hoc-sinh/lop-cua-toi/:id` TRƯỚC `hoc-sinh/:id`.

- [ ] **Step 5: Chạy lại test**

Run: lệnh Step 3. Expected: PASS.

- [ ] **Step 6: Không commit.**

---

### Task 5: Mục menu cho buổi bị ảnh hưởng (P1) ✅

**Files:**
- Modify: `frontend/src/features/sprint4/academicMenu.ts`
- Modify: `frontend/src/features/auth/permissions.test.ts`

**Interfaces:**
- Consumes: `getAcademicMenu()`, `activeAcademicMenuKey()` hiện có.
- Produces: menu key mới `impacts`, path `/dao-tao/lich/buoi-bi-anh-huong`.

- [ ] **Step 1: Viết test failing**

Trong `permissions.test.ts` (describe “menu lịch theo quyền schedule.*”), đổi assert cũ và thêm:

```ts
expect(activeAcademicMenuKey('/dao-tao/lich/buoi-bi-anh-huong')).toBe('impacts');
const keys = getAcademicMenu(['schedule.view'], false).map((item) => item.key);
expect(keys).toContain('lich');
expect(keys).toContain('impacts');
expect(getAcademicMenu(['schedule.self_view'], false).map((i) => i.key)).not.toContain('impacts');
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `$env:PATH='C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64;'+$env:PATH; npx.cmd vitest run src/features/auth/permissions.test.ts`

Expected: FAIL — active key trả `'lich'`, menu không có `'impacts'`.

- [ ] **Step 3: Implement menu item và matcher**

Trong `academicMenu.ts`: thêm mục `impacts` ngay sau mục `lich`, hiện khi `isOwner || hasAnyPermissionWithAliases(permissions, ['schedule.view'])`; dùng `MSG_SCHEDULE` hiện có hoặc nhãn `'Buổi bị ảnh hưởng'` theo `handle` của route. Trong `activeAcademicMenuKey()`, kiểm tra `pathname === '/dao-tao/lich/buoi-bi-anh-huong'` hoặc startsWith trước nhánh `/dao-tao/lich`.

- [ ] **Step 4: Chạy lại test**

Run: lệnh Step 2. Expected: PASS.

- [ ] **Step 5: Không commit.**

---

### Task 6: `ClassDetailPage` dùng alias-aware (P1) ✅

**Files:**
- Modify: `frontend/src/pages/ClassDetailPage/ClassDetailPage.tsx:132-136`
- Create: `frontend/src/pages/ClassDetailPage/ClassDetailPage.test.tsx`

**Interfaces:**
- Consumes: `hasAnyPermissionWithAliases()`, `MSG_CLASS`, `fetchClassDetail/fetchStatusLogs/fetchCloseEvents` từ `sprint4Api`.
- Produces: không export mới; 5 biến quyền trong page nhận diện cả mã dotted lẫn legacy.

- [ ] **Step 1: Viết test failing cho nút hành động với token dotted**

Trong test mới, mock 3 fetch trên trả về `[]` / fixture class `status:'DANG_DIEN_RA', closeState:'NONE', version:1`; render qua `MemoryRouter` với route `/lop-hoc/:id`. Assert:

```ts
renderPage(['STAFF'], ['class.view', 'class.assign_teacher']);
expect(await screen.findByRole('button', { name: MSG_CLASS.ASSIGN })).toBeInTheDocument();
renderPage(['STAFF'], ['CLASS_VIEW', 'CLASS_ASSIGN_TEACHER']);
expect(await screen.findByRole('button', { name: MSG_CLASS.ASSIGN })).toBeInTheDocument();
renderPage(['STAFF'], ['class.view']);
expect(screen.queryByRole('button', { name: MSG_CLASS.ASSIGN })).not.toBeInTheDocument();
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `$env:PATH='C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64;'+$env:PATH; npx.cmd vitest run src/pages/ClassDetailPage/ClassDetailPage.test.tsx`

Expected: FAIL — case dotted không hiện nút “Gán giáo viên”.

- [ ] **Step 3: Implement**

Đổi 5 dòng 132–136 từ `hasPermission(permissions, 'CLASS_*')` sang `hasAnyPermissionWithAliases(permissions, ['CLASS_*'])`, bỏ import `hasPermission` nếu không còn dùng.

- [ ] **Step 4: Chạy lại test**

Run: lệnh Step 2. Expected: PASS.

- [ ] **Step 5: Không commit.**

---

## Verification cuối (sau cả 6 task)

- Từ `frontend/`: `$env:PATH='C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64;'+$env:PATH; npx.cmd vitest run` → 0 fail; `npm.cmd run lint` → exit 0; `npx.cmd tsc -b --pretty false` → exit 0.
- Từ root: `git diff --check`, `git rev-parse HEAD`, `git diff --cached --stat` → HEAD vẫn `5a4a286c…`, staged `0`.
- Chạm thử `http://localhost:5173` (không mutate DB) với `demo_owner`/`vyvy`/`demo_student` (`Demo@123456`), đối chiếu thêm tài khoản facility nếu có sẵn; kỳ vọng 0 console error, 0 HTTP ≥400.
