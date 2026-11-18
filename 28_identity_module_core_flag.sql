-- MEMS / Identity Service / migration 28
-- Adds the core-module flag (DEC-01). Core modules cannot be disabled by OWNER
-- or locked by SUPER_ADMIN. Idempotent: safe to run more than once.
USE mems_identity_db;

DELIMITER $
DROP PROCEDURE IF EXISTS mems_m28_add_core_flag$
CREATE PROCEDURE mems_m28_add_core_flag()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'module'
          AND column_name = 'is_core'
    ) THEN
        ALTER TABLE module ADD COLUMN is_core BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END$
CALL mems_m28_add_core_flag()$
DROP PROCEDURE IF EXISTS mems_m28_add_core_flag$
DELIMITER ;

-- Core modules (sinh viên, giáo viên, lớp, lịch) — always active.
UPDATE module SET is_core = TRUE
WHERE code IN ('STUDENT_MANAGEMENT', 'TEACHER_MANAGEMENT', 'CLASS_MANAGEMENT', 'SCHEDULE_MANAGEMENT');

-- Optional modules — Owner may enable/disable.
UPDATE module SET is_core = FALSE
WHERE code IN ('ROOM_MANAGEMENT', 'EQUIPMENT_MANAGEMENT', 'FACILITY_MANAGEMENT');

-- Verification:
-- SELECT code, is_core FROM module ORDER BY is_core DESC, code;
