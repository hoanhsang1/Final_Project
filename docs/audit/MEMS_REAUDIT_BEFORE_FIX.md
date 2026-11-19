# MEMS — Re-audit trước khi sửa (63 vấn đề)

Ngày kiểm tra lại: 2026-11-19
Nhánh: `fixFlowCreateEmployee`
HEAD: `afbd6f597bb33a6453e36873dc389c2ec61de699`
Trạng thái git khi kiểm: có thay đổi chưa commit từ đợt audit trước (không commit/push/merge trong đợt này).
Cách kiểm: đọc trực tiếp source trên working tree (không dùng git HEAD), đối chiếu chéo FE ↔ BE ↔ SQL trong repo. Không chạy DB thật.

Trạng thái:
- `CONFIRMED` — lỗi còn tồn tại trong source hiện tại.
- `ALREADY_FIXED` — đã được xử lý trong working tree.
- `NEEDS_VERIFICATION` — cần schema/cấu hình/môi trường để kết luận.
- `NEEDS_BUSINESS_DECISION` — không tự sửa khi chưa có quyết định nghiệp vụ.
- `OUT_OF_SCOPE` — bị loại khỏi phạm vi đợt này theo yêu cầu.

> Ghi chú quan trọng: đợt audit trước (báo cáo `docs/FINAL_REPORT_MEMS_AUDIT_FIXES_2026-11-19.md`) đã sửa một phần **TCH-01, RES-03, CLS-02 (danh sách chờ), MOD-01 (lớp), AUTH-04 (trang đăng ký)**. Các phần còn lại của những mã này vẫn `CONFIRMED`.

## 1. Bảng xác minh

| Mã | Mức | Nhận định trong báo cáo | Trạng thái xác minh | File liên quan | Hướng xử lý |
|---|---|---|---|---|---|
| AUTH-01 | Nghiêm trọng | Mật khẩu cửa hậu `123456` + ghi đè mật khẩu admin mỗi lần khởi động | CONFIRMED | `IdentityService/.../service/AuthService.java:116`; `config/IdentityDataInitializer.java:79` | P0: xoá cả hai; bootstrap qua env một lần; bắt đổi mật khẩu; test hồi quy |
| AUTH-02 | Cao | Không giới hạn đăng nhập sai | CONFIRMED | `controller/AuthController.java:44-49`; `exception/ErrorCode.java` | P0: throttle IP+username, khoá tạm, audit, response trung tính |
| AUTH-03 | Trung bình | Không phát hiện reuse refresh token; reset mật khẩu không thu hồi phiên | CONFIRMED | `RefreshTokenService.java:62-81`; `AccountService.java:239-246`; `AccountProvisioningService.java:47-48` | P1: dùng `replaced_by`, thu hồi token family; revoke khi reset/disable |
| AUTH-04 | Trung bình | Thiếu quên/đặt lại mật khẩu; trang đăng ký FE chưa có | CONFIRMED (trang đăng ký ALREADY_FIXED) | `AuthController.java`; `PasswordController.java`; `frontend/.../register-page.tsx` | P1: forgot/reset qua token một lần + adapter email (chưa có hạ tầng) |
| AUTH-05 | Trung bình | Chủ tổ chức duy nhất, không chuyển giao/khôi phục | CONFIRMED | `OrganizationRegistrationService.java:456-510` | P2 + quyết định nghiệp vụ Q15 |
| AUTH-06 | Trung bình | Tên role không thống nhất; initializer không seed ORG_OWNER | CONFIRMED | `IdentityDataInitializer.java:29`; `OrganizationRegistrationService.java:456-467`; `frontend/src/types/session.ts:5-11` | P2: chốt bộ role, migrator tương thích |
| AUTH-07 | Trung bình | Enum UPPERCASE ghi vào cột MySQL enum lowercase | CONFIRMED | `entity/Organization.java:159-161`; `DB_11_16.sql:925` (`enum('pending',...)`); `AuthService.java:96` | P0: converter lowercase ở tầng JPA; test đăng ký→duyệt→login |
| AUTH-08 | Trung bình | Audit duyệt/từ chối không lưu actor và lý do | CONFIRMED | `OrganizationApprovalService.java:254,296,318,340,378`; `OrganizationController.java:68-74` | P1: lấy sub từ JWT, lưu reason, trả cho owner |
| AUTH-09 | Thấp | Chính sách mật khẩu không đồng nhất | CONFIRMED | `ChangePasswordRequest.java:8`; `AccountService.java:236,251` | P2: một PasswordPolicy + SecureRandom đủ mạnh |
| AUTH-10 | Trung bình | Đổi role ở Identity không đồng bộ People | CONFIRMED | `AccountService.java:224-225`; `frontend/.../accounts-page.tsx:42` | P2: nguồn sự thật role; dọn danh mục FE |
| AUTH-11 | Trung bình | Login phụ thuộc cứng PeopleService, không cache | CONFIRMED | `AccessProfileService.java:23`; `PeopleAuthorizationClient.java:20-28` | P2: cache ngắn hạn/flag stale; không fail-open quyền |
| RBAC-01 | Cao | Sửa chức danh dùng scope/department từ request | CONFIRMED | `PositionService.java:51-54,189-202`; `validateRequest:144-155`; `clone:81,106` | P0: kiểm theo dữ liệu đã lưu; chặn template/khác phòng; test ma trận |
| RBAC-02 | Cao | Logic gắn cứng tên chức danh | CONFIRMED | `GeneralManagerService.java:30`; `ResignationApprovalPolicy.java:31-32`; `ClassApprovalPolicy.java:31`; `TransferService.java:34-35` | P1: thêm `system_code`/`is_head`, truy vấn theo mã |
| RBAC-03 | Trung bình | Quyền ORGANIZATION bị lọc theo module phòng ban người giữ | CONFIRMED | `EffectivePermissionsService.java:148,159-161,176-180` | P1: ORGANIZATION lọc theo module tổ chức; DEPARTMENT theo phòng |
| RBAC-04 | Trung bình | Tạo/nhân bản chức danh mất `profileType` | CONFIRMED | `PositionRequest.java:4-15`; `PositionRepository.java:92-113`; `PositionService.clone` | P1: thêm profileType vào request/response/save/clone |
| RBAC-05 | Trung bình | Quyền JWT là ảnh chụp 15 phút | CONFIRMED | `JwtService.java:17-20`; `DelegatedAuthorityFilter.java:56-64`; `MembershipPolicy.java:39-40` | P2: `authz_version`/TTL ngắn + authorizer chung |
| RBAC-06 | Thấp | Role MANAGER/STAFF còn sót | CONFIRMED | `MembershipPolicy.java:67-68`; `employee-create-drawer.tsx:231,238` | P2: bỏ ràng buộc theo role, dùng quyền/phạm vi |
| RBAC-07 | Thấp | Mã quyền FE không có trong catalog BE | CONFIRMED (teacher.change_status đã thêm) | `frontend/src/lib/permissions.ts:34-96`; `PermissionCatalog.java:52` | P2: contract test FE ⊆ BE; sửa menu ủy quyền |
| STU-01 | Cao | Mỗi sinh viên chỉ 1 lớp vĩnh viễn; lớp kết thúc không gỡ được | CONFIRMED | `SchoolClassRepository.java:362-372`; `SchoolClassService.java:245-265`; `DB_11_16.sql:124` | P0 một phần: thiết kế enrollment; chính sách 1/nhiều lớp chờ Q1–Q2; không đổi dữ liệu theo giả định |
| STU-02 | Trung bình | Đình chỉ/xoá sinh viên không vô hiệu tài khoản | CONFIRMED | `StudentService.java:82-98,139-148`; `IdentityClient.java:114,118` | P1: disable/enable account theo trạng thái |
| STU-03 | Thấp | Tìm kiếm sinh viên/lớp không bỏ dấu | CONFIRMED | `StudentRepository.java:64`; `SchoolClassRepository.java:110-115` | P2: dùng `TextNormalizer`/cột unaccented |
| STU-04 | Thấp | Trùng mã tính cả bản ghi xoá mềm | CONFIRMED | `StudentRepository.java:120-128`; `SchoolClassRepository.java:260-268` | P2 + quyết định tái sử dụng mã (Q… ) |
| TCH-01 | Cao | Trạng thái giáo viên lệch FE–BE, không API đổi | ALREADY_FIXED (PUT, không phải PATCH) | `TeacherService.java:98-121`; `TeacherController.java:73-79`; `academic/types.ts:235-237` | Giữ; bổ sung test đã có |
| TCH-02 | Trung bình | Khớp chuyên môn bằng tên; FE không xử lý confirm | CONFIRMED | `TeacherRepository.java:74-83,278-300`; `teachers-page.tsx:80-110` | P1: FE xử lý 409 + `confirm=true`; liên kết có cấu trúc theo Q16 |
| CLS-01 | Cao | Trạng thái lớp lệch FE–BE; form tạo bỏ qua trạng thái | CONFIRMED | `classes-page.tsx:149,1001-1002`; `academic/types.ts:209-210`; `SchoolClassRepository.java:315-325`; `SchoolClassService.java:103-108` | P0: chỉ dùng 4 trạng thái BE; bỏ trạng thái khỏi form tạo |
| CLS-02 | Cao | Thiếu thông báo; không có danh sách chờ duyệt | CONFIRMED (inbox ALREADY_FIXED) | `ClassStatusService.java:188-245`; `ApprovalCapabilityController.java:60-69` | P1: notification người duyệt/người yêu cầu |
| CLS-03 | Trung bình | Huỷ/đóng lớp không xử lý buổi học, sinh viên | CONFIRMED | `ClassStatusService.java:87-141`; không có Schedule client ở People | P1: event/outbox ClassStatusChanged |
| CLS-04 | Trung bình | Lớp không có phòng ban; 3 định nghĩa “phòng phụ trách” | CONFIRMED | `SchoolClassRepository.java:388-407`; `ClassApprovalPolicy.java:94-111`; schema `school_class` | P1 + quyết định Q5 |
| SCH-01 | Cao | Lịch không đồng bộ khi lớp/giáo viên đổi; lớp CLOSED vẫn xếp được | CONFIRMED | `ScheduleService.java:89-94,253-255`; `ClassStatusRepository.java:151-156`; `ClassScheduleInfo.java` | P1: đọc giáo viên hiện tại hoặc outbox; thêm closeState |
| SCH-02 | Cao | Phòng thuộc phòng ban CSVC nhưng lịch xếp theo phòng khác | CONFIRMED | `FacilityService.java:218-246`; `ScheduleService.java:157-178,270-282` | Chặn bởi quyết định Q3–Q4; không đổi DB/quyền |
| SCH-03 | Trung bình | Không xác thực giáo viên được chỉ định; thiếu khoá lớp | CONFIRMED | `ScheduleService.java:243-248,259-268,309-312` | P2: xác thực qua People, khoá lớp, validate thời lượng |
| SCH-04 | Trung bình | Sự cố sau xếp lịch không ảnh hưởng buổi học | CONFIRMED | `ScheduleService.java:270-282`; `FacilityService.java:177-194` | P2: truy vấn buổi bị ảnh hưởng + thông báo |
| SCH-05 | Thấp | Điểm danh/đổi lịch/lịch lặp chưa triển khai | OUT_OF_SCOPE | `nav.ts:395-411`; `app.tsx:334-365` | Không phát triển trong đợt này |
| FAC-01 | Trung bình | resolveIssue luôn đặt `in_use` | CONFIRMED | `FacilityService.java:197-213` | P2: khôi phục trạng thái trước khi không còn sự cố mở |
| FAC-02 | Thấp | Thiếu trạng thái/người phụ trách/mức độ sự cố | CONFIRMED | `DepartmentFacilityController.java:122-141`; `IssueReportRequest.java:6-8` | P2: PATCH status, assignee, severity, notification |
| HR-01 | Cao | Gỡ nhân sự bỏ qua offboarding | CONFIRMED | `MemberService.java:131-140`; `MemberRepository.java:173-176` | P1: OffboardingService hợp nhất, không xoá cứng |
| HR-02 | Trung bình | Mật khẩu tạm trả trong response | CONFIRMED | `MemberService.java:69,126-128`; `ResetPasswordResponse.java` | P2: link kích hoạt hoặc che/log policy |
| HR-03 | Thấp | Mã NV MAX+1 không khoá; FE bắt nhập | CONFIRMED | `StaffProfileRepository.java:51-58`; `employee-create-drawer.tsx:114,297` | P2: sequence/retry; bỏ ô nhập FE |
| HR-04 | Trung bình | Gỡ chức danh TEACHER không xét lớp đang dạy | CONFIRMED | `MemberService.java:88-92`; `TeacherRepository.java:64-71` | P2: cảnh báo + hook phân công lại |
| MOD-01 | Cao | Mã module FE–BE–catalog không khớp | CONFIRMED (lớp đã sửa) | `modules.ts:5-11`; `DepartmentService.java:191-207`; `nav.ts:337`; `SchoolClassService.java:66+` | P0 một phần: menu giáo viên theo module đúng; loại mã không tồn tại; contract test |
| MOD-02 | Thấp | fail-open/fail-closed không nhất quán | CONFIRMED | `DepartmentService.java:180-189`; `PositionService.java:167-172` | P2: ghi fail-closed, đọc fail-open có kiểm soát |
| MOD-03 | Thấp | Kiểm tra workflow chờ gần như mã chết; FACILITY không kiểm | CONFIRMED | `OrganizationModuleService.java:44,263-267`; migration 28 | P2 + quyết định Q (module lõi/sự cố mở) |
| DEL-01 | Trung bình | Audit dùng quyền ủy quyền bỏ sót luồng duyệt policy | CONFIRMED | `DelegationUsageInterceptor.java:65-77`; `ResignationController.java:47-54` | P2: policy ghi audit kèm delegationId |
| DEL-02 | Trung bình | Không thu hồi ủy quyền khi GM nghỉ/bị gỡ | CONFIRMED | `ResignationService.java:31`; `MemberService.remove`; `EffectivePermissionsService.java:124-141` | P1: thu hồi trong offboarding; kiểm GM còn hiệu lực |
| DEL-03 | Thấp | DelegatedPermissions lẫn quyền chức vụ | CONFIRMED | `EffectivePermissionsService.java:190-197`; `DelegatedAuthorityFilter.java:60-64` | P2: chỉ đánh dấu quyền không đến từ chức vụ |
| DEL-04 | Thấp | Thiếu EXPIRED/chống chồng lấn | CONFIRMED | `DelegationService.java:62-105`; `31_…sql:101-120` | P2: scheduler + validate overlap |
| RES-01 | Trung bình | Gọi Identity trong transaction, không bù trừ | CONFIRMED | `ResignationService.java:150-158` | P1: DB trước/outbox, disable idempotent |
| RES-02 | Trung bình | “Cấp 1 không khả dụng” không xác định | CONFIRMED / NEEDS_BUSINESS_DECISION | `ResignationApprovalPolicy.java:62-87,134-147` | P1–P2 + quyết định Q12 |
| RES-03 | Trung bình | Thiếu hộp duyệt tổng hợp | ALREADY_FIXED | `ApprovalCapabilityController.java:60-69`; `approvals-page.tsx:72,177-178` | Giữ; bổ sung badge khi cần |
| RES-04 | Trung bình | Không có ngày hiệu lực/bàn giao | CONFIRMED / NEEDS_BUSINESS_DECISION | `ResignationService.java:150-158`; `31_…sql:84-97` | P2 + quyết định Q7 |
| RES-05 | Thấp | Thông báo dùng UUID | CONFIRMED | `ResignationService.java:130,169` | P2: dùng họ tên + mã NV |
| TRF-01 | Trung bình | Yêu cầu điều chuyển treo vĩnh viễn | CONFIRMED | `TransferService.java:37-43`; `canDecide` | P1 + quyết định Q10–Q11 |
| TRF-02 | Trung bình | Không chặn tự duyệt/nhiều bước | CONFIRMED | `TransferService.java:274-288` | P1 + chính sách khác người duyệt |
| TRF-03 | Trung bình | Sau chuyển phòng mất hết chức danh | CONFIRMED | `MemberRepository.java:126-148`; `TransferService.java:228` | P1 + quyết định Q8–Q9 |
| TRF-04 | Thấp | Hộp duyệt N+1 | CONFIRMED | `TransferService.java:72-78`; `TransferRepository.java:195-198` | P2: lọc SQL + phân trang |
| CC-01 | Cao | Gọi Identity quá nhiều | CONFIRMED | `EffectivePermissionsService.java:149-151`; `MemberRepository.java:34,43`; `OrganizationModuleGuard.java:46-79` | P1: cache TTL + batch + circuit breaker |
| CC-02 | Cao | Bảo mật liên service dùng chung secret HS256 | CONFIRMED | `application.properties` 4 service; `SecurityConfig`; `InternalApiFilter`; `CorsConfig` | Báo cáo cấu hình; không tự đổi thuật toán/CORS/gateway |
| CC-03 | Trung bình | Không có outbox/sự kiện | CONFIRMED | toàn backend | P2: outbox + event nội bộ |
| CC-04 | Trung bình | Sơ đồ URL không thống nhất | CONFIRMED | controllers; `frontend/src/lib/http.ts`; APIGateway yml | P2: chuẩn `/api/v1/{service}`, OpenAPI |
| CC-05 | Trung bình | Mã nguồn lặp 4 service; filter chặn mọi path | CONFIRMED | `ApiResponse`×4, `PasswordChangeRequiredFilter`; `SecurityConfig.java:32` | P2: mems-common theo bước; sửa `Set.of()` |
| CC-06 | Trung bình | Chủ tổ chức không đọc được nhật ký | CONFIRMED | `PeopleAuditService.java:15-20`; `AuditLogService.java:115-121` | P2: API audit + quyền `org.audit.view` |
| CC-07 | Thấp | Response thành công không envelope | CONFIRMED (đã ghi docs/api.md) | `ApiResponse.java`; controllers | P2: giữ tương thích, tài liệu hoá |
| CC-08 | Thấp | Token trong localStorage | CONFIRMED | `token-storage.ts:6-36` | P2: đánh giá cookie HttpOnly; không đổi CORS |
| AUTH-07 (Q) | — | Cần xác minh schema | → CONFIRMED (đã có schema DB_11_16.sql) | `DB_11_16.sql:925` | Xem AUTH-07 |

## 2. Tổng hợp theo trạng thái

| Trạng thái | Số mã |
|---|---|
| CONFIRMED | 55 |
| ALREADY_FIXED | 3 (TCH-01, RES-03, phần register của AUTH-04) |
| NEEDS_BUSINESS_DECISION / chặn một phần | 6 (STU-01, SCH-02, RES-02, RES-04, TRF-01/02/03 một phần, AUTH-05, STU-04) |
| OUT_OF_SCOPE theo yêu cầu | 1 (SCH-05) |

Không có mã nào được đánh dấu hoàn thành chỉ vì đã có tài liệu.

## 3. Điểm đã sửa từ đợt trước (đối chiếu nhanh)

- `teacher.change_status`: có trong `PermissionCatalog`, `PUT /teachers/{id}/teaching-status`, FE dùng đúng → TCH-01 coi là đã xử lý.
- Hộp duyệt hợp nhất `GET /users/me/approval-inbox` đã có → RES-03 đã xử lý; CLS-02 chỉ còn thiếu notification.
- FE trang đăng ký tổ chức đã có → AUTH-04 chỉ còn forgot/reset.
- Module lớp đã chuyển sang `STUDENT_MANAGEMENT`; menu giáo viên vẫn còn `TEACHER_MANAGEMENT` → MOD-01 còn phần giáo viên.

## 4. Việc tiếp theo

P0 sửa ngay trong đợt này: AUTH-01, AUTH-02, AUTH-07, RBAC-01, CLS-01, MOD-01 (phần giáo viên), và phần an toàn của STU-01 (không đổi chính sách).
Các mã chờ quyết định: STU-01 (1 hay nhiều lớp), SCH-02 (phòng cấp tổ chức), RES-02/RES-04, TRF-01/02/03, AUTH-05, STU-04.
CC-02 chỉ báo cáo cấu hình cần đổi, không sửa JWT/CORS/Gateway trong đợt này.
