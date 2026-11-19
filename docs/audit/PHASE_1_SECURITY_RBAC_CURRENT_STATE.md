# PHASE 1 — HIỆN TRẠNG SECURITY & RBAC (MEMS)

> Tài liệu khảo sát **chỉ đọc**: mô tả đúng những gì source code đang làm tại thời điểm lập, không đề xuất sửa.
> Thiết kế đích nằm ở `docs/audit/PHASE_1_SECURITY_RBAC_DESIGN.md`. Báo cáo kết thúc ở `docs/audit/PHASE_1_SECURITY_RBAC_FINAL.md`.
> Quy ước phân loại (theo rule dự án): **[Đã có trong code]** — quan sát được trong source; **[Đề xuất]** — chỉ xuất hiện trong tài liệu thiết kế; **[Cần người dùng quyết định]** — chưa có căn cứ trong code/docs.

---

## 0. Thông tin phiên khảo sát

| Mục | Giá trị |
|---|---|
| Branch | `fixFlowCreateEmployee` |
| HEAD | `8221f86f1434baed5f1cb45a1f9a55159f6c4e61` — "fix flox class managment" |
| `git status --short` | rỗng (working tree sạch tại thời điểm khảo sát) |
| File lạ `-p`, `Facility)` | **Không còn tồn tại** trong working tree; đã bị xoá ở commit HEAD. Không có thao tác xoá/khôi phục/stage nào được thực hiện trong phiên này. |
| Tài liệu tham chiếu | `PROJECT_CONTEXT.md`, `docs/audit/*`, `DB_11_16.sql`, migrations `28`–`47` |
| Môi trường test | Maven offline từng service; H2 schema test của People/Facility |

Lệnh đã dùng để xác minh: `git rev-parse HEAD`, `git status --short`, `ls`, `Grep` trên `backend/**` và `frontend/src/**`.

---

## 1. Phạm vi và phương pháp

Khảo sát theo đúng thứ tự bắt buộc: working tree → tài liệu audit → toàn bộ luồng role/permission/scope/assignment/delegation/JWT ở 3 tầng (Identity, People, Frontend) + schema DB → test hiện có.

Mã trong phạm vi Phase 1:

| Nhóm | Mã | Nội dung |
|---|---|---|
| A | `AUTH-06` | Mô hình vai trò và nguồn sự thật |
| A | `AUTH-10` | Nguồn sự thật của account / membership / position / assignment / permission / delegation |
| A | `RBAC-06` | Bỏ ràng buộc nghiệp vụ theo role `MANAGER`/`STAFF` |
| B | `AUTH-11` | Hành vi khi People không sẵn sàng |
| B | `RBAC-05` | Vòng đời quyền: cấp/thu hồi có hiệu lực ngay |
| C | `DEL-01` | Audit khi thực sự dùng quyền ủy quyền |
| C | `DEL-03` | Quyền đến từ chức vụ phải sống sót khi thu hồi ủy quyền |
| D | `HR-02` | Bảo vệ thông tin đăng nhập tạm |

Ngoài phạm vi (theo yêu cầu): CC-03 outbox, CC-04 URL normalization, CC-05 mems-common, CC-06 org audit API, CC-08 HttpOnly cookie, các quyết định enrollment/phòng theo tổ chức/điểm danh/đổi lịch, mọi tính năng mới.

---

## 2. Bản đồ hệ thống

```text
Browser (React 19 + Vite, /api → proxy)
        │  Bearer JWT (HS256, issuer mems-identity)
        ▼
APIGateway :8080
   ├── IdentityService :8081   → MySQL mems_identity_db
   │      account, account_role, role, role_permission,
   │      permission, permission_bundle(+item), organization, refresh_token
   └── PeopleService  :8082   → MySQL mems_people_db
          department, department_member, position, position_permission,
          position_bundle, assignment, delegation, delegation_permission,
          transfer_request(+step), resignation_request, school_class, ...
   ├── ScheduleService :8083  (đọc JWT: roles, role, permissions)
   └── FacilityService :8084  (đọc JWT: roles, permissions)
Eureka :8761
```

Giao tiếp nội bộ:

| Chiều | Endpoint | Bảo vệ |
|---|---|---|
| Identity → People | `GET /internal/users/{userId}/authorization?orgId=` | header `X-Internal-Api-Key` (so sánh constant-time, tối thiểu 32 ký tự, `InternalApiFilter`) |
| People → Identity | `/internal/accounts/**` (tạo/reset/disable/enable/compensate), `/internal/permissions`, bundles | cùng header nội bộ |
| People → Identity | `/internal/modules/...` (module đang bật) | cùng header nội bộ |

**[Đã có trong code]** `/internal/**` được `permitAll()` ở cả hai service; an toàn dựa hoàn toàn vào `InternalApiFilter`.

---

## 3. Từ vựng (phân biệt rạch ròi)

| Khái niệm | Nơi lưu | Ý nghĩa |
|---|---|---|
| **Platform role** | `role` scope `platform` | `SUPER_ADMIN` — không thuộc tổ chức nào |
| **Organization account role** | `account_role` → `role` scope `organization` | `OWNER`, `ORG_OWNER`, `MANAGER`, `STAFF`, `TEACHER`, `STUDENT`, (`ORG_ADMIN`, `ACADEMIC_STAFF`, `FACILITY_STAFF` legacy) |
| **Membership** | `department_member` | Có mặt trong một phòng ban; cột `role` enum `OWNER/MANAGER/STAFF`; `status` `ACTIVE/RESIGNED` |
| **Position (chức danh)** | `position` + `position_permission` + `position_bundle` | Mang quyền; `scope` `ORGANIZATION` hoặc `DEPARTMENT`; `profile_type` `GENERAL/TEACHER`; `system_code` `DEPT_HEAD/GENERAL_MANAGER` |
| **Assignment** | `assignment` | Gán `user × department × position`, có `effective_from/to`, `status` |
| **Permission** | Identity `permission` (catalog) | Mã quyền chuẩn, vd `employee.assign_position` |
| **Scope** | `permission.allowed_scopes` + assignment.scope_type | `ORGANIZATION` hoặc `DEPARTMENT:<id>` |
| **Delegation** | `delegation` + `delegation_permission` | Owner ủy quyền quyền cho Tổng quản lý; hiện chỉ `ORGANIZATION` |
| **Module** | `organization_module`, `department_module` | Quyền gắn module chỉ hiệu lực khi module bật |

**[Đã có trong code]** Ba khái niệm `role` (đăng nhập), `position` (mang quyền), `membership.role` (dùng cho hiển thị + vài kiểm tra) đang tồn tại song song và **không đồng bộ tự động**. Đây là gốc của AUTH-06/AUTH-10.

---

## 4. Bảng role hiện trạng

Đối chiếu 5 nơi: Identity (`role`/`account_role`, seed, xử lý trong service) · People (`department_member.role`) · Frontend (`RoleCode`, guard, dropdown) · Database (dòng seed) · Thực tế sử dụng.

| Role | Identity | People | Frontend | Database | Thực tế sử dụng |
|---|---|---|---|---|---|
| `SUPER_ADMIN` | Seed ở `IdentityDataInitializer:30`; `SecurityConfig:84` chặn `/organizations/**`, `/accounts/**`, `/audit-logs/**`; `AuthService:79-86` bắt buộc `orgId=null` và chỉ 1 role | Không được là nhân sự tổ chức (People không tạo được vì thiếu orgId; `MemberService` không chặn tường minh) | Workspace `platform`; `nav.ts:80` | role id 1 + toàn bộ `role_permission` | **Đang dùng** — quản trị nền tảng |
| `OWNER` | Seed `:33`; `AccessProfileService:20-22` **toàn bộ catalog**; `SecurityConfig:78` `/organizations/my/**` | `department_member.role='OWNER'` là giá trị hợp lệ nhưng **luồng tạo nhân sự không sinh ra** (MembershipPolicy chặn role khác STAFF); `Actor.owner()` đọc từ claim `roles` | `isOwner()` (`nav.ts:73`), profile/user-menu, guard `/to-chuc` | role id 8 + full catalog | **Đang dùng** — chủ tổ chức |
| `ORG_OWNER` | **Không seed** ở initializer; `OrganizationRegistrationService:77-88` bắt buộc phải có; `AccessProfileService:20` map như OWNER; `SecurityConfig:109` map sang `ROLE_OWNER` | Không dùng | `isOwner()` chấp nhận cả hai | role id 7; **có trong dump `DB_11_16.sql` nhưng không có trên DB mới** | **Đang dùng khi đăng ký tổ chức** — trùng nghĩa với OWNER |
| `MANAGER` | Seed `:33`; `AccessProfileService:23` → gọi People; `JwtService:29` bỏ khỏi `roles` rồi thêm lại `profile.role()` | `department_member.role='MANAGER'`; `AuthorizationResponse` trả về; `MembershipPolicy:67` **chặn không cho gán** (chỉ STAFF) | `employee-create-drawer` cho chọn; `profile-page`/`user-menu` label; `types.ts`; `AccountsPage` | role id 9 | **Đang dùng như nhãn chức danh**, nhưng quyền thực tế đến từ position |
| `STAFF` | Seed `:33`; `AccessProfileService:23` → People; `PeopleAuthorizationClient:24` chỉ chấp nhận MANAGER/STAFF; default khi không có membership (`MemberRepository:191`) | enum + default | default form tạo nhân sự; `types.ts` | role id 10 | **Đang dùng** — giá trị mặc định |
| `TEACHER` | Seed `:33` + SELF perms `:55-63`; `AccessProfileService:29` cộng SELF | `position.profile_type='TEACHER'`; default position "Giáo viên" | `RoleCode` deprecated; `profileType` dùng cho UI | role id 5 (legacy `role_permission`) | **Legacy Identity role**; giáo viên mới = STAFF + position TEACHER |
| `STUDENT` | Seed `:33` + SELF; provisioning `IdentityClient:141` role STUDENT | `student_profile`, không phải `department_member` | Cổng sinh viên | role id 6 | **Đang dùng** — tài khoản sinh viên |
| `ORG_ADMIN` | Không seed; không tham chiếu trong Java | Không | Không có trong dropdown hiện tại | role id 2 + legacy `role_permission` | **Legacy thuần DB** — migration 30/33 dọn quyền |
| `ACADEMIC_STAFF` | Không seed; không tham chiếu Java | Không | `AccountsPage.ASSIGNABLE_ROLES:42`; label platform | role id 3 + legacy perms | **Legacy** nhưng **vẫn gán được** qua AccountsPage |
| `FACILITY_STAFF` | Không seed | Không | `RoleCode` deprecated | role id 4 + legacy perms | **Legacy thuần DB** |

Kết luận hiện trạng **[Đã có trong code]**:

1. Tồn tại **hai tên cho cùng một vai trò chủ tổ chức** (`OWNER` / `ORG_OWNER`), cộng thêm 3 role legacy chỉ còn trong DB.
2. `MANAGER`/`STAFF` là **role đăng nhập + nhãn membership**, nhưng quyền thật đến từ **position**. Nhiều nơi vẫn dùng role để quyết định nghiệp vụ.
3. `TEACHER` vừa là role Identity (legacy), vừa là `profile_type` của position — hai nguồn nghĩa khác nhau.
4. Không có kiểm tra khởi động nào bảo đảm các role bắt buộc tồn tại; DB mới chỉ có 6 role từ initializer, thiếu `ORG_OWNER` mà đăng ký tổ chức lại đòi.

---

## 5. IdentityService — trách nhiệm từng file

### 5.1 Bảng tổng hợp

| File | Trách nhiệm | Đầu vào | Đầu ra | Nguồn quyền | Phụ thuộc | Vấn đề hiện tại |
|---|---|---|---|---|---|---|
| `security/JwtService.java` | Ký access token HS256; ghi claim | `userId, username, orgId, roles, AccessProfile, mustChangePassword` | JWT | `AccessProfile` | — | `:29` xoá `MANAGER/STAFF` khỏi `roles` rồi thêm `profile.role()`; token chứa **ảnh chụp** quyền, TTL 60–900s |
| `service/AccessProfileService.java` | Quyết định quyền hiệu lực lúc đăng nhập | `Account`, `roles` | `AccessProfile` | ORGANIZATION → People `resolve`; OWNER → full catalog; còn lại → `role_permission` + SELF | People (HTTP) | `:23` **gọi People đồng bộ**; `:24-27` role_permission là nguồn cho STUDENT/TEACHER/legacy |
| `client/PeopleAuthorizationClient.java` | Gọi People lấy quyền | `userId, orgId` | `AccessProfile` | People | People HTTP | `:24` **chỉ chấp nhận role MANAGER/STAFF**; không cache; timeout 3s/5s; lỗi → `DEPARTMENT_PERMISSIONS_UNAVAILABLE` |
| `service/AuthService.java` | login / refresh / logout | credentials / refresh token | token pair | `AccessProfileService` | DB, RefreshTokenService | `:63-108` validate account/org; refresh tái tạo profile (gọi People lần nữa) |
| `service/AccountService.java` | CRUD tài khoản (API SUPER_ADMIN) | payload | account map + temp password | bảng `role` | DB | `:207-228` `updateRole` **chỉ chặn SUPER_ADMIN**, cho phép gán OWNER/legacy, **không thu hồi phiên**, **không kiểm tra scope role**; `:149` createAccount chỉ chặn SUPER_ADMIN; `:259` temp password = UUID 10 ký tự + `A1!` |
| `service/AccountProvisioningService.java` | Tạo/reset/disable nội bộ cho People | `ProvisionAccountRequest` | `{userId}` / `{temporaryPassword}` | — | DB | `:40-42` insert `account_role` theo `role` do People gửi; **fail nếu role chưa seed** |
| `controller/InternalAccountController.java` | API nội bộ | — | — | `X-Internal-Api-Key` | — | Không kiểm tra thêm ai gọi |
| `service/OrganizationRegistrationService.java` | Đăng ký tổ chức | request | org/account PENDING | `role` DB | DB | `:77-88` **bắt buộc role `ORG_OWNER` scope organization**; trên DB mới (chỉ initializer) sẽ **luôn fail** |
| `config/IdentityDataInitializer.java` | Seed role/permission/bundle/bootstrap | env | bản ghi DB | `PermissionCatalog` | DB | `:33` seed OWNER/MANAGER/STAFF/TEACHER/STUDENT, **không seed ORG_OWNER**; `:39-51` gán toàn catalog cho OWNER/ORG_OWNER/SUPER_ADMIN; không validate role bắt buộc |
| `security/SecurityConfig.java` | URL authorization + converter | — | authorities | JWT | — | `/internal/**` permitAll (dựa filter); `:109` ORG_OWNER → `ROLE_OWNER`; **không** có rule riêng cho role change ngoài `accounts/**` SUPER_ADMIN |
| `security/InternalApiFilter.java` | Chặn `/internal/**` nếu sai key | header | 401 | env `INTERNAL_API_KEY` | — | Key < 32 ký tự → chặn tất cả (fail-closed, tốt) |
| `security/PasswordChangeRequiredFilter.java` | Chặn request khi `mustChangePassword` | JWT | 403 | claim | — | Cho phép đổi mật khẩu/logout |
| `service/PermissionCatalog.java` | Catalog quyền + bundle | — | danh sách | mã nguồn | — | Nguồn chuẩn của mã quyền |
| `dto/AccessProfile.java` | DTO hồ sơ quyền | — | role, departmentId, permissions, permissionScopes, delegatedPermissions | — | — | Constructor 3 tham số mặc định scope ORGANIZATION cho mọi quyền |

### 5.2 Luồng đăng nhập hiện tại

```text
POST /api/v1/auth/login
  └─ AuthService.login
       1. LoginAttemptService.assertAllowed (AUTH-02)
       2. accountRepository.findByUsername + BCrypt (constant-time với dummy hash)
       3. validateAccount: status='active'; roles non-empty;
          SUPER_ADMIN ⇒ orgId=null & đúng 1 role;
          khác ⇒ orgId bắt buộc, org tồn tại & 'active'
       4. AccessProfileService.resolve(account, roles)
            ├─ OWNER|ORG_OWNER → toàn bộ PermissionCatalog (scope ORGANIZATION)
            ├─ MANAGER|STAFF   → GET People /internal/users/{id}/authorization
            └─ khác            → role_permission + SELF cho STUDENT/TEACHER
       5. JwtService.generateAccessToken
            roles = roles − {MANAGER,STAFF} + profile.role()
            claims: permissions, permissionScopes, delegatedPermissions,
                    role, roles, departmentId, orgId, mustChangePassword
       6. RefreshTokenService.createRefreshToken
```

Điểm quan trọng **[Đã có trong code]**:

- Người dùng `MANAGER`/`STAFF` **không thể đăng nhập khi People sập** (bước 4 ném `DEPARTMENT_PERMISSIONS_UNAVAILABLE`). Đây là hạt nhân của AUTH-11.
- Quyền trong JWT là ảnh chụp; thay đổi position/assignment/module **không** làm token cũ mất hiệu lực. Chỉ People có `DelegatedAuthorityFilter` đọc lại DB (và chỉ cho phần ủy quyền).
- `profile.role()` lấy từ `department_member.role`. Vì vậy token của một nhân sự có thể mang `role=MANAGER/STAFF`, còn `roles` claim là tập đã biến đổi — hai nguồn dễ lệch.

---

## 6. PeopleService — trách nhiệm từng file

### 6.1 Bảng tổng hợp

| File | Trách nhiệm | Đầu vào | Đầu ra | Nguồn quyền | Phụ thuộc | Vấn đề hiện tại |
|---|---|---|---|---|---|---|
| `security/SecurityConfig.java` | Chain JWT + filter | request | authorities | JWT | `EffectivePermissionsService` | `:43` map ORG_OWNER→OWNER; `:44-45` thêm `ROLE_` từ claim `role`; `:28` gắn `DelegatedAuthorityFilter`; `anyRequest().authenticated()` |
| `security/Actor.java` | Truy cập claim an toàn | JWT | orgId/userId/owner/hasPermission | claim | — | `owner()` dựa `roles` claim; quyền dựa `permissions` + `permissionScopes` |
| `service/EffectivePermissionsService.java` | Tính quyền hiệu lực | orgId, userId, departmentId | `EffectivePermissions` | assignment × position/bundle, lọc module+allowed scope; cộng delegation | IdentityClient (catalog, module, bundle) | `:198-204` **mọi quyền ủy quyền đều bị đánh dấu `delegated` kể cả khi position đã cấp** → DEL-03; gọi Identity mỗi lần resolve |
| `security/DelegatedAuthorityFilter.java` | Đồng bộ quyền ủy quyền theo DB mỗi request | JWT + DB | authentication đã sửa | `activeDelegationGrants` | DB | `:60-64` bỏ `tokenDelegated` khỏi base rồi cộng grant hiện tại → **nếu một quyền vừa do position vừa do delegation cấp, sau khi thu hồi delegation nó biến mất** (hệ quả DEL-03) |
| `security/DelegationUsageInterceptor.java` | Audit khi dùng quyền ủy quyền | request/handler | bản ghi `DELEGATION_PERMISSION_USED` | annotation `@RequirePermission`/`@PreAuthorize` | PeopleAuditService | `:52` **chỉ đọc annotation**; endpoint duyệt theo policy (resignation/transfer approve) không có annotation → DEL-01 |
| `service/MembershipPolicy.java` | Kiểm tra khi gán chức danh/tạo nhân sự | departmentId, targetRole, positionIds | pass/throw | effective permissions của actor | PositionRepository, EffectivePermissionsService | `:67` **`if (!"STAFF".equals(targetRole)) forbidden`** → RBAC-06; phần còn lại đã dựa quyền/scope/module/subset (tốt) |
| `service/MemberService.java` | Tạo/sửa nhân sự, reset mật khẩu, offboard | request | MemberResponse | MembershipPolicy + quyền | IdentityClient | `:90` suy `profileType` TEACHER từ position; `:126/138` chặn OWNER; role truyền sang Identity + `department_member` |
| `repository/MemberRepository.java` | Đọc/ghi membership + authorization | — | `AuthorizationResponse` | `EffectivePermissionsService` | — | `:189-196` trả role `department_member.role`, default `STAFF` khi không có dòng; **đây là nguồn cho PeopleAuthorizationClient** |
| `service/PositionService.java` | CRUD/clone position | request | position | quyền actor + catalog | IdentityClient | Đã authorization theo quyền và scope (**mẫu tốt**); `:141` ORGANIZATION position chỉ Owner |
| `service/DefaultPositionSeeder.java` | Seed 7 position mặc định | orgId | bản ghi | hard-code permission codes | DB | `:78` comment nói "phải chứa quyền của giáo viên để MANAGER gán được" — phụ thuộc ngầm vào rule role |
| `service/DelegationService.java` | Tạo/sửa/thu hồi ủy quyền | request | DelegationResponse | `requireOwner()` | IdentityClient | Chỉ Owner; delegate phải là GM; scope ORGANIZATION; có audit vòng đời delegation |
| `service/ResignationApprovalPolicy.java` | Thứ tự duyệt nghỉ việc 4 cấp | org/dept/user | bool/throw | position + delegation + owner | EffectivePermissionsService | `directPermissionHolderIds` loại delegated (đúng ý đồ); level 3 GM + delegation |
| `service/TransferService.java` | Workflow chuyển phòng 4 bước | request | TransferResponse | head position + `policy.hasPermission` | EffectivePermissionsService | `canDecide` không role-based (tốt); approve/reject **không có annotation** → không audit delegation |
| `controller/PositionController.java` | REST position | — | — | `@PreAuthorize` | — | `:14,17,19` **`hasAnyRole('OWNER','MANAGER','STAFF')`** cho read endpoints → RBAC-06 |
| `controller/DepartmentMemberController.java` | REST member | — | — | `@RequirePermission(...)` | — | Đã permission-based (tốt) |
| `controller/ResignationController.java` | REST nghỉ việc | — | — | `@RequirePermission` cho list/create | — | `:47,54` approve/reject **không annotation** (policy tự kiểm) → DEL-01 |
| `controller/TransferController.java` | REST chuyển phòng | — | — | `@RequirePermission("employee.transfer")` cho create | — | `:52,58` approve/reject **không annotation** → DEL-01 |
| `controller/DelegationController.java` | REST ủy quyền | — | — | `@PreAuthorize("hasRole('OWNER')")` | — | Hợp lệ theo chính sách Owner, không phải RBAC-06 |
| `controller/InternalAuthorizationController.java` | Trả authorization nội bộ | userId, orgId | `AuthorizationResponse` | DB | — | Không giới hạn thêm; filter key bảo vệ |

### 6.2 Cách một request được cấp quyền trong People

```text
Request + Bearer JWT
  → BearerTokenAuthenticationFilter (decode, converter:
        ROLE_<role trong roles>, ROLE_<role claim>, từng permission)
  → DelegatedAuthorityFilter
        base = permissions − delegatedPermissions(token)
        grants = SELECT ... FROM delegation WHERE status='ACTIVE' AND now ∈ [from,to]
        permissions = base ∪ grants
        authorities = ROLE_* + permissions
        request.attr(GRANTS) = grants
  → @PreAuthorize / @RequirePermission (method security)
  → Service (Actor đọc claim đã sửa; policy đọc DB khi cần)
  → DelegationUsageInterceptor (sau khi trả 2xx) audit các annotation đã dùng
```

**[Đã có trong code]** Quyền **position** không được đọc lại theo DB ở mỗi request; chỉ quyền **delegation** được làm mới. Vì vậy RBAC-05 (thu hồi assignment/position có hiệu lực ngay) **chưa được giải quyết** ở People; các service khác (Schedule/Facility) hoàn toàn dựa token.

### 6.3 Nguồn sự thật hiện tại (theo từng loại dữ liệu)

| Dữ liệu | Nguồn sự thật | Ghi chú |
|---|---|---|
| Danh tính/đăng nhập | Identity `account` | |
| Role đăng nhập | Identity `account_role` | |
| Membership phòng ban | People `department_member` | role ở đây là **nhãn**, không cấp quyền |
| Chức danh | People `position` | |
| Gán chức danh | People `assignment` | |
| Quyền hiệu lực nhân sự | People `EffectivePermissionsService` (assignment × position) | Identity chỉ **sao chép** vào token |
| Ủy quyền | People `delegation` | |
| Catalog quyền | Identity `permission` / `PermissionCatalog` | People đọc qua HTTP |
| Module | Identity `organization_module` (active) + People `department_module` | |

Xung đột tiềm ẩn **[Đã có trong code]**:

- Identity `AccountService.updateRole` có thể đặt role `OWNER` cho một account **không có** quan hệ nào trong People → người đó thành Owner với toàn quyền catalog (vì `AccessProfileService` short-circuit Owner) dù không có membership.
- Identity `updateRole` đổi `STAFF → OWNER` (hoặc ngược lại) **không** đồng bộ `department_member.role`, không thu hồi refresh token.
- Token cũ giữ quyền cũ tới 15 phút sau khi assignment/position bị thu hồi.

---

## 7. Frontend — trách nhiệm từng file

| File | Trách nhiệm | Nguồn dữ liệu | Vấn đề hiện tại |
|---|---|---|---|
| `types/session.ts` | Kiểu `RoleCode`, `Session`, `ModuleState`, `ApprovalCapabilities` | JWT + `/users/me/permissions` | `RoleCode` còn `ORG_ADMIN/ACADEMIC_STAFF/FACILITY_STAFF/TEACHER` (deprecated) |
| `lib/permissions.ts` | Hằng số mã quyền | catalog BE | Có mã FE-only (attendance/change-request/recurring) không có trong catalog BE |
| `lib/nav.ts` | Menu + `isOwner`, `hasPermission` | session | `:73` OWNER|ORG_OWNER; `hasPermission` **cộng owner bypass**; `:136` nhóm `ORG_PREFIXES` |
| `routes/guards.tsx` | Chặn route | session | `:77` kiểm role OWNER/ORG_OWNER cho khu tổ chức |
| `features/platform/pages/accounts-page.tsx` | SUPER_ADMIN quản lý account | `/accounts` | `:42` `ASSIGNABLE_ROLES = OWNER, MANAGER, STAFF, ACADEMIC_STAFF, STUDENT`; `:70` default STAFF; đổi role gọi `updateRole` |
| `features/platform/api.ts` | Gọi API account | — | `:232` default role `STAFF` khi thiếu |
| `features/organization/components/employee-create-drawer.tsx` | Tạo nhân sự | API People | `:40` role `'MANAGER' | 'STAFF'`; `:53` default STAFF; gửi `role` |
| `features/organization/components/temp-password-dialog.tsx` | Hiện mật khẩu tạm 1 lần | state | `hideClose`, chặn Esc/outside, cảnh báo, copy clipboard (không lưu storage) — nền tảng tốt cho HR-02 |
| `features/organization/types.ts` | Kiểu member/position | — | `:38` `profileType` có MANAGER/STAFF; `:122` role MEMBER `MANAGER|STAFF` |
| `features/auth/pages/profile-page.tsx`, `layouts/user-menu.tsx` | Nhãn vai trò | `session.roles` | Hiển thị theo role literal, không theo position |
| `features/organization/api.ts` | API tổ chức | — | `:166` ghi chú chỉ OWNER gọi module |

**[Đã có trong code]** UI đã phần lớn dựa **quyền** để hiện menu (`permissions: [...]`), nhưng còn 2 chỗ chọn role nghiệp vụ: tạo nhân sự (MANAGER/STAFF) và AccountsPage (gán role). Không có màn hình "gán chức danh" thay thế.

---

## 8. Database — bảng liên quan

| Bảng | Cột then chốt | Ghi chú |
|---|---|---|
| `role` (identity) | `code`, `scope` (`platform`/`organization`) | Dump có 10 role; initializer chỉ seed 6 |
| `account_role` | `account_id`, `role_id` | Nhiều dòng/account về lý thuyết; `updateRole` xoá hết rồi chèn 1 |
| `role_permission` | `role_id`, `permission_id` | Dùng cho OWNER/ORG_OWNER/SUPER_ADMIN full catalog + STUDENT/TEACHER SELF + legacy |
| `permission` | `code`, `module_code`, `allowed_scopes` | Catalog |
| `permission_bundle`, `permission_bundle_item` | — | 4 bundle nghiệp vụ |
| `department_member` | `role enum('OWNER','MANAGER','STAFF')`, `status` | Một người một phòng (unique user_id+org_id) |
| `position` | `scope`, `profile_type`, `system_code`, `deleted_at` | Soft delete |
| `position_permission`, `position_bundle` | — | Quyền của chức danh |
| `assignment` | `scope_type`, `department_id`, `effective_from/to`, `status` | Lịch sử gán |
| `delegation` | `scope`, `status`, `effective_from/to`, `revoked_*` | Chỉ ORGANIZATION |
| `delegation_permission` | `permission_code` | |
| `organization_module`, `department_module` | `status` / `module_code` | Điều kiện module |

Điểm đáng chú ý **[Đã có trong code]**:

- `department_member.role` **không có** giá trị `ORG_OWNER` hay legacy — chỉ 3 giá trị.
- Không có bảng/cột lưu "phiên bản quyền" (authz version) hay "thời điểm quyền thay đổi". RBAC-05 sẽ cần cân nhắc thêm (migration file-only, local/test).
- `assignment` có lịch sử (`effective_from/to`, status) — không được xoá khi đổi role Identity.

---

## 9. Luồng end-to-end hiện tại

### 9.1 Cấp và dùng quyền

```text
Login ──► AccessProfile ──► JWT (snapshot) ──► mọi service
                                   │
                                   └─ People: DelegatedAuthorityFilter (chỉ refresh delegation)
```

- **Token TTL**: cấu hình 60–900 giây, mặc định 900 (`JwtService:17,20`).
- **Refresh** tạo token mới và tính lại profile (gọi People). Refresh token rotate.
- Thu hồi phiên: chỉ khi `resetPassword`, `AccountProvisioningService.disable`, hoặc `AccountService.resetPassword/revokeSessions`; **không** xảy ra khi `updateRole`, đổi status `locked`, hay đổi assignment.

### 9.2 Đổi role qua AccountsPage

```text
SUPER_ADMIN → PUT /api/v1/accounts/{id}/role
  AccountService.updateRole:
    - chặn SUPER_ADMIN
    - tìm role trong bảng role (bất kỳ scope)
    - DELETE account_role; INSERT 1 role
    - KHÔNG revoke refresh token, KHÔNG kiểm tra org, KHÔNG đồng bộ People
```

Hệ quả: access token cũ vẫn dùng quyền cũ tới khi hết hạn; role legacy vẫn gán được; `OWNER` gán được cho account không có membership → toàn quyền catalog.

### 9.3 Tạo nhân sự + mật khẩu tạm

```text
HR (People) POST /departments/{id}/members
  MemberService.create → MembershipPolicy.check(departmentId, role, positionIds)
        role phải = "STAFF"  (RBAC-06)
  → IdentityClient.provision (internal) → AccountProvisioningService.create
        role từ request; temp password do People sinh
  → trả temporaryPassword một lần
FE: EmployeeCreateDrawer → TempPasswordDialog (hiển thị 1 lần)
```

### 9.4 Ủy quyền

```text
Owner POST /delegations  → DelegationService.create
   delegate phải ACTIVE + General Manager; scope ORGANIZATION
   validatePermissions: mọi mã thuộc catalog và ⊆ quyền hiện có của Owner
Request của delegate → DelegatedAuthorityFilter cộng grant đang hiệu lực
   → nếu thành công và handler có annotation → audit DELEGATION_PERMISSION_USED
```

### 9.5 Nghỉ việc / chuyển phòng

- `ResignationApprovalPolicy.canApprove`: Owner → direct permission holder (position, không tính delegation) → trưởng phòng → GM + delegation.
- `TransferService.canDecide`: theo bước `SOURCE_HEAD/TARGET_HEAD` (vị trí trưởng phòng), `HR` (quyền `employee.approve_transfer`), `EMPLOYEE`.
- Cả hai gọi `policy.hasPermission`/`EffectivePermissionsService` **trực tiếp**, không đi qua annotation → không audit delegation.

---

## 10. Danh sách lỗi hiện trạng theo mã Phase 1 (kèm bằng chứng)

### AUTH-06 / AUTH-10 — mô hình vai trò & nguồn sự thật

| # | Hiện trạng | Bằng chứng |
|---|---|---|
| 1 | Hai role cùng nghĩa cho chủ tổ chức | `AccessProfileService.java:20-22`, `DB_11_16.sql:1098` (id 7 ORG_OWNER, id 8 OWNER) |
| 2 | Initializer không seed `ORG_OWNER` nhưng đăng ký tổ chức bắt buộc nó | `IdentityDataInitializer.java:33`, `OrganizationRegistrationService.java:77-88` |
| 3 | Không validate role bắt buộc lúc khởi động | Không có `ApplicationRunner`/validator tương ứng |
| 4 | 3 role legacy còn trong DB và **vẫn gán được** qua API | `DB_11_16.sql:1098`; `AccountService.java:207-228`; `accounts-page.tsx:42` |
| 5 | AccountsPage đổi role nghiệp vụ do People sở hữu | `AccountService.updateRole`; `MemberRepository.authorization` |
| 6 | `updateRole` không thu hồi phiên, không kiểm tra scope/org | `AccountService.java:226-227` |
| 7 | `TEACHER` là cả role Identity lẫn `profile_type` position | `IdentityDataInitializer.java:55`, `DefaultPositionSeeder.java:71`, `AccessProfileService.java:29` |
| 8 | FE và BE lệch danh mục role gán được | `accounts-page.tsx:42` vs initializer seed list |
| 9 | `PeopleAuthorizationClient` từ chối mọi role khác MANAGER/STAFF | `PeopleAuthorizationClient.java:24` |
| 10 | Role trong `department_member` không đồng bộ với `account_role` | `MemberRepository.java:189-196`, `AccountService.java:226-227` |

### RBAC-06 — ràng buộc nghiệp vụ theo role

| # | Hiện trạng | Bằng chứng |
|---|---|---|
| 1 | Chỉ được gán chức danh cho nhân sự role `STAFF` | `MembershipPolicy.java:67` |
| 2 | Danh sách/xem position chỉ cho OWNER/MANAGER/STAFF | `PositionController.java:14,17,19` |
| 3 | DTO tạo nhân sự chỉ nhận MANAGER/STAFF | `MemberRequest.java` (`@Pattern(regexp="MANAGER|STAFF")`) |
| 4 | FE chỉ cho chọn MANAGER/STAFF | `employee-create-drawer.tsx:40` |
| 5 | Comment seeder phụ thuộc rule role | `DefaultPositionSeeder.java:78` |
| 6 | Test hiện tại khoá hành vi cũ | `MembershipPolicyTest.java` (4 test truyền `"STAFF"`) |

### RBAC-05 — vòng đời quyền

| # | Hiện trạng | Bằng chứng |
|---|---|---|
| 1 | Token là snapshot, TTL tới 900s | `JwtService.java:20,33-40` |
| 2 | Chỉ delegation được làm mới theo request ở People | `DelegatedAuthorityFilter.java` |
| 3 | Assignment/position/module thay đổi không có cơ chế vô hiệu token | Không có version/cache/notification |
| 4 | Đổi role/disable không thu hồi access token | `AccountService.updateRole/updateStatus` |
| 5 | Schedule/Facility không đọc lại quyền | `ScheduleService.SecurityConfig`, `FacilityService.SecurityConfig` (chỉ converter) |

### AUTH-11 — phụ thuộc People

| # | Hiện trạng | Bằng chứng |
|---|---|---|
| 1 | Khi People lỗi, MANAGER/STAFF **không đăng nhập/refresh được** | `PeopleAuthorizationClient.java:20-30`, `AccessProfileService.java:23` |
| 2 | Không cache, không stale, không tín hiệu "quyền đang cũ" | DTO `AccessProfile`, JWT không có claim tương ứng |
| 3 | Timeout 3s connect / 5s read, không retry/circuit breaker | `PeopleAuthorizationClient.java:18` |
| 4 | Không có endpoint nạp lại quyền cho phiên đang chạy | `/users/me/permissions` đọc lại từ People (People phải sống) |

### DEL-01 — audit ủy quyền

| # | Hiện trạng | Bằng chứng |
|---|---|---|
| 1 | Audit chỉ bắt annotation | `DelegationUsageInterceptor.java:52-62` |
| 2 | Duyệt nghỉ việc/chuyển phòng không annotation → không audit | `ResignationController.java:47,54`; `TransferController.java:52,58` |
| 3 | Không phân biệt "vị trí cấp" vs "ủy quyền cấp" tại thời điểm dùng | `requiredPermissions` chỉ so mã quyền |
| 4 | Không có `delegationId` trong ngữ cảnh policy (chỉ có map request attribute) | `GRANTS_ATTRIBUTE` không được policy đọc |

### DEL-03 — nguồn quyền

| # | Hiện trạng | Bằng chứng |
|---|---|---|
| 1 | Mọi quyền ủy quyền bị đánh dấu `delegated` dù position cũng cấp | `EffectivePermissionsService.java:198-204` |
| 2 | Filter xoá toàn bộ `delegatedPermissions` khỏi base rồi cộng grant → thu hồi delegation làm mất quyền position | `DelegatedAuthorityFilter.java:60-64` |
| 3 | Không lưu `sourceType/sourceId` cho từng quyền | `EffectivePermissions` record |

### HR-02 — thông tin đăng nhập tạm

| # | Hiện trạng | Bằng chứng |
|---|---|---|
| 1 | Mật khẩu tạm trả trong body JSON | `AccountProvisioningService.resetPassword`, `AccountService.createAccount/resetPassword` |
| 2 | Không có header `Cache-Control: no-store` đặc thù cho response credential | Controller trả `Map` mặc định |
| 3 | Không có TTL cho mật khẩu tạm (chỉ `must_change_password`) | Schema `account` không có `temp_password_expires_at` |
| 4 | Không có cơ chế activation link (không có SMTP) | Không tồn tại |
| 5 | FE hiển thị 1 lần, không lưu storage (tốt) | `temp-password-dialog.tsx` |
| 6 | Temp password sinh bằng UUID 10 ký tự + `A1!` (yếu hơn khuyến nghị) | `AccountService.java:259` |

---

## 11. Ràng buộc tương thích & dữ liệu legacy

**[Đã có trong code]**

- DB thật có thể đang chứa: `ORG_ADMIN`, `ACADEMIC_STAFF`, `FACILITY_STAFF`, `TEACHER`, `ORG_OWNER`, `OWNER` trong `role` + `account_role`; các dòng `role_permission` legacy.
- `department_member.role` chỉ có 3 giá trị; dữ liệu cũ có thể lệch với `account_role`.
- FE đang chấp nhận `ORG_OWNER` tương đương `OWNER` ở mọi guard.
- Không được phép: xoá role trước khi chuyển dữ liệu; xoá lịch sử `assignment`; xoá assignment chỉ vì đổi role Identity; đổi role của user production.

---

## 12. Điểm cần người dùng quyết định (đưa sang design doc)

1. **Có giữ `MANAGER`/`STAFF` là role đăng nhập không**, hay chuyển hẳn thành nhãn membership và bỏ khỏi `account_role`? (Ảnh hưởng `PeopleAuthorizationClient`, `JwtService`, token converter, FE type.)
2. **`OWNER` hay `ORG_OWNER` là chuẩn**, role nào là alias legacy?
3. **`TEACHER`**: giữ role Identity cho tương thích hay chỉ còn `profile_type`/position, cấp thêm SELF qua role `STAFF` + position?
4. **AccountsPage**: giữ (chỉ SUPER_ADMIN), chuyển nghiệp vụ role sang People, hay bỏ hẳn phần đổi role?
5. **RBAC-05**: chọn A (authz_version), B (cache quyền hiệu lực + TTL/invalidate) hay C (authorization service) — và mức lan truyền sang Schedule/Facility.
6. **AUTH-11**: khi People tạm lỗi, chấp nhận phiên đăng nhập **không quyền** (fail-closed, vẫn vào được hồ sơ) hay **chặn đăng nhập** như hiện tại?
7. **HR-02 dài hạn**: có cần activation link trước khi có SMTP không, hay giữ flow mật khẩu tạm + siết TTL/one-time?
8. **DEL-03**: quyền ủy quyền có tiếp tục chỉ ORGANIZATION không?

Các câu trên **chưa có câu trả lời trong code/tài liệu**; design doc sẽ đề xuất mặc định kèm lý do, nhưng thay đổi hành vi sẽ được ghi rõ để người dùng xác nhận.
