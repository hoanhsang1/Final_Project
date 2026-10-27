# API phòng ban, chức vụ và phân quyền MEMS

Hướng dẫn thao tác theo từng bước bằng **Docker + MySQL + Postman**, kèm tóm tắt chức năng: [docker-postman-guide.md](docker-postman-guide.md). Hướng dẫn này dùng OWNER đăng ký theo từng tổ chức và được SUPER_ADMIN duyệt, với OWNER_BOOTSTRAP_ENABLED=false. Bootstrap bên dưới chỉ là tùy chọn khởi tạo/test, không phải nơi cấu hình OWNER của các tổ chức.

## Phạm vi và tương thích

OWNER là chủ **của từng tổ chức**. Mọi truy vấn mới giới hạn theo `orgId`; OWNER không truy cập tổ chức khác. `SUPER_ADMIN`, đăng ký/duyệt tổ chức và claim `roles` hiện có được giữ lại. `ORG_OWNER` được nhận diện thêm là OWNER. Frontend cần tự bổ sung ánh xạ OWNER/MANAGER/STAFF nếu muốn điều hướng theo các vai trò mới.

PeopleService giữ phòng ban, chức vụ, thành viên và lịch sử thay đổi. IdentityService giữ tài khoản, danh mục quyền và phát JWT. Không có khóa ngoại giữa các database. Giả định mỗi người thuộc tối đa một phòng ban được thực thi bằng khóa chính `department_member.user_id`; nhóm cần xác nhận giả định này trước khi triển khai.

Gateway không thay đổi. Các ví dụ gọi trực tiếp service. Facility/Schedule trước đây chỉ có lớp khung: thay đổi này bổ sung API **đọc** theo phòng ban; chưa xây nghiệp vụ tạo lịch, kiểm tra trùng lịch hoặc CRUD cơ sở vật chất. Security đã dành POST đường dẫn lịch cho OWNER/SCHEDULE_CREATE; chưa có handler POST nghiệp vụ.

## Chuẩn bị database và chạy

Với database hiện có, sao lưu và chạy các migration bổ sung bằng MySQL Workbench hoặc mysql client, theo đúng database:

1. `06_identity_department_access.sql` — Identity: cờ bắt đổi mật khẩu và nguồn tạo tài khoản.
2. `07_people_department_access.sql` — People: phòng ban, chức vụ, thành viên, audit và hàng đợi xóa bù.
3. `08_facility_department_access.sql` — Facility: thêm `classroom.department_id`.
4. `09_schedule_department_access.sql` — Schedule: thêm `session.department_id`.

Các migration có thể chạy lại. **Không chạy lại** bộ `01`–`05` trên database đã có bảng/dữ liệu. Cài mới dùng bộ `01`–`05` trước, sau đó `06`–`09`. Các dòng Facility/Schedule cũ có department_id NULL, chưa xuất hiện trong API theo phòng ban; việc chuyển dữ liệu phải gán đúng phòng và tổ chức. Các ID phòng ở những database này là tham chiếu mềm.

Dùng JDK 21, MySQL 8.0.16+ và Maven. Điền `.env.example` vào biến môi trường của tiến trình (java -jar không tự đọc file .env). Docker Compose đọc .env để nội suy. Mỗi service nhận DB_URL riêng. Identity, People, Facility và Schedule dùng cùng JWT_SECRET_BASE64; Identity và People dùng cùng INTERNAL_API_KEY tối thiểu 32 ký tự. Không cung cấp secret nội bộ cho frontend.

Mỗi service dùng POM và Maven Wrapper riêng, không có POM chung ở backend. Chạy lệnh với `-f backend/<Service>/pom.xml`, hoặc vào thư mục service rồi chạy `./mvnw` (Windows: `.\mvnw.cmd`). CI và Docker tiếp tục build từng service độc lập.

Bootstrap OWNER là tùy chọn:

```dotenv
OWNER_BOOTSTRAP_ENABLED=true
OWNER_BOOTSTRAP_ORG_ID=<UUID tổ chức đã active>
OWNER_BOOTSTRAP_EMAIL=owner@example.com
OWNER_BOOTSTRAP_USERNAME=owner@example.com
OWNER_BOOTSTRAP_PASSWORD=<mật khẩu riêng tối thiểu 12 ký tự, tối đa 72 byte UTF-8>
```

Không tự tạo hoặc tự duyệt tổ chức. Có thể dùng luồng đăng ký và SUPER_ADMIN duyệt hiện có để chuẩn bị tổ chức. Bootstrap không nâng quyền hoặc đổi mật khẩu tài khoản trùng email/username; nếu gặp tài khoản xung đột, startup báo lỗi. Tắt bootstrap sau lần đầu. Danh mục role/quyền vẫn được seed khi startup, không phụ thuộc bootstrap.

Chạy từ thư mục gốc:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot' # chỉnh theo máy
$env:EUREKA_CLIENT_ENABLED = 'false' # khi chạy native, không có Eureka
$env:IDENTITY_SERVICE_URL = 'http://localhost:8081'
$env:PEOPLE_SERVICE_URL = 'http://localhost:8082'
mvn -f backend/IdentityService/pom.xml verify
mvn -f backend/PeopleService/pom.xml verify
# Tương tự với APIGateway, EurekaServer, ScheduleService, FacilityService.
# Mỗi service chạy trong một terminal, đặt DB_URL riêng và các secret trước:
mvn -f backend/IdentityService/pom.xml spring-boot:run
mvn -f backend/PeopleService/pom.xml spring-boot:run
```

Hoặc `docker compose up --build` sau khi chạy SQL. Compose tiếp tục dùng MySQL của host tại cổng 3306. Không cần cập nhật gateway để thử trực tiếp các URL bên dưới. `CORS_ALLOWED_ORIGINS` nhận danh sách origin cách nhau bằng dấu phẩy, mặc định http://localhost:5173; CORS ở gateway vẫn do người phụ trách gateway xử lý.

## JWT, mật khẩu tạm và hiệu lực quyền

Ví dụ nội dung token (không dùng ví dụ này như token ký thật):

```json
{
  "iss": "mems-identity", "sub": "<userId>", "userId": "<userId>",
  "username": "manager01", "orgId": "<orgId>",
  "roles": ["MANAGER"], "role": "MANAGER", "departmentId": "<departmentId>",
  "permissions": ["PEOPLE_VIEW", "PEOPLE_EDIT"], "mustChangePassword": false,
  "iat": 1800000000, "exp": 1800000900
}
```

OWNER có departmentId null và toàn bộ quyền mới. Access token mặc định 900 giây (có thể đặt `jwt.access-token-seconds` từ 60 đến 900). Refresh token hiện có vẫn sống 7 ngày, lưu hash SHA-256 và xoay vòng. Login/refresh của MANAGER/STAFF lấy lại quyền từ People; People lỗi thì trả 503 và không cấp token dựa trên dữ liệu cũ. Bãi nhiệm không xóa tài khoản: token mới thành STAFF, không phòng và không quyền. Token access đã phát còn hiệu lực đến hết hạn; frontend nên refresh sau khi quyền thay đổi. Các thao tác quản lý thành viên còn kiểm tra quyền hiện tại trong People để chặn quản lý dùng quyền cũ cấp vượt quyền.

API tạo thành viên trả mật khẩu tạm một lần; không ghi mật khẩu vào audit. Token đăng nhập bằng mật khẩu tạm chỉ dùng được để đổi mật khẩu, refresh hoặc logout. Đổi mật khẩu xong, refresh token cũ bị thu hồi: đăng nhập lại bằng mật khẩu mới. Không giữ mật khẩu tạm trong localStorage hoặc log frontend.

## Danh mục quyền

| Mã | Ý nghĩa |
|---|---|
| FACILITY_MANAGE | Quản lý cơ sở vật chất theo phòng |
| SCHEDULE_CREATE | Tạo lịch theo phòng |
| SCHEDULE_VIEW | Xem lịch theo phòng |
| PEOPLE_VIEW | Xem thành viên theo phòng |
| PEOPLE_EDIT | Thao tác thành viên theo phòng |

Vai trò MANAGER không tự có các quyền nghiệp vụ: OWNER cần gán chức vụ có PEOPLE_EDIT để quản lý thêm nhân viên; PEOPLE_VIEW để xem danh sách. Nhân sự nhận hợp của các quyền trong tất cả chức vụ được gán. Chức vụ thuộc tổ chức, có thể dùng ở nhiều phòng trong tổ chức đó. OWNER được sửa chức vụ; sửa quyền của chức vụ làm thay đổi quyền của mọi thành viên đang giữ chức vụ đó.

## API cho frontend

Header chung: `Authorization: Bearer <accessToken>`, `Content-Type: application/json` khi có body. Tên trường JSON dùng camelCase. ID là chuỗi UUID. Response thành công của API People mới là object/array trực tiếp, không bọc ApiResponse cũ.

| Service | Method và URL | Quyền và kết quả |
|---|---|---|
| People :8082 | GET /departments | OWNER: mọi phòng của tổ chức; PEOPLE_VIEW: phòng trong token; 200 array |
| People :8082 | POST /departments | OWNER; 201 |
| People :8082 | PUT /departments/{id} | OWNER; 200 |
| People :8082 | DELETE /departments/{id} | OWNER; 204; còn thành viên: 409 |
| People :8082 | GET /positions | OWNER/MANAGER/STAFF; 200 array chức vụ của tổ chức |
| People :8082 | POST /positions | OWNER; 201 |
| People :8082 | PUT /positions/{id} | OWNER; 200 |
| People :8082 | DELETE /positions/{id} | OWNER; 204; đang được gán: 409 |
| People :8082 | GET /permissions | OWNER/MANAGER/STAFF; 200 array mã/mô tả |
| People :8082 | GET /departments/{id}/members | OWNER hoặc PEOPLE_VIEW đúng phòng; 200 array |
| People :8082 | POST /departments/{id}/members | OWNER: MANAGER/STAFF; MANAGER + PEOPLE_EDIT: chỉ STAFF ở phòng mình, quyền không vượt quyền hiện có; 201 |
| People :8082 | PUT /departments/{id}/members/{userId}/positions | Quy tắc như trên; 200; không cho OWNER tự bỏ quyền |
| People :8082 | DELETE /departments/{id}/members/{userId} | Quy tắc như trên; 204; tài khoản vẫn giữ lại |
| Identity :8081 | POST /api/v1/auth/login | Body username/password; response auth cũ giữ nguyên |
| Identity :8081 | POST /api/v1/auth/refresh | Body refreshToken; response auth cũ giữ nguyên |
| Identity :8081 | POST /api/v1/auth/change-password | Token + currentPassword/newPassword; 204, đăng nhập lại |
| Facility :8084 | GET /departments/{id}/facilities | OWNER hoặc FACILITY_MANAGE đúng phòng; 200 array phòng học |
| Schedule :8083 | GET /departments/{id}/schedules | OWNER hoặc SCHEDULE_VIEW đúng phòng; 200 array buổi học |

Phòng ban/chức vụ: name bắt buộc, tối đa 200 ký tự; description tối đa 1000. permissions/positionIds là array không null, tối đa 50 phần tử; array rỗng hợp lệ. Không gán mã quyền lạ hoặc chức vụ của tổ chức khác. Một người không thuộc hai phòng. MANAGER không bổ nhiệm hoặc bãi nhiệm MANAGER khác. Mọi bổ nhiệm, bãi nhiệm, đổi chức vụ/quyền được lưu trong people_audit_log cùng người thao tác và thời điểm UTC.

Ví dụ tạo phòng:

```http
POST http://localhost:8082/departments
Authorization: Bearer <OWNER_TOKEN>
Content-Type: application/json

{"name":"Phòng đào tạo","description":"Quản lý đào tạo"}
```

```json
{"id":"<departmentId>","name":"Phòng đào tạo","description":"Quản lý đào tạo","createdAt":"2026-10-23T03:00:00Z"}
```

Tạo chức vụ quản lý:

```json
{"name":"Quản lý nhân sự","description":"Thêm và xem nhân viên","permissions":["PEOPLE_VIEW","PEOPLE_EDIT"]}
```

POST /positions trả 201:

```json
{"id":"<positionId>","name":"Quản lý nhân sự","description":"Thêm và xem nhân viên","createdAt":"2026-10-23T03:01:00Z","permissions":["PEOPLE_EDIT","PEOPLE_VIEW"]}
```

POST /departments/{departmentId}/members:

```json
{"username":"manager01","email":"manager@example.com","role":"MANAGER","positionIds":["<positionId>"]}
```

Response 201:

```json
{
  "member": {
    "userId":"<userId>","departmentId":"<departmentId>","role":"MANAGER",
    "appointedBy":"<ownerId>","appointedAt":"2026-10-23T03:02:00Z",
    "positionIds":["<positionId>"],"permissions":["PEOPLE_EDIT","PEOPLE_VIEW"]
  },
  "temporaryPassword":"<mật khẩu ngẫu nhiên chỉ trả lần này>","mustChangePassword":true
}
```

PUT /departments/{departmentId}/members/{userId}/positions nhận `{"positionIds":["<positionId>"]}`, trả object member như trên. GET members trả array member; GET departments/positions trả array các object tương ứng. GET permissions trả ví dụ `[{"code":"PEOPLE_VIEW","description":"View department members"}]` trong danh sách đầy đủ 5 quyền.

Lỗi People/Facility/Schedule mới và lỗi bảo vệ token dùng:

```json
{"code":"FORBIDDEN","message":"Department access denied"}
```

401 UNAUTHENTICATED; 403 FORBIDDEN/PASSWORD_CHANGE_REQUIRED; 400 VALIDATION_ERROR/UNKNOWN_PERMISSION; 404 DEPARTMENT_NOT_FOUND/POSITION_NOT_FOUND/MEMBER_NOT_FOUND; 409 DEPARTMENT_NOT_EMPTY/POSITION_IN_USE/ACCOUNT_EXISTS/CONFLICT; 503 IDENTITY_UNAVAILABLE. Response lỗi auth cũ vẫn dùng success/message/data như trước.

## Xóa bù và vận hành

Tạo thành viên: kiểm tra quyền → tạo bản ghi chờ bù trong People → Identity tạo tài khoản BCrypt + cờ đổi mật khẩu → People lưu bổ nhiệm/chức vụ/audit trong một transaction và xóa bản ghi chờ bù. Nếu lưu thất bại, People gọi xóa bù tài khoản. Khi Identity lỗi/timeout, hàng đợi account_compensation giữ công việc; retry mỗi 60 giây, chỉ xử lý bản ghi quá 120 giây để tránh chạy trước request đang xử lý. Khóa hàng chờ và transaction bổ nhiệm ngăn worker xóa tài khoản đã bổ nhiệm thành công. Không tự xóa tài khoản đã đăng nhập hoặc tài khoản không do luồng này tạo.

Nếu số attempts tăng liên tục, kiểm tra kết nối/secret và đối soát user_id với Identity. Audit chứa lịch sử nghiệp vụ; log vận hành chứa userId cần khắc phục, không chứa mật khẩu. Đây là cơ chế bù giữa hai database, không phải transaction phân tán.

## Swagger và thử nhanh

Swagger UI: http://localhost:8081/swagger-ui/index.html, :8082/swagger-ui/index.html, :8083/swagger-ui/index.html, :8084/swagger-ui/index.html. OpenAPI JSON tại /v3/api-docs. Nhấn Authorize, dán access token (không thêm chữ Bearer). API /internal không xuất hiện trong tài liệu công khai. Springdoc được ghim 2.2.0 theo [ma trận tương thích Spring Boot 3.1.x](https://springdoc.org/v2/#_what_is_the_compatibility_matrix_of_springdoc_openapi_with_spring_boot).

Chuỗi thử: OWNER login → tạo phòng → tạo chức vụ có PEOPLE_EDIT/PEOPLE_VIEW → tạo MANAGER → MANAGER login/đổi mật khẩu/login lại → tạo STAFF có quyền nằm trong tập của quản lý → thử gán FACILITY_MANAGE khi quản lý không có quyền đó (403) → OWNER đổi chức vụ → STAFF refresh → xem claims quyền mới. Xem file `department-access.http` để gọi từng API.

## Nhật ký file theo bước

- Bước 0: khảo sát, không sửa. Gateway WebFlux, JWT Nimbus/HS256, Eureka 8761; các module dùng Boot 3.1.8/Cloud 2022.0.5, chạy được JDK 21.
- Bước 1: Identity entity Role/Permission, PermissionCatalog, config IdentityDataInitializer; .env.example. Chạy Identity để seed, kiểm tra bảng role/permission/account_role.
- Bước 2: 07_people_department_access.sql; People DepartmentController/DepartmentService/DepartmentRepository; DTO DepartmentRequest/DepartmentResponse/ApiError; exception ApiException/GlobalExceptionHandler; security Actor/SecurityConfig; application.properties. Thử POST /departments bằng OWNER và bằng STAFF (403).
- Bước 3: People PositionController/PositionService/PositionRepository/PeopleAuditService, client IdentityClient, DTO PositionRequest/PositionResponse/PermissionResponse; Identity InternalPermissionController/InternalApiFilter/ApiError/SecurityConfig; .env.example. Thử POST /positions và GET /permissions.
- Bước 4: 06_identity_department_access.sql; Identity ProvisionAccountRequest/AccountProvisioningService/InternalAccountController; People MemberRequest/MemberPositionsRequest/MemberResponse/CreatedMemberResponse/AuthorizationResponse, MemberRepository/MembershipPolicy/MemberService/AccountCompensationService, DepartmentMemberController/InternalAuthorizationController/InternalApiFilter; cập nhật IdentityClient, SecurityConfig và PeopleServiceApplication. Thử POST /departments/{id}/members.
- Bước 5: Identity AccessProfile/PeopleAuthorizationClient/AccessProfileService/ChangePasswordRequest/PasswordChangeService/PasswordController; JwtService/AuthService/Account/SecurityConfig/IdentityDataInitializer; PasswordChangeRequiredFilter trong Identity/People; MemberService/AccountProvisioningService. Thử login/đổi mật khẩu/refresh; kiểm tra claims mới.
- Bước 6: SecurityConfig/Actor/PasswordChangeRequiredFilter/ApiError/ApiException/GlobalExceptionHandler ở Facility/Schedule; CorsConfig trong bốn service; DepartmentFacilityController/DepartmentScheduleController; 08–09 SQL; application.properties, docker-compose.yml, .env.example. Thử GET hai API theo phòng bằng token đúng/sai phòng.
- Bước 7: POM của bốn service và OpenApiConfig, Identity SecurityConfig; docs/department-access.md và .http. Mở Swagger, Authorize và gọi API.
- Bước 8: test, test schema/config và dependency test trong POM riêng của từng service; .github/workflows/ci.yml. Chạy `mvn -f backend/<Service>/pom.xml verify` cho từng service. Xem kết quả xác minh cuối cùng trong bàn giao.

Các kiểm thử chạy database H2 độc lập và mock ranh giới gọi service ngoài; không dùng mật khẩu thật và không cần MySQL/Eureka cho CI. Migration MySQL cần được thử trên bản sao database trước khi áp dụng dữ liệu thật. Luồng thật giữa hai service/MySQL phải được smoke test sau khi cấu hình môi trường.

## Kết quả xác minh ngày 23/10/2026

Lượt xác minh chức năng trước khi bỏ POM tổng hợp đã build thành công đủ sáu service bằng Temurin JDK 21.0.12: 69 test, không thất bại/lỗi/bỏ qua. Identity: 15; APIGateway: 1; EurekaServer: 1; People: 36; Schedule: 8; Facility: 8. Chạy lại từng service bằng `mvn -B -f backend/<Service>/pom.xml clean verify`. Báo cáo chi tiết được Maven sinh trong target/surefire-reports của từng service; log cục bộ backend/verification.log được gitignore.

Các ca bao gồm: JWT ký thật và sai issuer/chữ ký, token trống, sai vai trò/phòng/tổ chức, quản lý cấp vượt quyền khi tạo lẫn đổi chức vụ, quyền quản lý vừa bị thu hồi, OWNER tạo MANAGER thành công, chặn OWNER tự bỏ quyền, audit, không xóa dữ liệu còn tham chiếu, rollback và retry xóa bù, mật khẩu tạm, đổi mật khẩu/thu hồi refresh, refresh đọc quyền mới và xoay token, tương thích ORG_OWNER/SUPER_ADMIN, CORS và OpenAPI. Bật test trong workflow bằng `./mvnw -B verify`; CD giữ nguyên.

Chưa chạy migration lên MySQL thật, chưa chạy Docker Compose hoặc CI từ xa. Facility/Schedule trong thay đổi này có API đọc được bảo vệ và DTO ổn định (FacilityResponse/ScheduleResponse); nghiệp vụ tạo lịch/phòng học tiếp tục nằm ngoài chức năng quản lý phòng ban. Danh sách đầy đủ các file tạo/sửa nằm trong [department-access-files.md](department-access-files.md).
