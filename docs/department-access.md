# API phòng ban, chức vụ, phân quyền và quản lý Sinh viên & Lớp học MEMS

Hướng dẫn thao tác theo từng bước bằng **Docker + MySQL + Postman**, kèm tóm tắt chức năng: [docker-postman-guide.md](docker-postman-guide.md).

## Phạm vi và tương thích

OWNER là chủ **của từng tổ chức**. Mọi truy vấn mới giới hạn theo `orgId`; OWNER không truy cập tổ chức khác. `SUPER_ADMIN`, đăng ký/duyệt tổ chức và claim `roles` hiện có được giữ lại. `ORG_OWNER` được nhận diện thêm là OWNER. Frontend cần tự bổ sung ánh xạ OWNER/MANAGER/STAFF nếu muốn điều hướng theo các vai trò mới.

PeopleService giữ phòng ban, chức vụ, thành viên, sinh viên, lớp học và lịch sử thay đổi. IdentityService giữ tài khoản, danh mục quyền, trạng thái module của tổ chức và phát JWT. Không có khóa ngoại giữa các database. Giả định mỗi người thuộc tối đa một phòng ban được thực thi bằng khóa chính `department_member.user_id`.

Sinh viên và lớp học thuộc **tổ chức** (cột `org_id`), không thuộc phòng ban. Mỗi sinh viên thuộc tối đa một lớp tại một thời điểm. Xóa sinh viên và xóa lớp là xóa mềm (`deleted_at`).

## Chuẩn bị database và chạy

Với database hiện có, sao lưu và chạy các migration bổ sung bằng MySQL Workbench hoặc mysql client, theo đúng database:

1. `06_identity_department_access.sql` — Identity: cờ bắt đổi mật khẩu và nguồn tạo tài khoản.
2. `07_people_department_access.sql` — People: phòng ban, chức vụ, thành viên, audit và hàng đợi xóa bù.
3. `08_facility_department_access.sql` — Facility: thêm `classroom.department_id`.
4. `09_schedule_department_access.sql` — Schedule: thêm `session.department_id`.
5. `10_identity_permission_module.sql` — Identity: thêm cột `permission.module_code`, seed 8 quyền quản lý sinh viên và lớp học thuộc module `STUDENT_MANAGEMENT`.
6. `11_people_student_class.sql` — People: bảng `department_module`, `student`, `school_class`, `class_student`.

Các migration có thể chạy lại (idempotent). **Không chạy lại** bộ `01`–`05` trên database đã có bảng/dữ liệu. Cài mới dùng bộ `01`–`05` trước, sau đó `06`–`11`. Các phòng ban cũ không có dòng nào trong `department_module` tiếp tục hoạt động như trước.

## JWT, mật khẩu tạm và hiệu lực quyền

Ví dụ nội dung token:

```json
{
  "iss": "mems-identity", "sub": "<userId>", "userId": "<userId>",
  "username": "manager01", "orgId": "<orgId>",
  "roles": ["MANAGER"], "role": "MANAGER", "departmentId": "<departmentId>",
  "permissions": ["PEOPLE_VIEW", "PEOPLE_EDIT", "STUDENT_VIEW"], "mustChangePassword": false,
  "iat": 1800000000, "exp": 1800000900
}
```

### Quy tắc quyền hiệu lực (Effective Permissions)
1. **Quyền hiệu lực của một người** = hợp quyền các chức vụ được gán, loại bỏ quyền có `module_code` mà phòng của người đó **KHÔNG** phụ trách.
2. Quyền có `module_code = NULL` (các quyền cũ: `FACILITY_MANAGE`, `SCHEDULE_CREATE`, `SCHEDULE_VIEW`, `PEOPLE_VIEW`, `PEOPLE_EDIT`) luôn được giữ nguyên để không phá vỡ luồng hiện có.
3. **Hiệu lực token:** Quyền hiệu lực không lưu DB. Đổi module của phòng hay đổi chức vụ của thành viên có hiệu lực khi người dùng **refresh token** (tối đa 15 phút theo thời hạn sống của access token).
4. OWNER có toàn bộ quyền trong danh mục, nhưng tổ chức bắt buộc phải có `STUDENT_MANAGEMENT` ở trạng thái `active` mới gọi được các API `/students/**` và `/classes/**`.

## Danh mục quyền

| Mã | Module | Ý nghĩa |
|---|---|---|
| FACILITY_MANAGE | NULL | Quản lý cơ sở vật chất theo phòng |
| SCHEDULE_CREATE | NULL | Tạo lịch theo phòng |
| SCHEDULE_VIEW | NULL | Xem lịch theo phòng |
| PEOPLE_VIEW | NULL | Xem thành viên theo phòng |
| PEOPLE_EDIT | NULL | Quản lý thành viên theo phòng |
| STUDENT_VIEW | STUDENT_MANAGEMENT | Xem danh sách và chi tiết sinh viên |
| STUDENT_CREATE | STUDENT_MANAGEMENT | Tạo mới sinh viên |
| STUDENT_EDIT | STUDENT_MANAGEMENT | Cập nhật thông tin sinh viên |
| STUDENT_DELETE | STUDENT_MANAGEMENT | Xóa mềm sinh viên (gỡ khỏi lớp) |
| CLASS_VIEW | STUDENT_MANAGEMENT | Xem danh sách và chi tiết lớp học |
| CLASS_CREATE | STUDENT_MANAGEMENT | Tạo mới lớp học |
| CLASS_EDIT | STUDENT_MANAGEMENT | Cập nhật lớp học, thêm/gỡ sinh viên |
| CLASS_DELETE | STUDENT_MANAGEMENT | Xóa mềm lớp học (khi không còn sinh viên) |

## API cho frontend

Header chung: `Authorization: Bearer <accessToken>`, `Content-Type: application/json` khi có body. Tên trường JSON dùng camelCase. ID là chuỗi UUID. Response thành công của API People là object/array trực tiếp, không bọc ApiResponse cũ.

### 1. Quản lý phòng ban & Chức vụ
| Service | Method và URL | Quyền và kết quả |
|---|---|---|
| People :8082 | GET /departments | OWNER: mọi phòng của tổ chức; PEOPLE_VIEW: phòng trong token; 200 array kèm modules |
| People :8082 | GET /departments/{id} | OWNER hoặc PEOPLE_VIEW đúng phòng; 200 kèm modules |
| People :8082 | POST /departments | OWNER; body `{name, description, moduleCodes}`; 201 |
| People :8082 | PUT /departments/{id} | OWNER; body `{name, description, moduleCodes}`; 200; thay toàn bộ tập module |
| People :8082 | DELETE /departments/{id} | OWNER; 204; còn thành viên: 409 |
| People :8082 | GET /positions | OWNER/MANAGER/STAFF; 200 array chức vụ của tổ chức |
| People :8082 | POST /positions | OWNER; 201 |
| People :8082 | PUT /positions/{id} | OWNER; 200 |
| People :8082 | DELETE /positions/{id} | OWNER; 204; đang được gán: 409 |
| People :8082 | GET /permissions | OWNER/MANAGER/STAFF; 200 array mã/mô tả/moduleCode |
| People :8082 | GET /departments/{id}/members | OWNER hoặc PEOPLE_VIEW đúng phòng; 200 array |
| People :8082 | POST /departments/{id}/members | OWNER: MANAGER/STAFF; MANAGER + PEOPLE_EDIT: chỉ STAFF phòng mình, quyền không ngoài module và không vượt quyền hiện có; 201 |
| People :8082 | PUT /departments/{id}/members/{userId}/positions | Quy tắc như trên; 200; không cho OWNER tự bỏ quyền |
| People :8082 | DELETE /departments/{id}/members/{userId} | Quy tắc như trên; 204 |

### 2. Quản lý Sinh viên & Lớp học (module STUDENT_MANAGEMENT)
| Method và URL | Quyền | Kết quả |
|---|---|---|
| GET /students | OWNER hoặc STUDENT_VIEW | 200, phân trang (page, size tối đa 100), lọc status, classId, tìm q theo tên/mã |
| GET /students/{id} | OWNER hoặc STUDENT_VIEW | 200; khác tổ chức hoặc đã xóa mềm: 404 STUDENT_NOT_FOUND |
| POST /students | OWNER hoặc STUDENT_CREATE | 201; trùng student_code trong tổ chức: 409 CONFLICT |
| PUT /students/{id} | OWNER hoặc STUDENT_EDIT | 200 |
| DELETE /students/{id} | OWNER hoặc STUDENT_DELETE | 204, xóa mềm, gỡ khỏi lớp |
| GET /classes | OWNER hoặc CLASS_VIEW | 200, phân trang, tìm q |
| GET /classes/{id} | OWNER hoặc CLASS_VIEW | 200; khác tổ chức hoặc đã xóa mềm: 404 CLASS_NOT_FOUND |
| POST /classes | OWNER hoặc CLASS_CREATE | 201; trùng class_code trong tổ chức: 409 CONFLICT |
| PUT /classes/{id} | OWNER hoặc CLASS_EDIT | 200 |
| DELETE /classes/{id} | OWNER hoặc CLASS_DELETE | 204; còn sinh viên: 409 CLASS_NOT_EMPTY |
| GET /classes/{id}/students | OWNER hoặc (CLASS_VIEW và STUDENT_VIEW) | 200 list sinh viên |
| PUT /classes/{id}/students/{studentId} | OWNER hoặc CLASS_EDIT | 204; sinh viên đang ở lớp khác: 409 STUDENT_ALREADY_IN_CLASS |
| DELETE /classes/{id}/students/{studentId} | OWNER hoặc CLASS_EDIT | 204 |

### 3. Mã lỗi chuẩn

Response lỗi luôn ở dạng:
```json
{"code": "<ERROR_CODE>", "message": "<Chi tiết lỗi>"}
```

- `400 MODULE_NOT_ENABLED`: Module chưa được kích hoạt cho tổ chức hoặc ngoài danh sách được phép.
- `400 VALIDATION_ERROR`: Lỗi dữ liệu đầu vào không hợp lệ.
- `400 UNKNOWN_PERMISSION`: Mã quyền không tồn tại trong danh mục hệ thống.
- `401 UNAUTHENTICATED`: Token không hợp lệ hoặc thiếu Bearer token.
- `403 FORBIDDEN`: Không có quyền truy cập hoặc MANAGER cấp vượt quyền hiện có.
- `403 PERMISSION_OUT_OF_MODULE`: MANAGER gán chức vụ chứa quyền ngoài phạm vi module phòng ban phụ trách.
- `403 PASSWORD_CHANGE_REQUIRED`: Bắt buộc đổi mật khẩu tạm trước khi sử dụng các API nghiệp vụ.
- `404 DEPARTMENT_NOT_FOUND`: Phòng ban không tồn tại trong tổ chức.
- `404 POSITION_NOT_FOUND`: Chức vụ không tồn tại trong tổ chức.
- `404 MEMBER_NOT_FOUND`: Thành viên không tồn tại trong phòng ban.
- `404 STUDENT_NOT_FOUND`: Sinh viên không tồn tại trong tổ chức hoặc đã bị xóa mềm.
- `404 CLASS_NOT_FOUND`: Lớp học không tồn tại trong tổ chức hoặc đã bị xóa mềm.
- `409 CONFLICT`: Trùng mã `student_code` hoặc `class_code` trong tổ chức.
- `409 CLASS_NOT_EMPTY`: Không thể xóa lớp học khi còn sinh viên.
- `409 STUDENT_ALREADY_IN_CLASS`: Sinh viên đã được xếp vào lớp học khác.
- `409 DEPARTMENT_NOT_EMPTY`: Không thể xóa phòng ban khi còn thành viên.
- `409 POSITION_IN_USE`: Không thể xóa chức vụ đang được gán cho nhân sự.
- `409 ACCOUNT_EXISTS`: Tài khoản đã tồn tại hoặc tổ chức không ở trạng thái active.
- `503 IDENTITY_UNAVAILABLE`: Lỗi kết nối hoặc timeout khi gọi sang IdentityService.
