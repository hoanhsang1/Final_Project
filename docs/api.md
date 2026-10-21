# MEMS Backend API Documentation

> **Base URL (qua API Gateway):** `http://localhost:8080`  
> **Content-Type:** `application/json`  
> **Phiên bản:** Sprint 1 + Sprint 2 (cập nhật 21/10/2026)

---

## Mục lục

- [Quy ước chung](#quy-ước-chung)
- [Identity Service — Auth](#identity-service--auth)
  - [POST /api/v1/auth/login](#post-apiv1authlogin)
  - [POST /api/v1/auth/register](#post-apiv1authregister)
  - [POST /api/v1/auth/refresh](#post-apiv1authrefresh)
  - [POST /api/v1/auth/logout](#post-apiv1authlogout)
  - [GET /api/v1/auth/test](#get-apiv1authtest)
- [Identity Service — Modules](#identity-service--modules)
  - [GET /api/v1/modules](#get-apiv1modules)
- [Identity Service — Organizations](#identity-service--organizations)
  - [GET /api/v1/organizations/pending](#get-apiv1organizationspending)
  - [GET /api/v1/organizations/{id}](#get-apiv1organizationsid)
  - [PATCH /api/v1/organizations/{id}/approve](#patch-apiv1organizationsidapprove)
  - [PATCH /api/v1/organizations/{id}/reject](#patch-apiv1organizationsidreject)
  - [PUT /api/v1/organizations/{id}/modules](#put-apiv1organizationsidmodules) — ⚠️ **chưa có** (`D-16`)
- [Các service khác](#các-service-khác)

---

## Quy ước chung

### Response lỗi (`ApiResponse`)

Tất cả lỗi đều trả về cấu trúc sau:

```json
{
  "success": false,
  "message": "Mô tả lỗi",
  "data": null
}
```

### HTTP Status codes

| Code | Ý nghĩa |
|------|---------|
| `200` | Thành công |
| `201` | Tạo mới thành công |
| `204` | Thành công, không có body |
| `400` | Request không hợp lệ |
| `401` | Chưa xác thực / sai credentials |
| `403` | Bị từ chối (tài khoản/tổ chức chưa active) |
| `404` | Không tìm thấy resource |
| `409` | Conflict (trùng dữ liệu) |
| `500` | Lỗi hệ thống |

### JWT Access Token

- Loại: **Bearer JWT**
- TTL: **900 giây (15 phút)**
- Header: `Authorization: Bearer <accessToken>`
- Payload chứa: `userId`, `username`, `roles[]`, `orgId`, `exp`

### Refresh Token

- Loại: chuỗi ngẫu nhiên 32 byte **(không phải JWT)**
- TTL: **7 ngày**
- Cơ chế **rotate**: mỗi lần refresh, token cũ bị thu hồi và token mới được cấp

---

## Identity Service — Auth

> Port trực tiếp: `:8081` | Qua Gateway: `:8080`

---

### POST /api/v1/auth/login

Đăng nhập, lấy Access Token và Refresh Token.

**Request Body**

```json
{
  "username": "school_owner_01",
  "password": "Demo@2026Secure!"
}
```

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|-------|
| `username` | string | ✅ | Tên đăng nhập |
| `password` | string | ✅ | Mật khẩu |

**Response `200 OK`**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "a1b2c3d4e5f6...",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

> ⚠️ Response thành công **KHÔNG** bọc trong `ApiResponse` — trả trực tiếp `LoginResponse`.

**Các lỗi có thể gặp**

| HTTP | `message` | Nguyên nhân |
|------|-----------|-------------|
| `401` | `Invalid username or password` | Sai username hoặc password |
| `403` | `Account is not active` | Tài khoản bị vô hiệu hoá |
| `403` | `Account has no assigned roles` | Tài khoản chưa có vai trò |
| `403` | `Organization is not active` | Tổ chức chưa được duyệt hoặc bị từ chối |
| `403` | `Organization not found` | Tổ chức không tồn tại |
| `403` | `Organization is required` | Tài khoản không thuộc tổ chức nào |
| `403` | `Invalid SUPER_ADMIN account configuration` | Cấu hình SUPER_ADMIN sai |

---

### POST /api/v1/auth/register

Đăng ký tổ chức mới. Tổ chức được tạo ở trạng thái **PENDING**, cần admin duyệt.

**Request Body**

```json
{
  "organizationName": "Trường THPT Demo",
  "orgType": "SCHOOL",
  "username": "school_owner_01",
  "email": "school01@example.com",
  "password": "Demo@2026Secure!",
  "modules": [
    "STUDENT_MANAGEMENT",
    "CLASS_MANAGEMENT"
  ]
}
```

| Field | Type | Bắt buộc | Ràng buộc | Mô tả |
|-------|------|-----------|-----------|-------|
| `organizationName` | string | ✅ | max 200 ký tự | Tên tổ chức |
| `orgType` | string (enum) | ✅ | `SCHOOL` hoặc `CENTER` | Loại tổ chức |
| `username` | string | ✅ | 3–100 ký tự | Tên đăng nhập chủ tổ chức |
| `email` | string | ✅ | email hợp lệ, max 255 | Email chủ tổ chức |
| `password` | string | ✅ | min 12 ký tự | Mật khẩu |
| `modules` | string[] | ✅ | ≥ 1 phần tử | Danh sách mã module cần kích hoạt |

**Các giá trị `orgType`**

| Value | Ý nghĩa |
|-------|---------|
| `SCHOOL` | Trường học |
| `CENTER` | Trung tâm |

**Các giá trị `modules` hợp lệ**

| Code | Ý nghĩa |
|------|---------|
| `STUDENT_MANAGEMENT` | Quản lý học sinh |
| `TEACHER_MANAGEMENT` | Quản lý giáo viên |
| `CLASS_MANAGEMENT` | Quản lý lớp học |
| `SCHEDULE_MANAGEMENT` | Quản lý lịch học |
| `ROOM_MANAGEMENT` | Quản lý phòng học |
| `EQUIPMENT_MANAGEMENT` | Quản lý thiết bị |

> ⚠️ `SCHEDULE_MANAGEMENT` tên là **"Quản lý lịch học"** (theo seed `05_seed_admin.sql`),
> **không phải** "Quản lý thời khoá biểu".
> `FACILITY_MANAGEMENT` **không tồn tại** — mã thiết bị là `EQUIPMENT_MANAGEMENT`,
> mã phòng học là `ROOM_MANAGEMENT`. FE trước đây hardcode `FACILITY_MANAGEMENT` và đã
> đổi sang lấy danh mục từ `GET /api/v1/modules` (`D-03`).
> `orgType` ở **request** này là CHỮ HOA (`SCHOOL`/`CENTER`), còn `org_type` ở **response**
> của các endpoint tổ chức là CHỮ THƯỜNG (`school`/`center`) — xem `D-08`.

**Response `201 Created`**

```json
{
  "organizationId": "550e8400-e29b-41d4-a716-446655440000",
  "accountId": "123e4567-e89b-12d3-a456-426614174000",
  "organizationStatus": "PENDING",
  "accountStatus": "PENDING",
  "requestedModules": ["STUDENT_MANAGEMENT", "CLASS_MANAGEMENT"]
}
```

**Các lỗi có thể gặp**

| HTTP | `message` | Nguyên nhân |
|------|-----------|-------------|
| `400` | `Invalid module: <code>` | Module không tồn tại hoặc chưa kích hoạt |
| `409` | `Username already exists` | Tên đăng nhập đã được sử dụng |

---

### POST /api/v1/auth/refresh

Làm mới Access Token bằng Refresh Token (cơ chế **rotate** — token cũ bị thu hồi).

**Request Body**

```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|-------|
| `refreshToken` | string | ✅ | Refresh token nhận từ login/refresh trước đó |

**Response `200 OK`**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "x9y8z7w6v5u4...",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

> ⚠️ `refreshToken` trong response là **token MỚI**. Token cũ đã bị thu hồi và không thể dùng lại.

**Các lỗi có thể gặp**

| HTTP | `message` | Nguyên nhân |
|------|-----------|-------------|
| `401` | `Invalid or expired refresh token` | Token không hợp lệ hoặc đã hết hạn/thu hồi |
| `401` | `Account not found` | Tài khoản không còn tồn tại |
| `403` | `Account is not active` | Tài khoản bị vô hiệu hoá |
| `403` | `Organization is not active` | Tổ chức bị vô hiệu hoá |

---

### POST /api/v1/auth/logout

Đăng xuất — thu hồi Refresh Token.

**Request Body**

```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

| Field | Type | Bắt buộc | Mô tả |
|-------|------|-----------|-------|
| `refreshToken` | string | ✅ | Refresh token cần thu hồi |

**Response `204 No Content`** — không có body.

**Các lỗi có thể gặp**

| HTTP | `message` | Nguyên nhân |
|------|-----------|-------------|
| `401` | `Invalid or expired refresh token` | Token không hợp lệ hoặc đã bị thu hồi |

---

### GET /api/v1/auth/test

Health check — kiểm tra Identity Service còn sống không.

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Identity Service is running",
  "data": null
}
```

---

## Identity Service — Modules

---

### GET /api/v1/modules

Lấy danh sách tất cả module đang active trong hệ thống.

**Request** — không cần body, không cần auth.

**Response `200 OK`**

```json
[
  { "code": "CLASS_MANAGEMENT",      "name": "Quản lý lớp học" },
  { "code": "EQUIPMENT_MANAGEMENT", "name": "Quản lý thiết bị" },
  { "code": "ROOM_MANAGEMENT",      "name": "Quản lý phòng học" },
  { "code": "SCHEDULE_MANAGEMENT",  "name": "Quản lý lịch học" },
  { "code": "STUDENT_MANAGEMENT",   "name": "Quản lý học sinh" },
  { "code": "TEACHER_MANAGEMENT",   "name": "Quản lý giáo viên" }
]
```

> Danh sách được sắp xếp theo `code` (alphabet). Chỉ trả về module có `is_active = TRUE`.
>
> ⚠️ **Đúng theo seed hiện tại** (`05_seed_admin.sql`) — danh mục **chỉ có 6 module**.
> SRS §4.2 mô tả 10 module; 4 module còn thiếu (`STAFF_MANAGEMENT`,
> `COMPUTER_ROOM_MANAGEMENT`, `TEACHER_ASSIGNMENT`, `ROOM_USAGE_MANAGEMENT`) ⇒ `D-15`.
> Bảng `module` **không có cột `is_core`** ⇒ luật "4 module lõi không thể tắt" (`BR-06`)
> chưa có chỗ biểu diễn ở tầng BE.
> Lưu ý: `FACILITY_MANAGEMENT` **không tồn tại** — mã thiết bị là `EQUIPMENT_MANAGEMENT`,
> mã phòng học là `ROOM_MANAGEMENT`.

---

## Identity Service — Organizations

> Các endpoint này dành cho **SUPER_ADMIN** — yêu cầu Bearer JWT có role `SUPER_ADMIN`.

---

### GET /api/v1/organizations/pending

Lấy danh sách tổ chức đang chờ duyệt.

**Response `200 OK`**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Trường THPT Demo",
    "org_type": "school",
    "status": "pending",
    "owner_username": "school_owner_01",
    "owner_email": "school01@example.com"
  }
]
```

> ⚠️ **`org_type` và `status` trả CHỮ THƯỜNG** (`school` / `center`, `pending` / `active` /
> `rejected` / `suspended`) — đọc thẳng từ ENUM MySQL, không qua enum Java.
> **Ngược lại**, `POST /auth/register` **nhận** `orgType` CHỮ HOA (`SCHOOL` / `CENTER`)
> vì enum `OrgType` của Java khai báo chữ hoa. Hai chỗ khác nhau là cố ý, đừng "sửa cho khớp".
> *(Cập nhật 21/10/2026 — `D-08`.)*

---

### GET /api/v1/organizations/{id}

Lấy chi tiết một tổ chức (bao gồm danh sách module và chủ tổ chức).

**Path Parameter**

| Parameter | Type | Mô tả |
|-----------|------|-------|
| `id` | string (UUID) | ID của tổ chức |

**Response `200 OK`**

```json
{
  "organization": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Trường THPT Demo",
    "org_type": "school",
    "status": "pending"
  },
  "owners": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "username": "school_owner_01",
      "email": "school01@example.com",
      "status": "pending"
    }
  ],
  "modules": [
    { "code": "STUDENT_MANAGEMENT", "name": "Quản lý học sinh", "status": "requested" },
    { "code": "CLASS_MANAGEMENT",   "name": "Quản lý lớp học",  "status": "requested" }
  ]
}
```

**Các lỗi có thể gặp**

| HTTP | `message` | Nguyên nhân |
|------|-----------|-------------|
| `404` | `Organization not found` | Không tìm thấy tổ chức với ID đã cho |

> ⚠️ `organization` hiện chỉ có **4 trường** (`id`, `name`, `org_type`, `status`).
> Thiếu `contact_email`, `contact_phone`, `created_at`, `approved_by`, `approved_at`,
> `rejection_reason` ⇒ màn chi tiết của FE chưa hiện được thông tin liên hệ và lý do từ chối
> ⇒ `D-19`. Cần BE mở rộng trước khi nghiệm thu Sprint 2.

---

### PATCH /api/v1/organizations/{id}/approve

Duyệt tổ chức — chuyển trạng thái sang `active`.

**Path Parameter**

| Parameter | Type | Mô tả |
|-----------|------|-------|
| `id` | string (UUID) | ID của tổ chức cần duyệt |

**Response `204 No Content`** — không có body.

**Side effects khi approve:**
- `organization.status` → `active`
- `account.status` (ORG_OWNER đang `pending`) → `active`
- `organization_module.status` (đang `requested`) → `active`

**Các lỗi có thể gặp**

| HTTP | `message` | Nguyên nhân |
|------|-----------|-------------|
| `404` | `Organization not found` | Không tìm thấy tổ chức |
| `409` | `Organization has already been reviewed` | Tổ chức đã được duyệt/từ chối trước đó |

---

### PATCH /api/v1/organizations/{id}/reject

Từ chối đăng ký tổ chức.

**Path Parameter**

| Parameter | Type | Mô tả |
|-----------|------|-------|
| `id` | string (UUID) | ID của tổ chức cần từ chối |

**Request Body (mong đợi — BE hiện CHƯA nhận, `D-05`)**

```json
{ "reason": "Hồ sơ chưa đủ giấy tờ đăng ký doanh nghiệp." }
```

| Field | Type | Bắt buộc | Ràng buộc | Mô tả |
|-------|------|-----------|-----------|-------|
| `reason` | string | ✅ | 1–500 ký tự (sau khi trim) | Lý do từ chối, hiển thị cho chủ tổ chức |

**Response `204 No Content`** — không có body.

**Side effects khi reject:**
- `organization.status` → `rejected`
- `account.status` (ORG_OWNER đang `pending`) → `disabled`
- `organization_module.status` (đang `requested`) → `rejected`

**Các lỗi có thể gặp**

| HTTP | `message` | Nguyên nhân |
|------|-----------|-------------|
| `404` | `Organization not found` | Không tìm thấy tổ chức |
| `409` | `Organization has already been reviewed` | Tổ chức đã được duyệt/từ chối trước đó |
| `400` | — | Lý do từ chối thiếu/quá 500 ký tự (**chưa có** — `D-01` lỗi validate trả 500) |

> ⚠️ **BE hiện CHƯA đọc body `reason`** và **KHÔNG** ghi `rejection_reason` /
> `approved_by` / `approved_at`, cũng **KHÔNG** ghi `audit_log` ⇒ `D-05` (**gấp**).
> FE đã gửi body `{ "reason": … }` và bắt buộc nhập lý do, nhưng **BE chưa lưu** ⇒
> lý do từ chối mất sạch. Cần BE sửa trước khi nghiệm thu Sprint 2.

---

### PUT /api/v1/organizations/{id}/modules

> ⚠️ **CHƯA CÓ — BE chưa làm (`D-16`).** Mục này mô tả **contract FE đang dùng** để
> BE cài theo, và để tester biết cần chờ gì. Hiện gọi endpoint này sẽ trả **404**.

Cấu hình module của một tổ chức (màn "Cấu hình module" trong màn chi tiết tổ chức).

**Path Parameter**

| Parameter | Type | Mô tả |
|-----------|------|-------|
| `id` | string (UUID) | ID của tổ chức cần cấu hình |

**Request Body**

```json
{ "modules": ["STUDENT_MANAGEMENT", "CLASS_MANAGEMENT"] }
```

| Field | Type | Bắt buộc | Ràng buộc | Mô tã |
|-------|------|-----------|-----------|-------|
| `modules` | string[] | ✅ | ≥ 1 phần tử; mọi mã phải tồn tại và `is_active = TRUE` | **TẬP ĐẦY ĐỦ** module mong muốn — không phải phần tử cần thêm/bớt |

> Body là **tập đầy đủ** (state hiện tại sau khi bỏ/tick) chứ không phải danh sách delta,
> để FE không phải đối chiếu cũ/mới.

**Response `204 No Content`** — không có body.

**Side effects khi thành công:**
- `organization_module` của tổ chức được đồng bộ theo body:
  - module có trong body và đang `requested` → `active`
  - module có trong body nhưng tổ chức chưa có → tạo dòng mới với `status = 'requested'`
  - module **không** có trong body → `status = 'rejected'` (xoá dòng sẽ mất vết — xem `D-16`)
- ghi 1 dòng `audit_log` loại `ORG_MODULES_UPDATED` (`NFR-LOG-001`)

**Các lỗi có thể gặp**

| HTTP | `message` | Nguyên nhân |
|------|-----------|-------------|
| `400` | `Invalid module: <code>` | Mã module không tồn tại hoặc `is_active = FALSE` |
| `400` | — | `modules` rỗng |
| `404` | `Organization not found` | Không tìm thấy tổ chức |
| `409` | `Organization has already been reviewed` | Tổ chức không còn ở trạng thái `pending` |

> ⚠️ **BE chưa có `is_core`** (`D-15`) ⇒ luật "4 module lõi không thể tắt" (`BR-06`)
> hiện **chỉ chặn ở FE**. Khi BE làm xong, luật này phải có ở cả 2 tầng
> (FE chặn cho UX, BE chặn thật — ẩn UI không phải bảo mật).

---

## Các service khác

Các service sau đang **chạy** (có container) nhưng controller chưa có endpoint nào:

| Service | Port | Trạng thái |
|---------|------|------------|
| **PeopleService** | `:8082` | Container up, controller rỗng |
| **ScheduleService** | `:8083` | Container up, controller rỗng |
| **FacilityService** | `:8084` | Container up, controller rỗng |

> API doc cho các service trên sẽ được bổ sung khi có endpoint.

---

## Ví dụ curl

### Đăng nhập
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin@2026Secure!"}'
```

### Đăng ký tổ chức
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "Trường THPT Demo",
    "orgType": "SCHOOL",
    "username": "school_owner_01",
    "email": "school01@example.com",
    "password": "Demo@2026Secure!",
    "modules": ["STUDENT_MANAGEMENT", "CLASS_MANAGEMENT"]
  }'
```

### Lấy danh sách module
```bash
curl http://localhost:8080/api/v1/modules
```

### Lấy danh sách tổ chức chờ duyệt
```bash
curl http://localhost:8080/api/v1/organizations/pending \
  -H "Authorization: Bearer <accessToken>"
```

### Duyệt tổ chức
```bash
curl -X PATCH http://localhost:8080/api/v1/organizations/<orgId>/approve \
  -H "Authorization: Bearer <accessToken>"
```
