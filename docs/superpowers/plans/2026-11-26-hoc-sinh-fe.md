# Màn Quản lý học sinh (FE) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm danh sách + màn hồ sơ `/dao-tao/hoc-sinh[/:id]` với CRUD cơ bản, gọi BE People thật qua gateway.

**Architecture:** Sát mẫu Sprint 4: type/API/message trong `features/sprint4`, màn dùng `PageHeader`/`Table`/`Dialog`/`useTablePagination` của Astryx, query/mutation inline. Gateway thêm route `/api/students` (`StripPrefix=1`), docker truyền `PEOPLE_SERVICE_URL`.

**Tech Stack:** React 19 + TypeScript + Vite + TanStack Query + Zustand + `@astryxdesign/core` 0.7.16 + Axios + Vitest/RTL.

**Spec:** `frontend/docs/superpowers/specs/2026-11-26-hoc-sinh-fe-design.md` (bản cập nhật hồ sơ, chờ duyệt 26/11/2026).

**Execution method đã chọn:** Subagent-driven (người dùng chọn 26/11/2026).

## Global Constraints

- **Không commit / push / merge.** HEAD vẫn `5a4a286`, working tree chỉ `M`/`??`.
- Chỉ Astryx; không antd/Tailwind/shadcn; không thêm dependency; không đổi build/lint/CI.
- Form `useFormState` (type alias, không `interface`); thông báo `useNotify`.
- Giữ 5 trạng thái danh sách và trạng thái loading/error/404 của hồ sơ; không bỏ live-region a11y.
- **Không sửa** `frontend/e2e/*.spec.ts`, không đụng worktree FE shell, không đụng `07_people_department_access.sql`.
- BE dùng `student.view`; FE dùng `STUDENT_*`; thử bằng `OWNER`; không sửa BE authority.
- Không bịa `gender`/`version`/lịch sử thay đổi/lớp quá khứ — BE/DB chưa có.
- `npm`/`npx` không có PATH. Dùng `node = D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe` với entry point trong `frontend/node_modules`, chạy từ `frontend`.

## Review Focus

- Mã học sinh để trống lúc tạo → FE không gửi `studentCode` (BE tự sinh); test payload Task 2.
- `status` truyền giá trị lạ → FE chỉ gửi `active|inactive|suspended`; test options/params Task 2.
- Không quyền → ẩn filter/cột thao tác và **không gọi API**; test Task 2 & 3.
- Hồ sơ không tồn tại / lỗi 500 → hiện thông báo phù hợp, không crash; test Task 3.
- Bấm Huỷ khi xác nhận xoá → không gọi `deleteStudent`; test Task 2.

---

### Task 1: Contract API + cấu hình gateway/docker

**Files:**
- Modify: `frontend/src/features/sprint4/types.ts`
- Modify: `frontend/src/features/sprint4/sprint4Api.ts`
- Modify: `frontend/src/features/sprint4/sprint4Messages.ts`
- Modify: `backend/APIGateway/src/main/resources/application.yml`
- Modify: `docker-compose.yml`
- Test: `frontend/src/features/sprint4/studentApi.test.ts` (tạo mới)

**Interfaces:**
- Consumes: `apiClient` (`frontend/src/lib/api.ts`), `request<T>()`, `normalizePaged<T>()`, `PagedResponse<T>` có sẵn.
- Produces (tên/kiểu cố định cho các task sau):
  - `StudentListItem`: `{ id, studentCode, fullName, dateOfBirth: string|null, email: string|null, phone: string|null, status: 'active'|'inactive'|'suspended', classId: string|null, classCode: string|null, className: string|null, accountUsername: string|null, accountCreatedAt: string|null, createdAt: string, updatedAt: string }`
  - `StudentListQuery`: `{ page: number; size: number; q?: string; status?: string; classId?: string }`
  - `StudentCreatePayload`: `{ studentCode?: string; fullName: string; dateOfBirth?: string|null; email?: string|null; phone?: string|null; status?: string }`
  - `StudentUpdatePayload = Omit<StudentCreatePayload, 'studentCode'>`
  - `fetchStudents(query): Promise<PagedResponse<StudentListItem>>`
  - `fetchStudent(id: string): Promise<StudentListItem>` (map từ `StudentResponse`)
  - `createStudent(payload): Promise<StudentListItem>`
  - `updateStudent(id, payload): Promise<StudentListItem>`
  - `deleteStudent(id): Promise<void>`
  - `MSG_STUDENT` keys: `TITLE`, `DETAIL_TITLE`, `EMPTY`, `SEARCH`, `STATUS_ALL`, `PAGINATION_LABEL`, `CREATE`, `EDIT`, `DELETE`, `DELETE_CONFIRM`, `TOTAL`, `NO_CLASS`, `NO_ACCOUNT`, `BACK`, `CREATED_AT`, `UPDATED_AT`, `PROFILE`, `CURRENT_CLASS`, `ACCOUNT`.

- [ ] **Step 1: Viết test lỗi cho API**

Tạo `studentApi.test.ts`, mock `apiClient.get/post/put/delete` bằng `vi.fn()`; 5 test:
  - `fetchStudents({page:1,size:20,q:'An',status:'active'})` → gọi `/api/students` đúng params, trả `{items,total:1,page:1,size:20,pages:1}`.
  - `fetchStudent('s-1')` → gọi `/api/students/s-1`, trả object có `studentCode`, `fullName`, `className`, `accountUsername`.
  - `createStudent({fullName:'Nguyễn Văn A'})` → gọi `post('/api/students', body)`.
  - `updateStudent('s-1', {fullName:'B'})` → gọi `put('/api/students/s-1', body)`.
  - `deleteStudent('s-1')` → gọi `delete('/api/students/s-1')`.

- [ ] **Step 2: Chạy test, xác nhận fail**

```powershell
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' 'D:\Final_Project\frontend\node_modules\vitest\vitest.mjs' run src/features/sprint4/studentApi.test.ts
```
Expected: FAIL (exports chưa tồn tại).

- [ ] **Step 3: Thêm type + hàm API + message**

Đúng signature ở Interfaces. `fetchStudents` phải `.then(normalizePaged<StudentListItem>)`; `fetchStudent` map fields từ `StudentResponse` sang `StudentListItem` (các field ngày giữ dạng ISO string hoặc `null`). Giữ `CODE_MESSAGES` cũ, chỉ thêm code nếu BE trả code mới.

- [ ] **Step 4: Thêm route gateway + env**

`application.yml`: thêm `people-students` cạnh `people-classes`, `uri: ${PEOPLE_SERVICE_URL:http://localhost:8082}`, `Path=/api/students/**,/api/students`, `StripPrefix=1`. `docker-compose.yml`: thêm `PEOPLE_SERVICE_URL: http://people-service:8082` vào `environment` của `api-gateway`. Không sửa chỗ khác.

- [ ] **Step 5: Verify task**

```powershell
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' 'D:\Final_Project\frontend\node_modules\vitest\vitest.mjs' run src/features/sprint4/studentApi.test.ts
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' 'D:\Final_Project\frontend\node_modules\typescript\bin\tsc' -b --pretty false
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' 'D:\Final_Project\frontend\node_modules\eslint\bin\eslint.js' src/features/sprint4
git status --short
```
Expected: 3 lệnh đầu EXIT 0; `git status` có `M`/`??`, không có `D`, không commit. Gateway/docker không build được (thiếu JDK) — chỉ đối chiếu bằng đọc file.

---

### Task 2: Danh sách Học sinh + quyền + menu + route

**Files:**
- Modify: `frontend/src/features/auth/permissions.ts`
- Modify: `frontend/src/features/sprint4/academicMenu.ts`
- Modify: `frontend/src/router.tsx`
- Create: `frontend/src/pages/StudentsPage/StudentsPage.tsx`
- Test: `frontend/src/pages/StudentsPage/StudentsPage.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`fetchStudents`, `createStudent`, `updateStudent`, `deleteStudent`, `StudentListItem`, `MSG_STUDENT`), `PageHeader`, `EmptyState`, `ForbiddenNotice`, `PageLoading`, `useFormState`, `useNotify`.
- Produces:
  - `canViewStudents`, `canEditStudents`: `(state:{backendRoles: string[]; permissions: string[]}) => boolean`.
  - Menu item key `hoc-sinh`, path `/dao-tao/hoc-sinh`.
  - Route `dao-tao/hoc-sinh`, `handle.title = 'Học sinh'`.
  - `StudentsPage` không nhận props; mã học sinh là `AppLink` tới `/dao-tao/hoc-sinh/:id`.

- [ ] **Step 1: Viết test lỗi cho 5 trạng thái + quyền**

Harness như `ClassesPage.test.tsx`: `QueryClientProvider` (`retry:false`) + `MemoryRouter`, mock API bằng `vi.mock(..., async importOriginal => ({...actual, ...}))`. Test: loading, success (có mã/họ tên/tổng), empty, error + bấm “Thử lại” gọi 2 lần, không quyền → `ForbiddenNotice` và `fetchStudents` không gọi.

- [ ] **Step 2: Chạy test, xác nhận fail** (lệnh như Task 1 Step 2 nhưng trỏ `StudentsPage.test.tsx`).

- [ ] **Step 3: Viết màn + quyền + menu + route**

Copy cấu trúc `ClassesPage`; thêm Dialog tạo/sửa và Dialog xác nhận xoá như `TeachersPage`. Đúng spec: lọc `q` + `status` (3 giá trị), không filter `classId`; cột thao tác chỉ khi `canEditStudents`; form type là `type` alias; payload tạo bỏ `studentCode` khi trống; sau mutation `invalidateQueries({queryKey:['students']})`. Thêm `STUDENT_*` vào allow-list, `canViewStudents`/`canEditStudents`, item menu, route. Chưa tạo `StudentDetailPage` (Task 3), nhưng AppLink có thể trỏ tới path đó.

- [ ] **Step 4: Bổ sung test tương tác**

Trong `StudentsPage.test.tsx`: gõ `q` + Enter → `fetchStudents` gọi với q đúng; chọn status → params `status:'active'`; mở Dialog tạo, bỏ trống `fullName` → lỗi trong `within(screen.getByRole('dialog'))`, không gọi API; submit hợp lệ → payload không có `studentCode`; bấm Xoá → Huỷ thì không gọi API, Xác nhận thì gọi 1 lần.

- [ ] **Step 5: Verify task**

```powershell
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' 'D:\Final_Project\frontend\node_modules\vitest\vitest.mjs' run src/pages/StudentsPage/StudentsPage.test.tsx
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' 'D:\Final_Project\frontend\node_modules\typescript\bin\tsc' -b --pretty false
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' 'D:\Final_Project\frontend\node_modules\eslint\bin\eslint.js' src/pages/StudentsPage src/router.tsx
```
Expected: pass/EXIT 0; không commit.

---

### Task 3: Màn hồ sơ học sinh `/hoc-sinh/:id`

**Files:**
- Modify: `frontend/src/router.tsx` (thêm route con `hoc-sinh/:id`)
- Create: `frontend/src/pages/StudentDetailPage/StudentDetailPage.tsx`
- Test: `frontend/src/pages/StudentDetailPage/StudentDetailPage.test.tsx`

**Interfaces:**
- Consumes: `fetchStudent`, `updateStudent`, `StudentListItem`, `MSG_STUDENT`, `canEditStudents`, `useFormState`, `useNotify`, `PageHeader`.
- Produces: `StudentDetailPage` đọc `id` từ `useParams`; route `dao-tao/hoc-sinh/:id` với `handle.title = 'Hồ sơ học sinh'`.

- [ ] **Step 1: Viết test lỗi cho hồ sơ**

Test với `MemoryRouter` khởi tạo tại `/dao-tao/hoc-sinh/s-1`, mock `fetchStudent`:
  - loading → `PageLoading`;
  - success → hiện mã (chỉ đọc), họ tên, ngày sinh, email, phone, trạng thái, `classCode/className`, `accountUsername`, ngày tạo/cập nhật;
  - không có lớp/tài khoản → hiện `MSG_STUDENT.NO_CLASS` / `NO_ACCOUNT`;
  - `fetchStudent` reject 404/500 → Banner lỗi + “Về danh sách”;
  - không quyền sửa → **không** có nút “Sửa hồ sơ”; có quyền → mở Dialog, gọi `updateStudent(id, payload)` và invalidates.

- [ ] **Step 2: Chạy test, xác nhận fail** (trỏ `StudentDetailPage.test.tsx`).

- [ ] **Step 3: Viết trang hồ sơ + route**

Dùng `useQuery({queryKey:['students', id], queryFn:()=>fetchStudent(id!)})`; render 3 nhóm đúng spec; `PageHeader` có nút quay lại danh sách + nút Sửa (điều kiện `canEditStudents`). Form sửa dùng chung payload `StudentUpdatePayload`, type alias cho `useFormState`. **Không** hiện `gender`, `version`, lịch sử thay đổi, danh sách lớp quá khứ. Thêm route `hoc-sinh/:id` vào `router.tsx`.

- [ ] **Step 4: Verify task**

```powershell
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' 'D:\Final_Project\frontend\node_modules\vitest\vitest.mjs' run src/pages/StudentDetailPage/StudentDetailPage.test.tsx
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' 'D:\Final_Project\frontend\node_modules\typescript\bin\tsc' -b --pretty false
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' 'D:\Final_Project\frontend\node_modules\eslint\bin\eslint.js' src/pages/StudentDetailPage src/router.tsx
```
Expected: pass/EXIT 0; không commit.

---

### Task 4: Kiểm chứng toàn bộ & cập nhật trạng thái

**Files:**
- Modify: `docs/trang-thai-hien-tai-2026-11-26.md`
- Modify: `frontend/docs/superpowers/specs/2026-11-26-hoc-sinh-fe-design.md` (banner → “đã triển khai, chưa commit”)

**Interfaces:** Consumes: kết quả Task 1–3.

- [ ] **Step 1: Chạy full kiểm chứng**

```powershell
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' 'D:\Final_Project\frontend\node_modules\vitest\vitest.mjs' run
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' 'D:\Final_Project\frontend\node_modules\typescript\bin\tsc' -b --pretty false
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' 'D:\Final_Project\frontend\node_modules\eslint\bin\eslint.js' .
```
Expected: `vitest run` pass, `tsc`/`eslint` EXIT 0. Không chạy/sửa E2E.

- [ ] **Step 2: Cập nhật status doc + banner spec**

Status doc: thêm dòng màn danh sách + hồ sơ đã có code trong repo chính, kiểm chứng sạch; gateway/docker đã đổi nhưng **chưa smoke test BE** (thiếu JDK); nêu rõ `gender`/`version`/lịch sử vẫn chờ BE. Spec: đổi `**Trạng thái: chờ duyệt bản cập nhật.**` thành `**Trạng thái: đã duyệt và triển khai 26/11/2026; chưa commit.**`.

- [ ] **Step 3: Kiểm tra working tree**

```powershell
git status --short
git rev-parse --short HEAD
git diff --stat
```
Expected: HEAD `5a4a286`; chỉ `M`/`??`; **0 file bị xoá**; không commit/push/merge.
