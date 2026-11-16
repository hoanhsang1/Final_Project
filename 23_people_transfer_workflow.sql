-- MEMS / People Service / Phần 4: chuyển phòng ban 4 bên + nhãn phân công lại
-- Target DB: mems_people_db (MySQL 8.0.16+)
--
-- Prerequisites: 11_people_student_class.sql, 13_people_sprint4.sql,
--                17_people_permission_foundation.sql, 21_people_hr_workflows.sql.
-- Safe to run repeatedly: existence checks + CREATE TABLE IF NOT EXISTS.
-- Chỉ thêm cột/bảng; KHÔNG xoá dữ liệu.
--
-- How to run:
--   mysql -h <host> -P <port> -u <user> -p < 23_people_transfer_workflow.sql

USE mems_people_db;

DELIMITER $

DROP PROCEDURE IF EXISTS mems_p4_add_col$
CREATE PROCEDURE mems_p4_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64), IN p_ddl VARCHAR(500))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = p_table AND column_name = p_col
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_col, '` ', p_ddl);
        PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
END$

DROP PROCEDURE IF EXISTS mems_p4_add_index$
CREATE PROCEDURE mems_p4_add_index(IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_cols VARCHAR(255))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = p_table AND index_name = p_index
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD INDEX `', p_index, '` (', p_cols, ')');
        PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
END$

DROP PROCEDURE IF EXISTS mems_p4_add_constraint$
CREATE PROCEDURE mems_p4_add_constraint(IN p_table VARCHAR(64), IN p_name VARCHAR(64), IN p_ddl VARCHAR(1000))
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
-- 1. Nhãn "cần phân công lại" cho lớp của giáo viên chuyển phòng (quy tắc 17).
--    Lớp KHÔNG bị đổi teacher_id; chỉ gắn cờ để người quản lý lớp xử lý.
-- ---------------------------------------------------------------------------
CALL mems_p4_add_col('school_class', 'needs_reassignment', 'BOOLEAN NOT NULL DEFAULT FALSE');
CALL mems_p4_add_col('school_class', 'reassignment_reason', 'VARCHAR(255) NULL');
CALL mems_p4_add_index('school_class', 'idx_school_class_reassignment', '`org_id`, `needs_reassignment`');

-- ---------------------------------------------------------------------------
-- 2. Yêu cầu chuyển phòng ban.
--    status: PENDING | APPROVED | REJECTED | CANCELLED.
--    Không FK tới department/user để giữ lịch sử khi phòng ban bị xoá.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transfer_request (
    id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    from_department_id CHAR(36) NOT NULL,
    to_department_id CHAR(36) NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    requested_by CHAR(36) NOT NULL,
    requested_at DATETIME(3) NOT NULL,
    applied_at DATETIME(3) NULL,
    applied_by CHAR(36) NULL,
    PRIMARY KEY (id),
    INDEX idx_transfer_org_status (org_id, status),
    INDEX idx_transfer_user (org_id, user_id, status),
    INDEX idx_transfer_requester (org_id, requested_by),
    CONSTRAINT chk_transfer_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'))
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 3. Bốn bước duyệt độc lập của mỗi yêu cầu.
--    step: SOURCE_HEAD | TARGET_HEAD | HR | EMPLOYEE.
--    decision: PENDING | APPROVED | REJECTED.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transfer_approval (
    id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    request_id CHAR(36) NOT NULL,
    step VARCHAR(20) NOT NULL,
    decision VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    decided_by CHAR(36) NULL,
    decided_at DATETIME(3) NULL,
    note VARCHAR(1000) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_transfer_step (request_id, step),
    INDEX idx_transfer_approval_pending (org_id, step, decision),
    CONSTRAINT fk_transfer_approval_request
        FOREIGN KEY (request_id) REFERENCES transfer_request (id) ON DELETE CASCADE,
    CONSTRAINT chk_transfer_step
        CHECK (step IN ('SOURCE_HEAD', 'TARGET_HEAD', 'HR', 'EMPLOYEE')),
    CONSTRAINT chk_transfer_decision
        CHECK (decision IN ('PENDING', 'APPROVED', 'REJECTED'))
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 4. Thông báo trong hệ thống (chưa có cơ chế mail) — Phần 5 sẽ mở rộng.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification (
    id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body VARCHAR(1000) NULL,
    entity_type VARCHAR(50) NULL,
    entity_id CHAR(36) NULL,
    read_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_notification_user (org_id, user_id, created_at),
    INDEX idx_notification_unread (org_id, user_id, read_at)
) ENGINE=InnoDB;

DROP PROCEDURE IF EXISTS mems_p4_add_col;
DROP PROCEDURE IF EXISTS mems_p4_add_index;
DROP PROCEDURE IF EXISTS mems_p4_add_constraint;

-- Verification queries (run manually):
-- DESCRIBE school_class;
-- SHOW TABLES LIKE 'transfer_request';
-- SHOW TABLES LIKE 'transfer_approval';
-- SHOW TABLES LIKE 'notification';
