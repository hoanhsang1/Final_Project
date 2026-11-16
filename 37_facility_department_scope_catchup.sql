-- MEMS / Facility Service / migration 37
-- Restores 08_facility_department_access.sql + 27_facility_equipment_department.sql,
-- which are missing from DB_11_16.sql: facility tables have no department_id, so
-- 27 aborts with "Unknown column 'c.department_id'". Apply to mems_facility_db.
--
-- Idempotent and additive; no rows are deleted. Existing equipment keeps its
-- department NULL until it is assigned to a room that has one.
USE mems_facility_db;

DELIMITER $

DROP PROCEDURE IF EXISTS mems_m37_add_col$
CREATE PROCEDURE mems_m37_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64),
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

DROP PROCEDURE IF EXISTS mems_m37_add_index$
CREATE PROCEDURE mems_m37_add_index(IN p_table VARCHAR(64), IN p_index VARCHAR(64),
                                    IN p_cols VARCHAR(255))
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = DATABASE() AND table_name = p_table)
       AND NOT EXISTS (SELECT 1 FROM information_schema.statistics
                       WHERE table_schema = DATABASE() AND table_name = p_table
                         AND index_name = p_index) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD INDEX `', p_index, '` (', p_cols, ')');
        PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
END$

DELIMITER ;

CALL mems_m37_add_col('classroom', 'department_id', 'CHAR(36) DEFAULT NULL');
CALL mems_m37_add_index('classroom', 'idx_classroom_department', '`department_id`');
CALL mems_m37_add_col('equipment', 'department_id', 'CHAR(36) DEFAULT NULL');
CALL mems_m37_add_index('equipment', 'idx_equipment_department',
    '`org_id`, `department_id`, `status`, `deleted_at`');

UPDATE equipment e
JOIN classroom c ON c.id = e.room_id AND c.org_id = e.org_id
SET e.department_id = c.department_id
WHERE e.department_id IS NULL AND c.department_id IS NOT NULL;

DROP PROCEDURE IF EXISTS mems_m37_add_col;
DROP PROCEDURE IF EXISTS mems_m37_add_index;

-- Verification:
-- SHOW COLUMNS FROM classroom LIKE 'department_id';
-- SHOW COLUMNS FROM equipment LIKE 'department_id';
