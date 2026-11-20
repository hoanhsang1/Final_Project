# Phase 1 — Database Schema & Migration Draft

> Tài liệu thiết kế. **Không chạy** bất kỳ câu SQL nào từ tài liệu này trên database thật.
> Toàn bộ DDL dưới đây là **draft** để người dùng tự đưa vào migration sau khi chốt các quyết định
> `D-01`…`D-12` (`subject-business-requirements.md`). Database: MySQL 8, charset
> `utf8mb4`, collation `utf8mb4_unicode_ci`, engine InnoDB.

---

## 1. Quy ước

| Quy ước | Giá trị |
|---|---|
| Khoá chính | `char(36)` UUID (giống bảng hiện có) |
| Thời gian | `datetime(3)` |
| Cờ boolean | `tinyint(1)` |
| Phạm vi tổ chức | Mọi bảng có `org_id char(36) NOT NULL`; FK tổ hợp gồm `org_id` |
| Xoá | Môn/curriculum dùng `is_active`, không xoá cứng; join table dùng CASCADE/RESTRICT hợp lý |
| Tên index | `uq_` cho unique, `idx_` cho index thường, `fk_` cho FK (theo phong cách repo) |
| Migration | Đặt số tiếp theo sau `50_schedule_inbox_impact.sql`: đề xuất `51_people_curriculum.sql`, `52_people_teacher_subject.sql` |

---

## 2. Bảng hiện có cần thay đổi

### 2.1. `subject` (People DB)

Hiện có (`DB_11_16.sql:603` + migration 42):
`id, org_id, name, name_unaccented, is_active, created_by, created_at, code, description,
updated_by, updated_at`.

Đề xuất thêm (tuỳ D-03):

| Cột | Kiểu | Null | Ghi chú |
|---|---|---|---|
| `default_session_minutes` | smallint | YES | Độ dài buổi mặc định; có thể bỏ nếu chỉ khai ở curriculum |
| `default_theory_sessions` | smallint | YES | Số buổi LT mặc định |
| `default_practice_sessions` | smallint | YES | Số buổi TH mặc định |

Đề xuất đổi index mã môn (D-04):

- Hiện tại migration 42 tạo `ADD INDEX uq_subject_org_code (org_id, code)` — **không unique**.
- Muốn UNIQUE: kiểm tra trùng trước, xử lý, rồi `ALTER TABLE subject DROP INDEX uq_subject_org_code,
  ADD UNIQUE KEY uq_subject_org_code (org_id, code)`.
- MySQL cho phép nhiều `NULL` trong UNIQUE ⇒ bản ghi cũ chưa có mã vẫn hợp lệ.

Nếu D-04 = bắt buộc mã: thêm `NOT NULL` **chỉ sau khi** backfill đủ; không làm trong cùng bước
với thêm UNIQUE nếu dữ liệu chưa sạch.

### 2.2. `school_class` (People DB)

Thêm:

| Cột | Kiểu | Null | Ghi chú |
|---|---|---|---|
| `curriculum_id` | char(36) | YES | FK `(curriculum_id, org_id) → curriculum(id, org_id)` ON DELETE RESTRICT |

- Không xoá `subject_id`.
- Không đổi `academic_year` ở Phase 1.
- Không thêm `department_id` (ngoài phạm vi; xem Stage 0 risk).

---

## 3. Bảng mới

### 3.1. `curriculum`

Mục đích: template chương trình đào tạo cấp tổ chức.

```sql
CREATE TABLE IF NOT EXISTS curriculum (
  id              char(36)     NOT NULL,
  org_id          char(36)     NOT NULL,
  code            varchar(50)  NOT NULL,
  name            varchar(200) NOT NULL,
  name_unaccented varchar(200) NOT NULL,
  description     varchar(1000) DEFAULT NULL,
  grade_level     varchar(50)  DEFAULT NULL,
  program_code    varchar(50)  DEFAULT NULL,
  is_active       tinyint(1)   NOT NULL DEFAULT 1,
  version         bigint       NOT NULL DEFAULT 0,
  created_by      char(36)     DEFAULT NULL,
  created_at      datetime(3)  NOT NULL,
  updated_by      char(36)     DEFAULT NULL,
  updated_at      datetime(3)  DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_curriculum_id_org (id, org_id),
  UNIQUE KEY uq_curriculum_org_code (org_id, code),
  UNIQUE KEY uq_curriculum_org_name (org_id, name_unaccented),
  KEY idx_curriculum_org_active (org_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- `grade_level`, `program_code`: nullable, chỉ dùng nếu D-02 chốt gắn theo khối/ngành.
- `version`: optimistic lock khi sửa curriculum (D-12).
- Xoá: không có DELETE; dùng `is_active=0`. Nếu cần xoá cứng, chỉ khi không còn
  `class_subject`/`school_class` tham chiếu (FK RESTRICT sẽ chặn).

### 3.2. `curriculum_subject`

Mục đích: định nghĩa môn + kỳ/giai đoạn + số buổi + giờ LT/TH + tiên quyết trong một curriculum.

```sql
CREATE TABLE IF NOT EXISTS curriculum_subject (
  curriculum_id          char(36) NOT NULL,
  subject_id             char(36) NOT NULL,
  org_id                 char(36) NOT NULL,
  sequence_no            smallint NOT NULL,
  term_no                smallint DEFAULT NULL,
  required_sessions      smallint NOT NULL,
  theory_sessions        smallint NOT NULL DEFAULT 0,
  practice_sessions      smallint NOT NULL DEFAULT 0,
  session_minutes        smallint NOT NULL,
  prerequisite_subject_id char(36) DEFAULT NULL,
  is_required            tinyint(1) NOT NULL DEFAULT 1,
  note                   varchar(500) DEFAULT NULL,
  created_at             datetime(3) NOT NULL,
  updated_at             datetime(3) DEFAULT NULL,
  PRIMARY KEY (curriculum_id, subject_id),
  UNIQUE KEY uq_curriculum_subject_sequence (curriculum_id, sequence_no),
  KEY idx_curriculum_subject_subject (subject_id, org_id),
  KEY idx_curriculum_subject_prereq (prerequisite_subject_id, org_id),
  CONSTRAINT fk_curriculum_subject_curriculum
    FOREIGN KEY (curriculum_id, org_id) REFERENCES curriculum (id, org_id) ON DELETE CASCADE,
  CONSTRAINT fk_curriculum_subject_subject
    FOREIGN KEY (subject_id, org_id) REFERENCES subject (id, org_id) ON DELETE RESTRICT,
  CONSTRAINT fk_curriculum_subject_prereq
    FOREIGN KEY (prerequisite_subject_id, org_id) REFERENCES subject (id, org_id) ON DELETE RESTRICT,
  CONSTRAINT chk_curriculum_subject_sessions CHECK (
    required_sessions > 0 AND session_minutes > 0
    AND theory_sessions >= 0 AND practice_sessions >= 0),
  CONSTRAINT chk_curriculum_subject_sequence CHECK (sequence_no > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- Nếu chốt `required_sessions = theory_sessions + practice_sessions`, thêm CHECK tương ứng.
- `prerequisite_subject_id` nullable: MySQL bỏ kiểm FK khi một cột null ⇒ không cần bản ghi giả.
- Kiểm chu trình tiên quyết ở **service** (SQL không biểu diễn đệ quy dễ dàng).
- `org_id` phải khớp cả `curriculum.org_id` và `subject.org_id`; FK tổ hợp đảm bảo phần subject,
  service kiểm phần curriculum (FK `(curriculum_id, org_id)` đảm bảo luôn).
- **Đổi thứ tự môn:** vì `uq_curriculum_subject_sequence` là UNIQUE, hoán đổi `sequence_no`
  cần cập nhật 2 bước (dùng giá trị tạm, ví dụ số âm hoặc dải lớn) hoặc xoá-rồi-thêm trong
  transaction. Ghi rõ trong service để tránh lỗi duplicate khi reorder.

### 3.3. `class_subject`

Mục đích: snapshot môn thực tế của lớp, giáo viên theo môn, số buổi kế hoạch.

```sql
CREATE TABLE IF NOT EXISTS class_subject (
  class_id          char(36) NOT NULL,
  subject_id        char(36) NOT NULL,
  org_id            char(36) NOT NULL,
  curriculum_id     char(36) DEFAULT NULL,
  source            varchar(20) NOT NULL DEFAULT 'MANUAL',
  teacher_id        char(36) DEFAULT NULL,
  required_sessions smallint DEFAULT NULL,
  planned_sessions  smallint DEFAULT NULL,
  theory_sessions   smallint DEFAULT NULL,
  practice_sessions smallint DEFAULT NULL,
  session_minutes   smallint DEFAULT NULL,
  status            varchar(20) NOT NULL DEFAULT 'PLANNED',
  note              varchar(500) DEFAULT NULL,
  created_by        char(36) DEFAULT NULL,
  created_at        datetime(3) NOT NULL,
  updated_by        char(36) DEFAULT NULL,
  updated_at        datetime(3) DEFAULT NULL,
  PRIMARY KEY (class_id, subject_id),
  KEY idx_class_subject_org_subject (org_id, subject_id),
  KEY idx_class_subject_teacher (teacher_id, org_id),
  KEY idx_class_subject_curriculum (curriculum_id, org_id),
  CONSTRAINT fk_class_subject_class
    FOREIGN KEY (class_id) REFERENCES school_class (id) ON DELETE CASCADE,
  CONSTRAINT fk_class_subject_subject
    FOREIGN KEY (subject_id, org_id) REFERENCES subject (id, org_id) ON DELETE RESTRICT,
  CONSTRAINT fk_class_subject_curriculum
    FOREIGN KEY (curriculum_id, org_id) REFERENCES curriculum (id, org_id) ON DELETE RESTRICT,
  CONSTRAINT fk_class_subject_teacher
    FOREIGN KEY (teacher_id, org_id) REFERENCES staff_profile (user_id, org_id) ON DELETE RESTRICT,
  CONSTRAINT chk_class_subject_status
    CHECK (status IN ('PLANNED','ACTIVE','COMPLETED','CANCELLED')),
  CONSTRAINT chk_class_subject_source
    CHECK (source IN ('LEGACY','CURRICULUM','MANUAL')),
  CONSTRAINT chk_class_subject_sessions CHECK (
    (planned_sessions IS NULL OR planned_sessions >= 0)
    AND (required_sessions IS NULL OR required_sessions > 0)
    AND (session_minutes IS NULL OR session_minutes > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Lưu ý FK tổ hợp với cột nullable:

- `(curriculum_id, org_id)`: khi `curriculum_id` NULL, MySQL **không kiểm** FK (org_id NOT NULL
  nhưng một cột null là đủ để bỏ kiểm). Chấp nhận được vì NULL = không có curriculum.
- `(teacher_id, org_id)`: tương tự; NULL = chưa gán giáo viên.
- **Không dùng ON DELETE SET NULL** cho FK tổ hợp: MySQL sẽ cố set cả `org_id` = NULL và vi phạm
  NOT NULL. Vì vậy dùng RESTRICT và xử lý nghiệp vụ ở service (ngừng curriculum thay vì xoá).

### 3.4. `specialty_subject`

Mục đích: ánh xạ chuyên môn ↔ môn để gán hàng loạt/backfill.

```sql
CREATE TABLE IF NOT EXISTS specialty_subject (
  specialty_id char(36) NOT NULL,
  subject_id   char(36) NOT NULL,
  org_id       char(36) NOT NULL,
  created_by   char(36) DEFAULT NULL,
  created_at   datetime(3) NOT NULL,
  PRIMARY KEY (specialty_id, subject_id),
  KEY idx_specialty_subject_org_subject (org_id, subject_id),
  CONSTRAINT fk_specialty_subject_specialty
    FOREIGN KEY (specialty_id, org_id) REFERENCES specialty (id, org_id) ON DELETE CASCADE,
  CONSTRAINT fk_specialty_subject_subject
    FOREIGN KEY (subject_id, org_id) REFERENCES subject (id, org_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.5. `teacher_subject`

Mục đích: nguồn sự thật "giáo viên dạy được môn nào", thay so khớp tên.

```sql
CREATE TABLE IF NOT EXISTS teacher_subject (
  user_id     char(36) NOT NULL,
  subject_id  char(36) NOT NULL,
  org_id      char(36) NOT NULL,
  status      varchar(20) NOT NULL DEFAULT 'APPROVED',
  source      varchar(20) NOT NULL DEFAULT 'MANUAL',
  approved_by char(36) DEFAULT NULL,
  approved_at datetime(3) DEFAULT NULL,
  created_by  char(36) DEFAULT NULL,
  created_at  datetime(3) NOT NULL,
  updated_at  datetime(3) DEFAULT NULL,
  PRIMARY KEY (user_id, subject_id),
  KEY idx_teacher_subject_org_subject_status (org_id, subject_id, status),
  KEY idx_teacher_subject_org_user (org_id, user_id),
  CONSTRAINT fk_teacher_subject_teacher
    FOREIGN KEY (user_id, org_id) REFERENCES teacher_profile (user_id, org_id) ON DELETE CASCADE,
  CONSTRAINT fk_teacher_subject_subject
    FOREIGN KEY (subject_id, org_id) REFERENCES subject (id, org_id) ON DELETE RESTRICT,
  CONSTRAINT chk_teacher_subject_status CHECK (status IN ('PENDING','APPROVED','REVOKED')),
  CONSTRAINT chk_teacher_subject_source CHECK (source IN ('SPECIALTY','MANUAL'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- Nếu chưa bật duyệt (D-06a = A): service luôn ghi `APPROVED`; cột `status` vẫn giữ để bật sau.
- Không xoá dòng khi thu hồi; đặt `REVOKED`.

---

## 4. Migration draft (không chạy)

> Các file migration hiện có nằm ở thư mục gốc repo (ví dụ `42_people_subject_management.sql`).
> Đề xuất chia 2 file để dễ rollback từng phần.

### 4.1. `51_people_curriculum.sql` (draft)

```sql
-- Additive, idempotent. KHÔNG xoá cột/dữ liệu.
USE mems_people_db;

DELIMITER $

DROP PROCEDURE IF EXISTS mems_m51_add_col$
CREATE PROCEDURE mems_m51_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64),
                                  IN p_ddl VARCHAR(500))
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = p_table)
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_schema = DATABASE() AND table_name = p_table
                       AND column_name = p_col) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_col, '` ', p_ddl);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$

DROP PROCEDURE IF EXISTS mems_m51_add_fk$
CREATE PROCEDURE mems_m51_add_fk(IN p_table VARCHAR(64), IN p_fk VARCHAR(64),
                                 IN p_ddl VARCHAR(500))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE table_schema = DATABASE() AND table_name = p_table
                   AND constraint_name = p_fk AND constraint_type = 'FOREIGN KEY') THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD CONSTRAINT `', p_fk, '` ', p_ddl);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$

DELIMITER ;

-- 1) curriculum (bảng mới) — dùng CREATE TABLE IF NOT EXISTS như mục 3.1
-- 2) curriculum_subject (bảng mới) — mục 3.2
-- 3) school_class.curriculum_id
CALL mems_m51_add_col('school_class', 'curriculum_id', 'CHAR(36) DEFAULT NULL');
CALL mems_m51_add_fk('school_class', 'fk_school_class_curriculum',
  'FOREIGN KEY (curriculum_id, org_id) REFERENCES curriculum (id, org_id) ON DELETE RESTRICT');

DROP PROCEDURE IF EXISTS mems_m51_add_col;
DROP PROCEDURE IF EXISTS mems_m51_add_fk;
```

### 4.2. `52_people_teacher_subject.sql` (draft)

```sql
USE mems_people_db;
-- 1) specialty_subject (mục 3.4)
-- 2) teacher_subject (mục 3.5)
-- 3) class_subject (mục 3.3)
-- 4) (tuỳ D-04) chuẩn hoá unique code:
--    ALTER TABLE subject DROP INDEX uq_subject_org_code,
--      ADD UNIQUE KEY uq_subject_org_code (org_id, code);
--    Chỉ chạy sau khi mục 6.1 báo 0 nhóm trùng.
```

> DDL đầy đủ của từng bảng nằm ở mục 3; migration chỉ cần copy nguyên văn và bọc kiểm tra tồn tại
> nếu muốn idempotent. Không đặt `NOT NULL` cho `subject.code` trong cùng migration với UNIQUE.

---

## 5. Backfill draft

### 5.1. `specialty_subject`

```sql
INSERT INTO specialty_subject(specialty_id, subject_id, org_id, created_at)
SELECT s.id, sub.id, s.org_id, NOW(3)
FROM specialty s
JOIN subject sub
  ON sub.org_id = s.org_id
 AND sub.name_unaccented = s.name_unaccented
WHERE NOT EXISTS (
  SELECT 1 FROM specialty_subject x
  WHERE x.specialty_id = s.id AND x.subject_id = sub.id);
```

### 5.2. `teacher_subject`

```sql
INSERT INTO teacher_subject(user_id, subject_id, org_id, status, source, created_at)
SELECT ts.user_id, ss.subject_id, ts.org_id, 'APPROVED', 'SPECIALTY', NOW(3)
FROM teacher_specialty ts
JOIN specialty_subject ss
  ON ss.specialty_id = ts.specialty_id AND ss.org_id = ts.org_id
WHERE NOT EXISTS (
  SELECT 1 FROM teacher_subject x
  WHERE x.user_id = ts.user_id AND x.subject_id = ss.subject_id);
```

### 5.3. `class_subject` (legacy)

```sql
INSERT INTO class_subject(class_id, subject_id, org_id, source, teacher_id, status, created_at)
SELECT c.id, c.subject_id, c.org_id, 'LEGACY', c.teacher_id, 'PLANNED', NOW(3)
FROM school_class c
WHERE c.subject_id IS NOT NULL
  AND c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM class_subject x
    WHERE x.class_id = c.id AND x.subject_id = c.subject_id);
```

- Không backfill `required_sessions`/`session_minutes` (không có nguồn); để NULL.
- Lớp đã kết thúc vẫn backfill để giữ lịch sử; `status` có thể đặt `COMPLETED` nếu
  `c.status='DA_KET_THUC'` (tuỳ chọn, cần chốt).

---

## 6. Kiểm tra trước/sau migration

### 6.1. Trùng mã môn (trước khi thêm UNIQUE)

```sql
SELECT org_id, code, COUNT(*) AS n
FROM subject
WHERE code IS NOT NULL
GROUP BY org_id, code
HAVING COUNT(*) > 1;
```

Kỳ vọng: 0 dòng. Nếu có, người dùng quyết định đổi mã/ghép bản ghi trước khi chạy UNIQUE.

### 6.2. Môn không ánh xạ được chuyên môn

```sql
SELECT s.id, s.name
FROM subject s
WHERE s.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM specialty_subject ss WHERE ss.subject_id = s.id);
```

Báo cáo để người dùng bổ sung ánh xạ; không tự tạo.

### 6.3. Đếm sau migration

```sql
SELECT 'curriculum' AS t, COUNT(*) FROM curriculum
UNION ALL SELECT 'curriculum_subject', COUNT(*) FROM curriculum_subject
UNION ALL SELECT 'class_subject', COUNT(*) FROM class_subject
UNION ALL SELECT 'specialty_subject', COUNT(*) FROM specialty_subject
UNION ALL SELECT 'teacher_subject', COUNT(*) FROM teacher_subject;
```

Đối chiếu: `class_subject` ≥ số lớp có `subject_id`; `teacher_subject` ≥ số cặp
`teacher_specialty ⨝ specialty_subject`.

### 6.4. Kiểm tra org chéo (phải bằng 0)

```sql
SELECT COUNT(*) FROM class_subject cs
JOIN school_class c ON c.id = cs.class_id
WHERE c.org_id <> cs.org_id;

SELECT COUNT(*) FROM curriculum_subject cs
JOIN curriculum c ON c.id = cs.curriculum_id
WHERE c.org_id <> cs.org_id;
```

---

## 7. Rollback / bù trừ

| Thay đổi | Rollback an toàn |
|---|---|
| Thêm bảng mới | `DROP TABLE` chỉ khi chưa dùng; tốt nhất giữ bảng và tắt tính năng |
| `school_class.curriculum_id` | `ALTER TABLE school_class DROP FOREIGN KEY ...; DROP COLUMN` (mất liên kết, không mất dữ liệu lớp) |
| Unique code | `DROP INDEX ... , ADD INDEX` (trở về index thường) — không mất dữ liệu |
| Backfill | Không cần rollback nếu bảng mới; nếu muốn, `DELETE` theo `source='LEGACY'` (chỉ dòng do backfill tạo) |

Không có thao tác nào xoá cột `subject_id`, `teacher_specialty` hay dữ liệu lớp.

---

## 8. Hiệu năng và index

- `class_subject` tra theo lớp (`class_id` là prefix PK) và theo môn (`idx_class_subject_org_subject`).
- `teacher_subject` tra assignable theo `(org_id, subject_id, status)` — đúng truy vấn gợi ý.
- `curriculum_subject` nhỏ (vài chục dòng/curriculum); PK đủ nhanh.
- Danh sách môn hiện trả toàn bộ; nếu áp phân trang, index `(org_id, is_active, name)` hữu ích
  (có thể thêm sau khi đo).
- Không thêm index thừa trên `name_unaccented` vì đã có unique.

---

## 9. Rủi ro schema

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Thêm UNIQUE code fail do dữ liệu trùng | Cao | Chạy 6.1, xử lý trước |
| FK tổ hợp + `SET NULL` làm fail | Trung bình | Dùng RESTRICT (đã thiết kế) |
| `curriculum_subject.org_id` lệch curriculum | Thấp | FK tổ hợp + service kiểm |
| Backfill `class_subject` trùng khi chạy lại | Thấp | `NOT EXISTS` + PK |
| H2 test schema khác MySQL | Trung bình | Test schema phải khai báo cùng constraint; chạy test H2 + kiểm MySQL staging |
| Xoá cứng curriculum đang được lớp dùng | Trung bình | FK RESTRICT + chỉ dùng `is_active` |

---

## 10. Việc người dùng cần làm (không thuộc tài liệu này)

1. Chốt D-01…D-12.
2. Tạo file migration thật (đề xuất 51/52) từ draft trên.
3. Cập nhật schema test H2 tương ứng để test phản ánh đúng MySQL.
4. Chạy pre-check 6.1 trên **staging**, không phải production.
5. Chỉ chạy production theo quy trình riêng của bạn, có backup.
6. Viết code entity/repository/service/controller theo `implementation-roadmap.md`.
