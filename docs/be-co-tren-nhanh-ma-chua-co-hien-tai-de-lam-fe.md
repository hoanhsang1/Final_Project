# BE có trên các nhánh mà working tree hiện tại chưa có — snapshot 2026-11-26 (để bắt đầu FE)

> Tài liệu là **điểm tham chiếu inventory**, không thay thế quyết định sản phẩm. Quyết định/chốt nằm ở
> `docs/scope-can-chot-xep-lich.md`; trạng thái repo nằm ở `docs/trang-thai-hien-tai-2026-11-26.md`.
>
> **Snapshot:** HEAD `5a4a286` (`chore/sync-main-class-flow`). Chỉ đọc/git object (`git ls-remote`,
> `git fetch` object/ref, `git show`, `git grep`, `git diff`), **không checkout/merge/commit**, không chạy
> DB/build. Working tree hiện tại có **2 thay đổi liên quan BE**: `backend/APIGateway/.../application.yml`
> thêm route `/api/students/**` và `docker-compose.yml` thêm `PEOPLE_SERVICE_URL: http://people-service:8082`
> (đều có từ slice Học sinh; không tính là "chưa có" ở đây).
>
> Nguyên tắc khi port: `main` là chuẩn khảo sát; FE giữ Astryx, **không copy nguyên FE main**; BE port có
> chọn lọc, kiểm tra migration/contract; **không đổi build/lint/CI**; chỉ DB local, **không xóa/reset dữ liệu**.
> Chưa chốt thì ghi "Cần chốt", không tự suy.

## 0. Tóm tắt nhanh

| Nhóm BE | Có trên ref nào | Ở working tree hiện tại | FE có thể làm ngay? |
|---|---|---|---|
| Identity: module toggle/lock, permission/role catalog, password policy, rate limit, JWT scopes, error code | `origin/main` (＝ `origin/fixFlowCreateEmployee`) | Chưa có | Có: màn module, account, login/đổi mật khẩu, ánh xạ permission code |
| Gateway: 19 route bổ sung (main có 30, HEAD có 11) + CORS + env | `origin/main` | Chỉ có route `/api/students/**` (chưa commit); Schedule/Facility chưa có route | Có, nhưng phải port route/config cùng BE |
| People: danh mục môn + `roomRequirement` + confirm sửa môn | **chỉ** `origin/feature/auto-schedule-subject-category` | Chưa có | Chờ **S6/S7** (dữ liệu nền & port BE) |
| People: `/internal/**`, `plannedSessions`, Student/Class/Curriculum/ClassSubject | `origin/main` và các ref khác | **Đã có** (zero diff) | Không phải gap; dùng contract hiện tại |
| Schedule: CRUD lịch, `/schedules/me`, auto-generate (greedy), impacts, room-suggestions, inbox/outbox consumer | `origin/main` | Chưa có (mới `ScheduleController`/`DepartmentScheduleController` cơ bản) | Có cho CRUD/room picker/impacts; **không bật submit auto** (P4 BLOCKED) |
| Facility: phòng/thiết bị/sự cố CRUD, outbox replay, internal rooms | `origin/main` | Chưa có | Có; room-type/org-wide chỉ có trên nhánh feature |
| Room-type + `SchoolClock`/timezone | `origin/feature/auto-schedule-room-type`, `subject-category` | Chưa có | Chờ đối chiếu D7/S7 (auto-schedule vẫn lấy phòng theo phòng ban) |
| Timezone (nhánh tên `*-timezone`) | `origin/feature/auto-schedule-timezone` | — | **Không có BE mới**, chỉ thêm 1 file doc; bỏ qua |
| Build aggregator `backend/pom.xml` | `origin/auth` (cũ hơn main) | Chưa có | Không ảnh hưởng FE; không tự đổi build |

## 1. Ma trận ref đã rà

| Ref | Ahead vs HEAD | BE liên quan |
|---|---|---|
| `origin/main` (`8b15596`) | 75 | +81 file backend, đổi 66 file; chuẩn khảo sát |
| `origin/fixFlowCreateEmployee` (`e0fc548`) | 70 | Với mọi path trong tài liệu này **giống hệt `origin/main`** |
| `origin/feature/auto-schedule-room-type` (`a1aff14`) | 72 | = main + 3 file: `SchoolClock.java`, `ScheduleServiceRoomTest.java`, `SchoolClockTest.java`; sửa `FacilityClient/RoomInfo/ScheduleService/InternalRoomController/...` |
| `origin/feature/auto-schedule-subject-category` (`3732d53`) | 73 | = room-type + 1 commit: +7 file `src/main` + 2 file `src/test` ở PeopleService (tổng +9 so với room-type, +12 so với `main`), migration `53_people_subject_category.sql`, route gateway `/api/subject-categories/**` |
| `origin/feature/auto-schedule-timezone` (`1330b0e`) | 71 | = main + `docs/New folder/KE_HOACH_XEP_LICH_TU_DONG.md`; **không có BE** |
| `origin/auth`, `origin/backup-main` | — | Chỉ có thêm `backend/pom.xml` (build aggregator, cũ hơn main) |
| `origin/nghia/fe-sprint4`, `origin/chore/deploy-tunnel`, `origin/feature/sprint3-role-department-employee`, `origin/integration/sprint2-fe-be`, `origin/fixbug/fix-Owner-fe` | 3–35 | Không thêm file backend main-source so với HEAD; là subset cũ |
| `docs/phase-1/migrations` | — | HEAD và `origin/main` **giống hệt**; chỉ subject-category thêm migration 53 (DRAFT ONLY) |

---

## 2. IdentityService + APIGateway (`origin/main`)

Nguồn: `backend/IdentityService/src/main/java/com/mems/**`, `backend/APIGateway/src/main/resources/application.yml|properties`, `docker-compose.yml` trên `origin/main`.

### 2.1 Module của tổ chức (OWNER) — mới

File mới: `controller/OwnerModuleController.java`, `dto/ModuleToggleRequest.java`, `service/OrganizationModuleService.java`, `client/PeopleModuleClient.java`. Sửa: `controller/ModuleController.java`, `security/SecurityConfig.java`, `AccessProfileService.java`, `PeopleAuthorizationClient.java`, `dto/AccessProfile.java`.

| Method + đường dẫn gateway | Quyền | Input | Output |
|---|---|---|---|
| `GET /api/v1/organizations/my/modules` | `ROLE_OWNER` (matcher `/organizations/my/**` đặt trước wildcard), `orgId` lấy từ JWT | — | `200` danh sách `{code,name,is_core,status,is_locked_by_admin}`; `status ∈ active/disabled/locked/not_registered`; core bị ép `active` |
| `PATCH /api/v1/organizations/my/modules/{moduleCode}` | `ROLE_OWNER` | `{enabled: Boolean}` (bắt buộc) | `204` |
| `GET /api/v1/modules/status` | authenticated; `orgId` từ JWT | — | `200` `{code,name,is_core,status}` (không trả lý do lock) |

Luật: core → `MODULE_IS_CORE`; đang locked → `MODULE_LOCKED_BY_ADMIN`; trùng trạng thái → `MODULE_ALREADY_IN_STATE`; tắt `STUDENT_MANAGEMENT` mà vẫn có workflow pending → `MODULE_PENDING_WORKFLOWS` (fail-closed, gọi `GET /internal/modules/{code}/pending-count?orgId=` qua `X-Internal-Api-Key`). Audit: `MODULE_ENABLED`/`MODULE_DISABLED`.

**FE:** màn "Module tổ chức" của OWNER + hydrate menu theo `GET /modules/status`.

### 2.2 Module của tổ chức (SUPER_ADMIN) — mới

File mới: `controller/AdminModuleController.java`, `dto/ModuleLockRequest.java` (dùng chung `OrganizationModuleService`).

| Method + đường dẫn gateway | Quyền | Input | Output |
|---|---|---|---|
| `GET /api/v1/organizations/{orgId}/modules/admin` | `ROLE_SUPER_ADMIN` | — | `{code,name,is_core,status,locked_by_admin,locked_reason,locked_at,disabled_at}` |
| `PATCH /api/v1/organizations/{orgId}/modules/{moduleCode}/lock` | `ROLE_SUPER_ADMIN` | `{lock: Boolean, reason: String}` (reason bắt buộc khi lock) | `204` |

Luật: core không được lock; `reason` phải không rỗng cho **cả lock lẫn unlock**
  (`MODULE_LOCK_REASON_REQUIRED`); lock lưu `status_before_lock`; unlock chỉ khôi phục `active` khi trước
  đó đúng `active`, còn lại về `disabled`; audit `MODULE_LOCKED_BY_ADMIN`/`MODULE_UNLOCKED_BY_ADMIN`.

**FE:** màn quản trị module theo tổ chức, hiển thị lý do/thời gian lock, form lock bắt nhập reason.

### 2.3 Permission/role catalog + JWT scopes — mới/mở rộng

File mới: `service/RoleCatalog.java`, `config/RoleCatalogValidator.java`, `client/AccessProfileCache.java`. Sửa: `service/PermissionCatalog.java`, `config/IdentityDataInitializer.java`, `controller/InternalPermissionController.java`, `JwtService.java`, `dto/AccessProfile.java`, `entity/Permission.java`.

| Method + đường dẫn | Quyền | Output |
|---|---|---|
| `GET /internal/permissions` | internal-only (`X-Internal-Api-Key`) | `PermissionDefinition{code,description,moduleCode,allowedScopes}` (thay shape cũ) |
| `GET /internal/permissions/bundles` | internal-only | `BundleDefinition{code,name,description,permissions,allowedScopes}` |

Bundles: `HR_MANAGEMENT` (org+dept), `ACADEMIC_MANAGEMENT` (org), `SCHEDULE_MANAGEMENT` (org+dept), `FACILITY_MANAGEMENT` (org+dept). Scope: `ORGANIZATION`, `DEPARTMENT`.

Permission code mới (nhóm, viết tắt O=ORG, D=DEPT):
- HR/common: `employee.view/create/edit/delete/reset_password/assign_position/view_detail/resign/approve_resignation/transfer/approve_transfer`, `teacher.change_status`, `position.view/manage`, `department.view` (O+D), `department.manage`/`org.audit.view` (O).
- Students/classes (`STUDENT_MANAGEMENT`): `student.view/create/edit/delete/create_account` (O), `class.view`/`class.reopen` (O+D), `class.create/edit/delete/assign_teacher/teacher.reassign/cancel/request_close/approve_close` (O), `subject.view/manage`, `curriculum.view/manage` (O).
- Self: `student.self_view`, `class.self_view`, `schedule.self_view` (O+D).
- Schedule (`SCHEDULE_MANAGEMENT`, O+D): `schedule.view/create/edit/update/cancel_session/delete` (`edit` giữ lại cho legacy, `update` là code chuẩn Phần 7).
- Facility (`FACILITY_MANAGEMENT`, O+D): `facility.view/manage`, `facility.room.view/create/update/delete`, `facility.equipment.view/create/update/delete`, `facility.issue.report/resolve`.
- Bỏ code cũ: `FACILITY_MANAGE`, `SCHEDULE_CREATE`, `SCHEDULE_VIEW`, `PEOPLE_VIEW`, `PEOPLE_EDIT`.

`AccessProfile` thêm `permissionScopes`, `delegatedPermissions`, `stale`; JWT thêm claim tương ứng; access-token mặc định 900 → **300 giây**. `AccessProfileCache`: fresh 60s, hard 600s, tối đa 10.000 entries; lỗi PeopleService trả profile stale rỗng, **không bao giờ trả full quyền**. `IdentityDataInitializer` bỏ fallback mật khẩu `123456`, seed `SUPER_ADMIN` theo env.

**FE:** đổi map permission/nav/button sang code dotted; xử lý `permissionsStale` (refetch/đăng nhập lại); picker bundle cho chức năng gán position.

### 2.4 Mật khẩu & tài khoản — mới/đổi

File mới: `service/PasswordPolicy.java`. Sửa `SecurityConfig`, `PasswordChangeRequiredFilter`, `dto/ChangePasswordRequest.java`, `service/PasswordChangeService.java`, `AccountService.java`, `AccountProvisioningService.java`, `controller/AccountController.java`.

- Chính sách: **tối thiểu 12 ký tự và tối đa 72 byte UTF-8** (`PasswordPolicy.validate()` kiểm tra
  `password.length() < 12` rồi `getBytes(UTF_8).length > 72`; giới hạn BCrypt).
  `POST /api/v1/auth/change-password` → `204`; set `must_change_password=FALSE`, revoke refresh token.
- Mọi endpoint authenticated khác khi `mustChangePassword=true` → `403 PASSWORD_CHANGE_REQUIRED`; chỉ `change-password` và `logout` được miễn.
- `POST /api/v1/accounts` (SUPER_ADMIN): trả thêm `temporaryPassword` (24 ký tự) + header `no-store`; role chỉ trong `RoleCatalog.PLATFORM_CREATABLE`.
- `POST /api/v1/accounts/{id}/reset-password`: **đổi `204` → `200`**; có `new_password` → `{}` và bắt đổi khi login; không có → `{temporaryPassword}`.

**FE:** cờ bắt đổi mật khẩu là **JWT claim `mustChangePassword`** (`JwtService.java:36`), `LoginResponse`
chỉ có 4 field (`accessToken, refreshToken, tokenType, expiresIn`) — phải decode token, không đọc body login.
Reset-password trả **200** body phẳng `{}` hoặc `{temporaryPassword}` (request key `new_password`);
màn account hiển thị/copy mật khẩu tạm.

### 2.5 Login rate limit & refresh reuse — mới/đổi

File mới: `service/LoginAttemptService.java`. Sửa `AuthController`, `AuthService`, `IAuthService`, `RefreshTokenService`, `IRefreshTokenRepository`, `LoginRequest`.

- `POST /api/v1/auth/login`: tối đa 5 lần sai theo cặp `username|IP`, 20 lần theo username, cửa sổ/khóa 15 phút; vượt → `429 LOGIN_RATE_LIMITED`; ghi audit `LOGIN_FAILED`. Luôn chạy BCrypt (dummy hash cho user không tồn tại), bỏ backdoor.
- `POST /api/v1/auth/refresh`: tái sử dụng token đã rotate/revoke → revoke **tất cả** phiên đang hoạt động trước khi trả `401 INVALID_REFRESH_TOKEN`.

**FE:** trạng thái 429 riêng trên form login; refresh lỗi → đăng xuất toàn bộ thiết bị, không retry ngầm.

### 2.6 Org type/status + audit actor/reason — đổi

File mới: `converter/OrgTypeConverter.java`, `converter/OrganizationStatusConverter.java`. Sửa `Organization.java`, `OrganizationController`, `OrganizationApprovalService`, `OrganizationRegistrationService`, `IdentityDataInitializer`.

`PATCH .../approve|reject|suspend|reactivate` (SUPER_ADMIN): reject/suspend/reactivate nhận `{reason?}`, audit kèm `actor_account_id`; `PUT /api/v1/organizations/{id}/modules` ghi `ORG_MODULES_UPDATED` kèm danh sách module, kiểm tra org suspended/module rỗng/module unknown. Converter sửa lỗi chữ hoa/thường enum MySQL.

### 2.7 Error envelope — mới

File mới: `exception/ErrorCode.java`, `exception/AppException.java`; xóa `dto/ApiError.java`, `exception/ApiException.java`; `ApiResponse` thêm `code`. Shape: `{success, code, message, data}`. **Kiểm chứng 26/11:** `code` kiểu `String`, là **tên enum** do `AppException.getCode()` trả (`errorCode.name()`), `code:null` trên response success; số `1001`/`1006`/`1128`/`1133`/`3111`… là hằng số trong `ErrorCode`, **không** serialize ra wire. FE phải so sánh chuỗi (vd `"LOGIN_RATE_LIMITED"`), không so sánh số.

Code chính: `INVALID_KEY 1001`, `VALIDATION_ERROR 1002`, `UNAUTHENTICATED 1003`, `FORBIDDEN 1004`, `UNCATEGORIZED_EXCEPTION 1005`, `PASSWORD_CHANGE_REQUIRED 1006`; account/auth `1101–1107`, `1114–1123`, `1133–1134`; org/module `1108–1113` (gồm `USERNAME_EXISTS 1113`), `1124–1132`; validation DTO `1201–1223` (ví dụ `MODULE_LOCKED_BY_ADMIN 1128`, `MODULE_PENDING_WORKFLOWS 1130`, `LOGIN_RATE_LIMITED 1133`).

**FE:** branch theo `code` thay vì parse thông điệp tiếng Việt.

### 2.8 Gateway route & cấu hình — mới/đổi

Route mới trên `origin/main` (`StripPrefix=1` **chỉ** cho các route `/api/...` và Schedule/Facility;
các route bare `/students/**`, `/classes/**`, `/teachers/**`, `/subjects/**`, `/users/**`,
`/permission-bundles/**`, `/specialties/**`, `/transfer-requests/**`, `/notifications/**` **không** có
StripPrefix; URI `${PEOPLE_SERVICE_URL:http://localhost:8082}`):

`/permission-bundles/**`, `/students/**` (bare; working tree mới có `/api/students/**`), `/classes/**`, `/teachers/**`, `/specialties/**`, `/transfer-requests/**`, `/notifications/**`, `/users/**`, `/subjects/**`, `/api/subjects/**`, `/api/curricula/**`, `/api/classes/**` (đổi id thành `people-classes-api`), `/api/teachers/**`, `/api/specialties/**`, `/api/transfer-requests/**`, `/api/notifications/**`, `/api/delegations/**`, `/api/general-manager/**`, `/api/audit-logs/**`.
Route Schedule/Facility: `/api/departments/*/schedules/**` → `${SCHEDULE_SERVICE_URL}`, `/api/schedules/**`, `/api/departments/*/facilities/**` → `${FACILITY_SERVICE_URL}`.
Nhánh subject-category thêm `/api/subject-categories/**` → People.

CORS global: `http://localhost:*`, `http://127.0.0.1:*`, `https://*.vercel.app`, `https://final-project-psi-lemon.vercel.app`; methods `GET,POST,PUT,DELETE,PATCH,OPTIONS`; `allowCredentials=false`.
Env mới: `EUREKA_URL`, `SUPER_ADMIN_BOOTSTRAP_ENABLED/EMAIL/USERNAME/PASSWORD`, `PEOPLE_SERVICE_URL`, `SCHEDULE_SERVICE_URL`, `FACILITY_SERVICE_URL`, `TEACHER_ASSIGNMENT_MODULE_CODE`, `INTERNAL_API_KEY`.

**FE:** các màn Sprint 4 (teacher/subject/curriculum/transfer/notification/delegation/audit-log) cần route tương ứng; nếu thiếu route thì gọi 404 dù BE có endpoint.

### 2.9 Build aggregator chỉ có trên `origin/auth`

`origin/auth:backend/pom.xml` (parent `mems-backend`, modules `IdentityService`+`APIGateway`, Java 21, Spring Boot 3.5.0). Không có endpoint; **không tự đổi build/lint/CI**.

---

## 3. PeopleService — chỉ có delta thật trên nhánh subject-category

Nguồn: `origin/feature/auto-schedule-subject-category`. Trên `origin/main`, room-type, timezone, fixFlow: **không có controller/endpoint mới** so với HEAD; chỉ xóa `dto/ApiError.java` + `exception/ApiException.java` và thêm dòng config `people.teacher-assignment-module-code=${TEACHER_ASSIGNMENT_MODULE_CODE:TEACHER_ASSIGNMENT}` (alias, không đổi hành vi).

### 3.1 Danh mục môn học (mới, feature-only)

File mới: `controller/SubjectCategoryController.java`, `service/SubjectCategoryService.java`, `repository/SubjectCategoryRepository.java`, DTO `SubjectCategoryRequest/Response/StatusRequest`, `exception/SubjectUsageWarningException.java`.

| Method + đường dẫn | Quyền | Input | Output |
|---|---|---|---|
| `GET /api/subject-categories?includeInactive=false` | OWNER hoặc `subject.view`/`subject.manage` | — | `List<{id,name,active,subjectCount,createdAt,updatedAt}>` |
| `POST /api/subject-categories` | OWNER hoặc `subject.manage` | `{name}` (≤200) | `201` + object, `Location: /subject-categories/{id}` |
| `PUT /api/subject-categories/{id}` | như trên | `{name}` | object |
| `PATCH /api/subject-categories/{id}/status` | như trên | `{active: boolean}` | object |

Luật: module `STUDENT_MANAGEMENT` phải bật; trùng tên không dấu trong org → `SUBJECT_CATEGORY_EXISTS`; ngừng category giữ tham chiếu của môn cũ nhưng không gán cho môn khác; `includeInactive=true` chỉ có tác dụng với OWNER/`subject.manage`.

**FE:** CRUD category + picker trên form môn; chờ **S6/S7** mới đưa vào MVP.

### 3.2 Trường phân loại/yêu cầu phòng trên môn (feature-only)

Sửa `dto/SubjectRequest.java`, `SubjectResponse.java`, `service/SubjectService.java`, `repository/SubjectRepository.java`, `dto/SubjectUsageResponse.java`.

- `GET /subjects`, `GET /subjects/{id}` trả thêm `categoryId`, `categoryName`, `roomRequirement` (`"ANY"` cho dữ liệu cũ).
- `POST/PUT /subjects` nhận thêm `categoryId`, `roomRequirement` (`ANY`|`COMPUTER`, mặc định `ANY`), `confirm`.
- `categoryId` phải trỏ category đang active cùng org (giữ nguyên nếu category bị ngừng sau khi đã gán); sai → `SUBJECT_CATEGORY_INVALID` (2235), sai roomRequirement → `ROOM_REQUIREMENT_INVALID` (2236).
- `GET /subjects/{id}/usage` mở rộng: `classesUsingSubject/classes[]` (mirror legacy), `classSubjectsUsingSubject/classSubjects[]`, `curriculaUsingSubject/curricula[]`.

### 3.3 Confirm khi sửa môn đang dùng (feature-only) — **không phải xác nhận lịch**

`PUT /subjects/{id}` đổi `categoryId`/`roomRequirement` mà `confirm != true` và môn đang được lớp/chương trình dùng → `409 SUBJECT_USAGE_CONFIRMATION_REQUIRED` (2237):
`data.classes = [{id,name}]`, `data.curricula = [{curriculumId,code,name}]`. FE hiển thị cảnh báo rồi gửi lại PUT với `confirm=true`. Không ghi DB trước khi xác nhận.

### 3.4 Migration 53 (feature-only)

`docs/phase-1/migrations/53_people_subject_category.sql` — header **DRAFT ONLY — DO NOT RUN AUTOMATICALLY**: tạo `subject_category`, `subject.category_id`, `subject.room_requirement VARCHAR(20) DEFAULT 'ANY'` + CHECK `('ANY','COMPUTER')` + composite FK; helper idempotent `SIGNAL 45000` nếu lệch schema; precheck `51_52_precheck.sql §0j`. Không có entry ROLLBACK cho 53. Tất cả migration hiện tại vẫn DRAFT; **không tự chạy**.

### 3.5 Đã có ở HEAD — không phải gap (đã kiểm chứng zero diff)

`GET /internal/classes/{id}`, `/internal/classes/{id}/subjects`, `/internal/students/{id}/classes`, `/internal/teachers/eligible` (rule `teacher_subject.status='APPROVED'` + fallback); `plannedSessions` trong ClassSubject; SchoolClass/Student/Curriculum/ClassSubject controller+service; mirror `school_class.subject_id`. D1 vẫn **Cần chốt** dù BE có rule mặc định; `subject_category` **không phải** `specialty.category_id`.

---

## 4. ScheduleService (`origin/main`; room-type bổ sung)

Nguồn: `backend/ScheduleService/src/main/java/com/mems/**` trên các ref tương ứng. Gateway: `/api/departments/{d}/schedules/**` và `/api/schedules/**`.

### 4.1 Endpoint mới

| Method + đường dẫn gateway | Quyền | Input | Output |
|---|---|---|---|
| `GET /api/departments/{d}/schedules` | `schedule.view` (dept scope) + module readable | `from`, `to` (Instant), `classId` | `List<ScheduleResponse>`, sort `start_time` |
| `POST /api/departments/{d}/schedules` | `schedule.create` | `ScheduleRequest` | `201` + `ScheduleResponse` |
| `PUT /api/departments/{d}/schedules/{sessionId}` | `schedule.update` hoặc `schedule.edit` | `ScheduleRequest` | `ScheduleResponse` |
| `POST /api/departments/{d}/schedules/{sessionId}/cancel` | `schedule.cancel_session`/`update`/`edit` | — | `ScheduleResponse{status=cancelled}` |
| `DELETE /api/departments/{d}/schedules/{sessionId}` | `schedule.delete` | — | `204` |
| `GET /api/departments/{d}/schedules/room-suggestions` | `schedule.create` | `startTime`,`endTime`; **+`classId`** trên room-type/subject-category | `RoomSuggestionResponse`; room-type thêm `roomType` |
| `GET /api/departments/{d}/schedules/impacts` | `schedule.view` | `status` (vd `OPEN`) | `List<SessionImpactResponse>` |
| `POST /api/departments/{d}/schedules/auto-generate` | `schedule.create` + module write | `AutoScheduleRequest` | `AutoScheduleResult`, **ghi thẳng DB** |
| `GET /api/schedules/me` | `schedule.self_view` hoặc `schedule.view`; actor lấy từ JWT | `from`,`to` | `List<ScheduleResponse>` (học sinh theo lớp, giáo viên theo lịch dạy) |
| `POST /internal/events` (cổng 8083, **không qua gateway**) | `X-Internal-Api-Key` | `EventEnvelope` | `{eventId,status:"PROCESSED"}` |

`ScheduleRequest{classId,teacherId,teacherName,subjectName,roomId,startTime,endTime}`; `ScheduleResponse{id,classId,className,teacherId,teacherName,roomId,roomCode,subjectName,startTime,endTime,status,departmentId}`; `SessionImpactResponse{id,sessionId,classId,className,sourceType,sourceId,startTime,roomId,status,details,createdAt,resolvedAt}`.

### 4.2 Hợp đồng auto-schedule (greedy)

`AutoScheduleRequest{classIds[],dateFrom,dateTo,slots[{startTime,endTime}],sessionDays?}` (1=Thứ 2…7=CN; null = tất cả). `AutoScheduleResult{scheduled[],unscheduled[{classId,className,subjectName,reason}],summary{totalRequested,scheduled,unscheduled}}`; `totalRequested = số classId` (có thể nhỏ hơn tổng unscheduled khi nhiều môn cùng lớp fail).

Luật: lấy `ClassInfo` + `ClassSubjectInfo(requiredSessions,plannedSessions,sessionMinutes,...)`; fallback 1 môn `LEGACY` với `plannedSessions=1`; giáo viên = chỉ định → `/internal/teachers/eligible` → giáo viên chủ nhiệm; sắp xếp ít giáo viên nhất trước; phòng `facility.rooms(orgId,departmentId)` lọc `active`, không thiết bị hỏng, `capacity >= studentCount`; duyệt ngày × slot × giáo viên × phòng; gọi `ScheduleService.create()` ngay; xung đột `ROOM_SCHEDULE_CONFLICT` → thử phòng khác, lỗi giáo viên/lớp → bỏ slot. Chặn cứng qua lock `schedule_resource_lock` + `TEACHER_/ROOM_/CLASS_SCHEDULE_CONFLICT`.

Lý do `unscheduled` (chuỗi thực tế): lớp không tồn tại/đã hủy/kết thúc; chưa có giáo viên hoặc môn; không có giáo viên đủ điều kiện; không có phòng trong phòng ban; không có ngày hợp lệ; không đủ sức chứa; các conflict; mặc định `Không tìm được slot phù hợp`.

**Chưa khớp chốt 26/11 (mọi ref):** chưa CSP/CP-SAT/tô màu; chưa nháp → xem trước → xác nhận; chưa LLM giải thích; `plannedSessions` là tổng số buổi, không phải `sessions_per_week` (D8); `slots` do client gửi, không có bảng tiết (D10/D11); chưa `stage_no` (D9); `sessionMinutes` không được solver dùng; `roomRequirement` trên nhánh subject-category **chưa nối vào solver**. FE shell `/dao-tao/tu-dong-xep-lich` giữ submit disabled.

### 4.3 Sự cố → buổi bị ảnh hưởng (inbox, `origin/main`)

Facility phát `FacilityIncidentOpened/Resolved` → outbox → `POST /internal/events` → `inbox_event` → `ScheduleEventApplier` xử lý `ClassTeacherChanged`, `ClassStatusChanged`, `FacilityIncidentOpened/Resolved`; ghi `session_impact` `OPEN`/`RESOLVED` cho buổi **tương lai**; **không tự đổi** `teacher_id`/`room_id`, không tự hủy buổi. FE cần màn "buổi bị ảnh hưởng" + tự xử lý tay.

### 4.4 Bổ sung chỉ có trên room-type/subject-category

- `roomsOfOrg(orgId)` → `/internal/rooms?orgId=`; `roomSuggestions` lấy **mọi phòng tổ chức**, tính phòng bận trên toàn org, lọc `classId` theo sĩ số, ưu tiên phòng thường trước phòng máy; `RoomInfo.roomType`/`isComputerRoom()`; `validateRoom(...,requiredRoomType)` + `ROOM_TYPE_MISMATCH 3114`. **`create/update` vẫn truyền `null`** (comment hứa nối P6), auto-schedule vẫn dùng `facility.rooms(orgId,departmentId)`.
- `SchoolClock` (`app.timezone=Asia/Ho_Chi_Minh`): `toInstant/toLocalDate/toLocalTime/datesOfWeekday`; auto-schedule dùng clock thay UTC; `datesOfWeekday` chỉ dùng trong test. Nhánh `auto-schedule-timezone` **không có** file này.

### 4.5 Khác

Service mới: `PeopleClient`, `FacilityClient`, `AutoScheduleService`, `ScheduleEventConsumer/Applier`, `SessionImpactService`; repo `inbox/*`. DTO/error/security mới: `ApiResponse`, `EventEnvelope`, `SessionImpactResponse`, `Client*Info`, `Actor`, `OrganizationModuleGuard`, `InternalApiFilter`, `SecurityConfig`, `ErrorCode 3001–3114`. Config: `schedule.approval.enabled`, `schedule.outside-room-booking.enabled` (đều mặc định `false`, chưa implement), app.timezone (feature), `INTERNAL_API_KEY`, `PEOPLE_SERVICE_URL`, `FACILITY_SERVICE_URL`, `IDENTITY_SERVICE_URL`, `EUREKA_URL`.

Test làm rõ hành vi: `AutoScheduleServiceTest` TC-AUTO-001..009; `ScheduleEventConsumerTest` SCH-01/CLS-03/SCH-04; `ScheduleServiceRoomTest` ROOM-01..08; `SchoolClockTest` TC-TZ-001..007.

---

## 5. FacilityService (`origin/main`; room-type bổ sung)

Nguồn: `backend/FacilityService/src/main/java/com/mems/**` trên `origin/main` / room-type.

### 5.1 Endpoint mới

Tất cả `/api/departments/{d}/facilities/**`, module `FACILITY_MANAGEMENT`, actor scope theo `departmentId`:

| Method + path | Quyền thay thế | Input | Output |
|---|---|---|---|
| `GET .../facilities` | `facility.room.view`/`facility.view` | — | `List<FacilityResponse>` (legacy) |
| `GET .../facilities/rooms` | `facility.room.view`/`facility.view` | — | `List<RoomResponse>` |
| `POST .../facilities/rooms` | `facility.room.create`/`facility.manage` | `RoomRequest` | `201` + `RoomResponse` |
| `PUT .../facilities/rooms/{roomId}` | `facility.room.update`/`facility.manage` | `RoomRequest` | `RoomResponse` |
| `DELETE .../facilities/rooms/{roomId}` | `facility.room.delete`/`facility.manage` | — | `204`; `ROOM_IN_USE` nếu còn thiết bị active |
| `GET/POST .../facilities/equipment` | `facility.equipment.view|create`… | `EquipmentRequest` | `List<EquipmentResponse>` / `201` |
| `PUT/DELETE .../facilities/equipment/{equipmentId}` | `facility.equipment.update|delete`… | `EquipmentRequest` | `EquipmentResponse` / `204` |
| `GET .../facilities/issues?status=` | `facility.issue.resolve|report`, `equipment.view`, `manage` | — | `List<IssueResponse>` mới nhất trước |
| `POST .../facilities/issues` | `facility.issue.report`/`manage` | `IssueReportRequest` | `201`; thiết bị chuyển `broken` + sự cố mở |
| `POST .../facilities/issues/{issueId}/resolve` | `facility.issue.resolve`/`manage` | — | `IssueResponse`; khôi phục trạng thái trước hỏng nếu hết sự cố mở |

Internal (cổng 8084, `X-Internal-Api-Key`, **không qua gateway**): `GET /internal/rooms?orgId=&departmentId=` (departmentId bắt buộc trên main, **optional trên room-type** → trả mọi phòng org), `GET /internal/rooms/{roomId}?orgId=`.
Outbox OWNER-only (cổng 8084): `GET /outbox/events?status=&limit=50&afterId=0`, `POST /outbox/events/{eventId}/replay` (chỉ replay event `FAILED` của org).

DTO: `RoomRequest(code,name,building,floor,capacity,roomType,status)`, `RoomResponse(+id)`, `EquipmentRequest/Response`, `IssueReportRequest/Response`, `InternalRoomResponse(+brokenEquipmentCount, +roomType trên feature)`. `room_type ∈ classroom|computer_room` (mặc định `classroom`), status `active|maintenance|closed`; equipment `in_use|broken|maintenance|in_storage|retired`.
Outbox: `OutboxEventRepository/Publisher/EventRelayClient/OutboxAdminController/OutboxEventRow/Types`; publisher batch 50, maxAttempts 12, interval 5s, backoff tối đa 3600s; payload sự cố **không** gửi `description/photoUrl/reportedBy`.
Error codes `4001–4108`; config `outbox.publisher.*`, `SCHEDULE_SERVICE_URL`, `INTERNAL_API_KEY`, `IDENTITY_SERVICE_URL`, `EUREKA_URL`.

**FE:** màn phòng/thiết bị/sự cố theo department; room picker dùng `/room-suggestions`; màn OWNER replay outbox (nếu cần) chỉ gọi cổng service, không có route gateway.

---

## 6. Cái FE nên bắt đầu, cái phải chờ

**Có thể bắt đầu (contract đã có trên `origin/main`, cần port BE/route tương ứng):**
1. Identity: module OWNER/ADMIN, đổi mật khẩu cưỡng chế, account reset trả mật khẩu tạm, login 429, audit reason, map permission code/JWT scopes.
2. Schedule: CRUD lịch, lọc tuần/lớp, `room-suggestions`, `/schedules/me`, danh sách `impacts`.
3. Facility: phòng/thiết bị/sự cố CRUD + room picker.
4. Gateway/CORS: port route + env trước khi gọi FE (nếu thiếu route → 404 dù BE có).

**Chờ chốt/port (không tự làm FE):**
- Subject category + `roomRequirement` + confirm sửa môn: chỉ có trên nhánh feature, phụ thuộc **S6/S7**, migration 53 DRAFT.
- Phòng cấp tổ chức/`roomType`/`SchoolClock`: khớp D7 ở gợi ý phòng, nhưng auto-schedule vẫn lấy phòng theo phòng ban; chờ **S7** + đối chiếu contract.
- Auto-submit xếp lịch: P4 **BLOCKED** (D1, D8, D9, D10, D11, S1, S2, S3, S5, S6, S7; solver/nháp/LLM chưa có). FE shell giữ submit disabled.
- Internal endpoints (`/internal/**`, `/outbox/**`) không dành cho FE gọi trực tiếp.

**Không làm:** checkout/merge nhánh khác, chạy migration production, reset DB, đổi build/lint/CI, dùng tên gói sai quy ước (chỉ dùng Gói chuẩn / Gói doanh nghiệp (Enterprise)), tự port nguyên FE `origin/main`.

## 7. Kiểm chứng tài liệu này

- So sánh bằng `git diff --name-status HEAD..<ref>`, `git show <ref>:<path>`, `git grep <ref>`; đối chiếu endpoint bằng `@RequestMapping/@GetMapping/...` trên từng controller.
- HEAD vẫn `5a4a286`; staged rỗng; không checkout/merge/commit; file này là file mới (untracked), không xóa file nào.
- Số liệu kiểm chứng: `origin/main` +81 file backend / đổi 66; room-type +3; subject-category +12; timezone +0 BE; `docs/phase-1/migrations` HEAD＝main.
