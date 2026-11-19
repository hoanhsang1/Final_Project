# Báo cáo khắc phục sau kiểm toán MEMS — Phase D

## 1. Thông tin phiên làm việc

| Mục | Giá trị |
| --- | --- |
| Repo | `hoanhsang1/Final_Project` |
| Nhánh làm việc | `fixFlowCreateEmployee` |
| HEAD khi kiểm toán | `afbd6f5` (`fixUITeacher`, 2026-11-17 20:26 +07) |
| Ngày báo cáo | 2026-11-19 |
| Trạng thái git | Có thay đổi chưa commit trong working tree; **không** commit, **không** push, **không** merge |
| Triển khai | **Không** deploy, **không** sửa `vercel.json`/biến môi trường/CORS/gateway, **không** restart container |
| DB thật | **Không** chạy migration, **không** xoá/sửa dữ liệu, **không** đổi trạng thái module |

Mọi kết quả dưới đây là **kiểm chứng trên mã nguồn cục bộ + test offline**. Không có bằng chứng nào cho việc đã triển khai lên môi trường thật.

## 2. Phạm vi

- Thực hiện: mục **1, 2, 4, 5, 7, 8, 9, 10, 11, 12**.
- Không thực hiện theo yêu cầu: mục **3** (mở màn hình theo từng quyền tạo riêng lẻ) và mục **6** (ẩn placeholder/đổi route). Hai mục này không ảnh hưởng các sửa đổi bên dưới.

## 3. Kết quả từng mục

### Mục 1 — Đồng bộ `employee.view` cho Trưởng phòng ban

- Seeder chức vụ “Trưởng phòng ban” có `department.view` từ trước; bổ sung backfill idempotent cho tổ chức đã seed (`43_people_head_department_view.sql`).
- Menu “Phòng ban” và route yêu cầu `department.view`; API `GET /departments` giữ nguyên `department.manage`/`department.view` và tự lọc theo phòng ban của JWT — không nới phạm vi.
- Test liên quan: `DefaultPositionSeederTest`, `DepartmentServiceTest` (PeopleService) đều xanh.

### Mục 2 — Hộp duyệt nghỉ việc không phụ thuộc danh sách phòng ban/nhân sự

- Backend: `ResignationService.inbox` trả các yêu cầu người gọi được xử lý; `ResignationApprovalPolicy.canApprove` tách quyền duyệt khỏi quyền xem; người tạo không tự duyệt; người được uỷ quyền chỉ thấy phạm vi được uỷ quyền.
- FE: trang duyệt dùng dữ liệu inbox, không gọi API danh sách nhân sự/phòng ban để dựng màn hình.
- Test: `ResignationApprovalPolicyTest` (20), `ResignationServiceTest` (9), `ResignationApprovalPolicyTest` bổ sung case uỷ quyền/tự duyệt.

### Mục 4 — Hoàn thiện bước `EMPLOYEE` trong luồng điều chuyển

- Backend (`TransferService`):
  - Thêm `TRANSFER_STEP_OUT_OF_ORDER` (2024, HTTP 409) — chỉ chặn **duyệt** khi bước trước chưa duyệt; từ chối vẫn được ở bất kỳ bước.
  - `actionableSteps` chỉ trả bước của người gọi, đúng thứ tự `SOURCE_HEAD → TARGET_HEAD → HR → EMPLOYEE`.
  - Người tạo được huỷ khi `PENDING`; người khác bị `TRANSFER_CANCEL_NOT_ALLOWED`.
- FE:
  - `MyRequestsPage`: nhân viên thấy timeline 4 bước, lý do, người yêu cầu, thời gian; nút Duyệt/Từ chối chỉ hiện khi `actionableSteps` chứa `EMPLOYEE`; huỷ chỉ hiện với người tạo.
  - `TransferTimeline` tách thành component dùng chung cho trang quản lý và trang của tôi.
- Test: `TransferServiceTest` 16/16 (gồm thứ tự bước, quyền huỷ, bước EMPLOYEE); FE `my-requests-page` + `transfers-page` + `approvals-page` 20/20.

### Mục 5 — Hộp duyệt hợp nhất

- Backend: `GET /users/me/approval-inbox` tổng hợp nghỉ việc, điều chuyển, vòng đời lớp; mỗi loại giữ nguyên quy tắc duyệt riêng; trả kèm hành động khả dụng.
- FE: `ApprovalsPage` hiển thị trạng thái, người gửi, thời gian, nội dung, nút hành động theo quyền; không phụ thuộc quyền xem toàn bộ nhân sự/phòng ban.
- Test: `ClassApprovalInboxTest` (3), `ClassApprovalPolicyTest` (11), FE `approvals-page` 6/6 (đã nới timeout 3s cho trạng thái lỗi do retry mặc định của React Query).

### Mục 7 — Đăng ký tổ chức công khai + kiểm toán quên mật khẩu

- FE: thêm `RegisterPage` (`/dang-ky`) gọi đúng `POST /api/v1/auth/register` hiện có (không tạo API mới). Trường: tên tổ chức, loại (SCHOOL/CENTER), username, email, mật khẩu ≥ 12, xác nhận, chọn module từ `GET /api/v1/modules`. Có màn hình thành công và lỗi dịch tiếng Việt.
- Test: `register-page.test.tsx` 6/6 (validation, payload, lỗi `USERNAME_EXISTS`, lỗi tải module).
- Quên/đặt lại mật khẩu — **chỉ báo cáo, không triển khai**:
  - `AuthController` chỉ có login/refresh/logout/register; đặt lại mật khẩu chỉ có endpoint admin `POST /accounts/{id}/reset-password`.
  - Bảng `password_reset_token` tồn tại trong `DB_11_16.sql` nhưng không có service/endpoint nào dùng.
  - Không có hạ tầng gửi email (không SMTP provider, không template, không queue).
  - Kết luận: không thể làm “đúng” (token hết hạn, dùng một lần, kiểm phía server, không lộ tài khoản) khi thiếu 3 phần trên; không tạo token giả.

### Mục 8 — Mượn/trả thiết bị

- Chỉ thiết kế/báo cáo: `docs/AUDIT_THIET_BI_MUON_TRA_item8.md`.
- Hiện trạng: chỉ có sổ tài sản (`equipment`), lịch sử trạng thái (`equipment_status_log`) và sự cố (`incident_report`); không có phiếu mượn, người mượn, thời hạn, quá hạn.
- Báo cáo đề xuất 2 bảng, máy trạng thái, ma trận quyền mới và 10 quyết định nghiệp vụ cần chốt. Không tạo migration/API.

### Mục 9 — Đồng bộ `teacher.change_status`

- Tách quyền xem/sửa/đổi trạng thái giáo viên; thêm mã `teacher.change_status` vào catalog, seed chức vụ và migration `44`, `45`; FE chỉ hiện nút đổi trạng thái khi có quyền.
- Test: `TeacherServiceTest` 14/14, `TeacherRequestValidationTest` 6/6, FE `teachers-page` 3/3.

### Mục 10 — Thống nhất module sở hữu lớp học

Quyết định: **quyền `class.*` thuộc `STUDENT_MANAGEMENT`** (backend PeopleService đã gate mọi thao tác lớp bằng module này). `CLASS_MANAGEMENT` chỉ còn là dòng danh mục cũ, không gắn quyền nào.

- FE `nav.ts`: mục “Lớp học” và “Lớp của tôi” chuyển sang `modules: ['STUDENT_MANAGEMENT']`.
- FE `modules.ts`: thêm cờ `gatesPermissions`; `DEPARTMENT_MODULE_CATALOG` chỉ gồm STUDENT/SCHEDULE/FACILITY_MANAGEMENT (khớp `DepartmentService.validateModules`); mô tả CLASS_MANAGEMENT ghi rõ là danh mục cũ.
- FE `DepartmentFormDialog`: chỉ cho gán 3 module có quyền nghiệp vụ; module cũ đang có trên phòng ban vẫn được giữ khi lưu (không mất dữ liệu), nhưng không cho chọn thêm.
- Migration `46_identity_class_module_ownership.sql`: đặt `permission.module_code = 'STUDENT_MANAGEMENT'` cho toàn bộ mã `class.*` (lowercase + legacy uppercase), idempotent, không xoá dòng, không đổi `allowed_scopes`; kèm truy vấn audit `department_module` còn `CLASS_MANAGEMENT` (không tự sửa để tránh cấp thêm quyền).
- Test: `nav.test.ts` 18/18 (thêm 2 test: chỉ CLASS_MANAGEMENT active → ẩn; STUDENT_MANAGEMENT active → hiện; locked/disabled → vẫn hiện để đọc, chặn ghi); `department-form-dialog.test.tsx` 4/4.

### Mục 11 — Dữ liệu lịch học cũ

- Báo cáo: `docs/AUDIT_LICH_CU_department_id_item11.md`.
- Kết luận: bản ghi `session.department_id IS NULL` không hiện trong danh sách theo phòng ban và không được tính khi gợi ý phòng, nhưng vẫn hiện ở `/schedules/me` và vẫn được kiểm trùng lịch.
- Không có quan hệ xác định để suy ra phòng ban (class mirror thiếu cột, `school_class.created_by` là giáo vụ cấp tổ chức, phòng/giao viên có thể khác phòng ban của buổi). Vì vậy **không backfill tự động**; cung cấp truy vấn kiểm đếm và đề xuất đối soát thủ công.
- Không chạy truy vấn trên DB thật/DB test (cần cấp quyền riêng).

## 4. Ma trận vai trò – quyền – module (các phần đã sửa)

Ký hiệu: ✅ thấy/làm được; 👁 chỉ đọc; ⛔ không; “—” không áp dụng.

| Vai trò / chức vụ | Module thấy trên menu | Duyệt nghỉ việc | Bước điều chuyển | Hộp duyệt | Đổi trạng thái GV | Lớp học (module) | CSVC |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OWNER / ORG_OWNER | Tất cả module đang bật | ✅ (trừ tự duyệt) | ✅ cả 4 bước theo vai trò | ✅ | ✅ | `STUDENT_MANAGEMENT` | ✅ toàn org |
| SUPER_ADMIN | Khu quản trị hệ thống | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| Quản trị viên tổ chức (chức vụ) | Theo module org | ✅ | ✅ | ✅ | ✅ | `STUDENT_MANAGEMENT` | ✅ toàn org |
| Giáo vụ | Đào tạo | ⛔ | ⛔ | ⛔ | ⛔ | `STUDENT_MANAGEMENT` | ⛔ |
| Trưởng phòng ban | Đào tạo + phòng ban | ✅ trong phạm vi phòng | SOURCE_HEAD/TARGET_HEAD trong phạm vi | ✅ | ⛔ | `STUDENT_MANAGEMENT` (phòng) | 👁 nếu phòng có module |
| Nhân sự phòng ban (HR) | Phòng ban + Đào tạo | ⛔ (người duyệt HR do quyền riêng) | Bước HR khi có quyền | ✅ | ✅ nếu có quyền | 👁 phòng | ⛔ |
| Giáo viên | Lớp của tôi, lịch của tôi | ⛔ | ⛔ (trừ khi là chính nhân viên điều chuyển → bước EMPLOYEE) | ⛔ | ⛔ | `class.self_view` | ⛔ |
| Nhân viên CSVC | Cơ sở vật chất | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ trong phòng |
| Nhân viên | Theo quyền self | ⛔ | Bước EMPLOYEE khi chính mình điều chuyển | ⛔ | ⛔ | ⛔ | ⛔ |
| Sinh viên | Cổng sinh viên | ⛔ | ⛔ | ⛔ | ⛔ | `class.self_view` | ⛔ |

Nguyên tắc giữ nguyên: MANAGER **không** tự có quyền; quyền hiệu lực = role ∪ chức vụ ∪ bundle ∪ uỷ quyền đang hiệu lực, lọc theo module và `allowed_scopes`; OWNER bỏ qua kiểm mã quyền nhưng vẫn bị chặn tự duyệt và giới hạn nghiệp vụ.

## 5. Đối chiếu menu – route – API – quyền

| Chức năng | Menu | Route FE | API / quyền backend | Module |
| --- | --- | --- | --- | --- |
| Phòng ban | `Phòng ban` (`department.view`) | `/to-chuc/phong-ban` | `GET /departments` (`department.view`/`department.manage`) | Không gate (quyền null) |
| Lớp học | `Lớp học` (`class.view`/`class.create`) | `/dao-tao/lop-hoc` | `SchoolClassController` (`class.view`/`class.create`) | `STUDENT_MANAGEMENT` |
| Lớp của tôi | `Lớp của tôi` (`class.self_view`) | `/dao-tao/lop-cua-toi` | `GET /classes/mine` (`class.self_view`) | `STUDENT_MANAGEMENT` |
| Việc chờ duyệt | `Việc chờ duyệt` (capability) | `/viec-cho-duyet` | `GET /users/me/approval-inbox` | Theo loại việc |
| Điều chuyển của tôi | Trong khu tự phục vụ | `/yeu-cau-cua-toi` | `GET /transfers/mine`, `POST /transfers/{id}/decide` | Không gate module |
| Đăng ký tổ chức | Trang công khai | `/dang-ky` | `POST /api/v1/auth/register`, `GET /api/v1/modules` | — |
| Giáo viên – đổi trạng thái | `Giáo viên` | `/dao-tao/giao-vien` | `PATCH /teachers/{id}/status` (`teacher.change_status`) | `TEACHER_MANAGEMENT` |

## 6. Migration đã tạo nhưng **chưa chạy**

| File | DB | Nội dung | Idempotent |
| --- | --- | --- | --- |
| `43_people_head_department_view.sql` | `mems_people_db` | Backfill `department.view` cho chức vụ Trưởng phòng ban | Có (`INSERT IGNORE`/not exists) |
| `44_identity_teacher_change_status.sql` | `mems_identity_db` | Thêm permission `teacher.change_status` + role/bundle | Có (`ON DUPLICATE KEY UPDATE`) |
| `45_people_teacher_change_status.sql` | `mems_people_db` | Gán quyền mới cho chức vụ quản trị/HR hiện có | Có (not exists) |
| `46_identity_class_module_ownership.sql` | `mems_identity_db` | Chuẩn hoá `module_code='STUDENT_MANAGEMENT'` cho mọi quyền `class.*` | Có (`UPDATE` có điều kiện) |

Thứ tự áp dụng: **43 → 44 → 45 → 46**, sau các migration 28–42 đã có. Không file nào tự chạy khi khởi động service. Chưa chạy trên bất kỳ DB nào trong đợt này (kể cả DB test 3307) vì cần cấp quyền truy cập riêng.

Ghi chú vận hành: khởi động IdentityService cũng upsert `module_code` từ `PermissionCatalog`, nên migration 46 chủ yếu dành cho DB chưa restart hoặc dữ liệu legacy uppercase.

## 7. Kiểm thử đã chạy (cục bộ, 2026-11-19)

| Lệnh | Kết quả |
| --- | --- |
| `frontend: npx vitest run` | **31 file / 165 test pass**, 0 fail |
| `frontend: npm run build` (`tsc -b && vite build`) | Thành công (cảnh báo chunk > 900 kB có từ trước) |
| `frontend: npx eslint .` | 0 error, 14 warning có sẵn (không thuộc thay đổi lần này) |
| `backend/PeopleService: ./mvnw -o test` | **235 test pass**, 0 fail, 0 error, 0 skip (34 test class) |

Các nhóm test trọng tâm: `TransferServiceTest` (16), `ResignationApprovalPolicyTest` (20), `ResignationServiceTest` (9), `ClassApprovalInboxTest` (3), `ClassApprovalPolicyTest` (11), `TeacherServiceTest` (14), `DefaultPositionSeederTest` (5), FE `nav` (18), `department-form-dialog` (4), `my-requests-page` (10), `transfers-page` (4), `approvals-page` (6), `register-page` (6), `teachers-page` (3).

Phạm vi kiểm chứng theo vai trò: menu/route được test ở mức unit với session giả lập (OWNER, MANAGER, Trưởng phòng ban, HR, giáo viên, nhân viên, sinh viên); chặn gọi API trực tiếp được test ở mức backend security (`PermissionEnforcementTest`, `ClassLifecyclePermissionTest`, `DelegatedAuthorityFilterTest`, `OrganizationModuleGuardTest`) và test service cho tự duyệt/điều chuyển người khác/ngoài phạm vi. Chưa chạy ma trận vai trò trên stack thật trong đợt này.

Không chạy: Maven cho IdentityService/ScheduleService/FacilityService/Gateway (không sửa mã Java của các service này trong đợt); browser E2E trên stack thật (mục #40 vẫn treo từ các đợt trước).

## 8. Chưa hoàn thành / đang chờ quyết định

1. **Quên/đặt lại mật khẩu**: thiếu endpoint, service token và hạ tầng email. Cần chốt provider email + chính sách token (sống bao lâu, dùng một lần, chống liệt kê tài khoản) trước khi code.
2. **Mượn/trả thiết bị**: chờ 10 quyết định D1–D10 trong `docs/AUDIT_THIET_BI_MUON_TRA_item8.md`.
3. **Backfill `session.department_id`**: chờ xác nhận nghiệp vụ và kết quả kiểm đếm; hiện chỉ có truy vấn đọc trong `docs/AUDIT_LICH_CU_department_id_item11.md`.
4. **`department_module` còn `CLASS_MANAGEMENT`** (nếu có trên DB thật): cần quyết định chuyển sang `STUDENT_MANAGEMENT` hay giữ; migration 46 **không** tự đổi để tránh cấp thêm quyền ngoài ý muốn.
5. **Browser E2E** trên frontend thật với backend thật: chưa chạy trong đợt này.

## 9. Phân biệt mã nguồn (source) và triển khai (live)

| Hạng mục | Trạng thái |
| --- | --- |
| Sửa mã nguồn FE/BE | ✅ Trong working tree nhánh `fixFlowCreateEmployee` |
| Test offline FE/BE | ✅ Như mục 7 |
| Commit/push/merge | ⛔ Chưa làm (theo yêu cầu) |
| Build Docker image / restart container | ⛔ Chưa làm |
| Deploy Vercel / Cloudflare Tunnel | ⛔ Chưa làm |
| Chạy migration 43–46 trên DB thật | ⛔ Chưa làm, chưa có bằng chứng |
| Xác minh hành vi trên môi trường live | ⛔ Chưa làm trong đợt này |

Bất kỳ tuyên bố “đã chạy migration” hoặc “đã triển khai” cho các thay đổi này đều **không có bằng chứng** và không nên dùng trong báo cáo nghiệm thu.

## 10. Rủi ro & việc tiếp theo

1. Trước khi nghiệm thu, cần người có quyền chạy migration 43–46 theo đúng thứ tự trên môi trường đích, ghi lại số dòng ảnh hưởng và kiểm tra bằng khối `Verification` trong từng file.
2. Dữ liệu lớp trên DB thật: chạy truy vấn audit `department_module` của migration 46 để quyết định xử lý.
3. Module `CLASS_MANAGEMENT` vẫn tồn tại trong bảng `module` toàn cục (is_core). Nếu muốn ẩn khỏi danh sách đăng ký/module settings cần một migration riêng và quyết định của chủ sản phẩm — chưa làm.
4. Hoàn tất browser E2E (#40) cho các luồng: đăng ký tổ chức, hộp duyệt hợp nhất, bước EMPLOYEE, đổi trạng thái giáo viên, module lớp bị disabled/locked.
5. Bổ sung test tích hợp cho `RegisterPage` với API thật khi có môi trường test ổn định (hiện chỉ test với mock).
