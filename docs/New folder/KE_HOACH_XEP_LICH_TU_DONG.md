# KẾ HOẠCH XẾP LỊCH TỰ ĐỘNG (MEMS) – BẢN 3

> Viết lại sau khi đọc code mới và `db.sql` (dump 23/11/2026).
> Cách đọc: mỗi **Tầng** có (1) hiện trạng, (2) chức năng bạn phải làm được, (3) dữ liệu, (4) **API**, (5) việc code theo thứ tự, (6) DoD.
> Bạn tự viết code; tài liệu chỉ nói *làm gì, ở đâu, đúng khi nào*.

**Nhãn:** **[CÓ SẴN]** đã thấy trong code · **[MỚI]** phải thêm · **[SỬA]** có rồi nhưng phải sửa · **[CHƯA THẤY]** chưa đọc được, bạn phải tự `grep` · **[ĐỀ XUẤT]** tên bảng/cột/API chỉ là gợi ý.

**Quy tắc an toàn:** làm trên nhánh riêng; không đụng `vercel.json`, URL backend, biến môi trường, CORS, migration production; không xóa/reset dữ liệu; thêm bảng/cột chỉ chạy trên DB local trước.

---

## 0. Tóm tắt một trang

| Tầng | Nội dung | Hiện trạng | Việc chính |
|---|---|---|---|
| **0. Dữ liệu nền** | Môn + category, chuyên môn giáo viên, phòng + loại phòng, bảng tiết, quy tắc khung giờ lớp, giờ rảnh giáo viên | Môn/phòng/giáo viên có, nhưng **chưa có** category, loại phòng yêu cầu của môn, bảng tiết, giờ rảnh | Thêm cột/bảng và API cấu hình |
| **1. Yêu cầu xếp** | Lớp nhiều môn → danh sách "môn cần xếp" | **Đã có** `class_subject` + `curriculum` (lớp nhiều môn, kế hoạch buổi, giáo viên từng môn) | Bổ sung số buổi/tuần, giai đoạn; mở rộng API nội bộ |
| **2. Bộ giải** | Chọn (thứ, tiết, phòng, giáo viên) | Có `AutoScheduleService` kiểu tham lam, **ghi thẳng DB** | Viết solver thuần (mẫu tuần lặp + ngoại lệ), thay phần cũ |
| **3. Nháp & xác nhận** | Lưu nháp, xem trước, xác nhận | **Chưa có** | Bảng nháp + 4 API |
| **4. Giao diện** | Cấu hình, chạy, xem trước, xác nhận | Màn tạo lịch tay có | Màn cấu hình + màn xếp tự động |

Điểm khác lớn so với bản 2: **mô hình lớp nhiều môn đã tồn tại** (`class_subject`, `curriculum`), nên không tạo bảng chương trình lớp mới; chỉ bổ sung cột.

---

## 1. Hiện trạng code (đã đọc lại)

### 1.1 Đã có, dùng lại được

| Thành phần | Chi tiết |
|---|---|
| Lớp nhiều môn | `class_subject` (PK lớp+môn): `planned_sessions`, `required_sessions`, `session_minutes`, `teacher_id`, `is_primary`, `status`, `source` (`MANUAL`/`CURRICULUM`/`LEGACY`), `curriculum_id`. API `/classes/{classId}/subjects` đủ GET/POST/PUT/DELETE **[CÓ SẴN]** |
| Chương trình đào tạo | `curriculum`, `curriculum_subject` (`sequence_no`, `required_sessions`, `session_minutes`), `curriculum_subject_prerequisite`. API `/curricula` + `/curricula/{id}/subjects` **[CÓ SẴN]** |
| Môn học | API `/subjects` (list, get, check-code, usage, create, update, status) **[CÓ SẴN]**; bảng `subject` chỉ có `code, name, description, is_active` |
| Học sinh một lớp | DB chặn bằng `UNIQUE(student_id)` ở `class_student` **[CÓ SẴN]** → không cần kiểm tra trùng học sinh giữa lớp |
| Phòng | `classroom` có `capacity` (một trường duy nhất), `room_type` (`classroom`/`computer_room`), `status`, `department_id` **[CÓ SẴN]** |
| Kiểm tra trùng | `ScheduleService.create`: kiểm lớp còn xếp được → giáo viên → phòng → khóa tài nguyên → `assertNoConflicts` → ghi `session` (có `@Transactional`) **[CÓ SẴN]** |
| API lịch | `/departments/{d}/schedules` (GET/POST/PUT, `/{id}/cancel`, DELETE, `/room-suggestions`, `/impacts`, `/auto-generate`) và `/schedules/me` **[CÓ SẴN]** |
| API nội bộ | People: `/internal/classes/{id}`, `/internal/classes/{id}/subjects`, `/internal/students/{id}/classes`, danh sách giáo viên đủ điều kiện. Facility: `/internal/rooms`, `/internal/rooms/{roomId}` **[CÓ SẴN]** |
| Quyền | `subject.view/manage`, `curriculum.view/manage`, `class.view/edit`, `schedule.view/create/update/cancel_session/delete`, `facility.*`; module `SCHEDULE_MANAGEMENT`, `STUDENT_MANAGEMENT` |

### 1.2 Hạn chế của `AutoScheduleService` hiện tại (phải thay)

1. **Quét tuần tự từng khung giờ từ ngày đầu**: một môn 30 buổi sẽ dồn vào những ngày đầu (nhiều buổi/ngày), không có "N buổi mỗi tuần" hay mẫu tuần lặp.
2. **Không dùng `session_minutes`**: khung giờ lấy từ `slots` mà người gọi truyền vào mỗi lần; không có bảng tiết của tổ chức.
3. **Giờ lưu theo UTC**: `toInstant` dùng `ZoneOffset.UTC`; đã xác nhận bằng dữ liệu: lưu 07:30 → giao diện hiện 14:30.
4. **Phòng lấy theo phòng ban** (`facility.rooms(orgId, departmentId)`) và chỉ lọc `capacity ≥ sĩ số`; **không có loại phòng** (`RoomInfo` không mang `roomType`).
5. **Ghi thẳng từng buổi** (mỗi `create()` một giao dịch), không có bản nháp; lỗi giữa chừng để lại dữ liệu dở dang.
6. **Đếm buổi theo tên môn**: `countScheduledSessions(orgId, classId, subjectName)`; `session` chỉ có `subject_name`, **không có `subject_id`** → trùng tên hoặc đổi tên là sai.
7. **Giáo viên:** nếu môn không có giáo viên đủ điều kiện thì **dùng giáo viên chủ nhiệm** làm dự phòng → bỏ qua điều kiện chuyên môn (D1).
8. **Không có** giai đoạn/tiên quyết, giờ rảnh giáo viên, quy tắc khung giờ lớp, kiểm tra buổi nằm trong ngày bắt đầu/kết thúc của lớp (dùng `dateFrom/dateTo` của request).
9. **`SubjectService.getUsage`** chỉ đếm `school_class.subject_id`, bỏ sót `class_subject` và `curriculum_subject`.

### 1.3 Chưa đọc được

- **[CHƯA THẤY]** Chỗ ghi `teacher_subject` (DB có 1 dòng `source=MANUAL`), API chuyên môn (`SpecialtyController`), API "áp chương trình đào tạo vào lớp" (cột `school_class.curriculum_id` có, endpoint chưa thấy).
- **[CHƯA THẤY]** Đường dẫn chính xác của API nội bộ "giáo viên đủ điều kiện" ở People (client Schedule đã gọi `people.eligibleTeachers`).
- Thân hàm `assertNoConflicts` và `validateRoom` (bạn mở để xác nhận công thức chồng giờ).

---

## 2. Quyết định đã chốt

| Mã | Quyết định | Trạng thái |
|---|---|---|
| D1 | Giáo viên dạy được môn khi có chuyên môn **cùng category** với môn, **hoặc** có dòng ngoại lệ `teacher_subject` = `APPROVED` cho đúng môn | **Chưa chốt**, đang dùng mặc định |
| D2 | Môn cần phòng máy → chỉ phòng máy. Môn thường → được vào cả hai loại, **ưu tiên phòng thường** | Đã chốt (phần ưu tiên là đề xuất) |
| D3 | Lớp nhiều môn | Đã chốt, **đã có sẵn** `class_subject` |
| D4 | Học sinh chỉ một lớp, không kiểm tra trùng học sinh | Đã chốt, DB đảm bảo |
| D5 | Mẫu tuần lặp; tuần vướng thì đổi riêng tuần đó (đổi phòng → đổi tiết → đổi ngày) | Đã chốt |
| D6 | Giờ Việt Nam (`Asia/Ho_Chi_Minh`) | Đã chốt |
| D7 | Phòng cấp tổ chức | Đã chốt |
| **D8** | Số buổi mỗi tuần lưu ở `class_subject.sessions_per_week` (mặc định lấy từ `curriculum_subject` hoặc 2 nếu nhập tay) | **[ĐỀ XUẤT]** cần bạn xác nhận |
| **D9** | Giai đoạn = `curriculum_subject.sequence_no`, sao chép sang `class_subject.stage_no` (nhập tay mặc định 1) | **[ĐỀ XUẤT]** |
| **D10** | "Số tiết của một buổi" suy ra từ `session_minutes`: buổi là chuỗi tiết liền nhau có tổng thời lượng ≥ `session_minutes` (nếu bảng tiết là ca 90 phút thì 1 ca) | **[ĐỀ XUẤT]** |
| **D11** | Dữ liệu thực tế đang dùng ca 90 phút (07:30, 09:15, 13:00, 14:45); `Book1.xlsx` dùng tiết 45 phút. Bạn chọn bảng tiết nào làm mẫu | **Cần bạn chọn** |

---

## 3. Luồng tổng thể

```
TẦNG 0  Dữ liệu nền ─► môn(category, loại phòng) · giáo viên(chuyên môn→category)
                        phòng(loại, sức chứa, cấp tổ chức) · bảng tiết · quy tắc lớp · giờ rảnh GV
            │
TẦNG 1  Yêu cầu xếp ─► mỗi dòng class_subject còn thiếu buổi = 1 "yêu cầu"
            │            (lớp, môn, giáo viên, buổi/tuần, số buổi còn thiếu, giai đoạn, cửa sổ ngày)
            ▼
TẦNG 2  Solver ───────► (1) chọn mẫu tuần lặp  (2) vá ngoại lệ từng tuần   [hàm thuần, không DB]
            ▼
TẦNG 3  Nháp ─────────► lưu nháp → xem trước → xác nhận (kiểm tra lại từng buổi, 1 giao dịch)
            ▼
TẦNG 4  Giao diện
```

---

# TẦNG 0 – DỮ LIỆU NỀN

## 0.1 Môn học và category (PeopleService)

**Bạn phải làm được:**
- Tạo/sửa/bật-tắt **category môn học** (ví dụ Lập trình, Hạ tầng, Dữ liệu, Ngôn ngữ, Toán).
- Gán category và **yêu cầu phòng** (`ANY` hoặc `COMPUTER`) cho mỗi môn.
- Xem môn nào đang dùng ở lớp/chương trình trước khi đổi category hoặc yêu cầu phòng.

**Dữ liệu [ĐỀ XUẤT]:**
- Bảng `subject_category(id, org_id, name, name_unaccented, is_active, created_by, created_at)`; duy nhất `(org_id, name_unaccented)`.
- `subject` thêm: `category_id` (NULL được lúc đầu), `room_requirement` (`ANY`/`COMPUTER`, mặc định `ANY`).

**API:**

| Method + Path | Quyền | Trạng thái | Ghi chú |
|---|---|---|---|
| `GET /subject-categories?includeInactive=` | `subject.view`/`subject.manage` | **[MỚI]** | Danh sách, kèm số môn |
| `POST /subject-categories` `{name}` | `subject.manage` | **[MỚI]** | 201; trùng tên → lỗi |
| `PUT /subject-categories/{id}` `{name}` | `subject.manage` | **[MỚI]** | |
| `PATCH /subject-categories/{id}/status` `{active}` | `subject.manage` | **[MỚI]** | Tắt category đang có môn: cảnh báo |
| `POST/PUT /subjects` | `subject.manage` | **[SỬA]** | `SubjectRequest` thêm `categoryId`, `roomRequirement` |
| `GET /subjects`, `GET /subjects/{id}` | `subject.view` | **[SỬA]** | `SubjectResponse` thêm `categoryId`, `categoryName`, `roomRequirement` |
| `GET /subjects/{id}/usage` | `subject.view` | **[SỬA]** | Đếm thêm `class_subject` và `curriculum_subject` |

**Việc code (theo thứ tự):**
1. `subject_category` + repository + service + controller (mẫu: `SubjectRepository`, `SubjectController`).
2. Thêm 2 cột vào `subject`, sửa `SubjectRequest`/`SubjectResponse`/`SubjectRepository.map` và `SELECT_COLUMNS`.
3. Sửa `getUsage` đếm cả `class_subject`, `curriculum_subject`.
4. Cảnh báo khi đổi `category_id`/`room_requirement` của môn đang dùng (trả danh sách lớp bị ảnh hưởng, cho phép xác nhận).

**DoD:**
- [ ] CRUD category chạy, trùng tên bị chặn, đúng `org_id`.
- [ ] Môn có category và `roomRequirement`; môn cũ không lỗi (NULL/`ANY`).
- [ ] `usage` đếm đúng lớp dùng môn qua `class_subject`.

## 0.2 Chuyên môn và giáo viên đủ điều kiện (PeopleService)

**Bạn phải làm được:**
- Gắn **chuyên môn** vào một category.
- Hệ thống tính "giáo viên dạy được môn X" **theo một quy tắc duy nhất** (D1), dùng chung cho gán giáo viên vào lớp/môn, xếp tự động và cảnh báo lệch chuyên môn.
- Thêm **ngoại lệ** cho từng giáo viên–môn (`teacher_subject`).

**Dữ liệu [ĐỀ XUẤT]:** `specialty` thêm `category_id`. `teacher_subject` hiện lỏng (PK `teacher_id, subject_id`, có thêm `user_id`/`org_id` NULL được, không khóa ngoại): chốt `user_id` là khóa thật, đặt `org_id` NOT NULL (làm cẩn thận, dữ liệu hiện có 1 dòng).

**API:**

| Method + Path | Quyền | Trạng thái | Ghi chú |
|---|---|---|---|
| API chuyên môn (tìm `SpecialtyController`) | — | **[CHƯA THẤY] → [SỬA]** | Thêm `categoryId` vào request/response |
| `GET /teachers/{userId}/subjects` | `teacher.view` hoặc tương đương | **[MỚI]** nếu chưa có | Trả môn đủ điều kiện, nêu lý do: `CATEGORY` hoặc `EXCEPTION` |
| `PUT /teachers/{userId}/subjects` `{subjectIds[]}` | quyền quản lý giáo viên | **[MỚI]** nếu chưa có | Ghi các dòng ngoại lệ `APPROVED` |
| `GET /internal/subjects/eligible-teachers?orgId&subjectIds=a,b,c` | khóa nội bộ | **[MỚI]** | Trả `map subjectId → [giáo viên]` một lần, thay cho gọi từng môn |

**Việc code:**
1. Thêm `category_id` vào `specialty`; sửa API chuyên môn.
2. Viết **một** điều kiện/hàm "đủ điều kiện" ở `TeacherRepository` (cùng category **hoặc** ngoại lệ; giáo viên `ACTIVE` và `DANG_DAY`). Cho `eligibleForSubject`, `teachesSubject` và đường gán giáo viên cho `class_subject` cùng dùng nó.
3. Chặn **đường gán thẳng giáo viên vào `class_subject.teacher_id`** nếu giáo viên không đủ điều kiện (hiện dữ liệu cho thấy gán được mà không có `teacher_subject`).
4. Bỏ "dự phòng giáo viên chủ nhiệm" trong `AutoScheduleService` (hạn chế số 7).

**DoD:**
- [ ] Bốn ca test: cùng category / khác category / khác category nhưng có ngoại lệ / giáo viên `NGHI_VIEC`.
- [ ] Gán giáo viên không đủ điều kiện vào môn của lớp bị từ chối với mã lỗi rõ.
- [ ] Endpoint batch trả đúng cho 3 môn trong một lần gọi.

## 0.3 Phòng, loại phòng, sức chứa (FacilityService)

**Bạn phải làm được:** xếp lịch dùng **mọi phòng đang hoạt động của tổ chức** (D7), biết loại phòng và sức chứa (số chỗ, phòng máy = số máy).

**Dữ liệu:** không đổi bảng (`classroom.room_type`, `capacity`). Bảng `computer_room.machine_count` đang rỗng; **không dùng**, quy ước `capacity` là số sinh viên tối đa.

**API:**

| Method + Path | Quyền | Trạng thái | Ghi chú |
|---|---|---|---|
| `GET /internal/rooms?orgId[&departmentId]` | khóa nội bộ | **[SỬA]** | `departmentId` thành tùy chọn; không có → cả tổ chức |
| `GET /internal/rooms/{roomId}?orgId` | khóa nội bộ | **[SỬA]** | |
| (cả hai) `InternalRoomResponse` | | **[SỬA]** | Thêm `roomType` |
| `RoomInfo` (Schedule client) | | **[SỬA]** | Thêm `roomType` |
| `GET /departments/{d}/schedules/room-suggestions?startTime&endTime&classId&subjectId` | `schedule.create` | **[SỬA]** | Thêm `classId`/`subjectId`: lọc `capacity ≥ sĩ số`, loại phòng; phòng thường đứng trước phòng máy |

**Việc code:** thêm `roomType` vào response nội bộ và `RoomInfo`; thêm `FacilityClient.roomsOfOrg(orgId)`; `validateRoom` kiểm loại phòng và sức chứa theo môn (cả khi tạo lịch tay).

**DoD:**
- [ ] Môn `COMPUTER` xếp vào phòng thường bị từ chối; môn `ANY` vào phòng máy được phép.
- [ ] Phòng ban đào tạo thấy phòng do phòng ban CSVC quản lý; không thấy phòng tổ chức khác.

## 0.4 Cấu hình thời gian (ScheduleService)

**Bạn phải làm được:**
- Owner/người có quyền nhập **bảng tiết** của tổ chức (như `Book1.xlsx` hoặc ca 90 phút), có đánh dấu "nối được với tiết sau" (để xử lý ra chơi, nghỉ trưa).
- Đặt **quy tắc khung giờ cho từng lớp** ("thứ 2 chỉ tiết 6–10, thứ 3 chỉ tiết 1–5"; ngày không đặt = tự do).
- Đặt **giờ rảnh/bận của giáo viên**.

**Dữ liệu [ĐỀ XUẤT]:**
- `time_slot(id, org_id, period_no, name, start_time, end_time, joins_next, is_active)`; duy nhất `(org_id, period_no)`.
- `class_slot_rule(id, org_id, class_id, weekday 1–7, from_period, to_period, is_off)`.
- `teacher_availability(id, org_id, teacher_id, weekday, from_period, to_period, kind AVAILABLE|UNAVAILABLE)`; giáo viên không có dòng = rảnh hết.

**API** (nhóm mới `schedule-config`, tránh nhầm với route theo phòng ban):

| Method + Path | Quyền | Trạng thái | Ghi chú |
|---|---|---|---|
| `GET /schedule-config/time-slots` | `schedule.view` | **[MỚI]** | |
| `PUT /schedule-config/time-slots` `{slots:[{periodNo,name,startTime,endTime,joinsNext}]}` | `schedule.config` | **[MỚI]** | Thay toàn bộ; validate bên dưới |
| `GET /schedule-config/classes/{classId}/slot-rules` | `schedule.view` | **[MỚI]** | |
| `PUT /schedule-config/classes/{classId}/slot-rules` `{rules:[{weekday,fromPeriod,toPeriod,isOff}]}` | `schedule.config` | **[MỚI]** | Thay toàn bộ |
| `GET /schedule-config/teachers/{teacherId}/availability` | `schedule.view` | **[MỚI]** | |
| `PUT /schedule-config/teachers/{teacherId}/availability` `{items:[...]}` | `schedule.config` | **[MỚI]** | Thay toàn bộ |

**Validate bảng tiết:** `start < end`; không chồng nhau; `period_no` liên tục từ 1; "ra chơi" **không** phải là tiết (biểu diễn bằng `joinsNext=false` ở tiết trước). Quy tắc lớp: `from ≤ to` và tiết tồn tại.

**Việc code:**
1. Ba bảng + repository (SQL `JdbcTemplate`, giống phong cách hiện có).
2. Mã quyền mới `schedule.config` ở `PermissionCatalog` (Identity), nhãn ở `permissionLabels.ts`.
3. Gateway: thêm route `/api/schedule-config/**` → ScheduleService (xem `APIGateway/.../application.yml`).
4. **Hàm lưới giờ** dùng chung (D6, D10): đổi (ngày, tiết bắt đầu, số tiết) ↔ giờ thực theo `Asia/Ho_Chi_Minh`; kiểm buổi nhiều tiết có nối được không; liệt kê các ngày của một thứ trong khoảng.
5. **Sửa `toInstant`** bỏ `ZoneOffset.UTC` (ở `AutoScheduleService` và mọi nơi tạo `Instant` từ giờ nhập); kiểm tra chéo với phần hiển thị ở FE.

**DoD:**
- [ ] Nạp được bảng tiết (cả ca 90 phút và tiết 45 phút) và đọc lại đúng.
- [ ] Tiết chồng nhau/hở số bị từ chối.
- [ ] Test hàm lưới: buổi 2 tiết bắt đầu tiết 3 (qua ra chơi) không hợp lệ; hết tiết không hợp lệ.
- [ ] Nhập 07:30 → lưu và hiển thị đúng 07:30 giờ Việt Nam.

---

# TẦNG 1 – YÊU CẦU XẾP (LỚP NHIỀU MÔN)

**Bạn phải làm được:**
- Với một lớp, xem **chương trình** (các môn, giai đoạn, số buổi, số buổi/tuần, giáo viên từng môn).
- Áp một **chương trình đào tạo** vào lớp (sao chép các môn sang `class_subject`, `source=CURRICULUM`).
- Hệ thống **sinh yêu cầu xếp** cho mỗi môn còn thiếu buổi, với cửa sổ ngày của giai đoạn.

**Dữ liệu [ĐỀ XUẤT]:**
- `class_subject` thêm `sessions_per_week` (D8), `stage_no` (D9).
- `curriculum_subject` thêm `sessions_per_week`.
- `session` thêm `subject_id` (khóa tham chiếu, dùng đếm buổi theo môn thay cho tên).

**Quy tắc tính thời gian:**
- `weeks_needed = ceil(số buổi còn thiếu / sessions_per_week)`.
- Một giai đoạn kéo dài bằng số tuần của môn dài nhất trong giai đoạn; giai đoạn sau bắt đầu ngay sau giai đoạn trước; bắt đầu từ ngày bắt đầu lớp.
- Giai đoạn vượt ngày kết thúc của lớp → cảnh báo.
- Tiên quyết (`curriculum_subject_prerequisite`): môn không được ở giai đoạn trước hoặc cùng giai đoạn với tiên quyết của nó.

**API:**

| Method + Path | Quyền | Trạng thái | Ghi chú |
|---|---|---|---|
| `GET /classes/{classId}/subjects` | `class.view`/`subject.view` | **[SỬA]** | Response thêm `sessionsPerWeek`, `stageNo`, `scheduledSessions`, `category`, `roomRequirement` |
| `POST /classes/{classId}/subjects` | `class.edit`/`subject.manage` | **[SỬA]** | `ClassSubjectCreateRequest` thêm `sessionsPerWeek`, `stageNo`; kiểm giáo viên đủ điều kiện (0.2) |
| `PUT /classes/{classId}/subjects/{subjectId}` | như trên | **[SỬA]** | `ClassSubjectUpdateRequest` thêm 2 trường; kiểm giáo viên |
| `DELETE /classes/{classId}/subjects/{subjectId}` | như trên | **[CÓ SẴN]** | Chặn khi còn buổi tương lai (kiểm tra thêm) |
| `POST /classes/{classId}/curriculum` `{curriculumId}` | `class.edit` | **[CHƯA THẤY] → [MỚI]** nếu chưa có | Sao chép `curriculum_subject` → `class_subject`; đặt `school_class.curriculum_id` |
| `POST/PUT /curricula/{id}/subjects` | `curriculum.manage` | **[SỬA]** | `CurriculumSubjectRequest` thêm `sessionsPerWeek`; chặn vòng tiên quyết |
| `GET /internal/classes/{classId}` | khóa nội bộ | **[CÓ SẴN]** | Đã có `studentCount`, `startDate`, `endDate`, `status`, `closeState` |
| `GET /internal/classes/{classId}/subjects` | khóa nội bộ | **[SỬA]** | `ClassSubjectResponse` (và `ClassSubjectInfo` bên Schedule) thêm `sessionsPerWeek`, `stageNo`, `categoryId`, `roomRequirement` |
| `GET /internal/subjects/eligible-teachers?...` | khóa nội bộ | **[MỚI]** | Như 0.2 |

**Việc code:**
1. Thêm cột (`class_subject`, `curriculum_subject`, `session`); sửa DTO + repository (`ClassSubjectRepository.mapSubject`, `addSubject`, `updateSubject`).
2. `ClassSubjectService`: kiểm giáo viên đủ điều kiện khi gán.
3. Endpoint áp chương trình (nếu chưa có); phát hiện vòng tiên quyết.
4. Bên Schedule: sửa `ClassSubjectInfo`, `ScheduleRequest` (thêm `subjectId`), `ScheduleService.create/update` ghi `subject_id`, `countScheduledSessions` đếm theo `subject_id` (giữ đường tương thích theo tên cho buổi cũ).
5. **Lớp bọc "dựng yêu cầu"** ở Schedule: từ `classIds` → gọi `people.classInfo`, `people.classSubjects`, danh sách giáo viên batch → danh sách `SessionRequirement` (lớp, môn, giáo viên hoặc ứng viên, số buổi còn thiếu, buổi/tuần, số tiết theo D10, loại phòng, sĩ số, cửa sổ ngày). Môn thiếu dữ liệu (chưa category, không có giáo viên đủ điều kiện) vào danh sách "không xếp được" kèm lý do, **không làm hỏng cả lượt chạy**.

**DoD:**
- [ ] Áp chương trình CNTT-K27 vào một lớp → `class_subject` có đủ 3 môn, đúng giai đoạn và số buổi/tuần.
- [ ] Môn đã đủ buổi không sinh yêu cầu; môn còn thiếu sinh yêu cầu đúng số buổi.
- [ ] `session` mới có `subject_id`; đếm theo môn đúng.
- [ ] Lớp hủy/kết thúc/chờ đóng bị loại, có lý do.

---

# TẦNG 2 – BỘ GIẢI (SOLVER)

**Bạn phải làm được:** từ danh sách yêu cầu → bản **mẫu tuần lặp** hợp lệ; tuần nào vướng thì **đổi riêng tuần đó**; yêu cầu nào không xếp được thì **nói rõ thiếu gì**.

**Nguyên tắc:** viết solver là **hàm thuần**, không gọi DB hay service khác (dễ test, dễ nâng lên CP-SAT sau). Đây là code **mới**, thay logic trong `AutoScheduleService.generate`.

**Vào:** yêu cầu (Tầng 1) · lưới giờ (0.4) · phòng cấp tổ chức kèm loại/sức chứa (0.3) · giờ rảnh giáo viên (0.4) · quy tắc lớp (0.4) · **các buổi đã có** (giáo viên/phòng/lớp bận ở ô nào, ngày nào) · cấu hình (thời gian tối đa, ngưỡng độ phủ `minCoverage` mặc định 0.5).

**Ra:** danh sách buổi **bung từng ngày**, mỗi buổi có `isException` + loại (`ROOM_CHANGED`/`PERIOD_CHANGED`/`DAY_CHANGED`) + lý do; danh sách **chưa xếp** kèm lý do chẩn đoán; thống kê.

## 2.1 Bộ lọc điều kiện cứng

| # | Bộ lọc | Phụ thuộc ngày? |
|---|---|---|
| 1 | Ô nằm trong quy tắc khung giờ của lớp | không |
| 2 | Buổi `k` tiết liền hợp lệ (nối được, không qua ra chơi, không hết tiết) | không |
| 3 | Giáo viên rảnh ở các tiết đó | không |
| 4 | Loại phòng: `COMPUTER` → chỉ phòng máy; `ANY` → cả hai (**phạt mềm** nếu dùng phòng máy) | không |
| 5 | Phòng `active`, không thiết bị hỏng | không |
| 6 | `capacity ≥ sĩ số` | không |
| 7 | Giáo viên không có buổi khác trùng ô | **có** |
| 8 | Lớp không có buổi khác trùng ô | **có** |
| 9 | Phòng không có buổi khác trùng ô | **có** |
| 10 | Buổi nằm trong ngày bắt đầu/kết thúc lớp và cửa sổ giai đoạn | có |

Bộ lọc 1–6 loại thẳng. Bộ lọc 7–9 dùng để tính **độ phủ** của một giá trị (thứ, tiết, phòng, giáo viên): tỉ lệ số ngày hợp lệ trên tổng số ngày có thứ đó trong cửa sổ; giá trị có độ phủ `< minCoverage` bị loại. Mỗi bộ lọc có **bộ đếm lý do loại** để chẩn đoán.

## 2.2 Hai giai đoạn

**Giai đoạn 1 – chọn mẫu tuần lặp** (quay lui + MRV + forward checking):

```
function giải(buổi_chưa_xếp):
    nếu rỗng: THÀNH CÔNG
    chọn buổi b có MIỀN NHỎ NHẤT                   (MRV)
    với mỗi giá trị v của b, giá trị điểm cao thử trước:
        gán b = v; loại khỏi miền các buổi khác những giá trị XUNG ĐỘT với v
        nếu có miền rỗng: hoàn tác, thử giá trị kế
        ngược lại giải(phần còn lại) ... nếu THÀNH CÔNG: THÀNH CÔNG
        hoàn tác
    THẤT BẠI
```

Xung đột giữa hai buổi **mới**: cùng lúc (ô giao nhau **và** cửa sổ ngày giao nhau) **và** cùng giáo viên / cùng lớp / cùng phòng. Hai môn **cùng lớp** luôn khác ô; hai buổi cùng môn của một lớp không cùng ngày; môn giai đoạn sau được dùng lại ô của giai đoạn trước (cửa sổ ngày không giao). Có giới hạn thời gian và số bước; hết giới hạn trả phương án tốt nhất kèm cờ "chưa đầy đủ".

**Giai đoạn 2 – vá ngoại lệ theo tuần:** với mỗi buổi mẫu và mỗi ngày `d` có thứ đó:
1. Ô mẫu hợp lệ ở ngày `d` → giữ nguyên.
2. Ngược lại thử lần lượt: **(a)** cùng ô, đổi phòng → **(b)** cùng ngày, đổi tiết → **(c)** ngày khác trong cùng tuần. Mỗi lựa chọn phải qua đủ điều kiện cứng.
3. Không có lựa chọn → ghi "chưa xếp" cho (buổi, ngày) kèm lý do; ghi cờ ngoại lệ nếu có đổi.
Không đổi giáo viên ở giai đoạn này; cập nhật bảng chiếm ô sau mỗi lần vá.

## 2.3 Điều kiện mềm (chỉ để sắp thứ tự thử)

Độ phủ cao (ít ngoại lệ) · **môn `ANY` dùng phòng máy bị phạt** · phòng vừa đủ sức chứa · ít tiết trống của giáo viên trong ngày · rải đều buổi cùng môn · cân bằng tải ngày. Trọng số để ở **một chỗ**.

## 2.4 Chẩn đoán "không xếp được"

Dùng bộ đếm lý do loại → câu tiếng Việt nêu **cái gì thiếu** ("Không có phòng máy đủ 45 chỗ vào thứ 2–6", "Giáo viên bận", "Khung giờ lớp quá hẹp", "Tuần N: ô mẫu đã có buổi của lớp X và không còn ô thay thế").

**API:** Tầng 2 **không có API riêng** (hàm thuần); được gọi từ Tầng 3.

**Việc code:** (1) record vào/ra; (2) sinh miền + độ phủ + bộ đếm; (3) giai đoạn 1; (4) giai đoạn 2; (5) điểm mềm; (6) chẩn đoán; (7) bộ test S1–S14 (bảng ở mục 7).

**DoD:**
- [ ] Mỗi kịch bản S1–S14 có test xanh.
- [ ] Chạy hai lần cùng dữ liệu cho cùng kết quả.
- [ ] Hàm kiểm tra độc lập xác nhận **không có hai buổi nào xung đột** trong mọi kết quả.
- [ ] Hết thời gian vẫn trả kết quả một phần, không treo.

---

# TẦNG 3 – NHÁP VÀ XÁC NHẬN (ScheduleService)

**Bạn phải làm được:**
- Chạy xếp tự động cho nhiều lớp **mà chưa ghi lịch thật**; xem kết quả (kể cả ngoại lệ và danh sách chưa xếp).
- **Xác nhận** nháp: hệ thống kiểm tra lại từng buổi như khi tạo tay rồi mới ghi; **hủy** nháp.
- Biết rõ vì sao một môn không xếp được.

**Dữ liệu [ĐỀ XUẤT]:**
- `schedule_draft(id, org_id, department_id, status DRAFT|CONFIRMED|DISCARDED, params JSON, summary JSON, created_by, created_at, confirmed_at)`.
- `schedule_draft_item(id, draft_id, class_id, subject_id, teacher_id, room_id, start_time, end_time, week_no, is_exception, exception_type, exception_reason)`.
- `schedule_draft_unscheduled(id, draft_id, class_id, subject_id, session_no, reason)`.

**API** (route theo phòng ban; đã khớp mẫu `/api/departments/*/schedules/**` của gateway):

| Method + Path | Quyền | Trạng thái | Ghi chú |
|---|---|---|---|
| `POST /departments/{d}/schedules/drafts` `{classIds[], dateFrom, dateTo, options{minCoverage?, maxSeconds?}}` | `schedule.create` + module ghi | **[MỚI]** | 201 `{draftId, status, summary{requested, scheduled, exceptions, unscheduled}}` |
| `GET /departments/{d}/schedules/drafts?status=` | `schedule.view` | **[MỚI]** | Danh sách nháp của phòng ban |
| `GET /departments/{d}/schedules/drafts/{draftId}?week=` | `schedule.view` | **[MỚI]** | Items (có phân trang theo tuần), danh sách chưa xếp, thống kê |
| `POST /departments/{d}/schedules/drafts/{draftId}/confirm` | `schedule.create` | **[MỚI]** | `{created, failed[{item, reason}]}`; chỉ nháp `DRAFT` |
| `DELETE /departments/{d}/schedules/drafts/{draftId}` | `schedule.create` | **[MỚI]** | Chuyển `DISCARDED` |
| `POST /departments/{d}/schedules/auto-generate` | `schedule.create` | **[CÓ SẴN]** | Giữ tạm cho FE cũ, đánh dấu ngừng dùng khi FE chuyển |
| `PUT /departments/{d}/schedules/{sessionId}`, `POST .../cancel`, `DELETE ...` | `schedule.update`/`cancel_session`/`delete` | **[SỬA]** | `ScheduleRequest` có `subjectId`; kiểm loại phòng/sức chứa như `create` |

**Chính sách xác nhận [ĐỀ XUẤT]:** một giao dịch, **tất cả hoặc không** (nếu một buổi xung đột vì có người tạo tay trong lúc xem nháp thì hủy cả lượt và trả danh sách buổi lỗi). Nháp quá cũ (vài ngày) không xác nhận được.

**Việc code:**
1. Ba bảng nháp + repository.
2. Lớp bọc: dựng yêu cầu (Tầng 1) → nạp **buổi đã có** trong khoảng ngày (loại `cancelled`, `deleted_at`) → gọi solver → lưu nháp. **Không** ghi `session`.
3. `confirm`: trong **một** `@Transactional`, duyệt từng item gọi đúng bộ kiểm tra của `ScheduleService.create` (giữ khóa tài nguyên); ghi `session` có `subject_id`.
4. Gateway không cần route mới (khớp `/api/departments/*/schedules/**`).
5. Liên động tối thiểu: hủy/đóng lớp → buổi tương lai; giáo viên nghỉ/chuyển phòng → đánh dấu (dùng cơ chế `session_impact` sẵn có).

**DoD:**
- [ ] Tạo nháp xong bảng `session` **không đổi**.
- [ ] Xác nhận → buổi xuất hiện ở `GET /departments/{d}/schedules` và `/schedules/me`.
- [ ] Tạo tay một buổi trùng nháp rồi xác nhận → không ghi buổi trùng, trả lỗi rõ.
- [ ] Xác nhận hai lần: lần hai bị từ chối.
- [ ] Người không có quyền / module tắt bị chặn đúng mã lỗi.

---

# TẦNG 4 – GIAO DIỆN (FE)

**Bạn phải làm được (người dùng):**

| Màn hình | Làm được gì | API dùng |
|---|---|---|
| **Môn học** (sửa màn hiện có) | Chọn category, yêu cầu phòng máy; thấy lớp đang dùng | `/subjects`, `/subject-categories` |
| **Chuyên môn / giáo viên** | Gán chuyên môn vào category; thêm môn ngoại lệ cho giáo viên | API chuyên môn, `/teachers/{id}/subjects` |
| **Chương trình lớp** (sửa màn hiện có) | Áp chương trình; sửa số buổi, buổi/tuần, giai đoạn, giáo viên từng môn | `/classes/{id}/subjects`, `/classes/{id}/curriculum` |
| **Cấu hình lịch** (mới) | Nhập bảng tiết; quy tắc khung giờ lớp; giờ rảnh giáo viên | `/schedule-config/**` |
| **Xếp lịch tự động** (mới) | Chọn lớp + khoảng ngày → "Tạo bản nháp" → xem **lưới tuần** (ngoại lệ tô khác màu kèm lý do) → khung "Chưa xếp được" → Xác nhận / Hủy | `/departments/{d}/schedules/drafts/**` |
| **Lịch học** (sửa) | Hiển thị đúng giờ Việt Nam; gợi ý phòng đúng loại, đủ chỗ | `.../room-suggestions` |

**Việc code:** mở rộng `operationsApi.ts` (hàm gọi + bảng dịch mã lỗi), `operationsMessages.ts` (câu chữ), `permissions.ts`/`permissionLabels.ts` (thêm `schedule.config`); chặn hiển thị theo quyền và module như các màn hiện có.

**DoD:**
- [ ] Owner đi từ "chưa có bảng tiết" đến "nháp xem được và xác nhận" chỉ bằng giao diện; nếu thiếu cấu hình thì báo rõ thiếu cái nào.
- [ ] Mọi lỗi hiện bằng tiếng Việt, không lộ mã thô.
- [ ] Giờ hiển thị đúng 07:30 → 07:30.

---

# 5. Danh mục API tổng hợp

| Service | API | Trạng thái |
|---|---|---|
| People | `/subjects` (+ `usage`) | SỬA |
| People | `/subject-categories` (GET, POST, PUT, PATCH status) | MỚI |
| People | API chuyên môn (thêm `categoryId`) | SỬA [CHƯA THẤY] |
| People | `/teachers/{userId}/subjects` (GET, PUT) | MỚI [kiểm tra đã có chưa] |
| People | `/classes/{classId}/subjects` (GET/POST/PUT/DELETE) | SỬA |
| People | `POST /classes/{classId}/curriculum` | MỚI [kiểm tra đã có chưa] |
| People | `/curricula`, `/curricula/{id}/subjects` | SỬA nhẹ (`sessionsPerWeek`, chặn vòng) |
| People | `GET /internal/classes/{id}/subjects` | SỬA |
| People | `GET /internal/subjects/eligible-teachers` (batch) | MỚI |
| Facility | `GET /internal/rooms` (`departmentId` tùy chọn, thêm `roomType`) | SỬA |
| Facility | `GET /internal/rooms/{roomId}` (thêm `roomType`) | SỬA |
| Schedule | `/schedule-config/time-slots` (GET, PUT) | MỚI |
| Schedule | `/schedule-config/classes/{classId}/slot-rules` (GET, PUT) | MỚI |
| Schedule | `/schedule-config/teachers/{teacherId}/availability` (GET, PUT) | MỚI |
| Schedule | `/departments/{d}/schedules/drafts` (POST, GET), `/{draftId}` (GET, DELETE), `/{draftId}/confirm` (POST) | MỚI |
| Schedule | `/departments/{d}/schedules` (POST/PUT thêm `subjectId`), `/room-suggestions` (thêm tham số) | SỬA |
| Schedule | `/departments/{d}/schedules/auto-generate` | CÓ SẴN, ngừng dùng dần |
| Identity | Mã quyền `schedule.config` (`PermissionCatalog`) | MỚI |
| Gateway | Route `/api/schedule-config/**` → Schedule; (kiểm tra route cho `/api/subject-categories/**`, `/api/teachers/**`, `/api/classes/**`) | MỚI |

---

# 6. Thứ tự làm (từng bước nhỏ, xong bước nào chuyển bước đó)

| Bước | Việc | Phụ thuộc |
|---|---|---|
| **B0** | Khảo sát nốt: `assertNoConflicts`, `validateRoom`, `SpecialtyController`, chỗ ghi `teacher_subject`, endpoint áp chương trình, route gateway | — |
| **B1** | Sửa múi giờ (D6) + hàm lưới giờ; sửa dữ liệu lỗi dấu (`utf8mb4`) | — |
| **B2** | Tầng 0.3: `roomType` + phòng cấp tổ chức + kiểm tra loại phòng ở tạo tay | B0 |
| **B3** | Tầng 0.1: category + `roomRequirement` + sửa `usage` | — |
| **B4** | Tầng 0.2: category cho chuyên môn + quy tắc "đủ điều kiện" duy nhất + chặn gán sai | B3 |
| **B5** | Tầng 0.4: bảng tiết, quy tắc lớp, giờ rảnh (API + quyền + gateway) | B1 |
| **B6** | Tầng 1: cột `sessions_per_week`, `stage_no`, `session.subject_id`; áp chương trình; API nội bộ mở rộng | B3, B4 |
| **B7** | Tầng 2: solver thuần + test S1–S14 (không cần DB) | B2, B5, B6 (dữ liệu mẫu) |
| **B8** | Tầng 3: bảng nháp + 5 API + lớp bọc | B7 |
| **B9** | Tầng 4: màn hình | B8 |
| **B10** | Nghiệm thu T1–T11, dọn endpoint cũ, tài liệu | tất cả |

B3, B5 độc lập nhau, làm song song được. B7 chỉ cần dữ liệu giả, có thể bắt đầu sớm khi hiểu vào/ra.

---

# 7. Kiểm thử và nghiệm thu

**Solver (hàm thuần), dữ liệu mẫu từ bảng tiết/phòng/môn của bạn:**

| Mã | Kịch bản | Mong đợi |
|---|---|---|
| S1 | 1 lớp, 1 môn, 2 buổi/tuần, mọi thứ trống | Hai buổi khác thứ |
| S2 | Lớp 3 môn song song, giáo viên khác nhau | Ba môn khác ô |
| S3 | 2 môn cùng 1 giáo viên | Hai môn khác ô |
| S4 | Quy tắc lớp thứ 2 tiết 6–10, thứ 3 tiết 1–5 | Mọi buổi nằm trong quy tắc |
| S5 | Môn `COMPUTER`, hết phòng máy trống | Không xếp được, lý do "thiếu phòng máy" |
| S6 | Lớp 55 em, phòng lớn nhất 50 chỗ | Không xếp được, lý do sức chứa |
| S7 | Giáo viên bận ở lớp khác cùng ô | Né ô đó |
| S8 | Buổi nhiều tiết qua ra chơi | Không dùng ô đó |
| S9 | Hai lớp tranh duy nhất 1 phòng máy | Lệch ô hoặc báo thiếu |
| S10 | 50 lớp | Xong trong giới hạn thời gian |
| S11 | Môn `ANY`, phòng thường hết, còn phòng máy | Được vào phòng máy; còn phòng thường thì không dùng phòng máy |
| S12 | Một buổi lẻ ở tuần 3 chiếm ô mẫu | Chỉ tuần 3 là ngoại lệ |
| S13 | Lớp 2 giai đoạn | Giai đoạn 2 dùng lại ô giai đoạn 1; không hai môn cùng lớp trùng ô |
| S14 | Môn `COMPUTER` và môn `ANY` tranh phòng máy | Môn `COMPUTER` được ưu tiên |

**Tích hợp (DB local):**

| Mã | Kịch bản | Mong đợi |
|---|---|---|
| T1 | Nạp bảng tiết, phòng, môn, giáo viên mẫu | Không lỗi |
| T2 | Lớp 3 môn, tạo nháp | Đủ buổi, không trùng |
| T3 | Xác nhận nháp | Hiện ở màn Lịch và `/schedules/me` |
| T4 | Giáo viên không đủ điều kiện cho một môn | Môn đó báo lý do đúng, các môn khác vẫn xếp |
| T5 | Tắt hết phòng máy (bảo trì) | Môn `COMPUTER` không xếp được, lý do đúng |
| T6 | Tạo tay buổi trùng nháp rồi xác nhận | Báo xung đột, không ghi trùng |
| T7 | Tắt module `SCHEDULE_MANAGEMENT` | Chặn ghi, vẫn xem được |
| T8 | Người không có quyền gọi API | 403 |
| T9 | Tổ chức khác dùng id lớp tổ chức này | Không thấy dữ liệu |
| T10 | Nhập 07:30 | Hiển thị đúng 07:30 giờ Việt Nam |
| T11 | Buổi lẻ chiếm ô mẫu của lớp 10A ở một tuần | Nháp có đúng 1 ngoại lệ, tô khác màu |

**DoD tổng:**
- [ ] D1 chốt (hoặc ghi dùng mặc định); D8–D11 được xác nhận.
- [ ] Môn có category và yêu cầu phòng; chuyên môn có category; một quy tắc duy nhất "giáo viên đủ điều kiện".
- [ ] Bảng tiết/quy tắc lớp/giờ rảnh cấu hình được bằng API và giao diện.
- [ ] Phòng cấp tổ chức, đúng loại và sức chứa ở cả xếp tay lẫn tự động.
- [ ] Solver thuần, S1–S14 xanh; hàm kiểm tra độc lập không thấy xung đột.
- [ ] Nháp → xem trước → xác nhận; xác nhận kiểm tra lại từng buổi, không để dữ liệu dở dang.
- [ ] `session.subject_id` có và được dùng để đếm buổi.
- [ ] Giờ lưu và hiển thị đúng giờ Việt Nam.
- [ ] Quyền, module, `org_id` được kiểm ở mọi endpoint mới.
- [ ] Bạn giải thích được thuật toán cho mentor (phụ lục A) không cần xem tài liệu.

---

# PHỤ LỤC

## A. Giải thích cho mentor (tô màu đồ thị và CSP)

- Mỗi **buổi cần xếp** là một **đỉnh**; hai buổi không được cùng ô giờ (cùng giáo viên, cùng lớp hoặc cùng phòng) thì **nối cạnh**; mỗi **màu** là một ô giờ. Xếp lịch = tô màu sao cho hai đỉnh kề nhau khác màu.
- Có thêm phòng, loại phòng, khung giờ lớp, giờ rảnh giáo viên nên là **CSP**: biến = buổi, miền = (ô giờ, phòng, giáo viên) hợp lệ, ràng buộc = điều kiện cứng.
- **MRV** chọn buổi khó nhất trước; **forward checking** loại sớm giá trị xung đột; **quay lui** khi bí; điều kiện mềm chỉ dùng để sắp thứ tự thử.
- Mẫu tuần lặp + ngoại lệ: giai đoạn 1 tô màu cho **mẫu** (mọi tuần dùng chung màu), giai đoạn 2 chỉ **tô lại** các đỉnh (buổi một tuần cụ thể) bị xung đột với buổi đã có, theo thứ tự đổi phòng, đổi tiết, đổi ngày.
- Backend vẫn **kiểm tra lại** mọi buổi khi xác nhận nên không phụ thuộc độ tin cậy của solver; có thể nâng lên CP-SAT mà không đổi dữ liệu vào/ra.

## B. Lỗi hay gặp

- **Múi giờ:** dễ lệch 7 tiếng nếu mỗi nơi tự đổi giờ một kiểu; chỉ dùng hàm lưới giờ.
- **Quên `org_id`** ở truy vấn mới là rò rỉ dữ liệu giữa tổ chức: kiểm từng câu SQL.
- **Hai môn cùng lớp trùng ô** nếu quên điều kiện "cùng lớp" ở solver.
- **Giai đoạn sau dùng lại ô giai đoạn trước** bị chặn nhầm nếu quên điều kiện cửa sổ ngày giao nhau.
- **Tuần lẻ:** số buổi không chia hết cho buổi/tuần.
- **Dữ liệu lỗi dấu** (`?`): nhập bằng `--default-character-set=utf8mb4`, đừng dùng cmd Windows mặc định.
- **Môn `ANY` chiếm hết phòng máy** làm môn `COMPUTER` không có chỗ: kiểm S11 và S14.
- **Đường gán giáo viên thẳng vào `class_subject`** bỏ qua điều kiện đủ điều kiện: chặn ở Tầng 0.2.

## C. Ngoài phạm vi bản đầu

Ngày nghỉ lễ, nghỉ phép giáo viên theo ngày cụ thể, nhập Excel, dashboard, báo cáo, điểm danh, đổi lịch/dạy bù, trùng học sinh giữa lớp (D4 = không cần).
