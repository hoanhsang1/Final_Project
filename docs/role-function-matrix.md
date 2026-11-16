# MEMS — Role–Function Matrix (baseline trước khi sửa)

> Nguồn đối chiếu: `docs/MEMS_so_do_chuc_nang_theo_vai_tro.drawio`, `PermissionCatalog.java`,
> `DefaultPositionSeeder.java`, `AccessProfileService.java`, controller/service thật của
> PeopleService/ScheduleService/FacilityService, và toàn bộ FE `src/lib/nav.ts`,
> `src/lib/permissions.ts`, `src/app/app.tsx`.
>
> Quy ước trạng thái:
> - ✅ = API + UI + quyền/scope khớp, dùng được.
> - ⚠️ = có một phần; UI hoặc quyền/scope lệch, cần sửa.
> - ❌ = thiếu API hoặc thiếu màn hình; không được giả lập dữ liệu.
>
> Cột **Nguồn quyền**: `DEFAULT` = chức vụ mặc định khi tạo tổ chức; `APPOINT` = do OWNER/HR
> gán chức vụ; `DELEGATED` = do OWNER ủy quyền có thời hạn (chỉ ORGANIZATION scope).

## 0. Mô hình quyền đang chạy

```
JWT permissions = ROLE ∪ position_permission ∪ bundle(position) ∪ delegation(active)
                  ↓ lọc theo module của phòng ban
                  ↓ lọc theo permission.allowed_scopes (ORGANIZATION | DEPARTMENT)
```

- `OWNER`/`ORG_OWNER`: **toàn bộ** catalog, không cần chức vụ.
- `MANAGER`/`STAFF`: quyền lấy từ PeopleService (`assignments` + bundle + delegation).
- `STUDENT` và role legacy: quyền lấy từ `role_permission` (dạng UPPERCASE cũ).
- `Tổng quản lý` **không có quyền mặc định**; chỉ có quyền khi OWNER tạo `delegation` còn hiệu lực.
- `MANAGER` **không đồng nghĩa** với quyền quản lý; mọi nút phải dựa trên permission/capability.

---

## 1. OWNER

| Module | Chức năng cụ thể | Permission/scope | API | FE page/action | Trạng thái |
|---|---|---|---|---|---|
| Tổ chức | Xem tổng quan tổ chức | OWNER (all) | `GET /departments`, `GET /positions`, `GET /transfer-requests/inbox`, `GET /notifications` | `/to-chuc` OwnerDashboard | ✅ |
| Tổ chức | LIST/CREATE/UPDATE/DELETE phòng ban | `department.view/manage` ORG | `/departments` CRUD | `/to-chuc/phong-ban` | ✅ |
| Tổ chức | LIST/CREATE/UPDATE/DELETE chức vụ | `position.view/manage` ORG | `/positions` CRUD | `/to-chuc/chuc-vu` | ✅ |
| Tổ chức | ASSIGN/REVOKE chức vụ cho nhân sự | `employee.assign_position` ORG | `POST/DELETE /departments/{id}/members/{userId}/positions` | EmployeesPage → position drawer | ✅ |
| Tổ chức | Xem/gán quyền trực tiếp cho chức vụ (subset rule) | `position.manage` + `employee.assign_position` | `/positions/{id}/permissions` | PositionsPage | ✅ |
| Tổ chức | Tạo/sửa/xoá nhân sự, reset mật khẩu | `employee.*` ORG | `/departments/{id}/members` | `/to-chuc/nhan-su` | ✅ |
| Tổ chức | APPOINT/REMOVE Tổng quản lý | OWNER | `/api/general-manager` | `/to-chuc/uy-quyen` | ✅ |
| Tổ chức | CREATE/UPDATE/REVOKE ủy quyền | OWNER | `/api/delegations` | `/to-chuc/uy-quyen` | ✅ |
| Tổ chức | Bật/tắt module optional | OWNER | `GET/PATCH /api/v1/organizations/my/modules` | `/to-chuc/module` | ✅ |
| Tổ chức | Xem nhật ký tổ chức | `org.audit.view` (không có trong backend) | — (chỉ `/api/v1/audit-logs` cho SUPER_ADMIN) | `/to-chuc/nhat-ky` → BackendDependencyPage | ❌ backend dependency |
| Đào tạo | Quản lý giáo viên | `employee.*`, `class.assign_teacher` | `/teachers` CRUD | `/dao-tao/giao-vien` | ✅ |
| Đào tạo | Quản lý sinh viên + cấp tài khoản | `student.*` ORG | `/students` CRUD + `/students/{id}/account` | `/dao-tao/sinh-vien` | ✅ |
| Đào tạo | Quản lý lớp, phân công giáo viên | `class.*` ORG | `/classes` CRUD + `/classes/{id}/teacher` | `/dao-tao/lop-hoc` | ✅ |
| Đào tạo | Duyệt huỷ/đóng lớp, mở lại | OWNER (policy bypass) | `POST /classes/{id}/cancel-requests/{approve,reject}`, `close-requests/*`, `reopen` | ClassesPage detail | ✅ |
| Đào tạo | Xem/duyệt danh sách sinh viên lớp | `class.view` + `student.view` | `GET /classes/{id}/students` | ClassesPage detail | ✅ |
| Đào tạo | Môn học (LIST) | `class.view`/`student.view`/`class.assign_teacher` (backend) | `GET /api/subjects` | `/dao-tao/mon-hoc` | ⚠️ nav đang gate `subject.view` (không tồn tại) |
| Lịch | CRUD lịch phòng ban | `schedule.*` ORG | `/api/departments/{id}/schedules` | `/dao-tao/lich-hoc` | ✅ |
| Lịch | Xem lịch cá nhân | `schedule.self_view`/`schedule.view` | `/api/schedules/me` | `/lich-cua-toi` | ✅ |
| CSV | CRUD phòng/thiết bị, báo/xử lý sự cố | `facility.*` | `/api/departments/{id}/facilities` | `/dao-tao/co-so-vat-chat` | ✅ |
| Cá nhân | Hồ sơ, quyền hiệu lực, thông báo | authenticated | `GET /users/me/permissions`, `GET /notifications` | `/ho-so`, `/thong-bao` | ✅ |
| Lịch | Điểm danh, yêu cầu đổi lịch | không có permission trong catalog | — | placeholder `/dao-tao/diem-danh`, `/dao-tao/yeu-cau-doi-lich` | ❌ backend dependency |

## 2. Tổng quản lý (ủy quyền)

| Module | Chức năng cụ thể | Permission/scope | API | FE page/action | Trạng thái |
|---|---|---|---|---|---|
| Mọi module | Chỉ dùng quyền trong delegation còn hiệu lực | `delegatedPermissions` ORGANIZATION | JWT claim | Toàn bộ UI dùng `session.permissions` | ✅ (JWT đã gộp) |
| Tổ chức | Xem danh sách GM/ủy quyền của mình | authenticated | `GET /api/delegations/me` | `/uy-quyen` | ✅ |
| Nghỉ việc | Duyệt khi không còn HR/trưởng phòng | `employee.approve_resignation` DELEGATED + position GM | `POST /departments/{id}/resignation-requests/{id}/approve` | `/viec-cho-duyet` | ⚠️ nav không biết capability |
| Đóng/huỷ lớp | Duyệt khi không còn trưởng phòng | `class.approve_close` DELEGATED + position GM | `POST /classes/{id}/close-requests/approve` | ClassesPage detail | ⚠️ nút chỉ hiện nếu có permission; cần capability |
| Điều chuyển | Duyệt bước HR (không phải bước trưởng phòng) | `employee.approve_transfer` DELEGATED | `/transfer-requests/inbox` | `/viec-cho-duyet`, `/to-chuc/chuyen-phong` | ⚠️ cần capability |
| — | **Không được** tái ủy quyền / tự nâng quyền | — | — | — | ✅ backend chặn |

## 3. HR cấp tổ chức (Quản trị viên tổ chức)

| Module | Chức năng cụ thể | Permission/scope | API | FE page/action | Trạng thái |
|---|---|---|---|---|---|
| Tổ chức | LIST/VIEW nhân sự toàn tổ chức | `employee.view` ORG (vị trí ORGANIZATION) | `/departments`, `/departments/{id}/members` | `/to-chuc/nhan-su`, `/to-chuc` | ✅ |
| Tổ chức | CREATE/UPDATE/DELETE nhân sự | `employee.create/edit/delete` ORG | `/departments/{id}/members` | EmployeesPage | ✅ |
| Tổ chức | ASSIGN/REVOKE chức vụ (subset) | `employee.assign_position` | `/departments/{id}/members/{userId}/positions` | EmployeesPage | ✅ |
| Tổ chức | RESET mật khẩu nhân sự | `employee.reset_password` | `POST /departments/{id}/members/{userId}/reset-password` | EmployeesPage | ✅ |
| Tổ chức | Tạo/sửa chức vụ phòng ban | `position.manage` ORG/DEPT | `/positions` | `/to-chuc/chuc-vu` | ✅ |
| Tổ chức | Xem phòng ban | `department.view` | `/departments` | `/to-chuc/phong-ban` | ✅ |
| Nghỉ việc | CREATE yêu cầu nghỉ việc | `employee.resign` | `POST /departments/{id}/resignation-requests` | `/viec-cho-duyet` | ✅ |
| Nghỉ việc | APPROVE/REJECT (cấp 1) | `employee.approve_resignation` (không tính delegated) | `POST .../approve`, `.../reject` | `/viec-cho-duyet` | ✅ |
| Điều chuyển | CREATE yêu cầu điều chuyển | `employee.transfer` | `POST /transfer-requests` | `/to-chuc/chuyen-phong` | ✅ |
| Điều chuyển | APPROVE/REJECT bước HR | `employee.approve_transfer` | `POST /transfer-requests/{id}/steps/HR/{approve,reject}` | `/viec-cho-duyet` | ✅ |
| Đào tạo | Xem/quản lý sinh viên, lớp | `class.*`, `student.*` (bundle ACADEMIC) | `/classes`, `/students` | `/dao-tao/*` | ✅ |
| Lịch/CSV | Quản lý lịch, phòng, thiết bị | bundle SCHEDULE/FACILITY | `/api/departments/{id}/schedules`, `/facilities` | `/dao-tao/lich-hoc`, `/dao-tao/co-so-vat-chat` | ✅ |
| Module | Bật/tắt module | không được cấp (`org.module.toggle` chỉ OWNER) | — | ẩn menu | ✅ (đúng) |

## 4. HR cấp phòng ban (Nhân sự phòng ban)

| Module | Chức năng cụ thể | Permission/scope | API | FE page/action | Trạng thái |
|---|---|---|---|---|---|
| Tổ chức | LIST/VIEW nhân sự **trong phòng** | `employee.view` DEPARTMENT:<id> | `/departments/{id}/members` | `/to-chuc/nhan-su` (scoped) | ✅ |
| Tổ chức | CREATE/UPDATE/DELETE nhân sự trong phòng | `employee.create/edit/delete` DEPT | `/departments/{id}/members` | EmployeesPage | ✅ |
| Tổ chức | ASSIGN/REVOKE chức vụ trong phòng (subset) | `employee.assign_position` DEPT | `/departments/{id}/members/{userId}/positions` | EmployeesPage | ✅ |
| Tổ chức | RESET mật khẩu trong phòng | `employee.reset_password` DEPT | reset endpoint | EmployeesPage | ✅ |
| Tổ chức | Xem chi tiết nhạy cảm | `employee.view_detail` DEPT | member detail | EmployeesPage detail | ✅ |
| Tổ chức | Xem phòng ban (số nhân sự phòng mình) | `department.view` DEPT | `/departments`, `/departments/{id}/headcount` | `/to-chuc/phong-ban` (scoped, “—” phòng khác) | ✅ |
| Tổ chức | Tạo/sửa chức vụ trong phòng | `position.view/manage` DEPT | `/positions` | `/to-chuc/chuc-vu` | ✅ |
| Nghỉ việc | CREATE + APPROVE cấp 1 | `employee.resign`, `employee.approve_resignation` DEPT | resignation endpoints | `/viec-cho-duyet` | ✅ |
| Điều chuyển | CREATE + bước HR | `employee.transfer`, `employee.approve_transfer` DEPT | transfer endpoints | `/to-chuc/chuyen-phong` | ✅ |
| Đào tạo | Xem lớp/sinh viên phục vụ module | `class.view`, `student.view` DEPT | `/classes`, `/students`, `/classes/{id}/students` | `/dao-tao/lop-hoc`, `/dao-tao/sinh-vien` | ❌ catalog `orgOnly` → quyền bị lọc mất |
| Lịch | Xem lịch phòng | `schedule.view` DEPT | `/api/departments/{id}/schedules` | `/dao-tao/lich-hoc` | ✅ |
| Module | Không quản lý module | — | — | ẩn | ✅ |

## 5. Trưởng phòng ban

| Module | Chức năng cụ thể | Permission/scope | API | FE page/action | Trạng thái |
|---|---|---|---|---|---|
| Tổ chức | Xem nhân sự phòng | `employee.view`? **Không có trong chức vụ mặc định** | `/departments/{id}/members` (backend cần employee.view) | `/to-chuc/nhan-su` | ⚠️ chức vụ mặc định thiếu quyền xem nhân sự |
| Đào tạo | VIEW lớp trong phạm vi phòng/module | `class.view` DEPT (chức vụ) | `GET /classes` | `/dao-tao/lop-hoc` | ❌ catalog `orgOnly` → bị lọc mất |
| Đào tạo | VIEW sinh viên trong lớp | `student.view` DEPT (nếu được gán) | `/classes/{id}/students` | ClassesPage detail | ❌ catalog `orgOnly` |
| Đào tạo | APPROVE/REJECT huỷ lớp | policy `ClassApprovalPolicy` (không cần class.approve_close) | `POST /classes/{id}/cancel-requests/{approve,reject}` | ClassesPage detail | ⚠️ `canDecide` phụ thuộc permission + `hasRole('MANAGER')` |
| Đào tạo | APPROVE/REJECT đóng lớp | policy | `POST /classes/{id}/close-requests/{approve,reject}` | ClassesPage detail | ⚠️ policy cho phép nhưng UI ẩn |
| Đào tạo | REQUEST đóng/huỷ lớp | `class.request_close`/`class.cancel` (không có trong chức vụ) | `POST /classes/{id}/close-requests` | ClassesPage detail | ❌ cần bổ sung chức vụ nếu nghiệp vụ cho phép |
| Đào tạo | REOPEN lớp | `class.reopen` DEPT (chức vụ) | `POST /classes/{id}/reopen` | ClassesPage detail | ❌ catalog `orgOnly` |
| Nghỉ việc | APPROVE/REJECT cấp 2 | policy `ResignationApprovalPolicy` (không cần permission) | resignation approve/reject | `/viec-cho-duyet` | ⚠️ nav/nút dùng permission nên ẩn |
| Điều chuyển | APPROVE bước SOURCE_HEAD/TARGET_HEAD | chức danh trưởng phòng (không cần permission) | `/transfer-requests/{id}/steps/{step}/approve` | `/viec-cho-duyet`, `/to-chuc/chuyen-phong` | ⚠️ inbox API trả đúng nhưng menu có thể ẩn |
| Lịch | VIEW lịch phòng | `schedule.view` DEPT (cần bổ sung chức vụ) | `/api/departments/{id}/schedules` | `/dao-tao/lich-hoc` | ⚠️ |

## 6. Giáo viên (STAFF + chức vụ TEACHER)

| Module | Chức năng cụ thể | Permission/scope | API | FE page/action | Trạng thái |
|---|---|---|---|---|---|
| Cá nhân | Xem hồ sơ giáo viên của mình | authenticated (self) | ❌ chưa có `GET /teachers/me` | ❌ chưa có màn hình | ❌ |
| Đào tạo | LIST lớp được phân công | `class.self_view` (đề xuất) | ❌ chưa có `GET /classes/me` | ❌ chưa có màn hình | ❌ |
| Đào tạo | VIEW sinh viên lớp mình dạy | `class.self_view` + ownership | ❌ chưa có `GET /classes/me/{id}/students` | ❌ | ❌ |
| Lịch | Xem lịch của mình | `schedule.self_view`/`schedule.view` | `GET /api/schedules/me` | `/lich-cua-toi` | ⚠️ `schedule.self_view` chưa được cấp; `schedule.view` DEPT OK |
| Lịch | Xem lịch phòng ban | `schedule.view` DEPT (chức vụ) | `/api/departments/{id}/schedules` | `/dao-tao/lich-hoc` | ✅ |
| CSV | Báo sự cố | `facility.issue.report` (nếu được gán) | `POST /api/departments/{id}/facilities/issues` | `/dao-tao/co-so-vat-chat/su-co` | ⚠️ chức vụ mặc định không có |
| Cá nhân | Xem quyền hiệu lực/chức vụ | authenticated | `GET /users/me/permissions` | `/ho-so` | ✅ (sau khi sửa scope self) |
| Cá nhân | Gửi yêu cầu nghỉ việc/chuyển phòng cho mình | self-service (đề xuất) | ❌ chưa có `/users/me/...` | ❌ | ❌ |
| Thông báo | Xem thông báo | authenticated | `/notifications` | `/thong-bao` | ✅ |

## 7. Nhân viên thông thường (STAFF, chức vụ không quyền)

| Module | Chức năng cụ thể | Permission/scope | API | FE page/action | Trạng thái |
|---|---|---|---|---|---|
| Cá nhân | Hồ sơ, phòng ban, chức vụ, quyền hiệu lực | authenticated | `GET /users/me/permissions` + JWT `departmentId` | `/ho-so` | ✅ |
| Thông báo | Xem thông báo | authenticated | `/notifications` | `/thong-bao` | ✅ |
| Cá nhân | Gửi yêu cầu nghỉ việc cho mình | self-service (đề xuất) | ❌ chưa có | ❌ | ❌ |
| Cá nhân | Gửi yêu cầu chuyển phòng cho mình | self-service (đề xuất) | ❌ chưa có | ❌ | ❌ |
| Lịch | Xem lịch của mình (nếu là giáo viên/được cấp) | `schedule.self_view` | `/api/schedules/me` | `/lich-cua-toi` | ⚠️ chưa được cấp mặc định |
| Mọi module | Không thấy quyền quản lý khi chưa được gán | — | — | nav/permission | ✅ |

## 8. Sinh viên (STUDENT)

| Module | Chức năng cụ thể | Permission/scope | API | FE page/action | Trạng thái |
|---|---|---|---|---|---|
| Cá nhân | Xem hồ sơ sinh viên của mình | `student.self_view` | `GET /students/me` | `/sinh-vien` | ❌ STUDENT role chưa được cấp quyền self |
| Đào tạo | Xem lớp của mình | `student.self_view` | `GET /students/me/classes` | `/sinh-vien` | ❌ cùng nguyên nhân |
| Lịch | Xem lịch của mình | `schedule.self_view` | `GET /api/schedules/me` | `/lich-cua-toi` | ❌ chưa được cấp |
| Thông báo | Xem thông báo | authenticated | `/notifications` | `/thong-bao` | ✅ (nếu tài khoản active) |
| Cá nhân | Hồ sơ/quyền | authenticated | `GET /users/me/permissions` | `/ho-so` | ✅ |

---

## 9. Lỗi gốc đã xác định (trước khi sửa)

| # | Lỗi gốc | Bằng chứng | Ảnh hưởng |
|---|---|---|---|
| RC-1 | STUDENT role chỉ có quyền legacy UPPERCASE; `IdentityDataInitializer` không cấp `student.self_view`, `class.self_view`, `schedule.self_view` | `IdentityDataInitializer` chỉ seed OWNER/MANAGER/STAFF, catalog chỉ grant OWNER | Sinh viên 403 ở `/students/me`, `/students/me/classes`, `/schedules/me`; menu `/sinh-vien` ẩn |
| RC-2 | Chức vụ TEACHER/Trưởng phòng/Nhân sự phòng ban gán `class.view`, `student.view`, `class.approve_close`, `class.reopen` ở DEPARTMENT nhưng catalog khai `orgOnly` → `EffectivePermissionsService` lọc mất | `PermissionCatalog` + `DefaultPositionSeeder` | Giáo viên/trưởng phòng/HR phòng mất quyền xem lớp/sinh viên, duyệt đóng lớp |
| RC-3 | Không có self contract cho giáo viên | Không có `/teachers/me`, `/classes/me` | Giáo viên không có màn hình lớp/sinh viên của mình |
| RC-4 | Không có API capability duyệt | Không có `/approvals/inbox` hay `/users/me/approval-capabilities` | Menu “Việc chờ tôi duyệt” và nút duyệt dựa vào permission name thay vì policy |
| RC-5 | FE dùng `hasRole('MANAGER')` như quyền duyệt | `approvals-page.tsx`, `classes-page.tsx` | MANAGER không có chức vụ vẫn thấy nút duyệt; trưởng phòng thật có thể bị ẩn |
| RC-6 | FE nav gate bằng mã quyền không tồn tại trong backend (`subject.view`, `org.module.toggle`, `approval.inbox.view`, `teacher.change_status`, `schedule.attendance.*`, `schedule.change_request.*`) | `frontend/src/lib/permissions.ts` | Môn học/module/duyệt bị ẩn oan |
| RC-7 | Chỉ OWNER nạp module; role khác `modules=[]` = “không ẩn”, không phân biệt UNKNOWN/DISABLED/LOCKED/ACTIVE | `module-hydration.ts`, `nav.ts` | Không hiển thị trạng thái module; menu có thể hiện module `not_registered` |
| RC-8 | Module lõi thiếu row `organization_module` bị coi là `not_registered` | `InternalOrganizationController` COALESCE | Guard đọc/ghi chặn oan module lõi ở tổ chức cũ |
| RC-9 | Route `/dao-tao` luôn redirect `/dao-tao/giao-vien` | `app.tsx` | Người chỉ có quyền lớp/sinh viên bị đẩy vào trang 403 |
| RC-10 | Một số route thiếu `PermissionGuard` (`/to-chuc/chuyen-phong`, `/to-chuc/uy-quyen`, `/viec-cho-duyet`, `/thong-bao`, `/uy-quyen`) | `app.tsx` | Chỉ dựa vào workspace guard; deep-link vẫn vào được trang rỗng/lỗi |
| RC-11 | Không có self-service nghỉ việc/chuyển phòng | Không có `/users/me/...` | STAFF/giáo viên không thể tự gửi yêu cầu dù nghiệp vụ cho phép |
| RC-12 | Sau khi gán/thu hồi chức vụ hoặc ủy quyền, FE không refresh quyền hiệu lực/JWT | Không invalidate `permissions/me`, không refresh token | Menu/nút giữ trạng thái cũ tới khi đăng nhập lại |

## 10. Backend dependencies (không thể làm chỉ bằng FE)

| Chức năng | Thiếu gì | Cách xử lý |
|---|---|---|
| Nhật ký tổ chức | API đọc audit theo org cho OWNER | Giữ BackendDependencyPage; cần endpoint `GET /api/v1/organizations/my/audit-logs` |
| Điểm danh | Bảng + API attendance | Giữ placeholder; cần migration + ScheduleService endpoints |
| Yêu cầu đổi lịch | Entity + API change request | Giữ placeholder; cần migration + ScheduleService endpoints |
| Môn học (quản lý) | Chỉ có `GET /api/subjects`; không có CRUD/`subject.*` | Chỉ hiển thị danh sách; CRUD cần backend |
| Trạng thái giáo viên | Không có endpoint đổi `teaching_status` | Không hiển thị nút; cần backend |
| Trạng thái sinh viên | Không có endpoint đổi trạng thái | Không hiển thị nút; cần backend |

---

## 11. Ma trận kiểm thử theo tài khoản (điền sau khi sửa)

| Vai trò | Chức năng hợp lệ | Đã hiển thị | Đã kiểm thử | Còn thiếu |
|---|---|---|---|---|
| OWNER | | | | |
| Tổng quản lý (ủy quyền) | | | | |
| HR cấp tổ chức | | | | |
| HR cấp phòng ban | | | | |
| Trưởng phòng ban | | | | |
| Giáo viên | | | | |
| Nhân viên thường | | | | |
| Sinh viên | | | | |
