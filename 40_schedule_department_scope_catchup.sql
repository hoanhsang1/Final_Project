-- MEMS / Schedule Service / migration 40
-- ScheduleService reads and writes session.department_id (create, list, update,
-- cancel, room suggestions, requireSession), but the live mems_schedule_db was
-- created without that column: GET /api/departments/{id}/schedules and
-- GET /api/schedules/me fail with "Unknown column 's.department_id'".
-- Apply to mems_schedule_db. Idempotent and additive; no rows are deleted.
-- Existing sessions keep department_id NULL, so they are not visible through the
-- department-scoped list until the column is filled.
USE mems_schedule_db;

DELIMITER $

DROP PROCEDURE IF EXISTS mems_m40_add_col$
CREATE PROCEDURE mems_m40_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64),
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

DROP PROCEDURE IF EXISTS mems_m40_add_index$
CREATE PROCEDURE mems_m40_add_index(IN p_table VARCHAR(64), IN p_index VARCHAR(64),
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

CALL mems_m40_add_col('session', 'department_id', 'CHAR(36) DEFAULT NULL');
CALL mems_m40_add_index('session', 'idx_session_department', '`department_id`, `start_time`');

DROP PROCEDURE IF EXISTS mems_m40_add_col;
DROP PROCEDURE IF EXISTS mems_m40_add_index;

-- Verification:
-- SHOW COLUMNS FROM session LIKE 'department_id';
-- SHOW INDEX FROM session WHERE Key_name = 'idx_session_department';
--
-- Phan tich du lieu cu (khong tu dong backfill):
--   SELECT COUNT(*) AS total, SUM(department_id IS NULL) AS missing_department FROM session;
--   SELECT s.id, s.class_id, s.teacher_id, s.start_time
--     FROM session s WHERE s.department_id IS NULL ORDER BY s.start_time;
-- `class` trong mems_schedule_db khong co cot department_id/created_by, nen khong the
-- suy ra phong ban cua session cu chi bang du lieu Schedule. Cac ban ghi NULL duoc giu
-- nguyen va se khong xuat hien trong danh sach theo phong ban cho den khi duoc gan
-- bang mot nguon du lieu co the kiem chung (vi du: phong ban cua lop/giao vien tu
-- PeopleService). Khong gan theo suy doan.
