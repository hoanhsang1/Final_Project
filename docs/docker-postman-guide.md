# MEMS — Hướng dẫn chạy Docker và kiểm thử bằng Postman

Tài liệu dùng cho môi trường phát triển/test, theo code ngày 23/10/2026. Thực hiện theo thứ tự: **cấu hình .env → cập nhật MySQL → chạy Docker → đăng ký tổ chức → SUPER_ADMIN duyệt → OWNER quản lý phòng ban → MANAGER thêm STAFF → kiểm tra quyền**.

OWNER là người đại diện của **từng tổ chức**. Email, username và mật khẩu OWNER được nhập qua API đăng ký và lưu trong Identity database. Không thêm tài khoản của từng tổ chức vào .env. Trong hướng dẫn này, bootstrap OWNER luôn tắt.

## 1. Tóm tắt chức năng đã làm

| Nhóm | Chức năng |
|---|---|
| Vai trò | Bổ sung OWNER, MANAGER, STAFF; giữ tương thích SUPER_ADMIN và ORG_OWNER hiện có |
| Quyền | Seed FACILITY_MANAGE, SCHEDULE_CREATE, SCHEDULE_VIEW, PEOPLE_VIEW, PEOPLE_EDIT; trả danh mục mã và mô tả cho frontend |
| Phòng ban | Xem danh sách, tạo, sửa, xóa; OWNER thao tác trong tổ chức mình; không xóa phòng còn thành viên |
| Chức vụ mẫu | Tập quyền có tên; một nhân sự có thể giữ nhiều chức vụ, nhận hợp các quyền; không xóa chức vụ đang được gán |
| Nhân sự | OWNER tạo MANAGER/STAFF; MANAGER chỉ tạo và quản lý STAFF trong phòng mình, không cấp vượt quyền hiện có |
| Tạo tài khoản | People gọi Identity tạo tài khoản và mật khẩu tạm, sau đó lưu bổ nhiệm và chức vụ |
| Đổi mật khẩu | Tài khoản được tạo qua bổ nhiệm phải đổi mật khẩu tạm trước khi dùng API nghiệp vụ |
| Xóa bù | Nếu lưu bổ nhiệm thất bại, xóa tài khoản vừa tạo; khi xóa lỗi, giữ hàng đợi để thử lại |
| Audit | Lưu người thao tác, đối tượng, thời điểm và nội dung khi bổ nhiệm, bãi nhiệm, đổi chức vụ/quyền |
| JWT | Giữ roles/orgId; thêm role, departmentId, permissions, mustChangePassword; access token mặc định 15 phút |
| Refresh | Dùng lại cơ chế refresh 7 ngày và xoay token; login/refresh đọc lại quyền của MANAGER/STAFF từ People |
| Cách ly dữ liệu | Kiểm tra tổ chức và phòng ban; một người thuộc tối đa một phòng ban theo thiết kế hiện tại |
| Security/CORS | Cấu hình ở Identity, People, Facility, Schedule; API nội bộ Identity–People dùng secret riêng |
| Facility/Schedule | Thêm API đọc dữ liệu theo phòng ban, có kiểm tra quyền và tổ chức |
| Tài liệu | Swagger Bearer token cho bốn service, request mẫu và migration SQL 06–09 |
| Kiểm thử/CI | Đã có 69 test qua trong lượt xác minh trước; CI chạy verify riêng từng service; CD giữ nguyên |

Mỗi service dùng POM riêng, không có POM tổng hợp ở backend. Gateway chưa được bổ sung auth/route cho các API People trong đợt này. Postman gọi trực tiếp các cổng service.

**Phạm vi hiện tại:** Facility/Schedule mới có API đọc, chưa xây nghiệp vụ tạo lịch hoặc CRUD cơ sở vật chất. Code đăng ký tổ chức hiện chỉ nhận orgType là SCHOOL hoặc CENTER; chưa có loại COMPANY riêng. Chưa có gửi email/OTP trong luồng tạo nhân sự. Giả định một người thuộc một phòng cần được nhóm xác nhận.

## 2. Chuẩn bị

- Docker Desktop đang chạy.
- MySQL 8.0.16 trở lên trên máy host hoạt động ở cổng 3306, có MySQL Workbench để chạy SQL.
- Postman trên máy dùng địa chỉ localhost.
- Một tài khoản SUPER_ADMIN đang hoạt động và biết mật khẩu để duyệt tổ chức. Có thể bỏ qua phần đăng ký/duyệt nếu đã có OWNER/ORG_OWNER và tổ chức active.

Compose hiện **không chứa MySQL container**. Các service kết nối tới MySQL của máy host bằng host.docker.internal:3306. Tài khoản MySQL phải được phép kết nối từ Docker và có quyền trên database tương ứng.

Thư mục chạy lệnh Docker:

```powershell
cd D:\User\documents\Final_Project\Final_Project
```

Không cần cài JDK hoặc chạy Maven trên máy để làm theo hướng dẫn Docker này.

## 3. Sửa .env

Mở .env ở thư mục chứa docker-compose.yml. Nếu chưa có, sao chép .env.example thành .env; giữ file .env hiện có nếu đã cấu hình auth.

Điền giá trị thật thay cho các phần trong dấu <...>:

```dotenv
DB_USERNAME=<tai_khoan_mysql>
DB_PASSWORD=<mat_khau_mysql>

JWT_SECRET_BASE64=<giu_nguyen_khoa_JWT_dang_dung>
INTERNAL_API_KEY=<secret_ngau_nhien_toi_thieu_32_ky_tu>

OWNER_BOOTSTRAP_ENABLED=false
OWNER_BOOTSTRAP_ORG_ID=
OWNER_BOOTSTRAP_EMAIL=
OWNER_BOOTSTRAP_USERNAME=
OWNER_BOOTSTRAP_PASSWORD=

CORS_ALLOWED_ORIGINS=http://localhost:5173
```

| Biến | Cách dùng |
|---|---|
| DB_USERNAME/DB_PASSWORD | Tài khoản MySQL hiện có, không phải tài khoản đăng nhập ứng dụng |
| JWT_SECRET_BASE64 | Khóa ký JWT hiện có; nếu chưa có thì tạo base64 của 32 byte ngẫu nhiên; đổi khóa làm token cũ hết hiệu lực |
| INTERNAL_API_KEY | Secret khác khóa JWT, tối thiểu 32 ký tự; Compose truyền cùng giá trị cho Identity và People |
| OWNER_BOOTSTRAP_* | Tắt và để trống; email OWNER được gửi qua request đăng ký, không cấu hình ở đây |
| CORS_ALLOWED_ORIGINS | Origin trình duyệt được phép gọi service; Postman desktop không phụ thuộc cấu hình CORS |

Nếu cần tạo secret mới, đoạn PowerShell sau sinh một chuỗi; chạy lại để lấy secret khác. Chỉ thay JWT_SECRET_BASE64 khi chưa có khóa hoặc chủ động muốn đổi khóa.

```powershell
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
[Convert]::ToBase64String($bytes)
```

Không cần sửa IDENTITY_SERVICE_URL, PEOPLE_SERVICE_URL hoặc đặt DB_URL trong .env cho cách chạy Docker này: Compose đã đặt URL nội bộ và DB_URL riêng cho từng service. Không đặt EUREKA_CLIENT_ENABLED=false khi chạy bộ Compose này.

ADMIN_BOOTSTRAP_PASSWORD nếu có trong .env **không tự đặt hoặc đổi mật khẩu SUPER_ADMIN**: code hiện tại không đọc biến đó để cập nhật tài khoản. Dùng mật khẩu SUPER_ADMIN đã biết của hệ thống. Không gửi .env, secret hoặc file Postman chứa mật khẩu thật lên Git.

## 4. Cập nhật MySQL bằng Workbench

### 4.1. Database đã có dữ liệu

Mở và Execute **toàn bộ file**, theo thứ tự:

| Thứ tự | File | Database/nội dung |
|---|---|---|
| 1 | [06_identity_department_access.sql](../06_identity_department_access.sql) | mems_identity_db: cờ đổi mật khẩu và nguồn tạo tài khoản |
| 2 | [07_people_department_access.sql](../07_people_department_access.sql) | mems_people_db: phòng, chức vụ, thành viên, audit, hàng đợi xóa bù |
| 3 | [08_facility_department_access.sql](../08_facility_department_access.sql) | mems_facility_db: classroom.department_id |
| 4 | [09_schedule_department_access.sql](../09_schedule_department_access.sql) | mems_schedule_db: session.department_id |

Các file có USE database và delimiter cần thiết. Không chọn riêng từng dòng trong procedure để chạy. Không chạy lại bộ tạo bảng 01–05 trên database đã có bảng/dữ liệu.

### 4.2. Cài mới database hoàn toàn

Chạy lần lượt 01_identity_db.sql, 02_people_db.sql, 03_schedule_db.sql, 04_facility_db.sql, 05_seed_admin.sql, sau đó 06–09 ở bảng trên. File 05 hiện chứa hash tài khoản quản trị mẫu; nó không lấy mật khẩu từ .env. Chuẩn bị tài khoản SUPER_ADMIN có mật khẩu đã biết theo quy trình quản trị hiện có trước khi thử luồng duyệt tổ chức.

### 4.3. Kiểm tra trước khi chạy

```sql
SHOW TABLES FROM mems_people_db;

SHOW COLUMNS FROM mems_identity_db.account LIKE 'must_change_password';
SHOW COLUMNS FROM mems_identity_db.account LIKE 'provisioned_by';

SELECT code, scope FROM mems_identity_db.role
WHERE code IN ('SUPER_ADMIN', 'ORG_OWNER');

SELECT code, name, is_active FROM mems_identity_db.module;
```

Kiểm tra tài khoản quản trị đang dùng, không đọc password_hash:

```sql
SELECT a.id, a.username, a.status, a.org_id, r.code
FROM mems_identity_db.account a
JOIN mems_identity_db.account_role ar ON ar.account_id = a.id
JOIN mems_identity_db.role r ON r.id = ar.role_id
WHERE r.code = 'SUPER_ADMIN';
```

SUPER_ADMIN hợp lệ có status active, org_id NULL và chỉ giữ vai trò SUPER_ADMIN. Không tạo OWNER bằng SQL trong hướng dẫn này; dùng đăng ký và duyệt ở phần Postman.

## 5. Chạy Docker

Trong thư mục gốc repo:

```powershell
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 identity-org-service people-service
```

Chờ log báo Identity/People khởi động xong, không liên tục restart. Lần đầu build có thể mất thời gian tải thư viện. SQL không tự chạy trong lệnh compose: phải hoàn thành bước 4 trước.

Khi chỉ đổi .env, áp dụng lại cho các container liên quan:

```powershell
docker compose up -d --force-recreate identity-org-service people-service schedule-service facility-service
```

Restart container đơn thuần không cập nhật các biến môi trường mới của container.

| Dịch vụ | URL từ Postman trên máy host |
|---|---|
| Identity | http://localhost:8081 |
| People | http://localhost:8082 |
| Schedule | http://localhost:8083 |
| Facility | http://localhost:8084 |

Không dùng tên container làm URL trong Postman trên máy host; tên nội bộ chỉ dùng giữa các container. Không đổi các request People sang cổng gateway 8080 khi chưa có route tương ứng.

## 6. Chuẩn bị Postman

Tạo Collection và Environment tên MEMS Local, chọn Environment đó khi gửi request.

Các request có body dùng Body → raw → JSON. Authorization đặt đúng theo từng request bên dưới; request công khai chọn No Auth. Với Bearer Token, ô Token nhập biến được ghi ở bước tương ứng, ví dụ {{ownerToken}}, không thêm chữ Bearer.

Tạo các biến đầu vào:

| Biến | Giá trị |
|---|---|
| identity | http://localhost:8081 |
| people | http://localhost:8082 |
| schedule | http://localhost:8083 |
| facility | http://localhost:8084 |
| adminUsername | Username SUPER_ADMIN hiện có, ví dụ platform_admin |
| adminPassword | Mật khẩu SUPER_ADMIN thực tế đã biết |
| ownerUsername | owner_demo_01 — đổi hậu tố nếu username đã tồn tại |
| ownerEmail | owner-demo-01@example.com |
| ownerPassword | Mật khẩu riêng tối thiểu 12 ký tự |
| managerUsername | manager_demo_01 — username mới |
| managerNewPassword | Mật khẩu mới riêng, tối thiểu 12 ký tự |
| staffUsername | staff_demo_01 — username mới |
| staffNewPassword | Mật khẩu mới riêng, tối thiểu 12 ký tự |

Username là duy nhất toàn hệ thống. Dùng mật khẩu mới không trùng mật khẩu tạm, tối đa 72 byte UTF-8 khi đổi mật khẩu. Email ví dụ không nhận thư; hệ thống chưa gửi email trong luồng này.

Các script dưới đây dán vào phần script chạy **sau response** của từng request. Chúng tự tạo các biến token/ID trong Environment. Không dán script vào JSON body. Mỗi request lưu đúng biến riêng để không ghi đè token của người khác.

## 7. Kiểm tra kết nối và danh mục module

### 7.1. Identity hoạt động

GET {{identity}}/api/v1/auth/test — No Auth, không có body.

Mong đợi 200 và message Identity Service is running.

### 7.2. Lấy module đang hoạt động

GET {{identity}}/api/v1/modules — No Auth.

Mong đợi 200, danh sách code/name. Ví dụ đăng ký bên dưới dùng STUDENT_MANAGEMENT. Nếu code này không có trong danh sách, thay bằng một code đang active từ response. Không tự dùng các tên PEOPLE hoặc FACILITY nếu chúng không phải code thực tế.

## 8. Đăng ký tổ chức và tài khoản OWNER

Nếu đã có OWNER/ORG_OWNER với tổ chức active, lưu orgId/ownerUserId từ dữ liệu hiện có, điền ownerUsername/ownerPassword của tài khoản đó và chuyển đến bước 10.

POST {{identity}}/api/v1/auth/register — No Auth.

```json
{
  "organizationName": "Trung tâm MEMS Demo 01",
  "orgType": "CENTER",
  "username": "{{ownerUsername}}",
  "email": "{{ownerEmail}}",
  "password": "{{ownerPassword}}",
  "modules": ["STUDENT_MANAGEMENT"]
}
```

Với trường học, dùng orgType SCHOOL. Chưa có orgType COMPANY. Đây là nơi nhập email người đại diện của tổ chức; không sửa .env theo email này.

Mong đợi 201:

```json
{
  "organizationId": "<UUID tổ chức>",
  "accountId": "<UUID người đại diện>",
  "organizationStatus": "PENDING",
  "accountStatus": "PENDING",
  "requestedModules": ["STUDENT_MANAGEMENT"]
}
```

Script sau response:

```javascript
pm.test("Tạo tổ chức thành công", () => pm.response.to.have.status(201));
if (pm.response.code === 201) {
    const data = pm.response.json();
    pm.environment.set("orgId", data.organizationId);
    pm.environment.set("ownerUserId", data.accountId);
}
```

OWNER lúc này chưa được đăng nhập: thử POST login với ownerUsername/ownerPassword phải nhận 403 do tài khoản hoặc tổ chức đang pending. Không chỉnh status trực tiếp bằng SQL để bỏ qua bước duyệt.

## 9. SUPER_ADMIN duyệt tổ chức

### 9.1. Đăng nhập quản trị nền tảng

POST {{identity}}/api/v1/auth/login — No Auth.

```json
{
  "username": "{{adminUsername}}",
  "password": "{{adminPassword}}"
}
```

Mong đợi 200. Script:

```javascript
pm.test("Đăng nhập SUPER_ADMIN", () => pm.response.to.have.status(200));
if (pm.response.code === 200) {
    pm.environment.set("adminToken", pm.response.json().accessToken);
}
```

### 9.2. Xem tổ chức chờ duyệt

GET {{identity}}/api/v1/organizations/pending.

Authorization: Bearer Token {{adminToken}}. Mong đợi 200 và có tổ chức vừa tạo.

### 9.3. Duyệt

PATCH {{identity}}/api/v1/organizations/{{orgId}}/approve.

Authorization: Bearer Token {{adminToken}}. Không gửi body. Mong đợi 204; tổ chức và OWNER chuyển active, các module đăng ký được duyệt.

Gọi lại approve cho tổ chức đã duyệt sẽ nhận 409. OWNER không có quyền gọi API duyệt tổ chức; chức năng này thuộc SUPER_ADMIN.

## 10. OWNER đăng nhập

POST {{identity}}/api/v1/auth/login — No Auth.

```json
{
  "username": "{{ownerUsername}}",
  "password": "{{ownerPassword}}"
}
```

Mong đợi 200:

```json
{
  "accessToken": "<JWT>",
  "refreshToken": "<refresh token>",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

Script:

```javascript
pm.test("Đăng nhập OWNER", () => pm.response.to.have.status(200));
if (pm.response.code === 200) {
    const data = pm.response.json();
    pm.environment.set("ownerToken", data.accessToken);
    pm.environment.set("ownerRefreshToken", data.refreshToken);
}
```

Database giữ vai trò ORG_OWNER của luồng đăng ký cũ; JWT mới nhận thêm vai trò OWNER để dùng chức năng mới. OWNER có quyền trên tổ chức của mình, không phải quản trị viên của mọi tổ chức.

## 11. OWNER tạo phòng ban

### 11.1. Phòng đào tạo

POST {{people}}/departments — Bearer Token {{ownerToken}}.

```json
{
  "name": "Phòng đào tạo Demo 01",
  "description": "Phòng kiểm thử chức năng nhân sự"
}
```

Mong đợi 201, object id/name/description/createdAt. Script:

```javascript
pm.test("Tạo phòng đào tạo", () => pm.response.to.have.status(201));
if (pm.response.code === 201) {
    pm.environment.set("departmentId", pm.response.json().id);
}
```

### 11.2. Phòng thứ hai để test sai phòng

Clone request trên, đổi name thành Phòng thiết bị Demo 01. Trong script đổi tên biến departmentId thành otherDepartmentId. Gửi request, mong đợi 201. Không ghi đè departmentId của phòng đào tạo.

### 11.3. Xem và sửa

GET {{people}}/departments — Bearer {{ownerToken}} → 200, có hai phòng của tổ chức này.

PUT {{people}}/departments/{{departmentId}} — Bearer {{ownerToken}}:

```json
{
  "name": "Phòng đào tạo Demo 01",
  "description": "Đã cập nhật qua Postman"
}
```

Mong đợi 200. Không đưa orgId của tổ chức khác vào body để đổi phạm vi; service lấy tổ chức từ token.

## 12. OWNER tạo chức vụ mẫu

GET {{people}}/permissions — Bearer {{ownerToken}} → 200, có năm mã quyền nghiệp vụ mới và mô tả.

Tạo ba request POST {{people}}/positions, đều dùng Bearer {{ownerToken}}:

### 12.1. Chức vụ quản lý

```json
{
  "name": "Quản lý đào tạo Demo 01",
  "permissions": ["PEOPLE_VIEW", "PEOPLE_EDIT", "SCHEDULE_VIEW"]
}
```

Mong đợi 201. Script:

```javascript
if (pm.response.code === 201) {
    pm.environment.set("managerPositionId", pm.response.json().id);
}
```

### 12.2. Chức vụ nhân viên

```json
{
  "name": "Nhân viên đào tạo Demo 01",
  "permissions": ["PEOPLE_VIEW"]
}
```

Mong đợi 201. Script:

```javascript
if (pm.response.code === 201) {
    pm.environment.set("staffPositionId", pm.response.json().id);
}
```

### 12.3. Chức vụ dùng để test cấp vượt quyền

```json
{
  "name": "Phụ trách CSVC Demo 01",
  "permissions": ["FACILITY_MANAGE"]
}
```

Mong đợi 201. Script:

```javascript
if (pm.response.code === 201) {
    pm.environment.set("facilityPositionId", pm.response.json().id);
}
```

GET {{people}}/positions — Bearer {{ownerToken}} → 200, có ba chức vụ. MANAGER chỉ nhận các quyền trong chức vụ được gán; vai trò MANAGER không tự có PEOPLE_EDIT.

## 13. OWNER tạo MANAGER

POST {{people}}/departments/{{departmentId}}/members — Bearer {{ownerToken}}.

```json
{
  "username": "{{managerUsername}}",
  "email": "manager-demo-01@example.com",
  "role": "MANAGER",
  "positionIds": ["{{managerPositionId}}"]
}
```

Mong đợi 201:

```json
{
  "member": {
    "userId": "<UUID quản lý>",
    "departmentId": "<UUID phòng đào tạo>",
    "role": "MANAGER",
    "appointedBy": "<UUID OWNER>",
    "appointedAt": "<thời điểm>",
    "positionIds": ["<UUID chức vụ quản lý>"],
    "permissions": ["PEOPLE_EDIT", "PEOPLE_VIEW", "SCHEDULE_VIEW"]
  },
  "temporaryPassword": "<mật khẩu tạm ngẫu nhiên>",
  "mustChangePassword": true
}
```

Script:

```javascript
pm.test("OWNER tạo MANAGER", () => pm.response.to.have.status(201));
if (pm.response.code === 201) {
    const data = pm.response.json();
    pm.environment.set("managerId", data.member.userId);
    pm.environment.set("managerTemporaryPassword", data.temporaryPassword);
}
```

Mật khẩu tạm chỉ được trả trong response tạo thành viên, không tự gửi email. Không có API xem lại mật khẩu tạm.

## 14. MANAGER đổi mật khẩu lần đầu

### 14.1. Login bằng mật khẩu tạm

POST {{identity}}/api/v1/auth/login — No Auth.

```json
{
  "username": "{{managerUsername}}",
  "password": "{{managerTemporaryPassword}}"
}
```

Mong đợi 200. Script lưu token MANAGER:

```javascript
if (pm.response.code === 200) {
    const data = pm.response.json();
    pm.environment.set("managerToken", data.accessToken);
    pm.environment.set("managerRefreshToken", data.refreshToken);
}
```

Thử GET {{people}}/departments/{{departmentId}}/members với Bearer {{managerToken}}: phải nhận 403 PASSWORD_CHANGE_REQUIRED vì chưa đổi mật khẩu.

### 14.2. Đổi mật khẩu

POST {{identity}}/api/v1/auth/change-password — Bearer {{managerToken}}.

```json
{
  "currentPassword": "{{managerTemporaryPassword}}",
  "newPassword": "{{managerNewPassword}}"
}
```

Mong đợi 204. Refresh token cũ bị thu hồi; access token cũ vẫn mang cờ mật khẩu tạm. Phải login lại bằng mật khẩu mới.

### 14.3. Login lại

POST {{identity}}/api/v1/auth/login — No Auth.

```json
{
  "username": "{{managerUsername}}",
  "password": "{{managerNewPassword}}"
}
```

Dùng lại script lưu managerToken/managerRefreshToken ở bước 14.1. Sau đó GET members bằng token mới phải trả 200.

## 15. MANAGER tạo STAFF

POST {{people}}/departments/{{departmentId}}/members — Bearer {{managerToken}}.

```json
{
  "username": "{{staffUsername}}",
  "email": "staff-demo-01@example.com",
  "role": "STAFF",
  "positionIds": ["{{staffPositionId}}"]
}
```

Mong đợi 201 vì PEOPLE_VIEW của chức vụ nhân viên nằm trong tập quyền của MANAGER. Script:

```javascript
pm.test("MANAGER tạo STAFF cùng phòng", () => pm.response.to.have.status(201));
if (pm.response.code === 201) {
    const data = pm.response.json();
    pm.environment.set("staffId", data.member.userId);
    pm.environment.set("staffTemporaryPassword", data.temporaryPassword);
}
```

GET {{people}}/departments/{{departmentId}}/members — Bearer {{managerToken}} → 200, có MANAGER và STAFF.

## 16. STAFF đăng nhập và đổi mật khẩu

Thực hiện ba request theo thứ tự:

1. POST {{identity}}/api/v1/auth/login — No Auth:

```json
{
  "username": "{{staffUsername}}",
  "password": "{{staffTemporaryPassword}}"
}
```

Script lưu token STAFF, dùng cho cả login tạm và login sau đổi mật khẩu:

```javascript
if (pm.response.code === 200) {
    const data = pm.response.json();
    pm.environment.set("staffToken", data.accessToken);
    pm.environment.set("staffRefreshToken", data.refreshToken);
}
```

2. POST {{identity}}/api/v1/auth/change-password — Bearer {{staffToken}}:

```json
{
  "currentPassword": "{{staffTemporaryPassword}}",
  "newPassword": "{{staffNewPassword}}"
}
```

Mong đợi 204.

3. POST {{identity}}/api/v1/auth/login — No Auth, dùng lại script lưu STAFF:

```json
{
  "username": "{{staffUsername}}",
  "password": "{{staffNewPassword}}"
}
```

Mong đợi 200. GET members bằng staffToken mới phải trả 200 vì STAFF đang có PEOPLE_VIEW.

## 17. Kiểm tra các ca bị chặn

Thực hiện trước khi bãi nhiệm hoặc xóa dữ liệu test. Với các request thử tạo người, dùng username mới để tránh lỗi trùng username che mất kết quả cần kiểm tra. Không gắn script lưu ID/token của request thành công vào các request cố ý tạo lỗi.

| Ca kiểm tra | Request/thay đổi | Token | Kết quả mong đợi |
|---|---|---|---|
| Không đăng nhập | GET {{people}}/departments, chọn No Auth | Không có | 401 UNAUTHENTICATED |
| STAFF tạo phòng | POST /departments, body name hợp lệ | staffToken | 403 |
| MANAGER tạo chức vụ | POST /positions, body hợp lệ | managerToken | 403 |
| MANAGER tạo MANAGER | POST /departments/{{departmentId}}/members, role MANAGER | managerToken | 403 |
| Sai phòng khi thêm người | POST /departments/{{otherDepartmentId}}/members, role STAFF | managerToken | 403 |
| Sai phòng khi đọc | GET /departments/{{otherDepartmentId}}/members | managerToken | 403 |
| Cấp quyền vượt quyền khi tạo | Tạo STAFF ở phòng mình với facilityPositionId | managerToken | 403 |
| Cấp vượt quyền khi đổi chức vụ | PUT /departments/{{departmentId}}/members/{{staffId}}/positions với facilityPositionId | managerToken | 403; chức vụ cũ giữ nguyên |
| Quản lý bãi nhiệm quản lý | DELETE /departments/{{departmentId}}/members/{{managerId}} | managerToken | 403 |
| OWNER tự bỏ quyền | PUT /departments/{{departmentId}}/members/{{ownerUserId}}/positions, positionIds rỗng | ownerToken | 403 |
| Phòng còn thành viên | DELETE /departments/{{departmentId}} | ownerToken | 409 DEPARTMENT_NOT_EMPTY |
| Chức vụ đang được gán | DELETE /positions/{{staffPositionId}} | ownerToken | 409 POSITION_IN_USE |
| Mã quyền không hợp lệ | POST /positions, permissions chứa UNKNOWN_PERMISSION_CODE | ownerToken | 400 UNKNOWN_PERMISSION |
| Sai tổ chức | Dùng OWNER tổ chức B sửa phòng của tổ chức A | Token OWNER B | 404 DEPARTMENT_NOT_FOUND |

Các URL rút gọn trong bảng dùng base {{people}}.

Ví dụ request cấp vượt quyền khi đổi chức vụ:

PUT {{people}}/departments/{{departmentId}}/members/{{staffId}}/positions — Bearer {{managerToken}}:

```json
{
  "positionIds": ["{{facilityPositionId}}"]
}
```

Mong đợi 403. Dùng OWNER gọi lại GET members, xác nhận STAFF vẫn giữ staffPositionId và PEOPLE_VIEW.

Để test sai tổ chức, đăng ký và duyệt một tổ chức B trong Environment khác; lấy token OWNER B. Dùng ID phòng A đã lưu ở Environment ban đầu trong URL PUT, body sửa name hợp lệ. Không dùng chung script làm ghi đè orgId/departmentId/token của tổ chức A.

## 18. Kiểm tra đổi quyền và refresh

### 18.1. Xác nhận quyền ban đầu

GET {{people}}/departments/{{departmentId}}/members — Bearer {{staffToken}} → 200.

### 18.2. OWNER sửa quyền trong chức vụ nhân viên

PUT {{people}}/positions/{{staffPositionId}} — Bearer {{ownerToken}}:

```json
{
  "name": "Nhân viên đào tạo Demo 01",
  "permissions": ["SCHEDULE_VIEW"]
}
```

Mong đợi 200. Chức vụ đã mất PEOPLE_VIEW; các thành viên giữ chức vụ này nhận tập quyền mới khi cấp token mới. Token access cũ có thể còn PEOPLE_VIEW đến hết hạn, tối đa 15 phút.

### 18.3. Refresh STAFF

POST {{identity}}/api/v1/auth/refresh — No Auth:

```json
{
  "refreshToken": "{{staffRefreshToken}}"
}
```

Mong đợi 200. Script phải thay **cả hai token**:

```javascript
pm.test("Refresh STAFF thành công", () => pm.response.to.have.status(200));
if (pm.response.code === 200) {
    const data = pm.response.json();
    pm.environment.set("staffToken", data.accessToken);
    pm.environment.set("staffRefreshToken", data.refreshToken);
}
```

GET members bằng staffToken mới phải trả 403 vì đã mất PEOPLE_VIEW. Dùng lại refresh token cũ sau khi đã xoay sẽ nhận 401.

### 18.4. Kiểm tra đổi chức vụ trực tiếp

PUT {{people}}/departments/{{departmentId}}/members/{{staffId}}/positions — Bearer {{ownerToken}}:

```json
{
  "positionIds": ["{{staffPositionId}}", "{{facilityPositionId}}"]
}
```

Mong đợi 200. Response member có cả SCHEDULE_VIEW và FACILITY_MANAGE. Một người có thể giữ nhiều chức vụ; OWNER được gán quyền trong tổ chức mình. Refresh STAFF lần nữa nếu muốn dùng các quyền này ở service khác.

## 19. Test API đọc Facility và Schedule

Sau bước 18.4 và refresh STAFF, gọi:

| Request | Token | Mong đợi |
|---|---|---|
| GET {{facility}}/departments/{{departmentId}}/facilities | staffToken | 200 vì có FACILITY_MANAGE |
| GET {{schedule}}/departments/{{departmentId}}/schedules | staffToken | 200 vì có SCHEDULE_VIEW |
| Một trong hai API trên với otherDepartmentId | staffToken | 403 vì sai phòng |

Response [] hợp lệ nếu chưa có dữ liệu. Dữ liệu classroom/session cũ có department_id NULL sẽ không được trả trong API theo phòng. Hướng dẫn này không tự gán dữ liệu cũ sang phòng mới. Chưa có handler POST tạo lịch hoặc CRUD cơ sở vật chất trong thay đổi này.

## 20. Bãi nhiệm và kiểm tra audit

DELETE {{people}}/departments/{{departmentId}}/members/{{staffId}} — Bearer {{ownerToken}} → 204.

GET members bằng OWNER → 200, không còn STAFF vừa bãi nhiệm. Bãi nhiệm gỡ bản ghi phòng/chức vụ, không xóa tài khoản Identity. Khi STAFF refresh/login lại, token mới có role STAFF, departmentId null và permissions rỗng.

Trong MySQL Workbench:

```sql
SELECT id, name FROM mems_people_db.department;
SELECT id, name FROM mems_people_db.position;

SELECT user_id, org_id, department_id, role, appointed_by, appointed_at
FROM mems_people_db.department_member;

SELECT user_id, position_id, org_id
FROM mems_people_db.member_position;

SELECT action, actor_user_id, target_id, created_at, details
FROM mems_people_db.people_audit_log
ORDER BY created_at DESC
LIMIT 30;
```

Audit phải có MEMBER_APPOINTED, MEMBER_POSITIONS_CHANGED, MEMBER_REMOVED, POSITION_CREATED/POSITION_UPDATED theo các request đã làm. Không chứa mật khẩu tạm.

Xóa bù tài khoản là cơ chế xử lý lỗi giữa hai service: nếu People không lưu được bổ nhiệm sau khi tạo tài khoản, hệ thống gọi xóa tài khoản vừa tạo. Nếu Identity lỗi/timeout, account_compensation giữ công việc để retry. Các ca lỗi và retry được kiểm tra bằng test tự động; chuỗi Postman này tập trung vào luồng nghiệp vụ và phân quyền.

Nếu muốn dọn dữ liệu People vừa tạo, dùng OWNER bãi nhiệm MANAGER còn lại, sau đó xóa ba chức vụ và hai phòng bằng các ID đã lưu. Chỉ xóa dữ liệu test của phiên này; tài khoản Identity và lịch sử audit vẫn giữ lại.

## 21. Lỗi thường gặp

| Hiện tượng | Cần kiểm tra |
|---|---|
| Docker báo thiếu DB_USERNAME/DB_PASSWORD/JWT secret | Đặt .env cùng thư mục docker-compose.yml, điền giá trị thật rồi recreate container |
| Access denied for user / Communications link failure | MySQL host đang bật cổng 3306; tài khoản, mật khẩu và quyền kết nối từ Docker |
| Unknown database / table / column | Chạy schema/migration đúng database trước khi khởi động service |
| Register lỗi ORG_OWNER chưa cấu hình | Kiểm tra dữ liệu nền từ file 05, không chỉ seed OWNER mới |
| Register báo Invalid module | Gọi GET /api/v1/modules và dùng đúng code đang active |
| OWNER login 403 ngay sau đăng ký | Tổ chức và tài khoản đang pending, cần SUPER_ADMIN duyệt |
| Login SUPER_ADMIN 401 | Dùng mật khẩu thực tế; sửa ADMIN_BOOTSTRAP_PASSWORD trong .env không đổi hash trong database |
| Duyệt tổ chức 403 | Request phải dùng adminToken có vai trò SUPER_ADMIN, không dùng ownerToken |
| PASSWORD_CHANGE_REQUIRED | Đổi mật khẩu bằng token tạm, sau đó login lại bằng mật khẩu mới |
| MANAGER tạo STAFF 403 | Token mới sau đổi mật khẩu, đúng phòng; chức vụ quản lý có PEOPLE_EDIT và chứa toàn bộ quyền muốn gán |
| IDENTITY_UNAVAILABLE 503 ở People | Identity container đang chạy, INTERNAL_API_KEY giống nhau và đủ 32 ký tự; xem log hai service |
| Login/refresh MANAGER hoặc STAFF 503 | People chưa sẵn sàng hoặc secret gọi nội bộ sai; hệ thống không phát token dựa trên quyền cũ |
| Username already exists / ACCOUNT_EXISTS | Dùng username mới cho từng lượt test; không gửi lại request tạo thành viên để đăng nhập |
| Refresh 401 sau đổi mật khẩu | Refresh cũ đã bị thu hồi, login lại |
| Refresh 401 sau lần refresh trước | Đã xoay token; lấy refresh token mới nhất từ response |
| Đổi quyền nhưng access token cũ vẫn gọi được | Token cũ chưa hết hạn; refresh và dùng access token mới để kiểm tra |
| POST /departments qua 8080 không vào People | Gateway chưa có route People; dùng trực tiếp 8082 |
| Facility/Schedule trả [] | Chưa có bản ghi thuộc đúng org/phòng, hoặc department_id vẫn NULL |
| Eureka báo unhealthy nhưng registry mở được | Healthcheck Compose đang gọi /actuator/health; kiểm tra endpoint đó và log Eureka, không kết luận chỉ từ trạng thái container |

Các lệnh xem log:

```powershell
docker compose logs --tail=100 identity-org-service people-service
docker compose logs --tail=100 schedule-service facility-service
docker compose logs --tail=100 eureka-server
```

## 22. Checklist hoàn tất và giới hạn xác minh

- [ ] Đã chạy SQL 06–09 trên database phát triển.
- [ ] Bootstrap OWNER tắt; không đưa email/mật khẩu OWNER từng tổ chức vào .env.
- [ ] Docker khởi động Identity và People thành công.
- [ ] Đăng ký tổ chức trả 201; OWNER pending chưa login được.
- [ ] SUPER_ADMIN duyệt trả 204; OWNER login được.
- [ ] OWNER tạo phòng, chức vụ, MANAGER thành công.
- [ ] MANAGER và STAFF đổi mật khẩu tạm, login lại thành công.
- [ ] MANAGER thêm STAFF cùng phòng và gán tập quyền hợp lệ được.
- [ ] Thiếu token/sai vai trò/sai phòng/cấp vượt quyền bị chặn.
- [ ] OWNER tổ chức B không sửa được phòng của tổ chức A.
- [ ] Không xóa phòng còn thành viên hoặc chức vụ đang dùng.
- [ ] Refresh trả quyền mới và xoay refresh token.
- [ ] Audit có người thao tác, đối tượng và thời điểm.

Lượt kiểm thử code trước đó đã qua 69 test trên H2 và mock ranh giới gọi service ngoài; sáu POM độc lập đã qua validate. Chưa xác nhận lượt chạy Docker/MySQL/Postman trên máy bạn. Checklist trên là phần kiểm thử tích hợp bạn cần thực hiện, không phải kết quả đã chạy sẵn.

## 23. Quản lý Sinh viên & Lớp học (module STUDENT_MANAGEMENT)

Module `STUDENT_MANAGEMENT` cho phép quản lý sinh viên và lớp học thuộc phạm vi toàn tổ chức (`orgId`), phân quyền theo phòng ban.

### 23.1 Điều kiện tiên quyết: Tổ chức kích hoạt module
Tổ chức phải có module `STUDENT_MANAGEMENT` ở trạng thái `active`. Nếu tổ chức chưa có, SUPER_ADMIN có thể cập nhật qua API:
```http
PUT http://localhost:8081/api/v1/organizations/{{orgId}}/modules
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{"modules": ["STUDENT_MANAGEMENT"]}
```

### 23.2 Tạo phòng ban gắn module
OWNER tạo phòng ban phụ trách quản lý sinh viên:
```http
POST http://localhost:8082/departments
Authorization: Bearer {{ownerToken}}
Content-Type: application/json

{
  "name": "Phòng Đào tạo",
  "description": "Quản lý đào tạo và sinh viên",
  "moduleCodes": ["STUDENT_MANAGEMENT"]
}
```
*Lưu ý:* Nếu gửi module ngoài danh sách cho phép hoặc module chưa active tại tổ chức, API sẽ trả về `400 MODULE_NOT_ENABLED`.

### 23.3 Tạo chức vụ quản lý sinh viên & lớp học
OWNER tạo chức vụ:
```http
POST http://localhost:8082/positions
Authorization: Bearer {{ownerToken}}
Content-Type: application/json

{
  "name": "Giáo vụ sinh viên",
  "description": "Quản lý sinh viên và lớp học",
  "permissions": [
    "PEOPLE_VIEW", "PEOPLE_EDIT",
    "STUDENT_VIEW", "STUDENT_CREATE", "STUDENT_EDIT", "STUDENT_DELETE",
    "CLASS_VIEW", "CLASS_CREATE", "CLASS_EDIT", "CLASS_DELETE"
  ]
}
```

### 23.4 Thao tác Sinh viên & Lớp học
1. **Tạo lớp học:**
```http
POST http://localhost:8082/classes
Authorization: Bearer {{ownerToken}}
Content-Type: application/json

{"classCode": "K18A", "name": "Lớp K18A", "academicYear": "2024-2028", "status": "active"}
```
2. **Tạo sinh viên:**
```http
POST http://localhost:8082/students
Authorization: Bearer {{ownerToken}}
Content-Type: application/json

{"studentCode": "SV001", "fullName": "Trần Văn B", "email": "b@example.com", "status": "active"}
```
3. **Xếp sinh viên vào lớp:**
```http
PUT http://localhost:8082/classes/{{classId}}/students/{{studentId}}
Authorization: Bearer {{ownerToken}}
```
4. **Xem danh sách sinh viên trong lớp:**
```http
GET http://localhost:8082/classes/{{classId}}/students
Authorization: Bearer {{ownerToken}}
```

### 23.5 Các ca kiểm thử bị chặn cần chú ý
- **Tổ chức chưa active module:** Gọi bất kỳ API `/students/**` hoặc `/classes/**` bị trả `400 MODULE_NOT_ENABLED` (kể cả OWNER).
- **Phòng ban không gắn module STUDENT_MANAGEMENT:** MANAGER gán chức vụ có quyền sinh viên cho STAFF sẽ bị trả `403 PERMISSION_OUT_OF_MODULE`.
- **Gỡ module khỏi phòng:** Sau khi gỡ `STUDENT_MANAGEMENT` khỏi phòng, nhân viên trong phòng đó khi refresh token sẽ bị biến mất toàn bộ quyền sinh viên trong JWT.
- **Xóa lớp còn sinh viên:** Bị chặn với mã lỗi `409 CLASS_NOT_EMPTY`.
- **Xếp sinh viên vào lớp thứ hai:** Bị chặn với mã lỗi `409 STUDENT_ALREADY_IN_CLASS`.

---

Tài liệu kỹ thuật/API: [department-access.md](department-access.md). Request HTTP bổ sung: [department-access.http](department-access.http). Danh sách file thay đổi: [department-access-files.md](department-access-files.md).
