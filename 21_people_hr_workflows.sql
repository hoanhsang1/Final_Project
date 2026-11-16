-- MEMS / People Service / Phần 3: lý do bổ nhiệm + quy trình nghỉ việc
-- Target DB: mems_people_db (MySQL 8.0.16+)
--
-- Prerequisites: 13_people_sprint4.sql, 17_people_permission_foundation.sql,
--                19_people_position_soft_delete.sql.
-- Safe to run repeatedly: existence checks + CREATE TABLE IF NOT EXISTS.
-- Chỉ thêm cột/bảng; KHÔNG xoá dữ liệu. Nhân sự hiện có mặc định status='ACTIVE'.
--
-- How to run:
--   mysql -h <host> -P <port> -u <user> -p < 21_people_hr_workflows.sql

USE mems_people_db;

DELIMITER $

DROP PROCEDURE IF EXISTS mems_p3_add_col$
CREATE PROCEDURE mems_p3_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64), IN p_ddl VARCHAR(500))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = p_table AND column_name = p_col
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_col, '` ', p_ddl);
        PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
END$

DROP PROCEDURE IF EXISTS mems_p3_add_index$
CREATE PROCEDURE mems_p3_add_index(IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_cols VARCHAR(255))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = p_table AND index_name = p_index
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD INDEX `', p_index, '` (', p_cols, ')');
        PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
END$

DROP PROCEDURE IF EXISTS mems_p3_add_constraint$
CREATE PROCEDURE mems_p3_add_constraint(IN p_table VARCHAR(64), IN p_name VARCHAR(64), IN p_ddl VARCHAR(1000))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = DATABASE() AND table_name = p_table AND constraint_name = p_name
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD ', p_ddl);
        PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
END$

DELIMITER ;

-- ---------------------------------------------------------------------------
-- 1. Lịch sử bổ nhiệm: lưu lý do bổ nhiệm và lý do thu hồi (ai/khi nào đã có
--    sẵn ở assigned_by/revoked_by + created_at/revoked_at; phạm vi ở scope_type
--    và department_id).
-- ---------------------------------------------------------------------------
CALL mems_p3_add_col('assignment', 'reason', 'VARCHAR(1000) NULL');
CALL mems_p3_add_col('assignment', 'revoked_reason', 'VARCHAR(1000) NULL');

-- ---------------------------------------------------------------------------
-- 2. Trạng thái nhân sự: ACTIVE | RESIGNED. Không xoá dòng khi nghỉ việc để
--    giữ lịch sử bổ nhiệm và tham chiếu từ lớp học.
-- ---------------------------------------------------------------------------
CALL mems_p3_add_col('department_member', 'status', 'VARCHAR(20) NOT NULL DEFAULT ''ACTIVE''');
CALL mems_p3_add_col('department_member', 'resigned_at', 'DATETIME(3) NULL');
CALL mems_p3_add_index('department_member', 'idx_member_org_status', '`org_id`, `status`');
CALL mems_p3_add_constraint('department_member', 'chk_member_status',
    'CONSTRAINT `chk_member_status` CHECK (`status` IN (''ACTIVE'', ''RESIGNED''))');

-- ---------------------------------------------------------------------------
-- 3. Yêu cầu nghỉ việc — duyệt MỘT bước bởi HR (quy tắc 16).
--    status: PENDING | APPROVED | REJECTED | CANCELLED
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resignation_request (
    id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    department_id CHAR(36) NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    requested_by CHAR(36) NOT NULL,
    requested_at DATETIME(3) NOT NULL,
    decided_by CHAR(36) NULL,
    decided_at DATETIME(3) NULL,
    decision_note VARCHAR(1000) NULL,
    PRIMARY KEY (id),
    INDEX idx_resignation_org_dept_status (org_id, department_id, status),
    INDEX idx_resignation_user_status (org_id, user_id, status),
    CONSTRAINT chk_resignation_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'))
) ENGINE=InnoDB;

DROP PROCEDURE IF EXISTS mems_p3_add_col;
DROP PROCEDURE IF EXISTS mems_p3_add_index;
DROP PROCEDURE IF EXISTS mems_p3_add_constraint;

-- Verification queries (run manually):
-- DESCRIBE assignment;
-- SELECT status, COUNT(*) FROM department_member GROUP BY status;
-- SHOW TABLES LIKE 'resignation_request';
