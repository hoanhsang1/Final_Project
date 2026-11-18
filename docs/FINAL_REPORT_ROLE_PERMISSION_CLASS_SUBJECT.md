# Báo cáo cuối — Sửa quyền vai trò, giáo viên, cơ sở vật chất, schema lịch, lớp & môn học

- Nhánh: `fixFlowCreateEmployee` (giữ nguyên, không chuyển nhánh)
- HEAD: `fe18018e6ac26536b9550252985cb4dc3d0c443c`
- Ngày: 17/11/2026
- Phạm vi: Part A (A-1..A-4), B (B-5..B-6), C (C-7), D (D-8), E (E-9), báo cáo G.
- Nguyên tắc: không commit/push/merge, không chạy migration trên DB thật, không restart
  container live, không bật module, không bổ nhiệm GM, không đổi cấu hình deploy.

## 1. Trạng thái từng mục

| Mục | Nội dung | Trạng thái |
|---|---|---|
| A-1 | Schedule schema `session.department_id` + index | SOURCE_FIXED / LIVE_PENDING |
| A-2 | Facility chỉ đọc khi module `disabled`/`locked` | SOURCE_FIXED / TEST_DB_VERIFIED (FE unit) |
| A-3 | Trưởng phòng ban có `employee.view` (DEPARTMENT) | SOURCE_FIXED / TEST_DB_VERIFIED (seeder unit) / LIVE_PENDING |
| A-4 | Bỏ JWT khỏi git + tài liệu khắc phục | SOURCE_FIXED / LIVE_PENDING (cần thu hồi token, chưa commit) |
| B-5 | Giáo viên self-service (hồ sơ, lớp, sinh viên, lịch) | SOURCE_FIXED / TEST_DB_VERIFIED (service unit) / LIVE_PENDING |
| B-6 | Audit chức năng theo vai trò | SOURCE_FIXED (tài liệu audit) |
| C-7 | Lớp học: guard + chế độ chỉ-tạo + test | SOURCE_FIXED / TEST_DB_VERIFIED (FE unit) |
| D-8 | Môn học CRUD backend + FE + permission | SOURCE_FIXED / TEST_DB_VERIFIED / LIVE_PENDING (migration 42) |
| E-9 | Test BE/FE | TEST_DB_VERIFIED (H2 + vitest), E2E live LIVE_PENDING |
| F-10 | Các điều cấm | Tuân thủ, không vi phạm |
| G-11/12 | 4 tài liệu + báo cáo cuối | Hoàn tất tài liệu |

Không có mục nào được đánh dấu `FIXED` chỉ dựa trên build/unit test.

## 2. Lỗi đã sửa (nguyên nhân gốc)

1. **Schedule 500 `Unknown column 's.department_id'`** — `ScheduleService` SELECT/INSERT
   cột chưa có trên DB live. Viết migration 40 idempotent, additive; không DML.
2. **Facility hiện nút ghi khi module `disabled`/`locked`** — FE không phân biệt trạng
   thái module. Thêm gating `canWriteModule` + Alert đúng câu yêu cầu; backend vẫn chặn.
3. **Trưởng phòng ban 403 `Missing permission in scope: employee.view`** — chức vụ mặc
   định thiếu mã; `employee.view` lại `orgOnly`. Sửa seeder + migration 41 (DEPARTMENT).
4. **Giáo viên thiếu màn hình hồ sơ/lớp của mình** — thêm khối hồ sơ giáo viên + trạng
   thái loading/404/error; xác nhận endpoint self đã đúng `actor.userId()`.
5. **Menu Môn học ẩn oan** — nav gate `subject.view` chưa tồn tại; backend chỉ có GET.
   Thêm permission/bundle/seeder/migration 42 + CRUD backend + trang FE.
6. **Người chỉ có `class.create` bị chặn khỏi trang lớp** — route/menu chỉ gate
   `class.view`; backend vẫn cho tạo. Thêm anyOf guard + chế độ chỉ-tạo (không đọc list).
7. **JWT thật bị commit** — 8 file `.e2e_tmp/tok_*.txt` được thêm ở commit `fe18018`
   và đã push lên `origin/fixFlowCreateEmployee`. Đã `git rm -r --cached` (giữ file
   local), thêm `.gitignore`, viết hướng dẫn thu hồi. Chưa commit, chưa rewrite history.

## 3. File thay đổi

### Backend
- `backend/IdentityService/src/main/java/com/mems/service/PermissionCatalog.java`
- `backend/PeopleService/src/main/java/com/mems/controller/SubjectController.java`
- `backend/PeopleService/src/main/java/com/mems/dto/SubjectResponse.java`
- `backend/PeopleService/src/main/java/com/mems/dto/SubjectRequest.java` (mới)
- `backend/PeopleService/src/main/java/com/mems/dto/SubjectStatusRequest.java` (mới)
- `backend/PeopleService/src/main/java/com/mems/repository/SubjectRepository.java`
- `backend/PeopleService/src/main/java/com/mems/service/DefaultPositionSeeder.java`
- `backend/PeopleService/src/test/java/com/mems/service/DefaultPositionSeederTest.java`
- `backend/PeopleService/src/test/java/com/mems/service/TeacherServiceTest.java`
- `backend/PeopleService/src/test/java/com/mems/repository/SubjectRepositoryTest.java` (mới)
- `backend/PeopleService/src/test/resources/people-test-schema.sql`

### Frontend
- `frontend/src/app/app.tsx`
- `frontend/src/lib/nav.ts`
- `frontend/src/features/academic/types.ts`
- `frontend/src/features/academic/api.ts`
- `frontend/src/features/academic/hooks.ts`
- `frontend/src/features/academic/pages/subjects-page.tsx`
- `frontend/src/features/academic/pages/subjects-page.test.tsx` (mới)
- `frontend/src/features/academic/pages/classes-page.tsx`
- `frontend/src/features/academic/pages/classes-page.test.tsx` (mới)
- `frontend/src/features/academic/pages/my-classes-page.tsx`
- `frontend/src/features/facility/pages/facility-page.tsx` + test
- `frontend/src/features/facility/pages/facility-issues-page.tsx` + test
- `frontend/src/lib/nav.test.ts` (test menu `class.create`, `subject.view/manage`)

### Migration / script / tài liệu
- `40_schedule_department_scope_catchup.sql` (mới)
- `41_people_head_employee_view_backfill.sql` (mới)
- `42_people_subject_management.sql` (mới)
- `scripts/apply-migration-40.bat` (mới)
- `scripts/apply-live-migrations.bat` (thêm 41, 42; tổng 15 file)
- `.gitignore` (thêm `.e2e_tmp/`)
- `docs/live-migration-runbook.md` (thêm 40/41/42 + thứ tự deploy)
- `docs/SCHEDULE_SCHEMA_FIX_REPORT.md` (mới)
- `docs/SECURITY_TOKEN_REMEDIATION.md` (mới)
- `docs/CLASS_SUBJECT_IMPLEMENTATION_REPORT.md` (mới)
- `docs/ROLE_FUNCTIONALITY_AUDIT.md` (mới)
- `docs/FINAL_REPORT_ROLE_PERMISSION_CLASS_SUBJECT.md` (mới, tài liệu này)

### Đã untrack (không xoá file local)
- 8 file `.e2e_tmp/tok_*.txt` — staged deletion, chưa commit.

## 4. API

### Môn học (mới)
- `GET /api/subjects?q=&includeInactive=`
- `GET /api/subjects/{id}`
- `POST /api/subjects`
- `PUT /api/subjects/{id}`
- `PATCH /api/subjects/{id}/status`
- Không có DELETE; ngừng dùng qua status để bảo toàn lớp tham chiếu.

### Đã xác nhận (không đổi)
- `GET /teachers/me`, `GET /teachers/me/classes`
- `GET /classes/me`, `GET /classes/me/{id}/students`
- `GET /classes`, `GET /classes/{id}`, `POST /classes`, `PUT /classes/{id}`,
  `DELETE /classes/{id}`, `PUT /classes/{id}/teacher`, `/teacher/reassign`,
  `PUT/DELETE /classes/{id}/students/{studentId}`
- `GET /api/schedules/me`, `GET /api/departments/{id}/schedules`
- Facility: đọc khi module `disabled`/`locked`; ghi bị chặn bởi backend.

## 5. Permission / scope đã đồng bộ

| Mã | Catalog | Bundle | Seeder | Backend | FE |
|---|---|---|---|---|---|
| `subject.view` | `orgOnly`, `STUDENT_MANAGEMENT` | ACADEMIC | ORG Admin, Giáo vụ | GET subjects | PERM + nav/route |
| `subject.manage` | `orgOnly`, `STUDENT_MANAGEMENT` | ACADEMIC | ORG Admin, Giáo vụ | POST/PUT/PATCH | PERM + nút ghi |
| `employee.view` | `DEPARTMENT,ORGANIZATION` | — | Trưởng phòng ban (mới) | member APIs | nav (đã có) |

- Scope lớp: `class.view`/`class.reopen` cho DEPARTMENT đã có từ migration 39.
- Không cấp `employee.create/edit/delete` cho trưởng phòng; không đổi scope ORGANIZATION.
- Không cấp org-wide `employee.view` cho giáo viên; giáo viên dùng self contract.

## 6. Migration

| File | DB | Nội dung | Trạng thái |
|---|---|---|---|
| `40_schedule_department_scope_catchup.sql` | schedule | `session.department_id` + index | SOURCE_FIXED / LIVE_PENDING |
| `41_people_head_employee_view_backfill.sql` | people + identity | backfill `employee.view` DEPT | SOURCE_FIXED / LIVE_PENDING |
| `42_people_subject_management.sql` | people + identity | cột môn học, permission, bundle, role | SOURCE_FIXED / LIVE_PENDING |

**Thứ tự bắt buộc:** 41 → 42 → 37 → 40; migration 42 phải xong **trước khi deploy ảnh
People mới** (`SubjectRepository` SELECT cột mới). Tất cả idempotent, additive, không xoá.

## 7. Kiểm thử theo vai trò

| Vai trò | Nội dung | Kết quả |
|---|---|---|
| SUPER_ADMIN | Duyệt tổ chức, module, tài khoản, audit | PASS (live 16/11) |
| OWNER | Toàn bộ module; môn học/lớp/CSV/lịch | PASS live 13/11; phần mới SOURCE_FIXED |
| Tổng quản lý | Ủy quyền + capability | NOT_TESTED (không có tài khoản GM) |
| HR tổ chức | Nhân sự, chức vụ, đào tạo | PASS (live 13/11) |
| HR phòng ban | Nhân sự/chức vụ trong phòng | PASS (live 13/11) |
| Trưởng phòng ban | Xem nhân sự phòng mình; duyệt lớp; lịch | Seeder test PASS; `employee.view` LIVE_PENDING (41); lịch LIVE_PENDING (40) |
| Giáo viên | Hồ sơ, lớp của tôi, sinh viên lớp, lịch | 3 service test PASS; LIVE_PENDING |
| Nhân viên thường | Hồ sơ, thông báo, không thấy nút quản lý | PASS |
| Sinh viên | Hồ sơ, lớp, lịch của mình | PASS (live 16/11); lịch LIVE_PENDING (40) |

Ma trận đầy đủ (Role | Chức năng | Permission | Scope | Menu | Route | API | Test):
`docs/ROLE_FUNCTIONALITY_AUDIT.md`.

## 8. Kết quả test backend/frontend

| Hạng mục | Kết quả |
|---|---|
| PeopleService `./mvnw -o -q test` | 217 test, 0 failure, 0 error |
| IdentityService `./mvnw -o -q test` | 40 test, 0 failure, 0 error |
| `SubjectRepositoryTest` | 8 pass |
| `TeacherServiceTest` (self contract) | 3 test mới pass |
| `DefaultPositionSeederTest` (head employee.view) | pass |
| FE `npx tsc -b` | exit 0 |
| FE `npx vitest run` | 146 pass / 29 file, 0 fail |
| FE `npx eslint .` | 0 error, 14 warning cũ |
| FE `npx vite build` | thành công |

## 9. Lỗi còn lại / giới hạn

- `LIVE_PENDING`: migration 40/41/42 chưa chạy trên MySQL live; chưa deploy ảnh mới;
  chưa gọi API thật bằng JWT cho schedule/head/teacher/subjects.
- `NOT_TESTED`: vai trò GM; giáo viên nhiều chức vụ; giáo viên bị thu hồi chức vụ;
  giáo viên phòng ban khác (mới test ở tầng service).
- `NOT_IMPLEMENTED` (ngoài phạm vi, giữ placeholder): điểm danh, yêu cầu đổi lịch,
  nhật ký tổ chức cho OWNER, self-service nghỉ việc/chuyển phòng.
- `BLOCKED`: E2E browser/API thật cần quyền chạy migration + deploy, chưa được cấp.
- Rủi ro bảo mật: JWT cũ vẫn tồn tại trong lịch sử git và trên remote; cần thu hồi
  token/đổi mật khẩu (hoặc rotate `JWT_SECRET_BASE64`) theo `SECURITY_TOKEN_REMEDIATION.md`.

## 10. Việc người dùng cần làm

1. Chạy migration theo `docs/live-migration-runbook.md`:
   `scripts\apply-live-migrations.bat` (15 file, dừng ở file lỗi đầu tiên), hoặc chạy
   `scripts\apply-migration-40.bat` nếu chỉ cần Schedule.
2. Kiểm tra sau migration bằng các câu SQL trong runbook mục 2.
3. Build + deploy Identity → People → Facility → Schedule → Gateway.
4. Kiểm thử API thật (không in token) cho: schedule theo phòng/cá nhân, trưởng phòng
   xem nhân sự phòng mình, giáo viên self, môn học CRUD, lớp có `subjectId`, module
   Facility `disabled`/`locked`.
5. Thu hồi token cũ: logout/đổi mật khẩu các tài khoản có token trong `.e2e_tmp`, hoặc
   rotate `JWT_SECRET_BASE64` đồng bộ 5 service; cân nhắc rewrite history (ngoài phạm vi
   được phép của phiên này).
6. Quyết định commit/push các thay đổi đang ở working tree (phiên này không commit).
