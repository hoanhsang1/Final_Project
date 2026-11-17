# Báo cáo triển khai Lớp học & Môn học (C-7, D-8)

- Nhánh: `fixFlowCreateEmployee`
- HEAD khi viết báo cáo: `fe18018e6ac26536b9550252985cb4dc3d0c443c`
- Phạm vi: quản lý lớp học (đã có backend, bổ sung FE + phân quyền), quản lý môn học
  (backend CRUD + FE + permission + migration 42)
- Trạng thái tổng hợp: **SOURCE_FIXED** — đã sửa trong mã nguồn và kiểm thử tự động.
  **LIVE_PENDING** — chưa chạy migration 41/42 trên database thật, chưa deploy ảnh mới,
  chưa kiểm thử API thật. Không có mục nào được đánh dấu `FIXED`/`LIVE_VERIFIED`.

## 1. Lớp học (C-7)

### 1.1. Hiện trạng backend (không cần viết mới)

`SchoolClassController` đã có đủ endpoint; rà soát xác nhận quyền tách rời theo từng
hành động, không dựa vào tên role:

| Hành động | Endpoint | Permission |
|---|---|---|
| Danh sách | `GET /classes` | `OWNER` hoặc `class.view` |
| Chi tiết | `GET /classes/{id}` | `OWNER` hoặc `class.view` |
| Lớp của tôi | `GET /classes/me` | `OWNER` hoặc `class.self_view`/`class.view` |
| Sinh viên lớp của tôi | `GET /classes/me/{id}/students` | `OWNER` hoặc `class.self_view`/`class.view` |
| Tạo | `POST /classes` | `OWNER` hoặc `class.create` |
| Sửa | `PUT /classes/{id}` | `OWNER` hoặc `class.edit` |
| Xoá | `DELETE /classes/{id}` | `OWNER` hoặc `class.delete` |
| Gán giáo viên | `PUT /classes/{id}/teacher` | `OWNER` hoặc `class.assign_teacher` |
| Phân công lại | `PUT /classes/{id}/teacher/reassign` | `OWNER` hoặc `class.teacher.reassign` |
| Thêm sinh viên | `PUT /classes/{id}/students/{studentId}` | `OWNER` hoặc `class.edit` |
| Bỏ sinh viên | `DELETE /classes/{id}/students/{studentId}` | `OWNER` hoặc `class.edit` |
| Gán môn học | nằm trong `POST /classes` và `PUT /classes/{id}` (`subjectId`) | `class.create` / `class.edit` |

Quy tắc nghiệp vụ đã có trong `SchoolClassService`:

- Trùng mã lớp: `repository.checkClassCodeAvailable(...)` → lỗi trùng mã.
- Ngày: `validateDates(...)` từ chối `endDate < startDate`.
- Xoá: `SchoolClassRepository.delete(...)` đếm `class_student`, nếu còn sinh viên trả
  `CLASS_NOT_EMPTY`; nếu hợp lệ thì soft-delete (`deleted_at`), không xoá cứng.
- Môn học: `subjectRepository.nullableActive(subjectId, orgId)` chỉ chấp nhận môn còn
  `is_active=TRUE` và đúng `org_id`; `subject_id` được ghi/đọc cùng lớp.
- Module: mọi thao tác đọc dùng `requireModuleReadable`, ghi dùng `requireModule`
  cho `STUDENT_MANAGEMENT`; phạm vi phòng ban của người chỉ có `class.view` DEPARTMENT
  được lọc ở `classViewDepartments()`.

### 1.2. Phần đã sửa ở Frontend

Vấn đề: route/menu của lớp học chỉ gate `class.view`. Người có `class.create` nhưng
không có `class.view` bị chặn khỏi trang, dù backend cho phép tạo.

- `frontend/src/lib/nav.ts`: mục "Lớp học" dùng `[PERM.classView, PERM.classCreate]`.
- `frontend/src/app/app.tsx`: route `/dao-tao/lop-hoc` dùng
  `PermissionGuard anyOf={[PERM.classView, PERM.classCreate]}`.
- `frontend/src/features/academic/pages/classes-page.tsx`:
  - `useClasses({...}, canView)` — không gọi `GET /classes` khi không có `class.view`.
  - Khi `!canView`: chỉ hiện nút "Tạo lớp" nếu có `class.create`, kèm thông báo
    "Chỉ có quyền tạo lớp"; không đọc danh sách/chi tiết trái phép.
  - Tạo lớp thành công: hiện Alert "Đã tạo lớp học" với mã + tên lớp vừa tạo
    (`onCreated`), không cần quyền đọc danh sách.
  - `ClassFormDialog` nhận `onCreated?: (created: SchoolClass) => void`.
  - Nút Sửa/Xoá/Gán giáo viên/Duyệt trong trang chi tiết tiếp tục gate độc lập bằng
    `class.edit`, `class.delete`, `class.assign_teacher`, `class.teacher.reassign`,
    `class.approve_close`... (đã có từ trước, không đổi).

### 1.3. Kiểm thử lớp học

- `frontend/src/features/academic/pages/classes-page.test.tsx` (mới):
  - Chỉ có `class.create` (role `STAFF`, không có `class.view`): thấy thông báo
    "Chỉ có quyền tạo lớp", `classesApi.list` **không** được gọi, tạo lớp thành công
    hiện "LH-10A2 · Lớp 10A2", danh sách vẫn không bị gọi.
  - OWNER có `class.view`: hiện danh sách lớp.
  - 2 test pass.
- Backend: logic trùng mã/ngày/xoá-khi-còn-sinh-viên/môn-học đã có; test repository
  của môn học bao phủ `classUsage` (đếm lớp chưa xoá).

## 2. Môn học (D-8)

### 2.1. Trước khi sửa

- Chỉ có `GET /api/subjects` (đọc), không có CRUD/status.
- Nav gate bằng `subject.view` — mã chưa tồn tại trong `PermissionCatalog`, nên menu
  bị ẩn oan (RC-6 trong `docs/role-function-matrix.md`).
- Bảng `subject` thiếu `code`, `description`, `updated_by`, `updated_at`; chưa có
  unique `(org_id, code)` và index theo `(org_id, is_active)`.

### 2.2. Backend

`backend/PeopleService/src/main/java/com/mems/controller/SubjectController.java`

| Method | Endpoint | Quyền |
|---|---|---|
| GET | `/subjects?q=&includeInactive=` | `OWNER` hoặc `subject.view`/`subject.manage` + các mã đọc lớp/sinh viên phục vụ form lớp |
| GET | `/subjects/{id}` | như trên |
| POST | `/subjects` | `OWNER` hoặc `subject.manage` |
| PUT | `/subjects/{id}` | `OWNER` hoặc `subject.manage` |
| PATCH | `/subjects/{id}/status` | `OWNER` hoặc `subject.manage` |

- `includeInactive=true` chỉ dành cho `OWNER`/`subject.manage`; người chỉ có
  `subject.view` luôn chỉ thấy môn đang dùng.
- Module: `STUDENT_MANAGEMENT` (đọc: `requireModuleReadable`, ghi: `requireModule`).
- Ghi audit: `SUBJECT_CREATED`, `SUBJECT_UPDATED`, `SUBJECT_STATUS_CHANGED`.
- `SubjectRepository`:
  - Tạo/sửa/xoá mềm theo trạng thái (`is_active`), luôn lọc `org_id`.
  - Tìm kiếm không dấu qua `name_unaccented`.
  - Trùng mã: bắt lỗi unique `uq_subject_org_code` → thông báo lỗi "Mã môn học".
  - Trùng tên: unique `(org_id, name_unaccented)` theo từng tổ chức.
  - `classUsage` đếm lớp `deleted_at IS NULL` đang dùng môn (để quyết định ngừng dùng
    thay vì xoá).
- Không thêm endpoint DELETE: nghiệp vụ ưu tiên ngừng dùng (`PATCH .../status`) để
  không phá lớp đang tham chiếu.

### 2.3. Đồng bộ permission/scope

| Nơi | Thay đổi |
|---|---|
| `Identity PermissionCatalog` | thêm `subject.view`, `subject.manage` (`orgOnly`, module `STUDENT_MANAGEMENT`) |
| Bundle `ACADEMIC_MANAGEMENT` | thêm 2 mã trên |
| `DefaultPositionSeeder` | "Quản trị viên tổ chức" + "Giáo vụ" nhận `subject.view`, `subject.manage` |
| `@PreAuthorize` | `SubjectController` dùng đúng 2 mã trên |
| FE `PERM` | đã có `subjectView`, `subjectManage` (trước đó gate vào mã không tồn tại) |
| FE nav/route | `[subject.view, subject.manage]` (anyOf) |
| Migration 42 | đăng ký `permission`, gắn bundle, gắn role `OWNER/ORG_OWNER/SUPER_ADMIN`, backfill chức vụ ORGANIZATION đã có `class.view`/`class.create` |

### 2.4. Frontend

- `features/academic/types.ts`: `Subject` + `SubjectInput`.
- `features/academic/api.ts`: `subjectsApi.list/byId/create/update/setActive`.
- `features/academic/hooks.ts`: `useSubjects({q, includeInactive})`, key
  `['subjects', params]`; `useSubjectMutations()` invalidate `['subjects']` + `['classes']`.
- `features/academic/pages/subjects-page.tsx` (viết lại):
  - Tìm kiếm (debounce qua `useDeferredValue`), bảng: tên + mã, mô tả, trạng thái
    ("Đang dùng"/"Ngừng dùng"), cập nhật.
  - Tạo/sửa bằng dialog; validate tên bắt buộc ("Vui lòng nhập tên môn học.").
  - Ngừng dùng/kích hoạt có ConfirmDialog; toast thành công/thất bại.
  - Nút ghi chỉ hiện khi `canManage` **và** module `STUDENT_MANAGEMENT` đang `active`
    (`canWriteModule`), tránh bấm vào rồi bị backend chặn.
  - Khi module `disabled`/`locked`: hiện Alert "chế độ chỉ đọc"; dữ liệu vẫn xem được.
  - Ô "Hiện cả môn ngừng dùng" chỉ hiện với người có `subject.manage`.
  - Trạng thái loading/empty/error dùng component chung (`Spinner`, `EmptyState`,
    `ErrorState`).
- `lib/nav.ts` + `app.tsx`: gate `anyOf [subject.view, subject.manage]`.

### 2.5. Kiểm thử môn học

- `backend/PeopleService/src/test/java/com/mems/repository/SubjectRepositoryTest.java`
  (mới, 8 test): tạo trả đủ trường; list ẩn môn ngừng dùng trừ khi `includeInactive`;
  tìm không dấu; trùng mã bị từ chối; trùng tên theo org; update đổi trường + set
  `updated_at`; org khác không thấy; `classUsage` chỉ đếm lớp chưa xoá.
- `frontend/src/features/academic/pages/subjects-page.test.tsx` (mới, 7 test):
  hiển thị danh sách; tạo + refetch; chặn tên rỗng; ngừng dùng qua ConfirmDialog;
  `includeInactive` gọi đúng `{q: undefined, includeInactive: true}`; chỉ có
  `subject.view` thì ẩn toàn bộ nút ghi; module `disabled` hiện "chế độ chỉ đọc".

## 3. Migration

### 3.1. Migration 42 — `42_people_subject_management.sql`

- `mems_people_db`: thêm cột `subject.code`, `subject.description`, `subject.updated_by`,
  `subject.updated_at`; index `uq_subject_org_code (org_id, code)`,
  `idx_subject_org_active (org_id, is_active)`. Tất cả NULL-able/additive.
- Backfill `position_permission`: chức vụ ORGANIZATION đã có `class.view` → thêm
  `subject.view`; đã có `class.create` → thêm `subject.manage`; chỉ chèn khi thiếu.
- `mems_identity_db`: upsert `permission` 2 mã; gắn bundle `ACADEMIC_MANAGEMENT`;
  gắn role `OWNER`, `ORG_OWNER`, `SUPER_ADMIN`.
- Idempotent (procedure kiểm tra `information_schema`, `ON DUPLICATE KEY`), không
  xoá dữ liệu.

### 3.2. Migration 41 — `41_people_head_employee_view_backfill.sql`

- Backfill `employee.view` cho chức vụ tên "Trưởng phòng ban" scope `DEPARTMENT`.
- `mems_identity_db`: `employee.view` cho phép `DEPARTMENT,ORGANIZATION`.
- Chỉ chèn khi thiếu; không cấp create/edit/delete; không đổi scope.

### 3.3. Thứ tự chạy và ràng buộc deploy

1. Chạy `41`, rồi `42`, rồi `37`, `40` (script `scripts/apply-live-migrations.bat`
   đã cập nhật đúng thứ tự 15 file).
2. **Bắt buộc chạy 42 trước khi deploy ảnh People mới.** `SubjectRepository` mới
   SELECT `code, description, updated_at`; nếu ảnh mới chạy trên schema cũ, mọi API
   môn học (và danh sách lớp do JOIN `subject`) sẽ lỗi `Unknown column`.
3. Ảnh cũ chạy trên schema mới vẫn an toàn vì cột mới NULL-able.

Trạng thái migration: **SOURCE_FIXED / LIVE_PENDING** — chưa chạy trên database thật.

## 4. Kết quả kiểm thử

| Hạng mục | Kết quả | Trạng thái |
|---|---|---|
| PeopleService `./mvnw -o -q test` | 217 test, 0 failure, 0 error | TEST_DB_VERIFIED (H2) |
| IdentityService `./mvnw -o -q test` | 40 test, 0 failure, 0 error | TEST_DB_VERIFIED (H2) |
| FE `npx tsc -b` | sạch (exit 0) | SOURCE_FIXED |
| FE `npx vitest run` toàn bộ | 146 pass / 29 file, 0 fail | SOURCE_FIXED |
| `nav.test.ts` (menu theo quyền) | 16 pass — gồm `class.create` mở mục lớp, `subject.view/manage` mở mục môn | SOURCE_FIXED |
| FE `npx eslint .` | 0 error (14 warning cũ `react-hooks/set-state-in-effect`) | SOURCE_FIXED |
| FE `npx vite build` | thành công (exit 0) | SOURCE_FIXED |
| `subjects-page.test.tsx` | 7 pass | SOURCE_FIXED |
| `classes-page.test.tsx` | 2 pass | SOURCE_FIXED |
| `facility-page*.test.tsx` | 16 pass | SOURCE_FIXED |
| E2E API thật (môn học/lớp) | chưa chạy — cần DB live sau migration | LIVE_PENDING |

## 5. Lỗi còn lại / việc người dùng phải làm

1. Chạy migration 41 + 42 (và 40 nếu chưa) trên MySQL live, kiểm tra theo mục 3.3.
2. Build + deploy lại PeopleService, IdentityService, Gateway theo thứ tự trong
   `docs/live-migration-runbook.md`; migration 42 phải xong trước ảnh People mới.
3. Kiểm thử API thật: tạo/sửa/ngừng dùng môn; tạo lớp có `subjectId`; xoá lớp còn
   sinh viên phải trả lỗi; trùng mã lớp/môn phải trả lỗi; tài khoản chỉ có
   `class.create` mở được `/dao-tao/lop-hoc` và tạo lớp nhưng không đọc danh sách.
4. Chưa có E2E browser với dữ liệu thật trong phiên này → các mục đó giữ
   `LIVE_PENDING`, không tuyên bố `FIXED`.
