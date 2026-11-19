# Kiểm toán dữ liệu lịch học cũ — `session.department_id` (mục 11)

- Repo: `hoanhsang1/Final_Project`
- Nhánh: `fixFlowCreateEmployee`
- HEAD kiểm toán: `afbd6f5` (2026-11-19); migration 40 được thêm trong chính commit này (2026-11-17).
- Phạm vi: chỉ đọc mã nguồn + SQL. **Không** chạy câu lệnh nào trên DB thật, **không** backfill, **không** tạo migration mới.
- Kết luận ngắn: có khả năng tồn tại `session.department_id IS NULL` từ dữ liệu trước migration 40 (hoặc do build cũ), nhưng **không có quan hệ xác định** để suy ra phòng ban một cách chắc chắn từ dữ liệu hiện có. Vì vậy không tự động backfill.

## 1. Bối cảnh

Migration `40_schedule_department_scope_catchup.sql` thêm cột:

```sql
ALTER TABLE session ADD COLUMN department_id CHAR(36) DEFAULT NULL;
CREATE INDEX idx_session_department ON session (department_id, start_time);
```

Cột để `NULL` cho dữ liệu cũ; comment của migration ghi rõ: bảng `class` trong `mems_schedule_db` không có `department_id`/`created_by`, nên không suy ra phòng ban chỉ bằng dữ liệu Schedule.

## 2. Cách dữ liệu mới được ghi

`ScheduleService.create()` luôn insert `department_id` lấy từ path `/departments/{departmentId}/schedules` (`DepartmentScheduleController`). Mọi thao tác đọc/sửa/xoá đều lọc `s.department_id = ?`, kèm `c.org_id = ?` từ JWT.

Hệ quả với bản ghi cũ (`department_id IS NULL`):

| Đường đọc | Có lọc `department_id`? | Nhìn thấy bản ghi NULL? |
| --- | --- | --- |
| `GET /departments/{id}/schedules` (danh sách phòng ban) | Có | **Không** |
| `GET /departments/{id}/schedules/room-suggestions` | Có (chỉ buổi đã có phòng) | **Không** → có thể gợi ý phòng đang bị chiếm |
| `PUT/DELETE/.../{sessionId}` trong phòng ban | Có | **Không** (`SCHEDULE_NOT_FOUND`) |
| `GET /schedules/me` (giáo viên/sinh viên) | Không | **Có** — vẫn xem được lịch của mình |
| `assertNoConflicts` (chống trùng lịch) | Không (chỉ lọc `org_id`) | **Có** — vẫn chặn trùng |

Vậy dữ liệu cũ không mất và không gây trùng lịch, nhưng **biến mất khỏi màn hình lịch theo phòng ban** và có thể làm gợi ý phòng sai.

## 3. Truy vấn kiểm đếm (chỉ đọc, dành cho người có quyền chạy)

Chạy trên `mems_schedule_db`, không sửa dữ liệu:

```sql
-- Tổng quan
SELECT COUNT(*) AS total_sessions,
       SUM(department_id IS NULL) AS missing_department,
       SUM(department_id IS NULL AND deleted_at IS NULL) AS missing_active
FROM session;

-- Theo org (join bản sao class trong schedule DB)
SELECT c.org_id,
       COUNT(*) AS total_sessions,
       SUM(s.department_id IS NULL) AS missing_department
FROM session s JOIN `class` c ON c.id = s.class_id
GROUP BY c.org_id
ORDER BY missing_department DESC;

-- Chi tiết bản ghi thiếu, kèm dữ liệu có thể đối chiếu
SELECT s.id, s.class_id, c.name AS class_name, s.teacher_id, s.room_id,
       s.start_time, s.end_time, s.status
FROM session s JOIN `class` c ON c.id = s.class_id
WHERE s.department_id IS NULL
ORDER BY s.start_time DESC;
```

`SUM(...)` trả `NULL` khi bảng rỗng — đọc là 0.

## 4. Đánh giá các quan hệ suy diễn

| Nguồn | Có xác định phòng ban của buổi học? | Lý do |
| --- | --- | --- |
| `session.room_id` → Facility `classroom.department_id` | **Không chắc** | Khác service/DB; phòng có thể `NULL`; lớp có thể học nhờ phòng phòng ban khác, nên phòng ban của phòng ≠ phòng ban của buổi |
| `session.teacher_id` → People `staff_profile.department_id` | **Không chắc** | Giáo viên thuộc một phòng ban nhưng có thể dạy lớp do phòng ban khác quản lý |
| `session.class_id` → People `school_class.created_by` | **Không** | `created_by` là tài khoản giáo vụ/quản trị cấp tổ chức, không có phòng ban; `school_class` không có `department_id` |
| Bảng `class` bản sao trong Schedule DB | **Không** | Không có `department_id`/`created_by` |
| `session` | **Không** | Không lưu người tạo; `department_id` chính là cột đang thiếu |

Kết luận: không tồn tại khóa ngoại hay cột nào cho phép suy ra phòng ban đúng 100%. Mọi backfill tự động đều là suy đoán.

## 5. Đề xuất xử lý (không thực hiện trong lần này)

1. **Giữ nguyên NULL**, tiếp tục hiển thị qua `/schedules/me`; ghi nhận đây là dữ liệu lịch sử.
2. Nếu cần đưa lên màn hình phòng ban, làm **công cụ đối soát thủ công**: xuất danh sách ở mục 3, quản trị viên chọn phòng ban cho từng buổi, lưu qua API cập nhật hiện có (sau khi bổ sung endpoint gán phòng ban — hiện `PUT` yêu cầu body lịch đầy đủ và lọc theo `department_id`, nên không sửa được bản ghi NULL).
3. Chỉ khi nghiệp vụ xác nhận “phòng ban của buổi học = phòng ban của giáo viên” (hoặc của phòng học) mới viết migration backfill riêng, idempotent, có `WHERE department_id IS NULL`, kèm báo cáo số dòng trước/sau và rollback bằng cách đặt lại NULL theo danh sách id đã lưu.
4. Không chạy bất kỳ bước nào ở trên trên DB thật trong đợt kiểm toán này.

## 6. Tình trạng xác minh

- Đã đọc migration 40, `ScheduleService`, `DepartmentScheduleController`, `ScheduleController`, schema test `schedule-test-schema.sql`.
- Chưa chạy truy vấn đếm trên DB thật hoặc DB test 3307 (cần cấp quyền truy cập DB riêng). Vì vậy báo cáo **không** khẳng định số bản ghi thiếu cụ thể; mục 3 là truy vấn để người vận hành chạy và đính kèm kết quả.
