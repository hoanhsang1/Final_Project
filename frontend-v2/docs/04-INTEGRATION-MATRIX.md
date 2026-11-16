# MEMS FE v2 — Ma trận phụ thuộc FE ↔ BE (FE-00)

Trạng thái dùng trong tài liệu:

| Nhãn | Nghĩa |
|---|---|
| **IMPLEMENTED** | Đã xác minh có trong controller/service backend (đọc code) |
| **FE-INTEGRATED** | FE gọi đúng endpoint/DTO đã xác minh |
| **FE-TESTED** | Có test tự động của FE (chạy trên mock adapter, cùng shape) |
| **TESTED (BE)** | Có bằng chứng test phía backend — FE-00 **không** xác nhận |
| **APPROVED** | Nghiệp vụ đã chốt trong kế hoạch v2 |
| **PLANNED** | Có trong kế hoạch, chưa làm UI/API |
| **PROPOSED** | FE đề xuất, chưa có trong backend |
| **UNVERIFIED** | Chưa kiểm chứng được |

> **Quan trọng:** FE-00 chưa chạy với backend thật trong môi trường này. Toàn bộ “FE-TESTED” là
> test tự động trên mock adapter trả **đúng shape** đã đọc từ code backend; tích hợp thật phải
> được kiểm lại khi dựng docker-compose.

## 0. Quy ước chung

| Chủ đề | Contract |
|---|---|
| Tiền tố đường dẫn | Identity `/api/v1/**`; People `/departments`, `/positions`, `/permissions`, `/permission-bundles`, `/students`, `/classes`, `/teachers`, `/specialties`, `/subjects`, `/transfer-requests`, `/notifications`; Schedule/Facility **chỉ** dưới `/api/...` (ví dụ `/api/departments/{id}/schedules`) |
| Xác thực | `Authorization: Bearer <accessToken>`; không cookie, không header org |
| Org/department | Lấy từ JWT (`orgId`, `departmentId`), không gửi từ client |
| Refresh | `POST /api/v1/auth/refresh` body `{refreshToken}` → cặp token mới (rotate); 401 = phiên hết |
| Logout | `POST /api/v1/auth/logout` body `{refreshToken}` → 204 |
| Đổi mật khẩu | `POST /api/v1/auth/change-password` `{currentPassword,newPassword}` (12–72) → 204; thu hồi mọi refresh token |
| Envelope lỗi | `{success:false, code:"ERROR_CODE", message:"English", data:null}` — FE dịch theo `code` |
| Thành công | Trả DTO/array/trang thô, **không** bọc `success/data` |
| Phân trang | `{items,total,page,size}`, `page` 1-based; giáo viên có thêm `pages` |
| Ngày | Schedule: ISO UTC; audit `created_at`: chuỗi thời gian; ngày sinh: `yyyy-MM-dd` |
| Mã lỗi dùng cho UI | `*_NOT_FOUND`, `FORBIDDEN`, `UNAUTHENTICATED`, `PASSWORD_CHANGE_REQUIRED`, `MODULE_NOT_ENABLED`, `SELF_APPROVAL_NOT_ALLOWED`, `DEPARTMENT_NOT_EMPTY`, `POSITION_IN_USE`, `ACCOUNT_EXISTS`, `EMAIL_EXISTS`, `STAFF_CODE_EXISTS`, `SELF_ESCALATION_NOT_ALLOWED`… |

## 1. Luồng đã triển khai

### 1.1 Đăng nhập / phiên

| Method | Endpoint | Request | Response | Quyền | Trạng thái |
|---|---|---|---|---|---|
| POST | `/api/v1/auth/login` | `{username,password}` | `{accessToken,refreshToken,tokenType,expiresIn}` | công khai | IMPLEMENTED · FE-INTEGRATED · FE-TESTED |
| POST | `/api/v1/auth/refresh` | `{refreshToken}` | như trên (rotate) | công khai | IMPLEMENTED · FE-INTEGRATED |
| POST | `/api/v1/auth/logout` | `{refreshToken}` | 204 | công khai | IMPLEMENTED · FE-INTEGRATED |
| POST | `/api/v1/auth/change-password` | `{currentPassword,newPassword}` | 204 | đăng nhập | IMPLEMENTED · FE-INTEGRATED · FE-TESTED (validate) |
| — | JWT claims | — | `userId, username, roles[], role, permissions[], permissionScopes, delegatedPermissions, departmentId, orgId, mustChangePassword, exp` | — | IMPLEMENTED (JwtService) |

JWT **không có**: họ tên, email, tên tổ chức, danh sách module. FE:
- hiển thị `username` nếu thiếu họ tên;
- tổ chức hiển thị tên nếu mock, nếu không hiển thị `Tổ chức · <8 ký tự id>`;
- menu không ẩn theo module khi chưa có dữ liệu module.

**PROPOSED**: bổ sung claim `fullName`, `orgName`, `modules[]` hoặc endpoint `GET /api/v1/me`.

### 1.2 Bảng điều khiển Quản trị hệ thống

| Method | Endpoint | Tham số chính | Quyền | Trạng thái |
|---|---|---|---|---|
| GET | `/api/v1/organizations` | `page,size,status(CSV),orgType,keyword,sort` | SUPER_ADMIN | IMPLEMENTED · FE-INTEGRATED · FE-TESTED |
| GET | `/api/v1/organizations/pending` | — (mảng, không phân trang) | SUPER_ADMIN | IMPLEMENTED · FE-INTEGRATED |
| PATCH | `/api/v1/organizations/{id}/approve` | không body | SUPER_ADMIN | IMPLEMENTED · FE-INTEGRATED |
| PATCH | `/api/v1/organizations/{id}/reject` | `{reason}` (BE hiện **bỏ qua** lý do) | SUPER_ADMIN | IMPLEMENTED · FE-INTEGRATED |
| GET | `/api/v1/audit-logs` | `page,size,action,organizationId,keyword` | SUPER_ADMIN | IMPLEMENTED · FE-INTEGRATED |
| GET | `/api/v1/organizations/{id}` | — | SUPER_ADMIN | IMPLEMENTED · PLANNED (màn chi tiết) |
| PATCH | `/api/v1/organizations/{id}/suspend|reactivate` | `{reason?}` | SUPER_ADMIN | IMPLEMENTED · PLANNED |
| PUT | `/api/v1/organizations/{id}/modules` | `{modules:string[]}` (tập đầy đủ) | SUPER_ADMIN | IMPLEMENTED · PLANNED (chưa có UI) |

Response org list dùng **snake_case** (`org_type`, `created_at`, `owner_username`, `owner_email`);
FE chuẩn hoá về camelCase và `status` lowercase.

### 1.3 Bảng điều khiển Tổ chức

| Method | Endpoint | Quyền | Trạng thái |
|---|---|---|---|
| GET | `/departments` | `department.view` | IMPLEMENTED · FE-INTEGRATED · FE-TESTED |
| GET | `/departments/{id}/members` | `employee.view` (theo phòng) | IMPLEMENTED · FE-INTEGRATED |
| GET | `/positions` | OWNER/MANAGER/STAFF | IMPLEMENTED · FE-INTEGRATED |
| GET | `/transfer-requests/inbox` | đăng nhập (server lọc `actionableSteps`) | IMPLEMENTED · FE-INTEGRATED |
| GET | `/notifications` | đăng nhập (≤50, mới nhất) | IMPLEMENTED · FE-INTEGRATED |

Không có endpoint tổng hợp → dashboard tự ghép số liệu thật (đếm phòng ban, cộng nhân sự theo
phòng, đếm chức vụ, đọc hộp duyệt, đếm thông báo chưa đọc). Không có số liệu giả, không sparkline
bịa.

### 1.4 Phòng ban

| Method | Endpoint | Request | Quyền | Lỗi nghiệp vụ | Trạng thái |
|---|---|---|---|---|---|
| GET | `/departments` | — | `department.view` | — | IMPLEMENTED · FE-INTEGRATED · FE-TESTED |
| GET | `/departments/{id}` | — | `department.view` | `DEPARTMENT_NOT_FOUND` | IMPLEMENTED · FE-INTEGRATED |
| POST | `/departments` | `{name≤200, description≤1000?, moduleCodes[]≤6}` | `department.manage` (org-scope) | `VALIDATION_ERROR` | IMPLEMENTED · FE-INTEGRATED |
| PUT | `/departments/{id}` | như trên | `department.manage` | 404 | IMPLEMENTED · FE-INTEGRATED |
| DELETE | `/departments/{id}` | — | `department.manage` | `DEPARTMENT_NOT_EMPTY` | IMPLEMENTED · FE-INTEGRATED |
| GET | `/departments/{id}/available-permissions` | — | `department.view` | — | IMPLEMENTED · PLANNED (dùng cho form chức vụ) |
| GET | `/departments/{id}/module-impact` | `moduleCodes` | `department.manage` | — | IMPLEMENTED · PLANNED (cảnh báo tắt module) |

### 1.5 Nhân sự

| Method | Endpoint | Request | Quyền | Trạng thái |
|---|---|---|---|---|
| GET | `/departments/{departmentId}/members` | — (mảng) | `employee.view` | IMPLEMENTED · FE-INTEGRATED |
| GET | `/departments/{departmentId}/members/{userId}` | — | `employee.view` | IMPLEMENTED · FE-INTEGRATED · FE-TESTED (drawer) |
| GET | `…/members/{userId}/assignments` | — | `employee.view` | IMPLEMENTED · FE-INTEGRATED (chi tiết đã gồm lịch sử) |
| POST | `/departments/{departmentId}/members` | `{username,email,role,positionIds[],staffCode?,fullName?,phone?,teacherProfile?}` | `employee.create` | IMPLEMENTED · FE-INTEGRATED · FE-TESTED (form) |
| PUT | `…/members/{userId}/positions` | `{positionIds[],reason?}` | `employee.assign_position` | IMPLEMENTED · FE-INTEGRATED |
| POST | `…/members/{userId}/reset-password` | — | `employee.reset_password` | IMPLEMENTED · FE-INTEGRATED |
| DELETE | `…/members/{userId}` | — | `employee.delete` (không xoá OWNER) | IMPLEMENTED · FE-INTEGRATED |
| GET | `/specialties` | `q?` | `employee.view/edit`… | IMPLEMENTED · FE-INTEGRATED (form giáo viên) |
| PUT | `/teachers/{id}` | hồ sơ giáo viên + `version` | `employee.edit` | IMPLEMENTED · PLANNED (sửa hồ sơ) |
| — | `PUT /departments/{id}/members/{userId}` | — | — | **PROPOSED** (backend chưa có) |

**Khoảng trống đã xử lý:** `MemberResponse` chỉ có `userId,username,role,status,positionIds,permissions`
— **không có họ tên/email/mã NV**. FE tải thêm hồ sơ chi tiết cho tối đa 30 người
(`ENRICH_LIMIT`, cache 5 phút) để hiển thị tên. Đây là workaround có chủ đích; **PROPOSED**: thêm
`fullName, staffCode, email` vào `MemberResponse` để bỏ N+1.

Quy tắc quyền backend (MembershipPolicy): HR chỉ gán chức vụ có quyền ⊆ quyền của mình; chức vụ
`ORGANIZATION` chỉ Owner gán. FE ẩn/khóa chức vụ cấp tổ chức với người không phải Owner; backend
vẫn kiểm lại và trả `SELF_ESCALATION_NOT_ALLOWED`.

Tạo nhân sự trả `{member, temporaryPassword, mustChangePassword:true}` — FE hiển thị modal một lần,
không cho đóng ngoài ý muốn, có nút sao chép; lỗi `ACCOUNT_EXISTS` thì **không** hiện mật khẩu tạm.

### 1.6 Hồ sơ & đổi mật khẩu

| Màn | Nguồn dữ liệu | Trạng thái |
|---|---|---|
| `/ho-so` | JWT claims (không gọi API) | FE-INTEGRATED (hiển thị đúng, chưa có `GET /me`) |
| `/doi-mat-khau` | `POST /auth/change-password` | FE-TESTED (validate) |

## 2. Màn hình PLANNED — phụ thuộc API

| Màn | API đã có | Thiếu / rủi ro |
|---|---|---|
| Chức vụ & quyền | `GET/POST/PUT/DELETE /positions`, `/permissions`, `/permission-bundles`, `/positions/{id}/impact`, `/clone` | Payload `clone/impact` chưa được đặc tả đầy đủ; chưa có UI |
| Điều chuyển | `GET /transfer-requests/inbox|mine|{id}`, `POST /transfer-requests`, `POST …/steps/{step}/approve|reject`, `/cancel` | Quyền duyệt theo **chức danh**, không theo mã quyền → UI phải dựa `actionableSteps`; trạng thái request chưa có enum chính thức |
| Ủy quyền | `GET /api/delegations`, `POST`, `PUT`, `POST …/revoke`, `GET /api/delegations/me`, `/api/general-manager*` | Chỉ OWNER; chưa có màn hình |
| Module tổ chức | `PUT /organizations/{id}/modules` (SUPER_ADMIN) | **OWNER chưa có endpoint riêng** (`org.module.toggle`) — PROPOSED |
| Nhật ký tổ chức | — | **PROPOSED**: `GET /organizations/{id}/audit-logs` (backend chưa có read API) |
| Tài khoản (SA) | `GET/POST /accounts`, `PATCH status/role`, `POST reset-password` | Reset không trả mật khẩu tạm; chưa phù hợp vận hành thật |
| Giáo viên | `GET /teachers`, `GET /teachers/assignable`, `POST /teachers`, `PUT /teachers/{id}` | Trạng thái dạy, chuyên môn; phụ thuộc `specialties` |
| Sinh viên | `GET/POST/PUT/DELETE /students`, `POST /students/{id}/account` | Trạng thái sinh viên chỉ có trong kế hoạch, chưa có mã |
| Môn học | `GET /subjects` | CRUD chưa có |
| Lớp học | `GET /classes`, `POST`, `PUT /{id}/teacher`, `POST /{id}/cancel`, `/close-requests/*`, `/reopen` | Trạng thái `closeState` vs `status` còn mâu thuẫn tài liệu |
| Lịch học | `GET/POST/PUT /api/departments/{id}/schedules`, `/room-suggestions`, `GET /api/schedules/me` | Xếp lịch lặp `preview/bulk` chưa có |
| Điểm danh | — | **PROPOSED**: bảng + `POST /sessions/{id}/attendance` |
| Đổi lịch | — | **PROPOSED**: `schedule_change_request` API |
| CSVC | `GET/POST/PUT/DELETE /api/departments/{id}/facilities/rooms|equipment`, issues | Mức độ sự cố/khóa phòng chưa có API |
| Thông báo | `GET /notifications`, `POST /{id}/read`, `/read-all` | Chưa có UI |
| Việc chờ duyệt | `GET /transfer-requests/inbox` | Hợp nhất lớp/đổi lịch cần `GET /approvals/inbox` — PROPOSED |
| Quên/đặt lại MK | — | **PROPOSED** (đã có bảng token, chưa có endpoint) |

## 3. Chênh lệch tài liệu ↔ code (cần Technical Lead chốt)

| # | Chủ đề | Tài liệu | Code/DB thực tế | Ảnh hưởng FE |
|---|---|---|---|---|
| 1 | Tên quyền | Sơ đồ v2 dùng `class.view`, `employee.transfer` | `PermissionCatalog` 51 mã dạng dotted (khớp); tài liệu Sprint 4 cũ dùng `CLASS_VIEW`, `PEOPLE_EDIT` | FE chỉ dùng dotted; legacy UPPER_SNAKE không dùng |
| 2 | Module CSVC | `docs/api.md` nói `FACILITY_MANAGEMENT` không tồn tại | Có trong migration 16–26 và guard | Danh mục module FE lấy theo hằng số hiển thị, không hard-code điều hướng |
| 3 | Bật/tắt module | Kế hoạch: OWNER bật/tắt | Tại thời điểm đọc: chỉ `PUT /organizations/{id}/modules` cho SUPER_ADMIN | Màn OWNER để PLANNED; không tự gọi endpoint sai |
| 4 | Lý do từ chối tổ chức | Phải lưu và hiển thị | Backend nhận nhưng **không lưu** | FE vẫn bắt buộc nhập, không hiển thị lại |
| 5 | Họ tên nhân sự | Bảng nhân sự cần họ tên | `MemberResponse` không có | FE làm giàu từ chi tiết (giới hạn 30) |
| 6 | `GET /me` | Kế hoạch 1.1 | Chưa có | Hồ sơ đọc từ JWT |
| 7 | Nhật ký tổ chức | Có màn `/to-chuc/nhat-ky` | `people_audit_log` chưa có endpoint đọc | PLANNED, ghi rõ PROPOSED |
| 8 | Hủy lớp có sinh viên | Sơ đồ: yêu cầu + duyệt | Sprint 4: hủy ngay; code có thêm `cancel-requests/approve` | Chưa làm UI lớp nên chưa ảnh hưởng |
| 9 | Đóng lớp đổi `status`? | Đặc tả: `closeState=CLOSED` **và** `status=DA_KET_THUC` | Code chỉ đổi `closeState` | Sẽ ảnh hưởng badge khi làm FE lớp |
| 10 | Bước nhân viên khi chuyển phòng | DEC-01 còn mở (xác nhận hay đồng ý) | Code có bước `EMPLOYEE` bắt buộc duyệt | UI điều chuyển phải chờ chốt |
| 11 | Danh mục module trong JWT | — | Không có | Menu không lọc theo module được; dựa vào quyền |

Ghi chú: trong thời gian thực hiện, working tree backend xuất hiện thêm thay đổi module toggle
(`28_…sql`, `29_…sql`, `OwnerModuleController`, `AdminModuleController`) **không do FE-00 tạo**.
FE-00 không tích hợp các endpoint mới này; cần đọc lại contract trước khi làm màn module.

## 4. Xử lý lỗi & trạng thái UI

| Tình huống | UI |
|---|---|
| 401 hết access token | Interceptor gọi refresh một lần, xếp hàng các request khác, retry; thất bại → xoá phiên + về `/dang-nhap` + toast |
| 403 | Trang `ForbiddenState` hoặc toast theo ngữ cảnh; không đăng xuất |
| 404 collection (endpoint chưa có) | `ErrorState` + “thử lại”; ghi rõ tính năng chờ backend |
| 409 nghiệp vụ | Toast theo mã đã dịch (ví dụ `DEPARTMENT_NOT_EMPTY`) |
| `MODULE_NOT_ENABLED` | Thông báo module chưa bật; không tự bật |
| `PASSWORD_CHANGE_REQUIRED` / claim `mustChangePassword` | Buộc sang `/doi-mat-khau` |
| Mất mạng | “Không kết nối được tới máy chủ” + nút thử lại |
| Đang tải | Skeleton (bảng, thẻ KPI), không nháy trắng |
| Rỗng | Empty state có hành động phù hợp quyền |
