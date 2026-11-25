# Scope cần chốt: Xếp lịch tự động (MEMS)

> Mục đích: tổng hợp các điểm **cần chốt trước khi triển khai** chức năng xếp lịch tự động.  
> Trạng thái: **Chờ xác nhận**. Không tự suy đoán khi triển khai.
>
> Nguồn tham chiếu:
> - `D:\Đồ án tốt nghiệp\Tài liệu liên quan dự án\Sprint-van-hanh\KE_HOACH_XEP_LICH_TU_DONG.md` (Bản 3, 23/11/2026)
> - Trao đổi định hướng lịch học trước đó (5 câu trả lời của bạn)
> - Trạng thái nhánh hiện tại: `chore/sync-main-class-flow` (FE Astryx, Hướng A: giữ FE hiện tại, port chọn lọc từ `origin/main`)

## 1. Quyết định phải chốt (Blocker)

| # | Điểm cần chốt | Mô tả | Gợi ý trong tài liệu | Trạng thái | Ảnh hưởng nếu chưa chốt |
|---|---|---|---|---|---|
| D1 | Quy tắc giáo viên đủ điều kiện dạy môn | Giáo viên dạy được môn khi cùng category chuyên môn, hoặc có ngoại lệ `teacher_subject = APPROVED` cho đúng môn. | D1: “Chưa chốt, đang dùng mặc định” | **Cần chốt** | Ảnh hưởng Tầng 0.2, kiểm tra gán giáo viên, solver, API eligible-teachers, dữ liệu `specialty.category_id`, `teacher_subject`. |
| D7 | Phạm vi phòng trong lịch | Phòng dùng trong xếp lịch là cấp tổ chức hay theo phòng ban? Có dùng phòng trong lịch không? | D7: “Phòng cấp tổ chức” | **Cần chốt** | Ảnh hưởng Tầng 0.3, room suggestion, bộ lọc solver (loại phòng/sức chứa/phòng trống), DB/API phòng, toàn bộ luồng auto-schedule. |
| D8 | Số buổi mỗi tuần | Lưu `sessions_per_week` ở `class_subject` (mặc định lấy từ `curriculum_subject` hoặc 2 nếu nhập tay)? | D8: đề xuất | **Cần chốt** | Ảnh hưởng model `class_subject/curriculum_subject`, API tạo/sửa môn của lớp, tính cửa sổ giai đoạn, solver. |
| D9 | Giai đoạn/tiên quyết | Giai đoạn = `curriculum_subject.sequence_no`, sao chép sang `class_subject.stage_no` (nhập tay mặc định 1)? | D9: đề xuất | **Cần chốt** | Ảnh hưởng thứ tự xếp môn, ràng buộc tiên quyết, UI chương trình lớp, solver. |
| D10 | Quy đổi “một buổi” thành tiết | Một buổi là chuỗi tiết liền nhau có tổng thời lượng ≥ `session_minutes`; nếu bảng tiết là ca 90 phút thì 1 ca. | D10: đề xuất | **Cần chốt** | Ảnh hưởng bảng tiết, hàm lưới giờ, kiểm tra tiết liền nhau/ra chơi, solver, tạo/cập nhật lịch tay. |
| D11 | Bảng tiết mẫu | Dùng ca 90 phút (07:30, 09:15, 13:00, 14:45) hay tiết 45 phút như `Book1.xlsx`? | D11: “Cần bạn chọn” | **Cần chốt** | Ảnh hưởng `time_slot`, seed/config ban đầu, UI cấu hình, tính số tiết/buổi, kiểm thử. |

## 2. Mâu thuẫn cần làm rõ với định hướng đã nói

| # | Bạn đã nói trước đó | Nội dung trong tài liệu | Cần xác nhận |
|---|---|---|---|
| C1 | (4) “không (quản lý theo phòng ban, ghi danh học sinh trước, dùng phòng trong lịch)” | (3) có kiểm tra “phòng trống + sức chứa”; D7 “Phòng cấp tổ chức”; solver lọc phòng/loại phòng/sức chứa | **Lịch có dùng phòng không?** Nếu không dùng phòng: bỏ kiểm tra phòng trống/sức chứa/loại phòng, chỉ giữ giáo viên không trùng + quy tắc thời gian. Nếu có dùng phòng: xác nhận phòng quản lý theo phòng ban hay cấp tổ chức. |
| C2 | (4) “ghi danh học sinh trước” | D4: “Học sinh chỉ một lớp, không kiểm tra trùng học sinh”; DB `class_student` có `UNIQUE(student_id)` | Xác nhận D4 có đúng ý bạn không: **mỗi học sinh chỉ thuộc 1 lớp** nên không cần kiểm tra trùng học sinh giữa lớp? |
| C3 | (4) “quản lý theo phòng ban” | D7 phòng cấp tổ chức; route lịch theo phòng ban `/departments/{d}/schedules...` vẫn có | “Quản lý theo phòng ban” áp dụng cho phần nào: quyền xem/quản lý lịch, phạm vi phòng, hay phạm vi lớp/giáo viên? |

## 3. Câu hỏi phạm vi chức năng (cần chốt trước khi thiết kế chi tiết)

| # | Câu hỏi | Gợi ý trả lời để scope nhanh | Tác động |
|---|---|---|---|
| S1 | Đầu vào xếp tự động cho mỗi lớp là gì? | Ví dụ: số buổi/tuần + số phút/buổi + khung giờ cho phép + ngày học trong tuần; hoặc chọn theo chương trình đào tạo có sẵn. | Tầng 1, form cấu hình, dữ liệu tối thiểu để chạy solver. |
| S2 | Chu kỳ xếp lịch là gì? | Theo `class.start_date`–`end_date` là đủ, hay cần khái niệm “Tháng/Đợt/Kỳ” riêng để gom lịch? | Model chu kỳ, UI chọn chu kỳ, báo cáo/lọc lịch. |
| S3 | Sức chứa so với gì? | So với `class.max_size`/sĩ số lớp? Có cần tính số học sinh ghi danh thực tế? | Bộ lọc phòng, dữ liệu lớp, kiểm tra khi xác nhận nháp. |
| S4 | Khi chỉnh tay sau khi auto-xếp | Bắt buộc vẫn thỏa ràng buộc (phòng trống/sức chứa/giáo viên không trùng/quy tắc khung giờ), hay cho phép “lưu tạm” dù trùng để xử lý sau? | Tầng 3/4, API create/update schedule, UX cảnh báo/lỗi. |
| S5 | Phạm vi MVP xếp lịch | Chỉ tạo nháp + xem trước + xác nhận thủ công? Có bao gồm tự vá ngoại lệ theo tuần (D5), lịch nghỉ lễ, dạy bù, đổi lịch hàng loạt không? | Quy mô B0-B10, thời gian thực hiện, rủi ro. |
| S6 | Phạm vi dữ liệu nền cần làm trước | Có làm đầy đủ Subject Category, Specialty-Category, room requirement, bảng tiết, giờ rảnh giáo viên, curriculum apply... hay chỉ MVP tối thiểu? | Thứ tự triển khai, migration, API/FE cần làm. |
| S7 | Nguồn dữ liệu phòng/giáo viên/lớp | Dùng dữ liệu hiện có trong nhánh hiện tại, hay cần port thêm BE từ `origin/main`? | Kế hoạch P2/P4, độ lệch backend. |

## 4. Ràng buộc kỹ thuật/cấu trúc (đã biết, không phải chờ chốt nhưng phải tuân thủ)

| # | Ràng buộc | Ghi chú |
|---|---|---|
| T1 | FE giữ kiến trúc Astryx hiện tại | Không dùng Tailwind/shadcn, không dùng antd/@ant-design trong `frontend/src`. Màn xếp lịch phải implement theo ConsoleShell/Astryx. |
| T2 | Không merge/copy nguyên FE main | `origin/main` FE là kiến trúc khác (Tailwind/Radix/mock/routes). Chỉ port hành vi/logic cần thiết. |
| T3 | BE có delta lớn trên `origin/main` | PeopleService/ScheduleService có AutoSchedule, SchoolClass, Subject/Curriculum/ClassSubject, SessionImpact... Cần port có chọn lọc, kiểm tra migration/contract. |
| T4 | Không đổi build/lint/CI | Không tự ý thêm thư viện ngoài Playwright; không đổi quy trình build/lint/CI. |
| T5 | DB/migration an toàn | Chỉ chạy DB local trước; không xóa/reset dữ liệu; không chạy migration production khi chưa chốt. |
| T6 | Không bịa nghiệp vụ | Điểm chưa chốt phải ghi “Cần xác nhận”, không tự suy đoán khi code. |

## 5. Đề xuất thứ tự chốt

1. **Chốt C1/D7**: lịch có dùng phòng không, phòng cấp tổ chức hay theo phòng ban. (Quyết định này đổi kiến trúc solver nhiều nhất.)
2. **Chốt D11 + D10**: bảng tiết mẫu và quy đổi buổi↔tiết.
3. **Chốt S1 + D8 + D9**: đầu vào xếp tự động, số buổi/tuần, giai đoạn.
4. **Chốt D1**: quy tắc giáo viên đủ điều kiện.
5. **Chốt S4 + S5**: chỉnh tay có bắt buộc thỏa ràng buộc không; phạm vi MVP.
6. **Chốt S2 + S3 + C2/C3**: chu kỳ, sức chứa, học sinh 1 lớp, ý “quản lý theo phòng ban”.

## 6. Trạng thái kế hoạch sau khi có file này

- **P4 - Xếp lịch tự động**: thêm vào kế hoạch nhưng **BLOCKED** cho đến khi chốt mục 1-3 tối thiểu (D7/C1, D11/D10, S1/D8/D9).
- Khi chốt xong: cập nhật file này thành “Đã chốt” và chuyển P4 sang checklist thực thi B0-B10 (đã adapt theo Hướng A).