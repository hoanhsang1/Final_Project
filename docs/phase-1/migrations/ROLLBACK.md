# Rollback plan — Migration 51/52 (Phase 1 Revision 3)

> **DRAFT — chưa chạy migration nào.** Tài liệu này chỉ mô tả kế hoạch; không có lệnh nào được thực thi.
> Mọi tên bảng/FK/index dưới đây lấy **trực tiếp** từ `51_people_curriculum.sql` và
> `52_people_class_subject.sql` trong cùng thư mục — không suy đoán tên constraint.

## 0. Phân biệt hai kiểu rollback

| Kiểu | Khi nào | Phạm vi |
|---|---|---|
| **Full rollback** | 52 vừa chạy, **chưa** phát sinh `class_subject_history`, chưa cấu hình dữ liệu mới | Bỏ toàn bộ bảng/cột của 51+52 |
| **Partial rollback** | Chỉ cần bỏ cơ chế primary nhưng **giữ** `class_subject` | Bỏ `uq_class_subject_primary`, `chk_class_subject_primary`, `primary_class_id`, `is_primary` (đúng 4 bước ở §1 bước 6) |
| **Forward-fix** (khuyến nghị khi đã có dữ liệu) | Đã có history hoặc người dùng đã cấu hình môn/giáo viên | Không drop; viết migration bổ sung |

## 1. Thứ tự rollback bắt buộc (7 bước)

### Bước 1 — Kiểm tra không có thao tác nghiệp vụ đang chạy

Điều kiện tiên quyết, làm **trước** mọi lệnh DDL:

```sql
-- 1a) Không còn kết nối đang chạy lệnh (ngoài chính session kiểm tra)
SELECT id, user, host, db, command, time, state
FROM information_schema.processlist
WHERE db = 'mems_people_db' AND command <> 'Sleep';

-- 1b) Không có ghi history trong 5 phút gần nhất (ngưỡng tham khảo; bỏ qua nếu bảng chưa tồn tại)
SELECT COUNT(*) AS recent_history
FROM class_subject_history
WHERE changed_at > NOW(3) - INTERVAL 5 MINUTE;

-- 1c) Không có request đổi môn chính đang chờ (app log/metrics — kiểm ngoài SQL)
```

Yêu cầu vận hành: tạm dừng endpoint ghi của People Service (ít nhất
`PUT /classes/{id}`, `PUT /classes/{id}/subjects/primary`, `DELETE /classes/{id}`) hoặc chuyển
gateway sang maintenance. **Không** tắt DB, không kill session khi chưa xác nhận với người dùng.

### Bước 2 — Export `class_subject_history`

Bắt buộc nếu định drop bảng. Dùng `mysqldump` (không dùng `SELECT ... INTO OUTFILE` vì phụ thuộc
`secure_file_priv`):

```bash
mysqldump --single-transaction --no-create-info --complete-insert \
  mems_people_db class_subject_history > class_subject_history_data.sql
```

Nếu bảng chưa tồn tại (52 chưa chạy), ghi rõ "không có gì để export" và bỏ qua bước 2–4.

### Bước 3 — Export `class_subject` và dữ liệu liên quan

```bash
mysqldump --single-transaction --no-create-info --complete-insert \
  mems_people_db class_subject curriculum curriculum_subject \
  curriculum_subject_prerequisite specialty_subject teacher_subject \
  > phase1_related_data.sql

-- Ảnh hưởng lên school_class (cột do 51/52 thêm/sửa)
mysqldump --single-transaction --no-create-info --complete-insert \
  mems_people_db school_class > school_class_data.sql
```

`school_class` export để khôi phục `subject_id`/`teacher_id`/`version` nếu bước drop bị sai.

### Bước 4 — Xác minh dữ liệu export

```sql
SELECT 'class_subject_history' AS t, COUNT(*) FROM class_subject_history
UNION ALL SELECT 'class_subject', COUNT(*) FROM class_subject
UNION ALL SELECT 'curriculum', COUNT(*) FROM curriculum
UNION ALL SELECT 'curriculum_subject', COUNT(*) FROM curriculum_subject
UNION ALL SELECT 'curriculum_subject_prerequisite', COUNT(*) FROM curriculum_subject_prerequisite
UNION ALL SELECT 'specialty_subject', COUNT(*) FROM specialty_subject
UNION ALL SELECT 'teacher_subject', COUNT(*) FROM teacher_subject
UNION ALL SELECT 'school_class', COUNT(*) FROM school_class;
```

Đối chiếu số dòng trong file dump với kết quả trên (grep `INSERT INTO` hoặc restore thử vào schema
nháp). Chỉ chuyển sang bước 5 khi **khớp 100%** và file có kích thước > 0.

### Bước 5 — Drop FK theo đúng thứ tự phụ thuộc

Tên lấy từ hai file draft:

| # | Lệnh | Ghi chú |
|---|---|---|
| 5.1 | `ALTER TABLE class_subject_history DROP FOREIGN KEY fk_csh_class;` | Bắt buộc trước khi drop bảng history/`school_class` |
| 5.2 | `ALTER TABLE class_subject DROP FOREIGN KEY fk_class_subject_teacher, DROP FOREIGN KEY fk_class_subject_curriculum, DROP FOREIGN KEY fk_class_subject_subject, DROP FOREIGN KEY fk_class_subject_class;` | 4 FK của 52 |
| 5.3 | `ALTER TABLE teacher_subject DROP FOREIGN KEY fk_teacher_subject_teacher, DROP FOREIGN KEY fk_teacher_subject_subject;` | — |
| 5.4 | `ALTER TABLE specialty_subject DROP FOREIGN KEY fk_specialty_subject_specialty, DROP FOREIGN KEY fk_specialty_subject_subject;` | — |
| 5.5 | `ALTER TABLE curriculum_subject_prerequisite DROP FOREIGN KEY fk_csp_subject, DROP FOREIGN KEY fk_csp_prerequisite;` | Trước FK của `curriculum_subject` |
| 5.6 | `ALTER TABLE curriculum_subject DROP FOREIGN KEY fk_curriculum_subject_curriculum, DROP FOREIGN KEY fk_curriculum_subject_subject;` | — |
| 5.7 | `ALTER TABLE school_class DROP FOREIGN KEY fk_school_class_curriculum;` | `school_class` **không** bị drop |

> `DROP TABLE` tự xoá FK **của chính bảng đó**; các lệnh trên chỉ cần khi bảng đích còn tồn tại và
> bảng khác vẫn trỏ tới (ví dụ `curriculum` bị drop trong khi `school_class` còn FK). Nếu rollback
> toàn bộ và drop theo thứ tự con → cha ở bước 7, có thể bỏ qua 5.2–5.6 nhưng **phải** chạy 5.1 và 5.7
> theo đúng thứ tự nêu trên.

### Bước 6 — Partial rollback: bỏ cơ chế primary theo đúng dependency (4 bước)

Chỉ dùng cho **partial rollback** (giữ `class_subject`). DDL trong 52 tạo theo thứ tự:
`is_primary` → `primary_class_id` (sinh từ `is_primary`) → `uq_class_subject_primary` (index trên
`primary_class_id`) → `chk_class_subject_primary` (CHECK trên `is_primary`). Vì vậy phải bỏ
**ngược chiều**, đúng 4 bước:

```sql
-- 6.1 index phụ thuộc cột sinh
ALTER TABLE class_subject DROP INDEX uq_class_subject_primary;
-- 6.2 CHECK tham chiếu is_primary (MySQL 8.0.16+: DROP CHECK)
ALTER TABLE class_subject DROP CHECK chk_class_subject_primary;
-- 6.3 cột sinh phụ thuộc is_primary
ALTER TABLE class_subject DROP COLUMN primary_class_id;
-- 6.4 cuối cùng
ALTER TABLE class_subject DROP COLUMN is_primary;
```

Tên `uq_class_subject_primary` và `chk_class_subject_primary` lấy trực tiếp từ draft 52 hiện tại.
Không drop `chk_class_subject_source`/`chk_class_subject_status`/`chk_class_subject_sessions`/
`chk_class_subject_sequence` khi vẫn giữ bảng — chúng không phụ thuộc cơ chế primary.

> Draft 52 hiện **không** nâng cấp bảng cũ: nếu `class_subject` tồn tại nhưng khác schema Revision 3,
> 52 `SIGNAL` và dừng. Vì vậy partial rollback dưới đây chỉ áp dụng cho bảng do đúng draft này tạo.
> Nếu môi trường có bảng từ bản nháp cũ, xử lý tay trước (xem `wp1-readiness-report.md`).

### Bước 7 — Drop bảng/cột theo thứ tự phụ thuộc (con → cha)

```sql
DROP TABLE class_subject_history;                 -- 7.1 con của school_class
DROP TABLE class_subject;                         -- 7.2 con của school_class/subject/curriculum/staff_profile
DROP TABLE curriculum_subject_prerequisite;       -- 7.3 con của curriculum_subject
DROP TABLE curriculum_subject;                    -- 7.4 con của curriculum/subject
DROP TABLE teacher_subject;                       -- 7.5 con của teacher_profile/subject
DROP TABLE specialty_subject;                     -- 7.6 con của specialty/subject

ALTER TABLE school_class DROP COLUMN curriculum_id;          -- 7.7 sau khi fk_school_class_curriculum đã drop
ALTER TABLE school_class DROP INDEX uq_school_class_id_org;  -- 7.8 sau khi mọi FK tổ hợp dùng nó đã drop
DROP TABLE curriculum;                            -- 7.9 cha, drop cuối
```

Nếu 52 từng đổi UNIQUE `subject.code` (khối D-04 commented — chỉ xảy ra nếu người dùng tự bỏ
comment và chạy):

```sql
ALTER TABLE subject DROP INDEX uq_subject_org_code,
  ADD INDEX uq_subject_org_code (org_id, code);
```

### Bước 8 — Kiểm tra index hỗ trợ FK còn sót sau rollback

Khi MySQL tạo FK mà chưa có index tiền tố trái phù hợp, InnoDB **tự tạo** index non-unique. Các index
này **không** có trong DDL và **không** tự mất khi drop FK:

| Bảng | Index do InnoDB tự tạo | Sinh ra bởi |
|---|---|---|
| `class_subject` | `(class_id, org_id)`, `(subject_id, org_id)` | `fk_class_subject_class`, `fk_class_subject_subject` |
| `teacher_subject` | `(user_id, org_id)`, `(subject_id, org_id)` | `fk_teacher_subject_teacher`, `fk_teacher_subject_subject` |
| `class_subject_history` | `(class_id, org_id)` | `fk_csh_class` |
| `specialty_subject` | `(specialty_id, org_id)`, `(subject_id, org_id)` | 2 FK của bảng |
| `curriculum_subject` | `(curriculum_id, org_id)` — FK `fk_curriculum_subject_curriculum`; `(subject_id, org_id)` **đã có sẵn** dưới tên `idx_curriculum_subject_subject` nên InnoDB không tạo thêm | `fk_curriculum_subject_curriculum` |
| `curriculum_subject_prerequisite` | `(curriculum_id, subject_id, org_id)`, `(curriculum_id, prerequisite_subject_id, org_id)` — KHÔNG dùng được `idx_csp_subject`/`idx_csp_prereq` (chúng bắt đầu bằng `org_id`) | `fk_csp_subject`, `fk_csp_prerequisite` |
| `school_class` (cột mới của 51) | `(curriculum_id, org_id)` | `fk_school_class_curriculum` |

**F-06 — index `school_class` sau bước 7.7:** `ALTER TABLE school_class DROP COLUMN curriculum_id`
chỉ xoá cột khỏi index composite; index mang tên FK **vẫn còn** dạng `(org_id)` (một cột) và phải
drop tay nếu muốn sạch tuyệt đối:

```sql
-- nếu SHOW INDEX còn index 1 cột (org_id) mang tên fk_school_class_curriculum:
ALTER TABLE school_class DROP INDEX fk_school_class_curriculum;
```

Sau rollback, liệt kê index còn lại:

```sql
SELECT table_name, index_name, non_unique,
       GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') AS cols
FROM information_schema.statistics
WHERE table_schema = 'mems_people_db'
  AND table_name IN ('class_subject','teacher_subject','class_subject_history',
                     'specialty_subject','school_class')
GROUP BY table_name, index_name, non_unique
ORDER BY table_name, index_name;
```

Quy tắc:

- Index **tên trùng FK** (ví dụ `fk_class_subject_class`) hoặc index non-unique đúng cặp cột ở bảng
  trên được coi là index hỗ trợ FK. Nếu **không còn FK nào** dùng nó và không còn query nào cần
  tiền tố đó, có thể drop — nhưng **chỉ sau khi** đã xác nhận bằng `information_schema`
  (`referential_constraints` + `key_column_usage`) rằng không FK nào còn tham chiếu.
- **Không drop** index nếu bảng còn FK khác cần tiền tố trái (MySQL sẽ báo lỗi 1553 hoặc tự tạo lại).
- Nếu partial rollback (giữ `class_subject`), index hỗ trợ FK **phải giữ** vì 4 FK vẫn còn (trừ khi
  đã drop FK tương ứng ở bước 5).

## 2. Khi 52 ABORT giữa chừng — không có rollback tự động

MySQL DDL gây **implicit commit** và 52 **không** bọc trong một transaction. Vì vậy khi một bước sau
`SIGNAL SQLSTATE '45000'`:

- Bảng/cột/index đã tạo **vẫn tồn tại** (DDL đã commit).
- DML của 5a/5b (`INSERT ... source='LEGACY'`, `UPDATE is_primary`) **vẫn tồn tại**; MySQL không tự
  rollback chúng.
- Stored procedure có thể chưa bị drop (danh sách `DROP PROCEDURE` nằm cuối file); chạy lại 52 vẫn
  được vì mỗi procedure đều `DROP PROCEDURE IF EXISTS` ở đầu.

Quy trình khi ABORT sau 5a/5b:

1. **Không xoá dòng backfill** nếu chưa chứng minh được nguồn gốc. Dòng do 5a tạo có
   `source='LEGACY'`, `teacher_id` = `school_class.teacher_id`, `is_primary=1`, `status='PLANNED'`,
   `created_at` ≈ thời điểm chạy 52 — nhưng dữ liệu nhập tay có thể trùng hình dạng. Đối chiếu
   `created_at` với thời điểm chạy migration và log trước khi kết luận.
2. Đọc thông báo `SIGNAL` và SELECT chẩn đoán ngay trước đó để xác định bước fail.
3. Sửa **nguyên nhân gốc** (dữ liệu BLOCK_MIGRATION, schema lệch...). Không sửa file 52 đã áp dụng.
4. Chạy lại `51_52_precheck.sql` → phải `DATA_PRECHECK_READY`; `SKIP_DATA_PRECHECK_NO_TABLE` cũng là
   dừng (không chạy PART B).
5. Chạy lại `51_52_precheck_data.sql` → mọi dòng `BLOCK_MIGRATION` phải = 0.
6. Chạy lại 52. 5a/5b **idempotent**: 5a bỏ qua lớp đã có dòng khớp hoặc đã có primary; 5b chỉ set
   primary khi lớp chưa có primary; PK `(class_id, subject_id)` chặn dòng trùng.
7. Chạy `51_52_postcheck.sql`, rồi so số dòng `source='LEGACY'` với lần chạy trước — không được tăng
   ngoài dự kiến.
8. Nếu chọn rollback thay vì chạy tiếp: export theo bước 2–4 và ghi rõ dòng LEGACY nào do migration
   sinh ra.

## 3. Dữ liệu có thể mất

| Đối tượng | Mức mất | Ghi chú |
|---|---|---|
| `class_subject_history` | **Vĩnh viễn** nếu drop không export | Không tái tạo được actor/thời điểm/lý do/nguồn |
| `class_subject` | Mất snapshot môn/GV/số buổi của lớp | Có thể suy lại một phần từ `school_class.subject_id` |
| `class_subject.is_primary` | Mất dấu primary | Suy lại được nếu `school_class.subject_id` còn nhất quán |
| Dòng `source='LEGACY'` | Mất bản ghi legacy đã backfill | Không phân biệt được với dữ liệu nhập tay sau này |
| `teacher_subject` / `specialty_subject` | Mất cấu hình chuyên môn đã nhập sau migration | Backfill lại chỉ khôi phục phần suy ra từ `teacher_specialty` |
| `curriculum*` | Mất template + tiên quyết | — |
| `school_class.curriculum_id` | Mất liên kết lớp → curriculum | Không suy lại được nếu không có export |

## 4. Điều kiện an toàn để rollback

1. Không còn request đổi môn chính/áp curriculum đang chạy (bước 1).
2. Đã export và **xác minh** `class_subject_history`, `class_subject`, `school_class` và các bảng 51/52.
3. Đã xác nhận `school_class.subject_id` khớp primary trước khi drop cột/index.
4. Đã drop FK đúng thứ tự; không drop index mà FK còn dùng.
5. Có backup toàn DB tại thời điểm trước migration.
6. Không có migration 53 áp dụng sau 52 (nếu có, rollback phải tính cả 53).

## 5. Khi nào **bắt buộc** forward-fix thay vì rollback

- Đã phát sinh `class_subject_history` (dù chỉ 1 dòng) — rollback sẽ mất audit không tái tạo được.
- Người dùng đã cấu hình `class_subject`/`teacher_subject` mới sau migration.
- Chỉ sai constraint/index/backfill cục bộ → viết migration bổ sung sửa đúng phần sai.
- Không sửa file 51/52 đã áp dụng; luôn tạo file mới.

## 6. Migration 53

Revision 3 **không** tạo migration 53. Chỉ tạo 53 khi có bằng chứng (query `information_schema` trên
môi trường thật) rằng một bản 52 cũ đã được áp dụng và cần bù phần thiếu.
