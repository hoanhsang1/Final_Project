-- =============================================================================
-- DRAFT ONLY — DO NOT RUN AUTOMATICALLY.
-- MEMS People DB — Migration 53: subject category + room requirement.
-- Target: MySQL 8.0.16+ (CHECK enforced), database mems_people_db.
-- Additive and idempotent. Does NOT drop columns or data.
--
-- Adds:
--   * subject_category (org-scoped catalog, soft-disable via is_active)
--   * subject.category_id    CHAR(36) NULL   (legacy subjects keep NULL)
--   * subject.room_requirement VARCHAR(20) NOT NULL DEFAULT 'ANY'
--   * composite FK subject(category_id, org_id) -> subject_category(id, org_id)
--
-- Legacy data: both new subject columns accept old rows unchanged
-- (category_id NULL, room_requirement 'ANY'), so existing subjects keep working.
-- Run the precheck in 51_52_precheck.sql §0j (privileges) first.
-- =============================================================================
USE mems_people_db;

DELIMITER $

-- -----------------------------------------------------------------------------
-- Helper: add a column only when missing; abort when an existing column differs.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS mems_m53_add_col$
CREATE PROCEDURE mems_m53_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64),
                                  IN p_ddl VARCHAR(500), IN p_type VARCHAR(64),
                                  IN p_nullable VARCHAR(3))
BEGIN
  DECLARE v_type VARCHAR(64);
  DECLARE v_nullable VARCHAR(3);

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = DATABASE() AND table_name = p_table) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'M53 ABORT: target table for add_col does not exist';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = DATABASE() AND table_name = p_table
                   AND column_name = p_col) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_col, '` ', p_ddl);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  ELSE
    SELECT column_type, is_nullable INTO v_type, v_nullable
    FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = p_table AND column_name = p_col;
    IF NOT (v_type <=> p_type) OR NOT (v_nullable <=> p_nullable) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'M53 ABORT: existing column definition differs from expected';
    END IF;
  END IF;
END$

-- -----------------------------------------------------------------------------
-- Helper: create an index only when a same-name index is absent.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS mems_m53_add_index$
CREATE PROCEDURE mems_m53_add_index(IN p_table VARCHAR(64), IN p_index VARCHAR(64),
                                    IN p_cols VARCHAR(200))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics
                 WHERE table_schema = DATABASE() AND table_name = p_table
                   AND index_name = p_index) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD INDEX `', p_index, '` (', p_cols, ')');
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$

-- -----------------------------------------------------------------------------
-- Helper: add a CHECK constraint only when the same name is absent.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS mems_m53_add_check$
CREATE PROCEDURE mems_m53_add_check(IN p_table VARCHAR(64), IN p_name VARCHAR(64),
                                    IN p_expr VARCHAR(500))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE table_schema = DATABASE() AND table_name = p_table
                   AND constraint_name = p_name AND constraint_type = 'CHECK') THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD CONSTRAINT `', p_name,
                      '` CHECK (', p_expr, ')');
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$

-- -----------------------------------------------------------------------------
-- Helper: add the org-safe FK only when the same name is absent.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS mems_m53_add_fk$
CREATE PROCEDURE mems_m53_add_fk(IN p_table VARCHAR(64), IN p_name VARCHAR(64),
                                 IN p_ddl VARCHAR(500))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE table_schema = DATABASE() AND table_name = p_table
                   AND constraint_name = p_name AND constraint_type = 'FOREIGN KEY') THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD CONSTRAINT `', p_name, '` ', p_ddl);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$

-- -----------------------------------------------------------------------------
-- 1) subject_category
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subject_category (
  id              CHAR(36)     NOT NULL,
  org_id          CHAR(36)     NOT NULL,
  name            VARCHAR(200) NOT NULL,
  name_unaccented VARCHAR(200) NOT NULL,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  created_by      CHAR(36)     DEFAULT NULL,
  created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_by      CHAR(36)     DEFAULT NULL,
  updated_at      DATETIME(3)  DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subject_category_id_org (id, org_id),
  UNIQUE KEY uq_subject_category_org_name (org_id, name_unaccented),
  KEY idx_subject_category_org_active (org_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2) subject new columns (nullable / defaulted -> legacy rows unaffected)
-- -----------------------------------------------------------------------------
CALL mems_m53_add_col('subject', 'category_id', 'CHAR(36) NULL', 'char(36)', 'YES')$
CALL mems_m53_add_col('subject', 'room_requirement',
                      'VARCHAR(20) NOT NULL DEFAULT ''ANY''', 'varchar(20)', 'NO')$

-- -----------------------------------------------------------------------------
-- 3) subject index / check / org-safe FK
-- -----------------------------------------------------------------------------
CALL mems_m53_add_index('subject', 'idx_subject_category', '`category_id`')$
CALL mems_m53_add_check('subject', 'chk_subject_room_requirement',
                        "room_requirement IN ('ANY','COMPUTER')")$
CALL mems_m53_add_fk('subject', 'fk_subject_category',
                     'FOREIGN KEY (`category_id`, `org_id`) '
                     'REFERENCES `subject_category` (`id`, `org_id`) ON DELETE RESTRICT')$

DROP PROCEDURE IF EXISTS mems_m53_add_fk$
DROP PROCEDURE IF EXISTS mems_m53_add_check$
DROP PROCEDURE IF EXISTS mems_m53_add_index$
DROP PROCEDURE IF EXISTS mems_m53_add_col$

DELIMITER ;

-- =============================================================================
-- POST-CHECK (read-only, expect the documented results)
-- =============================================================================
-- 1) Table exists with the expected columns (id, org_id, name, name_unaccented,
--    is_active, created_by, created_at, updated_by, updated_at)
SELECT column_name, column_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'subject_category'
ORDER BY ordinal_position;

-- 2) subject gained both columns; no row violates the allowed values (expect 0 rows)
SELECT id, org_id, room_requirement
FROM subject
WHERE room_requirement NOT IN ('ANY','COMPUTER');

-- 3) No orphan category reference (expect 0)
SELECT s.id, s.category_id
FROM subject s
LEFT JOIN subject_category c ON c.id = s.category_id AND c.org_id = s.org_id
WHERE s.category_id IS NOT NULL AND c.id IS NULL;
