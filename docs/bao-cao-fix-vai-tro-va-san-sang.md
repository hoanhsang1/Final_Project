# MEMS — Sửa chức năng thiếu theo vai trò & mức sẵn sàng triển khai

> Phạm vi: toàn bộ 10 nguyên nhân nghi vấn trong yêu cầu “FIX MISSING FEATURES FOR ALL ROLES”.
> Ma trận đối chiếu ban đầu: [`docs/role-function-matrix.md`](./role-function-matrix.md).
> Thời điểm kiểm chứng: 2026-11-16. Không migrate DB live, không restart container live,
> không commit/push.

## 1. Kết luận nhanh

- **Frontend:** 26 file / **126 test pass** (`npx vitest run`), `tsc -b` sạch.
- **PeopleService:** **201 test pass** (`./mvnw -o clean test`), gồm 3 test mới cho lỗi bổ nhiệm
  Tổng quản lý.
- **IdentityService:** các test trọng tâm `OrganizationModuleServiceTest`,
  `PermissionCatalogTest` pass.
- **Stack nguồn (test DB 3307):** các endpoint mới trả dữ liệu thật; một mutation tự phục vụ
  và một chu trình bổ nhiệm → ủy quyền → thu hồi → bãi nhiệm đã chạy end-to-end.
- **Còn 3 chức năng chưa thể làm** vì backend chưa có API: nhật ký tổ chức (theo tổ chức),
  điểm danh, yêu cầu đổi lịch. Sidebar hiển thị đúng nhãn “Cần backend”, không dùng dữ liệu giả.

## 2. Nguyên nhân gốc và cách sửa

| # | Nguyên nhân | Trạng thái | Cách sửa |
|---|---|---|---|
| 1 | Sidebar/menu lấy quyền từ JWT cũ, không làm mới sau khi gán chức vụ/ủy quyền | ✅ | Hydrate lại `/users/me/permissions`, `/api/v1/modules/status`, `/users/me/approval-capabilities`; cập nhật `session-store` sau mỗi mutation quyền |
| 2 | Module bị tắt/khóa làm ẩn cả chức năng đọc; mảng rỗng bị suy thành “không có module” | ✅ | Phân biệt `active`/`disabled`/`locked`/`not_registered`; chỉ `not_registered` ẩn mục; `disabled`/`locked` vẫn đọc, `canWriteModule()` chặn ghi |
| 3 | Nhầm role với vị trí và mã quyền (MANAGER bị coi là có quyền quản lý) | ✅ | Bỏ mọi shortcut theo role; nút duyệt dựa trên capability/policy thật |
| 4 | Scope ORGANIZATION/DEPARTMENT xử lý sai (dùng quyền org cho phòng khác) | ✅ | `transferTargets()` đọc toàn tổ chức; kiểm tra scope ở `Actor`/`RequirePermission`; migration 39 chỉnh scope giáo viên/trưởng phòng |
| 5 | Quyền ủy quyền không được hiển thị/không có hiệu lực | ✅ | Trả `delegatedPermissions` trong `/users/me/permissions`; chỉ Tổng quản lý có ủy quyền còn hiệu lực mới duyệt (`ResignationApprovalPolicy.hasDelegatedPermission`) |
| 6 | Chính sách duyệt của trưởng phòng không phản ánh lên UI | ✅ | `GET /users/me/approval-capabilities`; sidebar “Hộp việc chờ” và route mặc định dựa trên `approvals.any` |
| 7 | Giáo viên thiếu trang tự phục vụ (lớp của tôi) | ✅ | `MyClassesPage` dùng `/classes/me`, `/teachers/me`, `/teachers/me/classes` |
| 8 | Nhân viên thiếu trang gửi yêu cầu nghỉ việc/chuyển phòng | ✅ | `MyRequestsPage` dùng `/users/me/resignation-requests`, `/users/me/transfer-requests`, `/users/me/transfer-departments` |
| 9 | Bản triển khai cũ hơn source | ⚠️ | Đã ghi bằng chứng (mục 7); **không** nới quyền để che lỗi. Cần rebuild & deploy |
| 10 | **Lỗi mới phát hiện khi kiểm chứng:** bổ nhiệm Tổng quản lý ghi assignment nhưng trả 404 | ✅ | `findPositionId` nâng chức danh cũ lên scope `ORGANIZATION`; `addAssignment` chỉ coi assignment còn hiệu lực là “đã có”. Thêm `GeneralManagerRepositoryTest` |

## 3. Menu / route / action đã đổi

- `lib/nav.ts`: quyết định hiển thị theo **role + quyền hiệu lực + scope + module + capability**;
  thêm `canWriteModule`, `visibleItemIdsFor(workspace)`.
- `app.tsx` + `routes/`: thêm `/lop-cua-toi`, `/yeu-cau-cua-toi`, route mặc định theo vai trò
  (`AcademicLanding`); route trực tiếp vẫn qua `PermissionGuard`/`WorkspaceGuard`.
- `approvals-page.tsx`: chỉ hiện tab duyệt khi capability tương ứng bật; không suy từ role.
- `use-nav-badges`: badge chờ duyệt chỉ gọi API khi có capability.

## 4. API đã tích hợp trong đợt này

| API | Service | Dùng ở |
|---|---|---|
| `GET /api/v1/modules/status` | Identity | Hydrate trạng thái module cho mọi vai trò |
| `GET /users/me/permissions` | People | Quyền hiệu lực + `delegatedPermissions` |
| `GET /users/me/approval-capabilities` | People | Nút/tab duyệt, route mặc định |
| `GET/POST /users/me/resignation-requests` | People | `MyRequestsPage` |
| `POST /users/me/transfer-requests` | People | `MyRequestsPage` |
| `GET /users/me/transfer-departments` | People | Chọn phòng đích (toàn tổ chức) |
| `GET /classes/me`, `GET /classes/me/{id}/students` | People | `MyClassesPage` |
| `GET /teachers/me`, `GET /teachers/me/classes` | People | `MyClassesPage` |
| `GET/POST /delegations`, `POST /delegations/{id}/revoke` | People | `DelegationsPage` + refresh capability |
| `GET/POST/DELETE /general-manager` | People | `DelegationsPage` + refresh capability |

Gateway đã có route tương ứng (`/users/**`, `/api/delegations/**`, `/api/general-manager/**`,
`/api/v1/modules/**`) nên FE gọi đúng tiền tố hiện tại.

## 5. Kiểm thử

### 5.1 Tự động

| Bộ | Kết quả | Ghi chú |
|---|---|---|
| Frontend (`vitest`) | 26 file / 126 test pass | Gồm test mới: `my-classes-page`, `my-requests-page`, `academic-landing`, nav module/capability |
| PeopleService (`clean test`) | **201 test pass** | Gồm `GeneralManagerRepositoryTest` (3), `DepartmentServiceTest` (1), `ResignationServiceTest` (+3) |
| IdentityService (trọng tâm) | pass | `statusForMember` trả cả module `not_registered`; catalog quyền |

### 5.2 Kiểm chứng trên stack nguồn với dữ liệu thật

Chạy Identity (18081) + People (18082) từ **source**, trỏ test DB 3307, secret JWT tạm do
phiên này sinh (không phải secret live). Token ký bằng secret tạm cho đúng `userId` đang có
trong DB; **không** ghi SQL trực tiếp vào DB.

| Kịch bản | Kết quả thật |
|---|---|
| `GET /api/v1/modules/status` (OWNER) | 200, trả cả module `not_registered` (EQUIPMENT/FACILITY/ROOM) |
| `GET /users/me/permissions` với JWT **rỗng quyền** | 200, trả 15 quyền phòng ban + `employee.approve_resignation` trong `delegatedPermissions` → chứng minh BE tự resolve từ DB, không tin JWT |
| `GET /teachers/me`, `/teachers/me/classes`, `/classes/me` (giáo viên) | 200, đúng hồ sơ GV001 và 2 lớp |
| `GET /users/me/approval-capabilities` (giáo viên / OWNER) | `false...` / `true...` đúng policy |
| Tạo yêu cầu nghỉ việc tự phục vụ | **201** → OWNER từ chối **200** → `GET /users/me/resignation-requests` thấy `REJECTED` |
| Bổ nhiệm Tổng quản lý | **201**, danh sách GM có người vừa bổ nhiệm; capability chuyển `resignation: true` |
| Tạo ủy quyền → thu hồi | **201** → **200** (`status REVOKED`) |
| Bãi nhiệm Tổng quản lý | **204**, danh sách rỗng, capability trở lại `false` |
| Chặn sai quyền | Nhân sự đã nghỉ: `GET /departments/{id}/resignation-requests` → **403** `Missing permission in scope: employee.view`; `GET /classes` → **403** |
| Phân quyền theo phòng | Giáo viên không còn membership phòng: `GET /classes` → **403** `Missing permission in scope: class.view` |

### 5.3 Giới hạn kiểm thử (nói rõ, không thay bằng build PASS)

- Không đăng nhập được bằng **mật khẩu** tài khoản mẫu: mật khẩu đã bị đổi bởi các đợt E2E
  trước, và thao tác ghi DB để đặt lại bị cấm (“Không tự migrate DB live”). Vì vậy phần
  “tài khoản thật” được kiểm ở tầng API bằng token hợp lệ ký bởi secret của stack nguồn cho
  đúng user trong DB, không phải bằng form đăng nhập.
- Chưa kiểm thử trình duyệt thật với tài khoản thật (cùng lý do trên); hành vi UI theo vai trò
  được phủ bằng test component + mock adapter mô phỏng đúng shape backend.

## 6. Lỗi scope/ủy quyền đã sửa

- `DepartmentService.transferTargets()` trả toàn bộ phòng ban của tổ chức, không đòi
  `department.view` (nhân viên vẫn chọn được phòng đích khi chuyển công tác).
- Kiểm tra scope ở `Actor.requirePermissionIn`/`hasPermissionIn`: quyền `DEPARTMENT:<id>`
  không dùng được cho phòng khác.
- Migration 39: bổ sung quyền tự phục vụ + scope phòng ban cho giáo viên/trưởng phòng.
- `ResignationApprovalPolicy`: ưu tiên HR phòng → trưởng phòng → Tổng quản lý có ủy quyền →
  OWNER; không bao giờ tự duyệt; ủy quyền chỉ có hiệu lực khi người nhận là Tổng quản lý.
- `GeneralManagerRepository`: chuẩn hóa scope chức danh cũ và chỉ tính assignment còn hiệu lực.

## 7. Nguồn vs triển khai (deployment readiness)

**Bằng chứng bản live cũ hơn source** (đo trên cổng 8080 của bản đang chạy):

- JWT live dùng mã quyền **UPPERCASE** (`CLASS_VIEW`), không có `permissionScopes`,
  `departmentId`, `delegatedPermissions`.
- Các endpoint mới trả **404** trên live: `/api/v1/modules/status`,
  `/users/me/approval-capabilities`, `/users/me/resignation-requests`,
  `/users/me/transfer-departments`, `/classes/me`, `/teachers/me`.

**Kết luận:** source đã sẵn sàng (test xanh, API chạy thật); live **chưa**. Việc cần làm khi
được phép deploy: build lại Identity/People/Gateway, chạy migration 39, khởi động lại cụm,
rồi đăng nhập lại để JWT mới có `permissionScopes`/`delegatedPermissions`. Không thay đổi
logic phân quyền để “vá” bản live cũ.

## 8. Báo cáo theo vai trò

> “Đã kiểm thử” ghi rõ mức: **API thật** = chạy trên stack nguồn với dữ liệu DB;
> **Test** = unit/component; **—** = chưa có API để làm.

| Vai trò | Chức năng hợp lệ | Đã hiển thị | Đã kiểm thử | Còn thiếu |
|---|---|---|---|---|
| **OWNER** | Toàn bộ quản trị tổ chức, duyệt nghỉ việc/chuyển phòng/đóng lớp, bổ nhiệm & ủy quyền, module, quyền hiệu lực | Dashboard, phòng ban, chức vụ, nhân sự, lớp, lịch, module, ủy quyền/GM, hộp việc chờ, yêu cầu tự phục vụ | API thật: module status, quyền hiệu lực, duyệt yêu cầu, bổ nhiệm/ủy quyền/thu hồi/bãi nhiệm; Test UI | Nhật ký tổ chức (thiếu API theo org) |
| **Tổng quản lý (được ủy quyền)** | Chỉ các quyền trong ủy quyền còn hiệu lực; duyệt theo policy | Menu theo `delegatedPermissions` + capability; trang ủy quyền của tôi | API thật: capability bật/tắt theo bổ nhiệm & ủy quyền; Test UI | — |
| **HR tổ chức / HR phòng ban** | Tạo/sửa nhân sự, gán chức vụ, tạo & duyệt yêu cầu nghỉ việc trong phòng | Nhân sự, chức vụ, hộp việc chờ, module | Test (scope `DEPARTMENT`/`ORGANIZATION`); API thật: 403 khi thiếu `employee.view` | Điểm danh, đổi lịch (thiếu API) |
| **Trưởng phòng** | Bổ sung/duyệt trong phòng; duyệt nghỉ việc/đóng lớp theo thứ tự leo thang | Hộp việc chờ + nút duyệt chỉ khi capability | Test policy (17 test `ResignationApprovalPolicy`); API thật: capability false khi membership không hoạt động | — |
| **Giáo viên** | Lớp được phân công, học sinh trong lớp, gửi yêu cầu nghỉ việc/chuyển phòng cho mình | “Lớp của tôi”, “Yêu cầu của tôi” | API thật: `/teachers/me`, `/classes/me`; Test UI + route | Điểm danh, đổi lịch (thiếu API) |
| **Nhân viên** | Tự gửi yêu cầu nghỉ việc/chuyển phòng; xem trạng thái | “Yêu cầu của tôi” | API thật: tạo 201 → duyệt/từ chối → xem lại; Test UI | — |
| **Sinh viên** | Xem thông tin của mình (quyền `SELF` trong JWT) | Landing hồ sơ, mục tự phục vụ phù hợp | Test route/landing | Các màn học vụ chuyên biệt chưa có API |
| **SUPER_ADMIN** | Quản trị nền tảng, khóa module tổ chức, audit toàn hệ thống | Module/khóa, audit (toàn hệ thống) | Test UI module lock | — |

## 9. Việc còn lại (đúng thứ tự)

1. Deploy bản mới (Identity/People/Gateway + migration 39) rồi đăng nhập lại; kiểm tra JWT mới
   có `permissionScopes` và `/users/me/permissions` trả đúng.
2. Nếu cần “Nhật ký tổ chức”: bổ sung API audit theo `orgId` + `org.audit.view`.
3. Nếu cần điểm danh/đổi lịch: bổ sung controller ở ScheduleService trước khi làm UI.
4. Chạy lại kịch bản tài khoản thật bằng mật khẩu khi có thông tin đăng nhập hợp lệ.
