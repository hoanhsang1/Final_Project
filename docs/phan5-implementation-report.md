# PHẦN 5 — Học sinh & Lớp học (quy tắc 12, 13, 14, 17)

Báo cáo triển khai backend + frontend, đối chiếu DoD, kèm bản đồ file và các điểm chưa chốt.

## 1. Tóm tắt

- Gộp quyền quản lý đào tạo học sinh thành bundle `ACADEMIC_MANAGEMENT` gồm `student.*` và `class.*`; tách riêng `student.create` (tạo hồ sơ) và `student.create_account` (tạo tài khoản đăng nhập).
- Tài khoản học sinh chỉ được tạo từ hồ sơ có sẵn, qua PeopleService → Identity `/internal/accounts` với role `STUDENT` + mật khẩu tạm. Không có luồng học sinh tự đăng ký.
- Vòng đời lớp: `CHUA_BAT_DAU → DANG_DIEN_RA → DA_KET_THUC`, thêm `DA_HUY` (đã có) và trạng thái yêu cầu hủy `cancel_state` (NONE/PENDING). Mở lại lớp đã đóng không cần duyệt.
- Đóng lớp: người có `class.request_close` gửi yêu cầu; trưởng phòng phụ trách module đào tạo (`class.approve_close`) duyệt/từ chối. Đóng chỉ gắn nhãn, không xóa dữ liệu.
- Hủy lớp: lớp rỗng hủy trực tiếp; lớp còn học sinh phải qua duyệt của trưởng phòng.
- Gán giáo viên: đối chiếu tên môn của lớp với danh sách chuyên môn giáo viên dạy; giáo viên phải đang hoạt động và thuộc đúng một phòng ban.
- Giáo viên chuyển phòng/nghỉ việc: giữ nguyên lớp, gắn nhãn `needs_reassignment`, thông báo người quản lý lớp; gán lại giáo viên bằng `class.teacher.reassign` sẽ xóa nhãn.
- Frontend: màn Sinh viên (hồ sơ/tài khoản), Lớp học (môn học, lọc "cần phân công lại", hủy/duyệt hủy, tab học sinh), cổng tự phục vụ `/hoc-sinh` cho tài khoản STUDENT.

## 2. Migration & quyền

| File | Nội dung |
| --- | --- |
| `24_identity_student_class_permissions.sql` | Thêm `student.create_account`, `class.teacher.reassign`; quyền SELF `student.self_view`, `class.self_view`, `schedule.self_view`; gắn vào bundle `ACADEMIC_MANAGEMENT`; cấp cho OWNER/ORG_OWNER/SUPER_ADMIN toàn bộ quyền mới, chỉ cấp 3 quyền SELF cho role `STUDENT`. Idempotent. |
| `24_people_student_class_workflow.sql` | `student.account_username`, `student.account_created_at`; `school_class.cancel_state` (CHECK NONE/PENDING), `school_class.cancel_request_reason`; nới CHECK action của `class_close_event` thêm `CANCEL_REQUESTED/CANCEL_APPROVED/CANCEL_REJECTED`. Không xóa dữ liệu. |
| `15_sprint4_sample.sql` | Bổ sung dữ liệu mẫu SV001–SV005 và gán vào lớp mẫu để thử luồng hủy lớp có học sinh. |

Cột `needs_reassignment` / `reassignment_reason` đã có từ migration 23 (Phần 4) nên Phần 5 tái sử dụng, không thêm cột trùng.

## 3. API mới/đổi (PeopleService)

### Học sinh

| Method | Path | Quyền | Ghi chú |
| --- | --- | --- | --- |
| `POST` | `/students/{id}/account` | `student.create_account` | Tạo tài khoản từ hồ sơ; trả username + mật khẩu tạm; bắt buộc hồ sơ có email; chặn tạo trùng. |
| `GET` | `/students/me` | `student.self_view` | Chỉ hồ sơ của chính actor, lọc theo `org_id` trong JWT. |
| `GET` | `/students/me/classes` | `student.self_view` | Lớp hiện tại của chính actor. |

### Lớp học

| Method | Path | Quyền | Ghi chú |
| --- | --- | --- | --- |
| `GET` | `/classes?needsReassignment=true` | `class.view` | Lọc lớp đang gắn nhãn cần phân công lại. |
| `PUT` | `/classes/{id}/teacher/reassign` | `class.teacher.reassign` | Như gán giáo viên nhưng xóa nhãn + audit `CLASS_TEACHER_REASSIGNED`. |
| `POST` | `/classes/{id}/cancel` | `class.cancel` | Lớp rỗng → hủy ngay; có học sinh → tạo yêu cầu PENDING + thông báo quản lý lớp. |
| `POST` | `/classes/{id}/cancel-requests/approve` | `class.approve_close` | Duyệt hủy; chặn tự duyệt yêu cầu của mình. |
| `POST` | `/classes/{id}/cancel-requests/reject` | `class.approve_close` | Bắt buộc lý do. |
| `GET` | `/classes/{id}/students` | `class.view` + `student.view` | Danh sách học sinh trong lớp. |
| `GET` | `/subjects?q=` | (đăng nhập, qua gateway) | Danh mục môn học cho form tạo lớp + đối chiếu chuyên môn. |

Gateway: thêm route `people-subjects-api` (`/api/subjects/**` → PeopleService, `StripPrefix=1`) để FE gọi qua proxy `/api` hiện có (Vite dev + Vercel rewrite).

## 4. Bản đồ file

### Backend — PeopleService

Tạo mới:
- `controller/SubjectController.java`
- `dto/StudentAccountResponse.java`, `dto/StudentClassResponse.java`, `dto/SubjectResponse.java`
- `repository/SubjectRepository.java`
- `service/ClassApprovalPolicy.java` — nơi DUY NHẤT quyết định ai được duyệt (TODO đổi người duyệt).
- `service/ClassReassignmentNotifier.java` — gắn nhãn + thông báo quản lý lớp khi giáo viên chuyển phòng/nghỉ việc.
- `src/test/java/com/mems/service/ClassCancelWorkflowTest.java`

Sửa:
- `controller/SchoolClassController.java`, `controller/StudentController.java`
- `dto/SchoolClassRequest/Response`, `dto/StudentRequest/Response`, `dto/TeacherClassResponse`
- `exception/ErrorCode.java` (lỗi duyệt hủy, tự duyệt, trạng thái hủy)
- `repository/SchoolClassRepository.java`, `ClassStatusRepository.java`, `StudentRepository.java`
- `service/SchoolClassService.java` (môn học + reassign), `ClassStatusService.java` (hủy/duyệt hủy, policy), `StudentService.java` (tạo tài khoản, self), `TransferService.java` (gọi notifier)
- `client/IdentityClient.java` (`createStudentAccount`)
- Test: `ClassLifecycleTest`, `ClassTeacherAssignmentTest`, `StudentClassManagementTest`, `TransferServiceTest`, `people-test-schema.sql`

### Backend — IdentityService / APIGateway

- `dto/ProvisionAccountRequest.java` — cho phép role `STUDENT`.
- `service/AccountProvisioningService.java` — tạo account STUDENT, gán role, `must_change_password`.
- `service/PermissionCatalog.java` — khai báo quyền mới + bundle.
- `APIGateway/src/main/resources/application.yml` — route `/api/subjects`.

### Frontend

Tạo mới:
- `pages/StudentPortalPage/StudentPortalPage.tsx` — cổng SELF-only (hồ sơ + lớp), chặn truy cập khi thiếu quyền.

Sửa:
- `features/sprint4/sprint4Api.ts` — reassign, duyệt/từ chối hủy, học sinh trong lớp, tạo tài khoản, môn học, self endpoints; map lỗi `CANCEL_STATE_CHANGED`.
- `features/sprint4/types.ts`, `sprint4Messages.ts`, `labels.ts`, `academicMenu.ts`
- `features/auth/permissions.ts` — mã quyền mới + helper.
- `pages/StudentsPage/StudentsPage.tsx` — cột tài khoản, tạo tài khoản + modal mật khẩu tạm.
- `pages/ClassesPage/ClassesPage.tsx` — chọn môn, cột môn, lọc "cần phân công lại", cảnh báo.
- `pages/ClassDetailPage/ClassDetailPage.tsx` — tab học sinh, phân công lại, luồng duyệt hủy.
- `pages/LoginPage/LoginPage.tsx` — STUDENT vào `/hoc-sinh`; `router.tsx` — route mới.

## 5. Đối chiếu DoD

| # | Yêu cầu | Kết quả | Bằng chứng |
| --- | --- | --- | --- |
| 1 | Học sinh không tự đăng ký | Đạt | `/dang-ky` chỉ tạo tổ chức + OWNER; account STUDENT chỉ sinh qua `/internal/accounts` sau khi có `student.create_account`. |
| 2 | Chỉ `student.create_account` tạo tài khoản | Đạt | `StudentController.createAccount` yêu cầu quyền; test `StudentClassManagementTest`. |
| 3 | Học sinh đăng nhập chỉ đọc dữ liệu của mình, không đọc tổ chức khác | Đạt | `/students/me*` lọc `actor.userId()` + `actor.orgId()`; role STUDENT chỉ có 3 quyền SELF; endpoint danh sách yêu cầu `student.view`. |
| 4 | Đóng lớp phải qua yêu cầu + trưởng phòng duyệt | Đạt | `ClassStatusService.requestClose/approveClose/rejectClose` + `ClassApprovalPolicy`; test `ClassLifecycleTest`. |
| 5 | Mở lại lớp đã đóng không cần duyệt | Đạt | `POST /classes/{id}/reopen` chỉ cần `class.reopen`. |
| 6 | Hủy lớp có học sinh phải duyệt; lớp rỗng hủy ngay | Đạt | Nhánh `studentCount > 0` trong `cancel`; test `ClassCancelWorkflowTest` (5 ca). |
| 7 | Gán giáo viên theo môn, giáo viên active, thuộc một phòng ban | Đạt | Kiểm tra chuyên môn trong `SchoolClassService`; test `ClassTeacherAssignmentTest`. |
| 8 | Chuyển phòng/nghỉ việc → giữ lớp, gắn nhãn, thông báo; gán lại xóa nhãn | Đạt | `ClassReassignmentNotifier` gọi từ `TransferService` và `ResignationService`; reassign xóa nhãn + audit riêng. |
| 9 | Giáo viên mới mặc định "chưa có lớp" | Đạt (đã có từ Sprint 4) | `TeacherClassResponse` trả danh sách rỗng. |

## 6. Kiểm thử đã chạy

- PeopleService: 130 test pass (gồm 5 test luồng hủy lớp mới).
- IdentityService: toàn bộ test pass.
- Các module backend còn lại: biên dịch thành công.
- Frontend: `npm run build` (tsc + vite) pass; `npm test` 133/133 pass.
- YAML gateway chỉ thêm route đồng dạng route kề bên; không đổi mã Java.

## 7. Điểm chưa chốt / rủi ro

1. **Người duyệt**: mặc định là chức danh "Trưởng phòng"/"Trưởng phòng ban" thuộc phòng ban có module `STUDENT_MANAGEMENT`, cộng OWNER. Nằm duy nhất trong `ClassApprovalPolicy.responsibleHeadIds()` với `TODO(PHẦN 5)`. Nếu tổ chức đặt tên chức danh khác, cần sửa `HEAD_POSITION_NAMES` hoặc logic.
2. **Username học sinh = email (lowercase, ≤100 ký tự)**. Identity unique username toàn hệ thống, nên hai tổ chức dùng chung email sẽ đụng `ACCOUNT_EXISTS`.
3. **Tạo tài khoản không có bù trừ (compensation)**: nếu Identity tạo xong mà bước `markAccountCreated` lỗi, tài khoản có thể tồn tại mà hồ sơ chưa đánh dấu. Gọi lại sẽ báo trùng.
4. **Lớp cũ có `subject_id = NULL`** bỏ qua kiểm tra chuyên môn khi gán giáo viên (để không chặn dữ liệu cũ). Lớp tạo mới bắt buộc chọn môn.
5. **Dùng lại `class.approve_close` cho duyệt hủy** thay vì quyền riêng — đúng tinh thần "trưởng phòng duyệt", nhưng nghĩa là ai duyệt đóng lớp cũng duyệt hủy lớp.
6. **Không có scope SELF/CLASS trong mô hình quyền**: mô hình hiện chỉ có ORGANIZATION/DEPARTMENT. "Quyền SELF/CLASS" được hiện thực bằng ba mã quyền riêng (`*.self_view`) cấp riêng cho role STUDENT.
7. **Frontend môn học gọi `/api/subjects`** (route mới) thay vì `/subjects` gốc, để dùng chung proxy `/api` của Vite/Vercel; backend vẫn phục vụ `/subjects`.
8. **Nút duyệt hủy hiển thị theo quyền** trên FE; quyền thực vẫn do backend kiểm tra (kể cả tự duyệt yêu cầu của mình bị chặn ở server).
