-- =============================================================================
-- DRAFT ONLY — DO NOT RUN AUTOMATICALLY.
-- MEMS People DB — Migration 51: curriculum templates (Phase 1 Revision 3).
-- Target: MySQL 8.0.16+ (CHECK enforced), database mems_people_db.
-- Run AFTER docs/phase-1/migrations/51_52_precheck.sql returned the expected results.
-- Additive and idempotent. Does NOT drop columns/data.
-- Must run BEFORE 52_people_class_subject.sql (52 needs uq_school_class_id_org).
-- =============================================================================
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

DROP PROCEDURE IF EXISTS mems_m51_add_unique$
CREATE PROCEDURE mems_m51_add_unique(IN p_table VARCHAR(64), IN p_index VARCHAR(64),
                                     IN p_cols VARCHAR(255))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics
                 WHERE table_schema = DATABASE() AND table_name = p_table
                   AND index_name = p_index) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD UNIQUE KEY `', p_index, '` (', p_cols, ')');
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$

DELIMITER ;

-- 1) curriculum (template cấp tổ chức, D-02/D-12)
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

-- 2) curriculum_subject (số buổi/thời lượng bắt buộc ở đây, D-03)
CREATE TABLE IF NOT EXISTS curriculum_subject (
  curriculum_id     char(36) NOT NULL,
  subject_id        char(36) NOT NULL,
  org_id            char(36) NOT NULL,
  sequence_no       smallint NOT NULL,
  required_sessions smallint NOT NULL,
  theory_sessions   smallint NOT NULL DEFAULT 0,
  practice_sessions smallint NOT NULL DEFAULT 0,
  session_minutes   smallint NOT NULL,
  is_required       tinyint(1) NOT NULL DEFAULT 1,
  note              varchar(500) DEFAULT NULL,
  created_at        datetime(3) NOT NULL,
  updated_at        datetime(3) DEFAULT NULL,
  PRIMARY KEY (curriculum_id, subject_id),
  UNIQUE KEY uq_curriculum_subject_sequence (curriculum_id, sequence_no),
  UNIQUE KEY uq_curriculum_subject_org (curriculum_id, subject_id, org_id),
  KEY idx_curriculum_subject_subject (subject_id, org_id),
  CONSTRAINT fk_curriculum_subject_curriculum
    FOREIGN KEY (curriculum_id, org_id) REFERENCES curriculum (id, org_id) ON DELETE CASCADE,
  CONSTRAINT fk_curriculum_subject_subject
    FOREIGN KEY (subject_id, org_id) REFERENCES subject (id, org_id) ON DELETE RESTRICT,
  CONSTRAINT chk_curriculum_subject_sessions CHECK (
    required_sessions > 0 AND session_minutes > 0
    AND theory_sessions >= 0 AND practice_sessions >= 0),
  CONSTRAINT chk_curriculum_subject_sequence CHECK (sequence_no > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) curriculum_subject_prerequisite (D-07 — 0..n tiên quyết, bảng nối)
CREATE TABLE IF NOT EXISTS curriculum_subject_prerequisite (
  curriculum_id           char(36) NOT NULL,
  subject_id              char(36) NOT NULL,
  prerequisite_subject_id char(36) NOT NULL,
  org_id                  char(36) NOT NULL,
  created_at              datetime(3) NOT NULL,
  PRIMARY KEY (curriculum_id, subject_id, prerequisite_subject_id),
  KEY idx_csp_prereq (org_id, prerequisite_subject_id),
  KEY idx_csp_subject (org_id, subject_id),
  CONSTRAINT fk_csp_subject
    FOREIGN KEY (curriculum_id, subject_id, org_id)
    REFERENCES curriculum_subject (curriculum_id, subject_id, org_id) ON DELETE CASCADE,
  CONSTRAINT fk_csp_prerequisite
    FOREIGN KEY (curriculum_id, prerequisite_subject_id, org_id)
    REFERENCES curriculum_subject (curriculum_id, subject_id, org_id) ON DELETE RESTRICT,
  CONSTRAINT chk_csp_not_self CHECK (subject_id <> prerequisite_subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4) school_class.curriculum_id + FK tổ hợp
CALL mems_m51_add_col('school_class', 'curriculum_id', 'CHAR(36) DEFAULT NULL');
CALL mems_m51_add_fk('school_class', 'fk_school_class_curriculum',
  'FOREIGN KEY (curriculum_id, org_id) REFERENCES curriculum (id, org_id) ON DELETE RESTRICT');

-- 5) UNIQUE bắt buộc để 52 tạo FK (class_id, org_id) -> school_class(id, org_id).
--    Không thể fail vì id đã là PK; vẫn kiểm tồn tại để idempotent.
CALL mems_m51_add_unique('school_class', 'uq_school_class_id_org', 'id, org_id');

DROP PROCEDURE IF EXISTS mems_m51_add_col;
DROP PROCEDURE IF EXISTS mems_m51_add_fk;
DROP PROCEDURE IF EXISTS mems_m51_add_unique;

-- Post-check: chạy docs/phase-1/migrations/51_52_postcheck.sql
