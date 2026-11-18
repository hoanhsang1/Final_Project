-- MEMS / People Service / migration 34
-- Restores prerequisites that migrations 16-27 introduced but that are missing
-- from DB_11_16.sql: the position scope/soft-delete columns and the member status
-- columns. Every PeopleService permission and workflow query filters on these.
--
-- Apply BEFORE 31/32/33 when the database was bootstrapped from DB_11_16.sql.
-- Idempotent and additive; no data is deleted. Existing rows become ACTIVE.
USE mems_people_db;

DELIMITER $

DROP PROCEDURE IF EXISTS mems_m34_add_col$
CREATE PROCEDURE mems_m34_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64),
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

DROP PROCEDURE IF EXISTS mems_m34_add_index$
CREATE PROCEDURE mems_m34_add_index(IN p_table VARCHAR(64), IN p_index VARCHAR(64),
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

DROP PROCEDURE IF EXISTS mems_m34_add_check$
CREATE PROCEDURE mems_m34_add_check(IN p_table VARCHAR(64), IN p_name VARCHAR(64),
                                    IN p_expr VARCHAR(1000))
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = DATABASE() AND table_name = p_table)
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                       WHERE constraint_schema = DATABASE() AND table_name = p_table
                         AND constraint_name = p_name) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD CONSTRAINT `', p_name,
                          '` CHECK (', p_expr, ')');
        PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
END$

DELIMITER ;

-- 17_people_permission_foundation.sql: position scope and soft delete.
CALL mems_m34_add_col('position', 'scope', 'VARCHAR(20) NOT NULL DEFAULT ''DEPARTMENT''');
CALL mems_m34_add_col('position', 'department_id', 'CHAR(36) DEFAULT NULL');
CALL mems_m34_add_col('position', 'deleted_at', 'DATETIME(3) DEFAULT NULL');
CALL mems_m34_add_index('position', 'idx_position_org_scope', '`org_id`, `scope`, `deleted_at`');
CALL mems_m34_add_check('position', 'chk_position_scope',
    "scope IN ('ORGANIZATION','DEPARTMENT')");

-- 19_people_position_soft_delete.sql / 21_people_hr_workflows.sql: member status.
CALL mems_m34_add_col('department_member', 'status', 'VARCHAR(20) NOT NULL DEFAULT ''ACTIVE''');
CALL mems_m34_add_col('department_member', 'resigned_at', 'DATETIME(3) DEFAULT NULL');
CALL mems_m34_add_index('department_member', 'idx_member_org_status', '`org_id`, `status`');
CALL mems_m34_add_check('department_member', 'chk_member_status',
    "status IN ('ACTIVE','RESIGNED')");

-- Organisation-wide positions were seeded before scope existed; keep them org-wide.
UPDATE `position` SET scope = 'ORGANIZATION', department_id = NULL
WHERE scope = 'DEPARTMENT'
  AND LOWER(TRIM(name)) IN ('quản trị viên tổ chức', 'quan tri vien to chuc', 'giáo vụ', 'giao vu');

DROP PROCEDURE IF EXISTS mems_m34_add_col;
DROP PROCEDURE IF EXISTS mems_m34_add_index;
DROP PROCEDURE IF EXISTS mems_m34_add_check;

-- Verification:
-- SHOW COLUMNS FROM `position` LIKE 'scope';
-- SHOW COLUMNS FROM department_member LIKE 'status';
-- SELECT status, COUNT(*) FROM department_member GROUP BY status;
