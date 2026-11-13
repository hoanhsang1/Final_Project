# Sprint 4 — Bản đồ chức năng ↔ file mã nguồn

Đường dẫn tính từ thư mục gốc repo. PeopleService nằm trong
`backend/PeopleService/src/main/java/com/mems/`; test nằm trong
`backend/PeopleService/src/test/java/com/mems/`.

---

## 1. Danh mục chuyên môn

| Thành phần | File |
|---|---|
| Controller | `controller/SpecialtyController.java` |
| Service | `service/SpecialtyService.java` |
| Repository | `repository/SpecialtyRepository.java` |
| DTO | `dto/SpecialtyCreateRequest.java`, `dto/SpecialtyResponse.java` |
| Chuẩn hóa tên | `service/TextNormalizer.java` |
| Test | `repository/TeacherRepositoryTest#specialtyNameIsNormalized` |

Endpoint: `GET /specialties`, `POST /specialties`.

---

## 2. Hồ sơ nhân sự & chức vụ

| Thành phần | File |
|---|---|
| Controller | `controller/DepartmentMemberController.java`, `controller/PositionController.java` |
| Service | `service/MemberService.java`, `service/PositionService.java`, `service/MembershipPolicy.java` |
| Repository | `repository/StaffProfileRepository.java`, `repository/PositionRepository.java`, `repository/MemberRepository.java` |
| DTO | `dto/MemberRequest.java`, `dto/CreatedMemberResponse.java`, `dto/PositionResponse.java`, `dto/MemberPositionsRequest.java` |
| Seed chức vụ | `service/DefaultPositionSeeder.java`, `config/DefaultPositionInitializer.java` |
| Test | `repository/StaffProfileRepositoryTest.java`, `service/DefaultPositionSeederTest.java`, `service/MembershipPolicyTest.java` |

Endpoint: `POST/PUT /departments/{id}/members`, `GET/POST/PUT /positions`.
Quy tắc: chọn chức vụ `profile_type='TEACHER'` thì bắt buộc khối `teacherProfile`.

---

## 3. Tạo / xem / sửa hồ sơ giáo viên

| Thành phần | File |
|---|---|
| Controller | `controller/TeacherController.java` |
| Service | `service/TeacherService.java` |
| Repository | `repository/TeacherRepository.java`, `repository/StaffProfileRepository.java`, `repository/SpecialtyRepository.java` |
| DTO | `dto/TeacherCreateRequest.java`, `dto/TeacherUpdateRequest.java`, `dto/TeacherDetailResponse.java`, `dto/CreatedTeacherResponse.java`, `dto/TeacherProfileRequest.java`, `dto/TeacherClassResponse.java`, `dto/TeacherHistoryResponse.java`, `dto/ClassMismatch.java` |
| Lỗi nghiệp vụ | `exception/SpecialtyMismatchException.java`, `exception/GlobalExceptionHandler.java` |
| Audit | `service/PeopleAuditService.java` (dùng lại) |
| Test | `service/TeacherServiceTest.java`, `dto/TeacherRequestValidationTest.java`, `repository/StaffProfileRepositoryTest.java` |

Endpoint: `POST /teachers`, `GET /teachers/{id}`, `PUT /teachers/{id}`.
Quy tắc: trim text, email lowercase, chống trùng mã/email, `SPECIALTY_MISMATCH` + `confirm`, `version`.

---

## 4. Danh sách & tìm kiếm giáo viên

| Thành phần | File |
|---|---|
| Controller | `controller/TeacherController.java` (`list`, `assignable`) |
| Service | `service/TeacherService.java` |
| Repository | `repository/TeacherRepository.java` (`list`, `assignable`, `appendFilters`) |
| DTO | `dto/TeacherListItem.java`, `dto/TeacherAssignableItem.java` |
| Test | `repository/TeacherRepositoryTest.java` |

Endpoint: `GET /teachers?q=&specialtyId=&teachingStatus=&page=&size=`,
`GET /teachers/assignable?q=&page=&size=`.
Quy tắc: tìm không dấu/hoa thường, escape `% _ '`, phân trang 1–100, `noClass/classLabel`.

---

## 5. Gán giáo viên cho lớp

| Thành phần | File |
|---|---|
| Controller | `controller/SchoolClassController.java` (`assignTeacher`) |
| Service | `service/SchoolClassService.java` (`assignTeacher`) |
| Repository | `repository/SchoolClassRepository.java` (`assignTeacher`, `require`), `repository/TeacherRepository.java` (`requireTeacher`, `hasTeacherPosition`) |
| DTO | `dto/ClassTeacherAssignRequest.java`, `dto/ClassTeacherInfo.java`, `dto/SchoolClassResponse.java` |
| Module guard | `service/OrganizationModuleGuard.java`, `client/IdentityClient.java` |
| Test | `service/ClassTeacherAssignmentTest.java`, `repository/SchoolClassRepositoryTest.java`, `repository/TeacherRepositoryTest.java` |

Endpoint: `PUT /classes/{id}/teacher`.
Quy tắc: lớp còn gán được, giáo viên `DANG_DAY` + có chức vụ giáo viên, module Epic 12, `version`.

---

## 6. Trạng thái lớp tự động

| Thành phần | File |
|---|---|
| Service | `service/ClassStatusService.java` (`refreshOrganization`, job `@Scheduled`) |
| Service lớp | `service/SchoolClassService.java` (gọi refresh trước khi đọc) |
| Repository | `repository/ClassStatusRepository.java`, `repository/SchoolClassRepository.java` |
| DTO | `dto/ClassStatusLogResponse.java` |
| Test | `service/ClassLifecycleTest.java` (`automaticTransitionsAreIdempotent`, `getTriggersRefresh`) |

Endpoint: `GET /classes`, `GET /classes/{id}`, `GET /classes/{id}/status-logs`.

---

## 7. Hủy lớp

| Thành phần | File |
|---|---|
| Controller | `controller/SchoolClassController.java` (`cancel`) |
| Service | `service/ClassStatusService.java` (`cancel`) |
| Repository | `repository/ClassStatusRepository.java`, `repository/SchoolClassRepository.java` |
| DTO | `dto/ClassCancelRequest.java`, `dto/SchoolClassResponse.java` |
| Test | `service/ClassLifecycleTest.java` (`cancelRequiresReason`, `cancelsFromBothAllowedStatuses`, `rejectsCancelForFinishedOrCancelledClasses`, `staleCancelDoesNotOverwrite`) |

Endpoint: `POST /classes/{id}/cancel`.

---

## 8. Đóng lớp có duyệt

| Thành phần | File |
|---|---|
| Controller | `controller/SchoolClassController.java` (`requestClose`, `approveClose`, `rejectClose`, `reopen`, `closeEvents`) |
| Service | `service/ClassStatusService.java` |
| Repository | `repository/ClassStatusRepository.java` (`insertCloseEvent`, `closeEvents`, cập nhật `close_state`) |
| DTO | `dto/ClassCloseRequest.java`, `dto/ClassCloseRejectRequest.java`, `dto/ClassReopenRequest.java`, `dto/ClassCloseEventResponse.java` |
| Test | `service/ClassLifecycleTest.java` (`closeApproveAndReopenWorkflow`, `rejectCloseRequiresReason`, `closeRulesAreEnforced`, `requesterCannotApproveOwnRequest`, `closedClassIsReadOnly`) |

Endpoint:

- `POST /classes/{id}/close-requests`
- `POST /classes/{id}/close-requests/approve`
- `POST /classes/{id}/close-requests/reject`
- `POST /classes/{id}/reopen`
- `GET /classes/{id}/close-events`

---

## 9. Danh sách / chi tiết lớp

| Thành phần | File |
|---|---|
| Controller | `controller/SchoolClassController.java` |
| Service | `service/SchoolClassService.java` |
| Repository | `repository/SchoolClassRepository.java`, `repository/StudentRepository.java` |
| DTO | `dto/SchoolClassRequest.java`, `dto/SchoolClassUpdateRequest.java`, `dto/SchoolClassResponse.java` |
| Test | `repository/SchoolClassRepositoryTest.java`, `service/ClassLifecycleTest.java`, `service/StudentClassManagementTest.java` |

Endpoint: `GET /classes`, `GET /classes/{id}`, `POST /classes`, `PUT /classes/{id}`, `DELETE /classes/{id}`.
Quy tắc: `selectable=true`, lớp `CLOSED` chỉ xem, `version` khi sửa.

---

## 10. Phân quyền, module và bảo mật

| Thành phần | File |
|---|---|
| Catalog quyền | `backend/IdentityService/src/main/java/com/mems/service/PermissionCatalog.java` |
| Gán quyền OWNER | `backend/IdentityService/src/main/java/com/mems/config/IdentityDataInitializer.java` |
| Quyền hiệu lực | `backend/IdentityService/src/main/java/com/mems/service/AccessProfileService.java`, `backend/PeopleService/src/main/java/com/mems/service/EffectivePermissionsService.java` |
| Module tổ chức | `backend/IdentityService/.../controller/InternalOrganizationController.java`, `backend/PeopleService/.../service/OrganizationModuleGuard.java`, `backend/PeopleService/.../client/IdentityClient.java` |
| Actor từ JWT | `backend/PeopleService/src/main/java/com/mems/security/Actor.java` |
| Test | `security/PermissionEnforcementTest.java`, `security/ClassLifecyclePermissionTest.java`, `service/StudentClassManagementTest.java`, `service/DepartmentModuleTest.java` |

Endpoint nội bộ: `GET /internal/orgs/{orgId}/modules`, `GET /internal/users/{userId}/authorization`.

---

## 11. Gateway

| Thành phần | File |
|---|---|
| Route | `backend/APIGateway/src/main/resources/application.yml` |
| Cấu hình chung | `backend/APIGateway/src/main/resources/application.properties` |
| Test tay | `docs/sprint4-manual-scenario.http` |

Route mới: `/teachers/**`, `/specialties/**`, `/classes/**` và alias `/api/...` (StripPrefix=1).
URI đọc từ `PEOPLE_SERVICE_URL`, `IDENTITY_SERVICE_URL`, `EUREKA_URL`.

---

## 12. Database

| File | Nội dung |
|---|---|
| `13_people_sprint4.sql` | Bảng/cột Sprint 4 cho People DB, backfill trạng thái |
| `14_identity_sprint4_permissions.sql` | 5 quyền `CLASS_*` mới |
| `15_sprint4_sample.sql` | Dữ liệu mẫu dev/test, idempotent |
| `06_identity_department_access.sql` | Điều kiện cần: `must_change_password`, `provisioned_by` |

---

## 13. Test & tài liệu

| File | Nội dung |
|---|---|
| `service/TeacherServiceTest.java` | Nghiệp vụ hồ sơ giáo viên, `SPECIALTY_MISMATCH`, audit |
| `dto/TeacherRequestValidationTest.java` | Validate form theo trường |
| `repository/StaffProfileRepositoryTest.java` | Trùng mã/email, UNIQUE, optimistic lock |
| `repository/TeacherRepositoryTest.java` | Tìm kiếm, lọc, phân trang, escape, cách ly |
| `service/ClassTeacherAssignmentTest.java` | Gán giáo viên |
| `service/ClassLifecycleTest.java` | Trạng thái, hủy, đóng/mở lớp |
| `security/PermissionEnforcementTest.java` | 401/403 |
| `security/ClassLifecyclePermissionTest.java` | Quyền từng thao tác vòng đời lớp |
| `docs/sprint4-api.md` | Đặc tả API cho FE |
| `docs/sprint4-fe-handoff.md` | Hướng dẫn FE làm giao diện |
| `docs/sprint4-ac-matrix.md` | Ma trận AC-15 → AC-19 |
| `docs/sprint4-migration.md` | Migration & chạy local |
| `docs/sprint4-manual-scenario.http` | Kịch bản thử tay |
| `docs/sprint4-implementation-report.md` | Báo cáo triển khai |
