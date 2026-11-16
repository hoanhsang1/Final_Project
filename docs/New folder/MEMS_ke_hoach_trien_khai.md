# MEMS — Kế hoạch triển khai v2 (từng phần, có DoD)

Cập nhật: 15/11/2026 (đã áp dụng 14 quyết định DEC-01..14). Tài liệu toàn dự án đi kèm: **MEMS — Tài liệu đặc tả toàn dự án**. Đi kèm sơ đồ `MEMS_so_do_chuc_nang_theo_vai_tro_v2.drawio` (7 trang; trang 7 là lộ trình).

---

## 0. Cách dùng file này (dành cho người chưa có kinh nghiệm)

1. Làm **tuần tự từng phần** (0.1 → 0.2 → …). Mỗi phần = một lần giao việc cho AI, một commit riêng.
2. Mỗi lần giao, dán cho AI: **(a)** mục "Quy ước chung" bên dưới, **(b)** đúng một phần cần làm, **(c)** câu lệnh: *"Đọc code hiện có liên quan trước, tóm tắt lại bạn hiểu gì, rồi mới sửa. Không đụng các phần khác."*
3. Xong phần nào thì tick hết **DoD** của phần đó (chạy thử thật, không chỉ build thành công). Chưa tick hết thì chưa sang phần kế.
4. Gặp điểm SRS chưa rõ: **hỏi lại trước khi code**, đừng để AI tự đoán.
5. Sau mỗi giai đoạn: cập nhật `docs/api.md`, README và file draw.io nếu có đổi quyền hoặc luồng.

### Mẫu câu giao việc
```
Bối cảnh: dự án MEMS (4 Spring Boot service Identity/People/Schedule/Facility, MySQL, docker-compose).
Nhiệm vụ: <dán một phần, ví dụ "1.3 Khóa tài khoản sau đăng nhập sai">.
Yêu cầu: đọc code liên quan trước và tóm tắt; tuân thủ "Quy ước chung"; viết migration mới (số kế tiếp);
thêm test; cuối cùng liệt kê file đã sửa và cách tôi kiểm tra tay từng mục DoD.
```

---

## 1. Quy ước chung (áp dụng cho mọi phần)

- **Migration:** file SQL ở thư mục gốc, đánh số tiếp theo, hiện tới `27_facility_equipment_department.sql` → phần mới bắt đầu từ `28_…` (tên dạng `28_identity_xxx.sql`, `28_people_xxx.sql`…). Không sửa migration cũ.
- **Phân quyền:** dùng đúng mẫu hiện có: `@PreAuthorize(hasRole('OWNER') or hasAnyAuthority(...))`, `@RequirePermission`, `Actor` (org_id lấy từ JWT, **không nhận userId/orgId từ client**). Quyền mới phải thêm vào catalog + gán vào bundle/chức vụ mặc định bằng migration.
- **Module guard:** nghiệp vụ lịch / CSVC phải kiểm module bật ở tổ chức **và** phòng ban.
- **Lỗi:** thêm mã lỗi vào `ErrorCode` của service tương ứng, thông báo rõ ràng, trả đúng HTTP status.
- **Ghi vết:** hành động quan trọng ghi audit / status_log; thông báo qua `NotificationService` (đã có, bảng `notification`).
- **Giao dịch:** thao tác nhiều bản ghi (xếp lịch lặp, áp dụng duyệt) phải nằm trong một transaction.
- **Test:** mỗi phần thêm test cho luồng chính + ít nhất 2 trường hợp lỗi.
- **Frontend:** FE chỉ ẩn/hiện theo quyền (UX); backend luôn kiểm lại 401/403.
- **Tên gọi:** "Sinh viên" (mã `STUDENT`), route `/sinh-vien`.

## 2. Các điểm đã chốt

| # | Quyết định |
|---|---|
| 1 | OWNER bật/tắt module Optional của tổ chức; SUPER_ADMIN chỉ ghi đè/khóa; module lõi (Sinh viên, Giáo viên, Lớp, Lịch) không tắt được |
| 2 | Gộp "Quản lý đào tạo" vào một chức vụ seed duy nhất: **Giáo vụ** (bundle `ACADEMIC_MANAGEMENT`) |
| 3 | Duyệt leo thang Trưởng phòng → Tổng quản lý → OWNER; không ai tự duyệt; OWNER tự thao tác thì thực hiện trực tiếp + ghi audit |
| 4 | Giữ "Sinh viên", đổi route `/hoc-sinh` → `/sinh-vien`; nhãn theo loại tổ chức để backlog |
| 5 | Trạng thái lớp: tính khi đọc + job `@Scheduled` mỗi đêm; trạng thái đặt tay không bị ghi đè |
| 6 | Phòng học / thiết bị là tài nguyên cấp tổ chức do CSVC quản lý; phòng ban có module lịch được xếp vào mọi phòng đang hoạt động; trùng lịch chặn cứng |
| 7 | Chuyển phòng giữ 4 bên, có nhân viên xác nhận (DEC-01..03); hiệu lực ngay khi đủ 4 bên duyệt; thu hồi chức vụ/phân công cấp phòng cũ, giữ chức vụ cấp tổ chức |
| 8 | HR chỉ gán chức vụ có quyền ⊆ quyền của mình, chức vụ cấp tổ chức do Owner gán (DEC-04) — **đã có** trong `MembershipPolicy` |
| 9 | Quản trị viên tổ chức = chức vụ vận hành 4 bundle, **không** có quyền cấp Owner: ủy quyền, bổ nhiệm Tổng quản lý, bật/tắt module, nhật ký tổ chức (DEC-05) |
| 10 | Owner bị khóa: SUPER_ADMIN chỉ mở khóa / reset mật khẩu Owner, có audit, không làm nghiệp vụ (DEC-06) |
| 11 | Nghỉ việc: HR không tự duyệt (đã có); chỉ có một HR thì leo thang Trưởng phòng → Tổng quản lý → OWNER (DEC-08) |
| 12 | Tắt module Optional = chỉ đọc, giữ dữ liệu; chặn tắt khi còn yêu cầu đang chờ; bật lại khôi phục nguyên trạng (DEC-11) |
| 13 | Owner thao tác trực tiếp có audit; không bypass kiểm `org_id`, không tự chuyển phòng, không xóa audit (DEC-13) |
| 14 | Không có hạn tự duyệt / tự từ chối; chỉ thông báo nhắc (DEC-14). Sự cố CSVC: báo → xử lý, thêm mức độ + liên kết phòng ngừng dùng với lịch (DEC-10) |

## 3. Hiện trạng đã kiểm tra trong code (để khỏi làm lại)

**Đã có:** bảng `password_reset_token` (chưa có endpoint), `MembershipPolicy` (HR chỉ gán chức vụ ⊆ quyền của mình), `SELF_APPROVAL_NOT_ALLOWED` cho hủy/đóng lớp và nghỉ việc, thông báo (`/notifications`), hộp thư chuyển phòng (`/transfer-requests/inbox`), đổi mật khẩu (`/auth/change-password`), bật/tắt module do SUPER_ADMIN (`PUT /organizations/{id}/modules`), `teachingStatus` của giáo viên, danh sách môn học (`GET /subjects`), chuyên môn (`/specialties`), CRUD buổi học, chặn trùng giáo viên/phòng/lớp, gợi ý phòng trống, lịch của tôi (`/schedules/me`), nhãn "lớp cần phân công lại".

**Chưa có:** endpoint quên/đặt lại mật khẩu (đã có bảng token), khóa tài khoản sau đăng nhập sai (mới có cột DB, code chưa dùng), hồ sơ cá nhân, môn học CRUD, xếp lịch lặp, kiểm tra sức chứa, liên động lịch, điểm danh, đổi lịch/dạy bù, job đêm, lịch tuần/tháng.

> Lưu ý: `README` và `docs/api.md` còn ghi `FACILITY_MANAGEMENT` "không tồn tại" và bật/tắt module chỉ đọc — đã lỗi thời, sửa ở phần 0.6.

---

# GIAI ĐOẠN 0 — Dọn nền

### 0.1 Bảng ánh xạ module
- **Làm:** lập bảng thống nhất *module SRS ↔ mã module trong DB ↔ bundle ↔ có phải module lõi*. Rà `module` seed (hiện `CLASS_MANAGEMENT`, `EQUIPMENT_MANAGEMENT`, `ROOM_MANAGEMENT`, `SCHEDULE_MANAGEMENT`, `STUDENT_MANAGEMENT`, `TEACHER_MANAGEMENT` + `FACILITY_MANAGEMENT` từ migration 16–26) và quyết định tên chuẩn. Ghi vào `docs/` và trang 5 sơ đồ.
- **DoD**
  - [ ] Có bảng ánh xạ trong `docs/`, không còn hai tên cho cùng một module.
  - [ ] Cờ module lõi trong DB khớp bảng.
  - [ ] Không có thay đổi hành vi (chỉ đổi dữ liệu/tài liệu nếu cần).

### 0.2 OWNER bật/tắt module Optional; SUPER_ADMIN ghi đè
- **Làm:** thêm API cho OWNER bật/tắt module Optional của **tổ chức mình** (Identity). Module lõi bị chặn tắt ở **backend** (hiện mới chặn ở FE). SUPER_ADMIN có thao tác "khóa module với tổ chức" (cột ví dụ `locked_by_admin`); OWNER không bật lại được module đang bị khóa. Đọc `OrganizationController`, `InternalOrganizationController`, bảng `organization_module` trước.
- **Tắt module = chỉ đọc** (DEC-11): giữ dữ liệu, chặn tạo/sửa/duyệt; **chặn tắt** khi còn yêu cầu đang chờ (chuyển phòng, hủy/đóng lớp, đổi lịch) và báo danh sách; bật lại thì khôi phục nguyên trạng, không mất dữ liệu.
- **Quyền mới:** `org.module.toggle` (OWNER), `org.module.override` (SUPER_ADMIN).
- **DoD**
  - [ ] OWNER bật/tắt được module Optional; tắt module lõi trả lỗi rõ ràng.
  - [ ] SUPER_ADMIN khóa module → OWNER không bật lại được, UI báo "bị quản trị hệ thống khóa".
  - [ ] Tắt module ở tổ chức thì mọi phòng ban mất quyền dùng module (guard hiện có vẫn đúng).
  - [ ] Có audit log cho mỗi lần bật/tắt/khóa.
  - [ ] Test: OWNER tổ chức A không đụng được tổ chức B.
  - [ ] Tắt module có yêu cầu đang chờ → bị chặn kèm danh sách; tắt được → dữ liệu cũ vẫn xem được, không tạo/sửa mới được; bật lại → dùng lại bình thường.

### 0.3 Chức vụ Giáo vụ gộp
- **Làm:** sửa `DefaultPositionSeeder` + migration cho tổ chức hiện có: chỉ còn chức vụ "Giáo vụ" (bundle `ACADEMIC_MANAGEMENT`, scope ORGANIZATION). Bỏ mọi tham chiếu "Quản lý đào tạo". **Giáo vụ không có quyền duyệt đóng/hủy lớp** (chỉ Trưởng phòng; xem 1.5).
- **Quản trị viên tổ chức** (DEC-05): giữ 4 bundle vận hành nhưng **không** có nhóm quyền cấp Owner (`delegation.*`, `general_manager.*`, `org.module.toggle`, `org.audit.view`) — nhóm này chỉ OWNER dùng được.
- **DoD**
  - [ ] Người giữ "Quản trị viên tổ chức" gọi API ủy quyền / bổ nhiệm Tổng quản lý / bật-tắt module / nhật ký tổ chức → 403.
  - [ ] Tổ chức mới tạo chỉ có "Giáo vụ", không có "Quản lý đào tạo".
  - [ ] Tổ chức cũ được migrate, người đang giữ chức vụ cũ không mất quyền hợp lệ.
  - [ ] `class.approve_close` không còn trong quyền hiệu lực của Giáo vụ.

### 0.4 Đổi route `/hoc-sinh` → `/sinh-vien`
- **Làm:** đổi route FE, guard, điều hướng sau đăng nhập, link nội bộ; giữ redirect từ `/hoc-sinh` một thời gian.
- **DoD**
  - [ ] Đăng nhập sinh viên vào `/sinh-vien`; `/hoc-sinh` chuyển hướng đúng.
  - [ ] Không còn chuỗi `hoc-sinh` trong code FE (trừ redirect).

### 0.5 Dọn role cũ
- **Làm:** `ORG_ADMIN`, `ACADEMIC_STAFF`, `FACILITY_STAFF`: đánh dấu deprecated, không cấp mới; kiểm tra không còn tài khoản dùng rồi gỡ khỏi seed.
- **DoD**
  - [ ] Truy vấn xác nhận không tài khoản nào còn các role này (hoặc đã migrate).
  - [ ] Seed không tạo lại role cũ; hệ thống chạy từ DB trống bình thường.

### 0.6 Sửa tài liệu lỗi thời
- **DoD**
  - [ ] `README` và `docs/api.md` ghi đúng `FACILITY_MANAGEMENT` và `PUT /organizations/{id}/modules`.
  - [ ] Danh sách endpoint trong `docs/api.md` khớp controller thực tế.

---

### 0.7 Khôi phục Owner bị khóa (DEC-06)
- **Làm:** SUPER_ADMIN có thao tác **mở khóa / reset mật khẩu Owner** của một tổ chức (Identity, `POST /accounts/{id}/unlock` và `reset-password` đã có phần nền). Chỉ làm hai việc này, **không** có quyền nghiệp vụ; bắt buộc nhập lý do và ghi audit. Ủy quyền Tổng quản lý còn hiệu lực vẫn chạy khi Owner vắng.
- **DoD**
  - [ ] SUPER_ADMIN mở khóa / reset được Owner; thao tác khác trong tổ chức vẫn bị chặn.
  - [ ] Mỗi lần có audit (ai, tổ chức nào, lý do).
  - [ ] Tổng quản lý được ủy quyền vẫn thao tác đúng phạm vi trong lúc Owner bị khóa.

### 0.8 Tách dải mã lỗi trùng nhau
- **Vấn đề:** `PeopleService` dùng 3001–3042 cho lỗi kiểm tra dữ liệu, trùng với 3001–3007 của `ScheduleService`; FE ánh xạ theo mã sẽ nhập nhằng.
- **Làm:** chọn dải riêng cho validation của People (ví dụ 2501–2599) hoặc đổi dải Schedule; cập nhật `ErrorCode`, test, `docs/api.md` và bảng ánh xạ lỗi ở FE. Không đổi mã lỗi đã có người dùng ngoài nếu chưa cần.
- **DoD**
  - [ ] Không còn mã lỗi trùng giữa bốn service (có test hoặc script kiểm tra tự động).
  - [ ] FE hiển thị đúng thông báo cho từng mã lỗi sau khi đổi.
  - [ ] `docs/api.md` ghi bảng dải mã lỗi.

---

# GIAI ĐOẠN 1 — Tài khoản & duyệt

### 1.1 Hồ sơ cá nhân
- **Làm:** `GET/PUT /me` (họ tên, SĐT; email chỉ đọc hoặc cần xác nhận) cho mọi vai trò; FE `/ho-so` gộp "đổi mật khẩu" (API `change-password` đã có).
- **DoD**
  - [ ] Mọi vai trò xem/sửa được hồ sơ của mình; không sửa được của người khác (dù đổi id trong request).
  - [ ] Đổi mật khẩu thành công yêu cầu mật khẩu cũ đúng; sai trả lỗi rõ.
  - [ ] Dữ liệu hợp lệ được validate (SĐT, độ dài).

### 1.2 Quên / đặt lại mật khẩu
- **Làm:** Identity: bảng `password_reset_token` **đã có** (cột `token_hash`, `expires_at`; kiểm tra thêm cột `used_at`, nếu thiếu thì thêm bằng migration), lưu **hash**, hạn 30 phút, dùng một lần; thêm `POST /auth/forgot-password`, `POST /auth/reset-password`. Gửi email qua cấu hình SMTP; môi trường dev dùng MailHog hoặc ghi link ra log. FE `/quen-mat-khau`, `/dat-lai-mat-khau?token=…` (route đã có).
- **Quy tắc:** phản hồi `forgot-password` luôn giống nhau dù email có tồn tại hay không (không lộ tài khoản); giới hạn số lần yêu cầu mỗi giờ.
- **DoD**
  - [ ] Nhận được link, đặt lại thành công, đăng nhập bằng mật khẩu mới.
  - [ ] Token dùng lần hai / quá hạn / sai → bị từ chối.
  - [ ] Đặt lại xong thì mọi refresh token cũ bị thu hồi.
  - [ ] Không có chi tiết nào cho biết email có tồn tại hay không.

### 1.3 Khóa tài khoản sau đăng nhập sai
- **Làm:** dùng cột sẵn có (`failed_login_attempts`, thời điểm khóa): sai 5 lần → khóa 15 phút; đăng nhập đúng thì reset bộ đếm; OWNER/SUPER_ADMIN mở khóa sớm (`POST /accounts/{id}/unlock`).
- **DoD**
  - [ ] Sai 5 lần → bị khóa, báo thời gian còn lại; hết hạn tự đăng nhập được.
  - [ ] Mở khóa thủ công hoạt động; OWNER chỉ mở khóa tài khoản trong tổ chức mình.
  - [ ] Có audit log khóa/mở khóa.

### 1.4 Reset mật khẩu và khóa/mở tài khoản sinh viên
- **Làm:** People: `POST /students/{id}/reset-password`, `PATCH /students/{id}/account-status` (gọi `InternalAccountController` của Identity đã có). Quyền: Giáo vụ, OWNER.
- **DoD**
  - [ ] Giáo vụ reset được mật khẩu sinh viên (mật khẩu tạm, bắt đổi lần đầu).
  - [ ] Khóa tài khoản thì sinh viên không đăng nhập được, hồ sơ vẫn còn.
  - [ ] Giáo vụ không thao tác được sinh viên của tổ chức khác.

### 1.5 Duyệt leo thang
- **Hiện trạng:** `ClassApprovalPolicy.canApprove` = OWNER hoặc trưởng phòng (chức vụ "Trưởng phòng"/"Trưởng phòng ban") của phòng giữ module `STUDENT_MANAGEMENT`; mã lỗi `CLASS_APPROVER_NOT_ALLOWED`, `SELF_APPROVAL_NOT_ALLOWED`.
- **Làm:** mở rộng `ClassApprovalPolicy` (hủy/đóng lớp) **và** `ResignationService.approve` (nghỉ việc): người duyệt hợp lệ = Trưởng phòng phụ trách ≠ người yêu cầu; nếu không có → Tổng quản lý (có ủy quyền hiệu lực); nếu không có → OWNER. OWNER tự yêu cầu thì thực hiện trực tiếp + audit. Giữ `SELF_APPROVAL_NOT_ALLOWED`.
- **DoD**
  - [ ] Phòng có Trưởng phòng → chỉ Trưởng phòng (không phải người yêu cầu) duyệt được.
  - [ ] Phòng thiếu Trưởng phòng, hoặc Trưởng phòng là người yêu cầu → Tổng quản lý/OWNER duyệt được.
  - [ ] Không ai duyệt được yêu cầu của chính mình.
  - [ ] OWNER tự hủy/đóng lớp: thực hiện ngay, có dòng audit.
  - [ ] Test đủ 4 trường hợp trên.
  - [ ] Nghỉ việc: chỉ có một HR trong phòng và HR đó là người tạo → Trưởng phòng / Tổng quản lý / OWNER duyệt được; HR đó vẫn không tự duyệt được.
  - [ ] HR không gán được chức vụ có quyền vượt quyền của mình, không gán được chức vụ cấp tổ chức (đã có `MembershipPolicy` — chỉ bổ sung test).
  - [ ] Không có bất kỳ cơ chế tự duyệt / tự từ chối theo thời gian; chỉ có thông báo nhắc (DEC-14).

### 1.6 "Việc chờ tôi duyệt" + hộp thông báo (FE)
- **Làm:** BE có `/notifications` và `/transfer-requests/inbox`; thêm `GET /approvals/inbox` gộp các yêu cầu đang chờ **riêng cho người đăng nhập** (chuyển phòng, hủy/đóng lớp, sau này đổi lịch). FE: `/viec-cho-duyet`, `/thong-bao`, chấm đỏ số chưa đọc.
- **DoD**
  - [ ] Người duyệt thấy đúng và đủ yêu cầu thuộc quyền mình, không thấy của người khác.
  - [ ] Duyệt/từ chối ngay trong danh sách; xong thì biến khỏi hộp.
  - [ ] Thông báo đánh dấu đã đọc / đọc tất cả hoạt động.

### 1.7 Đổi trạng thái giáo viên / sinh viên
- **Làm:** giáo viên: `teachingStatus` (đang dạy / tạm nghỉ / nghỉ việc; mặc định "chưa có lớp"); sinh viên: đang học / bảo lưu / thôi học / tốt nghiệp. Endpoint đổi trạng thái + ghi lịch sử. Gán giáo viên cho lớp chỉ cho giáo viên **đang dạy**.
- **DoD**
  - [ ] Đổi trạng thái có lịch sử (ai, khi nào, lý do).
  - [ ] Giáo viên tạm nghỉ/nghỉ việc không gán được vào lớp mới.
  - [ ] Sinh viên thôi học bị rút khỏi lớp đang học (theo quy tắc đã chốt với SRS — **hỏi lại nếu chưa rõ**).

### 1.8 Môn học CRUD + khớp chuyên môn
- **Làm:** `POST/PUT/DELETE(vô hiệu hóa) /subjects` (hiện chỉ GET); khi gán giáo viên cho lớp, kiểm chuyên môn giáo viên khớp **tên môn** của lớp.
- **DoD**
  - [ ] Giáo vụ tạo/sửa/vô hiệu hóa môn học; môn đang dùng bởi lớp không xóa cứng được.
  - [ ] Gán giáo viên không khớp chuyên môn bị từ chối với thông báo rõ.

---

# GIAI ĐOẠN 2 — Xếp lịch (nhóm A)

### 2.1 Phòng học cấp tổ chức
- **Làm:** `FacilityService` thêm API đọc `GET /facilities/rooms/available` cho toàn tổ chức (phòng đang hoạt động); `ScheduleService` dùng danh sách này thay vì lọc theo phòng ban xếp lịch. CRUD phòng vẫn do phòng ban CSVC. Cân nhắc cột "phòng ban quản lý" nếu phòng đang gắn `department_id` (migration 27).
- **DoD**
  - [ ] Phòng ban Đào tạo chọn được phòng do CSVC quản lý.
  - [ ] Phòng bị tắt/bảo trì không hiện trong danh sách chọn.
  - [ ] Không xem được phòng của tổ chức khác.

### 2.2 Xếp lịch lặp có xem trước
- **Làm:** `POST …/schedules/preview` (lớp, giáo viên, phòng, các thứ trong tuần, giờ, khoảng ngày) → trả danh sách buổi, mỗi buổi `OK` hoặc `CONFLICT` + lý do. `POST …/schedules/bulk` lưu các buổi hợp lệ trong **một transaction** (chế độ "bỏ qua buổi trùng" hoặc "dừng hết"). Dùng lại logic chặn trùng hiện có; chặn khóa đồng thời (hai người xếp cùng lúc).
- **DoD**
  - [ ] Preview chính xác số buổi; buổi trùng giáo viên/phòng/lớp bị đánh dấu kèm lý do.
  - [ ] Lưu xong, danh sách buổi đúng như xem trước; lỗi giữa chừng thì không lưu nửa vời.
  - [ ] Hai request song song cùng một phòng/giờ: một thành công, một bị chặn.
  - [ ] Lớp đã đóng/hủy không xếp được.

### 2.3 Kiểm tra sức chứa
- **DoD**
  - [ ] Phòng nhỏ hơn sĩ số lớp bị từ chối (cả tạo lẻ, sửa, lặp).
  - [ ] Thông báo nêu rõ sức chứa và sĩ số.

### 2.4 Liên động lịch
- **Làm:** (a) lớp bị hủy/đóng → hủy mọi buổi **chưa diễn ra**; (b) giáo viên nghỉ việc/chuyển phòng → gắn cờ lớp + buổi tương lai "cần phân công lại" (mở rộng cờ lớp đã có); (c) phòng bảo trì/thiết bị hỏng (sự cố CSVC có thêm **mức độ** thấp/trung/cao và cờ "phòng ngừng sử dụng") → **liệt kê** buổi bị ảnh hưởng, không tự hủy. Gửi thông báo tương ứng. Giao tiếp giữa service qua API nội bộ (`/internal/…`) hoặc sự kiện; chọn một cách và dùng nhất quán.
- **DoD**
  - [ ] Đóng/hủy lớp: buổi tương lai chuyển `cancelled`, buổi quá khứ giữ nguyên.
  - [ ] Giáo viên nghỉ việc được duyệt: buổi tương lai bị gắn cờ, người quản lý lớp nhận thông báo.
  - [ ] Phòng bảo trì: có danh sách buổi ảnh hưởng, không buổi nào tự đổi.
  - [ ] Lỗi một service không làm hỏng dữ liệu service kia (có cách xử lý/ thử lại).

### 2.5 Lịch tuần/tháng + lọc
- **Làm:** `GET …/schedules?from=&to=&classId=&teacherId=&roomId=`; FE lịch tuần/tháng tại `/dao-tao/lich-hoc`.
- **DoD**
  - [ ] Lọc đúng theo lớp, giáo viên, phòng, khoảng ngày; phân trang hoặc giới hạn khoảng ngày.
  - [ ] Người chỉ có quyền xem phòng ban thấy đúng phạm vi của mình.

### 2.6 Job đêm — trạng thái lớp tự động
- **Làm:** hàm tính trạng thái từ ngày bắt đầu/kết thúc dùng mỗi lần đọc lớp; `@Scheduled` mỗi đêm ghi `class_status_log`, gửi thông báo, đồng bộ cột `status`. **Không ghi đè** `DA_HUY` / đóng lớp. Bật `@EnableScheduling`; nếu chạy nhiều bản service thì cần khóa (ví dụ ShedLock) hoặc chấp nhận chạy idempotent.
- **DoD**
  - [ ] Lớp đến ngày bắt đầu → `DANG_DIEN_RA`; qua ngày kết thúc → `DA_KET_THUC` (đúng cả khi job chưa chạy).
  - [ ] Lớp `DA_HUY`/đã đóng không bị job đổi.
  - [ ] Chạy job hai lần liên tiếp không tạo log trùng.

---

# GIAI ĐOẠN 3 — Nhóm B

### 3.1 Điểm danh
- **Làm:** bảng `attendance` (buổi, sinh viên, trạng thái có mặt/vắng/trễ, ghi chú, người điểm danh); `POST/PUT …/sessions/{id}/attendance`; chỉ giáo viên **được phân công buổi đó** (hoặc OWNER) điểm danh. Quyền `schedule.attendance.mark/view`.
- **DoD**
  - [ ] Giáo viên điểm danh đúng buổi của mình, không điểm danh buổi người khác.
  - [ ] Danh sách điểm danh chỉ gồm sinh viên đang thuộc lớp tại thời điểm đó.
  - [ ] Sửa điểm danh có lịch sử; khóa sửa sau N ngày (**chốt với SRS**).

### 3.2 Chuyên cần của sinh viên
- **DoD**
  - [ ] Sinh viên chỉ xem chuyên cần của chính mình (`attendance.self_view`, chỉ dùng id trong JWT).
  - [ ] Báo cáo chuyên cần lớp cho Giáo vụ/Trưởng phòng/giáo viên lớp đó đúng số liệu.

### 3.3 Đổi lịch / dạy bù / nghỉ
- **Làm:** giáo viên gửi yêu cầu (lý do bắt buộc) → duyệt leo thang (1.5) → duyệt thì tạo/đổi buổi (kiểm trùng như 2.2) + thông báo lớp; từ chối thì giữ lịch cũ.
- **DoD**
  - [ ] Yêu cầu hiện trong "Việc chờ tôi duyệt" của đúng người duyệt.
  - [ ] Duyệt → lịch đổi, không phát sinh trùng; từ chối → lịch giữ nguyên + lý do.
  - [ ] Người gửi hủy được khi còn chờ.

### 3.4 Buổi học tự completed
- **DoD**
  - [ ] Buổi quá giờ kết thúc → `completed` (job đêm, idempotent); buổi đã hủy không đổi.

---

# GIAI ĐOẠN 4 — Nhóm C (làm sau, chưa chi tiết)

- Gợi ý xếp lịch tự động (thuật toán tham lam theo ràng buộc) + khung giờ bận/rảnh giáo viên + ngày nghỉ của tổ chức.
- Nhập sinh viên từ Excel.
- Dashboard theo vai trò, báo cáo cơ bản.
- Nhãn "học sinh / học viên" theo loại tổ chức.

---

## 4. Điểm cần hỏi lại SRS trước khi code (đừng để AI tự đoán)

1. Sinh viên "thôi học / bảo lưu" có tự rút khỏi lớp đang học không? (1.7)
2. Có cho sửa điểm danh sau bao nhiêu ngày? (3.1)
3. Giáo viên có được xếp vào lớp của phòng ban khác không? (2.1, ảnh hưởng quyền xem lịch)
4. Quên mật khẩu: tài khoản sinh viên do Giáo vụ cấp có email để nhận link không, hay chỉ reset qua Giáo vụ? (1.2)
5. Ai là người xếp lịch mặc định? Hiện chưa có chức vụ điều phối lịch; tạm gán bundle `SCHEDULE_MANAGEMENT` cho Giáo vụ.
