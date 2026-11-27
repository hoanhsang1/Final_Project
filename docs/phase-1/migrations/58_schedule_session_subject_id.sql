-- =============================================================================
-- DRAFT ONLY — DO NOT RUN AUTOMATICALLY.
-- MEMS Schedule DB — Migration 58: session.subject_id.
-- Target: MySQL 8.0.16+, database mems_schedule_db.
-- Additive and idempotent. Does NOT drop columns or data.
--
-- Adds:
--   * session.subject_id CHAR(36) NULL   (buổi học thuộc môn nào của lớp)
--   * index idx_session_class_subject (class_id, subject_id)
--
-- Legacy data: subject_id NULL -> vẫn đếm buổi theo subject_name như trước.
-- Không khai báo FK vì subject thuộc People DB (khác service).
-- =============================================================================
USE mems_schedule_db;

DELIMITER $

-- -----------------------------------------------------------------------------
-- Helper: add a column only when missing; abort when an existing column differs.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS mems_m58_add_col$
CREATE PROCEDURE mems_m58_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64),
                                  IN p_ddl VARCHAR(500), IN p_type VARCHAR(64),
                                  IN p_nullable VARCHAR(3))
BEGIN
  DECLARE v_type VARCHAR(64);
  DECLARE v_nullable VARCHAR(3);

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = DATABASE() AND table_name = p_table) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'M58 ABORT: target table for add_col does not exist';
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
        SET MESSAGE_TEXT = 'M58 ABORT: existing column definition differs from expected';
    END IF;
  END IF;
END$

-- -----------------------------------------------------------------------------
-- Helper: create an index only when a same-name index is absent.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS mems_m58_add_index$
CREATE PROCEDURE mems_m58_add_index(IN p_table VARCHAR(64), IN p_index VARCHAR(64),
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
-- 1) session.subject_id (nullable -> buổi cũ giữ NULL)
-- -----------------------------------------------------------------------------
CALL mems_m58_add_col('session', 'subject_id', 'CHAR(36) NULL', 'char(36)', 'YES')$

-- -----------------------------------------------------------------------------
-- 2) index tra cứu buổi theo lớp + môn
-- -----------------------------------------------------------------------------
CALL mems_m58_add_index('session', 'idx_session_class_subject', '`class_id`, `subject_id`')$

DROP PROCEDURE IF EXISTS mems_m58_add_index$
DROP PROCEDURE IF EXISTS mems_m58_add_col$

DELIMITER ;

-- =============================================================================
-- POST-CHECK (read-only, expect the documented results)
-- =============================================================================
SELECT column_name, column_type, is_nullable
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'session' AND column_name = 'subject_id';

SELECT index_name, GROUP_CONCAT(column_name ORDER BY seq_in_index) AS cols
FROM information_schema.statistics
WHERE table_schema = DATABASE() AND table_name = 'session' AND index_name = 'idx_session_class_subject'
GROUP BY index_name;
