-- =============================================================================
-- DRAFT ONLY — DO NOT RUN AUTOMATICALLY.
-- MEMS People DB — Migration 52: class_subject + primary subject + history.
-- Target: MySQL 8.0.16+, database mems_people_db.
-- MUST run AFTER 51_people_curriculum.sql (needs uq_school_class_id_org).
-- Run 51_52_precheck.sql, then 51_52_precheck_data.sql; every BLOCK_MIGRATION row
-- must be fixed BEFORE this script runs.
--
-- EXISTING class_subject:
--   This script creates the table in full when it does not exist. If it already
--   exists, it is accepted ONLY when it already matches the Revision-3 schema
--   (all columns, indexes, FKs, CHECKs, generated column, PK). Otherwise the
--   script ABORTS with SIGNAL — it never auto-upgrades an unknown old table and
--   never rewrites an already-applied migration file.
-- =============================================================================
USE mems_people_db;

DELIMITER $

-- ---------------------------------------------------------------------------
-- Abort if an existing class_subject is not the Revision-3 schema.
-- Skips silently when the table does not exist (it will be created below).
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS mems_m52_assert_class_subject_schema$
CREATE PROCEDURE mems_m52_assert_class_subject_schema()
BEGIN
  DECLARE v_exists INT DEFAULT 0;
  DECLARE v_cols INT DEFAULT 0;
  DECLARE v_total_cols INT DEFAULT 0;
  DECLARE v_idx INT DEFAULT 0;
  DECLARE v_fk INT DEFAULT 0;
  DECLARE v_chk INT DEFAULT 0;
  DECLARE v_pk INT DEFAULT 0;
  DECLARE v_gen INT DEFAULT 0;

  schema_check: BEGIN
    SELECT COUNT(*) INTO v_exists FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'class_subject';
    IF v_exists = 0 THEN
      LEAVE schema_check;
    END IF;

    SELECT COUNT(*) INTO v_cols FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'class_subject'
        AND column_name IN ('class_id','subject_id','org_id','curriculum_id','source',
          'sequence_no','teacher_id','is_primary','primary_class_id','required_sessions',
          'planned_sessions','theory_sessions','practice_sessions','session_minutes',
          'status','note','created_by','created_at','updated_by','updated_at');

    -- No extra columns either: an unknown old table must not be silently kept.
    SELECT COUNT(*) INTO v_total_cols FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'class_subject';

    SELECT COUNT(DISTINCT index_name) INTO v_idx FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = 'class_subject'
        AND index_name IN ('idx_class_subject_org_subject','idx_class_subject_teacher',
                           'idx_class_subject_curriculum','uq_class_subject_primary');

    SELECT COUNT(DISTINCT constraint_name) INTO v_fk FROM information_schema.table_constraints
      WHERE table_schema = DATABASE() AND table_name = 'class_subject'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name IN ('fk_class_subject_class','fk_class_subject_subject',
                                'fk_class_subject_curriculum','fk_class_subject_teacher');

    SELECT COUNT(DISTINCT constraint_name) INTO v_chk FROM information_schema.table_constraints
      WHERE table_schema = DATABASE() AND table_name = 'class_subject'
        AND constraint_type = 'CHECK'
        AND constraint_name IN ('chk_class_subject_status','chk_class_subject_source',
                                'chk_class_subject_primary','chk_class_subject_sessions',
                                'chk_class_subject_sequence');

    SELECT COUNT(*) INTO v_pk FROM (
      SELECT index_name FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = 'class_subject' AND index_name = 'PRIMARY'
      GROUP BY index_name
      HAVING GROUP_CONCAT(column_name ORDER BY seq_in_index) = 'class_id,subject_id'
    ) pk;

    SELECT COUNT(*) INTO v_gen FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'class_subject'
        AND column_name = 'primary_class_id'
        AND extra LIKE '%GENERATED%'
        AND generation_expression LIKE '%is_primary%'
        AND generation_expression LIKE '%class_id%';

    IF v_cols <> 20 OR v_total_cols <> 20 OR v_idx <> 4 OR v_fk <> 4 OR v_chk <> 5
       OR v_pk <> 1 OR v_gen <> 1 THEN
      SELECT 'class_subject_schema_mismatch' AS issue,
             v_cols AS cols_20, v_total_cols AS total_cols_20, v_idx AS idx_4, v_fk AS fk_4,
             v_chk AS chk_5, v_pk AS pk_1, v_gen AS generated_1;
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'M52 ABORT: existing class_subject is not Revision-3 schema; fix manually';
    END IF;
  END schema_check;
END$

-- ---------------------------------------------------------------------------
-- Abort if an existing teacher_subject is not the D-06a schema (no PENDING).
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS mems_m52_assert_teacher_subject_schema$
CREATE PROCEDURE mems_m52_assert_teacher_subject_schema()
BEGIN
  DECLARE v_exists INT DEFAULT 0;
  DECLARE v_cols INT DEFAULT 0;
  DECLARE v_status_chk INT DEFAULT 0;
  DECLARE v_pending INT DEFAULT 0;

  ts_check: BEGIN
    SELECT COUNT(*) INTO v_exists FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'teacher_subject';
    IF v_exists = 0 THEN
      LEAVE ts_check;
    END IF;

    SELECT COUNT(*) INTO v_cols FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'teacher_subject'
        AND column_name IN ('user_id','subject_id','org_id','status','source',
                            'approved_by','approved_at','created_by','created_at','updated_at');

    SELECT COUNT(*) INTO v_status_chk FROM information_schema.table_constraints
      WHERE table_schema = DATABASE() AND table_name = 'teacher_subject'
        AND constraint_type = 'CHECK' AND constraint_name = 'chk_teacher_subject_status';

    SELECT COUNT(*) INTO v_pending FROM information_schema.check_constraints
      WHERE constraint_schema = DATABASE() AND constraint_name = 'chk_teacher_subject_status'
        AND check_clause LIKE '%PENDING%';

    IF v_cols <> 10 OR v_status_chk <> 1 OR v_pending > 0 THEN
      SELECT 'teacher_subject_schema_mismatch' AS issue,
             v_cols AS cols_10, v_status_chk AS status_check_1, v_pending AS pending_check_0;
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'M52 ABORT: teacher_subject must be D-06a (APPROVED/REVOKED only)';
    END IF;
  END ts_check;
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
      SET MESSAGE_TEXT = 'M52 ABORT: duplicate is_primary rows per class — see precheck block list';
  END IF;
END$

-- ---------------------------------------------------------------------------
-- Pre-backfill gate: every condition that would break an FK or leave the
-- primary invariant unsatisfiable after migration is BLOCK_MIGRATION.
-- Never nulls teacher_id to dodge the FK.
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS mems_m52_assert_backfill_safe$
CREATE PROCEDURE mems_m52_assert_backfill_safe()
BEGIN
  DECLARE v_bad INT DEFAULT 0;
  SELECT
    (SELECT COUNT(*) FROM class_subject cs
      LEFT JOIN subject s ON s.id = cs.subject_id AND s.org_id = cs.org_id
      WHERE s.id IS NULL)
  + (SELECT COUNT(*) FROM class_subject cs
      JOIN school_class c ON c.id = cs.class_id
      WHERE c.org_id <> cs.org_id)
  + (SELECT COUNT(*) FROM class_subject cs
      LEFT JOIN school_class c ON c.id = cs.class_id AND c.org_id = cs.org_id
      WHERE c.id IS NULL)
  + (SELECT COUNT(*) FROM class_subject cs
      LEFT JOIN staff_profile sp ON sp.user_id = cs.teacher_id AND sp.org_id = cs.org_id
      WHERE cs.teacher_id IS NOT NULL AND sp.user_id IS NULL)
  + (SELECT COUNT(*) FROM school_class c
      LEFT JOIN subject s ON s.id = c.subject_id AND s.org_id = c.org_id
      WHERE c.subject_id IS NOT NULL AND c.deleted_at IS NULL AND s.id IS NULL)
  + (SELECT COUNT(*) FROM school_class c
      LEFT JOIN staff_profile sp ON sp.user_id = c.teacher_id AND sp.org_id = c.org_id
      WHERE c.teacher_id IS NOT NULL AND c.deleted_at IS NULL AND sp.user_id IS NULL)
  + (SELECT COUNT(*) FROM school_class c
      JOIN class_subject cs
        ON cs.class_id = c.id AND cs.org_id = c.org_id AND cs.is_primary = 1
      WHERE c.deleted_at IS NULL AND c.subject_id IS NOT NULL
        AND c.subject_id <> cs.subject_id)
  + (SELECT COUNT(*) FROM school_class c
      JOIN class_subject cs
        ON cs.class_id = c.id AND cs.org_id = c.org_id AND cs.is_primary = 1
      WHERE c.deleted_at IS NULL AND c.subject_id IS NULL)
  INTO v_bad;
  IF v_bad > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'M52 ABORT: BLOCK_MIGRATION data present; fix data before running 52';
  END IF;
END$

DELIMITER ;

-- 1) Existing tables must already match Revision 3 / D-06a, else abort.
CALL mems_m52_assert_class_subject_schema();
CALL mems_m52_assert_teacher_subject_schema();

-- 2) specialty_subject (D-06)
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

-- 3) teacher_subject (D-06/D-06a: no approval workflow, no PENDING)
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
  CONSTRAINT chk_teacher_subject_status CHECK (status IN ('APPROVED','REVOKED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4) class_subject (snapshot môn của lớp, D-01/D-15)
--    Created complete in one statement (including uq_class_subject_primary), so a
--    partially-created old table is never silently "completed" with 2 columns.
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
  UNIQUE KEY uq_class_subject_primary (primary_class_id),
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

-- 5) Backfill exact-match (D-11): chỉ dùng school_class.subject_id, không đoán.
-- 5.0) Dừng nếu dữ liệu sẽ làm FK/backfill fail hoặc bất biến primary không thể đạt.
--      Tương ứng pre-check data: danh sách BLOCK_MIGRATION phải = 0 dòng.
CALL mems_m52_assert_backfill_safe();

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
--     Phạm vi = lớp còn sống (deleted_at IS NULL), khớp pre-check data.
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
  AND c.deleted_at IS NULL
  AND p.class_id IS NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_m52_has_primary;

-- 5c) Dừng nếu còn >1 primary/lớp (UNIQUE không thể tạo an toàn).
CALL mems_m52_assert_no_duplicate_primary();

-- 6) class_subject_history (append-only, D-08/D-15)
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

-- 7) D-04 — UNIQUE (org_id, code) cho subject, CHỈ sau khi precheck = 0 dòng trùng.
--    Để tránh chạy nhầm khi dữ liệu còn trùng, khối này COMMENTED.
-- ALTER TABLE subject DROP INDEX uq_subject_org_code,
--   ADD UNIQUE KEY uq_subject_org_code (org_id, code);

DROP PROCEDURE IF EXISTS mems_m52_assert_class_subject_schema;
DROP PROCEDURE IF EXISTS mems_m52_assert_teacher_subject_schema;
DROP PROCEDURE IF EXISTS mems_m52_assert_no_duplicate_primary;
DROP PROCEDURE IF EXISTS mems_m52_assert_backfill_safe;

-- Post-check: chạy docs/phase-1/migrations/51_52_postcheck.sql
