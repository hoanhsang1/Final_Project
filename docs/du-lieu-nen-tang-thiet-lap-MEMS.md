> ⚠️ **Snapshot lịch sử — đối chiếu 2026-11-26.** Mọi trạng thái/số liệu/lệnh bên dưới là tại thời điểm soạn, không phải hiện tại. Nguồn chuẩn hiện tại: `D:\Final_Project\docs\trang-thai-hien-tai-2026-11-26.md`; quyết định P4: `D:\Final_Project\docs\scope-can-chot-xep-lich.md`. Giữ lại để tra cứu, không xoá.

# Dữ liệu nền tảng và thiết lập ban đầu hệ thống MEMS

> **Bản làm việc trong repo.** Copy từ `D:\Đồ án tốt nghiệp\Du-lieu-nen-tang-thiet-lap-MEMS.md`; bản ngoài repo chỉ để nộp. Khi đổi DB/seed thì cập nhật bản này trước, rồi đồng bộ ra bản ngoài.

> **Mục đích:** Tổng hợp chi tiết các loại dữ liệu/nền tảng mà khách hàng (và quản trị nền tảng) cần xây dựng/thiết lập để hệ thống MEMS vận hành được **toàn diện** (không chỉ lịch học/dạy).  
> **Đối tượng đọc:** Nhóm dự án, BA/PO, triển khai, vận hành, phát triển và kiểm thử.  
> **Cập nhật:** 2026-11-20 (dựa trên mã nguồn/tài liệu trong repo tại thời điểm soạn).

---

## 1. Cách đọc tài liệu

- **Tên dễ hiểu (tên kỹ thuật trong code/DB):** Mỗi khái niệm/đối tượng dữ liệu được ghi bằng tên nghiệp vụ kèm tên kỹ thuật trong ngoặc đơn, ví dụ: *Tổ chức (`organization`)*, *Cấu hình module của tổ chức (`organization_module`, `module_config`)*.
- **Nguồn tham chiếu chính (repo):** `01_identity_db.sql` (Identity/định danh & tổ chức), `02_people_db.sql` (People/hồ sơ con người), `03_schedule_db.sql` (Schedule/lớp & lịch), `04_facility_db.sql` (Facility/cơ sở vật chất), `05_seed_admin.sql` (dữ liệu khởi tạo vai trò/quyền/module/tài khoản mẫu), `06`–`09_*department_access*.sql` (phòng ban & phạm vi truy cập), `docs/api.md`, `docs/department-access.md`, `docs/department-access-files.md`, `README.md`, `PROJECT_CONTEXT.md`, `frontend/src/features/*` (các màn hình/luồng FE hiện có).
- **Lưu ý quan trọng:** Tài liệu mô tả **mô hình dữ liệu và nền tảng cần có**; trạng thái triển khai API/UI end-to-end có thể khác nhau theo sprint. Những điểm chưa chốt/đang phụ thuộc triển khai được đánh dấu **[Cần xác minh]**.

---

## 2. Tổng quan hệ thống và nguyên tắc nền tảng

### 2.1. Mô hình đa tổ chức (multi-tenant)
- Hệ thống phục vụ **nhiều tổ chức** (trường/trung tâm) trên cùng nền tảng. Dữ liệu nghiệp vụ gần như luôn gắn với **mã tổ chức (`org_id`)** để phân tách phạm vi.
- **Tổ chức (`organization`)** là “đơn vị thuê bao/vận hành” cấp cao: phải được tạo và chuyển sang trạng thái hoạt động trước khi người dùng trong tổ chức khai thác hệ thống.

### 2.2. Phân tách theo dịch vụ/cơ sở dữ liệu (logical)
- **Dịch vụ định danh & tổ chức (Identity Service / `mems_identity_db`):** tổ chức, tài khoản, vai trò/quyền, gán vai trò, cấu hình/kích hoạt module, phiên/refresh token, nhật ký kiểm toán, v.v.
- **Dịch vụ hồ sơ con người (People Service / `mems_people_db`):** hồ sơ học sinh/giáo viên/nhân sự, cấu trúc phòng ban–chức vụ–thành viên và phân quyền nội bộ theo phòng ban (phần department access).
- **Dịch vụ lịch & lớp (Schedule Service / `mems_schedule_db`):** lớp học, ghi danh, phân công giáo viên, buổi học/lịch, khóa tài nguyên xếp lịch.
- **Dịch vụ cơ sở vật chất (Facility Service / `mems_facility_db`):** phòng học/phòng máy, thiết bị, báo cáo sự cố, lịch sử trạng thái thiết bị.
- **Ràng buộc liên dịch vụ:** Nhiều tham chiếu giữa các DB là **tham chiếu mềm (soft reference)** (lưu UUID/ID nhưng không có khóa ngoại xuyên DB), ví dụ `org_id`, `account_id`, `student_id`, `teacher_id`, `room_id`. Tính hợp lệ/thuộc tổ chức phải được đảm bảo ở tầng ứng dụng/dịch vụ. **[Cần xác minh]** mức độ kiểm tra đang được thực thi ở từng luồng.

### 2.3. Hai lớp “nền tảng” cần phân biệt
1. **Nền tảng cấp hệ thống (platform):** do quản trị hệ thống thiết lập/khởi tạo (vai trò, quyền, danh mục module, tài khoản quản trị nền tảng, quy trình duyệt tổ chức).
2. **Nền tảng cấp tổ chức (tenant/org):** do tổ chức thiết lập sau khi được duyệt (bật module, tài khoản & vai trò nội bộ, cơ cấu tổ chức, hồ sơ, phòng học, lớp, phân công, lịch…).

---

## 3. Nền tảng cấp hệ thống (Platform foundation)

> Phần này thường do đội vận hành/triển khai hoặc Super Admin nền tảng thực hiện; khách hàng (tổ chức) thụ hưởng kết quả.

### 3.1. Khởi tạo cơ sở dữ liệu và dữ liệu hệ thống
- **Schema/DB:** Tạo các cơ sở dữ liệu và bảng theo bộ script `01`–`04` (và các script bổ sung `06`–`09` khi áp dụng). `README.md` nêu DB không dùng công cụ migrate tự động trong cách vận hành được mô tả; cần chạy đúng thứ tự/phù hợp môi trường.
- **Dữ liệu khởi tạo (seed) (`05_seed_admin.sql`):**
  - **Vai trò (`role`):** tạo các vai trò nền tảng và tổ chức, gồm `SUPER_ADMIN` (phạm vi platform), `ORG_ADMIN`, `ACADEMIC_STAFF`, `FACILITY_STAFF`, `TEACHER`, `STUDENT` (phạm vi organization) và `ORG_OWNER` (chủ sở hữu tổ chức). Mỗi vai trò có mã (`code`), tên (`name`), phạm vi (`scope`: `platform`/`organization`), mô tả.
  - **Quyền (`permission`):** tạo danh mục quyền như `ORG_APPROVE`, `ORG_MANAGE`, `ACCOUNT_MANAGE`, `MODULE_MANAGE`, `PEOPLE_READ`, `PEOPLE_WRITE`, `CLASS_READ`, `CLASS_WRITE`, `SCHEDULE_READ`, `SCHEDULE_WRITE`, `FACILITY_READ`, `FACILITY_WRITE`, `INCIDENT_CREATE`, `INCIDENT_MANAGE`, `REPORT_READ`.
  - **Gán quyền cho vai trò (`role_permission`):**
    - `SUPER_ADMIN`: được gán toàn bộ quyền trong danh mục (chính sách nghiệp vụ/multi-tenant vẫn do tầng dịch vụ áp dụng).
    - `ORG_ADMIN`: toàn bộ quyền phạm vi tổ chức ngoại trừ `ORG_APPROVE`.
    - `ACADEMIC_STAFF`: quyền đọc/ghi con người, lớp, lịch, xem báo cáo (theo seed).
    - `FACILITY_STAFF`: quyền đọc/ghi cơ sở vật chất, tạo/xử lý sự cố (theo seed).
    - `TEACHER`: đọc lớp, đọc lịch, tạo báo cáo sự cố (theo seed).
    - `STUDENT`: đọc lớp, đọc lịch, tạo báo cáo sự cố (theo seed).
  - **Danh mục module (`module`):** khởi tạo (upsert) các module: `STUDENT_MANAGEMENT` (Quản lý học sinh), `TEACHER_MANAGEMENT` (Quản lý giáo viên), `CLASS_MANAGEMENT` (Quản lý lớp học), `SCHEDULE_MANAGEMENT` (Quản lý lịch học), `ROOM_MANAGEMENT` (Quản lý phòng học), `EQUIPMENT_MANAGEMENT` (Quản lý thiết bị), `is_active = TRUE`.
  - **Tài khoản quản trị nền tảng mẫu (tùy chọn, có trong seed):** tài khoản `platform_admin` (`account` với `org_id` NULL, trạng thái `active`) và gán vai trò `SUPER_ADMIN` (`account_role`). **Lưu ý bảo mật:** seed mẫu gắn hash mật khẩu minh họa; khi triển khai thực tế phải dùng mật khẩu/hash mạnh, riêng tư, xoay sau lần đầu và không commit bí mật (xem `README.md`).

### 3.2. Quản trị nền tảng vận hành hằng ngày
- **Quản trị viên hệ thống / Super Admin (`SUPER_ADMIN`):** duyệt/từ chối tổ chức đăng ký, quản trị nền tảng, (theo phạm vi triển khai) quản lý tổ chức/tài khoản/module/nhật ký ở cấp hệ thống.
- **Nhật ký kiểm toán cấp nền tảng (`audit_log`):** ghi nhận hành động, đối tượng tác động, người thực hiện, thời gian; có thể gắn `org_id` hoặc để NULL cho sự kiện toàn nền tảng. Dữ liệu này do hệ thống ghi nhận (không phải khách hàng “nhập tay” như master data), nhưng là nền tảng quản trị/tuân thủ.

---

## 4. Nền tảng onboarding tổ chức (Organization onboarding)

### 4.1. Đăng ký và thông tin tổ chức (`organization`)
- **Mục đích:** Khai báo đơn vị khách hàng (trường/trung tâm) lên nền tảng.
- **Thông tin chính (theo schema):**
  - Định danh: `id` (UUID).
  - Tên tổ chức: `name`.
  - Loại tổ chức: `org_type` — `school` (trường), `center` (trung tâm).
  - Trạng thái: `status` — `pending` (chờ duyệt), `active` (đang hoạt động), `rejected` (từ chối), `suspended` (tạm ngưng).
  - Liên hệ: `contact_email`, `contact_phone` (có thể có).
  - Thông tin duyệt: `approved_by` (tài khoản duyệt), `approved_at`, `rejection_reason` (lý do từ chối).
  - Dấu thời gian: `created_at`, `updated_at`.
- **Ai thiết lập:** Người đăng ký/đại diện tổ chức cung cấp thông tin; Super Admin thực hiện duyệt/từ chối (và các thao tác quản trị theo triển khai).
- **Ràng buộc/ghi chú:**
  - Đăng ký qua API hiện có nhận `orgType` dạng chữ hoa (`SCHOOL`/`CENTER`) trong request, trong khi giá trị lưu/đọc một số response có thể là chữ thường (`school`/`center`) — khác biệt biểu diễn, không đồng nhất chuỗi hiển thị giữa request/response (**[Cần xác minh]** khi tích hợp, xem `docs/api.md`, mục D-08).
  - Một số trường mở rộng trên chi tiết tổ chức (liên hệ, lý do từ chối hiển thị đầy đủ, v.v.) có thể chưa được trả về đầy đủ tùy endpoint/triển khai (**[Cần xác minh]**).

### 4.2. Vòng đời tổ chức và tác động vận hành
- **`pending` (chờ duyệt):** tổ chức mới đăng ký, chưa được khai thác đầy đủ.
- **`active` (hoạt động):** tổ chức được phép vận hành trong phạm vi cho phép; tài khoản/vai trò/module liên quan phải phù hợp.
- **`rejected` (từ chối):** đăng ký không được chấp nhận; cần lý do rõ ràng theo nghiệp vụ (**[Cần xác minh]** việc lưu/hiển thị lý do và ghi audit đầy đủ theo từng bản triển khai, xem `docs/api.md` D-05/D-27).
- **`suspended` (tạm ngưng):** dừng hoạt động tạm thời; tác động tới truy cập/vận hành (**[Cần xác minh]** hành vi chi tiết trên UI/API).
- **Thiết lập cần có:** Quy trình phê duyệt và (nếu có) quy trình tạm ngưng/kích hoạt lại, kèm lý do và nhật ký — là nền tảng quản trị bắt buộc.

### 4.3. Tài khoản chủ/đại diện tổ chức khi onboarding
- Khi đăng ký, hệ thống tạo/ghi nhận **tài khoản (`account`)** gắn với tổ chức (chủ sở hữu/đại diện, thường gắn vai trò `ORG_OWNER` theo thiết kế seed/quy trình) và thông tin đăng nhập (tên đăng nhập, email, mật khẩu băm).
- Trạng thái tài khoản/tổ chức và việc kích hoạt sau duyệt phụ thuộc luồng nghiệp vụ triển khai (**[Cần xác minh]** chi tiết side-effects theo từng API).

---

## 5. Module chức năng và bật/tắt theo tổ chức

> Module là “khối năng lực” hệ thống; tổ chức cần được cấu hình/bật đúng module để dùng các nghiệp vụ tương ứng.

### 5.1. Danh mục module hệ thống (`module`, bảng danh mục)
- **Mục đích:** Định nghĩa các module có trong nền tảng.
- **Thuộc tính chính:** `code` (mã, khóa), `name` (tên hiển thị), `is_active` (đang kích hoạt trong danh mục hệ thống).
- **Danh mục hiện seed:** `STUDENT_MANAGEMENT` (Quản lý học sinh), `TEACHER_MANAGEMENT` (Quản lý giáo viên), `CLASS_MANAGEMENT` (Quản lý lớp học), `SCHEDULE_MANAGEMENT` (Quản lý lịch học), `ROOM_MANAGEMENT` (Quản lý phòng học), `EQUIPMENT_MANAGEMENT` (Quản lý thiết bị).
- **Ghi chú:** Tài liệu/SRS có thể đề cập phạm vi module rộng hơn; bảng danh mục hiện tại và thuộc tính “module lõi” (`is_core`) cần đối chiếu thực tế (**[Cần xác minh]**, xem `docs/api.md` D-15, D-28).

### 5.2. Kích hoạt module cho tổ chức (`organization_module`)
- **Mục đích:** Ghi nhận trạng thái từng module đối với từng tổ chức.
- **Thuộc tính chính:** `org_id`, `module_code`, `status` (`requested` — đã yêu cầu, `active` — đang hoạt động, `rejected` — bị từ chối/không áp dụng).
- **Ai thiết lập:** Tổ chức yêu cầu khi đăng ký và/hoặc quản trị nền tảng cấu hình/duyệt theo luồng; thao tác cấu hình có thể qua API chuyên biệt (**[Cần xác minh]** endpoint/thời điểm cho phép, ví dụ `PUT /api/v1/organizations/{id}/modules` theo `docs/api.md` D-16/D-26).
- **Ý nghĩa vận hành:** Quyết định tổ chức được sử dụng nhóm chức năng nào (học sinh, giáo viên, lớp, lịch, phòng, thiết bị…). Một số quy tắc (module bắt buộc không được tắt, điều kiện bật/tắt) cần chốt theo nghiệp vụ và triển khai (**[Cần xác minh]** BR/module core).

### 5.3. Cấu hình bật/tắt module dạng cờ (`module_config`) — nếu sử dụng song song
- **Mục đích:** Lưu trạng thái bật/tắt module theo tổ chức dưới dạng cấu hình (`org_id`, `module` enum, `enabled`, `updated_by`, `updated_at`).
- **Ghi chú:** Hệ thống có cả `organization_module` (trạng thái requested/active/rejected) và `module_config` (enabled). Cách hai cấu trúc này được dùng đồng bộ hay phục vụ mục đích khác nhau **[Cần xác minh]** theo thiết kế/triển khai thực tế.

### 5.4. Phụ thuộc nghiệp vụ điển hình (theo module)
- **Quản lý học sinh (`STUDENT_MANAGEMENT`):** cần dữ liệu hồ sơ học sinh, và thường phục vụ ghi danh lớp.
- **Quản lý giáo viên (`TEACHER_MANAGEMENT`):** cần hồ sơ giáo viên, phục vụ phân công và xếp lịch.
- **Quản lý lớp học (`CLASS_MANAGEMENT`):** cần dữ liệu lớp, ghi danh, phân công (tùy quy trình).
- **Quản lý lịch học (`SCHEDULE_MANAGEMENT`):** phụ thuộc lớp, giáo viên, (thường) phân công và phòng học.
- **Quản lý phòng học (`ROOM_MANAGEMENT`):** cần dữ liệu phòng học/phòng máy.
- **Quản lý thiết bị (`EQUIPMENT_MANAGEMENT`):** cần dữ liệu thiết bị, có thể gắn phòng, xử lý sự cố.

---

## 6. Định danh, truy cập và phân quyền (Identity & Access)

### 6.1. Tài khoản người dùng (`account`)
- **Mục đích:** Danh tính đăng nhập và trạng thái truy cập hệ thống.
- **Thuộc tính chính:**
  - Định danh: `id` (UUID).
  - Phạm vi tổ chức: `org_id` (NULL đối với tài khoản quản trị nền tảng như Super Admin).
  - Thông tin đăng nhập: `username` (duy nhất toàn hệ thống), `email` (có thể có), `password_hash`.
  - Trạng thái: `status` — `pending`, `active`, `locked`, `disabled`.
  - Bảo mật/hoạt động: `failed_login_attempts`, `locked_until`, `last_login_at`.
  - Trường bổ sung theo migration department access: `must_change_password` (bắt buộc đổi mật khẩu), `provisioned_by` (người/tác nhân cấp phát) — phục vụ luồng cấp tài khoản nội bộ.
  - Dấu thời gian: `created_at`, `updated_at`.
- **Ai thiết lập:** Đăng ký/khởi tạo theo luồng (onboarding, Super Admin/Owner tạo tài khoản nội bộ tùy chức năng triển khai). **[Cần xác minh]** các màn hình/API tạo/quản lý tài khoản tổ chức đã đầy đủ.

### 6.2. Vai trò (`role`) và quyền (`permission`)
- **Vai trò (`role`):** Nhóm quyền theo ngữ cảnh; có `scope` `platform` hoặc `organization`.
- **Quyền (`permission`):** Đơn vị năng lực/hành động ở mức hệ thống (mã `code`, mô tả).
- **Liên kết vai trò–quyền (`role_permission`):** Xác định vai trò nào có quyền nào (dữ liệu nền tảng, thường seed và/hoặc quản trị).
- **Nguyên tắc gán vai trò:** Vai trò nền tảng gắn với tài khoản không thuộc tổ chức; vai trò tổ chức gắn với tài khoản thuộc tổ chức (cần tuân thủ kiểm tra ở tầng dịch vụ).

### 6.3. Gán vai trò cho tài khoản (`account_role`)
- **Mục đích:** Xác định người dùng có vai trò gì trong hệ thống/tổ chức.
- **Thuộc tính chính:** `account_id`, `role_id`, `assigned_at`.
- **Ai thiết lập:** Quản trị nền tảng hoặc quản trị tổ chức (theo quyền và luồng triển khai).
- **Lưu ý:** Một tài khoản có thể cần ít nhất một vai trò hợp lệ để truy cập đúng chức năng; chi tiết ràng buộc **[Cần xác minh]** theo API.

### 6.4. Phiên đăng nhập và token (dữ liệu vận hành, hệ thống quản lý)
- **Phiên người dùng (`user_session`):** lưu phiên làm việc (thiết bị, IP, thời gian tạo/hoạt động/hết hạn, thu hồi) — phục vụ quản lý phiên.
- **Refresh token (`refresh_token`):** lưu hash token làm mới, thời hạn, thu hồi, xoay vòng, liên kết phiên (`session_id` sau migration) — cơ chế xác thực, không phải khách hàng nhập tay.
- **Token đặt lại mật khẩu (`password_reset_token`):** phục vụ luồng quên/đặt lại mật khẩu; **[Cần xác minh]** endpoint và hành vi đầy đủ theo triển khai (xem `docs/api.md` D-32/D-33).

### 6.5. Nhật ký kiểm toán (`audit_log`)
- **Mục đích:** Truy vết hành động quản trị/nghiệp vụ quan trọng (ai làm gì, trên đối tượng nào, giá trị cũ/mới nếu có).
- **Thuộc tính chính:** `org_id` (có thể NULL), `actor_account_id`, `action`, `entity_type`, `entity_id`, `old_value`/`new_value` (JSON), `created_at`.
- **Ai tạo:** Hệ thống tự ghi theo luồng được triển khai; phạm vi hành động được ghi **[Cần xác minh]** theo từng chức năng.

---

## 7. Cấu trúc tổ chức nội bộ và phân quyền theo phòng ban (Organization structure & department access)

> Nhóm dữ liệu này giúp tổ chức mô hình hóa bộ máy nội bộ và kiểm soát phạm vi truy cập/tác vụ theo phòng ban, chức vụ, thành viên. Phần lớn lưu tại **People DB**; có ảnh hưởng tới phạm vi dữ liệu ở Facility/Schedule.

### 7.1. Phòng ban (`department`)
- **Mục đích:** Đơn vị/bộ phận trong tổ chức (ví dụ: phòng đào tạo, phòng cơ sở vật chất).
- **Thuộc tính chính:** `id`, `org_id`, `name` (duy nhất trong tổ chức), `description`, `created_at`.
- **Ai thiết lập:** Chủ sở hữu/quản trị tổ chức có quyền (theo thiết kế department access, ví dụ OWNER).
- **Ràng buộc:** Không xóa khi còn thành viên phụ thuộc (theo tài liệu department access).

### 7.2. Chức vụ (`position`)
- **Mục đích:** Vai trò/chức danh trong tổ chức dùng để gắn nhóm quyền nghiệp vụ nội bộ.
- **Thuộc tính chính:** `id`, `org_id`, `name` (duy nhất trong tổ chức), `description`, `created_at`.
- **Phạm vi:** Thuộc tổ chức; có thể được sử dụng trong cấu trúc tổ chức theo thiết kế.
- **Ràng buộc:** Không xóa khi đang được gán cho thành viên (tùy quy tắc triển khai).

### 7.3. Quyền nghiệp vụ nội bộ và gán cho chức vụ (`permission` danh mục nội bộ, `position_permission`)
- **Danh mục quyền nội bộ (ví dụ theo `docs/department-access.md`):** `FACILITY_MANAGE`, `SCHEDULE_CREATE`, `SCHEDULE_VIEW`, `PEOPLE_VIEW`, `PEOPLE_EDIT` (mã và ý nghĩa theo tài liệu; danh mục thực tế do Identity/seed/cấu hình cung cấp **[Cần xác minh]** đồng bộ).
- **Gán quyền cho chức vụ (`position_permission`):** `position_id`, `permission_code` — xác định chức vụ có những quyền nào.
- **Ý nghĩa:** Nhân sự thừa hưởng quyền từ các chức vụ được gán; thay đổi quyền của chức vụ ảnh hưởng tới thành viên giữ chức vụ đó (theo thiết kế).

### 7.4. Thành viên phòng ban (`department_member`)
- **Mục đích:** Gắn người dùng (tài khoản/thành viên) vào một phòng ban với vai trò nội bộ.
- **Thuộc tính chính:** `user_id` (khóa chính trong bảng, tham chiếu mềm), `org_id`, `department_id`, vai trò nội bộ `role` (`OWNER`, `MANAGER`, `STAFF`), `appointed_by`, `appointed_at`.
- **Giả định/ràng buộc thiết kế:** Mỗi người thuộc tối đa một phòng ban (theo tài liệu hiện tại) — **[Cần xác minh]** trước khi mở rộng.
- **Ai thiết lập:** OWNER hoặc người có quyền phù hợp theo quy tắc (OWNER có thể gán MANAGER/STAFF; MANAGER có giới hạn theo quyền và không vượt quyền hiện có — xem `docs/department-access.md`).

### 7.5. Gán chức vụ cho thành viên (`member_position`)
- **Mục đích:** Liên kết thành viên–chức vụ trong phạm vi tổ chức/phòng ban.
- **Thuộc tính chính:** `user_id`, `position_id`, `org_id` (khóa chính tổ hợp).
- **Ai thiết lập:** Theo quy tắc phân quyền (OWNER/MANAGER có điều kiện).

### 7.6. Nhật ký và cơ chế bù trừ (department access)
- **Nhật ký nghiệp vụ People (`people_audit_log`):** ghi nhận thay đổi/bổ nhiệm, tác nhân, đối tượng, chi tiết, thời gian trong phạm vi tổ chức.
- **Hàng đợi/bù trừ tài khoản (`account_compensation`):** hỗ trợ xử lý bất toàn khi tạo thành viên liên quan cấp tài khoản xuyên dịch vụ (retry theo thiết kế) — cơ chế kỹ thuật vận hành, không phải dữ liệu khách hàng nhập tay.

### 7.7. Phạm vi phòng ban trên dữ liệu vận hành (Facility/Schedule)
- **Phòng học gắn phòng ban (`classroom.department_id`):** bổ sung qua migration Facility; bản ghi cũ có thể chưa gán phòng ban và cần được gán trước khi đưa vào các luồng lọc theo phòng ban (**[Cần xác minh]** theo API/luồng hiển thị).
- **Buổi học gắn phòng ban (`session.department_id`):** bổ sung qua migration Schedule; tương tự cần gán/đồng bộ theo nghiệp vụ.
- **Ý nghĩa:** Cho phép giới hạn truy cập/xem/quản lý cơ sở vật chất và lịch theo phòng ban khi tính năng được triển khai.

### 7.8. Quy tắc nghiệp vụ quan trọng (theo thiết kế department access)
- OWNER là chủ/quản trị trong **từng tổ chức**, không truy cập chéo tổ chức khác.
- Một số thao tác tạo thành viên trả về **mật khẩu tạm thời** một lần và yêu cầu đổi mật khẩu; token trước khi đổi mật khẩu có thể bị giới hạn phạm vi sử dụng (tùy triển khai).
- Quyền hiệu lực có thể cần làm mới phiên/token sau thay đổi phân quyền; kiểm tra quyền hiện hành cần thực hiện ở backend (**[Cần xác minh]** hành vi thực tế từng endpoint).

---

## 8. Dữ liệu hồ sơ con người (People master data)

> Là nền tảng để vận hành đào tạo, phân công giảng dạy, ghi danh và quản trị nhân sự.

### 8.1. Hồ sơ học sinh/sinh viên (`student`)
- **Mục đích:** Quản lý người học thuộc tổ chức.
- **Thuộc tính chính:** `id`, `org_id`, `account_id` (liên kết tài khoản đăng nhập, nếu có), `code` (mã trong tổ chức), `full_name`, `dob`, `gender` (`male`/`female`/`other`), `phone`, `email`, `status` (`active`, `inactive`, `graduated`, `withdrawn`), `deleted_at` (xóa mềm), `created_at`, `updated_at`.
- **Ràng buộc:** Duy nhất `(org_id, code)`; `account_id` duy nhất trong bảng (mỗi tài khoản gắn tối đa một hồ sơ học sinh theo ràng buộc bảng). Có thể truy vấn theo trạng thái/xóa mềm.
- **Ai thiết lập:** Cán bộ/phòng ban được phân quyền (ví dụ nghiệp vụ học vụ/đào tạo). **[Cần xác minh]** luồng nhập liệu/UI/API.
- **Phụ thuộc:** Tổ chức active; thường cần module quản lý học sinh được bật.

### 8.2. Hồ sơ giáo viên (`teacher`)
- **Mục đích:** Quản lý giảng viên/giáo viên phục vụ phân công và xếp lịch.
- **Thuộc tính chính:** `id`, `org_id`, `account_id`, `code`, `full_name`, `specialization` (chuyên môn), `contract_type` (loại hợp đồng), `phone`, `email`, `status` (`active`, `inactive`, `on_leave`, `resigned`), `deleted_at`, `created_at`, `updated_at`.
- **Ràng buộc:** Duy nhất `(org_id, code)`; `account_id` duy nhất trong bảng.
- **Vai trò trong hệ thống:** Là đầu vào bắt buộc để **phân công giảng dạy** và **lập buổi học/lịch**.

### 8.3. Hồ sơ nhân sự (`staff`)
- **Mục đích:** Quản lý nhân sự/cán bộ không nhất thiết là giáo viên (vận hành, quản trị, CSVC…).
- **Thuộc tính chính:** `id`, `org_id`, `account_id`, `code`, `full_name`, `position` (chức danh mô tả), `department` (mô tả), `status` (`active`, `inactive`, `on_leave`, `resigned`), `deleted_at`, `created_at`, `updated_at`.
- **Ràng buộc:** Duy nhất `(org_id, code)`; `account_id` duy nhất trong bảng.
- **Ghi chú:** Trường `position`/`department` dạng chuỗi trong hồ sơ staff khác với cấu trúc phòng ban/chức vụ chuẩn hóa ở mục 7; cách sử dụng đồng thời **[Cần xác minh]** theo nghiệp vụ.

### 8.4. Liên kết tài khoản–hồ sơ
- `account_id` là tham chiếu mềm sang tài khoản ở Identity; dịch vụ phải xác thực quyền sở hữu/thuộc tổ chức qua API/quy tắc nghiệp vụ.
- Một người có thể có nhiều loại hồ sơ trong các bảng khác nhau (thiết kế cho phép theo ghi chú schema), nhưng mỗi loại hồ sơ có ràng buộc riêng về `account_id`.

---

## 9. Dữ liệu cơ sở vật chất và tài sản (Facility & assets)

> Nền tảng cho quản lý phòng học, phòng máy, thiết bị và xử lý sự cố; cũng là đầu vào khi xếp lịch có phòng.

### 9.1. Phòng học/không gian (`classroom`)
- **Mục đích:** Quản lý danh mục phòng phục vụ dạy học và hoạt động.
- **Thuộc tính chính:** `id`, `org_id`, `code` (duy nhất trong tổ chức), `name`, `building` (tòa nhà), `floor` (tầng), `capacity` (sức chứa, > 0), `room_type` (`classroom` — phòng học, `computer_room` — phòng máy), `status` (`active`, `maintenance`, `closed`), `department_id` (phòng ban phụ trách/phạm vi, có thể NULL nếu chưa gán), `deleted_at`, `created_at`, `updated_at`.
- **Ràng buộc:** Duy nhất `(org_id, code)`; duy nhất `(id, org_id)` để tham chiếu nội bộ.
- **Ai thiết lập:** Bộ phận/quản trị CSVC hoặc người được phân quyền (và/hoặc theo phòng ban).
- **Phụ thuộc:** Tổ chức active; module phòng học (`ROOM_MANAGEMENT`) nếu áp dụng.

### 9.2. Thông tin phòng máy (`computer_room`)
- **Mục đích:** Mở rộng chi tiết cho phòng thuộc loại phòng máy.
- **Thuộc tính chính:** `classroom_id` (khóa chính, tham chiếu `classroom`), `machine_count` (số máy, >= 0), `spec_description` (cấu hình), `installed_software` (phần mềm cài đặt).
- **Ràng buộc nghiệp vụ:** Phòng có bản ghi `computer_room` phải nhất quán `room_type = computer_room` (được đảm bảo ở tầng dịch vụ theo ghi chú schema).

### 9.3. Thiết bị/tài sản (`equipment`)
- **Mục đích:** Quản lý thiết bị phục vụ dạy học/vận hành.
- **Thuộc tính chính:** `id`, `org_id`, `room_id` (phòng đặt thiết bị; NULL nếu trong kho/chưa gán), `asset_code` (mã tài sản, duy nhất trong tổ chức), `name`, `equipment_type`, `purchase_date`, `status` (`in_use`, `broken`, `maintenance`, `in_storage`, `retired`), `deleted_at`, `created_at`, `updated_at`.
- **Ràng buộc:** Duy nhất `(org_id, asset_code)`; khóa ngoại nội bộ `(room_id, org_id)` tham chiếu `classroom(id, org_id)` khi có phòng.
- **Phụ thuộc:** Thường gắn với phòng học; module thiết bị (`EQUIPMENT_MANAGEMENT`) nếu áp dụng.

### 9.4. Báo cáo sự cố thiết bị (`incident_report`)
- **Mục đích:** Ghi nhận sự cố/phản ánh hư hỏng hoặc vấn đề của thiết bị.
- **Thuộc tính chính:** `id`, `org_id`, `equipment_id`, `reported_by` (tài khoản báo cáo, tham chiếu mềm), `description`, `photo_url`, `status` (`open`, `in_progress`, `resolved`, `unresolved`), `resolved_at`, `created_at`, `updated_at`.
- **Ràng buộc:** Gắn thiết bị và tổ chức nhất quán.
- **Ai tạo:** Người dùng được phép (ví dụ giáo viên/học sinh/nhân sự có quyền tạo sự cố theo phân quyền).

### 9.5. Lịch sử trạng thái thiết bị (`equipment_status_log`)
- **Mục đích:** Truy vết thay đổi trạng thái thiết bị theo thời gian (audit nghiệp vụ thiết bị).
- **Thuộc tính chính:** `id`, `equipment_id`, `incident_report_id` (nếu gắn với sự cố), `changed_by` (tham chiếu mềm), `old_status`, `new_status`, `reason`, `changed_at`.
- **Ai tạo:** Hệ thống/người xử lý theo luồng nghiệp vụ.

---

## 10. Dữ liệu học vụ và xếp lịch (Academic & scheduling)

> Nền tảng cho quản lý lớp, ghi danh, phân công giảng dạy và lập lịch học/dạy.

### 10.1. Lớp học (`class`, bảng `class` trong Schedule DB)
- **Mục đích:** Đơn vị tổ chức dạy học (lớp/môn/khóa ngắn hạn tùy mô hình).
- **Thuộc tính chính:** `id`, `org_id`, `code` (duy nhất trong tổ chức), `name`, `subject` (môn/chủ đề, chuỗi), `max_size` (sĩ số tối đa, > 0), `start_date`, `end_date` (>= start_date), `status` (`draft` — nháp, `ongoing` — đang diễn ra, `closed` — đã đóng), `deleted_at`, `created_at`, `updated_at`.
- **Ràng buộc:** Duy nhất `(org_id, code)`.
- **Ai thiết lập:** Bộ phận đào tạo/giáo vụ hoặc người được phân quyền; module lớp học (`CLASS_MANAGEMENT`) nếu áp dụng.
- **Lưu ý:** `subject` hiện là trường văn bản tự do; chưa thấy danh mục môn học chuẩn hóa trong schema này (**[Cần xác minh]**).

### 10.2. Ghi danh học viên vào lớp (`class_enrollment`)
- **Mục đích:** Gắn học sinh/sinh viên vào lớp.
- **Thuộc tính chính:** `id`, `class_id`, `student_id` (tham chiếu mềm tới hồ sơ học sinh), `enrolled_at`, `status` (`active`, `dropped`, `completed`).
- **Ràng buộc:** Duy nhất `(class_id, student_id)` (mỗi học sinh một bản ghi trên một lớp; thay đổi trạng thái bằng cập nhật theo thiết kế).
- **Phụ thuộc:** Lớp tồn tại; hồ sơ học sinh hợp lệ cùng tổ chức (kiểm tra ở dịch vụ).

### 10.3. Phân công giáo viên cho lớp (`teacher_assignment`)
- **Mục đích:** Gắn giáo viên phụ trách/giảng dạy cho lớp.
- **Thuộc tính chính:** `id`, `class_id`, `teacher_id` (tham chiếu mềm), `assigned_at`, `status` (`active`, `ended`).
- **Ràng buộc:** Duy nhất `(class_id, teacher_id)`.
- **Ý nghĩa:** Thường là điều kiện nghiệp vụ quan trọng trước khi xếp buổi học cho đúng giáo viên/lớp (**[Cần xác minh]** mức bắt buộc trong từng luồng).

### 10.4. Buổi học / lịch học-dạy (`session`)
- **Mục đích:** Biểu diễn một buổi học cụ thể (meeting) với thời gian và tài nguyên.
- **Thuộc tính chính:** `id`, `class_id`, `teacher_id`, `room_id` (tham chiếu mềm tới phòng ở Facility, có thể NULL), `department_id` (phạm vi phòng ban, có thể NULL nếu chưa gán), `start_time`, `end_time` (end > start), `status` (`scheduled`, `cancelled`, `completed`), `deleted_at`, `created_at`, `updated_at`.
- **Ràng buộc/kiểm tra nghiệp vụ (theo ghi chú schema):** kiểm tra chồng lấn thời gian (overlap) cho giáo viên/phòng, bỏ qua buổi hủy/xóa mềm; xác thực tổ chức, ngày lớp, phân công, tình trạng phòng, sức chứa… được thực hiện ở tầng dịch vụ.
- **Ai thiết lập:** Người lập lịch/giáo vụ hoặc được phân quyền; module lịch học (`SCHEDULE_MANAGEMENT`) và thường cần module/phân quyền phòng ban liên quan nếu áp dụng.

### 10.5. Khóa tài nguyên xếp lịch (`schedule_resource_lock`)
- **Mục đích:** Hỗ trợ tuần tự hóa thao tác xếp lịch đồng thời trên cùng tài nguyên (giáo viên/phòng) trong tổ chức.
- **Thuộc tính chính:** `org_id`, `resource_type` (`teacher`, `room`), `resource_id` (khóa chính tổ hợp).
- **Bản chất:** Cơ chế kỹ thuật/hỗ trợ nhất quán dữ liệu, không phải dữ liệu khách hàng nhập trực tiếp.

### 10.6. Phạm vi và giới hạn mô hình lịch hiện tại (ghi nhận để lập kế hoạch)
- Lịch được mô hình hóa ở mức **buổi học cụ thể** (`session`); việc sinh lịch lặp (theo tuần/kỳ), khung tiết cố định, năm học/học kỳ, mẫu thời khóa biểu **không thể hiện rõ trong schema hiện tại** (**[Cần xác minh]** yêu cầu nghiệp vụ và thiết kế mở rộng).
- Cần chốt quy tắc: buổi học phải nằm trong thời gian lớp, bắt buộc phân công trước, kiểm tra sức chứa phòng theo sĩ số lớp/ghi danh thực tế, v.v.

---

## 11. Bản đồ phụ thuộc và thứ tự thiết lập gợi ý (toàn hệ thống)

> Thứ tự có thể điều chỉnh theo quy trình và module được bật; mục tiêu là đảm bảo dữ liệu “thượng nguồn” có trước dữ liệu “phụ thuộc”.

### 11.1. Chuỗi phụ thuộc cốt lõi
1. **Hệ thống sẵn sàng:** DB/schema + seed (vai trò, quyền, danh mục module, tài khoản nền tảng nếu dùng).
2. **Tổ chức hợp lệ:** `organization` được duyệt/`active` + tài khoản quản trị tổ chức.
3. **Phạm vi chức năng:** bật/cấu hình module cho tổ chức (`organization_module`/`module_config`).
4. **Danh tính & quyền truy cập:** tài khoản (`account`), gán vai trò (`account_role`), (nếu dùng mô hình mới) cơ cấu phòng ban–chức vụ–quyền–thành viên (`department`, `position`, `position_permission`, `department_member`, `member_position`).
5. **Dữ liệu chủ (master data) theo miền:**
   - Hồ sơ con người: `teacher`, `student`, `staff`.
   - Cơ sở vật chất: `classroom` (+ `computer_room`), `equipment`.
6. **Dữ liệu nghiệp vụ đào tạo:** `class` → `teacher_assignment` và/hoặc `class_enrollment` → `session` (lịch học/dạy).
7. **Vận hành & phản hồi:** báo cáo sự cố (`incident_report`), cập nhật trạng thái thiết bị (`equipment_status_log`), ghi danh/lịch thay đổi trạng thái theo thời gian.

### 11.2. Checklist thiết lập tổng quát (khách hàng/tổ chức)
- [ ] Tổ chức đã **active** và thông tin liên hệ/quản trị chính xác.
- [ ] Đã xác định và bật **các module** cần sử dụng.
- [ ] Đã có **tài khoản & vai trò** cho người vận hành (quản trị, giáo vụ, CSVC, giáo viên, học sinh…).
- [ ] (Nếu áp dụng) Đã dựng **phòng ban, chức vụ, phân quyền chức vụ, thành viên & gán chức vụ**.
- [ ] Đã nhập **hồ sơ giáo viên/học sinh/nhân sự** (mã, trạng thái, liên kết tài khoản nếu cần).
- [ ] Đã nhập **phòng học/phòng máy** (sức chứa, loại, trạng thái) và gán **phòng ban phụ trách** nếu dùng phân quyền theo phòng ban.
- [ ] Đã nhập **thiết bị** và gắn phòng/kho (nếu quản lý thiết bị).
- [ ] Đã tạo **lớp học** (mã, thời gian, sĩ số, môn).
- [ ] Đã **phân công giáo viên** và **ghi danh học sinh** (theo quy trình).
- [ ] Đã lập **lịch/buổi học** và xử lý xung đột tài nguyên/sức chứa theo quy tắc.
- [ ] Có quy trình xử lý **sự cố thiết bị**, cập nhật trạng thái, và theo dõi **nhật ký** khi cần.

---

## 12. Phụ lục A — Danh mục trạng thái/enums chính (tóm tắt)

| Nhóm | Đối tượng | Giá trị/Ý nghĩa |
|---|---|---|
| Tổ chức | `organization.status` | `pending`, `active`, `rejected`, `suspended` |
| Loại tổ chức | `organization.org_type` | `school`, `center` |
| Tài khoản | `account.status` | `pending`, `active`, `locked`, `disabled` |
| Phạm vi vai trò | `role.scope` | `platform`, `organization` |
| Module của tổ chức | `organization_module.status` | `requested`, `active`, `rejected` |
| Học sinh | `student.status` | `active`, `inactive`, `graduated`, `withdrawn` |
| Giáo viên | `teacher.status` | `active`, `inactive`, `on_leave`, `resigned` |
| Nhân sự | `staff.status` | `active`, `inactive`, `on_leave`, `resigned` |
| Phòng học | `classroom.room_type` | `classroom`, `computer_room` |
| Trạng thái phòng | `classroom.status` | `active`, `maintenance`, `closed` |
| Thiết bị | `equipment.status` | `in_use`, `broken`, `maintenance`, `in_storage`, `retired` |
| Sự cố | `incident_report.status` | `open`, `in_progress`, `resolved`, `unresolved` |
| Lớp học | `class.status` | `draft`, `ongoing`, `closed` |
| Ghi danh | `class_enrollment.status` | `active`, `dropped`, `completed` |
| Phân công GV | `teacher_assignment.status` | `active`, `ended` |
| Buổi học | `session.status` | `scheduled`, `cancelled`, `completed` |
| Vai trò nội bộ phòng ban | `department_member.role` | `OWNER`, `MANAGER`, `STAFF` |

*(Danh sách trên tóm lược theo schema; tên hiển thị tiếng Việt trên UI có thể khác và cần thống nhất.)*

## 13. Phụ lục B — Danh mục module seed (tham chiếu nhanh)

| Mã module (`module.code`) | Tên (seed) | Nhóm nghiệp vụ chính |
|---|---|---|
| `STUDENT_MANAGEMENT` | Quản lý học sinh | Hồ sơ học sinh, phục vụ ghi danh/lớp |
| `TEACHER_MANAGEMENT` | Quản lý giáo viên | Hồ sơ giáo viên, phân công, lịch dạy |
| `CLASS_MANAGEMENT` | Quản lý lớp học | Lớp, ghi danh, tổ chức học tập |
| `SCHEDULE_MANAGEMENT` | Quản lý lịch học | Buổi học/thời khóa biểu/bố trí lịch |
| `ROOM_MANAGEMENT` | Quản lý phòng học | Phòng học, phòng máy, phục vụ xếp lịch |
| `EQUIPMENT_MANAGEMENT` | Quản lý thiết bị | Thiết bị, sự cố, trạng thái tài sản |

## 14. Phụ lục C — Các điểm cần xác minh / chốt phạm vi (để hoàn thiện dữ liệu nền tảng)

1. **Trạng thái triển khai thực tế:** API/UI end-to-end cho People, Schedule, Facility, department access, quản lý tài khoản/tổ chức mở rộng (theo `docs/api.md` nhiều hạng mục đánh dấu chưa có/chưa đủ).
2. **Đồng bộ mô hình module:** quan hệ giữa `module`, `organization_module`, `module_config`; khái niệm module lõi (`is_core`) và quy tắc không được tắt.
3. **Luồng cấp tài khoản & hồ sơ:** khi nào tạo `account`, khi nào tạo hồ sơ `teacher/student/staff`, khi nào liên kết `account_id`, và luồng mời/đổi mật khẩu tạm.
4. **Ràng buộc xếp lịch:** bắt buộc `teacher_assignment`/`class_enrollment` trước khi tạo `session`, kiểm tra sức chứa, kiểm tra buổi nằm trong thời gian lớp, quy tắc dùng `room_id`/`department_id`.
5. **Mô hình lịch nâng cao:** có cần năm học/học kỳ, tiết/ca, lịch lặp, danh mục môn học chuẩn hóa hay không.
6. **Cấu trúc tổ chức:** cách dùng đồng thời `department`/`position` chuẩn hóa với các trường mô tả trong `staff`; giả định “mỗi người một phòng ban”.
7. **Dữ liệu & môi trường:** thứ tự migration áp dụng trên DB hiện có, dữ liệu chuyển đổi (gán `department_id` cho bản ghi cũ), và chính sách bảo mật (mật khẩu seed, secret, CORS khi tách miền).

---

*Tài liệu này nhằm làm rõ “khách hàng cần xây dựng/nhập những nền tảng gì” để hệ thống hoạt động. Khi có quyết định nghiệp vụ hoặc thay đổi thiết kế/triển khai, cần cập nhật lại các mục tương ứng và chuyển các điểm [Cần xác minh] thành quyết định chính thức.*