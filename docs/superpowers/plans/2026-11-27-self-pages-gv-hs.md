# Self pages Giáo viên / Học sinh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (khuyến nghị). Không commit.

**Goal:** Sửa dead-end `/dao-tao` và thêm 6 màn self-only cho TEACHER/STUDENT từ các endpoint `/me` có sẵn.

**Spec:** `docs/superpowers/specs/2026-11-27-self-pages-gv-hs-design.md`

**Tech:** React 19 + TS, Astryx, TanStack Query, Vitest + Testing Library, CSS hiện có. Không dependency mới.

## Global Constraints
- Không commit/push/merge; HEAD `5a4a286c7c097ffc046a04413e23630d9379b975`, staged 0, deleted 0.
- FE-only (`frontend/src`); không đổi BE/contract/gateway/seed/db/build/lint/CI; không copy FE `origin/main`; không dùng “VIP”.
- Giữ Astryx + component dùng chung; chạy thật `http://localhost:5173`.
- Mọi page self phải gate bằng `backendRoles` (vì TEACHER và STUDENT có cùng self-permissions trong JWT).
- Không thêm thao tác ghi; chỉ đọc.

## Commands chung
```powershell
$env:PATH = 'C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64;' + $env:PATH
& 'C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64\npx.cmd' vitest run <file>
& 'C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64\npm.cmd' run lint
& 'C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64\npx.cmd' tsc -b --pretty false
```

---

### Task 1: Contract FE, alias quyền và message

**Files:**
- Modify: `frontend/src/features/sprint4/types.ts`, `frontend/src/features/sprint4/sprint4Api.ts`, `frontend/src/features/sprint4/sprint4Messages.ts`, `frontend/src/features/auth/permissions.ts`, `frontend/src/features/auth/permissions.test.ts`
- Test: `frontend/src/features/sprint4/sprint4Api.self.test.ts` (mới)

**Interfaces:**
- `types.ts`: `TeacherClass` += `needsReassignment?: boolean`, `reassignmentReason?: string | null`. Thêm `StudentClass` với các field `id`, `classCode?`, `name?`, `academicYear?`, `startDate?`, `endDate?`, `status?`, `closeState?`, `teacherName?`, `subjectName?` (đều optional trừ `id`).
- `sprint4Api.ts` export:
  - `fetchTeacherSelf(): Promise<TeacherDetail>` → GET `/api/teachers/me`
  - `fetchTeacherSelfClasses(): Promise<TeacherClass[]>` → GET `/api/teachers/me/classes`
  - `fetchMyClassStudents(classId: string): Promise<StudentListItem[]>` → GET `/api/classes/me/{encodeURIComponent(classId)}/students`
  - `fetchStudentSelf(): Promise<StudentListItem>` → GET `/api/students/me`
  - `fetchStudentSelfClasses(): Promise<StudentClass[]>` → GET `/api/students/me/classes`
  Dùng `request()` có sẵn (để lỗi thành `Sprint4ApiError`); KHÔNG dùng `normalizePaged` (BE trả mảng thuần).
- `sprint4Messages.ts`: thêm `MSG_SELF` với ít nhất `TITLE_HOME`, `HOME_HINT`, `MY_PROFILE`, `MY_CLASSES`, `CLASS_STUDENTS`, `PROFILE_TEACHER`, `PROFILE_STUDENT`, `TEACHER_LOAD_ERROR`, `TEACHER_CLASSES_LOAD_ERROR`, `CLASS_STUDENTS_LOAD_ERROR`, `STUDENT_LOAD_ERROR`, `STUDENT_CLASSES_LOAD_ERROR`, `TEACHER_CLASSES_EMPTY`, `STUDENT_CLASSES_EMPTY`, `CLASS_STUDENTS_EMPTY`, `BACK_TO_CLASSES`, `MY_PROFILE_HINT`, `MY_CLASSES_HINT`, `CLASS_STUDENTS_HINT`, `OPEN_PROFILE`, `OPEN_CLASSES`, `VIEW_STUDENTS`, `RETRY` (dùng `MSG_S4.RETRY` nếu muốn).
- `permissions.ts`:
  - alias: `'class.self_view': 'CLASS_SELF_VIEW'`, `'student.self_view': 'STUDENT_SELF_VIEW'`.
  - `ACADEMIC_AREA_PERMISSIONS` += `'class.self_view'`, `'student.self_view'`.
  - helpers nhận `{ backendRoles: string[]; permissions: string[] }`:
    - `canViewTeacherSelf` = `backendRoles.includes('TEACHER')`.
    - `canViewTeacherClasses` = `backendRoles.includes('TEACHER') && hasAnyPermissionWithAliases(permissions, ['class.self_view'])`.
    - `canViewStudentSelf` = `backendRoles.includes('STUDENT')`.
    - `canViewStudentClasses` = `backendRoles.includes('STUDENT') && hasAnyPermissionWithAliases(permissions, ['student.self_view'])`.
  - Không đổi các helper cũ.
- Tests:
  - `sprint4Api.self.test.ts`: 5 test mock `apiClient.get`, khẳng định URL gọi đúng (kể cả encode classId) và dữ liệu trả về nguyên vẹn; 1 test lỗi 403 → `Sprint4ApiError.status === 403`.
  - `permissions.test.ts`: alias 2 chiều; `class.self_view`/`student.self_view` vào được academic area; 4 helper đúng với JWT mẫu (`roles:['TEACHER']` / `['STUDENT']`, cả hai có cả 2 self-permission) — TEACHER không được coi là student self và ngược lại.

**Steps**
1. [ ] RED: viết test trước, chạy focused → fail.
2. [ ] GREEN: implement types/API/messages/permissions.
3. [ ] Chạy focused + `tsc -b` + eslint file đụng.
4. [ ] Self-review: không endpoint quản lý nào bị gọi; không sửa helper cũ; alias 2 chiều đúng.

---

### Task 2: Route, landing self và menu

**Files:**
- Modify: `frontend/src/router.tsx`, `frontend/src/router.test.tsx`, `frontend/src/features/sprint4/academicMenu.ts`, `frontend/src/features/auth/permissions.test.ts`
- Create: `frontend/src/pages/SelfHomePage/SelfHomePage.tsx`, `frontend/src/pages/SelfHomePage/SelfHomePage.test.tsx`

**Interfaces:**
- `router.tsx`: thêm lazy import cho 6 page mới (khai báo ở Task 3/4 — nếu file chưa tồn tại, Task 2 chỉ thêm `SelfHomePage`; Task 3/4 bổ sung route/page còn lại). Index của `/dao-tao`: component `AcademicIndexRedirect` đọc store → `Navigate to="giao-vien"` nếu `canViewTeachers(isOwner, permissions)`, ngược lại `Navigate to="trang-ca-nhan"`. Thêm route `trang-ca-nhan`.
  - Ruling: để tránh phụ thuộc file chưa tạo, Task 2 **chỉ** thêm route `trang-ca-nhan` + chỉnh index; Task 3 thêm 3 route GV, Task 4 thêm 2 route HS.
- `SelfHomePage`: không gọi API; đọc `backendRoles`; render `PageHeader` + `DetailSection` + danh sách `AppLink` tới: hồ sơ, lớp của tôi, lịch cá nhân (`/dao-tao/lich-cua-toi`). Với TEACHER: hồ sơ `/dao-tao/giao-vien/cua-toi`, lớp `/dao-tao/lop-hoc-cua-toi`; STUDENT: `/dao-tao/hoc-sinh/cua-toi`, `/dao-tao/hoc-sinh/lop-cua-toi`. Nếu role khác → `ForbiddenNotice`. Test: role đúng render đúng 3 link; role sai forbidden; không gọi API.
- `academicMenu.ts`: `getAcademicMenu(permissions, isOwner, backendRoles = [])`; thêm 3 mục key `trang-ca-nhan`, `ho-so-cua-toi`, `lop-cua-toi` theo role và self-permission như spec; cập nhật `AcademicConsoleLayout` truyền `backendRoles` (1 dòng). `activeAcademicMenuKey` nhận diện path mới trước prefix cũ.
- Test trong `permissions.test.ts`: menu TEACHER có đúng key/path; menu STUDENT có đúng key/path; UPPERCASE alias vẫn hoạt động; active key cho 6 path mới.

**Steps**
1. [ ] RED: test menu/router/home trước.
2. [ ] GREEN: implement router + menu + home.
3. [ ] Focused tests `router.test.tsx`, `permissions.test.ts`, `SelfHomePage.test.tsx` + tsc/eslint.
4. [ ] Self-review: OWNER landing không đổi; self-only landing tới trang cá nhân; prefix order đúng.

---

### Task 3: Ba màn self của Giáo viên

**Files (create):** `frontend/src/pages/TeacherSelfPage/`, `frontend/src/pages/TeacherMyClassesPage/`, `frontend/src/pages/MyClassStudentsPage/` (mỗi folder `.tsx` + `.test.tsx`)
**Modify:** `frontend/src/router.tsx` (thêm 3 route), `frontend/src/features/sprint4/academicMenu.ts` nếu cần tinh chỉnh active key.

**Interfaces:**
- `TeacherSelfPage`: gate `canViewTeacherSelf`; queryKey `['teacher-self']`, `fetchTeacherSelf`; 5 state; `DetailSection` hiển thị mã NV, họ tên, email, điện thoại, đơn vị, chuyên môn (Badge), loại hợp đồng, trạng thái dạy (Badge), số lớp, ngày tạo/cập nhật. Không nút sửa.
- `TeacherMyClassesPage`: gate `canViewTeacherClasses`; queryKey `['teacher-self-classes']`; `Table` cột mã lớp, tên lớp, trạng thái (`labelOf`), đóng lớp (`closeLabel` hoặc `—`), cần phân công lại (Badge khi `needsReassignment`); mỗi dòng código `Mã lớp` là `AppLink` tới `/dao-tao/lop-hoc-cua-toi/{id}`. Empty → `MSG_SELF.TEACHER_CLASSES_EMPTY`.
- `MyClassStudentsPage`: gate `canViewTeacherClasses`; lấy `id` từ `useParams`; query `['my-class-students', id]` + query `['teacher-self-classes']` để tìm tên lớp (fallback = id); `Table` cột mã HS, họ tên, email, điện thoại, trạng thái, lớp; có `AppLink` về `/dao-tao/lop-hoc-cua-toi`. Empty → `MSG_SELF.CLASS_STUDENTS_EMPTY`.
- Route khai trước `/giao-vien/:id`.

**Steps**
1. [ ] RED: viết 3 test trước (gate, loading, error+retry, empty, success).
2. [ ] GREEN: implement 3 page + 3 route.
3. [ ] Focused vitest + tsc/eslint.
4. [ ] Self-review: không gọi `/api/teachers` list/detail, `/api/classes/{id}` quản lý; link đúng; heading level đúng (H1 từ PageHeader, H2 từ DetailSection).

---

### Task 4: Hai màn self của Học sinh

**Files (create):** `frontend/src/pages/StudentSelfPage/`, `frontend/src/pages/StudentMyClassesPage/` (mỗi folder `.tsx` + `.test.tsx`)
**Modify:** `frontend/src/router.tsx` (thêm 2 route).

**Interfaces:**
- `StudentSelfPage`: gate `canViewStudentSelf`; queryKey `['student-self']`, `fetchStudentSelf`; 5 state; `DetailSection` hiển thị mã HS, họ tên, ngày sinh, email, điện thoại, trạng thái, lớp hiện tại, tài khoản đăng nhập, ngày tạo/cập nhật.
- `StudentMyClassesPage`: gate `canViewStudentClasses`; queryKey `['student-self-classes']`; `Table` cột mã lớp, tên lớp, năm học, thời gian (start–end), trạng thái, giáo viên, môn học. Empty → `MSG_SELF.STUDENT_CLASSES_EMPTY`.
- Route `/dao-tao/hoc-sinh/cua-toi` và `/dao-tao/hoc-sinh/lop-cua-toi` khai trước `/hoc-sinh/:id`.

**Steps**
1. [ ] RED test → GREEN page + route.
2. [ ] Focused vitest + tsc/eslint.
3. [ ] Self-review: không gọi endpoint quản lý; permission fallback không làm STUDENT thấy page GV.

---

### Task 5: Verify toàn bộ + chụp màn hình thật

**Files:** modify `docs/trang-thai-hien-tai-2026-11-26.md` đúng 1 dòng; create script mới `C:\Users\night\AppData\Local\Temp\opencode\be-runtime\capture-self-pages.mjs`. Không sửa source app.

**Steps**
1. [ ] Chạy `vitest run` full, `npm run lint`, `npx tsc -b --pretty false`, `git diff --check`; ghi exit code/đếm.
2. [ ] Script Playwright (`channel:'chrome'`, headless, viewport 1440×960, `http://localhost:5173`):
   - `vyvy` → chụp landing `/dao-tao` (assert URL `/dao-tao/trang-ca-nhan`), `/dao-tao/giao-vien/cua-toi`, `/dao-tao/lop-hoc-cua-toi`, `/dao-tao/lop-hoc-cua-toi/9f05ed1c-f41d-4c56-8870-2817ef7103bc`.
   - `demo_student` → landing, `/dao-tao/hoc-sinh/cua-toi`, `/dao-tao/hoc-sinh/lop-cua-toi`.
   - Tên file `08`–`13` theo thứ tự liệt kê ở trên; log console error/HTTP>=400/pageerror; assert heading H1 đúng từng màn và không có `ForbiddenNotice`.
3. [ ] Kiểm tra git invariant.
4. [ ] Thêm 1 dòng vào docs trạng thái; viết report `.superpowers/sdd/2026-11-27-self-pages-gv-hs/task-5-report.md`.

---

## Review package
Vì không commit: snapshot `frontend/src` trước mỗi task vào `.superpowers/sdd/2026-11-27-self-pages-gv-hs/snap-task-N/src`; review qua `git -c core.autocrlf=false diff --no-index` giữa snapshot và working tree. Final review dùng snapshot Task 1 làm base.
