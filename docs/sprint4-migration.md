# Sprint 4 — Hướng dẫn chạy migration DB

## 1. Thứ tự chạy (People DB)

`13_people_sprint4.sql` **phụ thuộc** vào schema của các migration trước:

```text
07_people_department_access.sql   -> department, position, position_permission,
                                     department_member, member_position, people_audit_log
11_people_student_class.sql       -> student, school_class, class_student, department_module
12_people_member_username.sql     -> department_member.username
13_people_sprint4.sql             -> Sprint 4 (staff_profile, specialty, subject, teacher_*,
                                     class_status_log, class_close_event, cột mới cho school_class,
                                     position_seed)
```

Identity DB (Phần 2):

```text
06_identity_department_access.sql        -> account.must_change_password, account.provisioned_by
10_identity_permission_module.sql        -> permission.module_code + 8 quyền STUDENT_*/CLASS_*
14_identity_sprint4_permissions.sql      -> 5 quyền CLASS_* mới + gán cho OWNER/ORG_OWNER
```

`06` là điều kiện cần để tạo tài khoản qua `POST /teachers` và `POST /members`. Nếu
IdentityService trả 500 với `Unknown column 'provisioned_by'`, DB đó chưa chạy `06`
(xảy ra trên máy local ngày 2026-11-06 và đã khắc phục bằng cách chạy lại `06`).

Kiểm tra nhanh trước khi chạy:

```sql
SHOW TABLES FROM mems_people_db LIKE 'department_member';
SHOW TABLES FROM mems_people_db LIKE 'school_class';
SHOW COLUMNS FROM mems_people_db.school_class LIKE 'status';
```

Nếu thiếu bảng/cột ở trên, chạy lần lượt `07`, `11`, `12` trước.

## 2. Chạy trên máy local

```bash
# People DB: chạy lần lượt nếu chưa có schema nền
mysql -h 127.0.0.1 -P 3306 -u <user> -p --default-character-set=utf8mb4 < 07_people_department_access.sql
mysql -h 127.0.0.1 -P 3306 -u <user> -p --default-character-set=utf8mb4 < 11_people_student_class.sql
mysql -h 127.0.0.1 -P 3306 -u <user> -p --default-character-set=utf8mb4 < 12_people_member_username.sql

# Sprint 4
mysql -h 127.0.0.1 -P 3306 -u <user> -p --default-character-set=utf8mb4 < 13_people_sprint4.sql

# Identity DB (nếu chưa chạy 06/10)
mysql -h 127.0.0.1 -P 3306 -u <user> -p --default-character-set=utf8mb4 < 06_identity_department_access.sql
mysql -h 127.0.0.1 -P 3306 -u <user> -p --default-character-set=utf8mb4 < 10_identity_permission_module.sql
mysql -h 127.0.0.1 -P 3306 -u <user> -p --default-character-set=utf8mb4 < 14_identity_sprint4_permissions.sql
```

Script có `USE ...;` nên không cần chỉ định database trên dòng lệnh.

### 2.1. Dữ liệu mẫu cho dev/test (tùy chọn)

`15_sprint4_sample.sql` tạo một tổ chức mẫu cùng tài khoản/phòng ban/lớp để chạy kịch
bản tay. **Chỉ dùng cho máy dev/test**, không chạy trên production.

```bash
mysql -h 127.0.0.1 -P 3306 -u <user> -p --default-character-set=utf8mb4 < 15_sprint4_sample.sql
```

Script idempotent (`INSERT IGNORE` / `ON DUPLICATE KEY UPDATE`): chạy lại không nhân đôi
dữ liệu. Tài khoản mẫu (mật khẩu chung `Sample@123456`):

| Tài khoản | Vai trò | Quyền chính |
|---|---|---|
| `sample_owner` | OWNER | toàn bộ quyền |
| `sample_hr` | MANAGER | `PEOPLE_VIEW`, `PEOPLE_EDIT`, `CLASS_VIEW`, `STUDENT_VIEW` |
| `sample_academic` | STAFF | `CLASS_CREATE/EDIT/VIEW`, `CLASS_ASSIGN_TEACHER`, `CLASS_CANCEL`, `CLASS_CLOSE_REQUEST` |
| `sample_head` | STAFF | `CLASS_VIEW`, `CLASS_CLOSE_APPROVE`, `CLASS_REOPEN` |
| `sample_teacher`, `sample_teacher2` | STAFF | giáo viên |

Tổ chức `11111111-1111-4111-8111-111111111111`, phòng ban
`44444444-4444-4444-8444-444444444001` ("Tổ Toán – Tin"), chức vụ giáo viên
`33333333-3333-4333-8333-333333333003`. Chi tiết kịch bản:
[`docs/sprint4-manual-scenario.http`](sprint4-manual-scenario.http).

### 2.2. Chạy service local không cần biến môi trường

Các địa chỉ giữa service đã có mặc định `localhost` trong code
(`IDENTITY_SERVICE_URL`, `PEOPLE_SERVICE_URL`, `EUREKA_URL`), nên khi chạy từng service
trên máy không cần đặt các biến này:
```bash
java -jar backend/EurekaServer/target/*.jar
java -jar backend/IdentityService/target/*.jar
java -jar backend/PeopleService/target/*.jar
java -jar backend/APIGateway/target/*.jar
```

Vẫn cần 4 biến bắt buộc: `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET_BASE64`,
`INTERNAL_API_KEY` (và `CORS_ALLOWED_ORIGINS` nếu gọi trực tiếp từ trình duyệt).
Với Docker Compose: `cp .env.example .env`, điền các biến trên rồi `docker compose up -d --build`.

## 3. Chạy trên môi trường khác (staging / host deploy)

1. **Sao lưu trước** (bắt buộc, cả 2 DB liên quan):
   ```bash
   mysqldump -h <host> -P <port> -u <user> -p --single-transaction \
     mems_people_db > mems_people_db_backup_$(date +%Y%m%d_%H%M).sql
   mysqldump -h <host> -P <port> -u <user> -p --single-transaction \
     mems_identity_db > mems_identity_db_backup_$(date +%Y%m%d_%H%M).sql
   ```
2. Chạy trên DB đích, **trước khi** deploy build mới:
   ```bash
   mysql -h <host> -P <port> -u <user> -p --default-character-set=utf8mb4 < 06_identity_department_access.sql
   mysql -h <host> -P <port> -u <user> -p --default-character-set=utf8mb4 < 10_identity_permission_module.sql
   mysql -h <host> -P <port> -u <user> -p --default-character-set=utf8mb4 < 14_identity_sprint4_permissions.sql
   mysql -h <host> -P <port> -u <user> -p --default-character-set=utf8mb4 < 13_people_sprint4.sql
   ```
   (`06`/`10` chỉ cần nếu DB chưa từng chạy; cả hai đều idempotent.)
3. **Không chạy** `15_sprint4_sample.sql` trên production.
4. Script an toàn khi chạy lại: chỉ `CREATE TABLE IF NOT EXISTS`, `ALTER ... ADD` có kiểm tra tồn tại, `UPDATE` chuẩn hoá idempotent. Không có `DROP TABLE`/`DROP DATABASE` và không xóa dữ liệu nghiệp vụ.
5. Không bật `spring.jpa.hibernate.ddl-auto=create`/`create-drop`. Cấu hình hiện tại là `update`; Sprint 4 không thay đổi giá trị này.

## 4. Việc script làm

| Nhóm | Thay đổi |
|---|---|
| Hồ sơ nhân sự | Tạo `staff_profile` (1:1 `department_member`) chứa `staff_code`, `full_name`, `full_name_unaccented`, `phone`, `email` (bản sao hiển thị), `version`; backfill từ `department_member` |
| Danh mục | Tạo `specialty` và `subject` theo tổ chức, UNIQUE theo tên không dấu |
| Giáo viên | Tạo `teacher_profile` (loại hợp đồng, trạng thái dạy, version) và `teacher_specialty`; backfill cho người đang giữ chức vụ `TEACHER` |
| Chức vụ | Thêm `position.profile_type` (`GENERAL`/`TEACHER`); đánh dấu chức vụ "Giáo viên" hiện có |
| Lớp | Thêm `teacher_id`, `start_date`, `end_date`, `subject_id`, `version`, `close_state`; index và FK |
| Trạng thái lớp | Map `active → CHUA_BAT_DAU`, `inactive → DA_HUY`, `archived → DA_KET_THUC`, giá trị lạ/NULL → `CHUA_BAT_DAU`; đặt default mới |
| Nhật ký | Tạo `class_status_log` và `class_close_event` |
| Chức vụ mẫu | Tạo `position_seed` (đánh dấu tổ chức đã seed một lần, tránh tạo lại chức vụ owner đã xoá/sửa) |

## 5. Kiểm tra sau khi chạy

```sql
USE mems_people_db;

DESCRIBE school_class;                 -- phải có teacher_id, start_date, end_date,
                                       -- subject_id, version, close_state
SHOW TABLES LIKE 'staff_profile';
SHOW TABLES LIKE 'teacher_profile';

SELECT status, COUNT(*) FROM school_class GROUP BY status;
-- chỉ được có 4 giá trị: CHUA_BAT_DAU, DANG_DIEN_RA, DA_KET_THUC, DA_HUY

SELECT COUNT(*) FROM department_member;  -- so với trước khi chạy: phải bằng nhau
SELECT COUNT(*) FROM staff_profile;
```

## 6. Kết quả kiểm chứng ngày 2026-11-06

### 6.1. DB thật `mems_people_db` (đã chạy)

Trước khi chạy, DB chỉ có 3 bảng legacy (`staff`, `student`, `teacher`), **cả 3 đều rỗng**, và thiếu schema của `07`/`11`/`12`.

Đã thực hiện:

1. Backup: `mysqldump --single-transaction --routines --triggers mems_people_db` → file trong thư mục tạm của máy (không commit vào repo).
2. Đổi tên bảng `student` legacy (rỗng) thành **`student_legacy_20261106`** để giữ nguyên cấu trúc cũ, không xoá dữ liệu.
3. Chạy lần lượt `07` → `11` → `12` → `13`.
4. Chạy lại `13` lần 2: **không lỗi**.
5. Kết quả kiểm tra:
   - `department_member=0`, `school_class=0`, `staff_profile=0`, `teacher_profile=0`, `student=0`.
   - `school_class` có đủ 6 cột mới (`teacher_id`, `start_date`, `end_date`, `subject_id`, `version`, `close_state`).
   - `position.profile_type` tồn tại.
   - Đủ 7 bảng mới: `staff_profile`, `specialty`, `subject`, `teacher_profile`, `teacher_specialty`, `class_status_log`, `class_close_event`.
   - Bảng `student` mới có `student_code`, `date_of_birth`, `created_by`.
   - Không còn bảng `student` legacy nào ngoài `student_legacy_20261106`.

Lưu ý: các bảng legacy `staff`, `teacher`, `student_legacy_20261106` vẫn còn nhưng **không được code sử dụng**; giữ lại để tham chiếu/khôi phục.

### 6.2. Kiểm chứng logic backfill (DB tạm, đã xoá)

Để kiểm tra phần chuẩn hoá dữ liệu và backfill (DB thật đang rỗng), đã chạy trên DB tạm `mems_people_sprint4_verify` cùng server: nạp `07`, `11`, `12`, thêm 2 nhân sự + 2 chức vụ + 5 lớp trạng thái hỗn hợp, chạy `13` **2 lần liên tiếp**:

- Lần 1 và lần 2 đều không lỗi.
- Số bản ghi trước/sau không đổi: `department_member=2`, `school_class=5`.
- Trạng thái sau migrate: `C01 CHUA_BAT_DAU`, `C02 DA_HUY`, `C03 DA_KET_THUC`, `C04 CHUA_BAT_DAU`, `C05 CHUA_BAT_DAU`.
- `staff_profile=2` (một người có `username` → dùng làm mã tạm; một người không có → `STAFF-<8 ký tự id>`).
- `teacher_profile=1` cho người giữ chức vụ "Giáo viên"; chức vụ "Giáo vụ" vẫn `GENERAL`.
- Đủ 6 cột mới + 2 FK + 3 CHECK trên `school_class`.

DB tạm đã được xoá sau kiểm chứng.

### 6.3. DB thật `mems_identity_db` + chức vụ mẫu (Phần 2, ngày 2026-11-06)

Trước khi chạy, `mems_identity_db.permission` **chưa có** cột `module_code` (migration `10` chưa từng chạy) và chưa có 8 quyền `STUDENT_*`/`CLASS_*`.

Đã thực hiện:

1. Backup `mysqldump --databases mems_identity_db --routines --triggers` → file trong thư mục tạm (không commit).
2. Chạy `10_identity_permission_module.sql` → `14_identity_sprint4_permissions.sql`.
3. Chạy lại `14` lần 2 và `13_people_sprint4.sql` lần 2: **không lỗi, không nhân đôi**.
4. Kết quả:
   - `permission` có 13 quyền `module_code='STUDENT_MANAGEMENT'` (8 cũ + 5 mới).
   - Vai trò `OWNER` có đúng 18 quyền trong catalog; `ORG_OWNER` cũng được gán.
   - `mems_people_db.position_seed` đã tồn tại.
   - `mems_people_db` hiện chưa có `department`/`position`, nên bước seed chức vụ mẫu sẽ chạy khi owner mở danh sách chức vụ, khi tạo phòng ban đầu tiên, hoặc ở lần khởi động kế tiếp (ApplicationRunner).

## 7. Ghi chú

- `13_people_sprint4.sql` không đụng `mems_identity_db`; permission Sprint 4 nằm ở `10` + `14`.
- Dữ liệu mẫu cho dev/test nằm ở `15_sprint4_sample.sql` (mục 2.1); **không** chạy trên production.
- Nếu DB thật đã có dữ liệu `school_class` với trạng thái mới, câu `UPDATE` giữ nguyên giá trị hợp lệ.

## 8. Kết quả kiểm chứng Phần 7 (2026-11-06)

### 8.1. Test tự động

| Module | Số test | Kết quả |
|---|---|---|
| PeopleService | 80 | pass (0 failure) |
| IdentityService | 2 | pass |
| APIGateway / Eureka / Schedule / Facility | 0 | không có test |

Chạy lại:

```bash
cd backend/PeopleService && ./mvnw test
cd backend/IdentityService && ./mvnw test
```

CI (`.github/workflows/ci.yml`) chạy `package` **có test** cho cả 6 module backend.

### 8.2. Kịch bản tay qua gateway

Đã chạy thành công toàn bộ thứ tự trong [`docs/sprint4-manual-scenario.http`](sprint4-manual-scenario.http)
trên môi trường Docker Compose + MySQL local:

1. `sample_hr` đăng nhập → tạo chuyên môn → tạo giáo viên (201, `fullName` được trim,
   email lowercase, có chuyên môn).
2. `sample_academic` đăng nhập → tạo lớp A → gán giáo viên (200) → tạo lớp B → hủy lớp B
   (`DA_HUY`) → gửi yêu cầu đóng lớp A (`PENDING`).
3. Kiểm tra quyền: Giáo vụ tự duyệt → **403**; Nhân sự hủy lớp → **403**.
4. `sample_head` đăng nhập → duyệt đóng lớp A (`CLOSED`) → mở lại (`NONE`).
5. `close-events` trả đúng `REQUESTED → APPROVED → REOPENED`; `status-logs` trả 200.

Lưu ý khi chạy lớp demo: dùng `startDate` ở tương lai. Nếu ngày bắt đầu đã qua, lần gọi
gán giáo viên sẽ tự refresh trạng thái lớp (`CHUA_BAT_DAU → DANG_DIEN_RA`) và tăng
`version`, khiến version gửi kèm bị cũ → **409 `DATA_CHANGED`**. Đây là optimistic
locking đúng thiết kế; lấy lại `version` mới nhất rồi gọi lại.

### 8.3. Lỗi môi trường đã gặp và cách khắc phục

- `POST /teachers` → **503 `IDENTITY_UNAVAILABLE`** do `mems_identity_db.account` thiếu cột
  `provisioned_by` (chưa chạy `06`). Khắc phục: chạy `06_identity_department_access.sql`,
  không cần restart service.
- Container Identity cũ có `INTERNAL_API_KEY` rỗng → gọi nội bộ 401. Khắc phục:
  `docker compose up -d --force-recreate identity-org-service`.

