-- MEMS / People Service / migration 32
-- Aligns the workflow tables created by migration 31 with the constraints and
-- indexes that the earlier workflow migrations (17, 21, 23, 24, 25) defined.
--
-- Why: 31 uses CREATE TABLE IF NOT EXISTS with a reduced definition. On a
-- database that already has the historical tables it is a no-op, but on a
-- database bootstrapped from DB_11_16.sql it creates the tables without the
-- CHECK/FK guards. This migration adds the missing guards to both cases.
--
-- Idempotent and additive: every change is guarded by existence checks.
-- Existing data that violates a guard aborts the migration with SQLSTATE 45000
-- instead of silently skipping the constraint.
USE mems_people_db;

DELIMITER $

DROP PROCEDURE IF EXISTS mems_m32_add_index$
CREATE PROCEDURE mems_m32_add_index(IN p_table VARCHAR(64), IN p_index VARCHAR(64),
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

DROP PROCEDURE IF EXISTS mems_m32_add_check$
CREATE PROCEDURE mems_m32_add_check(IN p_table VARCHAR(64), IN p_name VARCHAR(64),
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

-- Adds a single-column FK only when both tables exist and no orphan row would
-- violate it. Orphans abort the migration so the operator sees the real data issue.
DROP PROCEDURE IF EXISTS mems_m32_add_fk$
CREATE PROCEDURE mems_m32_add_fk(IN p_table VARCHAR(64), IN p_name VARCHAR(64),
                                 IN p_col VARCHAR(64), IN p_ref_table VARCHAR(64),
                                 IN p_ref_col VARCHAR(64), IN p_on_delete VARCHAR(20))
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = DATABASE() AND table_name = p_table)
       AND EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = DATABASE() AND table_name = p_ref_table)
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                       WHERE constraint_schema = DATABASE() AND table_name = p_table
                         AND constraint_name = p_name) THEN
        SET @orphan_sql = CONCAT('SELECT COUNT(*) INTO @orphans FROM `', p_table,
            '` c LEFT JOIN `', p_ref_table, '` r ON r.`', p_ref_col, '` = c.`', p_col,
            '` WHERE c.`', p_col, '` IS NOT NULL AND r.`', p_ref_col, '` IS NULL');
        PREPARE stmt FROM @orphan_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
        IF @orphans > 0 THEN
            SELECT p_name AS failing_constraint, @orphans AS orphan_rows;
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Migration 32 aborted: orphan rows would violate a foreign key. Repair the data and rerun.';
        END IF;
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD CONSTRAINT `', p_name,
            '` FOREIGN KEY (`', p_col, '`) REFERENCES `', p_ref_table, '` (`', p_ref_col,
            '`) ON DELETE ', p_on_delete);
        PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
END$

DELIMITER ;

-- assignment (17_people_permission_foundation.sql)
CALL mems_m32_add_index('assignment', 'idx_assignment_user_org_status', '`user_id`, `org_id`, `status`');
CALL mems_m32_add_index('assignment', 'idx_assignment_position', '`position_id`');
CALL mems_m32_add_check('assignment', 'chk_assignment_scope',
    "scope_type IN ('ORGANIZATION','DEPARTMENT')");
CALL mems_m32_add_check('assignment', 'chk_assignment_status',
    "status IN ('ACTIVE','REVOKED','EXPIRED')");
CALL mems_m32_add_fk('assignment', 'fk_assignment_position', 'position_id',
    'position', 'id', 'RESTRICT');

-- position_bundle (17_people_permission_foundation.sql)
CALL mems_m32_add_fk('position_bundle', 'fk_position_bundle_position', 'position_id',
    'position', 'id', 'CASCADE');

-- notification (23_people_transfer_workflow.sql)
CALL mems_m32_add_index('notification', 'idx_notification_unread',
    '`org_id`, `user_id`, `read_at`');

-- transfer_request / transfer_approval (23_people_transfer_workflow.sql)
CALL mems_m32_add_index('transfer_request', 'idx_transfer_org_status', '`org_id`, `status`');
CALL mems_m32_add_index('transfer_request', 'idx_transfer_user',
    '`org_id`, `user_id`, `status`');
CALL mems_m32_add_index('transfer_request', 'idx_transfer_requester',
    '`org_id`, `requested_by`');
CALL mems_m32_add_check('transfer_request', 'chk_transfer_status',
    "status IN ('PENDING','APPROVED','REJECTED','CANCELLED')");
CALL mems_m32_add_index('transfer_approval', 'idx_transfer_approval_pending',
    '`org_id`, `step`, `decision`');
CALL mems_m32_add_check('transfer_approval', 'chk_transfer_step',
    "step IN ('SOURCE_HEAD','TARGET_HEAD','HR','EMPLOYEE')");
CALL mems_m32_add_check('transfer_approval', 'chk_transfer_decision',
    "decision IN ('PENDING','APPROVED','REJECTED')");
CALL mems_m32_add_fk('transfer_approval', 'fk_transfer_approval_request', 'request_id',
    'transfer_request', 'id', 'CASCADE');

-- resignation_request (21_people_hr_workflows.sql)
CALL mems_m32_add_index('resignation_request', 'idx_resignation_user_status',
    '`org_id`, `user_id`, `status`');
CALL mems_m32_add_check('resignation_request', 'chk_resignation_status',
    "status IN ('PENDING','APPROVED','REJECTED','CANCELLED')");

-- delegation / delegation_permission (25_people_delegation.sql)
CALL mems_m32_add_index('delegation', 'idx_delegation_delegator',
    '`org_id`, `delegator_id`, `status`');
CALL mems_m32_add_check('delegation', 'chk_delegation_status',
    "status IN ('ACTIVE','REVOKED')");
CALL mems_m32_add_check('delegation', 'chk_delegation_scope',
    "scope IN ('ORGANIZATION')");
CALL mems_m32_add_check('delegation', 'chk_delegation_window',
    'effective_to IS NULL OR effective_to > effective_from');
CALL mems_m32_add_fk('delegation_permission', 'fk_delegation_permission', 'delegation_id',
    'delegation', 'id', 'CASCADE');

-- school_class reassignment flag (23_people_transfer_workflow.sql)
CALL mems_m32_add_index('school_class', 'idx_school_class_reassignment',
    '`org_id`, `needs_reassignment`');

DROP PROCEDURE IF EXISTS mems_m32_add_index;
DROP PROCEDURE IF EXISTS mems_m32_add_check;
DROP PROCEDURE IF EXISTS mems_m32_add_fk;

-- Verification:
-- SELECT table_name, constraint_name, constraint_type
--   FROM information_schema.table_constraints
--  WHERE constraint_schema='mems_people_db'
--    AND table_name IN ('assignment','position_bundle','transfer_request',
--                       'transfer_approval','resignation_request','delegation',
--                       'delegation_permission')
--  ORDER BY table_name, constraint_name;
