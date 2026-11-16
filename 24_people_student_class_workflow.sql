-- MEMS / People Service / Phần 5: tài khoản học sinh + duyệt hủy lớp
-- Target DB: mems_people_db (MySQL 8.0.16+)
--
-- Prerequisites: 11_people_student_class.sql, 13_people_sprint4.sql,
--                21_people_hr_workflows.sql, 23_people_transfer_workflow.sql.
-- Safe to run repeatedly: existence checks + CREATE TABLE IF NOT EXISTS.
-- Chỉ thêm cột/ràng buộc; KHÔNG xoá dữ liệu.
--
-- How to run:
--   mysql -h <host> -P <port> -u <user> -p < 24_people_student_class_workflow.sql

USE mems_people_db;

DELIMITER $

DROP PROCEDURE IF EXISTS mems_p5_add_col$
CREATE PROCEDURE mems_p5_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64), IN p_ddl VARCHAR(500))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = p_table AND column_name = p_col
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_col, '` ', p_ddl);
        PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
END$

DROP PROCEDURE IF EXISTS mems_p5_add_constraint$
CREATE PROCEDURE mems_p5_add_constraint(IN p_table VARCHAR(64), IN p_name VARCHAR(64), IN p_ddl VARCHAR(1000))
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
-- 1. Học sinh: liên kết tài khoản đăng nhập (quy tắc 12).
--    Tài khoản được tạo từ hồ sơ có sẵn; account id = student id.
-- ---------------------------------------------------------------------------
CALL mems_p5_add_col('student', 'account_username', 'VARCHAR(100) NULL');
CALL mems_p5_add_col('student', 'account_created_at', 'DATETIME(3) NULL');

-- ---------------------------------------------------------------------------
-- 2. Lớp: yêu cầu hủy cần duyệt khi lớp đã có học sinh (quy tắc 14).
--    NONE = không có yêu cầu; PENDING = chờ trưởng phòng duyệt.
-- ---------------------------------------------------------------------------
CALL mems_p5_add_col('school_class', 'cancel_state', 'VARCHAR(10) NOT NULL DEFAULT ''NONE''');
CALL mems_p5_add_col('school_class', 'cancel_request_reason', 'VARCHAR(1000) NULL');
CALL mems_p5_add_constraint('school_class', 'chk_school_class_cancel_state',
    'CONSTRAINT `chk_school_class_cancel_state` CHECK (`cancel_state` IN (''NONE'', ''PENDING''))');

-- ---------------------------------------------------------------------------
-- 3. Mở rộng nhật ký sự kiện lớp cho luồng hủy.
--    class_close_event giữ nguyên dữ liệu cũ; chỉ nới CHECK constraint.
-- ---------------------------------------------------------------------------
SET @p5_has_check = (
    SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE constraint_schema = DATABASE() AND table_name = 'class_close_event'
      AND constraint_name = 'chk_class_close_event_action' AND constraint_type = 'CHECK'
);
SET @p5_drop_check = IF(@p5_has_check > 0,
    'ALTER TABLE class_close_event DROP CHECK `chk_class_close_event_action`',
    'SELECT 1');
PREPARE stmt FROM @p5_drop_check; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CALL mems_p5_add_constraint('class_close_event', 'chk_class_close_event_action',
    'CONSTRAINT `chk_class_close_event_action` CHECK (`action` IN (''REQUESTED'', ''APPROVED'', ''REJECTED'', ''REOPENED'', ''CANCEL_REQUESTED'', ''CANCEL_APPROVED'', ''CANCEL_REJECTED''))');

DROP PROCEDURE IF EXISTS mems_p5_add_col;
DROP PROCEDURE IF EXISTS mems_p5_add_constraint;

-- Verification queries (run manually):
-- DESCRIBE student;
-- DESCRIBE school_class;
-- SELECT COUNT(*) FROM school_class WHERE cancel_state = 'PENDING';
