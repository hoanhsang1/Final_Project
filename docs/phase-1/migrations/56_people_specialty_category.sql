-- =============================================================================
-- DRAFT ONLY — DO NOT RUN AUTOMATICALLY.
-- MEMS People DB — Migration 56: specialty category link (D1 dependency).
-- Target: MySQL 8.0.16+, database mems_people_db.
-- Additive and idempotent. Does NOT drop columns or data.
--
-- Adds:
--   * specialty.category_id CHAR(36) NULL  (D1: chuyên môn cùng category -> dạy môn)
--   * index idx_specialty_category
--   * composite FK specialty(category_id, org_id) -> subject_category(id, org_id)
--
-- Legacy data: specialty.category_id NULL -> chuyên môn cũ không tự sinh quyền dạy
-- theo category (vẫn dùng đường ngoại lệ teacher_subject).
-- Requires migration 53 (subject_category) to be applied first.
-- =============================================================================
USE mems_people_db;

DELIMITER $

-- -----------------------------------------------------------------------------
-- Helper: add a column only when missing; abort when an existing column differs.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS mems_m56_add_col$
CREATE PROCEDURE mems_m56_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64),
                                  IN p_ddl VARCHAR(500), IN p_type VARCHAR(64),
                                  IN p_nullable VARCHAR(3))
BEGIN
  DECLARE v_type VARCHAR(64);
  DECLARE v_nullable VARCHAR(3);

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = DATABASE() AND table_name = p_table) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'M56 ABORT: target table for add_col does not exist';
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
        SET MESSAGE_TEXT = 'M56 ABORT: existing column definition differs from expected';
    END IF;
  END IF;
END$

-- -----------------------------------------------------------------------------
-- Helper: create an index only when a same-name index is absent.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS mems_m56_add_index$
CREATE PROCEDURE mems_m56_add_index(IN p_table VARCHAR(64), IN p_index VARCHAR(64),
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
-- Helper: add the org-safe FK only when the same name is absent.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS mems_m56_add_fk$
CREATE PROCEDURE mems_m56_add_fk(IN p_table VARCHAR(64), IN p_name VARCHAR(64),
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
-- 1) specialty.category_id (nullable -> chuyên môn cũ không hỏng)
-- -----------------------------------------------------------------------------
CALL mems_m56_add_col('specialty', 'category_id', 'CHAR(36) NULL', 'char(36)', 'YES')$

-- -----------------------------------------------------------------------------
-- 2) index + org-safe FK tới subject_category
-- -----------------------------------------------------------------------------
CALL mems_m56_add_index('specialty', 'idx_specialty_category', '`category_id`')$
CALL mems_m56_add_fk('specialty', 'fk_specialty_category',
                     'FOREIGN KEY (`category_id`, `org_id`) '
                     'REFERENCES `subject_category` (`id`, `org_id`) ON DELETE RESTRICT')$

DROP PROCEDURE IF EXISTS mems_m56_add_fk$
DROP PROCEDURE IF EXISTS mems_m56_add_index$
DROP PROCEDURE IF EXISTS mems_m56_add_col$

DELIMITER ;

-- =============================================================================
-- POST-CHECK (read-only, expect the documented results)
-- =============================================================================
-- 1) Column present
SELECT column_name, column_type, is_nullable
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'specialty' AND column_name = 'category_id';

-- 2) No orphan category reference (expect 0)
SELECT s.id, s.category_id
FROM specialty s
LEFT JOIN subject_category c ON c.id = s.category_id AND c.org_id = s.org_id
WHERE s.category_id IS NOT NULL AND c.id IS NULL;
