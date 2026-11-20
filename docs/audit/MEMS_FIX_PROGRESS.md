# MEMS — Tiến độ sửa lỗi sau audit (Phase B: P0, Phase C: P1, Phase D: P2)

- **Nhánh:** `fixFlowCreateEmployee`
- **HEAD gốc khi kiểm tra:** `afbd6f597bb33a6453e36873dc389c2ec61de699`
- **Thời điểm:** 2026-11-19
- **Nguyên tắc bắt buộc:** không deploy, không sửa production, không commit/push/merge,
  không chạy migration trên database thật. Toàn bộ bằng chứng dưới đây là **test ở máy local
  (offline `./mvnw -o test`, vitest, tsc)**.
- **Tài liệu liên quan:** `docs/audit/MEMS_REAUDIT_BEFORE_FIX.md`,
  `docs/audit/MEMS_BUSINESS_DECISIONS_REQUIRED.md`,
  `docs/audit/MEMS_FINAL_REVIEW.md`.

## 1. Phase B — P0

| Mã | Trạng thái | Tóm tắt thay đổi | Bằng chứng test |
|---|---|---|---|
| AUTH-01 | FIXED_AND_TESTED (code) + NEEDS_EXTERNAL_CONFIG (tài khoản cũ) | Xoá nhánh chấp nhận `123456` trong `AuthService.login`; bỏ đoạn reset mật khẩu mỗi lần khởi động. Bootstrap SUPER_ADMIN qua biến môi trường, chỉ tạo khi chưa tồn tại, `must_change_password=1`. | `AuthServiceTest`, `IdentityDataInitializer` không còn hash cố định |
| AUTH-02 | FIXED_AND_TESTED | `LoginAttemptService`: giới hạn theo (username, IP) và username toàn cục, khoá 15 phút, 429 `LOGIN_RATE_LIMITED`; dummy BCrypt cho username không tồn tại; audit không chứa mật khẩu. | `LoginAttemptServiceTest` (5) |
| AUTH-07 | FIXED_AND_TESTED | `OrgTypeConverter`, `OrganizationStatusConverter` lưu enum chữ thường khớp cột MySQL `enum(...)`. | `OrganizationConvertersTest` (3) |
| RBAC-01 | FIXED_AND_TESTED | `PositionService.update/delete` kiểm quyền trên dữ liệu đã lưu; chặn đổi `scope`/`departmentId`; non-owner không clone ORGANIZATION. | `PositionServiceTest` |
| STU-01 | NEEDS_BUSINESS_DECISION | Chưa sửa mô hình enrollment; chờ Q1–Q2. | Không có |
| CLS-01 | FIXED_AND_TESTED | FE dùng đúng 4 trạng thái BE, bộ lọc đúng mã, bỏ chọn trạng thái khi tạo lớp. | `classes-page.test.tsx`, `my-classes-page.test.tsx` |
| TCH-01 | ALREADY_FIXED | `PUT /teachers/{staffId}/teaching-status` đã có; chỉ cập nhật README. | `TeacherServiceTest` |
| MOD-01 | FIXED_AND_TESTED | Menu Giáo viên không gate `TEACHER_MANAGEMENT`; giữ `STUDENT_MANAGEMENT` cho lớp. | `nav.test.ts`, `app-flow.test.tsx` |
| SCH-02 | NEEDS_BUSINESS_DECISION | Chờ Q3–Q4 (mô hình phòng học cấp tổ chức). | Không có |
| CC-02 | NEEDS_EXTERNAL_CONFIG | Chỉ báo cáo JWT/CORS/Gateway/Vercel; không đổi. | Không có |

## 2. Phase C — P1

| Mã | Trạng thái | Tóm tắt thay đổi | Bằng chứng test |
|---|---|---|---|
| AUTH-03 | FIXED_AND_TESTED | Phát hiện tái sử dụng refresh token → thu hồi **toàn bộ family** (`IRefreshTokenRepository.revokeAllActive`); `AccountService`/`AccountProvisioningService` thu hồi phiên khi reset mật khẩu và disable. | `RefreshTokenServiceTest` (3), `AccountServiceTest`, `AccountProvisioningServiceTest` (3) |
| AUTH-04 | NEEDS_EXTERNAL_CONFIG | Trang đăng ký đã có (ALREADY_FIXED). Quên/đặt lại mật khẩu bằng token một lần cần hạ tầng email (SMTP/worker) chưa tồn tại — không tự dựng dịch vụ ngoài. | Không có |
| AUTH-08 | FIXED_AND_TESTED | Duyệt/từ chối/tạm ngưng/kích hoạt/cập nhật module tổ chức ghi `audit_log` kèm actor (từ JWT `sub`) và lý do (`new_value` JSON). | `OrganizationApprovalServiceTest` (2) |
| RBAC-02 | FIXED_AND_TESTED | Thêm cột `position.system_code` (migration 47, idempotent). Chính sách duyệt (lớp, nghỉ việc, điều chuyển, tổng quản lý) khớp `system_code` (`DEPT_HEAD`, `GENERAL_MANAGER`), vẫn fallback theo tên cũ cho dữ liệu chưa backfill. Seeder gắn mã cho "Trưởng phòng ban". | `PositionSystemCodeTest` (4) + toàn bộ suite |
| RBAC-03 | FIXED_AND_TESTED | Assignment ORGANIZATION lọc quyền theo module **tổ chức** (`identityClient.activeModules(orgId)`), assignment DEPARTMENT theo module phòng ban. | `EffectivePermissionsServiceTest` |
| RBAC-04 | FIXED_AND_TESTED (clone) | `PositionService.clone` truyền `source.profileType()` vào `PositionRepository.save`; thêm test giữ `TEACHER`. Tạo mới qua API vẫn mặc định `GENERAL` (form không có trường này) — xem ghi chú. | `PositionServiceTest.cloneKeepsProfileType` |
| STU-02 | FIXED_AND_TESTED | Đổi trạng thái sinh viên đồng bộ tài khoản: suspend/inactive → disable, active → enable; xoá sinh viên → disable. IdentityService thêm `PATCH /internal/accounts/{id}/enable` (idempotent). | `StudentClassManagementTest` (4 mới), `AccountProvisioningServiceTest.enableActivatesAccount` |
| TCH-02 | FIXED_AND_TESTED | FE xử lý 409 `SPECIALTY_MISMATCH`: hiện danh sách lớp bị lệch, cho phép gửi lại với `confirm=true`. | `teachers-page.test.tsx` (4) |
| CLS-02 | FIXED_AND_TESTED | Yêu cầu đóng lớp báo trưởng phòng (`CLASS_CLOSE_APPROVAL`); duyệt/từ chối báo người yêu cầu kèm lý do. Luồng hủy giữ thông báo sẵn có. | `ClassStatusNotificationTest` (3) |
| CLS-03 | NEEDS_BUSINESS_DECISION | Hủy/đóng lớp chưa dọn buổi học và phân công học sinh; cần chốt hành vi (giữ lịch sử? hủy buổi tương lai?) và cơ chế outbox (CC-03) trước khi sửa. | Không có |
| CLS-04 | NEEDS_BUSINESS_DECISION | Chờ Q5 (lớp thuộc phòng ban nào, ai phụ trách). Không đổi schema khi chưa chốt. | Không có |
| SCH-01 | PARTIAL — FIXED_AND_TESTED (một phần) | `ClassScheduleInfo`/`Client.ClassInfo` thêm `closeState`; `ScheduleService.requireClass` chặn lớp đang chờ đóng/đã đóng. Đồng bộ khi **đổi giáo viên lớp** vẫn chờ outbox (CC-03) — chưa sửa. | `ScheduleServiceTest` (10), có test `rejectsClassWithClosePending` |
| HR-01 | FIXED_AND_TESTED | `MemberRepository.offboard` thay xoá cứng: thu hồi assignment, `department_member.status='RESIGNED'`; giáo viên `markResigned`; disable tài khoản cuối cùng. | `MemberServiceOffboardingTest` (2) |
| DEL-02 | FIXED_AND_TESTED | Khi nhân sự nghỉ việc hoặc bị gỡ, thu hồi toàn bộ ủy quyền đang nhận (`revokeAllForDelegate`) và ghi audit `DELEGATION_REVOKED`. | `ResignationServiceTest` (9), `MemberServiceOffboardingTest` |
| RES-01 | FIXED_AND_TESTED | Ghi DB trước, gọi Identity **cuối cùng**; disable idempotent nên retry an toàn (ghi chú trong code). | `ResignationServiceTest` (InOrder) |
| RES-03 | ALREADY_FIXED | Hộp duyệt hợp nhất `GET /users/me/approval-inbox` đã có. | `ClassApprovalInboxTest` |
| TRF-02 | FIXED_AND_TESTED (tự duyệt) | Người được chuyển không được duyệt bước SOURCE_HEAD/TARGET_HEAD/HR của chính mình (trừ bước EMPLOYEE tự xác nhận). Chính sách "một người duyệt nhiều bước" vẫn chờ Q10–Q11. | `TransferServiceTest` (18, 2 test mới) |
| CC-01 | FIXED_AND_TESTED (cache) | `IdentityClient` cache TTL 30 giây cho danh mục quyền, bundle, module active và module status; lỗi không bị cache; giới hạn 1000 entry. Circuit breaker chưa thêm (không có dependency, Maven offline). | `IdentityClientCacheTest` (3) |

## 2b. Phase D — P2 đã sửa

| Mã | Trạng thái | Tóm tắt thay đổi | Bằng chứng test |
|---|---|---|---|
| AUTH-09 | FIXED_AND_TESTED | Thêm `PasswordPolicy` (12 ký tự, tối đa 72 byte UTF-8) dùng chung cho đặt lại và đổi mật khẩu; thêm mã `PASSWORD_TOO_LONG`; sửa thông điệp `PASSWORD_TOO_SHORT` từ 8 → 12 ký tự. | `PasswordPolicyTest` (1), `AccountServiceTest` |
| FAC-01 | FIXED_AND_TESTED | `resolveIssue` chỉ khôi phục trạng thái thiết bị khi **không còn sự cố mở**, và khôi phục đúng trạng thái trước khi báo hỏng (đọc `equipment_status_log`), mặc định `in_use`. | `FacilityServiceTest` (7, 2 test mới) |
| RES-05 | FIXED_AND_TESTED | Thông báo nghỉ việc hiển thị username thay vì UUID (fallback userId khi thiếu username). | `ResignationServiceTest` (9) |
| DEL-04 | FIXED_AND_TESTED | `DelegationRepository.markExpired()` chuyển ủy quyền quá hạn sang `EXPIRED`; `DelegationService.expireDelegations()` chạy `@Scheduled` hằng ngày 00:15 (Asia/Ho_Chi_Minh), idempotent. | `DelegationExpiryTest` (1), `DelegationServiceTest` (9) |
| TRF-04 | FIXED_AND_TESTED | Hộp duyệt/lịch sử chuyển phòng nạp bước duyệt bằng một truy vấn `IN (...)` thay vì N+1 (bỏ `idsToResponses` + `steps(id)`). | `TransferWorkflowRepositoryTest` (4), `TransferServiceTest` (18) |
| CLS-02 (bổ sung) | FIXED_AND_TESTED | Sự kiện đóng/hủy lớp dùng `created_at` tăng nghiêm ngặt trong từng lớp, tránh trùng mili-giây làm sai thứ tự timeline. | `ClassLifecycleTest` |

Ghi chú thêm:

- **CC-05 (một phần):** `PasswordChangeRequiredFilter` ở IdentityService đã cho phép `change-password`/`logout`;
  ba service còn lại vẫn chặn mọi path khi `mustChangePassword` (đúng chủ đích vì không có endpoint đổi mật khẩu).
  Mã nguồn lặp giữa 4 service vẫn còn — chưa tách module chung.
- **MOD-02 (một phần):** Luồng đọc module hiện fail-open có log khi Identity không khả dụng
  (`DepartmentService.permissionModules`, `PositionService.availablePermissions`), luồng ghi vẫn
  kiểm tra catalog trước. Chưa có test chuyên biệt cho nhánh fail-open.

## 3. Phase C/D — còn chờ quyết định (không sửa mã)

| Mã | Lý do |
|---|---|
| TRF-01 | Cần chốt hạn xử lý / escalate khi yêu cầu treo (Q10–Q11) |
| TRF-03 | Cần chốt giữ hay thu hồi chức danh sau khi chuyển phòng (Q8–Q9) |
| RES-02, RES-04 | Cần chốt "cấp 1 không khả dụng" (Q12) và ngày hiệu lực/bàn giao (Q7) |
| CLS-03, CLS-04 | Xem bảng trên (hành vi dọn dữ liệu + Q5) |
| AUTH-04 | Cần hạ tầng email để gửi token đặt lại mật khẩu |

## 4. File chính đã thay đổi (P0 + P1 + P2)

### IdentityService

- `service/AuthService.java`, `config/IdentityDataInitializer.java`, `service/LoginAttemptService.java`,
  `exception/ErrorCode.java`, `controller/AuthController.java`, `security/SecurityConfig.java`
  — AUTH-01/02.
- `entity/Organization.java`, `entity/converter/OrgTypeConverter.java`,
  `entity/converter/OrganizationStatusConverter.java` — AUTH-07.
- `repository/IRefreshTokenRepository.java`, `service/RefreshTokenService.java`,
  `service/AccountService.java` — AUTH-03.
- `service/OrganizationApprovalService.java`, `controller/OrganizationController.java` — AUTH-08.
- `service/AccountProvisioningService.java`, `controller/InternalAccountController.java` — STU-02.
- `service/PasswordPolicy.java` (mới), `service/PasswordChangeService.java`,
  `exception/ErrorCode.java` — AUTH-09.

### PeopleService

- `service/PositionService.java`, `repository/PositionRepository.java` — RBAC-01/RBAC-04.
- `service/EffectivePermissionsService.java` — RBAC-03.
- `service/StudentService.java`, `client/IdentityClient.java` — STU-02, CC-01.
- `service/ClassApprovalPolicy.java`, `service/ResignationApprovalPolicy.java`,
  `repository/GeneralManagerRepository.java`, `repository/TransferRepository.java`,
  `service/DefaultPositionSeeder.java`, `service/PositionSystemCodes.java` (mới) — RBAC-02.
- `service/ClassStatusService.java`, `repository/ClassStatusRepository.java` — CLS-02.
- `service/MemberService.java`, `repository/MemberRepository.java`,
  `service/ResignationService.java` — HR-01, DEL-02, RES-01, RES-05.
- `service/TransferService.java`, `repository/TransferRepository.java`,
  `dto/TransferResponse.java` — TRF-02, TRF-04.
- `repository/DelegationRepository.java`, `service/DelegationService.java` — DEL-02, DEL-04.

### ScheduleService

- `client/ClassInfo.java`, `service/ScheduleService.java` — SCH-01 (closeState).

### FacilityService

- `service/FacilityService.java` — FAC-01.

### Frontend

- `features/academic/pages/teachers-page.tsx` (+ test) — TCH-02.
- `features/academic/pages/classes-page.tsx`, `my-classes-page.tsx`, `types.ts`, `lib/nav.ts` — P0.

### Database / tài liệu

- `47_people_position_system_code.sql` (mới) — RBAC-02. **Chưa chạy trên database nào.**
- `backend/PeopleService/src/test/resources/people-test-schema.sql` — thêm cột `system_code` cho H2.
- `.env.example`, `docker-compose.yml`, `README.md` — cấu hình bootstrap SUPER_ADMIN.

## 5. Bằng chứng test (local, offline)

| Hạng mục | Lệnh | Kết quả |
|---|---|---|
| IdentityService | `./mvnw -o test` | **59 test**, 0 failure, 0 error |
| PeopleService | `./mvnw -o test` | **269 test**, 0 failure, 0 error |
| ScheduleService | `./mvnw -o test` | **10 test**, 0 failure, 0 error |
| FacilityService | `./mvnw -o test` | **7 test**, 0 failure, 0 error |
| Frontend typecheck | `npx tsc -b` | sạch |
| Frontend lint (file đã sửa) | `npx eslint ...` | 0 error |
| Frontend test (teachers page) | `npx vitest run src/features/academic/pages/teachers-page.test.tsx` | 4/4 pass |

## 6. Việc vận hành còn lại (không thuộc mã nguồn)

1. Tài khoản cũ còn hash `123456` **vẫn đăng nhập được** cho tới khi đổi mật khẩu; không reset hàng loạt.
2. Bật `SUPER_ADMIN_BOOTSTRAP_*` trên dev/staging khi cần, tắt sau lần đăng nhập đầu.
3. Khi triển khai thật, reverse proxy phải giữ/ghi đè `X-Forwarded-For` đúng (rate limit dùng header này).
4. Migration **43–47 chưa chạy** ở bất kỳ database nào. Khi chạy: 47 chỉ thêm cột + backfill, idempotent.
5. Cache Identity TTL 30 giây: thay đổi module/quyền có thể trễ tối đa 30 giây giữa các instance.
6. Circuit breaker cho lời gọi Identity **chưa có** — khi Identity chết, PeopleService trả 503
   `IDENTITY_UNAVAILABLE` (fail-closed) chứ không treo lâu nhờ timeout 3s/5s.

## 7. Không nằm trong phạm vi / chưa làm

- Phase D (P2) mới sửa một phần — danh sách đầy đủ trạng thái 63 mã nằm ở
  `docs/audit/MEMS_FINAL_REVIEW.md`.
- STU-01, SCH-02, CLS-03, CLS-04, TRF-01, TRF-03, RES-02, RES-04, AUTH-05, AUTH-06,
  STU-04, MOD-03: chờ quyết định nghiệp vụ.
- CC-02: chỉ báo cáo, không sửa JWT/CORS/Gateway/Vercel.
- Chưa commit/push/merge/deploy; chưa chạy migration trên bất kỳ database nào.
