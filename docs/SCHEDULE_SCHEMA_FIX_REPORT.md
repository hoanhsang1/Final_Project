# Báo cáo sửa schema lịch học (Schedule) — `session.department_id`

Ngày: 2026-11-17 · Nhánh: `fixFlowCreateEmployee` · HEAD: `fe18018`

Trạng thái: **SOURCE_FIXED** (migration + script sẵn sàng) · **LIVE_PENDING** (chưa chạy trên database thật, chưa xác minh endpoint thật trong phiên này).

## 1. Lỗi

`GET /api/departments/{departmentId}/schedules` và `GET /api/schedules/me` trả 500 với thông điệp MySQL `Unknown column 's.department_id'`.

## 2. Nguyên nhân gốc

- `ScheduleService` đã được nâng lên phạm vi phòng ban: mọi câu SELECT/INSERT/UPDATE trên `session` đều dùng `department_id` (xem `ScheduleService.java` dòng 53, 55, 90, 117–139, 163, 185, 200, 228, 236).
- Database thật `mems_schedule_db` được tạo từ schema cũ, bảng `session` **không có cột** `department_id`, cũng không có index tương ứng.
- Vì vậy không phải lỗi quyền hay gateway: câu SQL không chạy được nên mọi endpoint đọc lịch đều 500.

## 3. Thay đổi

| Tệp | Thay đổi |
| --- | --- |
| `40_schedule_department_scope_catchup.sql` | Thêm idempotent `session.department_id CHAR(36) DEFAULT NULL` và index `idx_session_department(department_id, start_time)`; bổ sung phần phân tích dữ liệu NULL (chỉ là câu truy vấn, không tự backfill). |
| `scripts/apply-migration-40.bat` | Script chạy migration 40 cho `mems_schedule_db` (hỏi user/password, `MYSQL_PWD`, dừng khi lỗi). |
| `scripts/apply-live-migrations.bat` | Danh sách 15 migration có migration 40 ở cuối (sau People/Facility). |

Nguyên tắc của migration:

- Chỉ `ADD COLUMN`/`ADD INDEX` khi chưa tồn tại (`information_schema` guard, thủ tục tạm).
- Không `DROP`, không `DELETE`, không `UPDATE` dữ liệu.
- Chạy lại nhiều lần không đổi gì thêm.

## 4. Dữ liệu cũ (department_id NULL)

Bảng `class` trong `mems_schedule_db` không có `department_id` hay `created_by`, nên **không thể suy ra phòng ban của session cũ chỉ bằng dữ liệu Schedule**. Vì vậy:

- Các dòng `department_id IS NULL` được giữ nguyên.
- Chúng không xuất hiện trong danh sách theo phòng ban và không lộ sang phòng ban khác (an toàn theo hướng đóng).
- Không backfill bằng suy đoán.

Câu truy vấn bàn giao (chạy sau migration, ghi lại kết quả thật):

```sql
SELECT COUNT(*) AS total, SUM(department_id IS NULL) AS missing_department FROM session;
SELECT s.id, s.class_id, s.teacher_id, s.start_time
  FROM session s
 WHERE s.department_id IS NULL
 ORDER BY s.start_time;
```

Hướng xử lý đề xuất (cần người có dữ liệu xác minh, không tự động):

1. Đối chiếu `class_id` với PeopleService (lớp thuộc phòng ban nào) hoặc với phòng ban của giáo viên phụ trách.
2. Lập bảng `session_id → department_id` có nguồn kiểm chứng.
3. Chạy `UPDATE` theo bảng đó, kèm `WHERE department_id IS NULL` và kiểm tra số dòng trước/sau.
4. Session không xác định được nguồn: giữ NULL và ghi vào danh sách cần xử lý thủ công.

## 5. Cách chạy (người vận hành)

```bat
scripts\apply-migration-40.bat
```

Hoặc chạy toàn bộ chuỗi 15 migration:

```bat
scripts\apply-live-migrations.bat
```

Kiểm tra sau khi chạy:

```sql
SHOW COLUMNS FROM session LIKE 'department_id';
SHOW INDEX FROM session WHERE Key_name = 'idx_session_department';
```

Kỳ vọng: cột `department_id` kiểu `char(36) NULL`, index tồn tại. Chạy lại script lần hai: không có thay đổi, không lỗi.

## 6. Xác minh endpoint (sau khi migration chạy)

Không in token ra terminal; dùng biến và chỉ in HTTP status/kết quả đã lọc.

```bash
# 1) Lấy token (không echo)
curl -s -X POST https://<gateway>/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"...","password":"..."}' > /tmp/login.json
TOKEN=$(jq -r .accessToken /tmp/login.json)

# 2) Lịch theo phòng ban của chính phòng mình
curl -s -o /tmp/dept.json -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "https://<gateway>/api/departments/<myDeptId>/schedules"
jq 'length' /tmp/dept.json

# 3) Lịch của tôi
curl -s -o /tmp/me.json -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "https://<gateway>/api/schedules/me"
jq 'length' /tmp/me.json
```

Kịch bản phải đạt:

| Kịch bản | Kỳ vọng |
| --- | --- |
| Trưởng phòng gọi lịch phòng mình | 200, chỉ session `department_id` = phòng mình |
| Trưởng phòng gọi lịch phòng khác | 403 (thiếu quyền trong phạm vi phòng đó) |
| Giáo viên `/schedules/me` | Chỉ session `teacher_id` = chính mình |
| Học sinh `/schedules/me` | Chỉ session của lớp mình (qua PeopleService) |
| Người dùng tổ chức khác | Không thấy dữ liệu (lọc `c.org_id` + `department_id`) |
| Module `SCHEDULE_MANAGEMENT` disabled/locked | Đọc vẫn 200; ghi bị chặn (`requireModuleForWrite`) |

Mã nguồn bảo đảm lọc: `ScheduleService.list` luôn `WHERE c.org_id=? AND s.department_id=?`; `mine()` chia nhánh STUDENT (lớp của chính mình) và giáo viên (`teacher_id` = JWT subject). Controller đọc dùng `requireModuleReadable`, ghi dùng `requireModuleForWrite`.

## 7. Phạm vi

Chỉ sửa schema và endpoint đọc hiện có. **Không** thêm xếp lịch mới, lịch lặp, điểm danh, yêu cầu đổi lịch hay dạy bù.

## 8. Việc cần người dùng làm

- [ ] Chạy `scripts\apply-migration-40.bat` trên database thật (phiên này không chạy theo yêu cầu F-10).
- [ ] Chạy 2 câu phân tích NULL ở mục 4, gửi lại số liệu `total`/`missing_department`.
- [ ] Chạy kịch bản xác minh ở mục 6 với JWT thật, ghi lại mã HTTP và số bản ghi.
- [ ] Nếu container Schedule đang chạy image cũ hơn source hiện tại, rebuild/restart theo runbook (chưa thực hiện trong phiên này).
