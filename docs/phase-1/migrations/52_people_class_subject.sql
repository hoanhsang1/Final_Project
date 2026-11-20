-- =============================================================================
-- DRAFT ONLY — DO NOT RUN AUTOMATICALLY.
-- MEMS People DB — Migration 52: class_subject + primary subject + history.
-- Target: MySQL 8.0.16+, database mems_people_db.
-- MUST run AFTER 51_people_curriculum.sql (needs uq_school_class_id_org).
-- Run docs/phase-1/migrations/51_52_precheck.sql first and review the manual-review report.
-- If class_subject already exists from an OLD 52 draft, this script adds the
-- missing columns/indexes but NEVER rewrites an already-applied migration file.
-- =============================================================================
USE mems_people_db;

DELIMITER $

DROP PROCEDURE IF EXISTS mems_m52_add_col$
CREATE PROCEDURE mems_m52_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64),
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

DROP PROCEDURE IF EXISTS mems_m52_add_unique$
CREATE PROCEDURE mems_m52_add_unique(IN p_table VARCHAR(64), IN p_index VARCHAR(64),
                                     IN p_cols VARCHAR(255))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics
                 WHERE table_schema = DATABASE() AND table_name = p_table
                   AND index_name = p_index) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD UNIQUE KEY `', p_index, '` (', p_cols, ')');
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$

DROP PROCEDURE IF EXISTS mems_m52_assert_no_duplicate_primary$
CREATE PROCEDURE mems_m52_assert_no_duplicate_primary()
BEGIN
  DECLARE v_dup INT DEFAULT 0;
  SELECT COUNT(*) INTO v_dup FROM (
    SELECT class_id FROM class_subject
    WHERE is_primary = 1 GROUP BY class_id HAVING COUNT(*) > 1
  ) d;
  IF v_dup > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'M52 ABORT: duplicate is_primary rows per class — see manual review report';
  END IF;
END$

DELIMITER ;

-- 1) specialty_subject (D-06)
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

-- 2) teacher_subject (nguồn sự thật chuyên môn theo Subject ID, D-06/D-06a)
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
  CONSTRAINT chk_teacher_subject_source CHECK (source IN ('SPECIALTY','MANUAL')),
  CONSTRAINT chk_teacher_subject_status
    CHECK (status IN ('PENDING','APPROVED','REVOKED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) class_subject (snapshot môn của lớp, D-01/D-15)
--    Nếu bảng đã tồn tại từ bản nháp cũ, CREATE IF NOT EXISTS không đổi gì;
--    các bước 4-7 bù phần thiếu.
CREATE TABLE IF NOT EXISTS class_subject (
  class_id          char(36) NOT NULL,
  subject_id        char(36) NOT NULL,
  org_id            char(36) NOT NULL,
  curriculum_id     char(36) DEFAULT NULL,
  source            varchar(20) NOT NULL DEFAULT 'MANUAL',
  sequence_no       smallint DEFAULT NULL,
  teacher_id        char(36) DEFAULT NULL,
  is_primary        tinyint(1) NOT NULL DEFAULT 0,
  primary_class_id  char(36) GENERATED ALWAYS AS
                      (CASE WHEN is_primary = 1 THEN class_id END) STORED,
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
    FOREIGN KEY (class_id, org_id) REFERENCES school_class (id, org_id) ON DELETE CASCADE,
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
  CONSTRAINT chk_class_subject_primary CHECK (is_primary IN (0,1)),
  CONSTRAINT chk_class_subject_sessions CHECK (
    (planned_sessions IS NULL OR planned_sessions >= 0)
    AND (required_sessions IS NULL OR required_sessions > 0)
    AND (session_minutes IS NULL OR session_minutes > 0)),
  CONSTRAINT chk_class_subject_sequence CHECK (sequence_no IS NULL OR sequence_no > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4) Bù cột nếu class_subject đã tồn tại từ bản nháp cũ
CALL mems_m52_add_col('class_subject', 'is_primary', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL mems_m52_add_col('class_subject', 'primary_class_id',
  'CHAR(36) GENERATED ALWAYS AS (CASE WHEN is_primary = 1 THEN class_id END) STORED');

-- 5) Backfill exact-match (D-11): chỉ dùng school_class.subject_id, không đoán.
-- 5a) Tạo dòng LEGACY khi lớp có subject_id nhưng chưa có dòng khớp và chưa có primary.
INSERT INTO class_subject(class_id, subject_id, org_id, source, teacher_id, is_primary, status, created_at)
SELECT c.id, c.subject_id, c.org_id, 'LEGACY', c.teacher_id, 1, 'PLANNED', NOW(3)
FROM school_class c
WHERE c.subject_id IS NOT NULL
  AND c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM class_subject x
    WHERE x.class_id = c.id AND x.subject_id = c.subject_id)
  AND NOT EXISTS (
    SELECT 1 FROM class_subject p
    WHERE p.class_id = c.id AND p.is_primary = 1);

-- 5b) Đánh primary cho dòng khớp chính xác nếu lớp chưa có primary.
--     Dùng bảng tạm để tránh MySQL error 1093 (update table read in subquery).
DROP TEMPORARY TABLE IF EXISTS tmp_m52_has_primary;
CREATE TEMPORARY TABLE tmp_m52_has_primary (class_id char(36) NOT NULL PRIMARY KEY);
INSERT INTO tmp_m52_has_primary (class_id)
SELECT class_id FROM class_subject WHERE is_primary = 1 GROUP BY class_id;

UPDATE class_subject cs
JOIN school_class c ON c.id = cs.class_id AND c.org_id = cs.org_id
LEFT JOIN tmp_m52_has_primary p ON p.class_id = cs.class_id
SET cs.is_primary = 1
WHERE c.subject_id = cs.subject_id
  AND c.subject_id IS NOT NULL
  AND p.class_id IS NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_m52_has_primary;

-- 5c) Dừng nếu còn >1 primary/lớp (không thể thêm UNIQUE an toàn).
CALL mems_m52_assert_no_duplicate_primary();

-- 6) UNIQUE: tối đa một primary/lớp (MySQL không có partial unique index).
--    Lưu ý: UNIQUE KHÔNG bảo đảm "tối thiểu một primary" — điều đó do transaction/app.
CALL mems_m52_add_unique('class_subject', 'uq_class_subject_primary', 'primary_class_id');

-- 7) class_subject_history (append-only, D-08/D-15)
CREATE TABLE IF NOT EXISTS class_subject_history (
  id               char(36) NOT NULL,
  org_id           char(36) NOT NULL,
  class_id         char(36) NOT NULL,
  old_subject_id   char(36) DEFAULT NULL,
  old_subject_code varchar(50) DEFAULT NULL,
  old_subject_name varchar(200) DEFAULT NULL,
  old_teacher_id   char(36) DEFAULT NULL,
  old_source       varchar(20) DEFAULT NULL,
  new_subject_id   char(36) NOT NULL,
  new_subject_code varchar(50) DEFAULT NULL,
  new_subject_name varchar(200) NOT NULL,
  new_source       varchar(20) NOT NULL,
  reason           varchar(500) NOT NULL,
  operation_id     varchar(64) NOT NULL,
  changed_by       char(36) NOT NULL,
  changed_at       datetime(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_csh_operation (org_id, operation_id),
  KEY idx_csh_class_time (org_id, class_id, changed_at),
  KEY idx_csh_new_subject (org_id, new_subject_id),
  CONSTRAINT fk_csh_class
    FOREIGN KEY (class_id, org_id) REFERENCES school_class (id, org_id) ON DELETE RESTRICT,
  CONSTRAINT chk_csh_subject_change CHECK (
    old_subject_id IS NULL OR old_subject_id <> new_subject_id),
  CONSTRAINT chk_csh_old_source CHECK (
    old_source IS NULL OR old_source IN ('LEGACY','CURRICULUM','MANUAL')),
  CONSTRAINT chk_csh_new_source CHECK (
    new_source IN ('LEGACY','CURRICULUM','MANUAL'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8) D-04 — UNIQUE (org_id, code) cho subject, CHỈ sau khi precheck 6.1 = 0 dòng trùng.
--    Để tránh chạy nhầm khi dữ liệu còn trùng, khối này COMMENTED.
-- ALTER TABLE subject DROP INDEX uq_subject_org_code,
--   ADD UNIQUE KEY uq_subject_org_code (org_id, code);

DROP PROCEDURE IF EXISTS mems_m52_add_col;
DROP PROCEDURE IF EXISTS mems_m52_add_unique;
DROP PROCEDURE IF EXISTS mems_m52_assert_no_duplicate_primary;

-- Post-check: chạy docs/phase-1/migrations/51_52_postcheck.sql
