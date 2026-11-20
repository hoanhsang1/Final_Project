# Phase 1 — Role & Permission Matrix (dùng cơ chế RBAC hiện có)

> Tài liệu thiết kế. **Không thay đổi** catalog quyền, role, bundle hay dữ liệu phân quyền.
> Mọi mã quyền mới là **Đề xuất**, cần người dùng chốt và tự triển khai. Các mã "Đã có" trích từ
> `backend/IdentityService/src/main/java/com/mems/service/PermissionCatalog.java` tại HEAD `cdd03b8`.
> Quyết định liên quan: `D-05` (ai quản lý môn), `D-06` (chuyên môn + duyệt), `D-10` (module guard).

---

## 1. Cơ chế hiện có (không đổi)

| Thành phần | Vai trò |
|---|---|
| `PermissionCatalog` | 55 mã quyền chuẩn, mỗi mã có `description`, `moduleCode`, `allowedScopes` |
| `permission` (Identity DB) | Bản ghi quyền; `allowed_scopes` = `ORGANIZATION`, `DEPARTMENT` hoặc cả hai |
| `position` (People DB) | Chức danh, có `scope` và `department_id`; `profile_type GENERAL/TEACHER` |
| `position_permission` | Quyền gán trực tiếp cho chức danh |
| `position_bundle` + `permission_bundle_item` | Gán theo gói (`HR_MANAGEMENT`, `ACADEMIC_MANAGEMENT`, `SCHEDULE_MANAGEMENT`, `FACILITY_MANAGEMENT`) |
| `member_position` | Người giữ chức danh |
| `delegation` / `delegation_permission` | Uỷ quyền có thời hạn (chỉ ORGANIZATION-scope, delegate phải là tổng quản lý) |
| `EffectivePermissionsService` (People) | Tính quyền hiệu lực: assignment ∩ scope ∩ module ∩ delegation, fail-closed |
| `OrganizationModuleGuard` | Chặn khi module tổ chức không bật |
| JWT | Mang quyền hiệu lực; `orgId` lấy từ token, không từ client |

Quy tắc scope:

- **ORGANIZATION**: áp dụng toàn tổ chức; chức danh không gắn phòng ban.
- **DEPARTMENT**: chỉ áp dụng trong phòng ban của người dùng/chức danh.
- Quyền `allowedScopes = ORGANIZATION` **không** dùng được cho chức danh DEPARTMENT.

---

## 2. Quyền hiện có liên quan Phase 1

| Mã | Module | Scope | Ý nghĩa | Bundle |
|---|---|---|---|---|
| `subject.view` | STUDENT_MANAGEMENT | **ORGANIZATION** | Xem môn | ACADEMIC_MANAGEMENT |
| `subject.manage` | STUDENT_MANAGEMENT | **ORGANIZATION** | Tạo/sửa/kích hoạt–ngừng môn | ACADEMIC_MANAGEMENT |
| `class.view` | STUDENT_MANAGEMENT | ORGANIZATION + DEPARTMENT | Xem lớp (lọc theo phòng ban) | ACADEMIC_MANAGEMENT |
| `class.create` | STUDENT_MANAGEMENT | ORGANIZATION | Tạo lớp | ACADEMIC_MANAGEMENT |
| `class.edit` | STUDENT_MANAGEMENT | ORGANIZATION | Sửa lớp, ghi danh | ACADEMIC_MANAGEMENT |
| `class.assign_teacher` | STUDENT_MANAGEMENT | ORGANIZATION | Gán giáo viên | ACADEMIC_MANAGEMENT |
| `class.teacher.reassign` | STUDENT_MANAGEMENT | ORGANIZATION | Phân công lại | ACADEMIC_MANAGEMENT |
| `employee.view` | — (null) | ORGANIZATION + DEPARTMENT | Xem nhân sự/giáo viên | HR_MANAGEMENT |
| `employee.edit` | — (null) | ORGANIZATION + DEPARTMENT | Sửa hồ sơ, chuyên môn | HR_MANAGEMENT |
| `teacher.change_status` | — | ORGANIZATION + DEPARTMENT | Đổi trạng thái giảng dạy | HR_MANAGEMENT |
| `department.view` | — | ORGANIZATION + DEPARTMENT | Xem phòng ban | HR_MANAGEMENT |
| `department.manage` | — | ORGANIZATION | Tạo/sửa/xoá phòng ban | — |
| `position.view/manage` | — | ORGANIZATION + DEPARTMENT | Xem/quản lý chức danh | HR_MANAGEMENT |
| `org.audit.view` | — | ORGANIZATION | Xem nhật ký tổ chức | — |

Ghi chú đã kiểm chứng:

- `subject.view/manage` **chỉ ORGANIZATION**: trưởng phòng (chức danh DEPARTMENT) dù được gán
  cũng không dùng được — `EffectivePermissionsService` loại bỏ ở scope DEPARTMENT.
- Không có `subject.create/edit/delete`; mọi thao tác ghi dùng `subject.manage`.
- OWNER / ORG_OWNER / SUPER_ADMIN nhận toàn bộ catalog (không cần gán từng mã).
- Module `STUDENT_MANAGEMENT` phải bật ở cấp tổ chức để dùng lớp/học sinh; `SubjectController`
  hiện **chưa** kiểm module (`D-10`).

---

## 3. Quyền đề xuất (chưa tồn tại trong catalog)

> Tất cả dưới đây là **Đề xuất**. Không tự thêm vào `PermissionCatalog`, seed, migration hay role.
> Nếu người dùng đồng ý, người dùng tự cập nhật Identity + People theo `implementation-roadmap.md`.

| Mã đề xuất | Module đề xuất | Scope đề xuất | Ý nghĩa | Ghi chú |
|---|---|---|---|---|
| `curriculum.view` | STUDENT_MANAGEMENT | ORGANIZATION | Xem chương trình đào tạo | Có thể bỏ nếu dùng `subject.view` |
| `curriculum.manage` | STUDENT_MANAGEMENT | ORGANIZATION | Tạo/sửa/ngừng chương trình, gán môn | Có thể bỏ nếu dùng `subject.manage` |
| `teacher.expertise.manage` | — (null) | ORGANIZATION + DEPARTMENT | Gán/thu hồi môn cho giáo viên | Có thể bỏ nếu dùng `employee.edit` |
| `teacher.expertise.approve` | — (null) | ORGANIZATION + DEPARTMENT | Duyệt/từ chối chuyên môn | Chỉ cần nếu bật duyệt (D-06) |
| `class.subject.manage` | STUDENT_MANAGEMENT | ORGANIZATION | Gán/bỏ môn khỏi lớp | Có thể bỏ nếu dùng `class.edit` |

Bundle đề xuất (nếu tạo quyền mới):

- `ACADEMIC_MANAGEMENT`: thêm `curriculum.view/manage`, `class.subject.manage`.
- `HR_MANAGEMENT`: thêm `teacher.expertise.manage/approve`.

**Phương án tối thiểu (không thêm mã nào):**

- Curriculum dùng `subject.manage` để ghi, `subject.view` để đọc.
- Gán môn cho lớp dùng `class.edit`.
- Chuyên môn giáo viên dùng `employee.edit`.
- Không có duyệt chuyên môn (mọi gán trực tiếp có hiệu lực).

Ưu: không đổi catalog/role/bundle, triển khai nhanh. Nhược: quyền gộp, khó tách vai trò giáo vụ
và trưởng phòng; không có audit trạng thái duyệt.

---

## 4. Trả lời 7 câu hỏi quyền

### 4.1. Ai được xem danh sách môn?

| Phương án | Quyền | Scope | Hệ quả |
|---|---|---|---|
| **A (hiện tại)** | `subject.view` | ORGANIZATION | Chỉ chức danh/vai trò cấp tổ chức |
| B | `subject.view` | ORGANIZATION + DEPARTMENT | Trưởng phòng xem được môn; cần đổi `allowedScopes` |
| C | thêm `curriculum.view` cho phòng ban | DEPARTMENT | Không khuyến nghị: môn là danh mục chung |

**Đề xuất:** A cho Phase 1. Nếu nghiệp vụ cần trưởng phòng xem, chọn B (một thay đổi nhỏ ở
catalog + migration quyền, người dùng tự làm).

**NEEDS_USER_DECISION (D-05).**

### 4.2. Ai được tạo/sửa/ngừng môn?

- **A (hiện tại):** OWNER hoặc `subject.manage` (ORGANIZATION).
- B: cho phép `subject.manage` ở DEPARTMENT.
- C: tách `subject.create/edit/deactivate` (không khuyến nghị — tăng mã quyền, phải sửa
  `@PreAuthorize` và FE).

**Đề xuất:** A. Không đổi role. Người được uỷ quyền có thể dùng delegation (ORGANIZATION).

### 4.3. Ai được tạo curriculum?

| Phương án | Quyền | Ghi chú |
|---|---|---|
| A | `subject.manage` (hiện có) | Không thêm mã; gộp quyền học vụ |
| B | `curriculum.manage` (mới, ORGANIZATION) | Tách bạch, rõ nghĩa |
| C | `curriculum.manage` cho DEPARTMENT | Không khuyến nghị (danh mục chung) |

**Đề xuất:** B nếu người dùng chấp nhận thêm 1 mã; nếu không, A.

### 4.4. Ai được gán môn vào lớp?

| Phương án | Quyền | Ghi chú |
|---|---|---|
| A | `class.edit` (hiện có, ORGANIZATION) | Đơn giản, dùng luôn quyền sửa lớp |
| B | `class.subject.manage` (mới) | Tách người sửa thông tin lớp và người phân bổ môn |

**Đề xuất:** A cho Phase 1; cân nhắc B khi có nhiều vai trò học vụ.

### 4.5. Ai được quản lý chuyên môn giáo viên?

| Phương án | Quyền | Scope | Ghi chú |
|---|---|---|---|
| A | `employee.edit` (hiện có) | ORGANIZATION + DEPARTMENT | Trưởng phòng quản lý giáo viên phòng mình |
| B | `teacher.expertise.manage` (mới) | ORGANIZATION + DEPARTMENT | Tách quyền sửa hồ sơ và chuyên môn |

**Đề xuất:** A. Lưu ý `employee.edit` có `moduleCode = null` nên không bị chặn theo module;
nếu muốn chặn theo STUDENT_MANAGEMENT, phải thêm kiểm tra riêng (đề xuất, không bắt buộc).

### 4.6. Có cần duyệt chuyên môn không; ai duyệt?

| Phương án | Luồng | Quyền |
|---|---|---|
| A. Không duyệt | Gán là có hiệu lực | `employee.edit` |
| B. Trưởng phòng duyệt | `PENDING → APPROVED` | `teacher.expertise.approve` scope DEPARTMENT + là trưởng phòng giáo viên |
| C. Giáo vụ/Owner duyệt | `PENDING → APPROVED` | `teacher.expertise.approve` scope ORGANIZATION |

**Đề xuất:** A cho Phase 1 (đơn giản, khớp code hiện tại); thiết kế sẵn trạng thái `PENDING`
để bật B/C sau mà không đổi schema.

**NEEDS_USER_DECISION (D-06a).**

### 4.7. Ai được xem lớp–môn và giáo viên–môn?

| Dữ liệu | Quyền đọc | Scope |
|---|---|---|
| Môn của lớp | `class.view` (+ `subject.view` để hiển thị tên môn) | ORGANIZATION + DEPARTMENT cho `class.view` |
| Curriculum | `subject.view` (A) hoặc `curriculum.view` (B) | ORGANIZATION |
| Chuyên môn giáo viên | `employee.view` | ORGANIZATION + DEPARTMENT |
| Danh sách assignable theo môn | `class.assign_teacher` / `class.teacher.reassign` | ORGANIZATION |

Ghi chú: `class.view` cho phép DEPARTMENT nhưng People lọc dữ liệu theo phòng ban của người
tạo/lớp (xem `SchoolClassService.requireClassInScope`). API môn của lớp phải áp dụng cùng bộ lọc.

---

## 5. Ma trận chức năng × vai trò mẫu

Ký hiệu: ✅ được phép · ❌ không · ◐ chỉ trong phòng ban · ⚙ cần thêm mã quyền (đề xuất).

| Chức năng | Owner / Org Owner | Giáo vụ (position ORGANIZATION, ACADEMIC_MANAGEMENT) | Trưởng phòng đào tạo (position DEPARTMENT, HR_MANAGEMENT) | Giáo viên | Nhân viên (STAFF) |
|---|---|---|---|---|---|
| Xem môn | ✅ | ✅ `subject.view` | ❌ (scope) | ❌ trừ khi có `subject.view` cấp tổ chức | ◐ nếu được gán |
| Tạo/sửa/ngừng môn | ✅ | ✅ `subject.manage` | ❌ | ❌ | ❌ |
| Xem curriculum | ✅ | ✅ `subject.view` hoặc ⚙`curriculum.view` | ❌ hoặc ⚙ nếu mở DEPARTMENT | ❌ | ❌ |
| Tạo/sửa curriculum | ✅ | ✅ `subject.manage` hoặc ⚙`curriculum.manage` | ❌ | ❌ | ❌ |
| Áp curriculum / gán môn cho lớp | ✅ | ✅ `class.edit` (+ curriculum) | ❌ (class.edit ORG) | ❌ | ❌ |
| Xem lớp của phòng | ✅ | ✅ `class.view` | ◐ `class.view` | ◐ `class.self_view` (lớp mình dạy) | ◐ nếu được gán |
| Gán giáo viên cho lớp | ✅ | ✅ `class.assign_teacher` | ❌ | ❌ | ❌ |
| Gán chuyên môn/môn cho giáo viên | ✅ | ✅ `employee.edit` (ORG) | ◐ `employee.edit` (DEPT) | ❌ | ◐ nếu được gán |
| Duyệt chuyên môn (nếu bật) | ✅ | ⚙`teacher.expertise.approve` | ⚙ + là trưởng phòng giáo viên | ❌ | ❌ |
| Xem nhật ký thay đổi môn/curriculum | ✅ `org.audit.view` | ✅ nếu được gán | ❌ | ❌ | ❌ |

Lưu ý:

- "Giáo vụ" ở đây là **chức danh do người dùng cấu hình**, không phải role hệ thống mới.
  Tài liệu không tạo role; chỉ ánh xạ quyền.
- Giáo viên có `class.self_view`/`schedule.self_view`; không có quyền quản lý môn.
- Trưởng phòng chỉ quản lý chuyên môn nhờ `employee.edit` scope DEPARTMENT; **không** quản lý
  danh mục môn nếu giữ ORGANIZATION-only.

### 5.1. Ví dụ cấu hình cụ thể (minh hoạ, không phải dữ liệu có sẵn)

| Chức danh mẫu | `scope` | `profile_type` | Quyền/bundle gán | Kết quả hiệu lực |
|---|---|---|---|---|
| `Giáo vụ đào tạo` | ORGANIZATION | GENERAL | bundle `ACADEMIC_MANAGEMENT` | Quản lý học sinh/lớp + `subject.view/manage`; tạo curriculum (nếu dùng fallback `subject.manage`); áp curriculum nhờ `class.edit` |
| `Trưởng phòng đào tạo` | DEPARTMENT | GENERAL | bundle `HR_MANAGEMENT` + `class.view` | `employee.view/edit` trong phòng; xem lớp phòng mình; **không** tạo/sửa môn |
| `Giáo viên` | DEPARTMENT | TEACHER | `class.self_view`, `schedule.self_view` | Chỉ xem lớp/lịch của mình; không quản lý môn |
| `Tổng quản lý được uỷ quyền` | ORGANIZATION | GENERAL | delegation `subject.manage` (30 ngày) | Dùng được `subject.manage` đến hết hạn, sau đó 403 |

Ví dụ kiểm tra: user giữ `Giáo vụ đào tạo` gọi `POST /api/subjects` → 201; user chỉ giữ
`Trưởng phòng đào tạo` gọi cùng API → 403 `FORBIDDEN` (vì `subject.manage` ORGANIZATION-only).

---

## 6. Delegation và General Manager

- Uỷ quyền hiện chỉ hỗ trợ **ORGANIZATION-scope** (`DELEGATION_SCOPE_NOT_SUPPORTED` 2411).
- Delegate phải là tổng quản lý được bổ nhiệm (`DELEGATE_NOT_GENERAL_MANAGER` 2404).
- Người được uỷ quyền `subject.manage` có thể tạo/sửa môn trong thời hạn uỷ quyền; hết hạn quyền
  tự mất (`EffectivePermissionsService`).
- Không cần cơ chế mới cho Phase 1.

---

## 7. Module guard

| Hành động | Guard đề xuất | Hiện trạng |
|---|---|---|
| Xem/tạo/sửa môn | `STUDENT_MANAGEMENT` | Chưa có (D-10) |
| Xem/tạo/sửa curriculum | `STUDENT_MANAGEMENT` | Chưa có (bảng mới) |
| Gán môn cho lớp | `STUDENT_MANAGEMENT` | Lớp đã có |
| Chuyên môn giáo viên | Không guard (module null) | Đã có |

Nếu tổ chức tắt `STUDENT_MANAGEMENT`, mọi API môn/curriculum trả `400 MODULE_NOT_ENABLED`
(2106) như Student/Class. Đây là thay đổi hành vi — cần chốt D-10 trước khi code.

---

## 8. Những điều tài liệu này **không** làm

- Không sửa `PermissionCatalog`, `BUNDLES`, `DefaultPositionSeeder`.
- Không thêm role mới (`curriculum_manager`, `academic_staff`…).
- Không đổi `allowedScopes` của `subject.view/manage`.
- Không cấp quyền cho bất kỳ tài khoản thật nào.
- Không tạo migration quyền.

Mọi thay đổi quyền phải do người dùng thực hiện sau khi chốt các mục `NEEDS_USER_DECISION`.

---

## 9. Acceptance Criteria (cho phần quyền)

- AC-RBAC-01: Người chỉ có `subject.view` không gọi được POST/PUT/PATCH môn (403).
- AC-RBAC-02: Trưởng phòng DEPARTMENT không dùng được `subject.manage` khi giữ ORGANIZATION-only.
- AC-RBAC-03: OWNER luôn có mọi quyền mới (nếu thêm mã) nhờ cơ chế role-toàn-catalog.
- AC-RBAC-04: Người được uỷ quyền `subject.manage` dùng được đến hết hạn uỷ quyền.
- AC-RBAC-05: API chuyên môn lọc theo phòng ban khi scope DEPARTMENT.
- AC-RBAC-06: Tắt module `STUDENT_MANAGEMENT` (nếu áp D-10) chặn môn/curriculum với
  `MODULE_NOT_ENABLED`.

---

## 10. Câu hỏi mở

1. D-05: giữ ORGANIZATION-only hay mở DEPARTMENT cho `subject.view/manage`?
2. Có thêm `curriculum.view/manage` hay dùng lại `subject.*`?
3. Có thêm `class.subject.manage` hay dùng `class.edit`?
4. Có thêm `teacher.expertise.*` hay dùng `employee.edit`?
5. D-06a: có duyệt chuyên môn không; ai duyệt?
6. D-10: có áp module guard cho Subject không?
7. Có cần quyền riêng để **ngừng** môn đang được dạy (tách khỏi `subject.manage`)?
