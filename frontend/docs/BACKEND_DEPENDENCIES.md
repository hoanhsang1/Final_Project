# MEMS Frontend — Backend Dependencies & trạng thái tích hợp thật

Cập nhật: 16/11/2026, kiểm tra trực tiếp API Gateway `http://localhost:8080` bằng tài khoản seed
(`platform_admin/123456`, `sample_owner/Sample@123456`, `sample_hr/Sample@123456`).

> Kết luận ngắn: **backend đang chạy là bản build cũ hơn source trong repo**. Vì vậy một số màn
> đã code theo contract mới nhưng **chưa thể xác nhận tích hợp thật**; chúng được đánh dấu
> **BLOCKED** bên dưới, không tuyên bố DONE.

## 1. Kết quả probe thật

| Endpoint | Kết quả | Ghi chú |
|---|---|---|
| `POST /api/v1/auth/login` | **200** | Token 900s; cả 3 tài khoản đăng nhập được |
| `GET /api/v1/organizations?page=1&size=1` | **200** | Trả `items,total,page,size`, snake_case |
| `GET /api/v1/organizations/pending` | **200** | Mảng, không phân trang |
| `GET /api/v1/audit-logs?page=1&size=1` | **200** | |
| `GET /api/v1/organizations/{id}` | **200** | Có `organization/owners/modules` |
| `GET /api/v1/organizations/{id}/modules/admin` | **404** | Endpoint mới chưa có trên bản đang chạy |
| `PATCH /organizations/{id}/modules/{code}/lock` | **404** | Khóa module cấp nền tảng BLOCKED |
| `GET /api/v1/organizations/my/modules` | **403** | OWNER gọi vẫn 403 → SecurityConfig/controller mới chưa được deploy |
| `PATCH /api/v1/organizations/my/modules/{code}` | **403** | Bật/tắt module OWNER BLOCKED trên runtime |
| `GET /api/v1/accounts?page=1&size=1` | **200** | |
| `GET /departments` | **200** | |
| `GET /departments/{id}/members` | **200** | Cả OWNER và HR (cùng phòng ban) |
| `GET /positions` | **200** | **Shape cũ**: `permissions` UPPER_SNAKE (`CLASS_VIEW`…), thiếu `scope`, `bundleCodes` |
| `GET /specialties` | **200** | |
| `GET /notifications` | **404** | Gateway chưa route |
| `GET /transfer-requests/inbox` | **404** | Gateway/service chưa route |

### JWT thực tế từ backend đang chạy

- `sample_owner`: `roles=[OWNER]`, `orgId=1111…`, **không có claim `permissionScopes`**, 18 quyền.
- `sample_hr`: `roles=[MANAGER]`, `departmentId=4444…`, **không có `permissionScopes`**, 5 quyền.
- Quyền trong token là mã **legacy UPPER_SNAKE**, không khớp catalog dotted (`employee.view`…)
  mà FE dùng. Hệ quả: khi chạy `VITE_DATA_SOURCE=api` với bản backend này, menu của MANAGER/STAFF
  sẽ gần như trống vì FE lọc theo quyền dotted; OWNER vẫn thấy do bypass role.

## 2. Ảnh hưởng tới từng màn

| Màn | Trạng thái thật | Xử lý của FE |
|---|---|---|
| Đăng nhập / refresh / đổi mật khẩu | **OK** | Dùng thật được |
| Super Admin dashboard + danh sách/chờ duyệt | **OK** | Dùng thật được |
| Chi tiết tổ chức (duyệt/từ chối/tạm ngưng/kích hoạt) | **OK** (đã probe GET 200; các PATCH có trong controller) | Dùng thật được |
| Owner dashboard, phòng ban, nhân sự | **PARTIAL** | Departments/members/positions/specialties chạy; positions thiếu `scope` nên nhãn cấp tổ chức có thể sai |
| Module OWNER (`/to-chuc/module`) | **BLOCKED** | Code + mock đầy đủ; runtime trả 403 → màn hiển thị thông báo BACKEND_DEPENDENCY |
| Khóa module SUPER_ADMIN | **BLOCKED** | Endpoint 404; chưa dựng UI (chỉ ghi chú trong chi tiết tổ chức) |
| Thông báo, hộp việc chờ duyệt | **BLOCKED** | Gateway 404; để PLANNED |
| Các module đào tạo/lịch/CSVC | **BLOCKED** | Ngoài FE-00/FE-01 |

## 3. API còn thiếu / cần bổ sung

1. **Claim `permissionScopes`** trong JWT (hoặc endpoint trả scope) để phân biệt HR DEPARTMENT vs
   ORGANIZATION. FE đã có fallback theo `departmentId` khi claim vắng mặt.
2. **Chuẩn hóa mã quyền**: bản chạy dùng UPPER_SNAKE, source dùng dotted. Cần migrate token/catalog
   thống nhất trước khi tích hợp thật.
3. `GET /me` (hồ sơ, email, họ tên) — hiện FE đọc JWT.
4. `MemberResponse` thêm `fullName`, `staffCode`, `email` — FE đang tải chi tiết tối đa 30 người.
5. `GET/PATCH /organizations/my/modules` — cần deploy bản mới.
6. `GET /organizations/{id}/modules/admin` + `PATCH …/lock` — cần deploy bản mới.
7. `GET /notifications`, `/transfer-requests/inbox` qua gateway.
8. Nhật ký cấp tổ chức (`org.audit.view`) — chưa có endpoint đọc.
9. Quên/đặt lại mật khẩu; điểm danh; đổi lịch; CRUD môn học; xếp lịch lặp.

## 4. Cách FE xử lý khi backend cũ

- Mặc định dev dùng **mock** (`VITE_DATA_SOURCE=mock`) để UI không vỡ; badge “Dữ liệu demo” hiển thị.
- Chuyển `VITE_DATA_SOURCE=api` để gọi thật; lỗi 403/404 hiển thị `ErrorState`/thông báo
  BACKEND_DEPENDENCY, không giả lập thành công.
- OWNER module: nếu GET 403/404, trang module hiển thị rõ “backend chưa hỗ trợ endpoint này”.
- Scope phòng ban: `resolveDepartmentScope` dùng `permissionScopes` nếu có, fallback `departmentId`.
