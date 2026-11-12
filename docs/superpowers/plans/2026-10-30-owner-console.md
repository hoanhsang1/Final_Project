# Owner Console (Sprint 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho OWNER một console riêng để quản lý phòng ban, chức vụ (mẫu quyền) và nhân viên, nối đúng vào PeopleService đã có.

**Architecture:** Thêm một nhánh route `/to-chuc` song song với `/quan-tri` (Super Admin). Tách phần khung console dùng chung (Header + Sider/Drawer + skip link) thành `ConsoleShell` để hai console không lệch nhau. Toàn bộ server state đi qua TanStack Query, lớp API riêng `features/owner/ownerApi.ts`, lỗi BE (`{code,message}`) được dịch sang tiếng Việt ở một chỗ.

**Tech Stack:** React 19, TypeScript, Vite 8, Ant Design 5 (token từ `src/theme.ts`), TanStack Query 5, React Router 7, Vitest + RTL.

**Spec:** `D:\Đồ án tốt nghiệp\Tài liệu liên quan dự án\Sprint-van-hanh\Dac-ta\Tài liệu Sprint 3 - MEMS Role, Phòng ban, Nhân viên.md`

## Global Constraints

- Không thêm dependency npm nào. Không Tailwind. Màu/khoảng cách/bo góc chỉ lấy từ `theme.useToken()` hoặc `src/theme.ts` — không hardcode hex/px trong component.
- UI tiếng Việt. Message tiếng Anh từ BE KHÔNG được hiện thẳng cho người dùng; map theo `code` trước, `message` sau.
- Server state chỉ qua TanStack Query. Không copy dữ liệu server vào Zustand.
- WCAG 2.1 AA: mỗi nút thao tác trong bảng có `aria-label` nêu rõ đối tượng; mọi modal có `title`; giữ nguyên skip link của console.
- Không sửa gì trong `D:\Final_Project\backend` — BE là phần của Sang.
- Không commit: repo đang có 2 file sửa dở ngoài phạm vi (`docs/api.md`, `frontend/playwright.config.ts`). Bỏ bước commit trong mọi task.
- Bám convention sẵn có: mỗi page một thư mục `pages/<Name>/` + `use-<name>.ts`; message gom trong một file `*Messages.ts`; query key gom trong `*Keys.ts`.

### Hợp đồng BE đã kiểm chứng (nguồn: `backend/PeopleService`)

| Việc | Endpoint | Body / trả về |
|---|---|---|
| Danh sách phòng ban | `GET /departments` | `DepartmentResponse[]` |
| Tạo / sửa / xoá phòng ban | `POST /departments`, `PUT /departments/{id}`, `DELETE /departments/{id}` | `{name, description}` |
| Nhân viên của phòng ban | `GET /departments/{id}/members` | `MemberResponse[]` |
| Tạo nhân viên | `POST /departments/{id}/members` | vào `{username,email,role,positionIds}` → ra `{member,temporaryPassword,mustChangePassword}` |
| Đổi chức vụ | `PUT /departments/{id}/members/{userId}/positions` | vào `{positionIds}` → ra `MemberResponse` |
| Xoá khỏi phòng ban | `DELETE /departments/{id}/members/{userId}` | 204 |
| Chức vụ | `GET/POST /positions`, `PUT/DELETE /positions/{id}` | `{name,description,permissions[]}` |
| Danh mục quyền | `GET /permissions` | `{code,description}[]` (5 mã) |

Không có `GET /departments/{id}` → màn chi tiết lấy phòng ban từ danh sách đã tải.
Không có `GET /employees`, không có sửa hồ sơ nhân viên, không có khoá tài khoản cho OWNER.

**Lỗi BE (PeopleService `GlobalExceptionHandler`) trả `{code, message}`:**

`DEPARTMENT_NOT_FOUND`, `POSITION_NOT_FOUND`, `MEMBER_NOT_FOUND` (404) · `FORBIDDEN` (403) · `VALIDATION_ERROR`, `UNKNOWN_PERMISSION` (400) · `DEPARTMENT_NOT_EMPTY`, `POSITION_IN_USE`, `ACCOUNT_EXISTS`, `CONFLICT` (409) · `IDENTITY_UNAVAILABLE` (503) · `INTERNAL_ERROR` (500)

## Review Focus

1. **Tạo nhân viên với username/email đã tồn tại** → BE trả 409 `ACCOUNT_EXISTS`, không tạo gì cả. UI phải báo "đã tồn tại" và KHÔNG hiện modal mật khẩu tạm.
2. **Owner chưa tạo chức vụ nào** → form tạo nhân viên bắt buộc `positionIds` nhưng danh sách rỗng. Phải chặn bằng lời giải thích + đường dẫn tới trang Chức vụ, không để người dùng bấm Lưu rồi ăn lỗi 400.
3. **Mở `/to-chuc/phong-ban/:id` với id không thuộc tổ chức (hoặc vừa bị xoá)** → phải hiện màn "không tìm thấy", không quay vô hạn.
4. **Xoá phòng ban còn nhân viên / xoá chức vụ đang được gán** → 409, thông điệp phải nói rõ phải gỡ nhân viên/chức vụ trước.
5. **Owner tự xoá mình khỏi phòng ban** → 403 "Owners cannot remove their own access" → dịch thành câu tiếng Việt riêng, không dùng câu 403 chung.
6. **Mất mật khẩu tạm** → modal chỉ đóng bằng nút xác nhận, có nút sao chép; cảnh báo chỉ hiện một lần.
7. **`/to-chuc` khi chưa đăng nhập hoặc đăng nhập bằng role khác** → chuyển `/dang-nhap` hoặc 403 tại chỗ, không gọi API.

---

### Task 1: Lớp dữ liệu Owner

**Files:**
- Create: `frontend/src/features/owner/types.ts`
- Create: `frontend/src/features/owner/ownerApi.ts`
- Create: `frontend/src/features/owner/ownerKeys.ts`
- Create: `frontend/src/features/owner/ownerMessages.ts`
- Create: `frontend/src/features/owner/permissionLabels.ts`
- Create: `frontend/src/features/owner/ownerApi.test.ts`
- Modify: `frontend/vite.config.ts` (thêm proxy cho 3 tiền tố mới)

**Interfaces:**
- Produces:
  - `Department { id: string; name: string; description: string | null; createdAt: string }`
  - `Position { id: string; name: string; description: string | null; createdAt: string; permissions: string[] }`
  - `Permission { code: string; description: string }`
  - `Member { userId: string; departmentId: string; role: string; appointedBy: string | null; appointedAt: string; positionIds: string[]; permissions: string[] }`
  - `CreatedMember { member: Member; temporaryPassword: string; mustChangePassword: boolean }`
  - `DepartmentPayload { name: string; description?: string }`, `PositionPayload { name: string; description?: string; permissions: string[] }`, `MemberPayload { username: string; email: string; role: 'MANAGER' | 'STAFF'; positionIds: string[] }`
  - `class OwnerApiError extends Error { status: number | null; code: string | null }`
  - `ownerErrorMessage(error: unknown): string`
  - `fetchDepartments/createDepartment/updateDepartment/deleteDepartment`, `fetchPositions/createPosition/updatePosition/deletePosition`, `fetchPermissions`, `fetchMembers/createMember/updateMemberPositions/deleteMember`
  - `ownerKeys = { departments: ['owner','departments'], members: (id) => ['owner','departments',id,'members'], positions: ['owner','positions'], permissions: ['owner','permissions'] }`
  - `MSG_OWNER`, `MSG_DEPT`, `MSG_MEM`, `MSG_POS` (hằng chuỗi, xem Task 5–7)
  - `permissionLabel(code: string): string`

- [ ] **Step 1: Viết test đỏ cho lớp API**

`ownerApi.test.ts` mock `apiClient` giống `features/auth/authApi.test.ts` (`vi.mock('../../lib/api', ...)` với `get/post/put/delete`).

Các ca và khẳng định:
- `fetchDepartments()` → `mockGet` được gọi với `'/departments'`; trả đúng mảng.
- `createDepartment({name:'Khoa CNTT', description:'...'})` → `post('/departments', {name, description})`.
- `updateDepartment('d1', {name:'A'})` → `put('/departments/d1', {name:'A', description: undefined})`.
- `deleteDepartment('d1')` → `delete('/departments/d1')`.
- `fetchPositions()` / `fetchPermissions()` → `'/positions'` / `'/permissions'`.
- `createMember('d1', {username:'a',email:'a@b.c',role:'STAFF',positionIds:['p1']})` → `post('/departments/d1/members', body)`; trả `{member, temporaryPassword, mustChangePassword}`.
- `updateMemberPositions('d1','u1',['p1','p2'])` → `put('/departments/d1/members/u1/positions', { positionIds: ['p1','p2'] })`.
- `deleteMember('d1','u1')` → `delete('/departments/d1/members/u1')`.
- `ownerErrorMessage` map: `{status:409, data:{code:'DEPARTMENT_NOT_EMPTY'}}` → câu "còn nhân viên"; `POSITION_IN_USE` → "đang được gán"; `ACCOUNT_EXISTS` → "đã tồn tại"; `FORBIDDEN` → "không có quyền"; `IDENTITY_UNAVAILABLE` → "hệ thống tài khoản đang không phản hồi"; lỗi mạng (không `response`) → "Không kết nối được máy chủ..."; message tiếng Anh chưa biết → KHÔNG hiện nguyên văn.
- `ownerErrorMessage` nhận cả `OwnerApiError` trực tiếp (đường đi của lỗi đã được bọc).

- [ ] **Step 2: Chạy test để thấy đỏ**

Run: `npm test -- ownerApi` (trong `frontend/`)
Expected: FAIL — không resolve được module `./ownerApi`.

- [ ] **Step 3: Cài đặt**

- `vite.config.ts`: thêm vào cả `server.proxy` và `preview.proxy` ba khoá `'/departments'`, `'/positions'`, `'/permissions'` cùng `target: apiTarget`, `changeOrigin: true`. Ghi comment ngắn: PeopleService phục vụ các path này ở gốc, không nằm dưới `/api`.
- `ownerApi.ts`: mỗi hàm gọi `apiClient` rồi `return res.data`; bọc lỗi qua `toOwnerApiError(error)` đọc `error.response.status` và `error.response.data.code`.
- `ownerErrorMessage` ưu tiên `error.code`, sau đó `error.status`, cuối cùng là câu chung `MSG_OWNER.SAVE_FAILED`. Không bao giờ trả `data.message` khi message là tiếng Anh (kiểm tra bằng danh sách code đã biết).
- `permissionLabels.ts`: map 5 mã — `FACILITY_MANAGE` "Quản lý phòng & thiết bị", `SCHEDULE_CREATE` "Tạo lịch phòng ban", `SCHEDULE_VIEW` "Xem lịch phòng ban", `PEOPLE_VIEW` "Xem nhân viên phòng ban", `PEOPLE_EDIT` "Quản lý nhân viên phòng ban"; mã lạ → trả nguyên mã.

- [ ] **Step 4: Chạy test để thấy xanh**

Run: `npm test -- ownerApi`
Expected: PASS.

---

### Task 2: Tách `ConsoleShell` (khung dùng chung)

**Files:**
- Create: `frontend/src/components/ConsoleShell/ConsoleShell.tsx`
- Create: `frontend/src/components/ConsoleShell/ConsoleShell.test.tsx`
- Modify: `frontend/src/components/ConsoleMenu/ConsoleMenu.tsx` (nhận `items`)
- Modify: `frontend/src/components/AdminConsoleLayout/AdminConsoleLayout.tsx` (uỷ quyền cho `ConsoleShell`)

**Interfaces:**
- Produces: `ConsoleShell({ title, menuAriaLabel, openMenuLabel, logoutLabel, items, selectedKey, onNavigate? })` — render skip link + Header (title, username, nút đăng xuất) + `Sider`/`Drawer` + `<Outlet />` trong `<Content id="noi-dung-chinh">`.
- Produces: `ConsoleMenu({ items, selectedKey, onSelect? })` với `items: readonly ConsoleMenuItem[]`.
- Consumes: `ConsoleMenuItem { key, label, path, exact? }` (đã có trong `features/admin/consoleMenu.ts`).

- [ ] **Step 1: Viết test đỏ**

`ConsoleShell.test.tsx` (dựng trong `ConfigProvider` + `MemoryRouter` với một route con):
- Render 2 mục menu → cả hai nhãn xuất hiện trong `nav` có `aria-label` đúng tham số.
- Mục khớp `selectedKey` có `aria-current="page"`, mục kia không có.
- Nút đăng xuất gọi `logout()` rồi `clearSession()` và điều hướng `/dang-nhap` (mock `features/auth/authApi`).
- Header hiện `username` từ store.

- [ ] **Step 2: Chạy test đỏ**

Run: `npm test -- ConsoleShell`
Expected: FAIL — không resolve `./ConsoleShell`.

- [ ] **Step 3: Cài đặt**

Chuyển nguyên khối `SkipLink`, `MenuIcon`, `SIDEBAR_WIDTH`, `DRAWER_WIDTH`, `MAIN_CONTENT_ID`, `visuallyHidden` từ `AdminConsoleLayout` sang `ConsoleShell` (giữ nguyên comment giải thích). `ConsoleMenu` nhận `items` thay vì import `CONSOLE_MENU`. `AdminConsoleLayout` còn ~30 dòng: gọi `useMediaQuery`, `activeMenuKey`, rồi `<ConsoleShell title={MSG_ADM.TITLE} items={CONSOLE_MENU} ... />`.

- [ ] **Step 4: Chạy test xanh + không vỡ admin**

Run: `npm test -- ConsoleShell router`
Expected: PASS (router test cũ vẫn xanh).

---

### Task 3: `OwnerGuard`

**Files:**
- Create: `frontend/src/components/OwnerGuard/OwnerGuard.tsx`
- Create: `frontend/src/components/OwnerGuard/OwnerGuard.test.tsx`

**Interfaces:**
- Produces: `OwnerGuard({ children })` — chưa đăng nhập → `Navigate to="/dang-nhap"`; `backendRoles` không chứa `OWNER` và không chứa `ORG_OWNER` → `Result status="403"` với `MSG_OWNER.NO_PERMISSION`; còn lại render children.

- [ ] **Step 1: Viết test đỏ**

Ba ca: `isAuthenticated=false` → `router.state.location.pathname === '/dang-nhap'`; `backendRoles=['STAFF']` → thấy chữ "Bạn không có quyền truy cập khu vực quản lý tổ chức."; `backendRoles=['ORG_OWNER','OWNER']` → thấy nội dung con.

- [ ] **Step 2: Chạy test đỏ** — Run: `npm test -- OwnerGuard` → FAIL.

- [ ] **Step 3: Cài đặt** — theo đúng khuôn `AdminGuard.tsx`, chỉ đổi điều kiện role. Comment nêu rõ: BE chặn bằng `@PreAuthorize("hasRole('OWNER')")` trên PeopleService; guard chỉ để UX.

- [ ] **Step 4: Chạy test xanh** — Run: `npm test -- OwnerGuard` → PASS.

---

### Task 4: Menu, layout, route `/to-chuc`, điều hướng sau đăng nhập

**Files:**
- Create: `frontend/src/features/owner/ownerMenu.ts`
- Create: `frontend/src/features/owner/ownerMenu.test.ts`
- Create: `frontend/src/components/OwnerConsoleLayout/OwnerConsoleLayout.tsx`
- Modify: `frontend/src/router.tsx`
- Modify: `frontend/src/pages/LoginPage/LoginPage.tsx`
- Test: `frontend/src/router.test.tsx`, `frontend/src/pages/LoginPage/LoginPage.test.tsx`

**Interfaces:**
- Produces: `OWNER_MENU: readonly ConsoleMenuItem[]` = `[{key:'phong-ban', label:'Phòng ban', path:'/to-chuc', exact:true}, {key:'chuc-vu', label:'Chức vụ', path:'/to-chuc/chuc-vu', exact:true}]`
- Produces: `activeOwnerMenuKey(pathname: string): string | null` — khớp mục `exact`, nếu không thì `pathname.startsWith('/to-chuc/chuc-vu')` → `'chuc-vu'`, `pathname.startsWith('/to-chuc')` → `'phong-ban'`.
- Produces: routes `/to-chuc`, `/to-chuc/phong-ban/:id`, `/to-chuc/chuc-vu` (lazy, dưới `OwnerGuard` + `OwnerConsoleLayout`).

- [ ] **Step 1: Viết test đỏ**

`ownerMenu.test.ts`: `activeOwnerMenuKey('/to-chuc') === 'phong-ban'`; `'/to-chuc/phong-ban/abc' === 'phong-ban'`; `'/to-chuc/chuc-vu' === 'chuc-vu'`; `'/quan-tri' === null`.
`router.test.tsx` thêm: store OWNER + token → `/to-chuc` render tiêu đề "Phòng ban"; OWNER vào `/to-chuc/chuc-vu` render tiêu đề "Chức vụ"; SUPER_ADMIN vào `/to-chuc` thấy 403.
`LoginPage.test.tsx` thêm: login trả `roles: ['OWNER']` → `router.state.location.pathname === '/to-chuc'`.

- [ ] **Step 2: Chạy test đỏ** — Run: `npm test -- ownerMenu router LoginPage` → FAIL.

- [ ] **Step 3: Cài đặt**

- `ownerMenu.ts`: theo khuôn `features/admin/consoleMenu.ts`.
- `OwnerConsoleLayout.tsx`: ~25 dòng, `<ConsoleShell title={MSG_OWNER.TITLE} items={OWNER_MENU} selectedKey={activeOwnerMenuKey(pathname)} menuAriaLabel={MSG_OWNER.MENU_ARIA} openMenuLabel={MSG_OWNER.OPEN_MENU} logoutLabel={MSG_ADM.LOGOUT} />`.
- `router.tsx`: thêm block `path: 'to-chuc'` với `element: <OwnerGuard><OwnerConsoleLayout /></OwnerGuard>`; khai `phong-ban/:id` **sau** `index`, `chuc-vu` trước `phong-ban/:id` để không bị nuốt.
- `LoginPage.tsx`: trước nhánh `state.role`, thêm `if (state.backendRoles.includes('OWNER') || state.backendRoles.includes('ORG_OWNER')) { navigate('/to-chuc'); return; }`.

- [ ] **Step 4: Chạy test xanh** — Run: `npm test -- ownerMenu router LoginPage` → PASS.

---

### Task 5: Màn Phòng ban

**Files:**
- Create: `frontend/src/pages/DepartmentsPage/DepartmentsPage.tsx`
- Create: `frontend/src/pages/DepartmentsPage/use-departments.ts`
- Create: `frontend/src/pages/DepartmentsPage/DepartmentsPage.test.tsx`
- Create: `frontend/src/components/DepartmentFormModal/DepartmentFormModal.tsx`

**Interfaces:**
- Produces: `useDepartmentsPage()` → `{ list, create, update, remove }` (4 mutation TanStack Query, `onSuccess` invalidate `ownerKeys.departments`, `onError` trả message qua `ownerErrorMessage`).
- Produces: `DepartmentFormModal({ open, department, onCancel, onSubmit })` — `onSubmit(values: DepartmentPayload): Promise<void>`; validate tên bắt buộc, ≤200; mô tả ≤1000.
- Consumes: `fetchDepartments/createDepartment/updateDepartment/deleteDepartment`, `MSG_DEPT`, `ownerErrorMessage`.

Màn hình: `Typography.Title level={2}` "Phòng ban" + phụ đề; nút "Thêm phòng ban"; `Table` cột **Tên** (link sang `/to-chuc/phong-ban/:id`), **Mô tả**, **Số nhân viên** (không có API → bỏ cột này, xem ghi chú), **Ngày tạo** (`dayjs(...).format('DD/MM/YYYY')`), **Thao tác** (Sửa, Xoá có `aria-label` kèm tên phòng ban). Trạng thái rỗng dùng antd `Empty` + nút tạo. Lỗi tải dùng `Alert type="error"` + nút "Thử lại" (`refetch`).

- [ ] **Step 1: Viết test đỏ**

- Tải xong 2 phòng ban → thấy "Khoa CNTT", "Phòng Đào tạo".
- Danh sách rỗng → thấy `MSG_DEPT.EMPTY`.
- Bấm "Thêm phòng ban" → modal hiện; bỏ trống tên bấm Lưu → thấy "Vui lòng nhập tên phòng ban", `createDepartment` **không** được gọi.
- Nhập tên, bấm Lưu → `createDepartment` gọi với `{name, description: undefined}`; đóng modal.
- Xoá: bấm nút xoá của dòng "Khoa CNTT" → `Popconfirm` hiện tên phòng ban; xác nhận → `deleteDepartment('d1')`.
- `deleteDepartment` reject `{status:409, code:'DEPARTMENT_NOT_EMPTY'}` → thấy thông điệp "còn nhân viên".
- `fetchDepartments` reject → thấy `Alert` lỗi + nút "Thử lại".

- [ ] **Step 2: Chạy test đỏ** — Run: `npm test -- DepartmentsPage` → FAIL.

- [ ] **Step 3: Cài đặt** — page chia `Form` trong modal; dùng `App.useApp().message` để toast thành công (theo cách các màn S-admin đang dùng, xem `OrganizationDetailPage`).

- [ ] **Step 4: Chạy test xanh** — Run: `npm test -- DepartmentsPage` → PASS.

---

### Task 6: Màn chi tiết phòng ban (nhân viên)

**Files:**
- Create: `frontend/src/pages/DepartmentDetailPage/DepartmentDetailPage.tsx`
- Create: `frontend/src/pages/DepartmentDetailPage/use-department-detail.ts`
- Create: `frontend/src/pages/DepartmentDetailPage/DepartmentDetailPage.test.tsx`
- Create: `frontend/src/components/MemberFormModal/MemberFormModal.tsx`
- Create: `frontend/src/components/MemberPositionsModal/MemberPositionsModal.tsx`
- Create: `frontend/src/components/TempPasswordModal/TempPasswordModal.tsx`

**Interfaces:**
- Produces: `useDepartmentDetail(departmentId: string)` → `{ department: Department | null; isLoading; isMissing; members; positions; create; updatePositions; remove }`.
- Produces: `TempPasswordModal({ open, username, password, onClose })` — `maskClosable={false}`, `closable={false}`, nút "Sao chép" (`navigator.clipboard.writeText`), nút "Tôi đã lưu mật khẩu" gọi `onClose`.
- Produces: `MemberFormModal({ open, positions, onCancel, onSubmit })` — `onSubmit(payload: MemberPayload)`.
- Produces: `MemberPositionsModal({ open, member, positions, onCancel, onSubmit })` — `onSubmit(positionIds: string[])`.

Màn hình: breadcrumb quay lại `/to-chuc`; tiêu đề tên phòng ban + mô tả; khối "Nhân viên" với nút "Thêm nhân viên"; `Table` cột **Mã nhân viên** (`userId`, rút gọn 8 ký tự, `Typography.Text code`), **Vai trò** (`roleLabel()` từ `features/admin/roleLabels.ts`), **Chức vụ** (`Tag` theo tên lấy từ `positionIds`), **Ngày bổ nhiệm**, **Thao tác** (Đổi chức vụ, Xoá khỏi phòng ban). `id` không có trong danh sách phòng ban → `Result status="404"` + nút quay lại.

Ghi chú trong code: `MemberResponse` không có username/email/họ tên nên bảng chỉ hiển thị được `userId` — đây là thiếu sót của BE, không phải lựa chọn của FE.

- [ ] **Step 1: Viết test đỏ**

- 1 nhân viên `role:'MANAGER'`, `positionIds:['p1']` (position "Giáo vụ") → bảng hiện "Quản lý phòng ban" và tag "Giáo vụ".
- `positionIds` rỗng → hiện "Chưa gán chức vụ".
- `id` không tồn tại trong danh sách → `Result` 404, **không** gọi `fetchMembers`.
- Bấm "Thêm nhân viên" → modal; bỏ trống username → validate chặn, không gọi API.
- Submit hợp lệ → modal mật khẩu tạm hiện `temporaryPassword` và câu "chỉ hiện một lần"; bấm "Sao chép" → `navigator.clipboard.writeText` được gọi với đúng chuỗi; nút X của modal không tồn tại (`closable={false}`).
- `createMember` reject `ACCOUNT_EXISTS` → thấy "đã tồn tại", modal mật khẩu **không** hiện.
- Danh sách chức vụ rỗng → modal tạo nhân viên hiện cảnh báo + link `/to-chuc/chuc-vu`, nút Lưu bị disable.
- Đổi chức vụ: modal tick 2 chức vụ → `updateMemberPositions('d1','u1',['p1','p2'])`.
- Xoá: `deleteMember` reject `FORBIDDEN` → thấy câu "Bạn không thể tự xoá quyền truy cập của mình."

- [ ] **Step 2: Chạy test đỏ** — Run: `npm test -- DepartmentDetailPage` → FAIL.

- [ ] **Step 3: Cài đặt** — `useDepartmentDetail` dùng `fetchDepartments()` cho thông tin phòng ban (không có endpoint chi tiết) và `fetchMembers(id)` chỉ khi phòng ban tồn tại.

- [ ] **Step 4: Chạy test xanh** — Run: `npm test -- DepartmentDetailPage` → PASS.

---

### Task 7: Màn Chức vụ

**Files:**
- Create: `frontend/src/pages/PositionsPage/PositionsPage.tsx`
- Create: `frontend/src/pages/PositionsPage/use-positions.ts`
- Create: `frontend/src/pages/PositionsPage/PositionsPage.test.tsx`
- Create: `frontend/src/components/PositionFormModal/PositionFormModal.tsx`

**Interfaces:**
- Produces: `usePositionsPage()` → `{ list, permissions, create, update, remove }`.
- Produces: `PositionFormModal({ open, position, permissions, onCancel, onSubmit })` — `onSubmit(values: PositionPayload)`; `permissions: Permission[]`; checkbox group theo `permissionLabel(code)`, kèm `description` gốc làm trợ giúp.

Màn hình: tiêu đề "Chức vụ" + phụ đề nêu rõ "chức vụ là mẫu quyền, gán cho từng nhân viên"; `Table` cột **Tên**, **Mô tả**, **Quyền** (`Tag` cho từng mã, nhãn tiếng Việt), **Ngày tạo**, **Thao tác** (Sửa, Xoá).

- [ ] **Step 1: Viết test đỏ**

- 1 chức vụ `permissions:['PEOPLE_VIEW','PEOPLE_EDIT']` → hiện tag "Xem nhân viên phòng ban" và "Quản lý nhân viên phòng ban".
- Tạo mới: tick 2 quyền, nhập tên → `createPosition` gọi với `{name, description: undefined, permissions:['PEOPLE_VIEW','PEOPLE_EDIT']}`.
- Không tick quyền nào → validate chặn, không gọi API (BE cho phép tập rỗng nhưng đặc tả yêu cầu chức vụ phải có quyền; giữ ở FE và ghi comment).
- Xoá: reject `POSITION_IN_USE` → thấy "đang được gán cho nhân viên".
- `fetchPermissions` reject → `Alert` lỗi, nút "Thử lại".

- [ ] **Step 2: Chạy test đỏ** — Run: `npm test -- PositionsPage` → FAIL.

- [ ] **Step 3: Cài đặt** — dùng `MSG_POS`, `permissionLabel`.

- [ ] **Step 4: Chạy test xanh** — Run: `npm test -- PositionsPage` → PASS.

---

### Task 8: Kiểm chứng toàn bộ

**Files:** không sửa file nào.

- [ ] **Step 1: Chạy typecheck + build**

Run: `npm run build` (trong `frontend/`)
Expected: `tsc -b` không lỗi, `vite build` xong, không cảnh báo chunk quá lớn mới.

- [ ] **Step 2: Chạy lint**

Run: `npm run lint`
Expected: 0 error. Nếu `eslint-plugin-jsx-a11y` bắt lỗi mới thì sửa, không tắt rule.

- [ ] **Step 3: Chạy toàn bộ test**

Run: `npm test`
Expected: tất cả PASS, gồm 10 file test cũ + 6 file mới.

- [ ] **Step 4: Ghi lại phần chưa kiểm chứng được**

Vào cuối báo cáo, nêu rõ: chưa chạy end-to-end với DB + Gateway thật; chưa xác nhận `OWNER` có trong claim `roles` của JWT thật (suy ra từ `JwtService.generateAccessToken` + `AccessProfile.role()`); proxy mới chỉ đúng khi Gateway chạy ở `127.0.0.1:8080`.
