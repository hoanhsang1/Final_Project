# MEMS — Đánh giá cuối cùng sau đợt sửa lỗi audit (63 mã)

- **Nhánh:** `fixFlowCreateEmployee`
- **HEAD gốc khi bắt đầu kiểm tra:** `afbd6f597bb33a6453e36873dc389c2ec61de699`
- **Thời điểm:** 2026-11-19
- **Tài liệu liên quan:** `MEMS_REAUDIT_BEFORE_FIX.md` (xác minh ban đầu),
  `MEMS_BUSINESS_DECISIONS_REQUIRED.md` (16 câu hỏi nghiệp vụ),
  `MEMS_FIX_PROGRESS.md` (chi tiết thay đổi P0/P1/P2 đã sửa).

## 0. Giới hạn đã tuân thủ

Không deploy, không sửa Vercel/`vercel.json`/backend URL/CORS, không sửa biến môi trường
ở môi trường đang chạy, không restart container production, không chạy migration production,
không xoá database/volume, không reset dữ liệu, không commit/push/merge/force-push.
Toàn bộ bằng chứng là **test local offline**. Migration mới (nếu có) chỉ nằm trong repo,
chưa chạy ở bất kỳ database nào.

## 1. Bằng chứng kiểm thử (local, offline)

| Hạng mục | Lệnh | Kết quả |
|---|---|---|
| IdentityService | `./mvnw -o test` | **59 test**, 0 failure, 0 error |
| PeopleService | `./mvnw -o test` | **269 test**, 0 failure, 0 error |
| ScheduleService | `./mvnw -o test` | **10 test**, 0 failure, 0 error |
| FacilityService | `./mvnw -o test` | **7 test**, 0 failure, 0 error |
| Frontend typecheck | `npx tsc -b` | sạch |
| Frontend lint (file đã sửa) | `npx eslint ...` | 0 error |
| Frontend test (teachers page) | `npx vitest run src/features/academic/pages/teachers-page.test.tsx` | 4/4 pass |

Không có test E2E chạy trên stack thật (DB/container production) — xem mục 7.

## 2. Trạng thái 63 mã

Quy ước: **FIXED_AND_TESTED** = sửa trong mã + có test tự động chứng minh;
**ALREADY_FIXED** = đã đúng trước đợt này; **PARTIAL** = sửa một phần, phần còn lại phụ thuộc
quyết định/hạ tầng; **NEEDS_BUSINESS_DECISION** = không sửa khi chưa chốt nghiệp vụ;
**NEEDS_EXTERNAL_CONFIG** = cần hạ tầng/cấu hình ngoài mã; **OPEN** = đã xác nhận nhưng chưa sửa;
**NOT_IN_SCOPE** = ngoài phạm vi đợt này.

### 2.1. Bảo mật tài khoản (AUTH)

| Mã | Trạng thái | Ghi chú |
|---|---|---|
| AUTH-01 | FIXED_AND_TESTED + NEEDS_EXTERNAL_CONFIG | Xoá backdoor `123456`, bỏ reset mật khẩu admin khi khởi động; bootstrap SUPER_ADMIN qua env một lần + buộc đổi mật khẩu. Tài khoản cũ còn hash `123456` vẫn đăng nhập được tới khi đổi — là việc vận hành, không reset hàng loạt. |
| AUTH-02 | FIXED_AND_TESTED | Throttle theo (username, IP) và username toàn cục, khoá 15 phút, 429 `LOGIN_RATE_LIMITED`, dummy BCrypt chống dò username. |
| AUTH-03 | FIXED_AND_TESTED | Phát hiện refresh token reuse → thu hồi cả family; reset mật khẩu/disable thu hồi phiên. |
| AUTH-04 | NEEDS_EXTERNAL_CONFIG | Trang đăng ký ALREADY_FIXED; quên/đặt lại mật khẩu cần hạ tầng email (SMTP/worker) chưa có. |
| AUTH-05 | NEEDS_BUSINESS_DECISION (Q15) | Chuyển giao/khôi phục quyền Owner — chờ chính sách. |
| AUTH-06 | PARTIAL | Truy vấn đã chấp nhận cả `OWNER` và `ORG_OWNER`; seeder vẫn tạo MANAGER/STAFF và chưa có migrator role thống nhất. Chờ chốt bộ role. |
| AUTH-07 | FIXED_AND_TESTED | Converter ghi enum chữ thường khớp cột MySQL `enum(...)`. |
| AUTH-08 | FIXED_AND_TESTED | Duyệt/từ chối/tạm ngưng/kích hoạt module tổ chức ghi `audit_log` kèm actor từ JWT và lý do. |
| AUTH-09 | FIXED_AND_TESTED | `PasswordPolicy` dùng chung: min 12 ký tự, max 72 byte UTF-8; áp cho đổi và đặt lại mật khẩu. |
| AUTH-10 | OPEN | Role ở Identity chưa đồng bộ People/FE; cần chốt nguồn sự thật role (liên quan AUTH-06). |
| AUTH-11 | OPEN | Login vẫn gọi PeopleService đồng bộ, chưa cache; cần quyết định fail-open/fail-closed + TTL trước khi sửa. |

### 2.2. Phân quyền (RBAC)

| Mã | Trạng thái | Ghi chú |
|---|---|---|
| RBAC-01 | FIXED_AND_TESTED | Sửa/xoá chức danh kiểm quyền trên dữ liệu đã lưu; chặn đổi scope/department; non-owner không clone ORGANIZATION. |
| RBAC-02 | FIXED_AND_TESTED | Cột `position.system_code` (migration 47, idempotent) + fallback theo tên cũ cho dữ liệu chưa backfill; áp cho lớp, nghỉ việc, điều chuyển, tổng quản lý. |
| RBAC-03 | FIXED_AND_TESTED | Assignment ORGANIZATION lọc quyền theo module tổ chức; DEPARTMENT theo module phòng ban. |
| RBAC-04 | PARTIAL | Clone giữ `profileType` (có test); tạo mới qua API vẫn mặc định `GENERAL` vì form chưa có trường — cần thêm trường ở FE/request nếu muốn. |
| RBAC-05 | OPEN | JWT vẫn là ảnh chụp quyền 15 phút; cần thiết kế `authz_version`/TTL ngắn — thay đổi rộng, chưa làm. |
| RBAC-06 | OPEN | Vẫn còn ràng buộc theo role MANAGER/STAFF; phải dọn cùng lúc với AUTH-06/AUTH-10. |
| RBAC-07 | PARTIAL | Đã thêm `teacher.change_status` vào catalog; còn 5 mã FE (`schedule.attendance.*`, `schedule.change_request.*`, `schedule.recurring.create`) thuộc tính năng chưa triển khai (SCH-05), giữ lại để không phá menu tương lai. |

### 2.3. Sinh viên & lớp (STU, CLS)

| Mã | Trạng thái | Ghi chú |
|---|---|---|
| STU-01 | NEEDS_BUSINESS_DECISION (Q1–Q2) | Mô hình enrollment 1 lớp/nhiều lớp chưa chốt; không đổi dữ liệu theo giả định. |
| STU-02 | FIXED_AND_TESTED | Đình chỉ/xoá sinh viên disable tài khoản, kích hoạt lại enable; Identity có endpoint internal idempotent. |
| STU-03 | OPEN | Tìm kiếm chưa bỏ dấu; cần cột/từ điển chuẩn hoá — thay đổi schema, chưa làm. |
| STU-04 | NEEDS_BUSINESS_DECISION | Có tái sử dụng mã sinh viên/lớp của bản ghi xoá mềm không? |
| CLS-01 | FIXED_AND_TESTED | FE dùng đúng 4 trạng thái BE, bộ lọc đúng mã, bỏ trạng thái khỏi form tạo. |
| CLS-02 | FIXED_AND_TESTED | Thông báo trưởng phòng khi yêu cầu đóng, thông báo người yêu cầu khi duyệt/từ chối; timeline sự kiện giữ đúng thứ tự. |
| CLS-03 | NEEDS_BUSINESS_DECISION | Dọn buổi học/phân công khi huỷ/đóng lớp cần chốt hành vi + outbox (CC-03). |
| CLS-04 | NEEDS_BUSINESS_DECISION (Q5) | Lớp thuộc phòng ban nào, ai phụ trách — chưa chốt. |

### 2.4. Lịch học (SCH)

| Mã | Trạng thái | Ghi chú |
|---|---|---|
| SCH-01 | PARTIAL | Schedule đọc `closeState` và chặn lớp chờ đóng/đã đóng; đồng bộ khi **đổi giáo viên lớp** vẫn chờ outbox (CC-03). |
| SCH-02 | NEEDS_BUSINESS_DECISION (Q3–Q4) | Mô hình phòng cấp tổ chức vs phòng ban chưa chốt; không đổi DB/quyền. |
| SCH-03 | OPEN | Chưa xác thực giáo viên qua People, chưa khoá lớp/validate thời lượng khi xếp lịch. |
| SCH-04 | OPEN | Sự cố thiết bị sau xếp lịch chưa truy vấn buổi bị ảnh hưởng/thông báo. |
| SCH-05 | NOT_IN_SCOPE | Điểm danh, đổi lịch, lịch lặp — không phát triển trong đợt này. |

### 2.5. Cơ sở vật chất (FAC)

| Mã | Trạng thái | Ghi chú |
|---|---|---|
| FAC-01 | FIXED_AND_TESTED | Xử lý sự cố chỉ khôi phục khi không còn sự cố mở và về đúng trạng thái trước khi hỏng. |
| FAC-02 | OPEN | Chưa thêm trạng thái/người phụ trách/mức độ sự cố (PATCH, assignee, severity) — là bổ sung tính năng. |

### 2.6. Nhân sự (HR, TCH)

| Mã | Trạng thái | Ghi chú |
|---|---|---|
| HR-01 | FIXED_AND_TESTED | Offboarding thay xoá cứng: thu hồi assignment, `RESIGNED`, markResigned, disable tài khoản cuối cùng. |
| HR-02 | NEEDS_EXTERNAL_CONFIG | Mật khẩu tạm vẫn trả trong response; thay bằng link kích hoạt cần hạ tầng email (cùng AUTH-04). |
| HR-03 | OPEN | Mã nhân viên MAX+1 chưa khoá; FE vẫn bắt nhập. Cần sequence/retry + bỏ ô nhập. |
| HR-04 | NEEDS_BUSINESS_DECISION | Gỡ chức danh TEACHER chưa chặn/cảnh báo theo lớp đang dạy; cần chốt chính sách phân công lại (Q8). |
| TCH-01 | ALREADY_FIXED | API đổi trạng thái giảng dạy đã có (`PUT`), FE khớp. |
| TCH-02 | FIXED_AND_TESTED | FE xử lý 409 `SPECIALTY_MISMATCH`, hiện danh sách lớp lệch, cho gửi lại `confirm=true`; liên kết cấu trúc chờ Q16. |

### 2.7. Module & kiến trúc (MOD, CC)

| Mã | Trạng thái | Ghi chú |
|---|---|---|
| MOD-01 | FIXED_AND_TESTED | Menu Giáo viên theo đúng module, bỏ mã module không tồn tại; lớp giữ `STUDENT_MANAGEMENT`. |
| MOD-02 | PARTIAL | Đọc module fail-open có log khi Identity chết, ghi vẫn kiểm catalog — đã thống nhất chủ đích nhưng chưa có test riêng. |
| MOD-03 | NEEDS_BUSINESS_DECISION | Phân biệt module lõi vs module có thể tắt, kiểm tra sự cố mở — chờ chốt nghiệp vụ. |
| CC-01 | FIXED_AND_TESTED | IdentityClient cache TTL 30s (quyền, bundle, module), lỗi không cache, giới hạn 1000 entry. Chưa có circuit breaker (không thêm dependency khi Maven offline). |
| CC-02 | NEEDS_EXTERNAL_CONFIG | Bảo mật liên service/JWT/CORS/Gateway/Vercel: chỉ báo cáo, không sửa. |
| CC-03 | OPEN | Chưa có outbox/sự kiện nội bộ — là điều kiện cần cho CLS-03, SCH-01 phần còn lại. |
| CC-04 | OPEN | URL chưa chuẩn hoá toàn bộ; một phần đã ghi trong `docs/api.md`, chưa đổi route. |
| CC-05 | PARTIAL | Filter `mustChangePassword` ở Identity đã cho phép đổi mật khẩu/logout; 3 service còn lại chặn mọi path (đúng chủ đích); mã nguồn lặp 4 service chưa tách. |
| CC-06 | OPEN | Chưa có API nhật ký audit cho Owner (`GET /audit-logs` vẫn ❌ trong docs). |
| CC-07 | ALREADY_FIXED | Quy ước response thành công không envelope đã ghi rõ trong `docs/api.md`. |
| CC-08 | NEEDS_BUSINESS_DECISION | Token trong localStorage; chuyển cookie HttpOnly đụng CORS/hạ tầng — không tự đổi. |

### 2.8. Uỷ quyền & nghỉ việc & điều chuyển (DEL, RES, TRF)

| Mã | Trạng thái | Ghi chú |
|---|---|---|
| DEL-01 | OPEN | Audit khi dùng quyền ủy quyền chưa ghi `delegationId` ở luồng duyệt policy. |
| DEL-02 | FIXED_AND_TESTED | Nghỉ việc/bị gỡ thu hồi mọi uỷ quyền đang nhận + audit `DELEGATION_REVOKED`. |
| DEL-03 | OPEN | `DelegatedPermissions` vẫn lẫn quyền chức vụ; cần đánh dấu nguồn. |
| DEL-04 | FIXED_AND_TESTED | Scheduler hằng ngày chuyển uỷ quyền quá hạn sang `EXPIRED`, idempotent. |
| RES-01 | FIXED_AND_TESTED | Ghi DB trước, gọi Identity cuối; disable idempotent nên retry an toàn. |
| RES-02 | NEEDS_BUSINESS_DECISION (Q12) | "Cấp 1 không khả dụng" chưa xác định. |
| RES-03 | ALREADY_FIXED | Hộp duyệt hợp nhất đã có. |
| RES-04 | NEEDS_BUSINESS_DECISION (Q7) | Ngày hiệu lực/bàn giao khi nghỉ việc. |
| RES-05 | FIXED_AND_TESTED | Thông báo hiển thị username thay UUID. |
| TRF-01 | NEEDS_BUSINESS_DECISION (Q10–Q11) | Hạn xử lý/escalate yêu cầu treo. |
| TRF-02 | FIXED_AND_TESTED | Chặn tự duyệt các bước SOURCE_HEAD/TARGET_HEAD/HR (giữ bước EMPLOYEE tự xác nhận); chính sách "một người nhiều bước" chờ Q10–Q11. |
| TRF-03 | NEEDS_BUSINESS_DECISION (Q8–Q9) | Giữ/thu hồi chức danh sau chuyển phòng. |
| TRF-04 | FIXED_AND_TESTED | Hộp duyệt nạp bước duyệt bằng một truy vấn, bỏ N+1. |

## 3. Tổng hợp theo trạng thái (63 mã, không trùng lặp)

| Trạng thái | Số mã | Danh sách |
|---|---|---|
| FIXED_AND_TESTED | 23 | AUTH-01, AUTH-02, AUTH-03, AUTH-07, AUTH-08, AUTH-09, RBAC-01, RBAC-02, RBAC-03, STU-02, TCH-02, CLS-01, CLS-02, HR-01, DEL-02, DEL-04, RES-01, RES-05, TRF-02, TRF-04, FAC-01, CC-01, MOD-01 |
| ALREADY_FIXED | 3 | TCH-01, RES-03, CC-07 |
| PARTIAL | 6 | AUTH-06, RBAC-04, RBAC-07, MOD-02, CC-05, SCH-01 |
| NEEDS_BUSINESS_DECISION | 13 | AUTH-05, STU-01, STU-04, CLS-03, CLS-04, SCH-02, MOD-03, CC-08, RES-02, RES-04, TRF-01, TRF-03, HR-04 |
| NEEDS_EXTERNAL_CONFIG | 3 | AUTH-04, CC-02, HR-02 |
| OPEN | 14 | AUTH-10, AUTH-11, RBAC-05, RBAC-06, STU-03, SCH-03, SCH-04, FAC-02, HR-03, DEL-01, DEL-03, CC-03, CC-04, CC-06 |
| NOT_IN_SCOPE | 1 | SCH-05 |

AUTH-01 được xếp FIXED_AND_TESTED vì phần mã đã đóng; việc xử lý tài khoản cũ còn hash `123456`
là hạng mục vận hành (NEEDS_EXTERNAL_CONFIG) đã ghi ở mục 5.

## 4. Câu hỏi nghiệp vụ cần chốt (chặn các mã NEEDS_BUSINESS_DECISION)

Xem chi tiết và phương án trong `MEMS_BUSINESS_DECISIONS_REQUIRED.md`:

- Q1–Q2 → STU-01 (một/nhiều lớp, khác biệt SCHOOL/CENTER).
- Q3–Q4 → SCH-02 (phòng học cấp tổ chức/phòng ban).
- Q5 → CLS-04 (lớp thuộc phòng ban nào).
- Q6 → người duyệt đóng/huỷ lớp khi chưa có giáo viên.
- Q7 → RES-04 (ngày hiệu lực/bàn giao).
- Q8–Q9 → TRF-03, HR-04 (chức danh và lớp sau chuyển phòng).
- Q10–Q11 → TRF-01, TRF-02 (thay thế khi vắng, hạn duyệt).
- Q12 → RES-02 (cấp 1 không khả dụng).
- Q13–Q14 → đăng nhập/username sinh viên bị đình chỉ.
- Q15 → AUTH-05 (nhiều Owner/chuyển giao).
- Q16 → TCH-02 (khớp chuyên môn theo tên hay liên kết cấu trúc).

## 5. Rủi ro tồn dư (đã biết, chưa xử lý)

1. **Migration 43–47 chưa chạy** ở bất kỳ database nào. RBAC-02 cần migration 47 trước khi deploy;
   mã đã có fallback theo tên nên chạy trước/sau đều không gãy.
2. **Cache Identity 30 giây**: thay đổi quyền/module có thể trễ tối đa 30s giữa các instance.
3. **Không có circuit breaker**: Identity chết → PeopleService trả 503 fail-closed (không treo lâu
   nhờ timeout 3s/5s), nhưng không phục vụ được.
4. **JWT quyền 15 phút** (RBAC-05): thu hồi quyền chưa có hiệu lực tức thời.
5. **AUTH-11**: PeopleService chết → không đăng nhập được (Identity phụ thuộc đồng bộ),
   trừ khi đã có phiên/token hợp lệ.
6. **Tài khoản cũ hash `123456`** vẫn đăng nhập được cho tới khi đổi mật khẩu.
7. **HR-02**: mật khẩu tạm trả trong response có thể lộ qua log/proxy.
8. **Không có outbox**: sự kiện lớp/giáo viên chưa lan sang Schedule tự động (CLS-03, SCH-01).
9. **Không có API audit cho Owner** (CC-06) dù audit đã được ghi ở nhiều luồng.

## 6. Thay đổi phát sinh ngoài danh sách 63 mã

- Sự kiện đóng/huỷ lớp: `created_at` tăng nghiêm ngặt trong từng lớp
  (`ClassStatusRepository.insertCloseEvent`) để timeline không đảo thứ tự khi nhiều bước
  xảy ra trong cùng mili-giây — phát hiện qua test hồi quy `ClassLifecycleTest`.
- `PasswordPolicy` (AUTH-09) đồng thời sửa thông điệp lỗi và mã lỗi mới `PASSWORD_TOO_LONG`.
- `TransferResponse.withSteps` phục vụ nạp bước duyệt theo lô (TRF-04).

## 7. Kết luận

- **P0 (10 mã)**: 7 mã đã đóng ở mức mã nguồn + test (AUTH-01, AUTH-02, AUTH-07, RBAC-01,
  CLS-01, TCH-01, MOD-01); AUTH-01 còn hạng mục vận hành (tài khoản cũ); STU-01 và SCH-02 chờ
  quyết định nghiệp vụ; CC-02 chỉ báo cáo cấu hình.
- **P1 (20 mã)**: 13 mã FIXED_AND_TESTED/ALREADY_FIXED; 2 mã PARTIAL (RBAC-04, SCH-01);
  4 mã chờ quyết định (TRF-01, TRF-03, CLS-03, CLS-04) và AUTH-04 chờ hạ tầng email.
  RES-02/RES-04 (P2) cũng chờ quyết định.
- **P2**: đã sửa AUTH-09, FAC-01, RES-05, DEL-04, TRF-04; phần lớn còn lại là bổ sung tính năng
  hoặc thay đổi kiến trúc (RBAC-05, CC-03, CC-06) và các mã cần chốt nghiệp vụ.
- **Không có thay đổi nào được triển khai**; mọi migration mới chỉ nằm trong repo.
- Bước tiếp theo đề xuất: chốt 16 câu hỏi nghiệp vụ → triển khai CLS-03/SCH-01 (kèm outbox CC-03),
  RBAC-05, CC-06, HR-02/HR-03.
