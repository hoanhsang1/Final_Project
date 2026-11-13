# Báo cáo kiểm thử tích hợp FE → BE → DB (E2E live)

- **Ngày chạy:** 2026-11-13
- **Môi trường:** Vite dev `http://127.0.0.1:5173` → API Gateway `:8080` → Identity `:8081` / People `:8082`, MySQL 8 (Docker: `mems-identity-org`, `mems-people`, `mems-api-gateway`, `mems-eureka`)
- **Công cụ:** Playwright 1.64.1 + Google Chrome kênh `chrome`, chạy headless, 1 worker, tuần tự
- **Phạm vi:** toàn bộ màn hình FE hiện có route (auth, owner console, academic console, admin console), đi qua API thật và kiểm chứng dữ liệu trong MySQL

## 1. Cách chạy

```bash
cd frontend
npm run dev                     # terminal 1
npx playwright test -c playwright.live.config.ts   # terminal 2
```

Bộ mock sẵn có (`playwright.config.ts`, port 4173) không bị ảnh hưởng. Bộ live dùng:

- `frontend/playwright.live.config.ts` — baseURL 5173, `channel: 'chrome'`, screenshot khi fail, trace khi fail
- `frontend/e2e-live/live-integration.spec.ts` — 13 testcase
- Báo cáo HTML: `frontend/playwright-report-live/index.html` (mở bằng `npx playwright show-report playwright-report-live`)

Lưu ý: `frontend/vite.config.ts` đã loại `e2e-live/**` khỏi Vitest để `npm test` không cố chạy spec Playwright.

## 2. Kết quả tổng hợp

**13/13 testcase PASS** trong một lần chạy đầy đủ sau khi sửa lỗi (1.2 phút). Trước khi sửa, bộ test gồm 14 case và ghi nhận 4 lỗi D-01 → D-04; case 03b được gộp vào case 03 sau khi phòng ban đã tạo được từ UI.

| # | Testcase | Màn hình / luồng | Kết quả |
|---|----------|------------------|--------|
| 01 | Đăng nhập sai bị chặn, đăng nhập đúng vào console chủ tổ chức | `/dang-nhap` → `/to-chuc` | PASS |
| 02 | Đăng xuất xoá phiên, guard chặn vào lại | `/to-chuc` → `/dang-nhap` | PASS |
| 03 | Phòng ban: tạo kèm module phụ trách → sửa tên → xoá (D-01 đã sửa) | `/to-chuc` → modal phòng ban | PASS |
| 04 | Chức vụ: tạo kèm quyền → sửa → xoá | `/chuc-vu` | PASS |
| 05 | Nhân viên phòng ban: thêm (mật khẩu tạm) → đổi chức vụ → xoá (D-02, D-03, D-04 đã sửa) | `/phong-ban/:id` | PASS |
| 06 | Giáo viên: danh sách, tìm kiếm, chi tiết, sửa SĐT + hoàn nguyên, tab lịch sử | `/dao-tao/giao-vien` | PASS |
| 07 | Chuyên môn: tạo mới từ màn giáo viên | `/dao-tao/giao-vien` | PASS |
| 08 | Lớp học: danh sách, lọc trạng thái, chi tiết + 2 tab lịch sử | `/dao-tao/lop-hoc` | PASS |
| 09 | Vòng đời lớp: yêu cầu đóng → chặn tự duyệt (FE ẩn nút + BE 403) | `/dao-tao/lop-hoc/:id` | PASS |
| 10 | Trưởng bộ phận duyệt đóng → mở lại (về `NONE`) | `/dao-tao/lop-hoc/:id` | PASS |
| 11 | Super admin: tổng quan, module, tài khoản, nhật ký, tất cả tổ chức | `/quan-tri/*` | PASS |
| 12 | Đăng ký tổ chức → admin duyệt → chủ mới đăng nhập (danh sách phòng ban rỗng) | `/dang-ky` → `/quan-tri/to-chuc` → `/to-chuc` | PASS |
| 13 | Guard FE chặn owner vào khu quản trị (403) | `/quan-tri` | PASS |

## 3. Bằng chứng FE → BE → DB theo luồng

### 3.1 Xác thực (01, 02, 12, 13)

- API: `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/register`
- DB `mems_identity_db`:
  - `account.status` của tài khoản seed = `active`
  - Đăng ký tổ chức tạo `organization.status = pending`, `account` cho chủ mới
  - Duyệt tổ chức: `organization.status = active`, có `approved_by/approved_at`, thêm dòng `audit_log` action `ORG_APPROVED`
  - Tài khoản chủ mới đăng nhập được và vào `/to-chuc` với trạng thái "Chưa có phòng ban nào."
- Guard 403 ở test 13 là guard phía FE (route guard), không gọi BE.
- Tài khoản cấp mật khẩu tạm (nhân viên mới): sau khi đăng nhập, FE đưa sang `/doi-mat-khau` (D-05); đổi xong phải đăng nhập lại bằng mật khẩu mới.

### 3.2 Phòng ban – chức vụ – nhân viên (03, 04, 05)

- API: `GET/POST/PUT/DELETE /departments`, `/positions`, `GET /permissions`, `GET /modules`, `GET/POST/PUT/DELETE /departments/{id}/members…`
- Tạo/sửa phòng ban gửi `{ name, description?, moduleCodes }`; danh sách phòng ban có cột "Module phụ trách".
- Danh mục module trong form được lọc theo `permission.moduleCode` mà chủ tổ chức thực sự có (module đã bật trong `organization_module`) — tránh chọn module BE sẽ từ chối.
- DB `mems_people_db`:
  - `department`, `department_module`, `position`, `department_member`, `staff_profile`
  - Nhật ký nghiệp vụ `people_audit_log` ghi đủ chuỗi:
    `POSITION_CREATED → POSITION_UPDATED → POSITION_DELETED`,
    `MEMBER_APPOINTED → MEMBER_POSITIONS_CHANGED → MEMBER_REMOVED`
  - Chi tiết `MEMBER_REMOVED` chứa `userId` + `username`, khớp bản ghi UI
  - Xoá nhân viên: xoá `department_member` và **vô hiệu hoá** `account` bên Identity (`status = 'disabled'`) — xem D-04
- Bảng nhân viên có cột `username`; modal mật khẩu tạm hiển thị đúng `username` (D-03).

### 3.3 Giáo viên – chuyên môn (06, 07)

- API: `GET /api/teachers`, `GET/PUT /api/teachers/{userId}`, `GET/POST /api/specialties`
- DB:
  - `staff_profile.phone` đổi `0900000005 → 0912345678` rồi hoàn nguyên; `people_audit_log` có 2 dòng `TEACHER_UPDATED` với `before/after` đúng
  - `specialty` thêm bản ghi mới, hiện ngay trong tag chuyên môn của giáo viên

### 3.4 Lớp học và vòng đời đóng lớp (08, 09, 10)

- API: `GET /api/classes`, `GET /api/classes/{id}`, `GET .../status-logs`, `GET .../close-events`,
  `POST .../close-requests`, `POST .../close-requests/approve`, `POST .../reopen`
- DB `mems_people_db`:
  - Lọc "Đang diễn ra" chỉ trả C002, không trả C001 (`CHUA_BAT_DAU`)
  - Sau yêu cầu đóng: `school_class.close_state = PENDING`, `class_close_event` action `REQUESTED`
  - Tự duyệt: FE ẩn nút duyệt cho người gửi; gọi thẳng API bằng token của người gửi trả **403** body
    `{ success:false, code:"SELF_APPROVAL_NOT_ALLOWED", … }`
  - Trưởng bộ phận duyệt: `close_state = CLOSED`, event `APPROVED`
  - Mở lại: `close_state = NONE`, event `REOPENED`, version lớp tăng sau mỗi thao tác
- Sau kiểm thử đã dọn các event E2E và trả C002 về `close_state = NONE`, `version = 2` như seed.

### 3.5 Admin console (11)

- API: `GET /api/v1/organizations/pending`, `GET /api/v1/organizations/{id}`, `PATCH .../approve`,
  `GET /api/v1/accounts`, `GET /api/v1/audit-logs`, `PATCH .../suspend|reactivate`
- DB `mems_identity_db`: `organization`, `organization_module`, `account`, `audit_log` — dữ liệu hiển thị khớp bảng.

## 4. Lỗi đã phát hiện và khắc phục

| Mã | Mức | Mô tả | Cách sửa | Bằng chứng sau sửa |
|----|-----|-------|----------|--------------------|
| **D-01** | Cao | `DepartmentFormModal` chỉ gửi `{name, description}`, thiếu `moduleCodes` (BE bắt buộc ≥1) → mọi thao tác tạo/sửa phòng ban từ UI đều 400 `MODULE_CODES_REQUIRED` | Form thêm multi-select "Module phụ trách", gửi `moduleCodes`; danh mục lọc theo permission thực tế của owner; bảng phòng ban thêm cột module | Test 03 tạo kèm `STUDENT_MANAGEMENT`, sửa tên, xoá — dialog đóng, danh sách cập nhật, BE lưu `department_module` |
| **D-02** | Cao | Form thêm nhân viên cho chọn chức vụ `profile_type = TEACHER` nhưng không gửi `teacherProfile/staffCode/fullName/phone` → 400 chung chung; người dùng không biết cách thêm giáo viên | Ẩn chức vụ TEACHER khỏi form thêm nhân viên và khỏi danh sách gán (trừ khi đã gán); hiện gợi ý kèm link tới trang Giáo viên / Chức vụ khi danh sách trống | Test 05: dropdown không còn option "Giáo viên" (đếm = 0), chọn "Giáo vụ" và tạo thành công |
| **D-03** | Trung bình | Modal mật khẩu tạm hiển thị `userId` thay vì `username`; bảng nhân viên chỉ có userId rút gọn, không có username/email → khó đối chiếu | `department_member.username` được trả về trong `Member`; bảng có cột `username`; modal mật khẩu tạm dùng `member.username` | Test 05: modal hiện `e2e_staff_*`, bảng có cùng username; đăng nhập bằng username đó xác nhận tài khoản thật |
| **D-04** | Trung bình | Xoá nhân viên khỏi phòng ban không vô hiệu hoá tài khoản Identity; account vẫn `active` và vẫn đăng nhập được (dù không còn quyền tổ chức) | Thêm `PATCH /internal/accounts/{id}/disable` (Identity) + `IdentityClient.disableAccount`; `MemberService.remove` gọi disable sau khi xoá `department_member` | Test 05: DB `account.status = 'disabled'`; `POST /api/v1/auth/login` trả **403** `ACCOUNT_NOT_ACTIVE` |
| **D-05** | Cao | Nhân viên tạo mới nhận mật khẩu tạm (`mustChangePassword = true` trong JWT) nhưng FE không có màn đổi mật khẩu và không đọc claim → đăng nhập xong vào thẳng console, mọi API nghiệp vụ trả 403 `PASSWORD_CHANGE_REQUIRED` (giáo viên, chuyên môn, phòng ban…) | Đọc claim `mustChangePassword` vào auth store; thêm route `/doi-mat-khau` + `ChangePasswordPage`; `SessionWatcher` và trang đăng nhập tự đưa tài khoản mật khẩu tạm sang màn đổi; đổi xong xoá phiên (BE đã thu hồi refresh token) và bắt đăng nhập lại | Kiểm chứng API thật: login mật khẩu tạm → claim `true`, `/departments` 403 `PASSWORD_CHANGE_REQUIRED`; `POST /api/v1/auth/change-password` 204; login mật khẩu mới → claim `false`, API nghiệp vụ không còn bị chặn mật khẩu; Vitest 127/127 |

Kiểm tra hồi quy sau khi sửa:

- Backend: `mvn -q package` (Identity + People) exit 0, test pass; container rebuild + health OK.
- Frontend: `tsc --noEmit` sạch, Vitest **127/127** pass (đã cập nhật mock `fetchPermissions`/`fetchModuleCatalog`, payload `moduleCodes`, thêm test đổi mật khẩu tạm).
- E2E live: **13/13** pass trong một lần chạy.

Ghi chú phạm vi:

- Không có route UI cho quản lý học sinh và tạo/xoá lớp trong cây làm việc hiện tại (`ClassManagementPage`, `StudentManagementPage` tồn tại nhưng không được route) → không thể test qua FE.
- Chưa test trọn luồng quên/đặt lại mật khẩu vì cần hộp thư nhận link; API đã có nhưng chưa có mail catcher trong môi trường local.
- Gateway hiện chỉ route Identity/People; Schedule/Facility phải gọi trực tiếp cổng 8083/8084.

## 5. Dọn dẹp dữ liệu kiểm thử

Đã xoá toàn bộ bản ghi sinh ra trong lúc test qua các đợt (`PBe2e`, `CVe2e`, `e2e_staff_`, `e2e_owner_`, `Chuyên môn E2E`, `Trường E2E`, các lớp `SMOKE-*`/`S4A-*`/`S4B-*`/`X9`):

- Các tổ chức E2E + tài khoản chủ + `organization_module`/`module_config` + audit `ORG_APPROVED` tương ứng
- Toàn bộ tài khoản E2E (`e2e_owner_*`, `e2e_staff_*` gồm cả tài khoản đã `disabled`), `account_role`, `refresh_token`, `user_session`
- 1 chức vụ `CVe2e`, các chuyên môn E2E và 6 chuyên môn `Sinh học <timestamp>` còn sót; giáo viên test `sample_teacher3` + `teacher_profile`/`teacher_specialty`/`department_member`/`member_position`/audit liên quan
- 16 lớp test (`SMOKE-*`, `S4A-*`, `S4B-*`, `X9`) cùng `class_status_log`/`class_close_event`/`class_student`
- Bộ 7 chức vụ trùng tên do lần chạy trước khi seed (không có thành viên), chỉ còn 7 chức vụ seed
- Toàn bộ sự kiện đóng lớp trên C002; trả `school_class.version = 2`

Trạng thái seed sau dọn dẹp: `staff_profile` 6, `department_member` 6, `member_position` 6, `teacher_profile` 2, `teacher_specialty` 2, `specialty` 3, `position` 7, `school_class` 5 (C001–C005), C002 `close_state = NONE`, `version = 2`.

## 6. Tệp bàn giao

- `frontend/playwright.live.config.ts` — cấu hình chạy live
- `frontend/e2e-live/live-integration.spec.ts` — 13 testcase tích hợp
- `frontend/playwright-report-live/` — báo cáo HTML lần chạy đầy đủ
- `frontend/test-results/` — screenshot/trace của các lần fail trong quá trình hoàn thiện test (giữ lại làm bằng chứng D-01/D-02)
