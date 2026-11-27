# Scope cần chốt: Xếp lịch tự động (MEMS)

> Mục đích: tổng hợp các điểm **cần chốt trước khi triển khai** chức năng xếp lịch tự động.  
> Trạng thái: **Đã chốt (cập nhật 27/11/2026)**. Các điểm còn mở của bản 26/11 (D1, D8, D9, D10, D11, S1, S2, S3, S5, S6, S7 và hợp đồng solver) đã được người dùng uỷ quyền chọn thay theo phương án tối ưu nghiệp vụ ở §3.3. P4 chuyển từ BLOCKED sang **MVP đã triển khai 27/11** (BE review tĩnh, FE unit xanh); không còn điểm "Cần xác nhận" để chờ.
>
> Nguồn tham chiếu:
> - `D:\Đồ án tốt nghiệp\Tài liệu liên quan dự án\Sprint-van-hanh\KE_HOACH_XEP_LICH_TU_DONG.md` (Bản 3, 23/11/2026)
> - Trao đổi định hướng lịch học trước đó (5 câu trả lời của bạn)
> - Chốt một phần 25/11/2026: (1) có dùng phòng; (2) bảng tiết chưa chốt; (3) cả 2 nguồn đầu vào, auto mặc định khi dữ liệu đầy đủ
> - Chốt bổ sung 26/11/2026: xem §3.2.
> - Chốt cuối 27/11/2026: xem §3.3 — người dùng uỷ quyền chọn thay, không hỏi lại từng điểm.
> - Trạng thái nhánh hiện tại: `chore/sync-main-class-flow` (FE Astryx, Hướng A: giữ FE hiện tại, port chọn lọc; HEAD `5a4a286`, không commit)

## 1. Quyết định phải chốt (Blocker)

| # | Điểm cần chốt | Mô tả | Gợi ý trong tài liệu | Trạng thái | Ảnh hưởng nếu chưa chốt |
|---|---|---|---|---|---|
| D1 | Quy tắc giáo viên đủ điều kiện dạy môn | Giáo viên dạy được môn khi cùng category chuyên môn, hoặc có ngoại lệ `teacher_subject = APPROVED` cho đúng môn. | D1: “Chưa chốt, đang dùng mặc định” | **Đã chốt 27/11**: cùng category chuyên môn **hoặc** ngoại lệ `teacher_subject='APPROVED'`; ưu tiên `APPROVED` khi có (xem §3.3). | Ảnh hưởng Tầng 0.2, kiểm tra gán giáo viên, solver, API eligible-teachers, dữ liệu `specialty.category_id`, `teacher_subject`. |
| D7 | Phạm vi phòng trong lịch | Phòng dùng trong xếp lịch là cấp tổ chức hay theo phòng ban? Có dùng phòng trong lịch không? | D7: “Phòng cấp tổ chức” | **Đã chốt 26/11**: phòng học/thiết bị là tài nguyên **cấp tổ chức**, do **phòng ban CSVC quản lý**; phòng ban có module lịch được xếp vào **mọi phòng đang hoạt động**. (Xem §3.2 và §4.1 — BE `origin/main` hiện lọc phòng theo `departmentId`, cần đối chiếu khi port.) | Ảnh hưởng Tầng 0.3, room suggestion, bộ lọc solver (loại phòng/sức chứa/phòng trống), DB/API phòng, toàn bộ luồng auto-schedule. |
| D8 | Số buổi mỗi tuần | Lưu `sessions_per_week` ở `class_subject` (mặc định lấy từ `curriculum_subject` hoặc 2 nếu nhập tay)? | D8: đề xuất | **Đã chốt 27/11**: `sessions_per_week` trên `class_subject`, default từ `curriculum_subject`, else `2`; không tạo migration mới — expose qua internal API rồi giới hạn số buổi/tuần khi xếp. | Ảnh hưởng model `class_subject/curriculum_subject`, API tạo/sửa môn của lớp, tính cửa sổ giai đoạn, solver. |
| D9 | Giai đoạn/tiên quyết | Giai đoạn = `curriculum_subject.sequence_no`, sao chép sang `class_subject.stage_no` (nhập tay mặc định 1)? | D9: đề xuất | **Đã chốt 27/11**: `stage_no` sao từ `sequence_no`, nhập tay default `1`; dùng để sắp thứ tự ưu tiên môn. | Ảnh hưởng thứ tự xếp môn, ràng buộc tiên quyết, UI chương trình lớp, solver. |
| D10 | Quy đổi “một buổi” thành tiết | Một buổi là chuỗi tiết liền nhau có tổng thời lượng ≥ `session_minutes`; nếu bảng tiết là ca 90 phút thì 1 ca. | D10: đề xuất | **Đã chốt 27/11**: 1 buổi = chuỗi tiết 45 phút liền nhau, tổng ≥ `session_minutes`, **không ghép qua giờ nghỉ**; slot phải bội của 45 phút. | Ảnh hưởng bảng tiết, hàm lưới giờ, kiểm tra tiết liền nhau/ra chơi, solver, tạo/cập nhật lịch tay. |
| D11 | Bảng tiết mẫu | Dùng ca 90 phút (07:30, 09:15, 13:00, 14:45) hay tiết 45 phút như `Book1.xlsx`? | D11: “Cần bạn chọn” | **Đã chốt 27/11**: **tiết 45 phút** làm đơn vị; ca 90 phút là 2 tiết liên tiếp. | Ảnh hưởng `time_slot`, seed/config ban đầu, UI cấu hình, tính số tiết/buổi, kiểm thử. |

## 2. Mâu thuẫn cần làm rõ với định hướng đã nói

| # | Bạn đã nói trước đó | Nội dung trong tài liệu | Cần xác nhận |
|---|---|---|---|
| C1 | (4) “không (quản lý theo phòng ban, ghi danh học sinh trước, dùng phòng trong lịch)” | (3) có kiểm tra “phòng trống + sức chứa”; D7 “Phòng cấp tổ chức”; solver lọc phòng/loại phòng/sức chứa | **Đã chốt 26/11**: lịch **có dùng phòng** → giữ kiểm tra phòng trống/sức chứa/loại phòng; phòng là **tài nguyên cấp tổ chức do CSVC quản lý**, phòng ban có module lịch dùng mọi phòng active. |
| C2 | (4) “ghi danh học sinh trước” | D4: “Học sinh chỉ một lớp, không kiểm tra trùng học sinh”; DB `class_student` có `UNIQUE(student_id)` | **Đã chốt 26/11 (D4)**: mỗi học sinh chỉ thuộc **1 lớp**; **không kiểm tra trùng học sinh giữa các lớp**. |
| C3 | (4) “quản lý theo phòng ban” | D7 phòng cấp tổ chức; route lịch theo phòng ban `/departments/{d}/schedules...` vẫn có | **Đã chốt 26/11**: “quản lý theo phòng ban” là phạm vi quyền xem/quản lý lịch (route `/departments/{d}/...` giữ nguyên), **không phải quyền sở hữu phòng**; phòng do CSVC quản lý ở cấp tổ chức. |

## 3. Câu hỏi phạm vi chức năng (cần chốt trước khi thiết kế chi tiết)

| # | Câu hỏi | Gợi ý trả lời để scope nhanh | Tác động |
|---|---|---|---|
| S1 | **Đã chốt 25/11**: dùng **cả 2** nguồn — chọn theo chương trình đào tạo có sẵn **hoặc** nhập tay số buổi/tuần + số phút/buổi + khung giờ + ngày học. Mặc định có chức năng tự động xếp nếu người dùng đã set up đầy đủ dữ liệu đầu vào. | Ví dụ: số buổi/tuần + số phút/buổi + khung giờ cho phép + ngày học trong tuần; hoặc chọn theo chương trình đào tạo có sẵn. | Tầng 1, form cấu hình, dữ liệu tối thiểu để chạy solver. **Cần định nghĩa tiêu chí “đầy đủ dữ liệu đầu vào”** (xem S6); 26/11 vẫn nằm trong danh sách **cần chốt** — cụ thể hóa đầu vào cho từng lớp (xem §3.2). |
| S2 | Chu kỳ xếp lịch là gì? | Theo `class.start_date`–`end_date` là đủ, hay cần khái niệm “Tháng/Đợt/Kỳ” riêng để gom lịch? | **Đã chốt 27/11**: chu kỳ theo `class.start_date`–`end_date`; không thêm “Tháng/Đợt/Kỳ”. Khoảng ngày nhập được `intersect` với khoảng lớp. | Model chu kỳ, UI chọn chu kỳ, báo cáo/lọc lịch. |
| S3 | Sức chứa so với gì? | So với `class.max_size`/sĩ số lớp? Có cần tính số học sinh ghi danh thực tế? | **Đã chốt 27/11**: `max(class.max_size, sĩ số thực tế)`. Schema hiện tại chưa có `max_size` → dùng `studentCount` (sĩ số thực tế từ `class_student`); nếu sau này thêm cột thì tự động lấy `max`. | Bộ lọc phòng, dữ liệu lớp, kiểm tra khi xác nhận nháp. |
| S4 | Khi chỉnh tay sau khi auto-xếp | Bắt buộc vẫn thỏa ràng buộc (phòng trống/sức chứa/giáo viên không trùng/quy tắc khung giờ), hay cho phép “lưu tạm” dù trùng để xử lý sau? | **Đã chốt 26/11**: cho phép **chỉnh tay sau auto-xếp**, nhưng việc chỉnh tay **vẫn chịu quy tắc chặn trùng lịch** (không lưu tạm bản trùng). | Tầng 3/4, API create/update schedule, UX cảnh báo/lỗi. |
| S5 | Phạm vi MVP xếp lịch | Chỉ tạo nháp + xem trước + xác nhận thủ công? Có bao gồm tự vá ngoại lệ theo tuần (D5), lịch nghỉ lễ, dạy bù, đổi lịch hàng loạt không? | **Đã chốt 27/11**: MVP = **nháp → xem trước → xác nhận**. Nháp là bản tính toán `dryRun` do FE giữ, **chưa ghi DB**; xác nhận chạy lại cùng thuật toán với `dryRun=false` và BE kiểm tra xung đột lần cuối rồi mới INSERT. Không làm vá lịch/bù/hàng loạt. | Quy mô B0-B10, thời gian thực hiện, rủi ro. |
| S6 | Phạm vi dữ liệu nền cần làm trước | Có làm đầy đủ Subject Category, Specialty-Category, room requirement, bảng tiết, giờ rảnh giáo viên, curriculum apply... hay chỉ MVP tối thiểu? | **Đã chốt 27/11**: tối thiểu gồm môn học + category, giáo viên đủ điều kiện, phòng active/capacity/roomType, lưới tiết, `class_subject`. Category đã có ở `specialty`; `room_type` đã có trong `classroom`; **không lấy migration 53** (`subject_category` DRAFT). Thiếu nhóm nào → trả `unscheduled` kèm lý do, không tự suy. | Thứ tự triển khai, migration, API/FE cần làm. |
| S7 | Nguồn dữ liệu phòng/giáo viên/lớp | Dùng dữ liệu hiện có trong nhánh hiện tại, hay cần port thêm BE từ nhánh nào (`origin/main` + 3 nhánh `feature/auto-schedule-*`)? | **Đã chốt 27/11**: port chọn lọc `origin/main` + `origin/feature/auto-schedule-room-type` (phòng cấp tổ chức, `SchoolClock` VN); **bỏ nhánh timezone** (chỉ có doc) và **không lấy migration 53**. FE Astryx tự viết màn, chỉ mượn logic/copy từ shell; BE mở rộng trực tiếp trên skeleton hiện tại thay vì copy cả service. | Kế hoạch P2/P4, độ lệch backend. |

### 3.1 Chốt một phần ngày 25/11/2026

> Phần này là **lịch sử**; các mục “chưa chốt/Cần xác nhận” bên dưới đã được thay bằng §3.3 (27/11). Không đọc riêng để triển khai.

- **D7/C1**: lịch **có dùng phòng** → giữ kiểm tra phòng trống/sức chứa/loại phòng trong solver. **Chưa chốt** phạm vi phòng (cấp tổ chức hay theo phòng ban) — xem C3/D7.
- **S1**: nhận **cả 2** nguồn đầu vào (chương trình có sẵn + nhập tay); **mặc định bật tự động xếp** khi người dùng đã set up đầy đủ dữ liệu đầu vào. **Cần định nghĩa** tiêu chí “đầy đủ” (S6).
- **D11/D10**: bạn trả lời **chưa chốt** → giữ nguyên trạng thái **Cần chốt**; không tự chọn 45 phút hay 90 phút.
- **C3/D8/D9**: vẫn **Cần xác nhận**; không tự suy đoán.

### 3.2 Chốt bổ sung ngày 26/11/2026

- **Phòng (D7/C1/C3):** phòng học/thiết bị là **tài nguyên cấp tổ chức**, do **phòng ban CSVC quản lý**. Phòng ban có module lịch được xếp vào **mọi phòng đang hoạt động**. Route lịch theo phòng ban giữ nguyên để phân quyền xem/quản lý; phòng ban không sở hữu phòng.
- **Ràng buộc (D4/C2):** trùng lịch **chặn cứng**; có kiểm tra **sức chứa phòng**; mỗi học sinh chỉ thuộc **1 lớp**, **không kiểm tra trùng học sinh giữa các lớp**.
- **Chỉnh tay (S4):** cho phép chỉnh tay sau khi auto-xếp; việc chỉnh tay **vẫn chịu quy tắc chặn trùng lịch**.
- **Cách làm:** solver ràng buộc (**CSP/CP-SAT hoặc tô màu đồ thị**); **backend kiểm tra lại kết quả**; **lưu lịch nháp → xem trước → xác nhận**; **LLM chỉ dùng để giải thích, không tự xếp lịch**.
- **Thứ tự làm:** hoàn thiện **quản lý môn học** trước, rồi mới làm xếp lịch tự động.
  - **Nhóm A (làm trước):** lịch lặp có xem trước, kiểm tra sức chứa, liên động khi hủy/đóng lớp hoặc giáo viên nghỉ/chuyển phòng, lịch tuần/tháng có lọc.
  - **Nhóm B:** điểm danh, thông báo và việc chờ duyệt, đổi lịch/dạy bù, tự chuyển buổi học sang `completed`.
  - **Nhóm C (để sau):** gợi ý xếp lịch tự động, nhập Excel, dashboard, báo cáo.
- **Nguồn code:** lấy `main` làm chuẩn khi khảo sát; FE giữ kiến trúc Astryx hiện tại, **không copy nguyên FE main**, chỉ port có chọn lọc; BE port có chọn lọc từ `origin/main` **+ 3 nhánh `feature/auto-schedule-*` (chờ S7)**, kiểm tra migration/contract; **không đổi build/lint/CI**; chỉ chạy DB local, **không xóa/reset dữ liệu**.
- **Còn cần chốt (26/11):** D1, D8, D9, D10, D11, S1, S2, S3, S5, S6, S7 (xem §1–§3). Khi lập plan cần đối chiếu S1 (“auto mặc định khi đủ dữ liệu”) với Nhóm C (“gợi ý xếp lịch tự động để sau”) để tránh hiểu sai phạm vi.

### 3.3 Chốt cuối ngày 27/11/2026 (người dùng uỷ quyền chọn thay)

Người dùng nói “chờ gì thế, hãy lựa chọn cách tối ưa nhất cho đúng nghiệp vụ rồi làm thôi” → không hỏi lại; các lựa chọn dưới đây là quyết định có hiệu lực, ghi đây làm nguồn duy nhất khi triển khai.

| Mã | Quyết định | Cách thể hiện trong code/hợp đồng |
|---|---|---|
| D1 | Giáo viên đủ điều kiện = **cùng category chuyên môn HOẶC `teacher_subject='APPROVED'` cho đúng môn**. | PeopleService `/internal/teachers/eligible` là nguồn duy nhất (hiện ưu tiên `teacher_subject.status='APPROVED'`; category nằm ở `specialty`/`teacher_specialty`). ScheduleService không tự đoán giáo viên từ tên môn. |
| D8 | `sessions_per_week` lưu trên `class_subject`; default từ `curriculum_subject`, else `2`. | Không thêm cột/migration: PeopleService trả `sessionsPerWeek` qua internal API (từ `COALESCE(planned_sessions / số tuần, curriculum.required_sessions, 2)`); schedule service giới hạn số buổi mỗi tuần theo giá trị này. |
| D9 | `stage_no` sao từ `curriculum_subject.sequence_no`, nhập tay default `1`. | PeopleService trả `stageNo` trong `ClassSubjectResponse`; schedule service sort candidate theo `stageNo` rồi theo độ khó (số giáo viên ít nhất). |
| D10 | 1 buổi = chuỗi tiết **45 phút liền nhau**, tổng ≥ `session_minutes`, **không qua giờ nghỉ**. | BE kiểm tra slot là bội của 45 phút; nếu `session_minutes` lớn hơn 1 slot thì chỉ ghép các slot có `end == start` tiếp theo (không có khoảng trống = không qua giờ nghỉ). Không đủ → đưa vào `unscheduled` với lý do cụ thể. |
| D11 | Bảng tiết mẫu dùng **tiết 45 phút**; ca 90 phút = 2 tiết. | FE gợi ý khung 45 phút; BE không hard-code ca 90. |
| S1 | Nhận **cả 2 nguồn** (chương trình có sẵn / nhập tay); tự xếp khi đủ 6 nhóm dữ liệu. | FE giữ segmented control 2 nguồn; `auto` mặc định `true`. “Đủ dữ liệu” = có lớp active, có `class_subject` (hoặc môn chính), có giáo viên đủ điều kiện, có phòng active, có slot hợp lệ, có ngày hợp lệ. Thiếu → `unscheduled`, không tạo lịch giả. |
| S2 | Chu kỳ theo `class.start_date`–`end_date`. | Khoảng ngày từ request bị cắt giao với khoảng lớp; không thêm thực thể “Kỳ/Tháng”. |
| S3 | Sức chứa = `max(class.max_size, sĩ số thực tế)`. | Schema hiện tại không có `max_size` → dùng `studentCount`; code đọc `MAX(COALESCE(max_size,0), studentCount)` để tự đúng khi cột xuất hiện. |
| S5 | MVP **nháp → xem trước → xác nhận**; không vá lịch/bù/hàng loạt. | `POST /auto-generate?dryRun=true` (mặc định) trả bản nháp, **không ghi DB**. FE hiển thị bảng xem trước. `dryRun=false` là xác nhận: chạy lại thuật toán + kiểm tra xung đột lần cuối + INSERT `session`. |
| S6 | Dữ liệu nền tối thiểu: môn + category, giáo viên đủ điều kiện, phòng active/capacity/roomType, lưới tiết, `class_subject`. | Không lấy migration 53 DRAFT. `room_type` đã có trong `classroom`; category đã có qua `specialty`/`teacher_specialty`. |
| S7 | Port `origin/main` + `origin/feature/auto-schedule-room-type`; bỏ nhánh timezone; không dùng migration 53. | Giữ FE Astryx, viết màn mới bằng component có sẵn; BE mở rộng skeleton hiện tại. Phòng lấy **org-wide**, timezone `Asia/Ho_Chi_Minh` (mặc định), ưu tiên phòng thường trước phòng máy. |
| Solver | Thuật toán greedy có kiểm tra ràng buộc cứng, BE kiểm tra lại trước khi ghi; **LLM chỉ giải thích**, không tự xếp. | Không thêm CSP/CP-SAT/LLM vào P4. Kết quả trả `scheduled`/`unscheduled`/`summary` + lý do tiếng Việt. |

**Hợp đồng chốt:** `POST /api/departments/{departmentId}/schedules/auto-generate?dryRun={boolean}` — body `{ classIds: string[], dateFrom: 'YYYY-MM-DD', dateTo: 'YYYY-MM-DD', slots: [{ startTime: 'HH:mm', endTime: 'HH:mm' }], sessionDays?: number[], sessionsPerWeek?: number, sessionMinutes?: number }`; hai field cuối **chỉ gửi khi nguồn là “Nhập tay”** và được BE dùng làm override của môn trong request — nguồn “Chương trình có sẵn” luôn dùng giá trị lưu trên `class_subject` (D8). Response `{ scheduled: ScheduleItem[], unscheduled: [{ classId, className, subjectName, reason }], summary: { totalRequested, scheduled, unscheduled } }`. Quyền `schedule.create` + module `SCHEDULE_MANAGEMENT` write. Mã lỗi giữ nguyên chuỗi: `VALIDATION_ERROR`, `MODULE_NOT_ENABLED`, `FORBIDDEN`, `TEACHER_/ROOM_/CLASS_SCHEDULE_CONFLICT`, `ROOM_NOT_AVAILABLE`, `ROOM_TYPE_MISMATCH`.

## 4. Ràng buộc kỹ thuật/cấu trúc (đã biết, không phải chờ chốt nhưng phải tuân thủ)

| # | Ràng buộc | Ghi chú |
|---|---|---|
| T1 | FE giữ kiến trúc Astryx hiện tại | Không dùng Tailwind/shadcn, không dùng antd/@ant-design trong `frontend/src`. Màn xếp lịch phải implement theo ConsoleShell/Astryx. |
| T2 | Không merge/copy nguyên FE main | `origin/main` FE là kiến trúc khác (Tailwind/Radix/mock/routes). Chỉ port hành vi/logic cần thiết. |
| T3 | BE có delta lớn trên `origin/main` | PeopleService/ScheduleService có AutoSchedule, SchoolClass, Subject/Curriculum/ClassSubject, SessionImpact... Cần port có chọn lọc, kiểm tra migration/contract. |
| T4 | Không đổi build/lint/CI | Không tự ý thêm thư viện ngoài Playwright; không đổi quy trình build/lint/CI. |
| T5 | DB/migration an toàn | Chỉ chạy DB local trước; không xóa/reset dữ liệu; không chạy migration production khi chưa chốt. |
| T6 | Không bịa nghiệp vụ | Điểm chưa chốt phải ghi "Cần xác nhận", không tự suy đoán khi code. |

### 4.1 Khảo sát BE trên nhánh (26/11/2026 — chỉ đọc)

Không checkout, không merge, không commit, không chạy DB; dùng `git ls-remote`, `git fetch` (chỉ lấy object/ref), rồi `git show`/`git grep`/`git diff` trên các ref. HEAD vẫn `5a4a286`, working tree không đổi. Đã rà **toàn bộ nhánh local/remote**, không chỉ `origin/main`.

**Các ref có BE liên quan xếp lịch:**

- `origin/main` — đi xa hơn nhánh hiện tại **11 commit** riêng `backend/ScheduleService`. Nhánh hiện tại `chore/sync-main-class-flow` mới chỉ có `ScheduleService`/`ScheduleController`/`DepartmentScheduleController` cơ bản. `origin/main` đã có `AutoScheduleController`, `AutoScheduleService`, DTO `AutoScheduleRequest`/`AutoScheduleResult`, `SessionImpactService` + inbox/outbox, `PeopleClient`/`FacilityClient`, endpoint nội bộ `/internal/teachers/eligible` (rule `teacher_subject.status='APPROVED'`), cùng `ClassSubject`/`Curriculum`/`Subject` controller+service trong PeopleService. Thuật toán là **greedy**: sort candidate theo số giáo viên ít nhất, duyệt ngày (`sessionDays`) × khung giờ (`slots`) × giáo viên × phòng; lọc phòng `active`, không thiết bị hỏng, `capacity >= studentCount`; xung đột chặn cứng qua `ScheduleService.create` (`TEACHER_/ROOM_/CLASS_SCHEDULE_CONFLICT`); trả `scheduled` + `unscheduled` kèm lý do. Phòng vẫn lấy theo `departmentId` (`FacilityClient.rooms`), quy đổi giờ dùng UTC (`date.atTime(...).toInstant(ZoneOffset.UTC)`).
- `origin/feature/auto-schedule-room-type` (`a1aff14`, 26/11, ahead HEAD 72; **17 file backend** so với `main` gồm 3 thêm + 14 sửa, **+479 / −34 dòng**) — **khớp trực tiếp chốt D7**: `InternalRoomController.departmentId` thành optional, `FacilityService.internalRooms` lấy mọi phòng `org_id` khi không truyền `departmentId`, thêm `FacilityClient.roomsOfOrg`; `RoomInfo`/`InternalRoomResponse`/`RoomSuggestionResponse` trả `roomType` + `isComputerRoom()`. `ScheduleService.roomSuggestions` nhận thêm `classId`: lọc sức chứa, **phòng bị chiếm tính trên toàn tổ chức** (không còn theo phòng ban), xếp phòng thường trước phòng máy; `validateRoom(..., requiredRoomType)` thêm `ROOM_TYPE_MISMATCH` nhưng `create`/`update` **vẫn truyền `null`** (comment hứa nối ở P6). Thêm `SchoolClock` (`app.timezone=Asia/Ho_Chi_Minh`, mặc định VN) và `AutoScheduleService` dùng clock thay UTC; test mới `ScheduleServiceRoomTest` (ROOM-01..08) + `SchoolClockTest` (TC-TZ-001..007). **AutoSchedule vẫn greedy** và vẫn lấy phòng theo `departmentId` (`facility.rooms(orgId, departmentId)`).
- `origin/feature/auto-schedule-subject-category` (`3732d53`, 26/11, ahead HEAD 73) — bằng nhánh room-type **+ 1 commit**, phục vụ “làm môn học trước”: thêm `SubjectCategoryController/Service/Repository` + DTO, migration `docs/phase-1/migrations/53_people_subject_category.sql` (**DRAFT ONLY — chạy tay trên DB local**), `subject.category_id` + `subject.room_requirement` (`ANY`/`COMPUTER`, mặc định `ANY`), cảnh báo `confirm=true` khi môn đang được lớp/chương trình dùng, thống kê usage theo `classes`/`classSubjects`/`curricula`, error `2233`–`2237`. **Chưa nối `roomRequirement` vào `AutoScheduleService`** (`git diff` AutoScheduleService vs nhánh room-type rỗng). `confirm=true` ở đây là xác nhận sửa môn, **không phải** xác nhận lịch.
- `origin/feature/auto-schedule-timezone` (`1330b0e`, ahead HEAD 71) — **không có BE mới**: so với `origin/main` chỉ thêm `docs/New folder/KE_HOACH_XEP_LICH_TU_DONG.md` (bản 3, 528 dòng). Không có `SchoolClock`, không có `app.timezone`; commit BE cuối là `b28c665` (22/11). Phần “timezone” thực chất nằm ở nhánh **room-type**.

**Đối chiếu chốt 26/11 trên cả 4 ref:** không ref nào có CSP/CP-SAT/tô màu đồ thị, luồng **nháp → xem trước → xác nhận** lịch hay **LLM giải thích** (`draft` chỉ là string status trong `ScheduleService`). D8 dùng `plannedSessions` (`class_subject`), D10/D11 lấy `slots` từ request, D9 chưa thấy `stage_no`/tiên quyết, D1 có rule mặc định trên BE nhưng chờ chốt, S3 vẫn so `studentCount`. `room_type` đã có trong `db.sql` từ `main` (không cần migration mới); migration 53 chỉ là bản nháp.

**Kết luận (lịch sử 26/11):** BE đi xa nhưng **chưa đáp ứng trọn chốt mới**; riêng D7 đã có implementation gần đúng ở nhánh room-type (cần đối chiếu chỗ auto-schedule vẫn lấy phòng theo phòng ban). S7 vẫn chờ quyết định port chọn lọc nhánh nào, kiểm tra migration/contract; không tự checkout/merge. **Đã được thay bởi §3.3**: chọn main + room-type, bỏ timezone, cấm migration 53.

## 5. Thứ tự thực thi đã chốt (27/11)

1. **Không chốt lại** các mục đã xong: D7/C1/C3 (phòng cấp tổ chức do CSVC quản lý), D4 (mỗi học sinh 1 lớp), S4 (chỉnh tay vẫn chặn trùng), 25/11 S1 (cả 2 nguồn + auto mặc định).
2. **Chốt cuối 27/11** (§3.3): D1, D8, D9, D10, D11, S1 cụ thể hoá, S2, S3, S5, S6, S7, hợp đồng solver/dryRun. Không còn mục “Cần xác nhận”.
3. **Triển khai** theo `docs/superpowers/plans/2026-11-27-p4-xep-lich-tu-dong.md`: BE hợp đồng + dryRun, internal room/subject info, FE màn nháp→xem trước→xác nhận, unit test FE. Không commit/push/merge.
4. **Verify**: `vitest`, `tsc -b`, `eslint .`; BE **không build/smoke** vì máy không có JDK (báo cáo rõ). Không chạy DB/E2E.

   > **Cập nhật thực tế 27/11:** user đã nới constraint DB/E2E. Dùng JDK/MySQL portable để build
   > và smoke BE/FE thật; chi tiết kết quả, ảnh chụp và git state tại
   > `docs/trang-thai-hien-tai-2026-11-26.md` §3/§5. Dòng trên giữ nguyên như snapshot lúc chốt kế hoạch.

## 6. Trạng thái kế hoạch sau khi có file này

- **P4 - Xếp lịch tự động**: **ĐÃ CHỐT, MVP đã triển khai** (27/11). Các quyết định D1/D8/D9/D10/D11/S1/S2/S3/S5/S6/S7 và hợp đồng BE/solver nằm ở §3.3. Hướng làm: FE Astryx tự viết màn, BE port chọn lọc từ `origin/main` + room-type, dùng `dryRun` cho nháp/xem trước và `dryRun=false` cho xác nhận; greedy + BE kiểm tra lại; LLM chỉ giải thích (không đưa vào P4). Không migration 53, không đụng `07_people_department_access.sql`.
- **FE shell (26/11)**: vẫn chỉ là nguồn tham khảo logic/copy tại worktree `C:\Users\night\.local\share\opencode\worktree\fab303\auto-schedule-fe-shell` (không sửa, không commit). Nút submit disabled ở shell **không còn đúng** với hướng đã chốt — màn trong `D:\Final_Project\frontend` sẽ gọi API thật.
- Khi code xong: cập nhật `docs/trang-thai-hien-tai-2026-11-26.md` §2.2/§5/§6 và ledger `.superpowers/sdd/.../progress.md`; báo cáo phần BE chưa build do thiếu JDK.