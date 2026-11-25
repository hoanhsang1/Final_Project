# Sync slice Lớp/Giáo viên - P2.1a dependency check

> Trạng thái: **P2.1a + P2.1b/P2.1c xong** (đã port BE, chưa build/verify do thiếu JDK).  
> Nhánh: `chore/sync-main-class-flow`. Nguồn: `origin/main`.  
> Mục tiêu: xác định phụ thuộc và ghi lại kết quả port `Teacher + Specialty + SchoolClass`.

## 1. Nhận xét quan trọng

- HEAD hiện tại **không có** `TeacherController`, `SpecialtyController`, `SchoolClassController`, service/repository/DTO tương ứng.
- Port từ main không phải copy 3 controller: kéo theo **error handling, security actor/module guard, outbox, DTO, repository, service, identity client**.
- Môi trường hiện tại **không có Java/JAVA_HOME/Maven** (`mvn` không có; `mvnw.cmd` báo JAVA_HOME sai), nên **không thể compile/test backend ngay**. Cần chạy build ở môi trường có JDK/Maven hoặc cài JDK theo quy định dự án (không tự cài ở đây).

## 2. Controller cần port

- `TeacherController`: endpoints `POST /teachers`, `GET /teachers`, `GET /teachers/assignable`, `GET /teachers/me`, `GET /teachers/me/classes`, `GET/PUT /teachers/{staffId}`, `PUT /teachers/{staffId}/teaching-status`.
- `SpecialtyController`: `GET/POST /specialties`.
- `SchoolClassController`: các endpoint lớp/lifecycle mà FE `sprint4Api.ts` dùng (xem `docs/sync-slice-lop-giao-vien.md`).

## 3. Phụ thuộc trực tiếp theo import

### Service
- `TeacherService`: `dto.*`, `AppException`, `ErrorCode`, `SpecialtyMismatchException`, `repository.*`, `Actor`, Spring.
- `SpecialtyService`: `SpecialtyCreateRequest`, `SpecialtyResponse`, `AppException`, `ErrorCode`, `SpecialtyRepository`, `Actor`, Spring.
- `SchoolClassService`: `ClassTeacherAssignRequest`, `SchoolClassRequest/Response/UpdateRequest`, `StudentResponse`, `AppException`, `ErrorCode`, `OutboxEventRepository`, `OutboxEventTypes`, `SchoolClassRepository`, `StudentRepository`, `SubjectRepository`, `TeacherRepository`, `Actor`, `OrganizationModuleGuard`, `@Value`, Spring.
- `ClassStatusService`: DTO cancel/close/reopen/status-log/close-event/class-lifecycle-inbox, `AppException`, `ErrorCode`, `OutboxEventRepository`, `OutboxEventTypes`, `ClassStatusRepository`, `SchoolClassRepository`, `Actor`, `OrganizationModuleGuard`, `@Scheduled`, Spring.

### Repository
- `TeacherRepository`: DTO `ClassMismatch`, `EligibleTeacherInfo`, `SpecialtyResponse`, `TeacherAssignableItem`, `TeacherClassResponse`, `TeacherHistoryResponse`, `TeacherListItem`; `AppException`, `ErrorCode`; `TextNormalizer`; `JdbcTemplate`.
- `SchoolClassRepository`: DTO `ClassLifecycleInboxItem`, `ClassTeacherInfo`, `SchoolClassResponse`; `AppException`, `ErrorCode`; `JdbcTemplate`.
- `ClassStatusRepository`: DTO close-event/status-log; `JdbcTemplate`.
- `SpecialtyRepository`: DTO specialty; `JdbcTemplate`.
- Có thể cần thêm `StudentRepository`, `SubjectRepository` vì `SchoolClassService` import.

### Error/security/outbox infra
- `AppException`, `ErrorCode`, `SpecialtyMismatchException`, `GlobalExceptionHandler` (main dùng `ApiResponse`, không còn `ApiError/ApiException`), `ApiResponse`.
- `Actor` main (`hasPermission`, `hasPermissionIn`, `hasOrganizationScope`, `departmentScopes`) thay vì `Actor` HEAD (`requireDepartment`, `ApiException`).
- `OrganizationModuleGuard` (cần `IdentityClient.activeModules/moduleStatus`).
- Outbox: `OutboxEventRepository`, `OutboxEventRow`, `OutboxEventTypes`, `OutboxPublisher`, `EventRelayClient` (publisher có thể không cần nếu chỉ compile service/repo, nhưng repository/types bắt buộc).
- `TextNormalizer`.

### IdentityClient
- HEAD `IdentityClient` thiếu `activeModules`, `moduleStatus`, `permissionBundles`, `createStudentAccount`, `disableAccount`, `enableAccount`, `resetPassword`.
- `OrganizationModuleGuard` cần ít nhất `activeModules`/`moduleStatus`; port `IdentityClient` có thể kéo theo DTO `PermissionBundleResponse`.

## 4. Tập file đề xuất port (tối thiểu bước đầu)

**Nhóm Controller/Service/Repository**
- Controllers: `TeacherController`, `SpecialtyController`, `SchoolClassController`.
- Services: `TeacherService`, `SpecialtyService`, `SchoolClassService`, `ClassStatusService`, `ClassApprovalPolicy`, `TextNormalizer`.
- Repositories: `TeacherRepository`, `SpecialtyRepository`, `SchoolClassRepository`, `ClassStatusRepository`, `StudentRepository`, `SubjectRepository`.

**Nhóm error/security/outbox**
- `AppException`, `ErrorCode`, `SpecialtyMismatchException`, `ApiResponse`, `GlobalExceptionHandler` (thay bản HEAD; cần kiểm tra tương thích với controller cũ đang dùng `ApiException`).
- `Actor` (thay bản HEAD; cần giữ `requireDepartment` để không vỡ code cũ).
- `OrganizationModuleGuard`.
- `OutboxEventRepository`, `OutboxEventRow`, `OutboxEventTypes` (có thể thêm `EventRelayClient`/`OutboxPublisher` nếu bật scheduling; cân nhắc tắt bằng config).
- `IdentityClient` (thêm ít nhất `activeModules`, `moduleStatus`, và DTO liên quan).

**Nhóm DTO**
- Copy select theo import ở mục 3: CreatedTeacherResponse, TeacherCreateRequest, TeacherDetailResponse, TeacherUpdateRequest, TeacherStatusRequest, TeacherListItem, TeacherAssignableItem, TeacherHistoryResponse, TeacherClassResponse, EligibleTeacherInfo, ClassMismatch, AssignmentHistoryResponse, SpecialtyCreateRequest, SpecialtyResponse, SchoolClassRequest/Response/UpdateRequest, ClassTeacherAssignRequest, ClassCancelRequest, ClassCloseRequest/RejectRequest/EventResponse, ClassReopenRequest, ClassStatusLogResponse, ClassLifecycleInboxItem, StudentResponse, ClassTeacherInfo.

## 5. Rủi ro/rào chắn

- **Error contract**: đổi `ApiError/ApiException` → `ApiResponse/AppException` có thể ảnh hưởng toàn bộ controller cũ. Cần giữ tương thích (ví dụ handler xử lý cả 2 loại) hoặc port theo kiểu tăng dần.
- **Permission codes**: main dùng `employee.create/view/edit`, `class.view/create/edit/assign_teacher/cancel/request_close/reopen`, `teacher.change_status`, `class.teacher.reassign`. Cần đối chiếu `PermissionCatalog` ở nhánh hiện tại; nếu thiếu, endpoint trả 403.
- **Gateway prefix**: FE gọi `/api/classes`, controller main `/classes`; cần xác minh route gateway hiện tại. Không đổi FE trước khi xác minh.
- **DB schema**: repository main query nhiều cột/bảng mới (class lifecycle, outbox, student, subject, specialty category...). Cần schema local đúng từ main; không chạy production.
- **Outbox/scheduler**: `OutboxPublisher` dùng `@Scheduled`; nếu chưa sẵn sàng hạ tầng relay, giữ config tắt publisher nhưng repository/types vẫn cần compile.
- **Không có JDK/Maven**: chưa thể build verify; mọi port xong cần đánh dấu “chưa compile/verify”.

## 6. Kết quả port thực tế (P2.1b/P2.1c)

### 6.1 Cách port
- Kiểm tra dependency closure: HEAD có 38 file Java, `origin/main` có 186 file. **HEAD là tập con của main**, trừ 2 file tương thích `ApiError.java` + `ApiException.java`.
- Vì `import com.mems.dto.*` (wildcard) làm closure tăng lên 127 file và không có compiler để kiểm tra, chọn **port toàn bộ cây Java PeopleService từ `origin/main`** (`src/main/java` + `src/test/java`) để đảm bảo tính nhất quán nội bộ, thay vì cắt gọt thủ công dễ sót import.
- Giữ lại 2 file tương thích của HEAD: `dto/ApiError.java`, `exception/ApiException.java` (main đã xoá). Không file nào trên main phụ thuộc vào chúng.

### 6.2 Thay đổi đã áp dụng
| Việc | Kết quả |
|---|---|
| `git checkout origin/main -- backend/PeopleService/src/main/java backend/PeopleService/src/test` | 188 file main (186 main + 2 compat), 52 file test (50 main + 2 cũ), kèm `src/test/resources` |
| `GlobalExceptionHandler` | Thêm `@ExceptionHandler(ApiException.class)` trả `ApiError` (giữ contract cũ) song song handler `AppException` → `ApiResponse` |
| `Actor` | Dùng bản main; bản main **đã có** `requireDepartment()` và `forbidden()` nên không phải vá thêm |
| Gateway `backend/APIGateway/src/main/resources/application.yml` | Thêm `StripPrefix=1` cho 3 route `people-teachers`, `people-specialties`, `people-classes` để FE `/api/...` khớp controller `/teachers|/specialties|/classes` |
| `db.sql` + `docs/phase-1/migrations/*` | Copy từ main làm tài liệu schema/reference |
| `application.properties` / `docker-compose.yml` / `.github/workflows/ci.yml` | **Không đổi** (tránh đổi hạ tầng/CI; `@Value` trong `SchoolClassService` đã có default `TEACHER_ASSIGNMENT`) |

### 6.3 Kiểm tra tĩnh đã chạy
- Quét 238 file Java (main + test): **0 import `com.mems.*` bị thiếu**.
- Đối chiếu endpoint `frontend/src/features/sprint4/sprint4Api.ts` ↔ controller: **khớp toàn bộ** (classes list/detail/teacher/cancel/close-requests/approve/reject/reopen/status-logs/close-events; teachers list/detail/create/update/assignable; specialties list/create).
- `frontend/src`: **0 thay đổi**, **0 tham chiếu antd/@ant-design**.
- Permission codes của slice có trong `DefaultPositionSeeder` (`employee.*`, `class.*`, `teacher.change_status`, `subject.*`, `curriculum.*`, `student.*`, `schedule.*`).

### 6.4 Chưa xác minh (blocked)
- **Không có JDK/JAVA_HOME/Maven**: `mvn` không tồn tại, `mvnw.cmd` báo `JAVA_HOME` sai → **chưa compile, chưa chạy test**.
- **DB schema runtime**: `db.sql` có 62 lệnh `DROP TABLE` + 46 `INSERT`; **không được chạy trực tiếp**. Cần tạo DB local riêng/đối chiếu migration trước khi chạy ứng dụng.
- **Error contract FE**: main trả `ApiResponse` (`status/code/message/data`), FE Sprint 4 đang đọc `error.response.data.classes` cho 409 mismatch — cần kiểm tra lại khi có backend chạy thật.
- **Outbox/relay + module guard**: cần identity service có `/internal/orgs/{orgId}/modules/status` và ScheduleService nhận event; chưa xác minh runtime.
- **E2E/Playwright**: vẫn thiếu Chromium binary (`chromium_headless_shell-1248`).

### 6.5 Bước còn lại
1. Chạy build/test khi có JDK + Maven: `./mvnw -q -DskipTests compile` rồi `./mvnw test` trong `backend/PeopleService`.
2. Nếu lỗi compile: sửa theo log cụ thể (không đoán).
3. Chạy local DB schema mới, kiểm tra 5 state của lớp + 409 mismatch + permission 403.
4. Chỉ sửa FE Astryx nếu contract runtime khác `sprint4Api.ts`; **không** port FE main.
5. Giữ P4 (xếp lịch tự động) **BLOCKED** theo `docs/scope-can-chot-xep-lich.md`.
