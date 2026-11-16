-- MEMS / Identity Service / Phần 0.1: cờ module lõi (is_core)
-- Target DB: mems_identity_db (MySQL 8.0.16+)
--
-- Prerequisites: 01_identity_db.sql, 05_seed_admin.sql, 18_identity_department_modules.sql.
-- Safe to run repeatedly: ALTER TABLE guarded by procedure + INSERT uses ON DUPLICATE KEY UPDATE.
-- No DROP TABLE / DROP DATABASE / data reset.
--
-- Purpose: thêm cột is_core vào bảng module để backend phân biệt module lõi (không tắt được)
--          và module Optional (OWNER bật/tắt được theo DEC-01).
--
-- Core modules (DEC-01): STUDENT_MANAGEMENT, TEACHER_MANAGEMENT, CLASS_MANAGEMENT,
--                         SCHEDULE_MANAGEMENT — không tắt được dù bởi OWNER hay SUPER_ADMIN.
-- Optional modules: FACILITY_MANAGEMENT, ROOM_MANAGEMENT, EQUIPMENT_MANAGEMENT.
--
-- How to run:
--   mysql -h <host> -P <port> -u <user> -p < 28_identity_module_core_flag.sql

USE mems_identity_db;

DELIMITER $
DROP PROCEDURE IF EXISTS mems_add_module_core_flag$
CREATE PROCEDURE mems_add_module_core_flag()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name   = 'module'
          AND column_name  = 'is_core'
    ) THEN
        ALTER TABLE module
            ADD COLUMN is_core BOOLEAN NOT NULL DEFAULT FALSE
                COMMENT 'TRUE = module lõi, không tắt được (DEC-01)';
    END IF;
END$
CALL mems_add_module_core_flag()$
DROP PROCEDURE IF EXISTS mems_add_module_core_flag$
DELIMITER ;

-- Core modules: không tắt được dù bởi OWNER hay SUPER_ADMIN (DEC-01).
UPDATE module
SET is_core = TRUE
WHERE code IN (
    'STUDENT_MANAGEMENT',
    'TEACHER_MANAGEMENT',
    'CLASS_MANAGEMENT',
    'SCHEDULE_MANAGEMENT'
);

-- Optional modules: OWNER bật/tắt được; SUPER_ADMIN có thể khóa (DEC-01, DEC-11).
UPDATE module
SET is_core = FALSE
WHERE code IN (
    'FACILITY_MANAGEMENT',
    'ROOM_MANAGEMENT',
    'EQUIPMENT_MANAGEMENT'
);

-- Verification queries (run manually):
-- SELECT code, name, is_active, is_core FROM module ORDER BY is_core DESC, code;
-- Expected:
--   STUDENT_MANAGEMENT  | TRUE  | TRUE
--   TEACHER_MANAGEMENT  | TRUE  | TRUE
--   CLASS_MANAGEMENT    | TRUE  | TRUE
--   SCHEDULE_MANAGEMENT | TRUE  | TRUE
--   EQUIPMENT_MANAGEMENT| TRUE  | FALSE
--   FACILITY_MANAGEMENT | TRUE  | FALSE
--   ROOM_MANAGEMENT     | TRUE  | FALSE
