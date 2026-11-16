# PHẦN 6 — Bổ nhiệm Tổng quản lý và ủy quyền (quy tắc 3, 7)

> Phạm vi: chỉ thêm năng lực ủy quyền + bổ nhiệm Tổng quản lý. Không sửa nghiệp vụ
> phòng ban / chức vụ / lớp học ngoài phần bắt buộc để nối quyền hiệu lực.

## 1. Tóm tắt

- Owner bổ nhiệm **Tổng quản lý** bằng một chức danh phạm vi `ORGANIZATION` tên
  `Tổng quản lý` (tự tạo nếu chưa có). Chức danh này **không kèm quyền**.
- Owner tạo **ủy quyền**: người nhận (Tổng quản lý) + danh sách mã quyền + thời
  hạn (có thể không đặt hạn) + lý do. Chỉ Owner tạo/sửa/thu hồi.
- Quyền ủy quyền được cộng vào **quyền hiệu lực** và đánh dấu nguồn `DELEGATED`
  trong `EffectivePermissionsResponse` và claim JWT `delegatedPermissions`.
- **Thu hồi/chỉnh sửa/hết hạn có hiệu lực ngay** ở PeopleService: một filter đọc
  lại bảng `delegation` ở mỗi request, bỏ quyền ủy quyền cũ trong token rồi cộng
  quyền còn hiệu lực từ DB.
- Audit ghi cho tạo/sửa/thu hồi ủy quyền, bổ nhiệm/bãi nhiệm Tổng quản lý, và
  cho mỗi request thành công có dùng quyền ủy quyền (`DELEGATION_PERMISSION_USED`).
- Cấm ủy quyền lại (chỉ Owner được tạo), cấm tự ủy quyền cho mình, cấm tự nâng
  quyền bằng cách sửa chức danh của chính mình.

## 2. Migration

`25_people_delegation.sql` (chạy trên `mems_people_db`, idempotent, không xoá dữ liệu):

| Bảng | Cột chính |
|---|---|
| `delegation` | `id`, `org_id`, `delegator_id`, `delegate_id`, `scope='ORGANIZATION'`, `effective_from`, `effective_to` (NULL = vô hạn), `status` (`ACTIVE`/`REVOKED`), `reason`, `created_by/at`, `revoked_by/at/reason` |
| `delegation_permission` | `(delegation_id, permission_code)` — PK, FK cascade |

Ràng buộc: `CHECK` cho `status`/`scope`/khoảng thời gian; index theo
`(org_id, delegate_id, status)` và `(org_id, delegator_id, status)`.
Thu hồi **không xoá cứng** để giữ lịch sử.

Fixture test H2 tương ứng: `backend/PeopleService/src/test/resources/people-test-schema.sql`.

## 3. Cách quyền ủy quyền đi vào quyền hiệu lực

1. Login/refresh: Identity gọi People `GET /internal/users/{id}/authorization`
   → `AuthorizationResponse` có thêm `delegatedPermissions`.
2. `JwtService` phát claim `delegatedPermissions` (danh sách mã đến từ ủy quyền).
3. `EffectivePermissionsService.resolve` cộng quyền ủy quyền còn hiệu lực với
   scope `ORGANIZATION`; quyền không hỗ trợ `ORGANIZATION` bị loại.
4. Mỗi request vào PeopleService: `DelegatedAuthorityFilter` bỏ các quyền nằm
   trong `delegatedPermissions` của token, đọc lại DB (`activeDelegationGrants`),
   cộng quyền còn hiệu lực, cập nhật lại authorities + claim
   `permissions`/`permissionScopes`/`delegatedPermissions` trong SecurityContext.
5. `DelegationUsageInterceptor` ghi audit khi handler thành công và quyền mà
   handler yêu cầu (`@RequirePermission` hoặc chuỗi trong `@PreAuthorize`) trùng
   với quyền ủy quyền đã dùng.

## 4. API

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/general-manager` | OWNER | Danh sách Tổng quản lý đang hiệu lực |
| GET | `/general-manager/candidates` | OWNER | Nhân sự ACTIVE (trừ OWNER) để bổ nhiệm |
| POST | `/general-manager` | OWNER | Bổ nhiệm; tạo chức danh nếu chưa có |
| DELETE | `/general-manager/{userId}` | OWNER | Bãi nhiệm + thu hồi mọi ủy quyền còn hiệu lực |
| GET | `/delegations?activeOnly=` | OWNER | Danh sách ủy quyền (tất cả/đang hiệu lực) |
| GET | `/delegations/me` | Đã đăng nhập | Ủy quyền đang dành cho chính mình |
| POST | `/delegations` | OWNER | Tạo ủy quyền |
| PUT | `/delegations/{id}` | OWNER | Điều chỉnh quyền/hạn/lý do |
| POST | `/delegations/{id}/revoke` | OWNER | Thu hồi |

Gateway: thêm route `people-delegations-api` và `people-general-manager-api` cho
`/api/delegations/**` và `/api/general-manager/**` (StripPrefix=1). FE gọi qua
`/api/...` để dùng chung proxy Vite/Vercel.

Mã lỗi mới: `DELEGATION_NOT_FOUND` … `DELEGATION_SCOPE_NOT_SUPPORTED`
(2401–2411), `SELF_ESCALATION_NOT_ALLOWED` (2408).

## 5. Audit

| Action | Khi nào |
|---|---|
| `GENERAL_MANAGER_POSITION_CREATED` | Chức danh Tổng quản lý được tạo tự động |
| `GENERAL_MANAGER_APPOINTED` | Bổ nhiệm thành công |
| `GENERAL_MANAGER_REVOKED` | Bãi nhiệm thành công |
| `DELEGATION_CREATED` | Tạo ủy quyền |
| `DELEGATION_UPDATED` | Điều chỉnh ủy quyền |
| `DELEGATION_REVOKED` | Thu hồi (đơn lẻ hoặc do bãi nhiệm) |
| `DELEGATION_PERMISSION_USED` | Request 2xx có dùng quyền ủy quyền |

`DELEGATION_PERMISSION_USED` ghi `target_id = delegationId`, details gồm mã quyền,
method, path, handler.

## 6. Frontend

- `/to-chuc/uy-quyen` (menu Owner "Ủy quyền"):
  - Bảng Tổng quản lý + modal bổ nhiệm/bãi nhiệm.
  - Bảng ủy quyền (người nhận, quyền, hiệu lực, trạng thái, lý do) + tạo/sửa/thu hồi.
  - Chọn quyền **nhóm theo module**; thời hạn 7/30/90 ngày, không đặt hạn, hoặc
    chọn ngày kết thúc.
- `/uy-quyen` (mọi tài khoản đã đăng nhập): Tổng quản lý xem rõ quyền nào được
  ủy quyền cho mình, người ủy quyền, hiệu lực, lý do.
- `RolePreviewPage` có nút "Xem quyền được ủy quyền" để người không có menu console
  vẫn tìm được trang.

## 7. DoD

| # | Mục | Kết quả |
|---|---|---|
| 1 | Tổng quản lý mới bổ nhiệm, chưa ủy quyền, không làm được thao tác quản lý cao cấp | ✅ Chức danh 0 quyền; `resolve` không cộng gì khi không có delegation |
| 2 | Thu hồi/hết hạn bị chặn ngay | ✅ Filter đọc DB mỗi request; test `DelegatedAuthorityFilterTest` + `activeDelegationGrants` |
| 3 | Không ủy quyền lại, không tự nâng quyền | ✅ `requireOwner` + `DELEGATION_RE_DELEGATION_FORBIDDEN` + `SELF_ESCALATION_NOT_ALLOWED` trong `MemberService.updatePositions` |
| 4 | Có audit log | ✅ 7 action ở mục 5; `DelegationServiceTest`/`GeneralManagerServiceTest` kiểm chứng |

## 8. Kiểm thử đã chạy

- `backend/PeopleService`: `mvn -o test` → **150 test pass**.
- `backend/IdentityService`: `mvn -o test` → **5 test pass**.
- `backend/APIGateway`: `mvn -o compile` → pass.
- `frontend`: `npm run build` → pass; `npm test -- --run` → **144 test pass**.

## 9. Điểm chưa chốt / cần xác nhận

1. **Tên chức danh**: `GeneralManagerService.GENERAL_MANAGER_POSITION_NAME = "Tổng quản lý"`
   là giả định (có `TODO(PHẦN 6)`). Tổ chức dùng tên khác thì đổi hằng số này.
2. **Phạm vi ủy quyền**: chỉ hỗ trợ `ORGANIZATION`. Ủy quyền theo phòng ban chưa làm.
3. **Hiệu lực tức thời ngoài PeopleService**: ScheduleService/FacilityService vẫn
   kiểm quyền theo token đã phát; quyền bị thu hồi ở đó chỉ mất khi refresh
   (≤ 15 phút). Giải pháp đầy đủ cần filter tương tự ở các service này.
4. **Audit dùng quyền ủy quyền** chỉ bắt các handler có `@RequirePermission` hoặc
   `@PreAuthorize` ở PeopleService. Quyết định nằm sâu trong service (ví dụ bước
   duyệt chuyển phòng) không tự sinh audit nếu service không ghi.
5. **Module phòng ban không chặn ủy quyền**: quyền ủy quyền chỉ kiểm
   `allowedScopes` chứa `ORGANIZATION`, không kiểm module — vì ủy quyền là quyết
   định cấp tổ chức của Owner. Nếu muốn áp quy tắc module, cần bổ sung ở
   `DelegationService`/`EffectivePermissionsService`.
6. **Bãi nhiệm = thu hồi mọi ủy quyền** (quyết định thiết kế, không có trong prompt).
   Đổi hành vi cần sửa `GeneralManagerService.remove`.
7. **authStore của FE không tự cập nhật quyền** sau khi Owner sửa ủy quyền; trang
   `/uy-quyen` đọc lại từ BE. Console sẽ thấy menu mới sau refresh token.
