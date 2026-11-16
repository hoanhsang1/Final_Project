# MEMS — Ma trận tích hợp FE ↔ BE

- **Nhánh:** `fixFlowCreateEmployee`
- **Ngày cập nhật:** 2026-11-16
- **Phạm vi:** IdentityService, PeopleService, ScheduleService, FacilityService ↔ `frontend/` (React 19 + TS + Vite), đi qua APIGateway.
- **Nguồn sự thật:** annotation `@RequestMapping/@GetMapping/...` trong source backend và client trong `frontend/src/features/*/api.ts`. Không suy đoán endpoint, không ghi DTO ngoài source.

## 0. Nhãn trạng thái

| Nhãn | Nghĩa |
|---|---|
| **CONNECTED** | Có route/màn hình + API client + hook/mutation + guard quyền; gọi đúng method/path/DTO backend. |
| **PARTIAL** | Client/route đã có nhưng chưa đủ thao tác end-to-end (ví dụ màn công khai còn giữ chỗ). |
| **UNUSED_API** | Backend có endpoint, FE chưa dùng (ghi rõ lý do). |
| **CONTRACT_MISMATCH** | Gọi được nhưng response thiếu dữ liệu UI cần; ghi chú ngay trên dòng CONNECTED. |
| **NOT_DEPLOYED** | Code route/endpoint đã có nhưng container gateway đang chạy chưa nạp cấu hình mới. |
| **MISSING_BACKEND** | Màn hình đã thiết kế, backend chưa có endpoint → `BACKEND_DEPENDENCY`, không gọi API giả. |

Quy ước chung: JWT là nguồn `userId/orgId/departmentId`; FE không gửi các giá trị này trong nghiệp vụ. Envelope lỗi `{success:false,code,message,data}`. Phân trang `{items,total,page,size}` (giáo viên thêm `pages`). Ngày: ISO UTC, riêng audit `created_at` dạng chuỗi.

## 1. Định tuyến APIGateway

Cấu hình: `backend/APIGateway/src/main/resources/application.yml`.

| Tiền tố gateway | Service | Ghi chú |
|---|---|---|
| `/api/v1/auth/**` | Identity 8081 | login/refresh/logout/change-password |
| `/api/v1/organizations/**` | Identity | gồm `/my/modules`, `/modules/admin`, `/{id}/modules` |
| `/api/v1/accounts/**` | Identity | SUPER_ADMIN |
| `/api/v1/audit-logs/**` | Identity | SUPER_ADMIN |
| `/api/v1/modules` | Identity | danh mục module |
| `/departments/**` | People 8082 | CRUD phòng ban, members, effective permissions, resignation |
| `/positions/**`, `/permissions/**`, `/permission-bundles/**` | People | chức vụ & danh mục quyền |
| `/teachers/**`, `/students/**`, `/classes/**`, `/specialties/**` | People | đào tạo (gốc) |
| `/transfer-requests/**`, `/notifications/**` | People | quy trình & thông báo (gốc) |
| `/users/**` | People | **mới thêm**: `GET /users/me/permissions` |
| `/api/teachers|specialties|subjects|classes|transfer-requests|notifications|delegations|general-manager/**` | People | `StripPrefix=1` cho client Sprint 4 (không có route gốc `/subjects`, `/delegations`, `/general-manager`) |
| `/api/departments/*/schedules/**`, `/api/schedules/**` | Schedule 8083 | `StripPrefix=1` |
| `/api/departments/*/facilities/**` | Facility 8084 | `StripPrefix=1` |

> **NOT_DEPLOYED:** route `/users/**` mới chỉ nằm trong source. Container gateway đang chạy cần được rebuild/redeploy để `/users/me/permissions` trả 200 qua gateway. Trong lúc đó trang Hồ sơ vẫn tải được các thẻ còn lại và hiển thị lỗi có nút thử lại cho thẻ quyền backend.

## 2. Tổng quan backend (endpoint public, không tính `/internal/**`)

| Service | Endpoint public | Cổng |
|---|---:|---|
| IdentityService | 27 | 8081 |
| PeopleService | 81 | 8082 |
| ScheduleService | 7 | 8083 |
| FacilityService | 12 | 8084 |
| **Tổng** | **127** | |

Endpoint `/internal/**` (10 Identity, 2 People, 2 Facility) là giao tiếp service-to-service, **không** thuộc phạm vi FE.

## 3. Ma trận theo miền nghiệp vụ

### 3.1 Identity — Xác thực & phiên

| Method | Endpoint | Quyền | FE sử dụng | Trạng thái |
|---|---|---|---|---|
| POST | `/api/v1/auth/login` | công khai | `login-page` | CONNECTED |
| POST | `/api/v1/auth/refresh` | công khai | `services/http` interceptor | CONNECTED |
| POST | `/api/v1/auth/logout` | công khai | `useLogout` | CONNECTED |
| POST | `/api/v1/auth/change-password` | đăng nhập | `change-password-page` | CONNECTED |
| POST | `/api/v1/auth/register` | công khai | `PublicPlannedPage` (giữ chỗ) | PARTIAL |
| GET | `/api/v1/auth/test` | — | — | UNUSED_API (endpoint debug) |

### 3.2 Identity — Tài khoản (SUPER_ADMIN)

| Method | Endpoint | FE sử dụng | Trạng thái |
|---|---|---|---|
| GET | `/api/v1/accounts` | `/quan-tri/tai-khoan` | CONNECTED |
| POST | `/api/v1/accounts` | dialog tạo tài khoản | CONNECTED (trả `temporaryPassword`, tài khoản `must_change_password=TRUE`) |
| PATCH | `/api/v1/accounts/{id}/status` | dialog khóa/mở | CONNECTED |
| PATCH | `/api/v1/accounts/{id}/role` | dialog đổi vai trò | CONNECTED |
| POST | `/api/v1/accounts/{id}/reset-password` | confirm reset | CONNECTED (trả `temporaryPassword`, buộc đổi mật khẩu lần đăng nhập sau) |
| GET | `/api/v1/accounts/{id}` | — | UNUSED_API (danh sách đã đủ cột; chưa có màn chi tiết) |

### 3.3 Identity — Tổ chức & module

| Method | Endpoint | Quyền | FE sử dụng | Trạng thái |
|---|---|---|---|---|
| GET | `/api/v1/organizations` | SUPER_ADMIN | danh sách tổ chức | CONNECTED |
| GET | `/api/v1/organizations/pending` | SUPER_ADMIN | `/quan-tri/to-chuc/cho-duyet` | CONNECTED |
| GET | `/api/v1/organizations/{id}` | SUPER_ADMIN | trang chi tiết | CONNECTED |
| PATCH | `/api/v1/organizations/{id}/approve` | SUPER_ADMIN | chi tiết | CONNECTED |
| PATCH | `/api/v1/organizations/{id}/reject` | SUPER_ADMIN | chi tiết | CONNECTED (backend bỏ qua `reason`) |
| PATCH | `/api/v1/organizations/{id}/suspend` | SUPER_ADMIN | chi tiết | CONNECTED |
| PATCH | `/api/v1/organizations/{id}/reactivate` | SUPER_ADMIN | chi tiết | CONNECTED |
| PUT | `/api/v1/organizations/{id}/modules` | SUPER_ADMIN | dialog **Cập nhật module** (mới) | CONNECTED |
| GET | `/api/v1/organizations/{id}/modules/admin` | SUPER_ADMIN | chi tiết — bảng module | CONNECTED |
| PATCH | `/api/v1/organizations/{id}/modules/{code}/lock` | SUPER_ADMIN | dialog khóa module | CONNECTED |
| GET | `/api/v1/organizations/my/modules` | OWNER | menu & trang module | CONNECTED |
| PATCH | `/api/v1/organizations/my/modules/{code}` | OWNER | bật/tắt module | CONNECTED |
| GET | `/api/v1/modules` | SUPER_ADMIN | `/quan-tri/module` (chỉ đọc) | CONNECTED |
| GET | `/api/v1/audit-logs` | SUPER_ADMIN | `/quan-tri/nhat-ky` | CONNECTED |
| GET | `/api/v1/organizations/options` | SUPER_ADMIN | — | UNUSED_API (bộ lọc tài khoản dùng danh sách tổ chức) |

### 3.4 People — Phòng ban & thành viên

| Method | Endpoint | Quyền | FE sử dụng | Trạng thái |
|---|---|---|---|---|
| GET | `/departments` | `department.view` | nhiều trang | CONNECTED |
| GET | `/departments/{id}` | `department.view` | trang chi tiết phòng ban | CONNECTED |
| POST/PUT/DELETE | `/departments[/{id}]` | `department.manage` | phòng ban | CONNECTED |
| GET | `/departments/{id}/available-permissions` | `department.view` | form chức vụ — lọc quyền theo module đang bật của phòng ban | CONNECTED |
| GET | `/departments/{id}/module-impact` | `department.manage` | dialog sửa phòng ban — cảnh báo khi gỡ module | CONNECTED |
| GET | `/departments/{id}/members` | `employee.view` | nhân sự, drawer | CONNECTED |
| GET | `/departments/{id}/members/{userId}` | `employee.view` | drawer chi tiết | CONNECTED |
| GET | `…/members/{userId}/assignments` | `employee.view` | — | UNUSED_API (chi tiết đã trả lịch sử bổ nhiệm) |
| POST | `/departments/{id}/members` | `employee.create` | tạo nhân sự/giáo viên | CONNECTED |
| PUT | `…/members/{userId}/positions` | `employee.assign_position` | đổi chức vụ | CONNECTED |
| POST | `…/members/{userId}/reset-password` | `employee.reset_password` | reset + mật khẩu tạm | CONNECTED |
| DELETE | `…/members/{userId}` | `employee.delete` | gỡ khỏi phòng | CONNECTED |
| GET | `/users/me/permissions` | đăng nhập | thẻ **Quyền hiệu lực từ backend** (mới) | CONNECTED · **NOT_DEPLOYED** (gateway) |
| GET | `/departments/{id}/members/{userId}/permissions` | `employee.view` | drawer — xác nhận quyền hiệu lực (mới) | CONNECTED |

### 3.5 People — Chức vụ, quyền, chuyên môn

| Method | Endpoint | FE sử dụng | Trạng thái |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/positions[/{id}]` | `/to-chuc/chuc-vu` | CONNECTED |
| GET | `/positions/{id}/impact` | dialog tác động | CONNECTED |
| POST | `/positions/{id}/clone` | dialog nhân bản | CONNECTED |
| GET | `/permissions` | positions, delegates, my-delegations | CONNECTED |
| GET | `/permission-bundles` | positions | CONNECTED |
| GET | `/specialties` | form giáo viên | CONNECTED |
| POST | `/specialties` | — | UNUSED_API (chưa có màn quản lý chuyên môn) |

### 3.6 People — Giáo viên & sinh viên

| Method | Endpoint | FE sử dụng | Trạng thái |
|---|---|---|---|
| GET | `/teachers` | `/dao-tao/giao-vien` | CONNECTED |
| GET | `/teachers/assignable` | form xếp lớp/lịch | CONNECTED |
| GET | `/teachers/{staffId}` | dialog hồ sơ giáo viên | CONNECTED |
| PUT | `/teachers/{staffId}` | sửa hồ sơ + `version` | CONNECTED |
| POST | `/teachers` | — | UNUSED_API (tạo giáo viên đi qua `POST /departments/{id}/members` + `teacherProfile`) |
| GET | `/students` | `/dao-tao/sinh-vien` | CONNECTED |
| GET | `/students/{id}` | — | UNUSED_API (bảng + sửa dùng dữ liệu dòng) |
| POST/PUT/DELETE | `/students[/{id}]` | sinh viên | CONNECTED |
| POST | `/students/{id}/account` | cấp tài khoản + mật khẩu tạm | CONNECTED |
| GET | `/students/me` | `/sinh-vien` | CONNECTED |
| GET | `/students/me/classes` | `/sinh-vien` | CONNECTED |

### 3.7 People — Môn học & lớp học

| Method | Endpoint | FE sử dụng | Trạng thái |
|---|---|---|---|
| GET | `/api/subjects` | `/dao-tao/mon-hoc` (chỉ đọc) | CONNECTED |
| GET/POST/PUT/DELETE | `/classes[/{id}]` | `/dao-tao/lop-hoc` | CONNECTED |
| PUT | `/classes/{id}/teacher` | gán giáo viên | CONNECTED |
| PUT | `/classes/{id}/teacher/reassign` | phân công lại | CONNECTED |
| POST | `/classes/{id}/cancel` | yêu cầu huỷ lớp | CONNECTED |
| POST | `/classes/{id}/cancel-requests/approve|reject` | duyệt/từ chối huỷ | CONNECTED |
| POST | `/classes/{id}/close-requests[/approve|/reject]` | yêu cầu/duyệt/từ chối đóng lớp | CONNECTED |
| POST | `/classes/{id}/reopen` | mở lại lớp | CONNECTED |
| GET | `/classes/{id}/status-logs` | lịch sử trạng thái | CONNECTED |
| GET | `/classes/{id}/close-events` | sự kiện đóng lớp | CONNECTED |
| GET | `/classes/{id}/students` | danh sách sinh viên lớp | CONNECTED |
| PUT/DELETE | `/classes/{id}/students/{studentId}` | thêm/gỡ sinh viên | CONNECTED |

Quyết định duyệt lớp/huỷ do backend kiểm theo chức danh và uỷ quyền; FE chỉ ẩn/hiện nút theo `OWNER` / `class.approve_close` / `MANAGER`, không tự quyết định thay backend.

### 3.8 People — Quy trình nhân sự

| Method | Endpoint | FE sử dụng | Trạng thái |
|---|---|---|---|
| GET | `/transfer-requests/inbox|mine|{id}` | `/to-chuc/chuyen-phong`, `/viec-cho-duyet` | CONNECTED |
| POST | `/transfer-requests` | tạo yêu cầu điều chuyển | CONNECTED |
| POST | `/transfer-requests/{id}/steps/{step}/approve|reject` | xử lý bước | CONNECTED |
| POST | `/transfer-requests/{id}/cancel` | huỷ yêu cầu | CONNECTED |
| GET | `/departments/{id}/resignation-requests` | tab Nghỉ việc | CONNECTED |
| POST | `/departments/{id}/resignation-requests` | dialog **Tạo yêu cầu nghỉ việc** (mới) | CONNECTED |
| POST | `…/resignation-requests/{requestId}/approve|reject` | duyệt/từ chối | CONNECTED |

Thứ tự thẩm quyền DEC-08 (HR trực tiếp → trưởng phòng → tổng quản lý được uỷ quyền → Chủ tổ chức) do `ResignationApprovalPolicy` quyết định; FE chỉ hiển thị nút theo quyền gợi ý và hiển thị lỗi backend (`SELF_APPROVAL_NOT_ALLOWED`, `RESIGNATION_APPROVER_NOT_ALLOWED`).

### 3.9 People — Thông báo, uỷ quyền, tổng quản lý

| Method | Endpoint | FE sử dụng | Trạng thái |
|---|---|---|---|
| GET | `/notifications` | `/thong-bao`, badge menu | CONNECTED |
| POST | `/notifications/{id}/read` | đánh dấu đã đọc | CONNECTED |
| POST | `/notifications/read-all` | đọc tất cả | CONNECTED |
| GET | `/delegations`, `/delegations/me` | `/to-chuc/uy-quyen`, `/uy-quyen` | CONNECTED |
| POST/PUT | `/delegations[/{id}]` | tạo/sửa uỷ quyền | CONNECTED |
| POST | `/delegations/{id}/revoke` | thu hồi | CONNECTED |
| GET | `/general-manager`, `/general-manager/candidates` | trang uỷ quyền | CONNECTED |
| POST/DELETE | `/general-manager[/{userId}]` | bổ nhiệm/gỡ | CONNECTED |

### 3.10 Schedule — Lịch học

| Method | Endpoint | FE sử dụng | Trạng thái |
|---|---|---|---|
| GET | `/api/departments/{id}/schedules` | `/dao-tao/lich-hoc` | CONNECTED |
| POST | `/api/departments/{id}/schedules` | dialog buổi học | CONNECTED |
| PUT | `/api/departments/{id}/schedules/{sessionId}` | sửa buổi | CONNECTED |
| POST | `…/{sessionId}/cancel` | huỷ buổi | CONNECTED |
| DELETE | `…/{sessionId}` | xoá buổi | CONNECTED |
| GET | `…/room-suggestions` | gợi ý phòng theo giờ | CONNECTED |
| GET | `/api/schedules/me` | `/lich-cua-toi` | CONNECTED |

Backend **không** có API xếp lịch lặp (`preview/bulk`), điểm danh, hoặc yêu cầu đổi lịch.

### 3.11 Facility — Cơ sở vật chất

| Method | Endpoint | FE sử dụng | Trạng thái |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/api/departments/{id}/facilities/rooms[/{roomId}]` | tab Phòng | CONNECTED |
| GET/POST/PUT/DELETE | `/api/departments/{id}/facilities/equipment[/{equipmentId}]` | tab Thiết bị | CONNECTED |
| GET/POST | `/api/departments/{id}/facilities/issues` | `/dao-tao/co-so-vat-chat/su-co` | CONNECTED |
| POST | `…/issues/{issueId}/resolve` | xử lý sự cố | CONNECTED |
| GET | `/api/departments/{id}/facilities` | — | UNUSED_API (response legacy; FE dùng `/rooms` + `/equipment`) |

### 3.12 Đánh giá 10 UNUSED_API

| # | Endpoint | Quyết định | Lý do |
|---|---|---|---|
| 1 | `GET /departments/{id}/available-permissions` | **Đã tích hợp** | Form chức vụ chỉ hiện quyền thuộc module phòng ban đang bật; tránh gán quyền vô hiệu. |
| 2 | `GET /departments/{id}/module-impact` | **Đã tích hợp** | Dialog sửa phòng ban cảnh báo số nhân sự/chức vụ bị ảnh hưởng trước khi gỡ module. |
| 3 | `GET /accounts/{id}` | Giữ UNUSED | Bảng tài khoản đã đủ cột; chưa có màn chi tiết tài khoản trong đặc tả. Gọi thêm chỉ tăng request, không thêm nghiệp vụ. |
| 4 | `GET /organizations/options` | Giữ UNUSED | Bộ lọc tài khoản dùng `GET /organizations` đã có; endpoint options trùng dữ liệu. |
| 5 | `GET /auth/test` | Giữ UNUSED | Endpoint debug, không thuộc nghiệp vụ người dùng. |
| 6 | `GET …/members/{userId}/assignments` | Giữ UNUSED | `GET …/members/{userId}` đã trả lịch sử bổ nhiệm; drawer không cần gọi thêm. |
| 7 | `POST /specialties` | Giữ UNUSED | Chưa có màn quản lý chuyên môn trong đặc tả; form giáo viên chỉ cần danh mục `GET /specialties`. |
| 8 | `POST /teachers` | Giữ UNUSED | Tạo giáo viên đi qua `POST /departments/{id}/members` kèm `teacherProfile` — một luồng duy nhất, tránh hai đường tạo trùng. |
| 9 | `GET /students/{id}` | Giữ UNUSED | Bảng và form sửa dùng dữ liệu dòng đã tải; chưa có màn chi tiết sinh viên. |
| 10 | `GET /api/departments/{id}/facilities` | Giữ UNUSED | Response legacy gộp phòng+thiết bị; FE dùng `/rooms` và `/equipment` có DTO rõ ràng hơn. |

Kết luận: tích hợp 2/10 API có giá trị nghiệp vụ trực tiếp; 8 API còn lại giữ nguyên vì trùng dữ liệu, chỉ phục vụ debug, hoặc chưa có màn hình trong đặc tả — không tích hợp chỉ để tăng tỷ lệ phủ.

## 4. Tổng hợp độ phủ

| Nhóm | Số endpoint | CONNECTED | PARTIAL | UNUSED_API |
|---|---:|---:|---:|---:|
| Identity | 27 | 23 | 1 | 3 |
| People | 81 | 77 | 0 | 4 |
| Schedule | 7 | 7 | 0 | 0 |
| Facility | 12 | 11 | 0 | 1 |
| **Tổng** | **127** | **118 (92,9%)** | **1 (0,8%)** | **8 (6,3%)** |

- **CONTRACT_MISMATCH:** 0 — lỗi mật khẩu tạm đã sửa đồng bộ backend (IdentityService) + client + test.
- **NOT_DEPLOYED:** 1 (`/users/me/permissions` qua gateway đang chạy).
- **MISSING_BACKEND (màn hình BACKEND_DEPENDENCY):** 3 miền — xem mục 5.

## 5. Màn hình giữ chỗ do thiếu backend

| Route | Quyền vào | API còn thiếu | Trạng thái |
|---|---|---|---|
| `/dao-tao/diem-danh` | `schedule.attendance.mark|view` | `GET/POST /api/schedules/{id}/attendance`, `GET /api/reports/attendance` | MISSING_BACKEND |
| `/dao-tao/yeu-cau-doi-lich` | `schedule.change_request.create|approve` | `GET/POST /api/schedules/change-requests`, `POST …/{id}/approve` | MISSING_BACKEND |
| `/to-chuc/nhat-ky` | `org.audit.view` | `GET /api/v1/organizations/audit-logs` (hiện `/api/v1/audit-logs` chỉ SUPER_ADMIN) | MISSING_BACKEND |
| `/dang-ky`, `/quen-mat-khau`, `/dat-lai-mat-khau` | công khai | đăng ký/quên mật khẩu chưa có endpoint | BACKEND_DEPENDENCY (public) |

Ba route đầu dùng `BackendDependencyPage`: không gọi API, không hiển thị dữ liệu giả, có liên kết sang màn hình đã hoạt động.

## 6. Endpoint mới được nối trong đợt này

| Miền | Màn hình / thao tác | Endpoint |
|---|---|---|
| Chức vụ | `/to-chuc/chuc-vu` | `GET/POST/PUT/DELETE /positions`, `/impact`, `/clone`, `/permissions`, `/permission-bundles` |
| Điều chuyển | `/to-chuc/chuyen-phong` | toàn bộ `/transfer-requests/**` |
| Việc chờ duyệt | `/viec-cho-duyet` | `/transfer-requests/inbox`, resignation list/decide/**create** |
| Uỷ quyền | `/to-chuc/uy-quyen`, `/uy-quyen` | `/delegations/**`, `/general-manager/**` |
| Thông báo | `/thong-bao` | `/notifications/**` |
| Giáo viên | `/dao-tao/giao-vien` | `GET /teachers`, `/assignable`, `/teachers/{id}`, `PUT /teachers/{id}` |
| Sinh viên | `/dao-tao/sinh-vien`, `/sinh-vien` | `/students/**`, `/students/me/classes` |
| Môn học | `/dao-tao/mon-hoc` | `GET /api/subjects` (chỉ đọc) |
| Lớp học | `/dao-tao/lop-hoc` | toàn bộ `/classes/**` (18 endpoint) |
| Lịch học | `/dao-tao/lich-hoc`, `/lich-cua-toi` | `/api/departments/{id}/schedules/**`, `/api/schedules/me` |
| CSVC | `/dao-tao/co-so-vat-chat[/su-co]` | rooms, equipment, issues + resolve |
| Tài khoản | `/quan-tri/tai-khoan` | `/api/v1/accounts/**` |
| Danh mục module | `/quan-tri/module` | `GET /api/v1/modules` |
| Nhật ký hệ thống | `/quan-tri/nhat-ky` | `GET /api/v1/audit-logs` |
| Module tổ chức | chi tiết tổ chức | `PUT /organizations/{id}/modules` |
| Quyền hiệu lực | Hồ sơ, drawer nhân sự | `GET /users/me/permissions`, `GET /departments/{id}/members/{userId}/permissions` |

## 7. Chênh lệch hợp đồng & rủi ro đã biết

| # | Chủ đề | Thực tế backend | Xử lý FE |
|---|---|---|---|
| 1 | Mật khẩu tạm khi tạo/reset tài khoản | **Đã sửa:** `AccountService` đặt `must_change_password=TRUE` và trả `temporaryPassword` cho cả tạo và reset | Dialog `TempPasswordDialog` hiển thị đúng mật khẩu backend trả; nếu response cũ không có trường này thì không mở dialog, không bịa mật khẩu |
| 2 | Thông tin nhân sự trong `MemberResponse` | Thiếu họ tên/email/mã NV | FE làm giàu từ chi tiết, giới hạn 30 người/trang |
| 3 | Gateway `/users/**` | Chưa có trong image đang chạy | Đã thêm route vào source; UI có trạng thái lỗi/thử lại |
| 4 | Audit tổ chức | Chỉ SUPER_ADMIN đọc được audit | OWNER thấy BACKEND_DEPENDENCY |
| 5 | Lý do từ chối tổ chức | Backend nhận nhưng không lưu | FE vẫn bắt buộc nhập, không hiển thị lại |
| 6 | CRUD môn học/chuyên môn | Chỉ có `GET` (subjects, specialties) | Màn môn học chỉ đọc + `Alert`; chưa có màn chuyên môn |
| 7 | Xếp lịch lặp | Không có `preview/bulk` | Không đưa lên UI |
| 8 | Module catalog | Chỉ `GET` | Màn danh mục module chỉ đọc |
| 9 | Trạng thái lớp | Đóng lớp chỉ đổi `closeState` | UI hiển thị cả `status` và `closeState`, không tự suy diễn |
| 10 | Phạm vi phòng ban | `DEPARTMENT` scope trả 403 với phòng khác | `useDepartmentScope` khóa bộ chọn và hiển thị lý do |

## 8. Kiểm chứng frontend (2026-11-16)

| Lệnh | Kết quả |
|---|---|
| `npx tsc -b` | PASS |
| `npm run lint` | PASS — 0 error, 13 warning `react-hooks/set-state-in-effect` (đồng bộ form trong dialog, có từ trước) |
| `npm test` | PASS — 23 file, 112 test (13 file / 64 test mới cho đợt này) |
| `npm run build` | PASS — Vite build thành công (cảnh báo chunk > 900 kB và sourcemap Tailwind, không chặn build) |

Test mới (mock ở biên API module, hook/query/mutation chạy thật — không mock runtime, không tính là bằng chứng tích hợp):

| File | Số test | Nội dung |
|---|---:|---|
| `platform/pages/accounts-page.test.tsx` | 4 | Tạo tài khoản trả `temporaryPassword`, response rỗng không mở dialog, lỗi API, reset mật khẩu |
| `organization/pages/positions-page.test.tsx` | 5 | CRUD chức danh, lọc quyền theo module, gói quyền + scope, 403, validation |
| `organization/components/department-form-dialog.test.tsx` | 3 | Cảnh báo module-impact, lỗi impact vẫn lưu được, validation tên |
| `organization/pages/org-modules-page.test.tsx` | 4 | Module core/locked, bật module + refetch, lỗi toggle, endpoint chưa hỗ trợ |
| `organization/pages/employees-page.test.tsx` | 6 | Danh bạ, tạo STAFF + mật khẩu tạm, validation, hồ sơ giáo viên bắt buộc + payload, lỗi backend, ẩn theo quyền |
| `organization/components/employee-detail-drawer.test.tsx` | 4 | Phân công chức vụ + lý do, chặn bỏ hết chức vụ, ẩn theo quyền, reset mật khẩu tạm |
| `workflows/pages/approvals-page.test.tsx` | 4 | Duyệt nghỉ việc, chỉ đọc khi thiếu quyền, lỗi tải, HR tạo yêu cầu |
| `workflows/pages/transfers-page.test.tsx` | 4 | Xử lý bước, huỷ, validation tạo, ẩn theo quyền |
| `workflows/pages/delegations-page.test.tsx` | 4 | Tạo/thu hồi uỷ quyền, bổ nhiệm GM, chế độ chỉ xem không gọi API owner-only |
| `academic/pages/students-page.test.tsx` | 6 | Danh sách, tạo + refetch, validation, lỗi API, cấp tài khoản, ẩn theo quyền |
| `schedule/pages/schedule-page.test.tsx` | 5 | Danh sách, xếp lịch + validation, huỷ + refetch, 403, ẩn theo quyền |
| `facility/pages/facility-page.test.tsx` | 5 | Phòng/thiết bị, tạo phòng + refetch, validation, xoá lỗi, ẩn theo quyền |
| `facility/pages/facility-issues-page.test.tsx` | 5 | Danh sách sự cố, validation báo cáo, gửi báo cáo + refetch, xử lý sự cố + refetch, ẩn theo quyền |

Ghi chú: test frontend chạy trên fixture độc lập cùng shape DTO đọc từ controller. Theo yêu cầu của đợt này, mock test **không** được tính là bằng chứng tích hợp API thật; phần E2E qua gateway/MySQL được ghi riêng trong báo cáo cuối.

## 9. Kiểm chứng tích hợp thật (2026-11-16)

Môi trường: MySQL cô lập `mems-mysql-test` (3307, đã áp migration 01–38) + Identity, People, Gateway chạy từ source trên cổng 9081/9082/9090 (container live không bị restart).

| Kịch bản | Kết quả |
|---|---|
| `POST /api/v1/auth/login` (sample_hr) qua gateway source | 200 |
| `GET /users/me/permissions`, `GET /departments/{id}/members/{userId}/permissions` | 200 — route `/users/**` mới hoạt động |
| `GET /permission-bundles`, `/notifications`, `/api/delegations`, `/api/general-manager`, `/api/subjects` | 200 |
| `GET /api/v1/organizations/{id}` + `/modules/admin` (SUPER_ADMIN) | 200 |
| `PUT /api/v1/organizations/{id}/modules` cùng tập module (SUPER_ADMIN) | 204, tập module giữ nguyên; OWNER nhận 403 (đúng thiết kế) |
| Nghỉ việc — HR holder duyệt yêu cầu giáo viên | 200, ghi `decided_by = sample_hr` |
| Nghỉ việc — người yêu cầu và người bị yêu cầu tự duyệt | 403 `SELF_APPROVAL_NOT_ALLOWED` |
| Nghỉ việc — chỉ còn Trưởng phòng đủ điều kiện duyệt | 200, ghi `decided_by = sample_head` |
| P0 — Tổng quản lý có ủy quyền duyệt khi Trưởng phòng còn đủ điều kiện | 403 `RESIGNATION_APPROVER_NOT_ALLOWED` |
| P0 — ủy quyền hết hạn (`effective_to` quá khứ) | 403 `RESIGNATION_APPROVER_NOT_ALLOWED` |
| Ủy quyền active, không còn HR/Trưởng phòng đủ điều kiện | 200, ghi `decided_by = sample_academic` (GM) |
| Container gateway đang chạy (image cũ) | 404 với `/users/**`, `/subjects`, `/api/subjects`, `/api/departments/*/schedules`, `/api/departments/*/facilities` → cần rebuild/redeploy image |

Kết luận: luồng nghiệp vụ mới chạy đúng trên MySQL thật qua gateway dựng từ source. Image đang chạy trong Docker là bản cũ hơn source nên E2E trên container live chỉ đạt phần route cũ; việc rebuild/restart container nằm ngoài phạm vi được phép của đợt này.

Ngoài E2E ở trên, backend được kiểm lại ngày 2026-11-16:

| Lệnh | Kết quả |
|---|---|
| `IdentityService: ./mvnw -o test` | PASS — 38 test (AccountService 7, AccountController 2, OrganizationModuleService 23, PermissionCatalog 6) |
| `APIGateway|People|Schedule|Facility|Eureka: ./mvnw -o -DskipTests package` | PASS — cả 5 service build offline |
| Migration 36–38 trên `mems-mysql-test` (3307) | Đã áp: `permission.allowed_scopes`, `position.department_id`, 16 assignment, 14 position_bundle, `classroom.department_id`, `equipment.department_id` |

## 10. Audit 21 route nghiệp vụ mới

Cột **Kiểm chứng**: `test` = có test tự động chạy hook/query/mutation thật với fixture độc lập; `app-flow` = test luồng ứng dụng có sẵn; `audit` = rà source + đối chiếu API/DTO/guard (không tính là bằng chứng tích hợp).

| # | Route | API tải khi mở | Hành động | Guard | Trạng thái lỗi/rỗng | Kiểm chứng |
|---:|---|---|---|---|---|---|
| 1 | `/to-chuc/chuc-vu` | positions, permissions, bundles, departments | CRUD, clone, impact, lọc quyền theo module | `PermissionGuard` + ẩn nút theo quyền | ErrorState, EmptyState, refetch sau mutation | test |
| 2 | `/to-chuc/chuyen-phong` | transfer inbox/mine, departments, positions | tạo, duyệt bước, huỷ | quyền tạo/duyệt theo bước | lỗi + empty theo tab, refetch | test |
| 3 | `/viec-cho-duyet` | resignations, transfer inbox, members | duyệt/từ chối, tạo yêu cầu nghỉ | chỉ đọc khi thiếu quyền duyệt | lỗi 403, empty, refetch | test |
| 4 | `/to-chuc/uy-quyen` | delegations, general-manager, permissions | tạo/sửa/thu hồi, bổ nhiệm GM | OWNER-only cho danh sách GM | chế độ chỉ xem, refetch | test |
| 5 | `/uy-quyen` | delegations/me, permissions | xem quyền được uỷ quyền | route guard | EmptyState, ErrorState | audit |
| 6 | `/thong-bao` | notifications | đọc, đọc tất cả | dữ liệu của chính mình | refetch sau mutation | audit |
| 7 | `/dao-tao/giao-vien` | teachers, departments, specialties | sửa hồ sơ + version | ẩn nút theo quyền | ErrorState, EmptyState, refetch | audit |
| 8 | `/dao-tao/sinh-vien` | students, classes | CRUD, cấp tài khoản | ẩn nút theo quyền | lỗi API, validation, refetch | test |
| 9 | `/sinh-vien` | students/me, students/me/classes | chỉ đọc | route guard | ErrorState, EmptyState | audit |
| 10 | `/dao-tao/mon-hoc` | subjects | chỉ đọc + tìm kiếm | route guard | ErrorState, `Alert` thiếu CRUD | audit |
| 11 | `/dao-tao/lop-hoc` | classes, teachers, students | CRUD, gán GV, huỷ/đóng/mở, duyệt | nhiều nhánh quyền theo chức danh | ErrorState, refetch sau mutation | audit |
| 12 | `/dao-tao/lich-hoc` | schedules, room suggestions, classes, teachers | tạo/sửa/huỷ/xoá buổi | ẩn nút theo quyền | lỗi 403, validation, refetch | test |
| 13 | `/lich-cua-toi` | schedules/me | chỉ đọc + lọc ngày | route guard | ErrorState, EmptyState | audit |
| 14 | `/dao-tao/co-so-vat-chat` | rooms, equipment, issues | CRUD phòng/thiết bị | ẩn nút theo quyền | lỗi xoá, refetch | test |
| 15 | `/dao-tao/co-so-vat-chat/su-co` | issues, equipment | báo cáo, xử lý sự cố | `issue.report` / `issue.resolve` | validation, lỗi, refetch | test |
| 16 | `/quan-tri/tai-khoan` | accounts, organizations | tạo, đổi role/status, reset mật khẩu | `PermissionGuard` SUPER_ADMIN | dialog mật khẩu tạm, lỗi API | test |
| 17 | `/quan-tri/module` | modules catalog | chỉ đọc + tìm kiếm | route guard | ErrorState | audit |
| 18 | `/quan-tri/nhat-ky` | audit logs | lọc + phân trang | route guard | ErrorState | audit |
| 19 | `/to-chuc/module` | organizations/my/modules | bật/tắt module, xác nhận | OWNER + module core/locked | lỗi 404/409, refetch + hydrate session | test |
| 20 | `/to-chuc/nhan-su` | departments, members, memberDetail, positions, specialties | tạo nhân sự + hồ sơ giáo viên | `employee.create`, ẩn nút theo quyền | validation, lỗi backend, dialog mật khẩu tạm | test |
| 21 | `/quan-tri/to-chuc/:id` | organizations/{id} + modules/admin | duyệt/từ chối/tạm ngưng/kích hoạt, module | `PermissionGuard` SUPER_ADMIN | 404/409/403, refetch | app-flow + audit |

Kết quả audit: 11 route có test page tự động, 1 route có app-flow test, 9 route được rà source + đối chiếu contract (các test component `department-form-dialog`, `employee-detail-drawer` bổ trợ route 20 và trang phòng ban). Không phát hiện route nào thiếu error/empty state hoặc thiếu refetch sau mutation. Lỗi phát hiện và đã sửa trong đợt: contract mật khẩu tạm (mục 7.1), nhãn `Field` không gắn với input trong dialog tạo tài khoản (đã thêm `htmlFor`/`id`).

## 11. Runbook trước khi deploy live (chưa thực thi trong đợt này)

Điều kiện đã kiểm: migration 36–38 tồn tại và PASS trên `mems-mysql-test` 3307; 6 service backend
build offline PASS; gateway source có đủ route (mục 1); compose dùng service name
`eureka-server`, `identity-org-service`, `people-service`, `schedule-service`, `facility-service`,
`api-gateway`. Không có thay đổi schema mới cho mật khẩu tạm (`must_change_password` đã có sẵn).

1. **Backup** (MySQL host 3306, đang được compose trỏ tới qua `host.docker.internal`):
   ```bash
   mysqldump --single-transaction --routines --triggers -u root -p mems_identity_db > backup_identity_20261116.sql
   mysqldump --single-transaction --routines --triggers -u root -p mems_people_db   > backup_people_20261116.sql
   mysqldump --single-transaction --routines --triggers -u root -p mems_schedule_db > backup_schedule_20261116.sql
   mysqldump --single-transaction --routines --triggers -u root -p mems_facility_db > backup_facility_20261116.sql
   ```
2. **Migrate** — chạy đúng thứ tự, mỗi file đã có `USE` đúng schema:
   ```bash
   mysql -u root -p < 36_people_permission_backfill.sql   # mems_people_db
   mysql -u root -p < 37_facility_department_scope_catchup.sql  # mems_facility_db
   mysql -u root -p < 38_identity_permission_allowed_scopes.sql # mems_identity_db
   ```
3. **Verify**:
   ```sql
   SHOW COLUMNS FROM mems_identity_db.permission LIKE 'allowed_scopes';
   SHOW COLUMNS FROM mems_people_db.position LIKE 'department_id';
   SELECT COUNT(*) FROM mems_people_db.assignment;
   SELECT COUNT(*) FROM mems_people_db.position_bundle;
   SHOW COLUMNS FROM mems_facility_db.classroom LIKE 'department_id';
   SHOW COLUMNS FROM mems_facility_db.equipment LIKE 'department_id';
   ```
4. **Rebuild/redeploy** (cần `.env` có `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET_BASE64`,
   `INTERNAL_API_KEY`):
   ```bash
   docker compose build identity-org-service people-service schedule-service facility-service api-gateway
   docker compose up -d
   docker compose ps
   ```
5. **Smoke test**:
   - `GET http://localhost:8761/actuator/health` → `UP`; gateway trả 401 cho login sai.
   - Đăng nhập SUPER_ADMIN → tạo tài khoản → response có `temporaryPassword`; đăng nhập bằng mật
     khẩu tạm → JWT `mustChangePassword=true`; đổi mật khẩu → 204; login lại → `false`.
   - Reset mật khẩu tài khoản → response có `temporaryPassword`.
   - Qua gateway: `GET /users/me/permissions`, `/api/subjects`, `/api/departments/{id}/schedules`,
     `/api/departments/{id}/facilities/rooms` → 200 (các route mới không còn 404).
   - Trên FE (`VITE_DATA_SOURCE=api`): đăng nhập OWNER → menu theo module → tạo nhân sự (STAFF và
     giáo viên) → hộp mật khẩu tạm hiển thị đúng; mở module, chức vụ, điều chuyển, sự cố.
