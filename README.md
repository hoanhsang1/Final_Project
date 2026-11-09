# MEMS — Hệ thống Quản lý Giáo dục theo Module

Nền tảng quản lý giáo dục **đa tổ chức** (multi-tenant): một hệ thống phục vụ nhiều
trường/trung tâm, mỗi tổ chức bật/tắt module theo nhu cầu.

Repo gồm **backend microservices** (Spring Boot), **frontend** (React + TypeScript) và
**bộ script SQL** tạo database. Tài liệu này hướng dẫn từ lúc clone repo đến lúc chạy
được toàn bộ hệ thống ở máy cá nhân.

---

## 0. Trạng thái dự án

| Phần | Trạng thái |
|---|---|
| Backend | Sprint 1–4 đã xong: xác thực, tổ chức, phân quyền theo phòng ban, học sinh/lớp, hồ sơ giáo viên, gán giáo viên, vòng đời lớp, đóng lớp có duyệt |
| Frontend | Sprint 1–3: đăng nhập, console quản trị, cổng tổ chức (học sinh, lớp, phòng ban, chức vụ, nhân sự) |
| Giao diện Sprint 4 | **Chưa làm** — hợp đồng API và hướng dẫn dựng UI nằm trong `docs/sprint4-fe-handoff.md` |
| Database | 15 script SQL tại thư mục gốc, chạy theo thứ tự `01 → 15` |

**Bạn muốn làm gì?**

| Nhu cầu | Đọc mục |
|---|---|
| Chạy thử nhanh | [1](#1-chạy-nhanh-tldr) |
| Hiểu kiến trúc, cổng, route | [2](#2-kiến-trúc-và-cổng) |
| Nạp database | [4](#4-chuẩn-bị-database) |
| Cấu hình biến môi trường | [5](#5-cấu-hình-biến-môi-trường) |
| Chạy backend / frontend | [6](#6-chạy-backend) · [7](#7-chạy-frontend) |
| Chạy test | [8](#8-kiểm-thử) |
| Gọi thử API bằng tài khoản mẫu | [9](#9-dữ-liệu-mẫu-và-gọi-thử-api) |
| Làm giao diện Sprint 4 | [`docs/sprint4-fe-handoff.md`](docs/sprint4-fe-handoff.md) |
| Tra cứu API | [`docs/sprint4-api.md`](docs/sprint4-api.md) · [`docs/api.md`](docs/api.md) |

---

## 1. Chạy nhanh (TL;DR)

Cần: **JDK 17+**, **MySQL 8.0.16+**, **Node 20+**. Maven không bắt buộc vì mỗi service
có Maven Wrapper (`mvnw` / `mvnw.cmd`). Docker chỉ cần nếu chạy bằng `docker compose`.

> Windows cmd/PowerShell: dùng `mvnw.cmd` thay cho `./mvnw`; lệnh `mysql ... < file.sql`
> chạy trong `cmd /c`, Git Bash hoặc MySQL Workbench. Linux/macOS nếu báo
> `Permission denied`, chạy `chmod +x mvnw` một lần trong thư mục service (file trong
> repo chưa có bit thực thi).

```bash
# 1) Tạo file biến môi trường
cp .env.example .env          # Windows: copy .env.example .env
# Mở .env và điền DB_USERNAME, DB_PASSWORD, JWT_SECRET_BASE64, INTERNAL_API_KEY.

# 2) Nạp database mới (chạy lần lượt 01 → 15)
mysql -u root -p --default-character-set=utf8mb4 < 01_identity_db.sql
mysql -u root -p --default-character-set=utf8mb4 < 02_people_db.sql
mysql -u root -p --default-character-set=utf8mb4 < 03_schedule_db.sql
mysql -u root -p --default-character-set=utf8mb4 < 04_facility_db.sql
mysql -u root -p --default-character-set=utf8mb4 < 05_seed_admin.sql
mysql -u root -p --default-character-set=utf8mb4 < 06_identity_department_access.sql
mysql -u root -p --default-character-set=utf8mb4 < 07_people_department_access.sql
mysql -u root -p --default-character-set=utf8mb4 < 08_facility_department_access.sql
mysql -u root -p --default-character-set=utf8mb4 < 09_schedule_department_access.sql
mysql -u root -p --default-character-set=utf8mb4 < 10_identity_permission_module.sql
mysql -u root -p --default-character-set=utf8mb4 < 11_people_student_class.sql
mysql -u root -p --default-character-set=utf8mb4 < 12_people_member_username.sql
mysql -u root -p --default-character-set=utf8mb4 < 13_people_sprint4.sql
mysql -u root -p --default-character-set=utf8mb4 < 14_identity_sprint4_permissions.sql

# 3) Dữ liệu mẫu cho dev/test (script idempotent, chạy lại nhiều lần không lỗi).
#    Nếu chạy trước lần đầu IdentityService khởi động, xem ghi chú bên dưới.
mysql -u root -p --default-character-set=utf8mb4 < 15_sprint4_sample.sql

# 4) Build 3 service cần cho luồng chính
cd backend/IdentityService && ./mvnw package -DskipTests && cd ..
cd PeopleService && ./mvnw package -DskipTests && cd ..
cd APIGateway && ./mvnw package -DskipTests && cd ..

# 5) Chạy 3 service (mỗi service một cửa sổ terminal, xem mục 6-B)
#    IdentityService :8081 → PeopleService :8082 → APIGateway :8080

# 6) Chạy frontend
cd ../frontend
npm ci
npm run dev
```

Mở **http://localhost:5173**.

| Tài khoản | Mật khẩu | Vai trò |
|---|---|---|
| `platform_admin` | `123456` | Quản trị nền tảng (SUPER_ADMIN) |
| `sample_owner` | `Sample@123456` | OWNER tổ chức mẫu, toàn quyền |
| `sample_hr` | `Sample@123456` | Quản lý nhân sự / hồ sơ giáo viên |
| `sample_academic` | `Sample@123456` | Giáo vụ: lớp, gán giáo viên, gửi yêu cầu đóng |
| `sample_head` | `Sample@123456` | Trưởng phòng ban: duyệt / mở lại lớp |

> Dữ liệu mẫu ở bước 3 chỉ dành cho **dev/test**. Không nạp `15_sprint4_sample.sql`
> lên môi trường thật.
>
> Nếu bạn nạp `15_sprint4_sample.sql` **trước lần đầu tiên** IdentityService khởi động,
> các dòng gán role cho tài khoản mẫu sẽ không có tác dụng (role chưa tồn tại). Khi đó
> chỉ cần chạy lại `15_sprint4_sample.sql` sau khi IdentityService đã khởi động lần đầu.

> Trên PowerShell, ký tự `<` không dùng để chuyển file được. Hãy chạy lệnh `mysql` trong
> **cmd** (`cmd /c "mysql -u root -p < 01_identity_db.sql"`), **Git Bash**, hoặc mở file
> bằng MySQL Workbench rồi Execute.

---

## 2. Kiến trúc và cổng

```
Trình duyệt (localhost:5173)
        │  gọi /api/..., /departments, /classes, ...
        ▼
Vite dev proxy  ──►  API Gateway (8080)
                          ├──►  IdentityService (8081) ──► mems_identity_db
                          └──►  PeopleService (8082)   ──► mems_people_db

ScheduleService (8083) ──► mems_schedule_db   (chưa nối gateway)
FacilityService (8084) ──► mems_facility_db   (chưa nối gateway)

Eureka Server (8761) — chỉ cần khi chạy Docker Compose
MySQL (3306) — mỗi service sở hữu database riêng
```

| Thành phần | Cổng | Vai trò |
|---|---|---|
| Frontend (Vite) | 5173 | React + TypeScript |
| API Gateway | 8080 | Điểm vào duy nhất cho frontend |
| IdentityService | 8081 | Xác thực, tổ chức, tài khoản, vai trò, quyền, module |
| PeopleService | 8082 | Phòng ban, chức vụ, nhân sự, giáo viên, chuyên môn, học sinh, lớp |
| ScheduleService | 8083 | Thời khoá biểu (chưa nối gateway) |
| FacilityService | 8084 | Phòng học, thiết bị (chưa nối gateway) |
| Eureka Server | 8761 | Service registry (chỉ dùng khi chạy Docker) |
| MySQL | 3306 | 4 database riêng: `mems_identity_db`, `mems_people_db`, `mems_schedule_db`, `mems_facility_db` |

### Route của API Gateway

| Đường dẫn | Service đích | Ghi chú |
|---|---|---|
| `/api/v1/auth/**` | IdentityService | Đăng nhập, refresh, đăng ký tổ chức |
| `/api/v1/organizations/**` | IdentityService | Duyệt/từ chối tổ chức, cấu hình module |
| `/api/v1/accounts/**`, `/api/v1/audit-logs/**`, `/api/v1/modules` | IdentityService | Console quản trị |
| `/departments/**`, `/positions/**`, `/permissions/**` | PeopleService | Không có tiền tố `/api` |
| `/students/**`, `/classes/**`, `/teachers/**`, `/specialties/**` | PeopleService | Đường dẫn gốc |
| `/api/teachers/**`, `/api/specialties/**`, `/api/classes/**` | PeopleService | Alias có `/api`, gateway bỏ tiền tố (`StripPrefix=1`) |

> Chỉ `teachers`, `specialties`, `classes` có alias `/api`. Các nhóm
> `departments`, `positions`, `permissions`, `students` phải gọi **không** có `/api`.
>
> `ScheduleService` và `FacilityService` chưa có route trên gateway. Muốn dùng phải gọi
> thẳng cổng 8083/8084 hoặc bổ sung route vào
> `backend/APIGateway/src/main/resources/application.yml`.

### Cấu trúc thư mục

```
Final_Project/
├── backend/
│   ├── IdentityService/     # 8081 — xác thực, tổ chức, tài khoản, quyền
│   ├── PeopleService/       # 8082 — phòng ban, nhân sự, giáo viên, lớp
│   ├── ScheduleService/     # 8083 — thời khoá biểu
│   ├── FacilityService/     # 8084 — phòng học, thiết bị
│   ├── APIGateway/          # 8080 — cổng vào duy nhất
│   └── EurekaServer/        # 8761 — service registry
├── frontend/                # React + TypeScript + Vite
├── docs/                    # tài liệu API, migration, Sprint 4
├── scripts/                 # mở Cloudflare Quick Tunnel
├── 01_…_15_*.sql            # schema, migration, dữ liệu mẫu
├── docker-compose.yml
└── .env.example
```

Mỗi service có `pom.xml` và Maven Wrapper riêng, build độc lập; không có POM cha chung.

---

## 3. Yêu cầu môi trường

| Phần mềm | Phiên bản | Bắt buộc? |
|---|---|---|
| JDK | 17 trở lên (CI và máy nhóm dùng 21) | Có |
| Maven | Không cần cài — dùng `mvnw` / `mvnw.cmd` trong từng service | — |
| MySQL | **8.0.16+** | Có |
| Node.js | 20+ (khuyến nghị 22 hoặc 24) | Có (frontend) |
| Docker Desktop | — | Không bắt buộc |

> MySQL phải từ **8.0.16** vì schema dùng `DEFAULT (UUID())`. Bản cũ hơn báo lỗi cú pháp.
>
> Docker Desktop nên cấp ≥ 8 GB RAM. Máy ít RAM dùng cách chạy native ở mục 6-B.

---

## 4. Chuẩn bị database

Dự án **không dùng** Flyway/Liquibase. Schema nằm trong các file SQL ở thư mục gốc và
phải chạy **theo đúng thứ tự số**.

### 4.1. Các file SQL

| File | Database | Nội dung |
|---|---|---|
| `01_identity_db.sql` | `mems_identity_db` | Tổ chức, tài khoản, vai trò, quyền, module, token |
| `02_people_db.sql` | `mems_people_db` | Bảng nền của People (học sinh, lớp cũ, …) |
| `03_schedule_db.sql` | `mems_schedule_db` | Bảng nền của Schedule |
| `04_facility_db.sql` | `mems_facility_db` | Bảng nền của Facility |
| `05_seed_admin.sql` | `mems_identity_db` | 6 vai trò hệ thống + 15 quyền nền + 6 module + tài khoản `platform_admin` |
| `06_identity_department_access.sql` | `mems_identity_db` | Thêm `must_change_password`, `provisioned_by` cho tài khoản |
| `07_people_department_access.sql` | `mems_people_db` | Phòng ban, chức vụ, thành viên phòng ban |
| `08_facility_department_access.sql` | `mems_facility_db` | Gắn phòng ban cho phòng học |
| `09_schedule_department_access.sql` | `mems_schedule_db` | Gắn phòng ban cho buổi học |
| `10_identity_permission_module.sql` | `mems_identity_db` | Gắn quyền với module, trạng thái module theo tổ chức |
| `11_people_student_class.sql` | `mems_people_db` | `department_module`, `student`, `school_class`, `class_student` |
| `12_people_member_username.sql` | `mems_people_db` | Lưu username hiển thị của thành viên |
| `13_people_sprint4.sql` | `mems_people_db` | Hồ sơ giáo viên, chuyên môn, vòng đời lớp, yêu cầu đóng lớp |
| `14_identity_sprint4_permissions.sql` | `mems_identity_db` | Bổ sung quyền Sprint 4 (`CLASS_*`, `PEOPLE_*`, …) |
| `15_sprint4_sample.sql` | cả hai DB | **Chỉ dev/test**: tổ chức mẫu, tài khoản mẫu, chức vụ, lớp |

Tất cả script từ `06` trở đi đều **idempotent** (chạy lại không lỗi, không xoá dữ liệu).
Tuyệt đối không tự ý `DROP TABLE` / `DROP DATABASE` hoặc đổi
`spring.jpa.hibernate.ddl-auto` thành `create` / `create-drop`.

### 4.2. Cài mới (database trống)

```bash
mysql -u root -p --default-character-set=utf8mb4 < 01_identity_db.sql
# … lần lượt đến 15_sprint4_sample.sql
```

Có thể mở từng file bằng MySQL Workbench rồi bấm Execute.

### 4.3. Database đang có dữ liệu (nâng cấp)

Không chạy lại `01`–`05` (các file này tạo bảng và gieo dữ liệu nền). Chỉ chạy phần
bổ sung, theo thứ tự:

```bash
# Identity
mysql -u root -p < 06_identity_department_access.sql
mysql -u root -p < 10_identity_permission_module.sql
mysql -u root -p < 14_identity_sprint4_permissions.sql

# People
mysql -u root -p < 07_people_department_access.sql
mysql -u root -p < 11_people_student_class.sql
mysql -u root -p < 12_people_member_username.sql
mysql -u root -p < 13_people_sprint4.sql

# Facility / Schedule (nếu dùng)
mysql -u root -p < 08_facility_department_access.sql
mysql -u root -p < 09_schedule_department_access.sql
```

> **Sao lưu trước khi chạy** ở môi trường dùng chung. Chạy `13` và `14` **trước khi**
> deploy bản backend mới. Hướng dẫn chi tiết: `docs/sprint4-migration.md`.

### 4.4. Kiểm tra nhanh sau khi nạp

```sql
USE mems_identity_db;
SHOW TABLES LIKE 'account';
SHOW COLUMNS FROM account LIKE 'provisioned_by';
SELECT code FROM permission WHERE code LIKE 'CLASS_%';

USE mems_people_db;
SHOW TABLES LIKE 'staff_profile';
SHOW TABLES LIKE 'teacher_specialty';
SELECT COUNT(*) FROM position WHERE org_id = '11111111-1111-4111-8111-111111111111';
```

---

## 5. Cấu hình biến môi trường

```bash
cp .env.example .env      # Windows: copy .env.example .env
```

| Biến | Bắt buộc | Ý nghĩa / mặc định |
|---|---|---|
| `DB_USERNAME` | Có | Tài khoản MySQL |
| `DB_PASSWORD` | Có | Mật khẩu MySQL |
| `JWT_SECRET_BASE64` | Có | Khoá ký JWT: chuỗi **base64 của 32 byte** ngẫu nhiên |
| `INTERNAL_API_KEY` | Nên đặt | Khoá gọi nội bộ giữa Identity ↔ People, tối thiểu 32 ký tự |
| `EUREKA_URL` | Không | Mặc định `http://localhost:8761/eureka/` |
| `IDENTITY_SERVICE_URL` | Không | Mặc định `http://localhost:8081` |
| `PEOPLE_SERVICE_URL` | Không | Mặc định `http://localhost:8082` |
| `CORS_ALLOWED_ORIGINS` | Không | Mặc định `http://localhost:5173,http://127.0.0.1:5173,https://*.vercel.app` (service đọc biến này; gateway đọc cấu hình riêng) |
| `TEACHER_ASSIGNMENT_MODULE_CODE` | Không | Mặc định `TEACHER_ASSIGNMENT` (chỉ kiểm tra cờ module) |
| `OWNER_BOOTSTRAP_*` | Không | Tạo tài khoản OWNER đầu tiên cho một tổ chức đã tồn tại |
| `ADMIN_BOOTSTRAP_PASSWORD` | Không | **Không còn được mã sử dụng**; xem ghi chú bên dưới |

Tạo khoá:

```bash
openssl rand -base64 32     # JWT_SECRET_BASE64
openssl rand -hex 32        # INTERNAL_API_KEY
```

> **Không commit `.env`.** Repo công khai; lộ `JWT_SECRET_BASE64` là ai cũng ký được
> token giả. `.gitignore` đã chặn `.env` ở gốc repo và `frontend/`.
>
> Mỗi service đọc biến môi trường của **tiến trình đang chạy**, không tự đọc file `.env`.
> Đặt biến trong terminal rồi chạy `java -jar` trong **cùng** cửa sổ đó.
>
> `ADMIN_BOOTSTRAP_PASSWORD` trong `.env.example` là biến cũ. Mã hiện tại **không** đọc
> biến này; `platform_admin` được đặt lại mật khẩu `123456` mỗi lần IdentityService khởi
> động (xem mục 13).

---

## 6. Chạy backend

Có hai cách. **Cách B (native) đã được kiểm chứng** và phù hợp máy ít RAM.

### Cách A — Docker Compose

```bash
docker compose up --build
```

- Dựng 6 container: Eureka, Identity, People, Schedule, Facility, Gateway.
- **MySQL không nằm trong compose** — container kết nối ra MySQL trên máy thật qua
  `host.docker.internal:3306`. Vẫn phải cài MySQL và nạp SQL ở mục 4 trước.
- Lần build đầu khá lâu vì tải toàn bộ thư viện Maven.
- Biến môi trường lấy từ `.env` ở thư mục gốc (`DB_USERNAME`, `DB_PASSWORD`,
  `JWT_SECRET_BASE64`, `INTERNAL_API_KEY`, …).
- Gateway tự trỏ tới `identity-org-service:8081` và `people-service:8082` trong mạng
  Docker; không cần đặt `IDENTITY_SERVICE_URL` / `PEOPLE_SERVICE_URL` thủ công.

### Cách B — Chạy native (khuyến nghị)

Chỉ cần 3 service cho luồng chính: **IdentityService → PeopleService → APIGateway**.
Không cần Docker, không cần Eureka.

Build (dùng Maven Wrapper, không cần cài Maven):

```bash
cd backend/IdentityService && ./mvnw package -DskipTests && cd ..
cd backend/PeopleService   && ./mvnw package -DskipTests && cd ..
cd backend/APIGateway      && ./mvnw package -DskipTests && cd ..
```

Kết quả:

```
backend/IdentityService/target/IdentityService-0.0.1-SNAPSHOT.jar
backend/PeopleService/target/PeopleService-0.0.1-SNAPSHOT.jar
backend/APIGateway/target/APIGateway-0.0.1-SNAPSHOT.jar
```

**Cửa sổ 1 — IdentityService (8081):**

```powershell
$env:DB_URL            = "jdbc:mysql://localhost:3306/mems_identity_db"
$env:DB_USERNAME       = "<từ .env>"
$env:DB_PASSWORD       = "<từ .env>"
$env:JWT_SECRET_BASE64 = "<từ .env>"
$env:INTERNAL_API_KEY  = "<từ .env>"
$env:PEOPLE_SERVICE_URL = "http://localhost:8082"
java -jar backend\IdentityService\target\IdentityService-0.0.1-SNAPSHOT.jar --eureka.client.enabled=false
```

**Cửa sổ 2 — PeopleService (8082):**

```powershell
$env:DB_URL             = "jdbc:mysql://localhost:3306/mems_people_db"
$env:DB_USERNAME        = "<từ .env>"
$env:DB_PASSWORD        = "<từ .env>"
$env:JWT_SECRET_BASE64  = "<từ .env>"
$env:INTERNAL_API_KEY   = "<từ .env>"
$env:IDENTITY_SERVICE_URL = "http://localhost:8081"
java -jar backend\PeopleService\target\PeopleService-0.0.1-SNAPSHOT.jar --eureka.client.enabled=false
```

**Cửa sổ 3 — APIGateway (8080):**

```powershell
$env:IDENTITY_SERVICE_URL = "http://localhost:8081"
$env:PEOPLE_SERVICE_URL   = "http://localhost:8082"
java -jar backend\APIGateway\target\APIGateway-0.0.1-SNAPSHOT.jar --eureka.client.enabled=false
```

Trên macOS/Linux dùng `export TEN_BIEN=...` thay cho `$env:TEN_BIEN=...`.

> `--eureka.client.enabled=false` chỉ tắt việc đăng ký Eureka khi chạy native. Nếu bỏ
> tham số này, service vẫn chạy nhưng log sẽ liên tục báo không kết nối được Eureka
> (`localhost:8761`). Gateway vẫn định tuyến bình thường vì route dùng URL tĩnh từ
> `IDENTITY_SERVICE_URL` / `PEOPLE_SERVICE_URL`.
>
> Nếu muốn chạy cả Eureka: `cd backend/EurekaServer && ./mvnw spring-boot:run` trước,
> rồi bỏ cờ `--eureka.client.enabled=false`.

### Kiểm tra backend đã lên

```bash
curl http://localhost:8081/api/v1/auth/test
# → {"success":true,"message":"Identity Service is running","data":null}
```

Xem Swagger UI của từng service (gọi thẳng cổng service, gateway không định tuyến):

- IdentityService: http://localhost:8081/swagger-ui/index.html
- PeopleService: http://localhost:8082/swagger-ui/index.html
- OpenAPI JSON: `/v3/api-docs` trên cùng cổng

Đăng nhập qua gateway:

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"sample_owner","password":"Sample@123456"}'
```

> PowerShell: `curl` là alias của `Invoke-WebRequest` và rất dễ làm hỏng JSON. Dùng
> `curl.exe`, hoặc ghi body ra file rồi `curl.exe --data-binary "@body.json"`.

---

## 7. Chạy frontend

```bash
cd frontend
npm ci
npm run dev
```

Mở **http://localhost:5173** (đừng dùng `127.0.0.1:5173` — Vite lắng nghe IPv6).

`vite.config.ts` proxy các nhóm đường dẫn `/api`, `/departments`, `/positions`,
`/permissions`, `/students`, `/classes` sang gateway `http://127.0.0.1:8080`. Nhờ vậy
trình duyệt không vướng CORS khi phát triển.

Muốn trỏ sang backend khác (ví dụ tunnel/remote), đặt biến môi trường thay vì sửa file:

```bash
VITE_API_TARGET=https://xxx.trycloudflare.com npm run dev
```

### Lệnh frontend

| Lệnh | Việc nó làm |
|---|---|
| `npm run dev` | Dev server, tự cập nhật khi sửa code |
| `npm run build` | Kiểm tra type rồi build production |
| `npm test` | Unit test (Vitest) |
| `npm run test:watch` | Test ở chế độ theo dõi |
| `npm run test:e2e` | E2E Playwright (tự build + preview ở cổng 4173) |
| `npm run test:e2e:ui` | Mở Playwright UI |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run preview` | Xem thử bản đã build |

---

## 8. Kiểm thử

### Backend

Chạy test từng module bằng Maven Wrapper:

```bash
(cd backend/PeopleService   && ./mvnw test)
(cd backend/IdentityService && ./mvnw test)
```

- `PeopleService`: 80 test (repository với H2 chế độ MySQL + controller với MockMvc),
  phủ trùng mã/email, tìm kiếm không dấu, phân trang, chuyển trạng thái lớp, job tự động,
  luồng đóng/duyệt/từ chối/mở lại, cách ly tổ chức, 401/403.
- `IdentityService`: 2 test.
- Các module còn lại: build xanh, chưa có test nghiệp vụ.
- Test backend **không cần MySQL thật** (dùng H2 trong bộ nhớ).

### Frontend

```bash
cd frontend
npm run lint
npm test
npm run build
```

### CI

`.github/workflows/ci.yml` chạy khi push lên `main` hoặc mở pull request:

- Build + test lần lượt 6 module backend (matrix).
- Frontend: `npm ci` → lint → test → build.

---

## 9. Dữ liệu mẫu và gọi thử API

`15_sprint4_sample.sql` tạo tổ chức **Trường THPT Mẫu MEMS**
(`11111111-1111-4111-8111-111111111111`) với:

| Tài khoản | Mật khẩu | Vai trò / chức vụ | Quyền chính |
|---|---|---|---|
| `sample_owner` | `Sample@123456` | OWNER | Tất cả |
| `sample_hr` | `Sample@123456` | MANAGER — Nhân sự phòng ban | `PEOPLE_VIEW`, `PEOPLE_EDIT`, `CLASS_VIEW` |
| `sample_academic` | `Sample@123456` | STAFF — Giáo vụ | `CLASS_*` (trừ duyệt đóng), `STUDENT_*` |
| `sample_head` | `Sample@123456` | STAFF — Trưởng phòng ban | `CLASS_VIEW`, `CLASS_CLOSE_APPROVE`, `CLASS_REOPEN` |
| `sample_teacher` | `Sample@123456` | Giáo viên, `DANG_DAY` | Xem lớp, học sinh, lịch |
| `sample_teacher2` | `Sample@123456` | Giáo viên, `TAM_NGHI` | Không xuất hiện trong danh sách gán lớp |

Kịch bản HTTP đầy đủ (đăng nhập → tạo chuyên môn → tạo giáo viên → tạo lớp → gán giáo
viên → huỷ lớp → yêu cầu đóng → duyệt → mở lại) nằm trong
[`docs/sprint4-manual-scenario.http`](docs/sprint4-manual-scenario.http). Mở bằng
IntelliJ HTTP Client hoặc VS Code REST Client.

Ví dụ gọi nhanh sau khi có token:

```bash
# Danh sách giáo viên (alias /api)
curl -s "http://localhost:8080/api/teachers?page=1&size=20" \
  -H "Authorization: Bearer <accessToken>"

# Danh mục chuyên môn
curl -s "http://localhost:8080/api/specialties" \
  -H "Authorization: Bearer <accessToken>"

# Danh sách lớp
curl -s "http://localhost:8080/api/classes?page=1&size=20" \
  -H "Authorization: Bearer <accessToken>"
```

---

## 10. Tài liệu

| File | Nội dung |
|---|---|
| [`docs/sprint4-api.md`](docs/sprint4-api.md) | Hợp đồng API Sprint 4: endpoint, quyền, request/response, mã lỗi |
| [`docs/sprint4-fe-handoff.md`](docs/sprint4-fe-handoff.md) | Hướng dẫn frontend dựng giao diện Sprint 4 |
| [`docs/sprint4-feature-file-map.md`](docs/sprint4-feature-file-map.md) | Chức năng ↔ file nguồn |
| [`docs/sprint4-implementation-report.md`](docs/sprint4-implementation-report.md) | Báo cáo triển khai Sprint 4 |
| [`docs/sprint4-ac-matrix.md`](docs/sprint4-ac-matrix.md) | Đối chiếu AC-15 → AC-19 với test/kịch bản |
| [`docs/sprint4-migration.md`](docs/sprint4-migration.md) | Chạy migration DB ở local và môi trường khác |
| [`docs/sprint4-manual-scenario.http`](docs/sprint4-manual-scenario.http) | Kịch bản gọi API thủ công |
| [`docs/sprint4-survey.md`](docs/sprint4-survey.md) | Khảo sát code và quyết định kỹ thuật |
| [`docs/api.md`](docs/api.md) | API auth, tổ chức, tài khoản, audit |
| [`docs/department-access.md`](docs/department-access.md) | Phân quyền theo phòng ban |
| [`docs/docker-postman-guide.md`](docs/docker-postman-guide.md) | Chạy bằng Docker và gọi Postman |
| `docs/MEMS_Backend_API_Documentation.docx` | Tài liệu API dạng Word |
| [`frontend/README.md`](frontend/README.md) | Hướng dẫn riêng cho frontend |

---

## 11. Triển khai (tuỳ chọn)

Mô hình nhóm đang dùng: **frontend trên Vercel** → **Cloudflare Quick Tunnel** →
**backend + MySQL chạy trên máy cá nhân**.

1. Chạy database và backend ở máy host (mục 4 và 6). Phải có gateway ở cổng 8080.
2. Cài `cloudflared`, chạy:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/start-tunnel.ps1
   ```

   Script mở tunnel tới `http://localhost:8080`, đọc URL công khai và tự cập nhật
   `frontend/vercel.json`. Sau đó commit + push để Vercel deploy lại.
3. Tunnel Quick của Cloudflare đổi URL mỗi lần khởi động lại → phải chạy lại script và
   commit `frontend/vercel.json` mỗi lần đổi.
4. Trước khi deploy backend mới: chạy migration (`06`, `10`, `14`, `07`, `11`, `12`,
   `13`) trên database đích.
5. Đặt biến môi trường trên máy chủ, không hardcode URL/secret trong source.

---

## 12. Lỗi thường gặp

| Hiện tượng | Nguyên nhân & cách xử lý |
|---|---|
| Không mở được `127.0.0.1:5173` | Vite lắng nghe IPv6. Dùng `localhost:5173`. |
| Frontend báo lỗi mạng | Gateway (8080) chưa chạy, hoặc gọi thẳng 8080 từ domain khác bị CORS chặn. Kiểm tra proxy/gateway. |
| Log backend báo không kết nối Eureka | Chạy native mà không tắt Eureka. Thêm `--eureka.client.enabled=false`. |
| `Unknown database 'mems_identity_db'` | Chưa nạp SQL mục 4. |
| Lỗi cú pháp ở `DEFAULT (UUID())` | MySQL cũ hơn 8.0.16. Nâng cấp MySQL. |
| `Access denied for user` | `DB_USERNAME` / `DB_PASSWORD` sai hoặc chưa đặt trong đúng cửa sổ terminal. |
| Đăng nhập `platform_admin` sai mật khẩu | Mật khẩu dev là `123456` (IdentityService đặt lại mỗi lần khởi động). `ADMIN_BOOTSTRAP_PASSWORD` không có tác dụng. |
| Đăng nhập tài khoản mẫu trả 403 “no assigned roles” | `15_sprint4_sample.sql` chạy trước khi IdentityService tạo role. Chạy lại script 15. |
| Gọi API trả 503 `IDENTITY_UNAVAILABLE` | IdentityService chưa chạy, thiếu `INTERNAL_API_KEY` khớp giữa hai service, hoặc chưa chạy `06_identity_department_access.sql` (thiếu cột `provisioned_by`). |
| Gọi API trả 403 `FORBIDDEN` | Tài khoản thiếu quyền, hoặc giáo viên nằm ngoài phòng ban của người gọi. |
| 409 `DATA_CHANGED` / `STATUS_CHANGED` | Gửi `version` cũ. Tải lại bản ghi rồi thao tác lại, không ghi đè. Lớp có `startDate` đã qua sẽ tự chuyển trạng thái và tăng `version` khi đọc danh sách. |
| 400 `MODULE_NOT_ENABLED` | Module `STUDENT_MANAGEMENT` chưa bật cho tổ chức. Bật trong `organization_module` hoặc qua console quản trị. |
| 409 `TEACHER_ASSIGNMENT_MODULE_ACTIVE` | Tổ chức đã bật module phân công giáo viên (Epic 12). Sprint 4 chỉ kiểm tra cờ, chưa triển khai luồng Epic 12. |
| Đăng nhập báo “Phiên đăng nhập đã hết hạn” | Token cũ không khớp `JWT_SECRET_BASE64` hiện tại. Đăng nhập lại. |

### Bẫy riêng của PowerShell

- `curl` là alias của `Invoke-WebRequest`; dùng `curl.exe` nếu cần curl thật.
- `Invoke-WebRequest` tự thêm `Expect: 100-continue`, có thể gây `502` giả qua proxy Vite.
- Truyền JSON có ngoặc kép rất dễ hỏng; ghi JSON ra file rồi dùng
  `curl.exe --data-binary "@body.json"`.
- `mysql ... < file.sql` không chạy trong PowerShell; dùng `cmd /c`, Git Bash hoặc Workbench.

---

## 13. Ghi chú bảo mật

- **Không commit `.env`.** Repo công khai; lộ khoá JWT là ai cũng ký được token.
- `platform_admin` hiện được `IdentityDataInitializer` **đặt lại mật khẩu thành `123456`
  mỗi lần IdentityService khởi động**, và `AuthService` có nhánh chấp nhận `123456` cho
  `platform_admin`/`admin`. Đây là tiện ích dev; **phải sửa trước khi triển khai thật**
  (`backend/IdentityService/src/main/java/com/mems/config/IdentityDataInitializer.java`
  và `AuthService.java`).
- `INTERNAL_API_KEY` là khoá dùng chung giữa Identity và People. Đặt tối thiểu 32 ký tự,
  không gửi xuống frontend.
- Đổi `JWT_SECRET_BASE64` làm toàn bộ token cũ mất hiệu lực.
- CORS của service đọc từ `CORS_ALLOWED_ORIGINS`; CORS của gateway đang khai báo trực
  tiếp trong `backend/APIGateway/src/main/resources/application.yml` — đổi domain thì
  phải sửa file này.
- Chưa có giới hạn số lần đăng nhập sai (schema đã có cột nhưng mã chưa dùng).

---

## 14. Hạn chế đã biết

- **Giao diện Sprint 4 chưa có** (giáo viên, chuyên môn, gán giáo viên, đóng lớp). Chỉ
  mới có tài liệu hợp đồng và hướng dẫn FE.
- **ScheduleService và FacilityService** có mã nguồn nhưng chưa nối vào gateway và chưa
  có nghiệp vụ Sprint 4.
- **Epic 12 (phân công giáo viên)** chưa triển khai. Sprint 4 chỉ kiểm tra module
  `TEACHER_ASSIGNMENT`; nếu module bật, API gán trực tiếp trả
  `409 TEACHER_ASSIGNMENT_MODULE_ACTIVE`.
- **Chưa gửi email** (quên/đặt lại mật khẩu, thông báo). Chưa có tự đăng ký giáo viên.
- **Chưa có API đổi trạng thái dạy** `TAM_NGHI` / `NGHI_VIEC`; dữ liệu mẫu đặt sẵn.
- **Không kiểm tra trùng lịch** khi gán giáo viên (ngoài phạm vi Sprint 4).
- **Xoá:** lớp và học sinh dùng xoá mềm (`deleted_at`); nhân sự, phòng ban, chức vụ bị
  xoá khỏi bảng (không có thùng rác/khôi phục).
- **OpenAPI/Swagger** chỉ có ở từng service (8081–8084), chưa gom qua gateway. Frontend
  đang viết tay DTO; có thể sinh type từ `/v3/api-docs` để tránh lệch.
- Các service đang để `spring.jpa.hibernate.ddl-auto=update`. **Luôn chạy script SQL
  trước**; không dựa vào Hibernate để tạo/sửa schema.
- `mems.sql` ở gốc repo là file rỗng, không dùng.
