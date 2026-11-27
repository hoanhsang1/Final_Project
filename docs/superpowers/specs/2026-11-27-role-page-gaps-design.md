# Thiết kế: vá lỗ hổng page theo vai trò (P0 → P1)

- Ngày: 2026-11-27
- Trạng thái: chờ duyệt
- Phạm vi: FE only; ưu tiên P0 (role bị kẹt) rồi P1 (page/menu thiếu)
- Không commit/push/merge; không đổi BE/contract/seed/migration; không đổi build/lint/CI/dependency

## Intent / why

Rà soát route/menu/role gate cho thấy hệ thống có đủ console cho `SUPER_ADMIN`, `OWNER` và
luồng self của `TEACHER`/`STUDENT`, nhưng có 4 lỗ hổng làm người dùng không tới được page
dù backend đã cấp quyền:

1. Token runtime vẫn mang **mã quyền legacy UPPERCASE** (`CLASS_READ`, `PEOPLE_READ`,
   `SCHEDULE_READ`, `FACILITY_READ`, …) bên cạnh mã dotted mới (`class.view`, …). FE chỉ
   hiểu dotted và một vài UPPERCASE, nên `ACADEMIC_STAFF`/`ORG_ADMIN`/`FACILITY_STAFF` bị
   chặn ở `AcademicGuard` hoặc rơi vào thông báo "vai trò chưa có màn hình".
2. `FACILITY_STAFF` có quyền facility nhưng page facility nằm sau `OwnerGuard`; menu
   `/dao-tao` lại không có mục facility → đăng nhập xong không có cửa vào nào.
3. `/dao-tao` redirect chỉ xét `canViewTeachers`; user có `class.view`/`student.view`/
   `schedule.view` nhưng không có `PEOPLE_VIEW` bị đẩy vào self home = `ForbiddenNotice`.
4. `STUDENT` có "Lớp của tôi" dạng danh sách nhưng không có màn chi tiết như `TEACHER`.

## Evidence (kiểm chứng read-only)

DB `mems_identity_db` (SELECT only, không mutate):

| Role code | Quyền từ `role_permission` | Hệ quả FE hiện tại |
|---|---|---|
| `ACADEMIC_STAFF` | chỉ `CLASS_READ/WRITE`, `PEOPLE_READ/WRITE`, `SCHEDULE_READ/WRITE`, `REPORT_READ` | `canAccessAcademicArea()` = false → không vào `/dao-tao` |
| `ORG_ADMIN` | legacy `CLASS_*`, `PEOPLE_*`, `SCHEDULE_*`, `FACILITY_*`, `INCIDENT_*`, `ORG_*`, `MODULE_*` | như trên; dù có position "Quản trị viên tổ chức" mang `facility.view/manage` |
| `FACILITY_STAFF` | `FACILITY_READ/WRITE`, `INCIDENT_CREATE/MANAGE` | như trên; `mapBackendRole()` cũng trả `null` |
| `MANAGER` / `STAFF` | `role_permission` = NULL, nhưng `position_permission` có `class.view`, `student.view`, `schedule.view`, `employee.view`, `facility.view` | vào được `/dao-tao`, nhưng dính lỗi redirect ở mục 3 |
| `TEACHER` / `STUDENT` | legacy `CLASS_READ`, `SCHEDULE_READ`, `INCIDENT_CREATE` + dotted `class.self_view`, `student.self_view`, `schedule.self_view` | self chạy tốt nhờ dotted self-permission |

Page facility **đã có sẵn đầy đủ thao tác**: `RoomsPage` gồm phòng + thiết bị (CRUD),
`FacilityIssuesPage` gồm báo cáo + xử lý sự cố. Vậy P0 facility là **mở cửa vào**, không phải
viết page mới.

## Goals

### P0 — role bị kẹt

- FE hiểu mã legacy: map về cùng một mã UPPERCASE chuẩn mà `PERMISSION_ALIASES` đang dùng.
- Cán bộ facility vào được khu vực facility bằng permission, không cần role `OWNER`.
- Đăng nhập và `/dao-tao` redirect tới **mục menu đầu tiên người dùng thật sự có**, không
  tới trang self bị cấm.

### P1 — page/menu thiếu

- `STUDENT` bấm được vào chi tiết lớp của mình từ "Lớp của tôi".
- Có mục menu tới "Buổi bị ảnh hưởng" và "Sự cố thiết bị" (hiện chỉ dán URL).
- `ClassDetailPage` dùng cùng cơ chế alias-aware với các gate khác.

## Non-goals / anti-goals

- Không đổi BE, contract, seed, migration, `07_people_department_access.sql`.
- Không thiết kế lại IA: vẫn 3 khu vực `/quan-tri`, `/to-chuc`, `/dao-tao`; facility chỉ mượn
  chung khung `OwnerConsoleLayout`, không dựng console thứ 4.
- Không thêm slug role mới vào `roles.ts`; `mapBackendRole()` vẫn trả `null` cho
  `ORG_ADMIN`/`FACILITY_STAFF` vì landing không còn phụ thuộc vào slug.
- Không dùng permission quản lý để quyết định chế độ xem self (giữ nguyên quy ước lịch gọn).
- Không đổi Astryx, build, lint, CI, dependency; không copy FE `origin/main`.

## Approaches đã cân nhắc

### 1. Xử lý mã legacy (chọn A)

| | A (chọn) | B (loại) | C (loại) |
|---|---|---|---|
| Làm gì | Thêm `LEGACY_PERMISSION_ALIASES`, chuẩn hoá trong `normalizePermissionCode()` | Sửa từng page gọi `hasPermission('CLASS_VIEW')` | Đổi seed DB |
| Đánh đổi | Một chỗ, mọi helper alias-aware được lợi | Dễ sót, lặp code | Cấm theo requirement |

Bảng map (legacy → mã UPPERCASE chuẩn đã có trong `DOTTED_TO_UPPERCASE`):

| Legacy | Chuẩn hoá về |
|---|---|
| `PEOPLE_READ` / `PEOPLE_WRITE` | `PEOPLE_VIEW` / `PEOPLE_EDIT` |
| `CLASS_READ` / `CLASS_WRITE` | `CLASS_VIEW` / `CLASS_EDIT` |
| `SCHEDULE_READ` / `SCHEDULE_WRITE` | `SCHEDULE_VIEW` / `SCHEDULE_UPDATE` |
| `FACILITY_READ` / `FACILITY_WRITE` | `FACILITY_VIEW` / `FACILITY_MANAGE` |
| `INCIDENT_CREATE` / `INCIDENT_MANAGE` | `FACILITY_ISSUE_REPORT` / `FACILITY_ISSUE_RESOLVE` |

`REPORT_READ`, `ORG_*`, `MODULE_*`, `ACCOUNT_MANAGE` **không map** — FE không có page tương ứng
và không được suy diễn quyền.

### 2. Cửa vào facility (chọn A)

| | A (chọn) | B (loại) | C (loại) |
|---|---|---|---|
| Làm gì | Route mới `/co-so-vat-chat` dùng lại `OwnerConsoleLayout` + `FacilityGuard`; URL cũ redirect | Nới `OwnerGuard` cho facility trên `/to-chuc` | Đưa facility vào menu `/dao-tao` |
| Đánh đổi | Tách rõ quyền, giữ nguyên 3 console; đổi URL có redirect | Lẫn nhóm tổ chức, dễ lọt màn phòng ban | Sai ngữ nghĩa "Đào tạo" |

- `FacilityGuard`: authenticated + (owner **hoặc** có một trong `facility.view`,
  `facility.manage`, `facility.issue.report`, `facility.issue.resolve` — alias-aware).
- Menu: owner giữ 4 mục cũ, trong đó "Cơ sở vật chất" trỏ `/co-so-vat-chat`; user không owner
  nhưng có quyền facility chỉ thấy 2 mục: "Phòng & thiết bị", "Sự cố thiết bị".
- URL cũ `/to-chuc/co-so-vat-chat[/su-co]` → redirect giữ nguyên `?departmentId=…`.

### 3. Landing / redirect (chọn A)

| | A (chọn) | B (loại) |
|---|---|---|
| Làm gì | Helper `landingPathFor(state)`: admin → owner → menu `/dao-tao` đầu tiên → facility → preview/notice | Chỉ vá `AcademicIndexRedirect` |
| Đánh đổi | Dùng chung cho login và index redirect; facility không kẹt ở bước đăng nhập | Facility vẫn dừng ở `/dao-tao` trước khi kịp redirect |

Thứ tự ưu tiên: `SUPER_ADMIN` → `/quan-tri`; owner → `/to-chuc`; `getAcademicMenu(...)` có ít
nhất 1 mục → `/dao-tao`; `FacilityGuard` thoả → `/co-so-vat-chat`; còn lại → preview/notice.
`AcademicIndexRedirect` dùng cùng helper nhưng bỏ 2 nhánh admin/owner.

### 4. Chi tiết lớp của HS (chọn A)

| | A (chọn) | B (loại) | C (loại) |
|---|---|---|---|
| Làm gì | Page đọc từ `/api/students/me/classes` hiện có, lọc theo `:id` | Gọi `/api/classes/:id` | Không làm |
| Đánh đổi | Không đổi BE; đủ thông tin lớp theo `StudentClassResponse` | BE chặn bằng `student.view`, HS không có | HS bấm lớp không đi đâu |

## Hành vi chi tiết

- **Alias**: `normalizePermissionCode()` thứ tự = legacy map → UPPERCASE giữ nguyên → dotted
  map. Không đưa legacy vào `PERMISSION_ALIASES` 2 chiều (tránh đè reverse map của
  `employee.view` / `class.view` / …). `hasAnyPermissionWithAliases()` tự động áp dụng.
- **Menu facility**: hiện điều kiện theo permission, không theo role; owner vẫn thấy đủ.
- **Impacts**: thêm mục `/dao-tao/lich/buoi-bi-anh-huong` vào `getAcademicMenu()` khi owner
  hoặc có `schedule.view`; `activeAcademicMenuKey()` nhận diện trước prefix `/dao-tao/lich`.
- **ClassDetailPage**: thay 5 lần `hasPermission(..., 'CLASS_*')` bằng
  `hasAnyPermissionWithAliases(..., ['CLASS_*'])` để khớp token dotted.
- **Student class detail**: route `/dao-tao/hoc-sinh/lop-cua-toi/:id`, gate = `STUDENT` +
  `student.self_view`; chỉ đọc, 5 state (forbidden/loading/error+retry/empty/success).
  Hiển thị các field có sẵn: mã lớp, tên, năm học, ngày bắt đầu/kết thúc, trạng thái,
  trạng thái đóng, giáo viên chủ nhiệm, môn học. Không hiển thị danh sách bạn học vì BE
  không trả field đó cho self. `StudentMyClassesPage` thêm link tới route này.
- **Không sửa** `RoomsPage` / `FacilityIssuesPage` về logic quyền — chúng đã tự check.

## Cấu trúc code dự kiến

- `frontend/src/features/auth/permissions.ts`: `LEGACY_PERMISSION_ALIASES`, normalizer,
  `canAccessFacilityArea()`.
- `frontend/src/features/auth/landing.ts`: `landingPathFor()` — nằm riêng để tránh vòng import
  `permissions.ts` ↔ `sprint4/academicMenu.ts`.
- `frontend/src/components/FacilityGuard/FacilityGuard.tsx` (+ test).
- `frontend/src/features/owner/ownerMenu.ts`: tách `OWNER_MENU` / `FACILITY_MENU` + matcher.
- `frontend/src/components/OwnerConsoleLayout/OwnerConsoleLayout.tsx`: nhận `menu` prop,
  mặc định `OWNER_MENU`.
- `frontend/src/router.tsx`: route `/co-so-vat-chat`, redirect 2 URL cũ, route chi tiết lớp HS;
  `AcademicIndexRedirect` dùng `landingPathFor()`.
- `frontend/src/pages/LoginPage/LoginPage.tsx`: gọi `landingPathFor()` thay 3 nhánh if hiện tại.
- `frontend/src/pages/StudentClassDetailPage/StudentClassDetailPage.tsx` (mới) + CSS nếu cần.
- `frontend/src/pages/StudentMyClassesPage/StudentMyClassesPage.tsx`: thêm link.
- `frontend/src/pages/ClassDetailPage/ClassDetailPage.tsx`: alias-aware checks.

## Test plan

- Unit: legacy alias normalize (mọi cặp + reverse không bị đè), facility guard, landing helper
  (7 case role/permission), menu owner/facility, academic menu impacts, active key.
- Component: `ClassDetailPage` với token dotted vẫn hiện nút đúng; `StudentClassDetailPage`
  5 state; old facility URL redirect giữ query.
- Verification: từ `frontend/` chạy `npx.cmd vitest run`, `npm.cmd run lint`,
  `npx.cmd tsc -b --pretty false`; từ root `git diff --check`.
- Chạm thử `http://localhost:5173` với tài khoản có sẵn (`demo_owner`, `vyvy`,
  `demo_student`, `Demo@123456`); **không mutate DB**. Nếu runtime token khác DB seed,
  ghi nhận thay vì sửa seed.

## Risks / residual chấp nhận được

- Runtime JWT có thể khác `mems_identity_db` hiện tại → alias map vẫn vô hại nếu token đã
  dùng mã mới; nếu user không có quyền nào thì vẫn thấy notice "chưa hỗ trợ".
- Đổi URL facility làm stale bookmark → đã có redirect.
- Không map `ORG_ADMIN`/`FACILITY_STAFF` sang slug FE: label "vai trò" ở trang preview vẫn
  là fallback, nhưng landing đã đúng nên không ảnh hưởng luồng chính.
- Không thêm hộp duyệt/phê duyệt chuyển việc/nghỉ việc/thông báo/chương trình môn học dù BE
  có endpoint — nằm ngoài đợt vá này, sẽ đánh giá riêng sau P1.

## Tiêu chí nghiệm thu

- Với token legacy của `ACADEMIC_STAFF`, `ORG_ADMIN`, `FACILITY_STAFF`: đăng nhập tới đúng
  màn có nội dung, không gặp `ForbiddenNotice` hay thông báo "chưa có màn hình".
- Với user chỉ có `class.view`/`student.view`/`schedule.view`: `/dao-tao` mở thẳng danh
  sách tương ứng.
- Owner và facility staff đều dùng được phòng/thiết bị và sự cố; URL cũ vẫn mở được.
- HS bấm "Lớp của tôi" → chi tiết lớp; impacts có trong menu.
- 0 test fail, lint/tsc/diff-check sạch, HEAD/staged không đổi.
