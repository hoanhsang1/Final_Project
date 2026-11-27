-- =============================================================================
-- DRAFT ONLY — DO NOT RUN AUTOMATICALLY.
-- MEMS People DB — Migration 57: class/curriculum subject scheduling fields.
-- Target: MySQL 8.0.16+, database mems_people_db.
-- Additive and idempotent. Does NOT drop columns or data.
--
-- Adds:
--   * class_subject.sessions_per_week INT NULL        (D8: buổi/tuần, NULL = chưa đặt)
--   * class_subject.stage_no          INT NOT NULL DEFAULT 1  (D9: giai đoạn)
--   * curriculum_subject.sessions_per_week INT NULL   (nguồn khi áp chương trình)
--
-- Legacy data: sessions_per_week NULL -> service mặc định 2; stage_no = 1 cho mọi
-- dòng cũ nên dữ liệu hiện có không đổi hành vi.
-- =============================================================================
USE mems_people_db;

DELIMITER $

-- -----------------------------------------------------------------------------
-- Helper: add a column only when missing; abort when an existing column differs.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS mems_m57_add_col$
CREATE PROCEDURE mems_m57_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64),
                                  IN p_ddl VARCHAR(500), IN p_type VARCHAR(64),
                                  IN p_nullable VARCHAR(3))
BEGIN
  DECLARE v_type VARCHAR(64);
  DECLARE v_nullable VARCHAR(3);

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = DATABASE() AND table_name = p_table) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'M57 ABORT: target table for add_col does not exist';
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
        SET MESSAGE_TEXT = 'M57 ABORT: existing column definition differs from expected';
    END IF;
  END IF;
END$

-- -----------------------------------------------------------------------------
-- 1) class_subject: số buổi/tuần + giai đoạn
-- -----------------------------------------------------------------------------
CALL mems_m57_add_col('class_subject', 'sessions_per_week', 'INT NULL', 'int', 'YES')$
CALL mems_m57_add_col('class_subject', 'stage_no', 'INT NOT NULL DEFAULT 1', 'int', 'NO')$

-- -----------------------------------------------------------------------------
-- 2) curriculum_subject: số buổi/tuần (nguồn sao chép khi áp chương trình)
-- -----------------------------------------------------------------------------
CALL mems_m57_add_col('curriculum_subject', 'sessions_per_week', 'INT NULL', 'int', 'YES')$

DROP PROCEDURE IF EXISTS mems_m57_add_col$

DELIMITER ;

-- =============================================================================
-- POST-CHECK (read-only, expect the documented results)
-- =============================================================================
SELECT table_name, column_name, column_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND ((table_name = 'class_subject'
        AND column_name IN ('sessions_per_week','stage_no'))
    OR (table_name = 'curriculum_subject' AND column_name = 'sessions_per_week'))
ORDER BY table_name, column_name;
