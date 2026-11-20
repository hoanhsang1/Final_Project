# Phase 1 — Role & Permission Matrix (dùng cơ chế RBAC hiện có)

> Tài liệu thiết kế. **Tài liệu không thay đổi** catalog quyền, role, bundle hay dữ liệu phân quyền
> thật; người dùng tự thêm mã khi triển khai. Các mã "Đã có" trích từ
> `backend/IdentityService/src/main/java/com/mems/service/PermissionCatalog.java` tại HEAD `cdd03b8`.
> Trạng thái quyết định: `D-01`…`D-15` **đã chốt**. Liên quan trực tiếp:
> `D-05` (Giáo vụ quản lý môn, ORGANIZATION), `D-06`/`D-06a` (chuyên môn theo ID; **không duyệt**
> ở Phase 1), `D-10` (module guard `STUDENT_MANAGEMENT`), `D-14` (tạo riêng
> `curriculum.view`/`curriculum.manage`, cấp qua chức danh Giáo vụ, ORGANIZATION).

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
  hiện **chưa** kiểm module — D-10 đã chốt bổ sung guard.

---

## 3. Quyền mới theo D-14 (người dùng tự thêm vào catalog)

> Tài liệu **không** tự thêm vào `PermissionCatalog`, seed, migration hay role. Bảng dưới là hợp
> đồng quyền đã chốt; người dùng tự cập nhật Identity + People theo `implementation-roadmap.md`.

| Mã | Module | Scope | Ý nghĩa | Trạng thái |
|---|---|---|---|---|
| `curriculum.view` | STUDENT_MANAGEMENT | ORGANIZATION | Xem chương trình đào tạo | **Chốt (D-14)** — thêm vào catalog |
| `curriculum.manage` | STUDENT_MANAGEMENT | ORGANIZATION | Tạo/sửa/ngừng chương trình, gán môn | **Chốt (D-14)** — thêm vào catalog |
| `teacher.expertise.manage` | — (null) | ORGANIZATION + DEPARTMENT | Gán/thu hồi môn cho giáo viên | Đề xuất kỹ thuật; Phase 1 dùng `employee.edit` |
| `teacher.expertise.approve` | — (null) | ORGANIZATION + DEPARTMENT | Duyệt/từ chối chuyên môn | **OUT_OF_SCOPE Phase 1** (D-06a = không duyệt) |
| `class.subject.manage` | STUDENT_MANAGEMENT | ORGANIZATION | Gán/bỏ môn khỏi lớp | Đề xuất kỹ thuật; Phase 1 dùng `class.edit` |

Bundle:

- `ACADEMIC_MANAGEMENT`: thêm `curriculum.view/manage` (D-14).
- `teacher.expertise.manage`/`class.subject.manage` chỉ là đề xuất, **không** thuộc Phase 1.
- `teacher.expertise.approve` **không** được tạo ở Phase 1 (D-06a).

Cấp quyền cho Giáo vụ:

- Gán `subject.view/manage` và `curriculum.view/manage` vào **chức danh Giáo vụ** (position-based),
  scope **ORGANIZATION**.
- **Không** tự cấp cho mọi nhân viên, không tạo role hệ thống mới, không đổi `allowedScopes`.

Quyền dùng cho thao tác khác ở Phase 1 (tối thiểu, không thêm mã):

- Áp curriculum / gán–bỏ môn khỏi lớp: `class.edit`.
- Đổi môn chính của lớp + xem lịch sử đổi môn: `class.edit` (ghi) / `class.view` (đọc) — **không
  thêm mã mới** (D-08/D-15).
- Gán chuyên môn giáo viên: `employee.edit`; mọi gán có hiệu lực ngay (D-06a = không duyệt).
- Danh sách giáo viên khả dụng theo môn: `class.assign_teacher`/`class.teacher.reassign`.

---

## 4. Trả lời 7 câu hỏi quyền

### 4.1. Ai được xem danh sách môn?

**Chốt:** `subject.view` với scope **ORGANIZATION** (giữ nguyên). Giáo vụ/Owner xem toàn bộ môn
của tổ chức. Trưởng phòng (chức danh DEPARTMENT) không xem danh mục môn trừ khi được cấp một
chức danh ORGANIZATION; không mở `allowedScopes` sang DEPARTMENT ở Phase 1 (D-05).

### 4.2. Ai được tạo/sửa/ngừng môn?

**Chốt:** OWNER hoặc `subject.manage` (ORGANIZATION), thường gán cho chức danh **Giáo vụ**
(D-05). Không tách `subject.create/edit/deactivate`; không mở DEPARTMENT. Người được uỷ quyền
có thể dùng delegation (ORGANIZATION).

### 4.3. Ai được tạo curriculum?

**Chốt (D-14):** `curriculum.manage` (mới, ORGANIZATION) cho ghi; `curriculum.view` cho đọc.
Cấp cho chức danh Giáo vụ qua position-based. **Không** dùng fallback `subject.manage` — chỉ một
hợp đồng quyền duy nhất cho nhóm endpoint curriculum (khớp `api-contract.md` §3).

### 4.4. Ai được gán môn vào lớp?

**Chốt:** `class.edit` (hiện có, ORGANIZATION) cho Phase 1. `class.subject.manage` chỉ là đề xuất
kỹ thuật cho giai đoạn sau; không dùng ở Phase 1.

### 4.5. Ai được quản lý chuyên môn giáo viên?

**Chốt:** `employee.edit` (ORGANIZATION + DEPARTMENT). Trưởng phòng quản lý chuyên môn giáo viên
phòng mình; Giáo vụ/HR quản lý toàn tổ chức. `teacher.expertise.manage` là đề xuất kỹ thuật,
không thuộc Phase 1. Lưu ý `employee.edit` có `moduleCode = null` nên không bị chặn theo module.

### 4.6. Có cần duyệt chuyên môn không; ai duyệt?

**Chốt (D-06a): KHÔNG duyệt ở Phase 1.** Mọi dòng `teacher_subject` mới có `status = APPROVED`
ngay; chỉ chuyển `REVOKED` khi thu hồi. Không có `PENDING`, **không có** quan hệ
`teacher.expertise.approve`, không có API approve/reject. Cột `status` giữ lại cho Phase 2.

### 4.7. Ai được xem lớp–môn và giáo viên–môn?

| Dữ liệu | Quyền đọc | Scope |
|---|---|---|
| Môn của lớp | `class.view` (+ `subject.view` để hiển thị tên môn) | ORGANIZATION + DEPARTMENT cho `class.view` |
| Curriculum | `curriculum.view` | ORGANIZATION |
| Chuyên môn giáo viên | `employee.view` | ORGANIZATION + DEPARTMENT |
| Danh sách assignable theo môn | `class.assign_teacher` / `class.teacher.reassign` | ORGANIZATION |

Ghi chú: `class.view` cho phép DEPARTMENT nhưng People lọc dữ liệu theo phòng ban của người
tạo/lớp (xem `SchoolClassService.requireClassInScope`). API môn của lớp phải áp dụng cùng bộ lọc.

### 4.8. Ai được đổi môn chính của lớp (D-08/D-15)?

**Chốt: `class.edit` — không thêm quyền mới.** Đổi môn chính là thao tác ghi trên lớp, cùng quyền
với áp curriculum/gán môn; không tạo `class.subject.primary` hay tương tự ở Phase 1.

- Ghi (`PUT /classes/{id}/subjects/primary`, `PUT /classes/{id}` đổi `subjectId`): `class.edit`
  (ORGANIZATION) + module `STUDENT_MANAGEMENT`.
- Đọc lịch sử (`GET /classes/{id}/subject-history`): `class.view`.
- Phạm vi phòng ban: giữ đúng `requireClassInScope` như các thao tác lớp khác. Lưu ý `class.edit`
  là ORGANIZATION-scope nên chức danh DEPARTMENT **không** dùng được (trừ khi người đó còn giữ một
  chức danh ORGANIZATION); khi đã qua được cổng quyền, service vẫn lọc lớp theo phòng ban.
- **Không** có quyền riêng cho sửa history: Phase 1 không có API đó (`FORBIDDEN`/404 nếu cố gọi).
- Xoá lớp (`DELETE /classes/{id}`) dùng `class.delete` (ORGANIZATION). Lớp đã có
  `class_subject_history` → 409 `CONFLICT` (không phải vấn đề quyền); lịch sử không bị xoá.
- Lớp `DA_KET_THUC/DA_HUY/CLOSED`: 409 `CLASS_NOT_EDITABLE` (không phải vấn đề quyền).

---

## 5. Ma trận chức năng × vai trò mẫu

Ký hiệu: ✅ được phép · ❌ không · ◐ chỉ trong phòng ban.

| Chức năng | Owner / Org Owner | Giáo vụ (position ORGANIZATION, ACADEMIC_MANAGEMENT) | Trưởng phòng đào tạo (position DEPARTMENT, HR_MANAGEMENT) | Giáo viên | Nhân viên (STAFF) |
|---|---|---|---|---|---|
| Xem môn | ✅ | ✅ `subject.view` | ❌ (scope) | ❌ trừ khi có `subject.view` cấp tổ chức | ◐ nếu được gán |
| Tạo/sửa/ngừng môn | ✅ | ✅ `subject.manage` | ❌ | ❌ | ❌ |
| Xem curriculum | ✅ | ✅ `curriculum.view` | ❌ | ❌ | ❌ |
| Tạo/sửa curriculum | ✅ | ✅ `curriculum.manage` | ❌ | ❌ | ❌ |
| Áp curriculum / gán môn cho lớp | ✅ | ✅ `class.edit` | ❌ (class.edit ORG) | ❌ | ❌ |
| Đổi môn chính của lớp (kể cả `DANG_DIEN_RA`) | ✅ | ✅ `class.edit` | ❌ (class.edit ORGANIZATION) | ❌ | ❌ |
| Xem lịch sử đổi môn chính | ✅ | ✅ `class.view` | ◐ `class.view` | ❌ | ❌ |
| Sửa/xoá lịch sử đổi môn | ❌ (không có API) | ❌ | ❌ | ❌ | ❌ |
| Xem lớp của phòng | ✅ | ✅ `class.view` | ◐ `class.view` | ◐ `class.self_view` (lớp mình dạy) | ◐ nếu được gán |
| Gán giáo viên cho lớp | ✅ | ✅ `class.assign_teacher` | ❌ | ❌ | ❌ |
| Gán chuyên môn/môn cho giáo viên | ✅ | ✅ `employee.edit` (ORG) | ◐ `employee.edit` (DEPT) | ❌ | ◐ nếu được gán |
| Duyệt chuyên môn — **OUT_OF_SCOPE Phase 1** (D-06a) | — | — | — | — | — |
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
| `Giáo vụ đào tạo` | ORGANIZATION | GENERAL | bundle `ACADEMIC_MANAGEMENT` + `curriculum.view/manage` + `subject.view/manage` | Quản lý học sinh/lớp, môn và curriculum; áp curriculum nhờ `class.edit` |
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
| Xem/tạo/sửa môn | `STUDENT_MANAGEMENT` | **Chốt (D-10)** — controller phải gọi `moduleGuard.requireModule(...)` |
| Xem/tạo/sửa curriculum | `STUDENT_MANAGEMENT` | **Chốt (D-10)** — bảng mới, thêm guard khi triển khai |
| Gán môn cho lớp | `STUDENT_MANAGEMENT` | Lớp đã có |
| Đổi môn chính / xem lịch sử đổi môn | `STUDENT_MANAGEMENT` | Cùng guard với lớp; thêm khi triển khai endpoint mới |
| Chuyên môn giáo viên | Không guard (module null) | Đã có |

Nếu tổ chức tắt `STUDENT_MANAGEMENT`, mọi API môn/curriculum trả `400 MODULE_NOT_ENABLED`
(2106) như Student/Class (D-10 đã chốt).

---

## 8. Những điều tài liệu này **không** làm

- Không sửa `PermissionCatalog`, `BUNDLES`, `DefaultPositionSeeder`.
- Không thêm role mới (`curriculum_manager`, `academic_staff`…).
- Không đổi `allowedScopes` của `subject.view/manage`.
- Không cấp quyền cho bất kỳ tài khoản thật nào.
- Không tạo migration quyền.

Người dùng tự thêm `curriculum.view`/`curriculum.manage` vào catalog và gán vào chức danh Giáo vụ
khi triển khai (D-14); tài liệu chỉ mô tả hợp đồng.

---

## 9. Acceptance Criteria (cho phần quyền)

- AC-RBAC-01: Người chỉ có `subject.view` không gọi được POST/PUT/PATCH môn (403).
- AC-RBAC-02: Trưởng phòng DEPARTMENT không dùng được `subject.manage` khi giữ ORGANIZATION-only.
- AC-RBAC-03: OWNER luôn có mọi quyền mới (nếu thêm mã) nhờ cơ chế role-toàn-catalog.
- AC-RBAC-04: Người được uỷ quyền `subject.manage` dùng được đến hết hạn uỷ quyền.
- AC-RBAC-05: API chuyên môn lọc theo phòng ban khi scope DEPARTMENT.
- AC-RBAC-06: Tắt module `STUDENT_MANAGEMENT` chặn môn/curriculum với `MODULE_NOT_ENABLED` (D-10).
- AC-RBAC-07: Người chỉ có `subject.manage` **không** gọi được curriculum (403) — quyền tách biệt
  (D-14); người có `curriculum.manage` qua chức danh Giáo vụ gọi được.
- AC-RBAC-08: Gán `curriculum.manage` cho chức danh DEPARTMENT không tạo hiệu lực (ORGANIZATION-only).
- AC-RBAC-09: Không tồn tại quyền `teacher.expertise.approve` ở Phase 1; gán chuyên môn có hiệu
  lực ngay không cần duyệt (D-06a).
- AC-RBAC-10: Đổi môn chính không cần quyền mới: người có `class.edit` gọi được, người chỉ có
  `class.view`/`subject.view` nhận 403 (D-08/D-15).
- AC-RBAC-11: `GET /classes/{id}/subject-history` cần `class.view`; không có endpoint sửa/xoá
  history cho bất kỳ vai trò nào (kể cả OWNER).

---

## 10. Quyết định đã chốt & câu hỏi kỹ thuật còn lại

`D-05`, `D-06`, `D-06a`, `D-08`, `D-10`, `D-14`, `D-15` **đã chốt**. Các điểm kỹ thuật không thay
đổi quyết định:

1. Mã lỗi khi gán `curriculum.manage` cho chức danh DEPARTMENT: dùng `FORBIDDEN` hiện có hay mã
   riêng? (đề xuất dùng `FORBIDDEN`, không thêm mã).
2. Có bổ sung `curriculum.view/manage` vào bundle `ACADEMIC_MANAGEMENT` hay chỉ gán theo chức danh?
   (đề xuất: cả hai — bundle cho tiện, chức danh để kiểm soát).
3. Có cần quyền riêng để **ngừng** môn đang được dạy (tách khỏi `subject.manage`)? (đề xuất: không).
