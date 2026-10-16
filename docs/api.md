# MEMS Backend API Documentation

> **Base URL (qua API Gateway):** `http://localhost:8080`  
> **Content-Type:** `application/json`  
> **Phiên bản:** Sprint 1

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
| `CLASS_MANAGEMENT` | Quản lý lớp học |
| `SCHEDULE_MANAGEMENT` | Quản lý thời khoá biểu |
| `FACILITY_MANAGEMENT` | Quản lý cơ sở vật chất |

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
  { "code": "CLASS_MANAGEMENT",    "name": "Quản lý lớp học" },
  { "code": "FACILITY_MANAGEMENT", "name": "Quản lý cơ sở vật chất" },
  { "code": "SCHEDULE_MANAGEMENT", "name": "Quản lý thời khoá biểu" },
  { "code": "STUDENT_MANAGEMENT",  "name": "Quản lý học sinh" }
]
```

> Danh sách được sắp xếp theo `code` (alphabet). Chỉ trả về module có `is_active = TRUE`.

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
    "org_type": "SCHOOL",
    "status": "pending",
    "owner_username": "school_owner_01",
    "owner_email": "school01@example.com"
  }
]
```

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
    "org_type": "SCHOOL",
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
