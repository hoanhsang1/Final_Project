# PHASE 1 — THIẾT KẾ SECURITY & RBAC (MEMS)

> Đầu vào: `docs/audit/PHASE_1_SECURITY_RBAC_CURRENT_STATE.md`.
> Tài liệu này chốt **mô hình đích** và **cách triển khai tăng dần**, tương thích dữ liệu/token hiện có. Mọi thay đổi hành vi có ảnh hưởng người dùng thật được đánh dấu **[Cần người dùng quyết định]**.
> Trạng thái từng mã sẽ được ghi ở `docs/audit/PHASE_1_SECURITY_RBAC_FINAL.md` sau khi test.

---

## 1. Nguyên tắc thiết kế

1. **Quyền quyết định truy cập, không phải role.** Role chỉ còn hai vai trò kỹ thuật: (a) phân loại tài khoản nền tảng/tổ chức/tự phục vụ, (b) định tuyến nguồn quyền lúc đăng nhập. Mọi kiểm tra nghiệp vụ dùng `permission + scope + trạng thái thành viên + module`.
2. **Mỗi dữ liệu có đúng một chủ sở hữu.** Identity sở hữu danh tính/đăng nhập; People sở hữu thành viên/chức danh/gán/ủy quyền. Service khác không ghi chéo.
3. **Fail-closed.** Không xác minh được quyền ⇒ từ chối thao tác cần quyền; không bao giờ cấp toàn quyền dự phòng. Xác thực danh tính (đăng nhập) vẫn có thể thành công với bộ quyền rỗng + cờ "chưa xác minh".
4. **Quyền hiệu lực phải phản ánh dữ liệu hiện tại ở nơi ra quyết định.** People là nơi ra quyết định cho tài nguyên People ⇒ People tự tính lại quyền, không tin token cho phần chức danh/ủy quyền.
5. **Không phá vỡ dữ liệu cũ.** Không xoá role cũ, không xoá lịch sử assignment, không đổi role của user production; mọi thay đổi schema là file migration, chỉ chạy local/test.
6. **Backward compatible với JWT hiện tại.** Không đổi thuật toán/khoá; chỉ thêm claim tùy chọn.

---

## 2. Mô hình role chuẩn (AUTH-06)

### 2.1 Bảng phân loại chuẩn

| Lớp | Mã | Nguồn quyền | Có được gán qua AccountsPage? | Trạng thái |
|---|---|---|---|---|
| Platform | `SUPER_ADMIN` | Toàn catalog (Identity, không org) | Không (đã chặn) | Canonical |
| Organization owner | `OWNER` | Toàn catalog (Identity) | Không | **Canonical** |
| Organization owner alias | `ORG_OWNER` | Như `OWNER` | Không | **Alias tương thích** (dữ liệu cũ + đăng ký cũ) |
| Employee access class | `MANAGER`, `STAFF` | People (assignment × position) | Chỉ đổi trong cùng lớp | Canonical **nhưng không mang quyền** |
| Self-service | `STUDENT`, `TEACHER` | `role_permission` + SELF cố định | Có (tạo mới), không đổi chéo lớp | `STUDENT` canonical; `TEACHER` legacy |
| Legacy | `ORG_ADMIN`, `ACADEMIC_STAFF`, `FACILITY_STAFF` | `role_permission` cũ | **Không** | Giữ dữ liệu, không cấp mới |

### 2.2 Trả lời trực tiếp các câu hỏi

**a) `MANAGER`/`STAFF` còn cần không?**
Có, nhưng **chỉ là "access class"**: chúng cho `AccessProfileService` biết phải hỏi People thay vì đọc `role_permission`, và cho token biết người dùng thuộc nhóm nhân sự. Chúng **không** được dùng để cấp/thu quyền nghiệp vụ. Mọi chỗ đang dùng `hasRole('MANAGER')`, `"STAFF".equals(...)` để quyết định nghiệp vụ sẽ bị thay bằng kiểm tra quyền (RBAC-06). Lý do giữ: bỏ hẳn sẽ phải migrate `account_role` + `department_member` + token converter + FE type, rủi ro cao mà không tăng bảo mật (vì quyền đã đến từ position).

**b) `TEACHER` là role Identity hay `profile_type`/position?**
- **Chuẩn mới:** `TEACHER` là `position.profile_type` + chức danh "Giáo viên". Giáo viên mới = tài khoản `STAFF` + assignment vào chức danh `TEACHER`.
- `TEACHER` role Identity chỉ còn để đọc dữ liệu cũ và cấp SELF cho tài khoản giáo viên kiểu cũ. Không cấp mới qua AccountsPage.
- Quyền SELF (`student.self_view`, `class.self_view`, `schedule.self_view`) phải đến từ **position** cho nhân sự mới; role `TEACHER` chỉ là đường tương thích.

**c) `ORG_OWNER` có gộp vào `OWNER` không?**
- **Canonical = `OWNER`.** `ORG_OWNER` là alias tương thích.
- `AccessProfileService`, `SecurityConfig` (cả 4 service), FE `isOwner()` tiếp tục chấp nhận cả hai — không phá token/dữ liệu cũ.
- Đăng ký tổ chức mới gán `OWNER`; nếu DB cũ thiếu `OWNER` thì fallback `ORG_OWNER` (không bao giờ fail vì thiếu role).
- Không chuyển đổi hàng loạt `ORG_OWNER → OWNER` trong dữ liệu production (ngoài phạm vi, cần migration riêng có kiểm soát).

**d) `ORG_ADMIN`/`ACADEMIC_STAFF`/`FACILITY_STAFF` còn ở đâu?**
Chỉ còn trong bảng `role` và `role_permission` cũ để tra cứu lịch sử. Không seed lại, không gán mới, không xuất hiện trong dropdown. Nếu một tài khoản cũ đang giữ các role này, đăng nhập vẫn hoạt động theo `role_permission` hiện có (không đổi quyền đột ngột), nhưng UI/BE sẽ chặn việc **gán thêm**. **[Cần người dùng quyết định]** có chuyển các tài khoản này sang mô hình position hay không.

**e) Role nào là "legacy compatibility"?**
`ORG_OWNER` (alias), `TEACHER` (role), `ORG_ADMIN`, `ACADEMIC_STAFF`, `FACILITY_STAFF`.

### 2.3 Catalog role & kiểm tra khởi động

Thêm `com.mems.service.RoleCatalog` (Identity) làm nguồn duy nhất:

```text
REQUIRED_ORGANIZATION = OWNER, MANAGER, STAFF, STUDENT
REQUIRED_PLATFORM     = SUPER_ADMIN
COMPAT_ALIASES        = ORG_OWNER, TEACHER
LEGACY                = ORG_ADMIN, ACADEMIC_STAFF, FACILITY_STAFF
EMPLOYEE_CLASS        = MANAGER, STAFF
SELF_CLASS            = STUDENT, TEACHER
```

- `IdentityDataInitializer` seed: `SUPER_ADMIN`, `OWNER`, `MANAGER`, `STAFF`, `STUDENT`, `TEACHER` + **`ORG_OWNER` alias** (chỉ insert nếu chưa có, không đổi quyền của ai).
- Thêm `RoleCatalogValidator` chạy **sau** initializer (`@Order`): nếu thiếu role bắt buộc ⇒ ném `IllegalStateException` **fail-fast** khi khởi động, thay vì lỗi mơ hồ lúc đăng ký/đăng nhập.
- `OrganizationRegistrationService`: tìm `OWNER`, fallback `ORG_OWNER`; không còn phụ thuộc duy nhất vào `ORG_OWNER`.
- `AccountService`/`AccountProvisioningService`: dùng `RoleCatalog` để từ chối role legacy/chưa tồn tại với thông điệp rõ.

### 2.4 Đồng bộ BE ↔ FE

- BE: `GET /api/v1/roles`? **Không thêm endpoint mới** (ngoài phạm vi). FE dùng danh sách tĩnh đã sửa cho khớp catalog.
- FE `RoleCode`: giữ union hiện tại (đọc dữ liệu cũ), nhưng thêm comment phân loại.
- `AccountsPage.ASSIGNABLE_ROLES` → `['MANAGER','STAFF','STUDENT']` (bỏ `OWNER`, `ACADEMIC_STAFF`), và dropdown đổi role chỉ hiện role **cùng lớp** với role hiện tại.
- `EmployeeCreateDrawer`: giữ nhãn MANAGER/STAFF (label thành viên), ghi chú rõ "không cấp quyền".

---

## 3. Nguồn sự thật & luồng nghiệp vụ (AUTH-10)

### 3.1 Ma trận nguồn sự thật

| Dữ liệu | Chủ sở hữu (ghi) | Người đọc | Ghi chú thiết kế |
|---|---|---|---|
| `account`, `account_role` | Identity | tất cả qua JWT | Role chỉ là access class |
| `department_member` | People | Identity (qua internal authorization) | `role` là nhãn, không cấp quyền |
| `position`, `assignment` | People | Identity (tổng hợp), People | Nguồn quyền chính |
| Quyền hiệu lực | People tính; Identity sao chép vào JWT | People tự tính lại; service khác dùng JWT | Xem RBAC-05 |
| `delegation` | People | People | Chỉ ORGANIZATION |
| Catalog quyền | Identity | People qua internal API | |
| Module bật | Identity (org) + People (dept) | cả hai | |

**Quy tắc:** AccountsPage/Identity **không** được tạo/đổi membership, position, assignment. People **không** được đổi `account_role`. Nếu cần đổi quyền nhân sự, thao tác trên position/assignment ở People.

### 3.2 Luồng chuẩn

| Luồng | Ai được phép | Cơ chế |
|---|---|---|
| **Đăng ký tổ chức** | Công khai | Identity tạo org PENDING + account PENDING + role `OWNER` (fallback `ORG_OWNER`) |
| **Duyệt tổ chức** | SUPER_ADMIN | Identity `organizations/**` |
| **Owner quản trị org** | OWNER | Identity full catalog; People policy Owner |
| **Bổ nhiệm chức danh (kể cả trưởng phòng/GM)** | Người có `employee.assign_position` + scope + module; ORGANIZATION position chỉ Owner | People `MembershipPolicy` + `PositionService` |
| **HR gán quyền trong phòng** | `employee.assign_position` ở phòng đó, chỉ gán quyền ⊆ quyền mình | People `MembershipPolicy` subset check |
| **Chuyển phòng** | Người có `employee.transfer`/`approve_transfer`; 4 bước policy | People `TransferService` |
| **Nghỉ việc** | `employee.resign`; duyệt theo escalation | People `ResignationApprovalPolicy` |
| **Khóa tài khoản** | SUPER_ADMIN (AccountsPage) hoặc People offboard (gọi internal disable) | Identity `updateStatus` + revoke refresh; People `offboard` |
| **Đổi role** | **Không qua AccountsPage cho role nghiệp vụ** | Xem 3.3 |

### 3.3 Quyết định với `AccountService.updateRole` / `createAccount`

Chọn hướng **"SUPER_ADMIN-only + không đổi chéo lớp quyền"**, không xoá endpoint (giữ tương thích UI cũ):

- `createAccount`: từ chối `SUPER_ADMIN` (đã có), `OWNER`, `ORG_OWNER`, và toàn bộ role legacy. Cho phép `MANAGER`, `STAFF`, `STUDENT`, `TEACHER`. Lý do: tạo tài khoản MANAGER/STAFF không cấp quyền (People resolve rỗng khi chưa có membership); tạo STUDENT/TEACHER chỉ cấp SELF. Không thể tạo "Owner ma" không membership.
- `updateRole`:
  - Từ chối `SUPER_ADMIN`, `OWNER`, `ORG_OWNER`, legacy.
  - Chỉ cho đổi **trong cùng lớp**: `EMPLOYEE_CLASS → EMPLOYEE_CLASS`, `SELF_CLASS → SELF_CLASS`.
  - **Thu hồi toàn bộ refresh token** của account sau khi đổi.
  - Ghi audit? Identity chưa có audit nội bộ; ghi log có cấu trúc (không chứa bí mật).
- `updateStatus(disabled/locked)`: thu hồi refresh token (hiện chỉ `locked` không thu hồi → sửa).
- FE: bỏ `OWNER`/`ACADEMIC_STAFF` khỏi dropdown; dialog đổi role lọc cùng lớp; thêm cảnh báo "role không cấp quyền, quyền do chức danh quyết định".

**[Cần người dùng quyết định]** Có muốn bỏ hẳn khả năng đổi role trên AccountsPage (read-only) không? Thiết kế hiện tại giữ thao tác relabel trong cùng lớp để không phá UI, nhưng không cho thay đổi quyền.

### 3.4 Kế hoạch migration (file-only, local/test)

Không cần migration bắt buộc cho AUTH-06/AUTH-10. Nếu triển khai trên DB cũ:
1. Chạy initializer (tự seed `OWNER`, `ORG_OWNER` alias nếu thiếu).
2. Validator chặn khởi động nếu thiếu role bắt buộc.
3. **Không** xoá role legacy, **không** đổi `account_role` của user thật.
4. (Tùy chọn, cần duyệt) migration chuyển `ORG_OWNER → OWNER` **chỉ trên DB test**.

---

## 4. RBAC-06 — bỏ ràng buộc nghiệp vụ theo role

### 4.1 Bảng thay thế

| Vị trí | Hiện tại | Thay bằng |
|---|---|---|
| `MembershipPolicy.check` | `targetRole != STAFF ⇒ forbidden` | Bỏ. Giữ: `requirePermission("employee.assign_position", dept)`; ORGANIZATION position ⇒ Owner; quyền chức danh ⊆ quyền actor; module phòng bật; `targetRole` chỉ validate thuộc `{MANAGER,STAFF}` (nhãn) |
| `PositionController` list/permissions/bundles | `hasAnyRole('OWNER','MANAGER','STAFF')` | `hasRole('OWNER') or hasAuthority('position.view')` |
| `PositionService` | đã permission-based | Giữ nguyên |
| `MemberService` | đã permission-based + Policy | Giữ; không thêm role check |
| `ResignationApprovalPolicy` | đã permission/position-based | Giữ; không thêm role check |
| `TransferService` | step + permission | Giữ |
| `DefaultPositionSeeder` comment | "để MANAGER gán được" | Sửa comment: "để người có `employee.assign_position` gán được" |
| `EmployeeCreateDrawer` | role select bắt buộc | Giữ nhưng nhãn "vai trò thành viên", default STAFF, không dùng để ẩn/hiện quyền |

### 4.2 Giữ nguyên các chốt an ninh nền tảng

- SUPER_ADMIN không bao giờ là nhân sự tổ chức (AuthService đã chặn; provision không có orgId).
- OWNER có policy riêng (toàn catalog; chỉ Owner quản position ORGANIZATION, delegation, GM).
- STUDENT không vào chức năng HR: không có permission ⇒ mọi `@RequirePermission` chặn.
- Không tự nâng quyền: `MembershipPolicy` subset check + `PositionService.requireWithinOwnPermissions`.
- `protectOwner`: không reset mật khẩu/offboard Owner qua People.

### 4.3 Test matrix RBAC-06

| Case | Kỳ vọng |
|---|---|
| Người có `employee.assign_position`, target role MANAGER, position ⊆ quyền mình | Cho phép |
| Như trên, target role STAFF | Cho phép |
| Position ORGANIZATION, actor không Owner | 403 |
| Position có quyền ngoài module phòng | `PERMISSION_OUT_OF_MODULE` |
| Position có quyền actor không có | 403 |
| Actor thiếu `employee.assign_position` | 403 |
| Actor có `position.view` nhưng token role lạ (vd. STUDENT) | Đọc position được nếu có quyền; ghi vẫn chặn |
| Chỉ Owner gán position ORGANIZATION | 403 cho non-owner |

---

## 5. RBAC-05 — vòng đời quyền

### 5.1 So sánh phương án

| Tiêu chí | A. `authz_version` trong JWT | B. Quyền hiệu lực + invalidate (chọn) | C. Authorization service động |
|---|---|---|---|
| Bảo mật | Tốt nếu mọi service kiểm version | Tốt ở nơi tự tính (People); service khác giới hạn bởi TTL | Tốt nhất |
| Độ trễ thu hồi | Ngay khi service kiểm version | **Ngay ở People**; ≤ TTL token ở service khác | Ngay |
| Hiệu năng | 1 query/request/service | People: vài query/request; service khác: 0 | Round-trip mỗi request |
| Mở rộng | Cần bảng version dùng chung + đồng bộ | Tự nhiên theo service sở hữu dữ liệu | Nút thắt trung tâm |
| Phức tạp | Trung bình–cao (version propagation, migration) | **Thấp–trung bình** | Cao |
| Ảnh hưởng microservice | Mọi service phải sửa + truy vấn DB chéo | Chỉ Identity + People | Hạ tầng mới |
| Khi Identity/People lỗi | Không xác minh được ⇒ phải deny | People lỗi ⇒ deny (fail-closed) | Deny toàn hệ |
| Phù hợp MEMS | Không (không có DB dùng chung giữa service) | **Có** | Không (quá nặng cho đồ án) |

**Chọn B, phiên bản tăng dần:**

1. **People là PDP cho tài nguyên People.** `DelegatedAuthorityFilter` được mở rộng: với token role `MANAGER`/`STAFF`, **tính lại toàn bộ quyền hiệu lực từ DB** mỗi request (`EffectivePermissionsService.resolve`) và thay authorities/claim. Token chỉ còn là danh tính + gợi ý.
   - OWNER/ORG_OWNER/SUPER_ADMIN/STUDENT/TEACHER: giữ token (Owner policy do Identity; SELF do role_permission).
   - Kết quả: thu hồi assignment/position/module/delegation có hiệu lực **ngay** ở request kế tiếp tới People.
   - Fail-closed: nếu resolve lỗi ⇒ chỉ giữ `ROLE_*`, không quyền ⇒ 403.
2. **Identity: profile cache ngắn (30s) + invalidate** khi `updateRole`, `updateStatus(disabled/locked)`, `resetPassword`, provision/disable. Refresh luôn tính lại.
3. **Token TTL** giữ cấu hình 60–900s; hạ **mặc định code** xuống 300s để giới hạn cửa sổ cũ ở Schedule/Facility. Không sửa env đang chạy.
4. **Ghi rõ giới hạn:** Schedule/Facility vẫn dùng snapshot token ⇒ thu hồi tối đa 300s (mặc định mới). Đây là giới hạn tường minh, không phải fail-open.

### 5.2 10 kịch bản bắt buộc

| # | Kịch bản | Kỳ vọng |
|---|---|---|
| 1 | Đổi quyền position (bỏ `employee.edit`) | Request kế tiếp tới People: 403 dù token cũ còn `employee.edit` |
| 2 | Thu hồi assignment | Mất quyền ngay ở People |
| 3 | Gán assignment mới | Có quyền ngay ở People |
| 4 | Tắt module phòng ban | Quyền gắn module mất hiệu lực ngay |
| 5 | Thu hồi delegation | Mất phần ủy quyền, giữ phần position (DEL-03) |
| 6 | Đổi role STAFF → MANAGER | Không thay đổi quyền (cùng nguồn People) |
| 7 | Đổi role employee → STUDENT | Bị chặn bởi `updateRole` (chéo lớp) |
| 8 | Disable account | Refresh token bị thu hồi; access token còn hạn nhưng People không xác minh được membership ⇒ 403 |
| 9 | People/DB lỗi khi resolve | 403 (fail-closed), không fallback token |
| 10 | Owner đổi quyền | Token Owner không bị ảnh hưởng (full catalog theo policy) |

---

## 6. AUTH-11 — hành vi khi People không sẵn sàng

### 6.1 So sánh

| Phương án | Đăng nhập khi People sập | Rủi ro | Phù hợp |
|---|---|---|---|
| Giữ nguyên (hiện tại) | **Không** | Không dùng được hệ thống | Không |
| Fail-open (cấp toàn quyền) | Có | **Nghiêm trọng** | Cấm |
| Token chỉ danh tính, nạp quyền sau | Có | Cần mọi service chấp nhận quyền rỗng | Một phần |
| **Last-known-good cache + hạn cứng + cờ stale (chọn)** | Có | Quyền có thể cũ trong hạn cứng | **Có** |
| Authorization service độc lập | Có | Hạ tầng mới | Không |

### 6.2 Thiết kế chọn

- `PeopleAuthorizationClient` thêm cache `(orgId,userId) → AccessProfile` **last-known-good**:
  - TTL tươi: 60s (dùng bình thường, không đánh dấu stale).
  - Hạn cứng: 10 phút. Sau hạn cứng **không** dùng lại.
- Khi gọi People lỗi:
  1. Có bản ghi trong hạn cứng ⇒ trả bản ghi + `stale=true` + claim `permissionsStale=true`.
  2. Không có ⇒ trả profile **rỗng** (`permissions=∅`, `scopes=∅`, `delegated=∅`, `role` = role tài khoản) + `stale=true`. Đăng nhập/refresh vẫn thành công.
- Không bao giờ cấp toàn catalog ngoài OWNER/SUPER_ADMIN.
- JWT thêm claim `permissionsStale` (boolean, mặc định false).
- People vẫn kiểm tra thật: request MANAGER/STAFF tới People được tính lại từ DB, nên token rỗng không mở quyền.
- Schedule/Facility thấy quyền rỗng ⇒ 403 (fail-closed).
- FE: `Session.permissionsStale?: boolean`; hiển thị banner "Quyền truy cập chưa được xác minh đầy đủ, một số chức năng tạm ẩn" và tự gọi lại `/users/me/permissions` khi có mạng.
- Khi People trở lại: refresh/login kế tiếp nạp đầy đủ; có thể thêm `POST /users/me/permissions/reload`? **Không thêm** trong phase này (ngoài phạm vi) — dùng refresh token hiện có.

---

## 7. DEL-01 — audit khi thực sự dùng quyền ủy quyền

### 7.1 Nguyên tắc

Chỉ ghi `DELEGATION_PERMISSION_USED` khi **đồng thời**:
1. Request thành công (2xx).
2. Quyền được yêu cầu bởi handler/policy.
3. Quyền đó **chỉ** đến từ delegation (không có từ position).

### 7.2 Thiết kế

- Sau RBAC-05, filter đặt thêm attribute `POSITION_PERMISSIONS_ATTRIBUTE` (tập quyền từ chức danh) và `GRANTS_ATTRIBUTE` (delegation).
- Thêm annotation `@DelegatedAction(permission = "...", resourceType = "...")` cho các endpoint duyệt theo policy:
  - `ResignationController` approve/reject → `employee.approve_resignation`, `RESIGNATION_REQUEST`, resourceId = `requestId`.
  - `TransferController` approve/reject → `employee.approve_transfer`, `TRANSFER_STEP`, resourceId = `id`.
- `DelegationUsageInterceptor` đọc thêm annotation này; ghi audit với:
  `delegationId`, `permissionCode`, `action` (method + handler), `resourceType`, `resourceId`, `organizationId`, `timestamp`, `result=SUCCESS`, ngữ cảnh (`step` nếu có).
- Nhiều delegation cùng cấp một quyền: `activeDelegationGrants` chọn id đầu tiên theo thứ tự ổn định (`ORDER BY d.id`) — ghi rõ trong audit metadata `source=DELEGATED`.
- Revoke giữa request: quyền đã qua filter trước khi revoke; audit ghi delegationId đã dùng — chấp nhận, vì đó là nguồn tại thời điểm quyết định.
- Hết hạn: filter không cộng grant ⇒ không có audit (đúng).

---

## 8. DEL-03 — giữ quyền chức danh khi thu hồi ủy quyền

### 8.1 Thiết kế `EffectivePermissionsService.resolve`

```text
positionEffective = ∪ quyền position (lọc module + allowed scope)
positionScopes    = scope token theo từng quyền
grants            = activeDelegationGrants(org,user)   // permission → delegationId
delegatedOnly     = grants.keys − positionEffective
effective         = positionEffective ∪ grants.keys
scopes            = positionScopes ∪ {ORGANIZATION cho grants}
delegatedPermissions = delegatedOnly
```

- Quyền vừa position vừa delegation: **không** nằm trong `delegatedPermissions`; khi thu hồi delegation vẫn còn trong `effective`.
- `permissions` luôn là hợp; `delegatedPermissions` chỉ là phần **độc quyền delegation**.
- Filter (RBAC-05) dùng trực tiếp `resolved.permissions()`; không còn phép trừ `tokenDelegated` thủ công.

### 8.2 7 kịch bản bắt buộc

| # | Kịch bản | Kỳ vọng |
|---|---|---|
| 1 | Chỉ delegation cấp `X` | `X ∈ permissions`, `X ∈ delegatedPermissions` |
| 2 | Chỉ position cấp `X` | `X ∈ permissions`, `X ∉ delegatedPermissions` |
| 3 | Position + delegation cùng cấp `X` | `X ∈ permissions`, `X ∉ delegatedPermissions`; thu hồi delegation ⇒ `X` vẫn còn |
| 4 | Hai delegation cùng cấp `X` | chọn 1 delegationId ổn định; thu hồi 1 ⇒ còn delegation kia |
| 5 | Thu hồi giữa request | Request đang chạy dùng grant đã qua filter; request sau mất |
| 6 | Delegation hết hạn | Không cộng grant, không audit |
| 7 | Position + delegation, audit | Audit chỉ ghi khi quyền độc quyền delegation |

---

## 9. HR-02 — bảo vệ thông tin đăng nhập tạm

### 9.1 Ngắn hạn (không cần SMTP)

| Biện pháp | Cách làm |
|---|---|
| Không log credential | Rà soát log; không log body response; audit member create không chứa mật khẩu |
| Header chống cache | `Cache-Control: no-store, no-cache, must-revalidate`, `Pragma: no-cache` cho response chứa `temporaryPassword` (controller trả `ResponseEntity` có header) |
| Hiển thị một lần | Giữ `TempPasswordDialog` (đã có); không lưu localStorage/sessionStorage/query string |
| Không lưu plaintext | DB chỉ lưu BCrypt (đã đúng) |
| Tăng entropy | `AccountService.generateTemporaryPassword` dùng `SecureRandom` 18 byte Base64URL (24 ký tự) thay UUID 10 ký tự |
| Buộc đổi lần đầu | `must_change_password=TRUE` (đã có) |
| Giới hạn người xem | Chỉ HR có `employee.reset_password`/`employee.create`; response nội bộ có key |
| TTL mật khẩu tạm | **[Cần quyết định + migration]** thêm `account.temp_password_expires_at`; chưa triển khai vì DB production chưa có cột |

### 9.2 Dài hạn (chưa làm — không có SMTP)

- Link kích hoạt một lần: token ngẫu nhiên mạnh, lưu hash, hết hạn, dùng một lần, người dùng tự đặt mật khẩu; HR không thấy plaintext.
- Không giả lập SMTP, không tuyên bố đã hoạt động. Ghi OPEN.

---

## 10. Test matrix tổng (theo yêu cầu Phần F)

### Identity (unit/integration)
- Login: thành công/thất bại/khóa/org inactive/SUPER_ADMIN sai cấu hình.
- Refresh: rotate, reuse bị chặn, account disabled.
- Đổi role: chặn OWNER/legacy/chéo lớp; thu hồi refresh token.
- Reset mật khẩu: policy 12/72, revoke session, no-store header.
- Permission profile: OWNER full catalog; MANAGER/STAFF gọi People; STUDENT/TEACHER SELF.
- Role seed + validator: thiếu role ⇒ fail-fast.

### People
- Position create/update/clone: subset + module + scope.
- Assignment create/revoke: quyền hiệu lực thay đổi ngay.
- Resolve: 7 kịch bản DEL-03.
- Delegation create/revoke/expire: audit + hiệu lực.
- Membership authorization: RBAC-06 matrix.
- Employee create/reset: temp password một lần.
- Offboarding: disable + revoke assignments.

### Cross-service
- Identity lấy quyền từ People; People down ⇒ login với quyền rỗng + `permissionsStale`.
- Đổi quyền/revoke delegation ⇒ request kế tiếp bị chặn.
- Identity cache invalidate khi đổi role/disable.
- Account disable ⇒ refresh reuse fail.

### Frontend
- Session parse `permissionsStale`.
- Menu ẩn/hiện theo quyền.
- AccountsPage không còn OWNER/legacy trong dropdown.
- EmployeeCreateDrawer gửi role hợp lệ.
- TempPasswordDialog không đóng vô tình.

---

## 11. Kế hoạch thực thi

| Stage | Nội dung | Mã | Test trọng tâm |
|---|---|---|---|
| 2 | RoleCatalog + validator + seed alias + registration fallback + AccountsPage guard + RBAC-06 | AUTH-06, AUTH-10, RBAC-06 | Role seed, updateRole guard, MembershipPolicy matrix, PositionController |
| 3 | People recompute quyền mỗi request + Identity stale cache + claim | RBAC-05, AUTH-11 | 10 + fail-closed |
| 4 | Resolve delegated-only + filter đơn giản hoá + policy audit annotation | DEL-03, DEL-01 | 7 kịch bản + audit |
| 5 | No-store header + entropy + rà soát log | HR-02 | reset/create response |
| 6 | Regression toàn bộ + FE tsc/eslint/vitest + báo cáo cuối | — | tất cả |

Thứ tự bắt buộc: Stage 2 trước (đổi mô hình role), Stage 3 kế (đổi cách People tính quyền), Stage 4 phụ thuộc Stage 3, Stage 5 độc lập.

---

## 12. Điểm cần người dùng xác nhận

1. **AccountsPage**: giữ relabel MANAGER↔STAFF/STUDENT↔TEACHER (thiết kế hiện tại) hay chuyển hoàn toàn read-only?
2. **Access token TTL mặc định**: hạ 900s → 300s trong code (không đổi env) có chấp nhận không?
3. **Stale window**: last-known-good 10 phút cho AUTH-11 có chấp nhận không? (Thấp hơn = an toàn hơn nhưng dễ mất quyền khi People lỗi lâu.)
4. **Temp password TTL**: có cần thêm cột + migration (file-only) trong phase này không?
5. **Migration chuyển `ORG_OWNER → OWNER`**: chỉ trên DB test hay bỏ qua hoàn toàn?
6. **Role legacy đang gán cho user thật**: giữ nguyên đến khi có quyết định chuyển đổi, đúng không?

Các mặc định ở trên được chọn theo hướng **an toàn và ít phá vỡ nhất**; nếu người dùng không phản hồi, triển khai giữ đúng các mặc định này và ghi rõ trong báo cáo cuối.
