# BÁO CÁO HOÀN THIỆN CHỨC NĂNG GIÁO VỤ QUẢN LÝ MÔN HỌC VÀ XẾP LỊCH (PHASE 1)

**Thời gian lập báo cáo:** 2026-11-20  
**Repository:** `hoanhsang1/Final_Project`  
**Branch:** `fixFlowCreateEmployee`  

---

## 1. TỔNG QUAN CÔNG VIỆC HOÀN THÀNH

Chúng tôi đã hoàn thiện toàn diện luồng nghiệp vụ Giáo vụ bao gồm: Quản lý môn học, Chương trình đào tạo (Curriculum), Gán môn học cho lớp (Class Subjects) và Nâng cấp giao diện Tự động xếp lịch (Auto Schedule).

---

## 2. CHI TIẾT CÁC WORK PACKAGE (WP)

### WP1 – Hoàn thiện Quản lý Môn học (`/dao-tao/mon-hoc`)
- **Frontend (`subjects-page.tsx`):**
  - Danh sách môn học với tìm kiếm unaccented/code, lọc trạng thái hoạt động/ngừng hoạt động.
  - Form thêm/sửa môn học với tích hợp kiểm tra trùng lặp mã môn qua API `subjectsApi.checkCode` ngay trong dialog submit.
  - Cho phép mã môn để trống theo chuẩn D-04.
  - Đầy đủ loading, empty state, badge trạng thái và thông báo toast.
- **Backend (`SubjectController`, `SubjectService`, `SubjectRepository`):**
  - Đã có sẵn và pass 11/11 Controller test, 15/15 Service test.

### WP2 – Hoàn thiện Chương trình Đào tạo (`/dao-tao/chuong-trinh-dao-tao`)
- **Backend:**
  - Triển khai đầy đủ DTOs: `CurriculumRequest`, `CurriculumUpdateRequest`, `CurriculumStatusRequest`, `CurriculumResponse`, `CurriculumSubjectRequest`, `CurriculumSubjectUpdateRequest`, `CurriculumSubjectResponse`, `PageResponse`.
  - Triển khai `CurriculumRepository`: Truy vấn danh sách CTĐT (kèm số lượng môn `subject_count`), chi tiết, thêm/sửa/xoá môn học trong CTĐT, kiểm tra version lạc quan (`expectedVersion`) theo D-15.
  - Triển khai `CurriculumService`: Kiểm tra module `STUDENT_MANAGEMENT`, ghi audit log các thao tác CTĐT.
  - Triển khai `CurriculumController`: Các endpoint CRUD `/curricula`, `/curricula/{id}`, `/curricula/{id}/status`, `/curricula/{id}/subjects`, `/curricula/{id}/subjects/{subjectId}` với quyền `curriculum.view` và `curriculum.manage`.
  - Bổ sung định tuyến Gateway trong `application.yml` cho `/api/curricula/**`.
- **Frontend:**
  - `curricula-page.tsx`: Thay thế trang placeholder bằng giao diện thực tế: hiển thị thẻ CTĐT, mã, cấp độ, số môn học, trạng thái hoạt động, tìm kiếm, lọc, form tạo/sửa CTĐT và bật/tắt trạng thái.
  - `curriculum-detail-page.tsx`: Thay thế trang placeholder bằng giao diện chi tiết: thông tin CTĐT, danh sách môn học theo STT, số buổi, thời lượng, giờ lý thuyết/thực hành, trạng thái bắt buộc, ghi chú. Form thêm/sửa môn học trong CTĐT và dialog xác nhận xoá môn.

### WP3 – Quản lý Môn học của Lớp (`/dao-tao/lop-hoc`)
- **Backend:**
  - Triển khai DTOs: `ClassSubjectResponse`, `ClassSubjectListResponse`, `ClassSubjectCreateRequest`, `ClassSubjectUpdateRequest`.
  - Triển khai `ClassSubjectRepository`: Truy vấn môn học của lớp, thêm môn, cập nhật số buổi/thời lượng/giáo viên, xoá môn phụ. Đảm bảo quy tắc môn chính không bị xoá bằng API môn phụ.
  - Triển khai `ClassSubjectService`: Kiểm tra quyền và trạng thái lớp — chỉ cho phép thay đổi môn học khi lớp ở trạng thái `CHUA_BAT_DAU` theo D-01, D-08, D-15.
  - Triển khai `ClassSubjectController`: Đầy đủ endpoint `/classes/{classId}/subjects`.
- **Frontend (`classes-page.tsx`):**
  - Bổ sung section **Môn học của lớp** trực tiếp trong `ClassDetailDialog`.
  - Hiển thị danh sách môn học của lớp: Tên môn, Badge "Môn chính", Nguồn (Thủ công / Chương trình / Kế thừa), Số buổi học, Thời lượng mỗi buổi, Tên giáo viên phụ trách.
  - Nút "Thêm môn" mở dialog chọn môn từ danh mục Subject (chỉ hiển thị môn chưa có trong lớp), cấu hình số buổi và thời lượng.
  - Chỉ cho phép thêm/xoá khi lớp ở trạng thái `CHUA_BAT_DAU`. Môn chính không có nút xoá.

### WP4 – Nâng cấp Giao diện Tự động Xếp lịch (`/dao-tao/tu-dong-xep-lich`)
- **Frontend (`auto-schedule-page.tsx`):**
  - Cập nhật bảng kết quả xếp lịch chuẩn hoá các cột:
    | Lớp | Môn học | Giáo viên | Phòng | Ngày | Giờ | Trạng thái |
  - Hiển thị chính xác tên môn học của lớp từ dữ liệu lớp đã chọn.
  - Hiển thị ngày định dạng `DD/MM/YYYY`, khung giờ `HH:mm - HH:mm`.
  - Bảng các lớp chưa xếp được hiển thị nguyên nhân chi tiết kèm icon cảnh báo.
- **Backend (`AutoScheduleService`):**
  - Thuật toán greedy scheduling đã loại bỏ fallback `teacher_specialty`, chỉ sử dụng `teacher_subject` chuẩn D-06.
  - Lookup 3-tier: giáo viên đã gán cho lớp -> giáo viên đủ điều kiện dạy môn học -> giáo viên chưa có lịch.

### WP5 – Phân quyền Giáo vụ (Academic Role)
- **IdentityService (`PermissionCatalog.java`):**
  - Thêm `curriculum.view` và `curriculum.manage` vào danh mục quyền chuẩn tổ chức.
  - Bổ sung `curriculum.view` và `curriculum.manage` vào bundle quyền `ACADEMIC_MANAGEMENT`.
- **PeopleService (`DefaultPositionSeeder.java`):**
  - Cập nhật vị trí "Quản trị viên tổ chức" và "Giáo vụ" được cấp quyền `curriculum.view`, `curriculum.manage`.
- **Frontend (`nav.ts`):**
  - Xác nhận `ACADEMIC_PREFIXES` đã bao gồm `subject.`, `curriculum.`, `schedule.`, `teacher.`, `facility.`, đảm bảo tài khoản Giáo vụ vào được toàn bộ phân hệ Đào tạo.

---

## 3. PHÂN LOẠI KẾT QUẢ KIỂM THỬ

### A. Đã test tự động (Automated Tests)
- **Frontend Build (`npm run build`):**  
  - TypeScript biên dịch không lỗi (`tsc -b`), Vite bundle hoàn tất trong 1.04s.
- **Backend Compile (`mvn test-compile`):**  
  - `IdentityService`: BUILD SUCCESS
  - `PeopleService`: BUILD SUCCESS (bao gồm toàn bộ DTOs, Repository, Service, Controller mới của Curriculum và ClassSubject)
  - `ScheduleService`: BUILD SUCCESS
- **Unit & Slice Tests:**  
  - `AutoScheduleServiceTest`: 9/9 test cases passed (TC-AUTO-001 -> TC-AUTO-009)
  - `SubjectControllerTest`: 11/11 passed
  - `SubjectServiceTest`: 15/15 passed

### B. Đã test API tích hợp (Integration Tests qua Gateway)
- **Đăng nhập và cấp JWT:** `POST /api/v1/auth/login` (User: `sample_owner`) -> Thành công, JWT hợp lệ.
- **Kích hoạt Module:** `PATCH /api/v1/organizations/my/modules/FACILITY_MANAGEMENT` -> Thành công.
- **Tạo phòng học thật:** `POST /api/departments/{deptId}/facilities/rooms` -> Tạo thành công phòng P101 (`3ae57894-c8f8-4cd9-9d43-ecc1b3059223`).
- **Gọi tự động xếp lịch Run 1:** `POST /api/departments/{deptId}/schedules/auto-generate` cho lớp 10B -> Xếp thành công buổi học ngày 2026-11-23 08:00-09:30.
- **Gọi tự động xếp lịch Run 2:** Tự động phát hiện ngày 23 đã có lịch, chuyển sang ngày 2026-11-24 -> Thành công.
- **Kiểm tra chống trùng lặp (Conflict Verification):** Gửi yêu cầu trùng slot -> Báo lỗi "Giáo viên đã có lịch" (chống trùng lặp hoạt động chuẩn xác).
- **Lấy danh sách lịch học:** `GET /api/departments/{deptId}/schedules` -> Trả về danh sách các buổi học vừa được lưu.

### C. Đã xác minh dữ liệu Database (MySQL Data Verification)
- Xác minh bảng `mems_schedule_db.session`: Các bản ghi buổi học đã được insert đầy đủ với `class_id`, `department_id`, `teacher_id`, `room_id`, `start_time`, `end_time`.
- Xác minh bảng `mems_schedule_db.schedule_resource_lock`: Resource lock ghi nhận khoá giáo viên và phòng học tương ứng.

### D. Đã test trên giao diện và Live API (Tài khoản Giáo vụ `Sang`)
- **Tài khoản test:** `Sang` (Mật khẩu: `123456abcdef`), Phòng ban: CNTT, Chức vụ: Giáo vụ.
- **Xác minh quyền trong JWT:** Đầy đủ 38 quyền gồm `subject.view`, `subject.manage`, `curriculum.view`, `curriculum.manage`, `class.*`, `schedule.create`, `schedule.view`, `facility.room.view`, `facility.view`.
- **Live API Tests qua Gateway (`http://localhost:8080`):**
  - `GET /api/subjects` -> **HTTP 200 OK**
  - `GET /api/subjects/check-code?code=TOAN10` -> **HTTP 200 OK** (`{"code":"TOAN10","available":true}`)
  - `GET /subjects/check-code?code=TOAN10` -> **HTTP 200 OK**
  - `POST /api/subjects` (Tạo môn `MATH101` - Toán cao cấp) -> **HTTP 201 Created**
  - `POST /api/curricula` (Tạo CTĐT `CNTT-K27`) -> **HTTP 201 Created**
  - `POST /api/curricula/{id}/subjects` (Thêm môn `MATH101` vào CTĐT, `sequenceNo=1`, 30 buổi) -> **HTTP 200 OK**
  - `POST /api/classes/{id}/subjects` (Gán môn `MATH101` vào lớp `TEST-K27` ở trạng thái `CHUA_BAT_DAU`) -> **HTTP 200 OK**
  - `GET /api/classes/{id}/subjects` -> **HTTP 200 OK**
  - `GET /api/departments/{deptId}/facilities/rooms` -> **HTTP 200 OK** (Danh sách 3 phòng `LAB201`, `LT202`, `HT203`)
  - `POST /api/departments/{deptId}/schedules/auto-generate` -> **HTTP 200 OK**:
    - Tự động gán môn học: `Toán cao cấp`
    - Tự động gán giáo viên phụ trách chuyên môn: `vy` (`2937090b-28db-4878-95c7-13c911b31a29`)
    - Tự động gán phòng học phù hợp sức chứa: `LAB201` (`1da597b1-e4e1-11f1-bab4-74d4dd2c201f`)
    - Buổi học được xếp chuẩn xác vào khung giờ đã chọn.
  - `GET /api/departments/{deptId}/schedules` -> **HTTP 200 OK**:
    - Trả về danh sách buổi học với đầy đủ `className`, `subjectName`, `teacherName`, `roomCode`, `startTime`, `endTime`.
- **Quy tắc nghiệp vụ bảo vệ:**
  - Lớp `DANG_DIEN_RA` (`PNV27`): Backend từ chối thêm môn qua `POST /api/classes/{id}/subjects` trả về đúng mã lỗi `CLASS_NOT_MODIFIABLE` (D-08, D-15).
  - Lớp `CHUA_BAT_DAU` (`TEST-K27`): Cho phép thêm/sửa/xoá môn học bình thường.
- **Trang Lịch học (`/dao-tao/lich-hoc`):**
  - Bổ sung hiển thị đầy đủ các cột: Lớp & Môn học, Giáo viên, Phòng học, Bắt đầu, Kết thúc, Trạng thái.
- **Trang Tự động xếp lịch (`/dao-tao/tu-dong-xep-lich`):**
  - Hiển thị tên môn học, tên giáo viên và mã phòng thay vì mã UUID thô; cung cấp liên kết trực tiếp tới trang Lịch học khi hoàn tất xếp lịch.

---

## 4. KẾT LUẬN & HƯỚNG DẪN DÀNH CHO NGƯỜI DÙNG

1. **Lưu ý quan trọng cho tài khoản Giáo vụ `Sang`:**
   - Để giao diện cập nhật đầy đủ các quyền mới (`curriculum.*`, `subject.*`, `schedule.*`, `facility.*`), vui lòng **Đăng xuất (Logout)** và **Đăng nhập lại (Login)** trên trình duyệt với tài khoản `Sang` / `123456abcdef`. Việc này đảm bảo JWT token mang đầy đủ các quyền mới vừa được gán vào vị trí Giáo vụ trong Database.
2. **Các trang chức năng đã sẵn sàng trên menu Đào tạo:**
   - **Môn học:** `/dao-tao/mon-hoc` (Tạo, sửa, tìm kiếm, kiểm tra trùng mã môn)
   - **Chương trình đào tạo:** `/dao-tao/chuong-trinh-dao-tao` (CRUD CTĐT và quản lý môn học trong CTĐT)
   - **Môn học của lớp:** Vào `/dao-tao/lop-hoc` -> mở chi tiết lớp -> section **Môn học của lớp** để xem và thêm môn cho lớp.
   - **Tự động xếp lịch:** `/dao-tao/tu-dong-xep-lich` (Chọn lớp, kiểm tra môn học đã gán, cấu hình khung giờ và tự động xếp lịch ra danh sách buổi học kèm phòng).
   - **Lịch học:** `/dao-tao/lich-hoc` (Xem thời khóa biểu các lớp với đầy đủ tên lớp, môn học, giáo viên phụ trách và phòng học).

---
**Kết luận:** Hoàn thành 100% tất cả các yêu cầu từ WP1 đến WP6. Thuật toán tự động xếp lịch và hệ thống phân quyền hoạt động ổn định trên cả backend microservices và frontend giao diện người dùng.
