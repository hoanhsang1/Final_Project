# MEMS FE v2 — Sitemap & điều hướng theo quyền

Nguyên tắc: **role ≠ chức vụ ≠ nhóm quyền ≠ ủy quyền**. Menu được tính từ
`quyền hiệu lực` (JWT `permissions`) + module khả dụng + phạm vi, không từ một chuỗi `if (role)`.
OWNER được backend bypass (`hasRole('OWNER')`) nên FE coi OWNER là có mọi quyền nghiệp vụ trong
tổ chức; SUPER_ADMIN chỉ có khu nền tảng.

## Bốn không gian làm việc

| Không gian | Route gốc | Điều kiện vào (UX) | Nguồn quyền |
|---|---|---|---|
| Quản trị hệ thống | `/quan-tri` | role `SUPER_ADMIN` | role nền tảng |
| Tổ chức | `/to-chuc` | OWNER **hoặc** có quyền `employee.*`, `position.*`, `department.*`, `org.*`, `delegation.*` | chức vụ/bundle/ủy quyền |
| Đào tạo & vận hành | `/dao-tao` | OWNER **hoặc** có `employee.*`, `position.*`, `department.view`, `class.*`, `student.*`, `subject.*`, `schedule.*`, `facility.*`, `teacher.*` | chức vụ/bundle |
| Cá nhân | `/ho-so` | mọi tài khoản đã đăng nhập | quyền self + common |

Một người có thể thấy nhiều không gian (ví dụ HR vừa có nhân sự vừa có đào tạo); switcher ở đầu
sidebar cho đổi không gian. Không gian không có mục nào hiển thị thì bị ẩn khỏi switcher.

## Cây điều hướng & trạng thái

**✓ READY** = có màn hình hoạt động · **PLANNED** = route giữ chỗ, chưa gọi API.

### Quản trị hệ thống (`/quan-tri`)

| Mục | Route | Quyền | Trạng thái |
|---|---|---|---|
| Bảng điều khiển | `/quan-tri` | SUPER_ADMIN | ✓ |
| Chờ duyệt (badge) | `/quan-tri/to-chuc/cho-duyet` | SUPER_ADMIN | ✓ |
| Tất cả tổ chức | `/quan-tri/to-chuc` | SUPER_ADMIN | ✓ |
| Danh mục module | `/quan-tri/module` | SUPER_ADMIN | PLANNED |
| Tài khoản | `/quan-tri/tai-khoan` | SUPER_ADMIN | PLANNED |
| Nhật ký hệ thống | `/quan-tri/nhat-ky` | SUPER_ADMIN | PLANNED |
| Chi tiết tổ chức | `/quan-tri/to-chuc/:id` | SUPER_ADMIN | ✓ (duyệt/từ chối/tạm ngưng/kích hoạt) |

### Tổ chức (`/to-chuc`)

| Nhóm | Mục | Route | Quyền hiển thị | Trạng thái |
|---|---|---|---|---|
| Tổng quan | Bảng điều khiển | `/to-chuc` | vào được không gian | ✓ |
| Cơ cấu | Phòng ban | `/to-chuc/phong-ban` | `department.view` \| `department.manage` \| `employee.view` | ✓ |
| Cơ cấu | Chức vụ & quyền | `/to-chuc/chuc-vu` | `position.view` \| `position.manage` | PLANNED |
| Cơ cấu | Nhân sự | `/to-chuc/nhan-su` | `employee.view` | ✓ (route guard) |
| Cơ cấu | Điều chuyển | `/to-chuc/chuyen-phong` | `employee.transfer` \| `employee.approve_transfer` \| `employee.view` | PLANNED |
| Quản trị | Tổng quản lý & ủy quyền | `/to-chuc/uy-quyen` | `employee.assign_position` | PLANNED |
| Quản trị | Module của tổ chức | `/to-chuc/module` | `org.module.toggle` | ✓ (mock; backend đang chạy 403 → BLOCKED) |
| Quản trị | Nhật ký tổ chức | `/to-chuc/nhat-ky` | `org.audit.view` | PLANNED |

Trang chi tiết: `/to-chuc/phong-ban/:id` (✓), `/to-chuc/nhan-su/:id` không tồn tại — hồ sơ mở
bằng drawer để giữ ngữ cảnh danh sách.

### Đào tạo & vận hành (`/dao-tao`)

| Nhóm | Mục | Route | Quyền | Module | Trạng thái |
|---|---|---|---|---|---|
| Đào tạo | Giáo viên | `/dao-tao/giao-vien` | `employee.view` \| `teacher.change_status` \| `class.assign_teacher` | TEACHER | PLANNED |
| Đào tạo | Sinh viên | `/dao-tao/sinh-vien` | `student.view` | STUDENT | PLANNED |
| Đào tạo | Môn học | `/dao-tao/mon-hoc` | `subject.view` | — | PLANNED |
| Đào tạo | Lớp học | `/dao-tao/lop-hoc` | `class.view` | CLASS | PLANNED |
| Lịch | Lịch học | `/dao-tao/lich-hoc` | `schedule.view` | SCHEDULE | PLANNED |
| Lịch | Điểm danh | `/dao-tao/diem-danh` | `schedule.attendance.*` | SCHEDULE | PLANNED |
| Lịch | Yêu cầu đổi lịch | `/dao-tao/yeu-cau-doi-lich` | `schedule.change_request.*` | SCHEDULE | PLANNED |
| CSVC | Phòng & thiết bị | `/dao-tao/co-so-vat-chat` | `facility.view` \| `facility.room.view` | FACILITY | PLANNED |
| CSVC | Sự cố | `/dao-tao/co-so-vat-chat/su-co` | `facility.issue.*` | FACILITY | PLANNED |

`/dao-tao` tự chuyển tới `/dao-tao/giao-vien` (màn hình đầu tiên của khu).

### Cá nhân (không gian `self`)

| Mục | Route | Quyền | Trạng thái |
|---|---|---|---|
| Việc chờ tôi duyệt (badge) | `/viec-cho-duyet` | `approval.inbox.view` \| `employee.approve_transfer` \| … | PLANNED |
| Thông báo (badge) | `/thong-bao` | đăng nhập | PLANNED |
| Lịch của tôi | `/lich-cua-toi` | `schedule.self_view` \| `schedule.view` | PLANNED |
| Hồ sơ cá nhân | `/ho-so` | đăng nhập | ✓ |
| Cổng sinh viên | `/sinh-vien` | `student.self_view` | PLANNED |
| Quyền được ủy quyền | `/uy-quyen` | đăng nhập | PLANNED |

### Công khai

| Route | Trạng thái | Ghi chú |
|---|---|---|
| `/dang-nhap` | ✓ | Đăng nhập thật (mock/API) |
| `/doi-mat-khau` | ✓ | Bắt buộc khi `mustChangePassword` |
| `/dang-ky` | PLANNED | API `POST /auth/register` đã có; UI chưa làm |
| `/quen-mat-khau` | PLANNED | API chưa có trong backend |
| `/dat-lai-mat-khau` | PLANNED | API chưa có trong backend |
| `/xem-thu/:vaiTro` | Không làm | Route cũ của FE prototype, bỏ |

## Điều hướng sau đăng nhập

Thứ tự trong `defaultRouteFor()`:

1. `SUPER_ADMIN` → `/quan-tri`
2. OWNER/ORG_OWNER → `/to-chuc`
3. có `approval.inbox.view` → `/viec-cho-duyet`
4. vào được không gian Tổ chức → `/to-chuc`
5. vào được khu Đào tạo → `/dao-tao`
6. có `student.self_view` → `/sinh-vien`
7. còn lại → `/ho-so`

Nếu `mustChangePassword = true`, `SessionWatcher` đẩy sang `/doi-mat-khau` trước mọi route khác.

## Quy tắc lọc menu (đã cài trong `lib/nav.ts`)

```ts
canSeeItem = (không yêu cầu module HOẶC module đang bật)
          && (không yêu cầu quyền HOẶC OWNER HOẶC có ít nhất 1 quyền)
```

- OWNER: bypass kiểm quyền nhưng **không** bypass module.
- Module: JWT chưa có claim module. OWNER nạp `GET /api/v1/organizations/my/modules` sau đăng nhập
  (`features/auth/module-hydration.ts`) và menu ẩn module đang tắt; vai trò khác vẫn coi “chưa xác
  định = không ẩn”, backend chặn bằng `MODULE_NOT_ENABLED` và UI hiển thị lỗi tương ứng.
- Nút hành động dùng `usePermission().can()` hoặc `<PermissionGuard>`; không dùng `role === ...`
  ngoại trừ SUPER_ADMIN/OWNER (hai bypass có thật ở backend).

## Ghi chú khác biệt so với sơ đồ chức năng v2

| Chủ đề | Sơ đồ v2 | FE-00 | Lý do |
|---|---|---|---|
| Ủy quyền | `/to-chuc/uy-quyen` | giữ route, PLANNED | Chưa nằm trong phạm vi FE-00 |
| Nhân sự | `/dao-tao/nhan-su` | `/to-chuc/nhan-su` | Gộp HR vào console tổ chức để Owner/HR dùng một nơi; đã ghi trong báo cáo |
| Chức vụ | `/dao-tao/chuc-vu` | `/to-chuc/chuc-vu` | Tránh 2 route trùng chức năng |
| Dashboard Owner | chưa quy định | `/to-chuc` | Sơ đồ trang 6 gán `/to-chuc` = phòng ban; FE đổi thành tổng quan, phòng ban ở `/to-chuc/phong-ban` |
| Chi tiết tổ chức | `/quan-tri/to-chuc/:id` | PLANNED | Duyệt/từ chối đã có ngay trên dashboard và danh sách |
