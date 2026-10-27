# MEMS — Hệ thống Quản lý Giáo dục theo Module

Hệ thống quản lý giáo dục **đa tổ chức** (multi-tenant): một nền tảng phục vụ nhiều
trường/trung tâm, mỗi tổ chức bật/tắt module theo nhu cầu (quản lý con người, thời
khoá biểu, phòng học & thiết bị…).

Bốn nhóm người dùng: **Admin hệ thống** (duyệt tổ chức, quản trị nền tảng),
**Cán bộ quản lý** (giáo vụ của tổ chức), **Giáo viên** (lịch dạy, báo sự cố thiết bị),
**Sinh viên** (thời khoá biểu).

> Trạng thái: đang ở **Sprint 1** — đăng nhập đã nối backend thật.
> Trang **Đăng ký** mới chỉ là giao diện (backend chưa có endpoint đăng ký).
> Chưa có trang chủ theo vai trò — sau khi đăng nhập sẽ vào trang tạm `/xem-thu/<vai-tro>`.

---

## 1. Chạy nhanh (TL;DR)

Dành cho người chỉ muốn dựng lên chạy thử. Máy cần **JDK 17+**, **Maven 3.9+**,
**MySQL 8.0.16+**, **Node 20+**.

```bash
# 1) Nạp database (chạy lần đầu, theo đúng thứ tự)
mysql -u root -p < 01_identity_db.sql
mysql -u root -p < 02_people_db.sql
mysql -u root -p < 03_schedule_db.sql
mysql -u root -p < 04_facility_db.sql
mysql -u root -p < 05_seed_admin.sql      # tạo role/quyền + tài khoản platform_admin

# 2) Cấu hình biến môi trường
copy .env.example .env        # Windows;  macOS/Linux: cp .env.example .env
#   → mở .env, điền giá trị thật (xin Sang nếu chưa có)

# 3) Build backend
cd backend
mvn -f IdentityService/pom.xml package -DskipTests
mvn -f APIGateway/pom.xml package -DskipTests

# 4) Chạy IdentityService (cửa sổ 1)
java -jar IdentityService/target/IdentityService-0.0.1-SNAPSHOT.jar

# 5) Chạy API Gateway (cửa sổ 2)
java -jar APIGateway/target/APIGateway-0.0.1-SNAPSHOT.jar

# 6) Chạy frontend (cửa sổ 3)
cd ../frontend
npm install
npm run dev
```

Mở **http://localhost:5173** — đăng nhập bằng `platform_admin` và mật khẩu là giá trị
`ADMIN_BOOTSTRAP_PASSWORD` trong `.env`.

> ⚠️ Gõ đúng `localhost:5173`, **đừng** gõ `127.0.0.1:5173` — Vite lắng nghe trên IPv6
> nên địa chỉ IPv4 đó sẽ không kết nối được.

---

## 2. Kiến trúc & sơ đồ cổng

```
Trình duyệt (localhost:5173)
        │  gọi /api/...
        ▼
   Vite dev server  ──proxy──►  API Gateway (8080)
                                      │
                                      ▼
                            IdentityService (8081)
                                      │
                                      ▼
                              MySQL (3306)
```

| Thành phần | Cổng | Ghi chú |
|---|---|---|
| Frontend (Vite) | 5173 | React + TypeScript |
| API Gateway | 8080 | Điểm vào duy nhất, định tuyến theo đường dẫn |
| IdentityService | 8081 | Xác thực, tổ chức, tài khoản, phân quyền |
| PeopleService | 8082 | *Chưa nối vào gateway* |
| ScheduleService | 8083 | *Chưa nối vào gateway* |
| FacilityService | 8084 | *Chưa nối vào gateway* |
| Eureka Server | 8761 | Đăng ký service (chỉ cần khi chạy Docker) |
| MySQL | 3306 | 5 database, mỗi service sở hữu 1 DB riêng |

Gateway hiện chỉ định tuyến **một** route:

```
/api/v1/auth/**  →  IdentityService
```

Các service còn lại mới có mã nguồn + Dockerfile, **chưa** được thêm vào gateway.

---

## 3. Yêu cầu môi trường

| Phần mềm | Phiên bản | Bắt buộc? |
|---|---|---|
| JDK | 17 trở lên (đã chạy thử trên 21) | Có (nếu chạy backend kiểu native) |
| Maven | 3.9+ | Có (nếu chạy backend kiểu native) |
| MySQL | **8.0.16+** | Có |
| Node.js | 20+ (khuyến nghị 22 hoặc 24) | Có |
| Docker Desktop | — | Không bắt buộc (chỉ khi muốn chạy bằng Docker) |

> MySQL **phải từ 8.0.16** vì schema dùng `DEFAULT (UUID())` — bản cũ hơn sẽ báo lỗi cú pháp.
>
> Docker Desktop cần cấp phát ≥ 8 GB RAM cho máy ảo Linux. Máy ít RAM (ví dụ 8 GB) nên
> dùng cách chạy native ở §5.

---

## 4. Chuẩn bị database

Database **không** dùng công cụ migrate (không Flyway/Liquibase) — schema nằm ở các file SQL
tại thư mục gốc repo. Chạy **đúng thứ tự**:

| File | Việc nó làm |
|---|---|
| `01_identity_db.sql` | Tạo DB `mems_identity_db`: tổ chức, tài khoản, vai trò, quyền, module, token |
| `02_people_db.sql` | Tạo DB `mems_people_db` |
| `03_schedule_db.sql` | Tạo DB `mems_schedule_db` |
| `04_facility_db.sql` | Tạo DB `mems_facility_db` |
| `05_seed_admin.sql` | Gieo 6 vai trò + 15 quyền, và tài khoản `platform_admin` |

Cách chạy:

```bash
mysql -u root -p < 01_identity_db.sql
```

hoặc mở từng file trong MySQL Workbench rồi Execute.

**Tài khoản đăng nhập thử:** `platform_admin`. Mật khẩu là giá trị `ADMIN_BOOTSTRAP_PASSWORD`
trong `.env` (nhóm đang dùng chung một giá trị). Muốn đổi mật khẩu thì phải sinh hash BCrypt
mới cho cột `password_hash` của bảng `account` — file `05_seed_admin.sql` chỉ gieo một lần,
sửa `.env` không tự đổi mật khẩu đang có trong database.

---

## 5. Cấu hình biến môi trường

Sao chép file mẫu rồi điền giá trị thật:

```bash
copy .env.example .env        # Windows
cp .env.example .env          # macOS / Linux
```

| Biến | Ý nghĩa |
|---|---|
| `DB_USERNAME` | Tài khoản MySQL |
| `DB_PASSWORD` | Mật khẩu MySQL |
| `JWT_SECRET_BASE64` | Khoá ký JWT, **chuỗi base64 của 32 byte ngẫu nhiên** |
| `ADMIN_BOOTSTRAP_PASSWORD` | Mật khẩu của `platform_admin` lúc gieo dữ liệu |

Tạo khoá JWT mới cho riêng bạn:

```bash
openssl rand -base64 32
```

> 🔒 **Không bao giờ commit file `.env`.** Cả `.gitignore` ở gốc repo và ở `frontend/`
> đều đã chặn sẵn. Repo này là **công khai** — đẩy mật khẩu/khoá lên đó là để cả thế giới
> đọc được, và ai cũng có thể tự ký token giả để đăng nhập hệ thống.
>
> ⚠️ Đổi `JWT_SECRET_BASE64` sẽ làm **mọi token cũ mất hiệu lực** (người dùng phải đăng nhập lại).

---

## 6. Chạy backend

Có hai cách. **Cách B đã được kiểm chứng chạy thật**; cách A chưa chạy thử trên máy nhóm.

### Cách A — Docker Compose

```bash
docker compose up --build
```

Cả 6 service + Eureka khởi động cùng lúc. Lưu ý:

- MySQL **không** nằm trong `docker-compose.yml` — các container kết nối ra MySQL trên máy
  thật qua `host.docker.internal:3306`. Nên **vẫn phải cài MySQL ở máy host** và nạp SQL (§4).
- Lần build đầu khá lâu vì tải toàn bộ thư viện Maven vào image.

### Cách B — Chạy native (khuyến nghị cho máy ít RAM) ✅ đã kiểm chứng

Chạy trực tiếp bằng `java -jar`, **không cần Docker lẫn Eureka**.

```bash
cd backend
mvn -f IdentityService/pom.xml package -DskipTests
mvn -f APIGateway/pom.xml package -DskipTests
```

Kết quả: `IdentityService/target/IdentityService-0.0.1-SNAPSHOT.jar` và
`APIGateway/target/APIGateway-0.0.1-SNAPSHOT.jar`.

**Cửa sổ 1 — IdentityService:**

```powershell
$env:DB_URL          = "jdbc:mysql://localhost:3306/mems_identity_db"
$env:DB_USERNAME     = "<từ .env>"
$env:DB_PASSWORD     = "<từ .env>"
$env:JWT_SECRET_BASE64 = "<từ .env>"
$env:EUREKA_CLIENT_ENABLED = "false"
java -jar IdentityService\target\IdentityService-0.0.1-SNAPSHOT.jar
```

**Cửa sổ 2 — API Gateway:**

```powershell
$env:IDENTITY_SERVICE_URL  = "http://localhost:8081"
$env:EUREKA_CLIENT_ENABLED = "false"
java -jar APIGateway\target\APIGateway-0.0.1-SNAPSHOT.jar
```

Kiểm tra đã lên chưa:

```bash
curl http://localhost:8081/api/v1/auth/test
# → {"success":true,"message":"Identity Service is running","data":null}
```

> **Vì sao phải tắt Eureka?** `application.properties` trỏ tới
> `http://eureka-server:8761/eureka/` — tên hostname này chỉ phân giải được *bên trong*
> mạng Docker. Chạy ngoài Docker phải đặt `EUREKA_CLIENT_ENABLED=false`, nếu không service
> sẽ liên tục báo lỗi kết nối Eureka.
>
> Gateway vẫn định tuyến được vì route dùng địa chỉ tĩnh
> `${IDENTITY_SERVICE_URL:http://localhost:8081}` chứ không qua Eureka.

---

## 7. Chạy frontend

```bash
cd frontend
npm install
npm run dev
```

Mở http://localhost:5173

### Lệnh thường dùng

| Lệnh | Việc nó làm |
|---|---|
| `npm run dev` | Chạy dev server (tự cập nhật khi sửa code) |
| `npm run build` | Kiểm tra type rồi build bản production |
| `npm test` | Chạy toàn bộ unit test (Vitest) |
| `npm run test:watch` | Chạy test ở chế độ theo dõi |
| `npm run test:e2e` | Chạy test e2e (Playwright) — tự build + bật preview server |
| `npm run test:e2e:ui` | Mở Playwright UI để xem/chạy từng ca e2e |
| `npm run lint` | Kiểm tra ESLint |
| `npm run format` | Tự định dạng code bằng Prettier |
| `npm run preview` | Xem thử bản đã build |

### Frontend gọi backend thế nào?

`vite.config.ts` cấu hình proxy:

```ts
server: { proxy: { '/api': 'http://127.0.0.1:8080' } }
```

Nghĩa là FE gọi `/api/...` trên **cùng cổng 5173**, Vite chuyển tiếp sang gateway 8080.
Nhờ vậy **không vướng CORS** — backend hiện **chưa** cấu hình CORS, nên gọi thẳng
`http://localhost:8080` từ trình duyệt sẽ bị chặn.

---

## 8. Cấu trúc thư mục

```
Final_Project/
├── backend/
│   ├── IdentityService/     # Xác thực, tổ chức, tài khoản (cổng 8081)
│   ├── APIGateway/          # Cổng vào duy nhất (8080)
│   ├── EurekaServer/        # Đăng ký service (8761)
│   ├── PeopleService/       # 8082 — chưa nối gateway
│   ├── ScheduleService/     # 8083 — chưa nối gateway
│   └── FacilityService/     # 8084 — chưa nối gateway
├── frontend/
│   ├── src/
│   │   ├── pages/           # Mỗi trang 1 thư mục: LoginPage, RolePreviewPage, PendingOrganizationsPage…
│   │   ├── features/auth/   # Gọi API + kiểu dữ liệu + ánh xạ vai trò
│   │   ├── features/admin/  # Gọi API + câu chữ cho console quản trị (Sprint 2)
│   │   ├── components/      # Component dùng chung (AdminGuard, AdminConsoleLayout…)
│   │   ├── stores/          # Zustand (phiên đăng nhập)
│   │   ├── lib/api.ts       # Axios + interceptor gắn token
│   │   └── router.tsx
│   ├── e2e/                 # Test e2e Playwright (mock API) cho console quản trị
│   ├── docs/                # Tài liệu kỹ thuật của frontend
│   └── vite.config.ts       # Cấu hình proxy
├── 01_identity_db.sql … 05_seed_admin.sql
├── docker-compose.yml
└── .env.example             # Mẫu biến môi trường (KHÔNG chứa giá trị thật)
```

Mỗi service có `pom.xml` và Maven Wrapper riêng, build độc lập. Ví dụ, từ thư mục
gốc repo: `mvn -f backend/PeopleService/pom.xml verify`. CI cũng chạy riêng từng
service; không dùng POM chung trong thư mục backend.

---

## 9. Lỗi thường gặp

| Hiện tượng | Nguyên nhân & cách xử lý |
|---|---|
| Không mở được `127.0.0.1:5173` | Vite lắng nghe IPv6. Dùng `localhost:5173`. |
| Frontend báo lỗi mạng dù backend chạy | Chưa bật gateway (8080) hoặc gọi thẳng 8080 nên bị CORS chặn. Kiểm tra proxy và gateway. |
| Backend treo ở dòng tìm Eureka | Chưa đặt `EUREKA_CLIENT_ENABLED=false` khi chạy ngoài Docker. |
| `Unknown database 'mems_identity_db'` | Chưa nạp SQL ở §4. |
| Lỗi cú pháp SQL ở `DEFAULT (UUID())` | MySQL cũ hơn 8.0.16. Nâng cấp MySQL. |
| `Access denied for user` | `DB_USERNAME`/`DB_PASSWORD` trong `.env` chưa đúng, hoặc chưa nạp vào biến môi trường của tiến trình. |
| Đăng nhập báo "Phiên đăng nhập đã hết hạn" | Token cũ không khớp khoá JWT hiện tại (do vừa đổi `JWT_SECRET_BASE64`). Đăng nhập lại. |
| Đăng nhập trả 403 | Tài khoản/tổ chức không ở trạng thái `active`, hoặc tài khoản chưa được gán vai trò. |

### Bẫy riêng của PowerShell

- `curl` trong PowerShell là bí danh của `Invoke-WebRequest`, **không** phải curl thật. Muốn
  dùng curl thật thì gõ `curl.exe`.
- `Invoke-WebRequest` tự thêm header `Expect: 100-continue`, có thể gây lỗi `502` giả khi đi
  qua proxy của Vite. Gặp ca này thì thử bằng `curl.exe` hoặc bằng trình duyệt.
- Truyền JSON có dấu ngoặc kép cho `curl.exe` rất dễ bị PowerShell làm hỏng. Cách chắc ăn:
  ghi JSON ra file rồi dùng `curl.exe --data-binary "@file.json"`.

---

## 10. Tài liệu liên quan

- `frontend/docs/superpowers/plans/2026-10-14-dang-nhap-dang-ky.md` — kế hoạch Sprint 1 (đăng nhập/đăng ký).
- `frontend/README.md` — hướng dẫn riêng cho phần frontend.
- `docs/api.md` — tài liệu API của backend (đã cập nhật endpoint Sprint 2).
- Các tài liệu dự án khác (SRS, ADR, đặc tả Sprint 1 & 2, biên bản họp, từ điển thuật ngữ kỹ
  thuật) **không** nằm trong repo này — nằm ở thư mục tài liệu dự án
  (`../Đồ án tốt nghiệp/Tài liệu liên quan dự án/`).

---

## 11. Ghi chú bảo mật (đọc trước khi triển khai)

- **Không commit `.env`.** Repo đang là công khai.
- `05_seed_admin.sql` có sẵn hash BCrypt của `platform_admin` ứng với mật khẩu mẫu. Mật khẩu
  này **công khai trong repo** ⇒ trước khi triển khai thật phải đổi mật khẩu (hoặc xoá tài
  khoản mẫu) và dùng mật khẩu mạnh riêng.
- Backend **chưa** cấu hình CORS. Khi tách frontend và backend ra hai tên miền khác nhau thì
  phải cấu hình CORS (hoặc đặt reverse proxy) — proxy của Vite chỉ dùng được khi phát triển.
- Khoá `JWT_SECRET_BASE64` là chìa khoá ký token. Lộ khoá = ai cũng giả được phiên đăng nhập.
- Chưa có giới hạn số lần đăng nhập sai. Schema **đã có** cột `failed_login_attempts` và
  `locked_until`, nhưng mã Java **chưa dùng** tới.

---

## 12. Hạn chế đã biết (đừng báo là lỗi)

- **Trang chủ theo vai trò mới chỉ có cho `SUPER_ADMIN`.** Đăng nhập bằng `SUPER_ADMIN` sẽ vào
  thẳng console quản trị `/quan-tri/to-chuc` (duyệt / từ chối tổ chức + cấu hình module).
  Các vai trò khác vẫn vào `/xem-thu/<vai-tro>` — một trang tạm hiển thị tên đăng nhập và vai trò.
- **Hai vai trò chưa có màn hình:** `ORG_ADMIN` và `FACILITY_STAFF`. Đăng nhập bằng tài khoản
  thuộc hai vai trò này sẽ hiện thông báo "vai trò chưa có màn hình" chứ không điều hướng.
- **Phiên hết hạn đã tự đưa về trang đăng nhập** (Sprint 2). Refresh token thất bại → xoá token
  khỏi `localStorage` + đá về `/dang-nhap` (`SessionWatcher`).
- **BE chưa lưu lý do từ chối** (`D-05`). `PATCH /organizations/{id}/reject` chưa đọc body
  `reason` và chưa ghi `rejection_reason` / `approved_by` / `approved_at` / `audit_log`.
  FE đã bắt buộc nhập lý do và đã gửi body, nhưng **BE chưa lưu ⇒ lý do mất sạch**.
- **BE chưa có endpoint cấu hình module** (`D-16`). `PUT /organizations/{id}/modules` chưa tồn tại
  ⇒ khối "Cấu hình module" trên màn chi tiết chưa lưu được. Contract mong đợi đã mô tả trong
  `docs/api.md`.
- **Danh mục module thiếu so với SRS** (`D-15`). Seed hiện chỉ có 6 module, thiếu 4 module của
  SRS §4.2, và bảng `module` **không có cột `is_core`** ⇒ luật "4 module lõi không thể tắt"
  (`BR-06`) mới chỉ được chặn ở FE, chưa có ở tầng BE.
- **Chưa phát OpenAPI** từ backend, nên kiểu dữ liệu (DTO) ở frontend đang viết tay — có nguy cơ
  lệch với backend khi backend đổi.
- **Bundle frontend còn lớn:** bản build ra ~1 MB (gzip ~319 kB), Vite có cảnh báo. Nên tách nhỏ
  khi thêm nhiều trang.
- **Backend chưa cấu hình CORS**, nên khi triển khai tách tên miền sẽ phải xử lý (xem §11).
- **`mems.sql` ở gốc repo đang rỗng (0 KB).**
