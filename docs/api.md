# MEMS Backend API Documentation

> **Base URL (qua API Gateway):** `http://localhost:8080`  
> **Content-Type:** `application/json`  
> **Phiên bản:** Sprint 1 + Sprint 2 (cập nhật 22/10/2026)

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
- [Endpoint chưa cài đặt — Console Super Admin mở rộng](#endpoint-chưa-cài-ặt--console-super-admin-mở-rộng) — ⚠️ `D-20`…`D-31`
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

## Endpoint chưa cài đặt — Console Super Admin mở rộng

> Nguồn contract: đặc tả **"Sprint 2 — Mở rộng console Super Admin"** §4 (ngoài repo).
> Frontend **đã code xong và có e2e pass với mock** — bảng dưới đây là thứ Sang cần cài.
> Khi endpoint trả **404**, FE phân biệt theo dạng path — xem [Quy ước 404](#lưu-ý-phân-biệt-404) ở cuối mục này.

| Mã | Method & Path | Query / Body | Thành công | Trạng thái |
|---|---|---|---|---|
| `D-20` | `GET /api/v1/organizations` | `page`, `size`, `status` (csv), `orgType`, `keyword`, `sort` | 200 envelope. Item: `id, name, org_type, status, owner_username, owner_email, created_at`. `sort` mặc định `name,asc` | ❌ chưa có |
| `D-20b` | `GET /api/v1/organizations/options` | — | 200 **mảng phẳng** `[{ id, name }]` (dropdown, không phân trang) | ❌ chưa có |
| `D-21` | `PATCH /api/v1/organizations/{id}/suspend` | Body `{ reason }` — **bắt buộc**, 1–500 ký tự | `204` | ❌ chưa có |
| `D-21b` | `PATCH /api/v1/organizations/{id}/reactivate` | Body `{ reason? }` — tuỳ chọn | `204` | ❌ chưa có |
| `D-22` | `GET /api/v1/audit-logs` | `page`, `size`, `action` (csv), `organizationId`, `accountId`, `from`, `to`, `keyword`, `sort` | 200 envelope. Item: `id, created_at, action, actor_username, target_type, target_id, target_name, description`. `sort` mặc định `created_at,desc` | ❌ chưa có |
| `D-24` | `GET /api/v1/accounts` | `page`, `size`, `organizationId`, `role`, `status` (csv), `keyword`, `sort` | 200 envelope. Item: `id, username, email, full_name, organization_id, organization_name, role, status, created_at, last_login_at`. `sort` mặc định `username,asc` | ❌ chưa có |
| `D-24b` | `GET /api/v1/accounts/{id}` | — | 200 — 1 item như trên | ❌ chưa có |
| `D-24c` | `PATCH /api/v1/accounts/{id}/status` | Body `{ status: active \| locked \| disabled, reason? }` | `204` | ❌ chưa có |
| `D-26` | `PUT /api/v1/organizations/{id}/modules` *(mở rộng)* | Body `{ modules: string[] }` | `204` — **bỏ điều kiện "chỉ khi org còn `pending`"**: cho phép `active`/`rejected`, trả `409` khi `suspended` | ❌ chưa có |
| `D-27` | `PATCH .../approve` \| `.../reject` *(mở rộng)* | approve `{ notifyEmail? }` · reject `{ reason, notifyEmail? }` | `204` | ⚠️ có nhưng **chưa** đọc `reason`/`notifyEmail` |
| `D-28` | `GET /api/v1/modules` *(mở rộng)* | — | 200 — thêm `description?`. **Khuyến nghị thêm `is_core: boolean`** (`Q-32`) | ⚠️ thiếu `is_core` |
| `D-29` | `POST /api/v1/accounts` | Body `{ email, full_name, role, organization_id }` — BE sinh `username` + mật khẩu tạm, gửi email | `201` item vừa tạo · `409` trùng email/username · `400` · `403` | ❌ chưa có |
| `D-30` | `PATCH /api/v1/accounts/{id}/role` | Body `{ role }` — không nhận `SUPER_ADMIN` | `204` · `409` khi tự đổi vai trò chính mình | ❌ chưa có |
| `D-31` | `POST /api/v1/accounts/{id}/reset-password` | Body `{}` → sinh mật khẩu tạm + gửi email · `{ new_password }` → đặt thẳng (≥ 8 ký tự) | `204` · `400` khi mật khẩu ngắn hơn 8 | ❌ chưa có |
| `D-16` | `PUT /api/v1/organizations/{id}/modules` | — | `204` | ❌ chưa có |

**Quy ước chung cho các endpoint mới**

- Phân trang 1-based, `size` mặc định 20, envelope `{ items, total, page, size }` — cùng shape với
  `GET /organizations/pending` hiện tại (`Q-30` chờ xác nhận).
- ENUM: `organization.status` ∈ `pending|active|rejected|suspended` · `account.status` ∈
  `pending|active|locked|disabled` · `audit_log.action` ∈ `ORG_APPROVED|ORG_REJECTED|ORG_SUSPENDED|ORG_REACTIVATED|ORG_MODULES_UPDATED|ACCOUNT_STATUS_CHANGED` ·
  `audit_log.target_type` ∈ `ORGANIZATION|ACCOUNT`.
- `role` của tài khoản trả **role backend gốc** (`SUPER_ADMIN`, `ORG_OWNER`, …) — FE tự map sang
  nhãn tiếng Việt.

<a id="lưu-ý-phân-biệt-404"></a>
**Lưu ý phân biệt 404** (cả hai đều trả `404`, FE phải hiện khác nhau):

| Dạng path | Nghĩa | FE hiện |
|---|---|---|
| Collection — `/organizations`, `/organizations/options`, `/audit-logs`, `/accounts` | BE **chưa làm** endpoint | `Alert` "Tính năng đang chờ backend (`D-nn`)" + nút Thử lại |
| Item — `/organizations/{id}`, `/accounts/{id}` | Đối tượng **không tồn tại** | `Result 404` + "Không tìm thấy …" |

### Quên / đặt lại mật khẩu (màn công khai)

| Mã | Method & Path | Body | Thành công | Trạng thái |
|---|---|---|---|---|
| `D-32` | `POST /api/v1/auth/forgot-password` | `{ email }` | `202` — **luôn 202**, kể cả email không tồn tại (chống dò tài khoản, cùng lý do với message gộp ở `/auth/login`) | ❌ chưa có |
| `D-33` | `POST /api/v1/auth/reset-password` | `{ token, new_password }` — `new_password` 8–72 ký tự (**tạm thời**, xem `Q-38`: độ dài chưa chốt, đăng ký đang bắt 12) | `204` · `400` khi token sai/hết hạn/đã dùng | ❌ chưa có |

- Dùng bảng **`password_reset_token` đã có sẵn** trong `mems_identity_db` (`token_hash`, `expires_at`, `used_at`) →
  chỉ cần service + 2 endpoint; đề xuất token hiệu lực **30 phút**, dùng **1 lần**.
- Liên kết gửi trong email trỏ tới `{FE_ORIGIN}/dat-lai-mat-khau?token=…`.
- FE đã code xong + e2e mock (`e2e/auth-password-reset.spec.ts`); gặp `404` hiện *"chức năng chưa sẵn sàng"*.
- ⚠️ **Chính sách độ dài mật khẩu chưa chốt** (`Q-38`): đăng ký ≥ 12 (BE đã `@Size(min = 12)` nhưng trả 500 khi sai — `D-01`), modal admin reset ≥ 8, màn này 8–72; chưa có cận trên 72 byte.
  Khi chốt thì sửa **cả 3 chỗ + BE** một lượt, không sửa lẻ.

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
