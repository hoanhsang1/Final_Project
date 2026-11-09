# Sprint 4 — Khảo sát code hiện có (Phần 0)

> Ngày khảo sát: 2026-11-06 · Commit nền: `9499494` · Phạm vi: **chỉ đọc**, không sửa file code nào.
> Mọi tên bảng/cột/permission dưới đây lấy từ code và script SQL thật của repo.

## 1. Tóm tắt các phát hiện quyết định

1. **Không có hồ sơ nhân sự đầy đủ.** "Nhân sự" hiện chỉ là dòng `department_member` gồm `user_id`, `org_id`, `department_id`, `role`, `appointed_by`, `appointed_at`, `username`. **Không có mã nhân sự, họ tên, SĐT, trạng thái làm việc, version.** Email nằm ở `mems_identity_db.account.email`; họ tên và SĐT **không tồn tại ở bất kỳ đâu**.
2. **Lớp học thật là `school_class`** trong `mems_people_db`, không phải `classes`. Bảng chỉ có `class_code`, `name`, `academic_year`, `status`, `created_by`, `created_at`, `updated_at`, `deleted_at`. **Không có `teacher_id`, `close_state`, `version`, `start_date`, `end_date`, `subject`.**
3. **Có hai khái niệm lớp trùng nhau:** `school_class` (PeopleService, đang có API + frontend dùng) và `class` (ScheduleService, có `subject`, `start_date`, `end_date`, `status ENUM('draft','ongoing','closed')`, `teacher_assignment`, nhưng **chưa có API/controller thật**).
4. **Không có optimistic lock** ở bất kỳ đâu (`@Version` = 0; không cột `version`). Đồng thời PeopleService **không dùng JPA entity**, toàn bộ là `JdbcTemplate` + SQL tay.
5. **Chưa có seed chức vụ mẫu.** `position` / `position_permission` nằm ở People DB, chỉ được tạo tay qua API. Identity chỉ seed role toàn cục và permission catalog.
6. **Permission mới sẽ bị lọc theo module của phòng ban** (`department_module`), và danh sách module được phép gắn cho phòng ban hiện chỉ có `STUDENT_MANAGEMENT`. Đây là ràng buộc quan trọng khi chọn `module_code` cho permission Sprint 4.
7. **Gateway chưa có tiền tố `/api` cho PeopleService.** Các route hiện tại là `/classes`, `/students`…, không có `StripPrefix`; muốn dùng `/api/teachers/**` phải thêm filter hoặc đổi mapping.

---

## 2. Trả lời 12 câu hỏi

### 1) Nhân sự, chức vụ, phòng ban ở service nào? Tên bảng/cột?

Tất cả ở **PeopleService**, DB `mems_people_db`, truy cập bằng `JdbcTemplate` (không có `@Entity`).

| Khái niệm | Bảng | Cột thật | Nguồn |
|---|---|---|---|
| Nhân sự | `department_member` | `user_id` PK, `org_id`, `department_id`, `role` ENUM(`OWNER`,`MANAGER`,`STAFF`), `appointed_by`, `appointed_at`, `username` | `07_people_department_access.sql:23-29`; `12_people_member_username.sql:9` |
| Phòng ban | `department` | `id` PK, `org_id`, `name`, `description`, `created_at` | `07_people_department_access.sql:4-10` |
| Chức vụ | `position` | `id` PK, `org_id`, `name`, `description`, `created_at` | `07_people_department_access.sql:11-17` |
| Quyền của chức vụ | `position_permission` | `position_id`, `permission_code` (PK kép) | `07_people_department_access.sql:18-22` |
| Gán chức vụ cho người | `member_position` | `user_id`, `position_id`, `org_id` (PK kép) | `07_people_department_access.sql:30-35` |
| Nhật ký thao tác | `people_audit_log` | `id`, `org_id`, `actor_user_id`, `action`, `target_id`, `details` TEXT (JSON), `created_at` | `07_people_department_access.sql:36-41` |
| Email đăng nhập | `mems_identity_db.account` | `id`, `org_id`, `username`, `email`, `password_hash`, `status`, `must_change_password`, `last_login_at` | `01_identity_db.sql:19-33`; `Account.java:9-30` |

**Không có:** mã nhân sự, họ tên, số điện thoại, trạng thái làm việc, cột `version`, cột `updated_at` cho nhân sự.
`AccountProvisioningService.create` chỉ lưu `username` + `email`; `MemberRequest` chỉ có `username`, `email`, `role`, `positionIds` (`MemberRequest.java:4-7`).

### 2) Lớp học ở service nào? Cột và giá trị trạng thái?

- Bảng thật: **`school_class`** — PeopleService, `mems_people_db` (`11_people_student_class.sql:31-44`).
- Cột: `id`, `org_id`, `class_code`, `name`, `academic_year`, `status VARCHAR(20) NOT NULL DEFAULT 'active'`, `created_by`, `created_at`, `updated_at`, `deleted_at`.
- Giá trị `status` đang dùng: **`active` | `inactive` | `archived`** — validate ở `SchoolClassRequest.java:11` và `SchoolClassUpdateRequest.java:10`, frontend khai báo cùng bộ giá trị (`frontend/src/features/organization/types.ts:49`).
- Không có ngày bắt đầu/kết thúc, không có môn học, không có giáo viên phụ trách, không có `version`, không có `close_state`.
- Bảng trùng tên khái niệm: **`class`** ở ScheduleService (`03_schedule_db.sql:5-18`) có `code`, `name`, `subject`, `max_size`, `start_date`, `end_date`, `status ENUM('draft','ongoing','closed')`; kèm `teacher_assignment` (`03:30-39`) và `session` (`03:42-56`). ScheduleService hiện **chỉ có 1 controller** `DepartmentScheduleController`; các class/repository khác là stub rỗng.

### 3) Nhân sự và lớp có cùng service/DB không? Cơ chế gọi nội bộ?

- **Cùng service, cùng DB**: nhân sự (`department_member`) và lớp (`school_class`) đều ở PeopleService / `mems_people_db` → join trực tiếp được, không cần gọi chéo cho D14.
- Gọi nội bộ hiện có:
  - People → Identity: `RestTemplate`, header **`X-Internal-Api-Key`** = `INTERNAL_API_KEY`, base URL từ `IDENTITY_SERVICE_URL` (mặc định `http://localhost:8081`), các endpoint `/internal/*` (`IdentityClient.java:24-28`).
  - Identity → People: `PeopleAuthorizationClient`, base `PEOPLE_SERVICE_URL` (`http://localhost:8082`), dùng cho phân quyền MANAGER/STAFF (`AccessProfileService.java:19`).
- Eureka có đăng ký nhưng **không dùng để route nội bộ**; gateway route bằng URI từ biến môi trường.
- `InternalApiFilter` (cả 2 service) chặn `/internal/**` nếu key < 32 ký tự hoặc sai → 401.

### 4) Cơ chế permission: lưu ở đâu, JWT chứa gì, kiểm tra thế nào?

- **Catalog permission** ở Identity: `PermissionCatalog.ENTRIES` — `PermissionCatalog.java:8-22`, gồm 13 mã: `FACILITY_MANAGE`, `SCHEDULE_CREATE`, `SCHEDULE_VIEW`, `PEOPLE_VIEW`, `PEOPLE_EDIT` (module `null`), `STUDENT_VIEW/CREATE/EDIT/DELETE`, `CLASS_VIEW/CREATE/EDIT/DELETE` (module `STUDENT_MANAGEMENT`).
- **Quyền theo chức vụ** ở People: `position_permission.permission_code` (chuỗi tự do, nhưng khi tạo/sửa chức vụ phải nằm trong catalog Identity — `PositionService.java:49-53`).
- **JWT claims** (`JwtService.java:25-38`): `iss=mems-identity`, `sub=userId`, `userId`, `username`, `roles[]`, `role`, `permissions[]`, `mustChangePassword`, `departmentId`, `orgId` (chỉ có khi orgId ≠ null).
- **Chuyển authority** (`PeopleService/security/SecurityConfig.java:34-47`): `ROLE_` + từng `roles`, `ROLE_` + `role`, và **raw permission code** (nên dùng `hasAuthority('CLASS_VIEW')`).
- **Ai có quyền gì:**
  - OWNER/ORG_OWNER → nhận **toàn bộ catalog** và `departmentId=null` (`AccessProfileService.java:16-18`).
  - MANAGER/STAFF → gọi People `/internal/users/{userId}/authorization?orgId=` (`MemberRepository.authorization`, `MemberRepository.java:89-95`), trả role + departmentId + quyền đã lọc theo module phòng ban.
  - Khác → đọc bảng `permission`/`role_permission`/`account_role`.
- **Lọc theo module phòng ban:** `EffectivePermissionsService.compute` bỏ mọi permission có `module_code` mà `department_module` của phòng ban không chứa (`EffectivePermissionsService.java:39-54`). `MembershipPolicy` cũng chặn manager gán chức vụ có permission ngoài module phòng ban (`MembershipPolicy.java:57-66`).
- **Kiểm tra ở server:** `@EnableMethodSecurity` + `@PreAuthorize("hasRole('OWNER') or hasAuthority('...')")` ở controller.
- **401/403:** `SecurityConfig.java:44-51` trả JSON `{"code":"UNAUTHENTICATED"|"FORBIDDEN","message":"..."}`.

### 5) Chức vụ mẫu: bảng nào, seed hiện tại, có seed cho tổ chức cũ?

- Chức vụ ở People: `position` + `position_permission` (`07:11-22`). **Không có seed nào** — không SQL, không runner, không Flyway. Chức vụ chỉ được tạo qua `POST /positions` (OWNER).
- Identity seed **role toàn cục** (`OWNER`, `MANAGER`, `STAFF`) và **toàn bộ permission catalog** mỗi lần khởi động, cấp cho role `OWNER`/`ORG_OWNER` (`IdentityDataInitializer.java:27-49`). Chạy cho mọi tổ chức vì bảng role/permission không có `org_id`.
- `05_seed_admin.sql` seed thêm role cũ (`SUPER_ADMIN`, `ORG_ADMIN`, `ACADEMIC_STAFF`, `FACILITY_STAFF`, `TEACHER`, `STUDENT`) và 15 permission legacy (`CLASS_READ/WRITE`…) — **không nằm trong catalog** và không được cấp tự động cho OWNER.
- Tạo tổ chức (`OrganizationRegistrationService.register`, dòng 50-159) chỉ tạo `organization`, `account`, `account_role` ORG_OWNER, `organization_module` trạng thái `requested`. **Không tạo phòng ban/chức vụ**, không gọi People.
- Kết luận: chưa có cơ chế seed chức vụ mẫu cho cả tổ chức cũ lẫn tổ chức mới.

### 6) Cách tạo nhân sự hiện tại?

- Endpoint: `POST /departments/{departmentId}/members` (`DepartmentMemberController.java:17-21`), quyền `hasRole('OWNER') or (hasRole('MANAGER') and hasAuthority('PEOPLE_EDIT'))`.
- Request `MemberRequest`: `username` (≤100), `email` (@Email), `role` (`MANAGER|STAFF`), `positionIds` (≤50) (`MemberRequest.java:4-7`).
- Luồng (`MemberService.create`, dòng 37-64): sinh `userId = UUID`, mật khẩu tạm ngẫu nhiên → tạo account Identity qua `/internal/accounts` → insert `department_member` → `member_position` → audit `MEMBER_APPOINTED`. Trả `{member, temporaryPassword, mustChangePassword:true}`.
- **Mã nhân sự: không có, không sinh, không nhập.** Mã hiển thị duy nhất là `username` (copy từ Identity sang People, `12_people_member_username.sql:9`).
- Không có API sửa thông tin nhân sự (chỉ sửa chức vụ, reset mật khẩu, xoá).

### 7) Quyền "nhân sự phòng ban" đã có chưa?

- **Không có permission tên riêng.** Tương đương hiện tại = role `MANAGER` **và** permission `PEOPLE_EDIT` (tạo/sửa nhân sự), `PEOPLE_VIEW` (xem).
- Giới hạn phòng ban: `Actor.requireDepartment(departmentId)` so path với claim `departmentId`, OWNER bỏ qua (`Actor.java:26-30`); `MembershipPolicy` chỉ cho MANAGER quản lý `STAFF` trong phòng ban mình và chỉ gán chức vụ có quyền ≤ quyền hiện có của mình (`MembershipPolicy.java:30-71`).
- Không có `TEACHER_MANAGE_DEPT`.

### 8) Module/catalog module, cách kiểm tra, module "Phân công giáo viên"?

- Bảng: `module(code,name,is_active)` và `organization_module(org_id,module_code,status)` (`01_identity_db.sql:138-159`).
- 6 module đang seed (`05_seed_admin.sql:62-71`): `STUDENT_MANAGEMENT`, `TEACHER_MANAGEMENT`, `CLASS_MANAGEMENT`, `SCHEDULE_MANAGEMENT`, `ROOM_MANAGEMENT`, `EQUIPMENT_MANAGEMENT`.
- `TEACHER_MANAGEMENT` **tồn tại nhưng chưa có permission nào trỏ tới và chưa code nào kiểm tra**.
- **Không có `TEACHER_ASSIGNMENT`** trong bảng `module`. Chỉ còn dấu vết: enum cũ `teacher_assignment` trong `module_config` (bảng chết) và ghi chú "chưa cài đặt" trong `docs/api.md`.
- Cách kiểm tra: `OrganizationModuleGuard.requireModule(orgId, code)` → gọi Identity `GET /internal/orgs/{orgId}/modules` (chỉ trả status `active`) → thiếu thì **400 `MODULE_NOT_ENABLED`** (`OrganizationModuleGuard.java:18-24`).
- Hiện `students`/`classes` đều bắt buộc `STUDENT_MANAGEMENT`, kể cả OWNER (`SchoolClassService.java:38-119`).
- Module gắn cho **phòng ban** (`department_module`) hiện chỉ cho phép `STUDENT_MANAGEMENT` (`DepartmentService.java:20`).

### 9) Khuôn module sinh viên (để làm theo)

| Thành phần | File |
|---|---|
| Controller | `StudentController.java`, `SchoolClassController.java` |
| Service | `StudentService.java`, `SchoolClassService.java` |
| Repository (JdbcTemplate) | `StudentRepository.java`, `SchoolClassRepository.java` |
| DTO record | `StudentRequest/Response/UpdateRequest`, `SchoolClassRequest/Response/UpdateRequest` |
| Audit | `PeopleAuditService.record` → `people_audit_log` JSON |
| Lỗi | `ApiException(status, code, message)` + `GlobalExceptionHandler` → body `{code,message}` |
| Phân trang | `page` (default 1), `size` (default 20, max 100), `LIMIT/OFFSET` + `COUNT`; trả `Map{items,total,page,size}` (`SchoolClassRepository.java:35-84`) |
| Tìm kiếm | `LOWER(col) LIKE ?`, tham số hoá (`SchoolClassRepository.java:49-54`) — **chưa có cột không dấu**; dựa vào collation `utf8mb4_unicode_ci` của MySQL |
| Optimistic lock | **không có**; chống đua bằng `SELECT ... FOR UPDATE` |
| Lịch sử thay đổi | Chỉ ghi audit JSON; **không có endpoint đọc lịch sử**, không lưu old/new theo từng trường |
| Xoá | Xoá mềm `deleted_at` cho lớp; nhân sự thì xoá cứng khỏi `department_member` |

Lưu ý định dạng lỗi **khác nhau giữa 2 service**: People trả `{code,message}`; Identity trả `{success,message,data}` (`IdentityService/dto/ApiResponse.java`). `docs/api.md` đang mô tả envelope của Identity và **đã cũ** so với PeopleService.

### 10) Cơ chế migrate DB hiện tại?

- **Script SQL tay, đánh số** ở gốc repo: `01`–`04` là "fresh install" (tạo DB/bảng), `05_seed_admin.sql`, `06`–`12` là migration additive/idempotent.
- Không có Flyway/Liquibase (grep pom = 0).
- JPA `ddl-auto=update` ở cả Identity và People (`application.properties:8`/`:9`), nhưng People **không có entity JPA** nên thực tế schema do SQL tay quyết định.
- Test dùng H2 `MODE=MySQL`, `ddl-auto=none`, schema nạp từ `src/test/resources/people-test-schema.sql`.
- Một số script cũ có drift: `02_people_db.sql` định nghĩa `student` khác với `11_people_student_class.sql` (dùng `code` vs `student_code`); vì `11` dùng `IF NOT EXISTS`, DB mới sẽ giữ schema cũ. Đây là nợ kỹ thuật có sẵn, không thuộc Sprint 4.

### 11) Route gateway hiện có?

`backend/APIGateway/src/main/resources/application.yml:22-71` — toàn bộ khai báo YAML, **không có filter nào** (không StripPrefix, không JWT filter):

| id | Path | URI |
|---|---|---|
| identity-auth | `/api/v1/auth/**` | `${IDENTITY_SERVICE_URL:http://localhost:8081}` |
| identity-modules | `/api/v1/modules/**` | nt |
| identity-organizations | `/api/v1/organizations/**` | nt |
| identity-accounts | `/api/v1/accounts/**` | nt |
| identity-audit-logs | `/api/v1/audit-logs/**` | nt |
| people-departments | `/departments/**`, `/departments`, `/departments/` | `${PEOPLE_SERVICE_URL:http://localhost:8082}` |
| people-positions | `/positions/**` | nt |
| people-permissions | `/permissions/**` | nt |
| people-students | `/students/**` | nt |
| people-classes | `/classes/**` | nt |

Hệ quả: URL của People **không có tiền tố `/api`**, trong khi Identity có. Muốn thêm `/api/teachers/**` trỏ People phải dùng `StripPrefix=1` hoặc đổi mapping controller.

### 12) Môn học của lớp: chữ tự do hay bảng riêng?

- `school_class` **không có cột môn học**.
- ScheduleService có `class.subject VARCHAR(200)` (`03_schedule_db.sql:8`), nhưng bảng này chưa được dùng bởi API nào.
- Vì vậy quy tắc D13 (khớp tên môn lớp với chuyên môn giáo viên) **hiện không thể thực hiện** cho lớp đang quản lý ở PeopleService.

---

## 3. Mâu thuẫn giữa kế hoạch và code thật + đề xuất

Mức độ: **A** = ảnh hưởng trực tiếp mục "QUYẾT ĐỊNH ĐÃ CHỐT", cần chủ dự án xác nhận trước khi làm Phần 1; **B** = chỉ cần chốt cách triển khai.

| # | Kế hoạch nói | Code thật | Đề xuất | Mức |
|---|---|---|---|---|
| C1 | D1: giáo viên là nhân sự, "mã giáo viên = mã nhân sự"; AC-15.02 yêu cầu mã/họ tên/liên hệ | Không có mã nhân sự, họ tên, SĐT; chỉ có `user_id`, `username`, email ở Identity | **ĐÃ CHỐT: tạo bảng `staff_profile` riêng** khóa `user_id` (1:1 với `department_member`), chứa `staff_code`, `full_name`, `full_name_unaccented`, `phone`; UNIQUE `(org_id, staff_code)`. Backfill từ `department_member` cho dữ liệu cũ (`staff_code`/`full_name` tạm = `username`). Email giữ ở Identity và kiểm tra trùng `(org_id,email)` | A |
| C2 | Bảng tên `classes`, cột `status/teacher_id/version/close_state` | Bảng tên `school_class`, đã có `status` với nghĩa cũ `active/inactive/archived` | Dùng `school_class`; thêm `teacher_id`, `version`, `close_state`, `start_date`, `end_date`, `subject`; đổi nghĩa `status` sang 4 giá trị D6 và cập nhật DTO/frontend contract | A |
| C3 | D7: tự chuyển trạng thái theo ngày bắt đầu/kết thúc | Lớp không có `start_date`/`end_date` | **ĐÃ CHỐT: thêm `start_date`, `end_date` (nullable)**; lớp không có ngày đứng ở `CHUA_BAT_DAU`, không tự chuyển. API tạo/sửa lớp mới bắt buộc ngày | A |
| C4 | D13: so tên môn của lớp với chuyên môn giáo viên | `school_class` không có môn học | **ĐÃ CHỐT: tạo danh mục môn học riêng** `subject(id, org_id, name, name_unaccented, is_active, ...)` và thêm `school_class.subject_id` (nullable). D13 so `subject.name_unaccented` với `specialty.name_unaccented` | A |
| C5 | Phần 1 nói "service thường là PeopleService", bảng `classes` | Có thêm `class` ở ScheduleService với `subject/start_date/end_date/teacher_assignment` nhưng chưa có API | Sprint 4 chỉ dùng `school_class`; **không đụng** `mems_schedule_db.class`; ghi chú Epic 6 phải hợp nhất sau | B |
| C6 | Tên bảng `specialties`, `teacher_profiles`, `class_status_logs`, `class_close_events` (số nhiều) | Quy ước thật là số ít: `position`, `student`, `school_class`, `people_audit_log` | Dùng: `specialty`, `teacher_profile`, `teacher_specialty`, `class_status_log`, `class_close_event` | B |
| C7 | Tạo `06_sprint4.sql`, mẫu `07_sprint4_sample.sql` | Đã có `06`–`12` | Dùng **`13_sprint4.sql`** và **`14_sprint4_sample.sql`**; viết theo kiểu idempotent như `11`/`12` | B |
| C8 | Phần 1 bước 5: "cập nhật entity JPA" | PeopleService không có JPA entity; toàn bộ `JdbcTemplate` | Bỏ bước entity; cập nhật `RowMapper`/SQL trong repository | B |
| C9 | QC-08: dùng `@Version` | Không có JPA entity, không có cột version | Optimistic lock thủ công: `UPDATE ... WHERE id=? AND version=?`, 0 dòng → 409 `DATA_CHANGED`; tăng `version` mỗi lần ghi | B |
| C10 | QC-07: tìm không dấu bằng cột chuẩn hoá + `Normalizer` | Chưa có cột không dấu; chỉ `LOWER LIKE`, dựa collation MySQL | Thêm cột `*_unaccented` cho `specialty`, `department_member.full_name`, (và `school_class.name` nếu cần) + chuẩn hoá NFD/đ→d ở tầng service | B |
| C11 | Permission "nhân sự phòng ban" (nếu có thì dùng lại) | Không có; tương đương là `PEOPLE_EDIT` + role `MANAGER` | **ĐÃ CHỐT: tái sử dụng `PEOPLE_EDIT`** cho hồ sơ giáo viên; không tạo `TEACHER_MANAGE_DEPT` | A |
| C12 | Permission mới gắn module giáo viên; module tắt thì chặn | `TEACHER_MANAGEMENT` chưa có permission nào; `department_module` chỉ cho `STUDENT_MANAGEMENT`; `EffectivePermissionsService` sẽ **loại bỏ** permission có module chưa bật cho phòng ban | Các `CLASS_*` mới gắn `STUDENT_MANAGEMENT` (đồng bộ 4 quyền cũ). `TEACHER_MANAGE_DEPT` gắn `NULL`. Không bắt buộc `TEACHER_MANAGEMENT` trong Sprint 4 (hoặc phải mở rộng allowlist + cơ chế bật module cho phòng ban) | A |
| C13 | Permission `CLASS_ASSIGN_TEACHER`, `CLASS_CANCEL`, `CLASS_CLOSE_REQUEST`, `CLASS_CLOSE_APPROVE`, `CLASS_REOPEN` | Chưa có; catalog chỉ có 13 mã | Thêm 5 mã vào `PermissionCatalog`; `IdentityDataInitializer` tự cấp cho OWNER/ORG_OWNER; tạo chức vụ mẫu để gán cho MANAGER | B |
| C14 | Seed chức vụ mẫu cho tổ chức cũ **và** mới | Không có seed; People DB không có bảng organization, không liệt kê được org | Seed idempotent theo org_id: chạy khi khởi động cho các org có trong `department`, và khi tạo phòng ban mới; chỉ thêm chức vụ chưa tồn tại, không sửa chức vụ đã có. Tổ chức mới chưa có phòng ban thì seed ở lần tạo phòng ban đầu tiên | A |
| C15 | D2/T7: OWNER không mặc nhiên được tạo giáo viên | Mọi controller hiện tại đều mở cho OWNER (`hasRole('OWNER') or ...`) | Với `POST/PUT /teachers`: **không** thêm nhánh OWNER; chỉ người có quyền nhân sự phòng ban và đúng phòng ban. Các API đọc giữ OWNER | A |
| C16 | AC-15.04: email trùng trong tổ chức bị từ chối | `AccountProvisioningService` chỉ kiểm tra trùng `username` hoặc `id`, **không kiểm tra email**; không có unique index trên email | Thêm kiểm tra `(org_id, email)` + chuẩn hoá lowercase (QC-02). Cân nhắc unique index sau khi dọn dữ liệu trùng; trước mắt kiểm tra ở service để không làm hỏng DB cũ | B |
| C17 | QC-06: lịch sử thay đổi từng trường | Chỉ có `people_audit_log` JSON, ghi cả object, không có endpoint đọc | Ghi mỗi trường thay đổi thành một bản ghi `people_audit_log` (action `TEACHER_PROFILE_UPDATED`, details `{field,old,new}`) và thêm `GET /teachers/{id}/history` đọc theo `target_id`. Không cần bảng mới | B |
| C18 | Phần 6: route `/api/teachers/**`, `/api/specialties/**`, `/api/classes/**` | Route People không có prefix `/api`, gateway không StripPrefix | Thêm 3 route với `filters: - StripPrefix=1` trỏ People, giữ nguyên route `/classes/**` cũ để không phá frontend hiện tại | B |
| C19 | D6: 4 trạng thái | Giá trị cũ `active/inactive/archived` đang được frontend hiển thị ("Đang mở"/"Tạm khóa") | **ĐÃ CHỐT: map `active → CHUA_BAT_DAU`, `inactive → DA_HUY`, `archived → DA_KET_THUC`**; giá trị lạ/NULL → `CHUA_BAT_DAU`. Cập nhật DTO và thông báo team frontend | A |
| C20 | Sprint 4 không làm giao diện | Frontend hiện dùng `/classes` + `status` cũ | Chỉ cần chốt API contract; không sửa frontend trong Sprint 4 | B |

---

## 4. Cấu trúc kỹ thuật đã chốt cho các Phần sau

> Chưa tạo gì trong Phần 0. Tên theo quy ước thật (số ít, snake_case).

**People DB (`13_people_sprint4.sql`)**
- `staff_profile(user_id PK, org_id, staff_code, full_name, full_name_unaccented, phone, version, created_by, created_at, updated_by, updated_at)`; UNIQUE `(org_id, staff_code)`, UNIQUE `(user_id, org_id)`; FK `(user_id, org_id)` → `department_member`.
- `specialty(id, org_id, name, name_unaccented, is_active, created_by, created_at)` + UNIQUE `(org_id, name_unaccented)`, UNIQUE `(id, org_id)`.
- `subject(id, org_id, name, name_unaccented, is_active, created_by, created_at)` + UNIQUE `(org_id, name_unaccented)`, UNIQUE `(id, org_id)`.
- `teacher_profile(user_id PK, org_id, contract_type NULL, teaching_status DEFAULT 'DANG_DAY', version, created_by, created_at, updated_by, updated_at)`; FK → `staff_profile`.
- `teacher_specialty(user_id, specialty_id, org_id)` PK `(user_id, specialty_id)`; FK → `teacher_profile`, `specialty`.
- `position`: thêm `profile_type VARCHAR(20) DEFAULT 'GENERAL'` (`GENERAL`/`TEACHER`).
- `school_class`: thêm `teacher_id`, `start_date`, `end_date`, `subject_id`, `version`, `close_state`; chuẩn hoá `status` theo C19.
- `class_status_log(id, class_id, org_id, from_status, to_status, reason, changed_by NULL = hệ thống, changed_at)`.
- `class_close_event(id, class_id, org_id, action, requested_by, acted_by, reason, created_at)`.

**Identity DB**
- Thêm 5 permission `CLASS_ASSIGN_TEACHER`, `CLASS_CANCEL`, `CLASS_CLOSE_REQUEST`, `CLASS_CLOSE_APPROVE`, `CLASS_REOPEN` (module `STUDENT_MANAGEMENT`) vào `PermissionCatalog`.
- Không tạo `TEACHER_MANAGE_DEPT`; hồ sơ giáo viên dùng lại `PEOPLE_EDIT` (module `NULL`).
- Không cần bảng mới; `IdentityDataInitializer` tự upsert và cấp cho OWNER/ORG_OWNER.

**Chức vụ mẫu** (seed ở People, idempotent): Quản trị viên tổ chức (nếu chưa có), Giáo vụ, Giáo viên (`profile_type='TEACHER'`), Trưởng phòng ban, Nhân sự phòng ban, Nhân viên cơ sở vật chất, Nhân viên.

---

## 5. Quyết định đã xác nhận (2026-11-06)

| # | Quyết định |
|---|---|
| 1 | Hồ sơ nhân sự: **bảng `staff_profile` riêng**, không thêm cột vào `department_member`. |
| 2 | Lớp: dùng **`school_class`**, map `active→CHUA_BAT_DAU`, `inactive→DA_HUY`, `archived→DA_KET_THUC`, giá trị lạ/NULL → `CHUA_BAT_DAU`. |
| 3 | Lớp: **chỉ thêm `start_date`, `end_date`** (nullable); chưa thêm cột `subject`. |
| 4 | Môn học: **tạo danh mục `subject` riêng theo tổ chức**, lớp tham chiếu `subject_id`. |
| 5 | Quyền hồ sơ giáo viên: **tái sử dụng `PEOPLE_EDIT`**, không tạo `TEACHER_MANAGE_DEPT`; các `CLASS_*` mới gắn `STUDENT_MANAGEMENT`. |

**Mặc định mình sẽ áp dụng cho các điểm còn lại** (bạn có thể đổi bất cứ lúc nào):
- Seed chức vụ mẫu: idempotent khi khởi động (các org có trong `department`) và khi tạo phòng ban mới; chỉ thêm chức vụ chưa tồn tại.
- `POST/PUT /teachers` không có nhánh OWNER bypass (đúng D2/T7); API đọc giữ OWNER.
- Kiểm tra trùng email `(org_id, email)` ở tầng service, chuẩn hoá lowercase; chưa thêm unique index vì DB cũ có thể đã trùng.
- Lịch sử thay đổi: ghi từng trường vào `people_audit_log` và thêm `GET /teachers/{id}/history`.
- Gateway: thêm route `/api/teachers/**`, `/api/specialties/**`, `/api/classes/**` với `StripPrefix=1`, giữ route `/classes/**` cũ.
- Optimistic lock thủ công bằng cột `version` (không có JPA entity).

---

## 6. DoD Phần 0

- [x] `docs/sprint4-survey.md` điền đủ 12 câu, có tên file/bảng/cột thật kèm số dòng.
- [x] Nêu rõ mâu thuẫn và đề xuất xử lý (mục 3, C1–C20); các mục mức **A** đang chờ chủ dự án xác nhận.
- [x] Không sửa file code nào (chỉ tạo tài liệu này).
