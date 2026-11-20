# PHASE 1 — BÁO CÁO CUỐI: SECURITY & RBAC (MEMS)

> Đầu vào: `docs/audit/PHASE_1_SECURITY_RBAC_CURRENT_STATE.md` (khảo sát) và `docs/audit/PHASE_1_SECURITY_RBAC_DESIGN.md` (thiết kế).
> Tài liệu này ghi **trạng thái thực tế sau khi sửa + test**, các **sai lệch so với thiết kế**, và các điểm còn **OPEN**.
> Ngày hoàn tất: 2026-11-20. Nhánh làm việc: `fixFlowCreateEmployee`. **Chưa commit/push/deploy.**

---

## 1. Tóm tắt điều hành

Phase 1 đã hoàn tất ở mức **mã nguồn + kiểm thử cục bộ** cho 8 mã: AUTH-06, AUTH-10, RBAC-06, RBAC-05, AUTH-11, DEL-01, DEL-03, HR-02.

- Không thêm migration nào (Phase 1 không cần đổi schema).
- Không đổi `.env`, CORS, Gateway, `vercel.json`, URL backend, mật khẩu hay tài khoản production.
- Toàn bộ test backend xanh: Identity 78, People 297, Schedule 10, Facility 7.
- Frontend: `tsc -b` sạch, ESLint 0 lỗi (14 warning cũ), Vitest 170/170.
- Ba điểm còn OPEN (không nằm trong khả năng triển khai hiện tại): link kích hoạt một lần (không có SMTP), TTL mật khẩu tạm (cần migration + quyết định), invalidate cache Identity tức thời (đang dựa vào TTL + revoke session).

---

## 2. Phạm vi & mã trong Phase 1

| Nhóm | Mã | Nội dung |
|---|---|---|
| A | AUTH-06 | Mô hình role chuẩn + catalog + validator |
| A | AUTH-10 | Nguồn sự thật & luồng nghiệp vụ (Identity vs People) |
| A | RBAC-06 | Bỏ ràng buộc nghiệp vụ theo role |
| B | RBAC-05 | Vòng đời quyền: thu hồi có hiệu lực ngay ở People |
| B | AUTH-11 | Hành vi khi People không sẵn sàng |
| C | DEL-01 | Audit khi thực sự dùng quyền ủy quyền |
| C | DEL-03 | Giữ quyền chức danh khi thu hồi ủy quyền |
| D | HR-02 | Bảo vệ thông tin đăng nhập tạm |

Ngoài phạm vi (không sửa): CC-03/04/05/06/08, quyết định enrollment, phòng cấp tổ chức, điểm danh/đổi lịch/định kỳ, tính năng mới.

---

## 3. Trạng thái từng mã

| Mã | Trạng thái | Bằng chứng chính |
|---|---|---|
| AUTH-06 | **DONE** | `RoleCatalog`, `RoleCatalogValidator`, seed alias `ORG_OWNER`, guard `createAccount`/`updateRole`/provision |
| AUTH-10 | **DONE** | Quyền ghi tách Identity/People; đăng ký org ưu tiên `OWNER`; legacy không cấp mới |
| RBAC-06 | **DONE** | `MembershipPolicy` bỏ chặn theo role; `PositionController` đọc bằng `position.view/manage` |
| RBAC-05 | **DONE (giới hạn đã ghi rõ)** | `DelegatedAuthorityFilter` tính lại quyền MANAGER/STAFF mỗi request; fail-closed |
| AUTH-11 | **DONE** | Last-known-good cache + claim `permissionsStale` + banner/resync FE |
| DEL-01 | **DONE** | `@DelegatedAction` + `DelegationUsageInterceptor` ghi audit đủ trường, chỉ khi 2xx + độc quyền ủy quyền |
| DEL-03 | **DONE** | `EffectivePermissions` tách `delegatedPermissions` + `delegationSources`; 7 kịch bản có test |
| HR-02 | **DONE (ngắn hạn)** / **OPEN (dài hạn)** | Entropy 144-bit, `Cache-Control: no-store`, rà soát log; activation link chưa làm |

---

## 4. AUTH-06 / AUTH-10 / RBAC-06 — mô hình role & nguồn sự thật

### 4.1 Đã triển khai

- `backend/IdentityService/src/main/java/com/mems/service/RoleCatalog.java` (mới)
  - Phân lớp: `REQUIRED_ORGANIZATION = OWNER, MANAGER, STAFF, STUDENT`; `REQUIRED_PLATFORM = SUPER_ADMIN`; alias `ORG_OWNER`, `TEACHER`; legacy `ORG_ADMIN`, `ACADEMIC_STAFF`, `FACILITY_STAFF`.
  - `normalize` (owner alias → `OWNER`), `isLegacy`, `sameAccessClass` (EMPLOYEE vs SELF-SERVICE), null-safe.
- `backend/IdentityService/src/main/java/com/mems/config/RoleCatalogValidator.java` (mới): fail-fast khi thiếu role bắt buộc, chạy sau `IdentityDataInitializer`.
- `IdentityDataInitializer`: seed thêm `OWNER` + alias `ORG_OWNER` nếu thiếu (không đổi quyền user hiện hữu).
- `OrganizationRegistrationService`: tìm `OWNER`, fallback `ORG_OWNER`.
- `AccountService`:
  - `createAccount` từ chối role ngoài `RoleCatalog.PLATFORM_CREATABLE`.
  - `updateRole` từ chối SUPER_ADMIN/OWNER/ORG_OWNER/legacy và đổi chéo lớp; đổi cùng lớp thu hồi toàn bộ refresh token.
- `AccountProvisioningService`: chỉ nhận role tạo được qua People; không nhận Owner/legacy.
- `MembershipPolicy.check`: `targetRole` chỉ còn là **nhãn** `{MANAGER, STAFF, OWNER}`; bỏ câu "chỉ thao tác trên STAFF"; giữ subset quyền + ORGANIZATION-position chỉ Owner.
- `PositionController`: đọc `position.view|position.manage` thay cho `hasAnyRole('OWNER','MANAGER','STAFF')`.
- FE `accounts-page.tsx`: tách `CREATE_ROLES` (MANAGER/STAFF/STUDENT/TEACHER) và `FILTER_ROLES` (giữ legacy để tra cứu); dialog đổi role chỉ cho cùng lớp.
- `DefaultPositionSeeder`: sửa comment sang quyền `employee.assign_position`.

### 4.2 Không làm (đúng phạm vi)

- Không xoá role legacy, không migrate `ORG_OWNER → OWNER` trên dữ liệu thật.
- Không đổi `account_role` production; không đổi mật khẩu admin.

---

## 5. RBAC-05 — vòng đời quyền (phương án B)

Đã chọn **B: People tính lại quyền hiệu lực mỗi request** (tương thích JWT hiện tại, không cần bảng version dùng chung).

`backend/PeopleService/src/main/java/com/mems/security/DelegatedAuthorityFilter.java`:

- Token role `MANAGER`/`STAFF` → kiểm tra `activeMember(org,user)`, gọi `EffectivePermissionsService.resolve` **mỗi request**, thay `authorities` + claim `permissions`/`delegatedPermissions`/`permissionScopes`.
- Membership không `ACTIVE`, resolve lỗi, hoặc null ⇒ **fail-closed**: giữ `ROLE_*`, xoá toàn bộ quyền, đặt `permissionsStale=true`. Không fallback về token.
- OWNER/ORG_OWNER/STUDENT/TEACHER giữ token; riêng delegation vẫn đọc lại DB nên thu hồi có hiệu lực ngay.

10 kịch bản của thiết kế §5.2 được phủ bởi: `DelegatedAuthorityFilterTest` (recompute, thu hồi assignment, STAFF→MANAGER, OWNER không recompute, inactive, resolve lỗi), `MembershipPolicyTest` (chéo lớp bị chặn ở Identity), và revoke session trong `AccountService` (disable/lock/đổi role/reset).

**Giới hạn tường minh:** Schedule/Facility vẫn dùng snapshot token ⇒ cửa sổ cũ tối đa bằng TTL access token (mặc định code 300s, xem §13). Đây là giới hạn đã ghi, không phải fail-open.

---

## 6. AUTH-11 — khi People không sẵn sàng

`backend/IdentityService`:

- `client/AccessProfileCache.java` (mới): cache `(orgId,userId)` last-known-good; tươi 60s, hạn cứng 600s, tối đa 10.000 entry.
- `client/PeopleAuthorizationClient.java`: khi People lỗi/response không hợp lệ ⇒ trả bản ghi last-known-good kèm `stale=true`; hết hạn cứng ⇒ profile rỗng (`permissions=∅`, `scopes=∅`, `delegated=∅`) + `stale=true`. Đăng nhập/refresh vẫn thành công.
- `dto/AccessProfile.java`: thêm `Boolean stale`, `isStale()`, `withStale()`, constructor tương thích 3/4/5 tham số.
- `security/JwtService.java`: claim `permissionsStale` (mặc định false).
- Không bao giờ cấp toàn catalog ngoài OWNER/SUPER_ADMIN.

Bảo vệ thực tế: request MANAGER/STAFF tới People vẫn bị tính lại từ DB nên token rỗng/stale không mở quyền; Schedule/Facility thấy quyền rỗng ⇒ 403.

FE:

- `types/session.ts` + `lib/jwt.ts`: đọc `permissionsStale` (thiếu ⇒ false).
- `stores/session-store.ts`: `mergePermissions` xoá cờ stale sau khi nạp lại.
- `layouts/app-shell.tsx`: banner cảnh báo (`role="status"`), tự gọi `authApi.effectivePermissions()` khi stale, thử lại khi trình duyệt có sự kiện `online`; lỗi được bỏ qua để không chặn UI.

---

## 7. DEL-01 — audit khi thực sự dùng quyền ủy quyền

- `security/DelegatedAction.java` (mới): `permission`, `resourceType`, `resourceId` (tên path variable).
- `security/DelegationUsageInterceptor.java`: chỉ ghi khi **handler trả 2xx, không ném lỗi**, và quyền được handler yêu cầu **nằm trong tập quyền độc quyền ủy quyền** do filter đặt (`GRANTS_ATTRIBUTE`).
  - Nguồn quyền được đọc từ `@RequirePermission`, `@PreAuthorize` (chuỗi trong dấu nháy đơn) và `@DelegatedAction`.
  - Audit ghi: `permissionCode`, `delegationId`, `source=DELEGATED`, `action` (method + handler), `resourceType`, `resourceId`, `organizationId`, `timestamp`, `result=SUCCESS`, `context` (path + departmentId nếu có).
  - Lỗi ghi audit bị nuốt để không làm hỏng request đã xử lý.
- Gắn annotation:
  - `ResignationController` approve/reject → `employee.approve_resignation`, `RESIGNATION_REQUEST`, id = `requestId`.
  - `TransferController` approve/reject → `employee.approve_transfer`, `TRANSFER_STEP`, id = `id`.
- Không ghi audit khi quyền đến từ chức danh (dù có ủy quyền trùng), khi response lỗi, khi handler lỗi, hoặc khi thiếu `GRANTS_ATTRIBUTE`.

---

## 8. DEL-03 — giữ quyền chức danh khi thu hồi ủy quyền

`service/EffectivePermissionsService.java`:

- `EffectivePermissions` thêm `Map<String,String> delegationSources` (permission → delegationId), giữ constructor 2/3 tham số.
- `resolve(...)`: `delegatedOnly = grants − positionPermissions`; `permissions` là hợp; scope ORGANIZATION chỉ thêm cho grant; `delegationSources` chỉ chứa quyền độc quyền ủy quyền.
- `activeDelegationGrants`: `ORDER BY d.id` + `putIfAbsent` ⇒ chọn nguồn ổn định khi nhiều ủy quyền cùng cấp một quyền.
- Kéo theo `ResignationApprovalPolicy.directPermissionHolderIds`/`canApproveAny` tự đúng: chỉ coi là "người giữ quyền trực tiếp" khi quyền **không** nằm trong `delegatedPermissions`.

7 kịch bản bắt buộc (thiết kế §8.2) có test tương ứng trong `EffectivePermissionsServiceTest` và `DelegationGrantQueryTest`:

1. Chỉ delegation ⇒ nằm trong `delegatedPermissions` + `delegationSources`.
2. Chỉ position ⇒ không bị đánh dấu delegated.
3. Position + delegation ⇒ không đánh dấu delegated; thu hồi delegation vẫn giữ quyền.
4. Hai delegation cùng quyền ⇒ nguồn ổn định (`d-1`), thu hồi một vẫn còn nguồn kia ở request sau.
5. Thu hồi giữa request ⇒ request kế tiếp mất quyền (filter test).
6. Delegation hết hạn/chưa hiệu lực/bị REVOKED ⇒ không cấp quyền.
7. Audit chỉ ghi khi quyền độc quyền ủy quyền (interceptor test).

---

## 9. HR-02 — bảo vệ thông tin đăng nhập tạm

### 9.1 Đã triển khai (ngắn hạn)

| Biện pháp | Kết quả |
|---|---|
| Entropy | `AccountService.generateTemporaryPassword` chuyển từ UUID 10 ký tự (≈40 bit) sang `SecureRandom` 18 byte Base64URL (24 ký tự, 144 bit) |
| Chống cache | `Cache-Control: no-store` + `Pragma: no-cache` trên mọi response chứa `temporaryPassword`: Identity `POST /api/v1/accounts`, `POST /api/v1/accounts/{id}/reset-password`, `POST /internal/accounts/{id}/reset-password`; People tạo nhân viên, reset mật khẩu nhân viên, tạo giáo viên, tạo tài khoản sinh viên |
| Hiển thị một lần | `TempPasswordDialog` chỉ giữ trong state React, không localStorage/sessionStorage/query string; không đóng vô tình; cảnh báo người dùng |
| Không lưu plaintext | DB chỉ lưu BCrypt; mật khẩu tạm chỉ tồn tại trong RAM của request |
| Buộc đổi lần đầu | `must_change_password=TRUE` ở tạo/reset; `PasswordChangeRequiredFilter` chặn ở cả 4 service, Identity chỉ cho `change-password`/`logout` |
| Giới hạn người xem | Chỉ người có `employee.create`/`employee.reset_password` (hoặc SUPER_ADMIN ở AccountsPage); endpoint nội bộ yêu cầu `X-Internal-Api-Key` |
| Log | Rà soát toàn backend: không có log body/credential; Hibernate `show-sql` chỉ in câu SQL với placeholder `?`, không in giá trị tham số; People audit không chứa mật khẩu |

### 9.2 Chưa triển khai (OPEN)

- **Link kích hoạt một lần**: không có hạ tầng SMTP ⇒ không giả lập, không tuyên bố hoạt động. Cần quyết định + hạ tầng gửi mail.
- **TTL mật khẩu tạm** (`account.temp_password_expires_at`): cần migration mới + quyết định nghiệp vụ; Phase 1 không thêm cột.

---

## 10. Thay đổi backend (file ↔ trách nhiệm)

| File | Trách nhiệm |
|---|---|
| Identity `service/RoleCatalog.java` | Nguồn phân loại role duy nhất |
| Identity `config/RoleCatalogValidator.java` | Fail-fast khi thiếu role bắt buộc |
| Identity `config/IdentityDataInitializer.java` | Seed `OWNER` + alias `ORG_OWNER` |
| Identity `service/OrganizationRegistrationService.java` | Gán `OWNER` khi đăng ký org |
| Identity `service/AccountService.java` | Guard tạo/đổi role; temp password 144-bit |
| Identity `service/AccountProvisioningService.java` | Guard role khi People provision |
| Identity `dto/AccessProfile.java` | Cờ `stale` + tương thích constructor |
| Identity `client/AccessProfileCache.java` | Last-known-good 60s/600s |
| Identity `client/PeopleAuthorizationClient.java` | Fail-closed/stale khi People lỗi |
| Identity `service/AccessProfileService.java` | Định tuyến nguồn quyền theo role |
| Identity `security/JwtService.java` | Claim `permissionsStale`, TTL mặc định 300s |
| Identity `controller/AccountController.java` | No-store cho response mật khẩu tạm |
| Identity `controller/InternalAccountController.java` | No-store cho reset nội bộ |
| People `security/DelegatedAuthorityFilter.java` | Recompute quyền + thu hồi tức thời |
| People `security/DelegatedAction.java` | Khai báo quyền policy-decided cho audit |
| People `security/DelegationUsageInterceptor.java` | Audit `DELEGATION_PERMISSION_USED` |
| People `service/EffectivePermissionsService.java` | `delegatedOnly` + `delegationSources` + `activeMember` |
| People `service/MembershipPolicy.java` | Bỏ chặn theo role, giữ subset + scope |
| People `controller/PositionController.java` | Đọc position bằng quyền |
| People `controller/ResignationController.java` | `@DelegatedAction` duyệt nghỉ việc |
| People `controller/TransferController.java` | `@DelegatedAction` duyệt chuyển phòng |
| People `controller/DepartmentMemberController.java` | No-store tạo/reset nhân viên |
| People `controller/TeacherController.java` | No-store tạo giáo viên |
| People `controller/StudentController.java` | No-store tạo tài khoản sinh viên |
| People `service/DefaultPositionSeeder.java` | Comment đúng cơ chế quyền |

---

## 11. Thay đổi frontend

| File | Trách nhiệm |
|---|---|
| `types/session.ts` | `permissionsStale?: boolean` |
| `lib/jwt.ts` | Parse claim, mặc định false |
| `stores/session-store.ts` | Xoá cờ stale sau khi merge quyền |
| `layouts/app-shell.tsx` | Banner cảnh báo + tự resync khi stale/online |
| `features/platform/pages/accounts-page.tsx` | Tạo mới chỉ MANAGER/STAFF/STUDENT/TEACHER; đổi role cùng lớp |
| `features/platform/types.ts` | Nhãn/kiểu role cập nhật theo catalog |

Không đổi router, không đổi cấu hình build/deploy, không đổi URL API.

---

## 12. Kiểm thử & bằng chứng chạy

| Bộ | Kết quả | Ghi chú |
|---|---|---|
| Identity (`IdentityService`, `./mvnw -o test`) | **78/78 BUILD SUCCESS** | Thêm `RoleCatalogTest` (5), `RoleCatalogValidatorTest` (2), `PeopleAuthorizationClientTest` (5), `AccessProfileServiceTest` (3), `AccountServiceTest` +4 |
| People (`PeopleService`, `./mvnw -o test`) | **297/297 BUILD SUCCESS** | Thêm `DelegationUsageInterceptorTest` (9), `DelegationGrantQueryTest` (3), `CredentialCacheHeadersTest` (2), `EffectivePermissionsServiceTest` +3, `DelegatedAuthorityFilterTest` +7 |
| Schedule (`ScheduleService`) | **10/10 BUILD SUCCESS** | Không sửa |
| Facility (`FacilityService`) | **7/7 BUILD SUCCESS** | Không sửa |
| Frontend `npx tsc -b` | Exit 0 | |
| Frontend `npm run lint` | 0 error, 14 warning | Warning `react-hooks/set-state-in-effect` có từ trước, không thuộc Phase 1 |
| Frontend `npm test -- --run` | **170/170** (31 file) | Thêm test parse `permissionsStale` |

Test trọng tâm theo yêu cầu Phần F:

- Đăng nhập/refresh/token: giữ nguyên hành vi, bổ sung phủ định dạng role legacy và chéo lớp.
- Quyền hiệu lực: recompute, thu hồi, fail-closed, OWNER không recompute.
- Delegation: 7 kịch bản DEL-03 + audit DEL-01.
- Credential: response có `temporaryPassword` luôn `no-store`; entropy ≥ 20 ký tự URL-safe.
- FE: cờ stale, dialog mật khẩu một lần, dropdown role.

---

## 13. Sai lệch so với thiết kế (đã cân nhắc)

1. **Cache Identity**: thiết kế ghi "30s + invalidate khi updateRole/updateStatus/resetPassword/provision". Triển khai: **tươi 60s, hạn cứng 600s, không gọi invalidate**.
   - Lý do: (a) `updateRole`/`updateStatus(disabled|locked)`/reset đều **thu hồi refresh token** nên phiên cũ không refresh được; (b) quyền MANAGER/STAFF ở People luôn được tính lại từ DB nên cache của Identity chỉ ảnh hưởng service khác trong tối đa TTL; (c) thêm invalidate chéo service cần thêm lời gọi nội bộ, làm tăng bề mặt lỗi.
   - Hệ quả: nếu token đã cấp trước khi đổi role còn hạn, Schedule/Facility có thể thấy quyền cũ ≤ 300s (giới hạn đã ghi ở §5).
2. **TTL access token**: hạ **mặc định trong code** 900s → 300s (`jwt.access-token-seconds:300`). Không sửa biến môi trường đang chạy.
3. **`must_change_password`**: xác thực vẫn thành công nhưng mọi API nghiệp vụ trả 403 cho tới khi đổi; không chặn ở tầng đăng nhập (đúng thiết kế).
4. **Không thêm endpoint reload quyền**: FE dùng refresh token hiện có + resync qua `/users/me/permissions` khi stale.
5. **Không chuyển `ORG_OWNER` về `OWNER` trong dữ liệu**: giữ alias, đúng thiết kế §2.2c.

---

## 14. Điểm cần người dùng quyết định / OPEN

| # | Vấn đề | Trạng thái |
|---|---|---|
| 1 | AccountsPage: giữ relabel cùng lớp hay chuyển read-only? | Đang giữ relabel cùng lớp (mặc định an toàn) |
| 2 | Stale window 10 phút của AUTH-11 có chấp nhận? | Đang dùng 10 phút |
| 3 | TTL mật khẩu tạm (`temp_password_expires_at`) | **OPEN** — cần migration + quyết định |
| 4 | Link kích hoạt một lần | **OPEN** — không có SMTP, không giả lập |
| 5 | Migration `ORG_OWNER → OWNER` | **OPEN** — chỉ cân nhắc cho DB test |
| 6 | Tài khoản thật đang giữ role legacy | Giữ nguyên, không đổi quyền đột ngột |

---

## 15. Rủi ro còn lại & giới hạn đã biết

- **Cửa sổ token ở Schedule/Facility**: tối đa 300s (mặc định mới) sau khi thu hồi quyền; giảm bằng cách hạ TTL qua biến môi trường khi vận hành.
- **Cache Identity 60s**: nếu People đổi quyền của một MANAGER/STAFF và Identity còn cache, token mới có thể mang quyền cũ ≤ 60s; People tự tính lại nên thao tác trên tài nguyên People vẫn đúng.
- **Audit delegation**: chỉ ghi cho endpoint có `@RequirePermission`/`@PreAuthorize`/`@DelegatedAction`. Endpoint policy-decided mới thêm sau này phải gắn `@DelegatedAction`, nếu không sẽ không có audit.
- **HR-02**: mật khẩu tạm không có TTL; nếu HR không bàn giao, mật khẩu vẫn dùng được tới khi đổi hoặc tài khoản bị disable.
- **Chưa chạy E2E live** (DB/container production): theo ràng buộc dự án, chỉ xác minh bằng unit/integration test cục bộ.

---

## 16. Tuân thủ ràng buộc

- Không deploy, không commit, không push, không merge, không force-push.
- Không sửa `.env`, `vercel.json`, URL backend, CORS, biến môi trường môi trường chạy.
- Không restart container production, không chạy migration production, không xoá DB/volume, không reset dữ liệu.
- Không sửa mật khẩu/tài khoản admin production.
- Không tạo migration nào trong Phase 1.
- Không xoá/khôi phục/stage hai file lạ `-p` và `Facility)`.

---

## 17. Kết luận & bước tiếp theo

Phase 1 đạt mục tiêu: mô hình role được chuẩn hoá, quyền hiệu lực phản ánh dữ liệu hiện tại ở nơi ra quyết định, hành vi khi People sập là fail-closed có kiểm soát, audit ủy quyền trung thực, và credential tạm được bảo vệ ở mức ngắn hạn.

Bước tiếp theo đề xuất (cần người dùng duyệt trước khi làm):

1. Quyết định TTL mật khẩu tạm + viết migration file-only cho `temp_password_expires_at`.
2. Quyết định có triển khai activation link (cần hạ tầng gửi mail).
3. Cân nhắc thêm invalidate cache Identity nếu muốn thu hồi tức thời ở Schedule/Facility.
4. Khi được duyệt triển khai: chạy regression trên môi trường test, rồi mới commit/push theo quy trình.
