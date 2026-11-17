# MEMS — Audit chức năng theo vai trò

- Nhánh: `fixFlowCreateEmployee`
- HEAD: `fe18018e6ac26536b9550252985cb4dc3d0c443c`
- Thời điểm audit: 17/11/2026
- Nguồn đối chiếu: `PermissionCatalog.java`, `DefaultPositionSeeder.java`,
  `EffectivePermissionsService`, `@PreAuthorize` của People/Schedule/Facility,
  `frontend/src/lib/nav.ts`, `frontend/src/lib/permissions.ts`,
  `frontend/src/app/app.tsx`, `frontend/src/routes/guards.tsx`, và kết quả test
  backend/frontend của phiên này.

## 0. Quy ước

- **Permission/Scope** ghi mã quyền thật + scope (`ORG` / `DEPT` / `SELF`).
- **Menu** = mục có hiện trong `nav.ts` không (sau khi lọc quyền + module).
- **Route** = guard ở `app.tsx` (`PermissionGuard`).
- **API** = endpoint backend thực tế.
- **Test**: `PASS` = có test tự động hoặc đã kiểm thử live; `LIVE_PENDING` = mã nguồn
  đúng nhưng chưa chạy trên DB/ảnh live mới; `NOT_TESTED` = chưa có tài khoản/dữ liệu
  để kiểm thử; `NOT_IMPLEMENTED` = backend chưa có.

Mô hình quyền:

```
JWT = ROLE ∪ position_permission ∪ bundle(position) ∪ delegation(active)
      → lọc theo module của phòng ban
      → lọc theo permission.allowed_scopes (ORGANIZATION | DEPARTMENT | SELF)
```

`OWNER`/`ORG_OWNER` bỏ qua kiểm tra mã quyền (mọi catalog). còn lại phải có mã quyền
đúng scope; `EffectivePermissionsService` lọc bỏ mã sai scope.

## 1. SUPER_ADMIN (Quản trị hệ thống)

| Chức năng | Permission | Scope | Menu | Route | API | Test |
|---|---|---|---|---|---|---|
| Duyệt/từ chối tổ chức | platform admin | — | `/quan-tri/to-chuc/cho-duyet` hiện | có | `GET/POST /api/v1/admin/organizations...` | PASS (IdentityService 40 test, live 16/11) |
| Danh sách tổ chức | platform admin | — | `/quan-tri/to-chuc` | có | `GET /api/v1/admin/organizations` | PASS (live 16/11) |
| Danh mục module | platform admin | — | `/quan-tri/module` | có | `GET /api/v1/modules` | PASS (live 16/11) |
| Khoá/mở module tổ chức | platform admin | — | trong trang module | có | `PATCH /api/v1/organizations/{id}/modules/{code}` | PASS (live 16/11) |
| Quản lý tài khoản | platform admin | — | `/quan-tri/tai-khoan` | có | `GET /api/v1/admin/users` | PASS (live 16/11) |
| Nhật ký hệ thống | platform admin | — | `/quan-tri/nhat-ky` | có | `GET /api/v1/admin/audit-logs` | PASS (live 16/11) |
| Quản lý lớp/môn/nhân sự trong tổ chức | không thuộc vai trò platform | — | không hiện (không có org) | — | — | Đúng thiết kế |
| Tự tạo tài khoản OWNER/GM để test | — | — | — | — | — | Không thực hiện (đúng quy định) |

## 2. OWNER / ORG_OWNER

| Chức năng | Permission | Scope | Menu | Route | API | Test |
|---|---|---|---|---|---|---|
| Xem tổng quan tổ chức | OWNER (all) | ORG | `/to-chuc` | có | `/departments`, `/positions`, `/notifications` | PASS (live 13/11) |
| CRUD phòng ban | `department.view/manage` | ORG | `/to-chuc/phong-ban` | có | `/departments` | PASS (live 13/11) |
| CRUD chức vụ | `position.view/manage` | ORG | `/to-chuc/chuc-vu` | có | `/positions` | PASS (live 13/11) |
| Gán/thu hồi chức vụ | `employee.assign_position` | ORG | `/to-chuc/nhan-su` | có | `POST/DELETE .../positions` | PASS (live 13/11) |
| CRUD nhân sự, reset mật khẩu | `employee.*` | ORG | `/to-chuc/nhan-su` | `employee.view` | `/departments/{id}/members` | PASS (live 13/11) |
| Bổ nhiệm/thu hồi Tổng quản lý | OWNER | ORG | `/to-chuc/uy-quyen` | OWNER | `/api/general-manager` | PASS (source + live trước đó) |
| Tạo/thu hồi ủy quyền | OWNER | ORG | `/to-chuc/uy-quyen` | OWNER | `/api/delegations` | PASS (live 13/11) |
| Bật/tắt module | OWNER | ORG | `/to-chuc/module` | `org.module.toggle` | `/api/v1/organizations/my/modules` | PASS (live 16/11) |
| Quản lý giáo viên | `employee.*` | ORG | `/dao-tao/giao-vien` | `employee.view`/… | `/teachers` CRUD | PASS (live 13/11) |
| Quản lý sinh viên + cấp tài khoản | `student.*` | ORG | `/dao-tao/sinh-vien` | `student.view` | `/students` CRUD | PASS (live 13/11) |
| Quản lý lớp, gán giáo viên | `class.*` | ORG | `/dao-tao/lop-hoc` | `class.view`/`class.create` | `/classes` CRUD + `/teacher` | PASS (live 13/11; guard mới SOURCE_FIXED) |
| Duyệt huỷ/đóng lớp, mở lại | OWNER (policy bypass) | ORG | trong chi tiết lớp | `class.view` | `POST /classes/{id}/...approve`, `reopen` | PASS (live 13/11) |
| Xem/thêm/bỏ sinh viên lớp | `class.view` + `class.edit` | ORG | chi tiết lớp | `class.view` | `GET/PUT/DELETE /classes/{id}/students...` | PASS (live 13/11) |
| Quản lý môn học | `subject.view`, `subject.manage` | ORG | `/dao-tao/mon-hoc` | anyOf 2 mã | `GET/POST/PUT/PATCH /api/subjects...` | SOURCE_FIXED; 7 FE test + 8 repo test; LIVE_PENDING (cần migration 42) |
| Quản lý lịch phòng ban | `schedule.*` | ORG | `/dao-tao/lich-hoc` | `schedule.view` | `/api/departments/{id}/schedules` | SOURCE_FIXED; LIVE_PENDING (migration 40) |
| Xem lịch cá nhân | `schedule.view` | ORG | `/lich-cua-toi` | anyOf self/view | `/api/schedules/me` | LIVE_PENDING (migration 40) |
| CRUD phòng/thiết bị, báo/xử lý sự cố | `facility.*` | ORG | `/dao-tao/co-so-vat-chat` | `facility.view` | `/api/departments/{id}/facilities` | PASS (live 13/11); read-only UX SOURCE_FIXED |
| Nhật ký tổ chức | `org.audit.view` | ORG | `/to-chuc/nhat-ky` | có | **không có API org-scope** | NOT_IMPLEMENTED (giữ BackendDependencyPage) |
| Điểm danh / đổi lịch | không có trong catalog | — | menu `api-missing` | có guard placeholder | — | NOT_IMPLEMENTED (ngoài phạm vi) |

## 3. Tổng quản lý (GM, được ủy quyền)

| Chức năng | Permission | Scope | Menu | Route | API | Test |
|---|---|---|---|---|---|---|
| Dùng quyền trong delegation còn hiệu lực | `delegatedPermissions` | ORG | hiện theo quyền được ủy quyền | như quyền | JWT claim | NOT_TESTED — chưa có tài khoản GM được bổ nhiệm trong dữ liệu test |
| Xem ủy quyền của mình | authenticated | — | `/uy-quyen` | có | `GET /api/delegations/me` | NOT_TESTED |
| Duyệt nghỉ việc/điều chuyển/đóng lớp theo capability | permission DELEGATED | ORG | `/viec-cho-duyet` | capability | endpoint approve tương ứng | NOT_TESTED |
| Tự tái ủy quyền / tự nâng quyền | — | — | — | — | backend chặn | PASS (policy unit test) |

> **Không tạo tài khoản GM và không tự gán quyền để ép PASS.** Vai trò này giữ
> `NOT_TESTED` theo đúng yêu cầu.

## 4. HR cấp tổ chức (Quản trị viên tổ chức)

| Chức năng | Permission | Scope | Menu | Route | API | Test |
|---|---|---|---|---|---|---|
| Xem nhân sự toàn tổ chức | `employee.view` | ORG | `/to-chuc/nhan-su` | `employee.view` | `/departments/{id}/members` | PASS (live 13/11) |
| Tạo/sửa/xoá nhân sự | `employee.create/edit/delete` | ORG | `/to-chuc/nhan-su` | `employee.view` | CRUD members | PASS (live 13/11) |
| Gán/thu hồi chức vụ (subset) | `employee.assign_position` | ORG | `/to-chuc/nhan-su` | `employee.view` | position assignment | PASS (live 13/11) |
| Reset mật khẩu | `employee.reset_password` | ORG | `/to-chuc/nhan-su` | `employee.view` | reset endpoint | PASS |
| Tạo/sửa chức vụ | `position.view/manage` | ORG | `/to-chuc/chuc-vu` | anyOf | `/positions` | PASS |
| Xem phòng ban | `department.view` | ORG | `/to-chuc/phong-ban` | anyOf | `/departments` | PASS |
| Quản lý giáo viên/sinh viên/lớp/môn | bundle `ACADEMIC_MANAGEMENT` (+ 2 mã môn) | ORG | `/dao-tao/*` | tương ứng | `/teachers`, `/students`, `/classes`, `/subjects` | PASS (live 13/11); môn SOURCE_FIXED/LIVE_PENDING |
| Quản lý lịch/CSV | bundle `SCHEDULE/FACILITY_MANAGEMENT` | ORG | `/dao-tao/lich-hoc`, `/co-so-vat-chat` | tương ứng | endpoints tương ứng | PASS; schedule LIVE_PENDING |
| Bật/tắt module | không được cấp | — | `/to-chuc/module` **không hiện** | `org.module.toggle` chặn | — | PASS (đúng thiết kế) |
| Bổ nhiệm GM / tạo ủy quyền | không được cấp | — | không hiện | OWNER | — | PASS (đúng thiết kế) |

## 5. HR cấp phòng ban (Nhân sự phòng ban)

| Chức năng | Permission | Scope | Menu | Route | API | Test |
|---|---|---|---|---|---|---|
| Xem nhân sự trong phòng | `employee.view` | DEPT | `/to-chuc/nhan-su` | `employee.view` | `/departments/{id}/members` (lọc phòng) | PASS (live 13/11) |
| Tạo/sửa/xoá nhân sự trong phòng | `employee.create/edit/delete` | DEPT | như trên | `employee.view` | CRUD members | PASS |
| Gán/thu hồi chức vụ trong phòng (subset) | `employee.assign_position` | DEPT | như trên | `employee.view` | position assignment | PASS |
| Reset mật khẩu trong phòng | `employee.reset_password` | DEPT | như trên | `employee.view` | reset | PASS |
| Xem chi tiết nhạy cảm | `employee.view_detail` | DEPT | trong drawer | `employee.view` | member detail | PASS |
| Xem phòng ban của mình | `department.view` | DEPT | `/to-chuc/phong-ban` | anyOf | `/departments`, `/headcount` | PASS (phòng khác hiện "—") |
| Tạo/sửa chức vụ trong phòng | `position.view/manage` | DEPT | `/to-chuc/chuc-vu` | anyOf | `/positions` | PASS |
| Gửi/duyệt cấp 1 nghỉ việc, bước HR điều chuyển | `employee.resign`, `approve_resignation`, `transfer`, `approve_transfer` | DEPT | `/viec-cho-duyet`, `/to-chuc/chuyen-phong` | tương ứng | resignation/transfer | PASS |
| Xem lớp/sinh viên phục vụ module | `class.view`, `student.view` | DEPT | `/dao-tao/lop-hoc` | anyOf | `/classes`, `/classes/{id}/students` | Catalog đã cho DEPARTMENT (migration 39); scope test PASS |
| Xem lịch phòng | `schedule.view` | DEPT | `/dao-tao/lich-hoc` | `schedule.view` | `/api/departments/{id}/schedules` | LIVE_PENDING (migration 40) |
| Quản lý module | không được cấp | — | ẩn | — | — | PASS |

## 6. Trưởng phòng ban

| Chức năng | Permission | Scope | Menu | Route | API | Test |
|---|---|---|---|---|---|---|
| Xem nhân sự **phòng mình** | `employee.view` (mới bổ sung) | DEPT | `/to-chuc/nhan-su` | `employee.view` | `/departments/{id}/members` | SOURCE_FIXED; seeder test PASS; LIVE_PENDING (migration 41) |
| Xem nhân sự phòng khác | — | — | — | — | backend lọc theo phòng, trả 403/rỗng | PASS (service lọc `departmentId`) |
| Tạo/sửa/xoá nhân sự | **không được cấp** | — | không có nút | `employee.view` route nhưng backend chặn | — | PASS (thiếu mã quyền → 403) |
| Xem lớp trong phạm vi phòng | `class.view` | DEPT | `/dao-tao/lop-hoc` | anyOf | `/classes` (lọc phòng) | PASS (scope catalog từ migration 39) |
| Xem sinh viên lớp | `class.view` (service cho phép) | DEPT | chi tiết lớp | `class.view` | `/classes/{id}/students` | PASS |
| Duyệt/từ chối huỷ, đóng lớp | policy `ClassApprovalPolicy` (không cần mã ORG) | DEPT | trong chi tiết | `class.view` | `/classes/{id}/{cancel,close}-requests/{approve,reject}` | PASS (policy test) |
| Mở lại lớp | `class.reopen` | DEPT | trong chi tiết | `class.view` | `POST /classes/{id}/reopen` | PASS (catalog cho DEPARTMENT) |
| Xem lịch phòng | `schedule.view` | DEPT | `/dao-tao/lich-hoc` | `schedule.view` | `/api/departments/{id}/schedules` | LIVE_PENDING (migration 40) |
| Xem lịch của mình | `schedule.self_view` | DEPT/SELF | `/lich-cua-toi` | anyOf | `/api/schedules/me` | LIVE_PENDING (migration 40) |
| Duyệt nghỉ việc cấp 2 / bước trưởng phòng điều chuyển | policy (không cần mã) | DEPT | `/viec-cho-duyet` (capability) | capability/approval | inbox + approve | PASS (policy test); UI dựa capability |
| Tạo/sửa/xoá nhân sự, duyệt module, bổ nhiệm GM | không được cấp | — | ẩn | — | — | PASS |

## 7. Giáo viên (STAFF + chức vụ "Giáo viên")

| Chức năng | Permission | Scope | Menu | Route | API | Test |
|---|---|---|---|---|---|---|
| Xem hồ sơ giáo viên của mình | authenticated (self) | SELF | trong `/dao-tao/lop-cua-toi` | `class.self_view` | `GET /teachers/me` | SOURCE_FIXED; 3 service test PASS; LIVE_PENDING |
| Xem lớp được phân công | `class.self_view` | SELF | `/dao-tao/lop-cua-toi` | `class.self_view` | `GET /classes/me` | SOURCE_FIXED; service test PASS; LIVE_PENDING |
| Xem sinh viên lớp mình dạy | `class.self_view` | SELF | trong lớp của tôi | `class.self_view` | `GET /classes/me/{id}/students` | SOURCE_FIXED; service test PASS; LIVE_PENDING |
| Xem lịch của mình | `schedule.self_view` | SELF/DEPT | `/lich-cua-toi` | anyOf self/view | `GET /api/schedules/me` | LIVE_PENDING (migration 40) |
| Báo sự cố CSV | `facility.issue.report` nếu được gán | DEPT | `/dao-tao/co-so-vat-chat/su-co` | anyOf | `POST .../facilities/issues` | PASS (khi có quyền); chức vụ mặc định không cấp |
| Xem quyền hiệu lực/chức vụ | authenticated | SELF | `/ho-so` | — | `GET /users/me/permissions` | PASS |
| Sửa lớp/sinh viên/điểm danh | không được cấp | — | ẩn | backend chặn | — | PASS |
| Giáo viên có thêm chức vụ khác | hợp nhất quyền | theo chức vụ | menu theo quyền | theo quyền | — | SOURCE_FIXED (union assignment); chưa test live nhiều chức vụ |
| Giáo viên bị thu hồi chức vụ | mất `class.self_view` | — | menu ẩn | route chặn | 403 | NOT_TESTED live (cần thu hồi trên tài khoản thật) |
| Giáo viên phòng ban khác | chỉ lớp mình dạy | SELF | — | — | `/classes/me` lọc `teacher_id` | SOURCE_FIXED (service test); chưa test 2 phòng live |

## 8. Nhân viên thường (STAFF, không chức vụ quyền)

| Chức năng | Permission | Scope | Menu | Route | API | Test |
|---|---|---|---|---|---|---|
| Hồ sơ, phòng ban, chức vụ, quyền hiệu lực | authenticated | SELF | `/ho-so` | — | `/users/me/permissions` | PASS |
| Thông báo | authenticated | SELF | `/thong-bao` | có | `/notifications` | PASS |
| Yêu cầu của tôi | authenticated | SELF | `/ho-so/yeu-cau` | có | `/notifications`/workflow của mình | PASS (live 13/11) |
| Xem lịch của tôi (nếu được cấp) | `schedule.self_view` | SELF | `/lich-cua-toi` | anyOf | `/api/schedules/me` | LIVE_PENDING |
| Thấy nút quản lý khi chưa được gán | — | — | **không** | `PermissionGuard` chặn | backend 403 | PASS (nav + guard test) |
| Tự gửi nghỉ việc/chuyển phòng cho mình | self-service | SELF | — | — | **chưa có `/users/me/...`** | NOT_IMPLEMENTED (ngoài phạm vi phiên này) |

## 9. Sinh viên (STUDENT)

| Chức năng | Permission | Scope | Menu | Route | API | Test |
|---|---|---|---|---|---|---|
| Xem hồ sơ sinh viên của mình | `student.self_view` | SELF | `/sinh-vien` | `student.self_view` | `GET /students/me` | PASS (Identity test cấp quyền; live 16/11) |
| Xem lớp của mình | `student.self_view` | SELF | `/sinh-vien` | `student.self_view` | `GET /students/me/classes` | PASS |
| Xem lịch của mình | `schedule.self_view` | SELF | `/lich-cua-toi` | anyOf | `GET /api/schedules/me` | LIVE_PENDING (migration 40) |
| Thông báo | authenticated | SELF | `/thong-bao` | có | `/notifications` | PASS |
| Xem danh sách lớp/sinh viên toàn org | không được cấp | — | ẩn | backend chặn | — | PASS |
| Điểm danh | chưa có | — | menu `api-missing` | placeholder | — | NOT_IMPLEMENTED |

## 10. Phân loại lỗi phát hiện trong audit

| # | Loại | Mô tả | Xử lý |
|---|---|---|---|
| 1 | Thiếu permission | Trưởng phòng ban không có `employee.view` → 403 mọi API nhân sự phòng | `DefaultPositionSeeder` + migration 41; test seeder PASS |
| 2 | Sai scope | `employee.view` khai `orgOnly` → quyền DEPARTMENT bị lọc mất | Migration 41 upsert `DEPARTMENT,ORGANIZATION` |
| 3 | Sai scope | `class.view`/`class.reopen` từng `orgOnly` | Đã sửa ở migration 39 (trước phiên này) |
| 4 | Menu ẩn sai | Mục "Môn học" gate `subject.view` không tồn tại | Thêm mã vào catalog/bundle/seeder/migration 42; nav+route anyOf |
| 5 | Route guard thiếu | `/dao-tao/lop-hoc` chỉ nhận `class.view`, chặn người chỉ có `class.create` | Guard `anyOf [class.view, class.create]`; trang có chế độ chỉ-tạo |
| 6 | Backend denial (schema) | Schedule 500 `Unknown column 's.department_id'` | Migration 40 (LIVE_PENDING) |
| 7 | Sai module | Facility không phân biệt disabled/locked khi hiện nút ghi | FE gate `canWriteModule` + Alert chỉ đọc; backend vẫn là trọng tài |
| 8 | FE chưa nối API | Môn học chỉ đọc, không CRUD | `subjectsApi` + trang CRUD; 7 test |
| 9 | Thiếu API | Điểm danh, đổi lịch, nhật ký tổ chức, self-service nghỉ/chuyển | NOT_IMPLEMENTED — ngoài phạm vi, giữ placeholder |
| 10 | Lỗi dữ liệu | `session.department_id` NULL ở dữ liệu cũ | Báo cáo trong `SCHEDULE_SCHEMA_FIX_REPORT.md`; không backfill suy đoán |

## 11. Kết quả kiểm thử tổng hợp

| Hạng mục | Kết quả |
|---|---|
| PeopleService `./mvnw -o -q test` | 217 test, 0 failure, 0 error |
| IdentityService `./mvnw -o -q test` | 40 test, 0 failure, 0 error |
| FE `tsc -b` | không lỗi (exit 0) |
| FE `vitest run` toàn bộ | 146 pass / 29 file, 0 fail (nav 16 test) |
| FE `eslint .` | 0 error, 14 warning cũ |
| FE `vite build` | thành công |
| Test mới môn học | 7 pass |
| Test mới lớp (chỉ `class.create`) | 2 pass |
| Test facility theo trạng thái module | 16 pass (active/disabled/locked/not_registered) |
| Test giáo viên self-service | 3 service test pass (PeopleService) |
| E2E API thật sau migration | LIVE_PENDING — chưa chạy migration 40/41/42 trên DB live |
| GM | NOT_TESTED — không có tài khoản GM được bổ nhiệm |

## 12. Việc người dùng cần làm để đạt LIVE_VERIFIED

1. Chạy migration theo `docs/live-migration-runbook.md` (41, 42 trước khi deploy ảnh
   People mới; 40 cho Schedule).
2. Build + deploy Identity → People → Facility → Schedule → Gateway.
3. Kiểm thử API thật bằng JWT của từng vai trò (không in token):
   OWNER, HR org, HR phòng, trưởng phòng, giáo viên, nhân viên, sinh viên.
4. Kiểm thử thêm: giáo viên có nhiều chức vụ, giáo viên bị thu hồi chức vụ, giáo viên
   phòng ban khác, trưởng phòng phòng khác, module Facility `disabled`/`locked`.
5. Bổ nhiệm GM nếu muốn kiểm thử vai trò GM (không tự tạo trong phiên này).
