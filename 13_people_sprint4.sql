-- MEMS / People Service / Sprint 4 migration
-- Target DB: mems_people_db (MySQL 8.0.16+)
--
-- Prerequisites: 07_people_department_access.sql and 11_people_student_class.sql must have been applied.
-- Safe to run repeatedly: CREATE TABLE IF NOT EXISTS + existence checks for columns/indexes/constraints.
-- No DROP TABLE / DROP DATABASE / data reset. Existing rows are preserved.
--
-- How to run on another environment (Aiven, staging, deployment host):
--   1. Take a backup/snapshot of mems_people_db first.
--   2. mysql -h <host> -P <port> -u <user> -p < mems_people_db < 13_people_sprint4.sql
--   3. Run this script BEFORE deploying the new PeopleService build.
--   4. Verify: DESCRIBE school_class; SHOW TABLES LIKE 'staff_profile';
--      SHOW TABLES LIKE 'position_seed';
--      SELECT status, COUNT(*) FROM school_class GROUP BY status;
--   The script only adds structures and normalizes the class status values; it never deletes rows.
--
-- This script does NOT touch mems_identity_db. New permission codes are registered in Phần 2.

USE mems_people_db;

DELIMITER $

DROP PROCEDURE IF EXISTS mems_s4_add_col$
CREATE PROCEDURE mems_s4_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64), IN p_ddl VARCHAR(500))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = p_table AND column_name = p_col
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_col, '` ', p_ddl);
        PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
END$

DROP PROCEDURE IF EXISTS mems_s4_add_index$
CREATE PROCEDURE mems_s4_add_index(IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_cols VARCHAR(255))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = p_table AND index_name = p_index
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD INDEX `', p_index, '` (', p_cols, ')');
        PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
END$

DROP PROCEDURE IF EXISTS mems_s4_add_constraint$
CREATE PROCEDURE mems_s4_add_constraint(IN p_table VARCHAR(64), IN p_name VARCHAR(64), IN p_ddl VARCHAR(1000))
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
-- 1. Staff profile (1:1 with department_member) — D1: teacher code = staff code
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_profile (
    user_id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    staff_code VARCHAR(50) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    full_name_unaccented VARCHAR(200) NOT NULL,
    phone VARCHAR(30) NULL,
    -- Display copy only; Identity.account.email remains the source of truth.
    email VARCHAR(255) NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_by CHAR(36) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_by CHAR(36) NULL,
    updated_at DATETIME(3) NULL,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_staff_profile_user_org (user_id, org_id),
    UNIQUE KEY uq_staff_profile_org_code (org_id, staff_code),
    INDEX idx_staff_profile_org_name (org_id, full_name_unaccented),
    CONSTRAINT fk_staff_profile_member FOREIGN KEY (user_id, org_id)
        REFERENCES department_member (user_id, org_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 2. Specialty catalog (per organization) — D11
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS specialty (
    id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_unaccented VARCHAR(200) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by CHAR(36) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_specialty_id_org (id, org_id),
    UNIQUE KEY uq_specialty_org_name (org_id, name_unaccented)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 3. Subject catalog (per organization) — decision 2026-11-06, used by D13
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subject (
    id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    name_unaccented VARCHAR(200) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by CHAR(36) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_subject_id_org (id, org_id),
    UNIQUE KEY uq_subject_org_name (org_id, name_unaccented)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 4. Teacher profile (extends staff) + specialty links
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_profile (
    user_id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    contract_type VARCHAR(20) NULL,
    teaching_status VARCHAR(20) NOT NULL DEFAULT 'DANG_DAY',
    version BIGINT NOT NULL DEFAULT 0,
    created_by CHAR(36) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_by CHAR(36) NULL,
    updated_at DATETIME(3) NULL,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_teacher_profile_user_org (user_id, org_id),
    INDEX idx_teacher_profile_org_status (org_id, teaching_status),
    CONSTRAINT fk_teacher_profile_staff FOREIGN KEY (user_id, org_id)
        REFERENCES staff_profile (user_id, org_id) ON DELETE CASCADE,
    CONSTRAINT chk_teacher_profile_contract
        CHECK (contract_type IS NULL OR contract_type IN ('CO_HUU', 'THINH_GIANG')),
    CONSTRAINT chk_teacher_profile_status
        CHECK (teaching_status IN ('DANG_DAY', 'TAM_NGHI', 'NGHI_VIEC'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS teacher_specialty (
    user_id CHAR(36) NOT NULL,
    specialty_id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    PRIMARY KEY (user_id, specialty_id),
    INDEX idx_teacher_specialty_specialty (specialty_id, org_id),
    CONSTRAINT fk_teacher_specialty_teacher FOREIGN KEY (user_id, org_id)
        REFERENCES teacher_profile (user_id, org_id) ON DELETE CASCADE,
    CONSTRAINT fk_teacher_specialty_specialty FOREIGN KEY (specialty_id, org_id)
        REFERENCES specialty (id, org_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 5. Class status history and close workflow events — defined in section 11.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 6. Position profile type — D3 (form changes by position)
-- ---------------------------------------------------------------------------
CALL mems_s4_add_col('position', 'profile_type', 'VARCHAR(20) NOT NULL DEFAULT ''GENERAL''');
CALL mems_s4_add_constraint('position', 'chk_position_profile_type',
    'CONSTRAINT `chk_position_profile_type` CHECK (`profile_type` IN (''GENERAL'', ''TEACHER''))');

-- Mark the existing "Giáo viên" position as a teacher position (accent/case-insensitive collation).
UPDATE `position`
SET profile_type = 'TEACHER'
WHERE profile_type <> 'TEACHER'
  AND LOWER(TRIM(name)) IN ('giáo viên', 'giao vien', 'teacher', 'giáo viên bộ môn', 'giao vien bo mon');

-- ---------------------------------------------------------------------------
-- 6b. Default-position seed marker — Phần 2.
--     One row per organization: the default positions are seeded once, so a
--     position deleted or edited by the owner is never recreated/overwritten.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS position_seed (
    org_id CHAR(36) NOT NULL,
    seeded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (org_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 7. school_class: missing Sprint 4 columns
-- ---------------------------------------------------------------------------
CALL mems_s4_add_col('school_class', 'teacher_id', 'CHAR(36) NULL');
CALL mems_s4_add_col('school_class', 'start_date', 'DATE NULL');
CALL mems_s4_add_col('school_class', 'end_date', 'DATE NULL');
CALL mems_s4_add_col('school_class', 'subject_id', 'CHAR(36) NULL');
CALL mems_s4_add_col('school_class', 'version', 'BIGINT NOT NULL DEFAULT 0');
CALL mems_s4_add_col('school_class', 'close_state', 'VARCHAR(10) NOT NULL DEFAULT ''NONE''');

CALL mems_s4_add_index('school_class', 'idx_school_class_teacher', '`teacher_id`');
CALL mems_s4_add_index('school_class', 'idx_school_class_subject', '`subject_id`');
CALL mems_s4_add_index('school_class', 'idx_school_class_org_status', '`org_id`, `status`');

-- ---------------------------------------------------------------------------
-- 8. Normalize legacy class status values — D6
--    active -> CHUA_BAT_DAU, inactive -> DA_HUY, archived -> DA_KET_THUC,
--    unknown/NULL -> CHUA_BAT_DAU.
--    Migration itself is not written to class_status_log (it is not a user transition).
-- ---------------------------------------------------------------------------
UPDATE school_class
SET status = CASE
    WHEN status IS NULL THEN 'CHUA_BAT_DAU'
    WHEN UPPER(TRIM(status)) IN ('CHUA_BAT_DAU', 'DANG_DIEN_RA', 'DA_KET_THUC', 'DA_HUY')
        THEN UPPER(TRIM(status))
    WHEN LOWER(TRIM(status)) = 'active' THEN 'CHUA_BAT_DAU'
    WHEN LOWER(TRIM(status)) = 'inactive' THEN 'DA_HUY'
    WHEN LOWER(TRIM(status)) = 'archived' THEN 'DA_KET_THUC'
    ELSE 'CHUA_BAT_DAU'
END;

ALTER TABLE school_class
    MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'CHUA_BAT_DAU';

CALL mems_s4_add_constraint('school_class', 'fk_school_class_teacher',
    'CONSTRAINT `fk_school_class_teacher` FOREIGN KEY (`teacher_id`, `org_id`) REFERENCES `staff_profile` (`user_id`, `org_id`) ON DELETE RESTRICT');
CALL mems_s4_add_constraint('school_class', 'fk_school_class_subject',
    'CONSTRAINT `fk_school_class_subject` FOREIGN KEY (`subject_id`, `org_id`) REFERENCES `subject` (`id`, `org_id`) ON DELETE RESTRICT');
CALL mems_s4_add_constraint('school_class', 'chk_school_class_status',
    'CONSTRAINT `chk_school_class_status` CHECK (`status` IN (''CHUA_BAT_DAU'', ''DANG_DIEN_RA'', ''DA_KET_THUC'', ''DA_HUY''))');
CALL mems_s4_add_constraint('school_class', 'chk_school_class_close_state',
    'CONSTRAINT `chk_school_class_close_state` CHECK (`close_state` IN (''NONE'', ''PENDING'', ''CLOSED''))');
CALL mems_s4_add_constraint('school_class', 'chk_school_class_dates',
    'CONSTRAINT `chk_school_class_dates` CHECK (`start_date` IS NULL OR `end_date` IS NULL OR `end_date` >= `start_date`)');

-- ---------------------------------------------------------------------------
-- 9. Backfill staff_profile for existing department members.
--    No real name exists yet, so username is used as a temporary display value.
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO staff_profile
    (user_id, org_id, staff_code, full_name, full_name_unaccented, phone, email,
     version, created_by, created_at)
SELECT dm.user_id,
       dm.org_id,
       COALESCE(NULLIF(TRIM(dm.username), ''), CONCAT('STAFF-', LEFT(dm.user_id, 8))),
       COALESCE(NULLIF(TRIM(dm.username), ''), CONCAT('Nhân sự ', LEFT(dm.user_id, 8))),
       LOWER(COALESCE(NULLIF(TRIM(dm.username), ''), CONCAT('staff ', LEFT(dm.user_id, 8)))),
       NULL,
       NULL,
       0,
       dm.appointed_by,
       dm.appointed_at
FROM department_member dm
LEFT JOIN staff_profile sp ON sp.user_id = dm.user_id
WHERE sp.user_id IS NULL;

-- ---------------------------------------------------------------------------
-- 10. Backfill teacher_profile for members already holding a TEACHER position.
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO teacher_profile
    (user_id, org_id, contract_type, teaching_status, version, created_by, created_at)
SELECT DISTINCT sp.user_id, sp.org_id, NULL, 'DANG_DAY', 0, sp.created_by, CURRENT_TIMESTAMP(3)
FROM staff_profile sp
JOIN member_position mp ON mp.user_id = sp.user_id AND mp.org_id = sp.org_id
JOIN `position` p ON p.id = mp.position_id AND p.org_id = mp.org_id
WHERE p.profile_type = 'TEACHER';

-- ---------------------------------------------------------------------------
-- 11. Class lifecycle history — Phần 5 (FN-19 / D8, D9).
--     Append-only tables: status transitions and close-workflow events.
--     changed_by is NULL for automatic (system) transitions.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS class_status_log (
    id CHAR(36) NOT NULL,
    class_id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    from_status VARCHAR(20) NULL,
    to_status VARCHAR(20) NOT NULL,
    reason VARCHAR(1000) NULL,
    changed_by CHAR(36) NULL,
    changed_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_class_status_log_class (class_id, changed_at),
    CONSTRAINT fk_class_status_log_class FOREIGN KEY (class_id) REFERENCES school_class (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS class_close_event (
    id CHAR(36) NOT NULL,
    class_id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    action VARCHAR(20) NOT NULL,
    actor_id CHAR(36) NOT NULL,
    reason VARCHAR(1000) NULL,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_class_close_event_class (class_id, created_at),
    CONSTRAINT fk_class_close_event_class FOREIGN KEY (class_id) REFERENCES school_class (id) ON DELETE CASCADE,
    CONSTRAINT chk_class_close_event_action CHECK (action IN ('REQUESTED', 'APPROVED', 'REJECTED', 'REOPENED'))
) ENGINE=InnoDB;

-- 11b. Upgrade tables created by an earlier draft of this script.
--      That draft stored class_close_event.requested_by/acted_by instead of actor_id;
--      CREATE TABLE IF NOT EXISTS leaves the old shape untouched, so align it here.
CALL mems_s4_add_col('class_close_event', 'actor_id', 'CHAR(36) NULL');
ALTER TABLE class_status_log
    MODIFY COLUMN reason VARCHAR(1000) NULL;
ALTER TABLE class_close_event
    MODIFY COLUMN reason VARCHAR(1000) NULL;

SET @s4_has_acted_by = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'class_close_event' AND column_name = 'acted_by'
);
SET @s4_has_requested_by = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'class_close_event' AND column_name = 'requested_by'
);
SET @s4_backfill = CONCAT(
    'UPDATE class_close_event SET actor_id = COALESCE(',
    IF(@s4_has_acted_by > 0, 'acted_by', 'NULL'), ', ',
    IF(@s4_has_requested_by > 0, 'requested_by', 'NULL'), ') WHERE actor_id IS NULL');
PREPARE stmt FROM @s4_backfill; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @s4_orphans = (SELECT COUNT(*) FROM class_close_event WHERE actor_id IS NULL);
SET @s4_ddl = IF(@s4_orphans = 0,
    'ALTER TABLE class_close_event MODIFY COLUMN actor_id CHAR(36) NOT NULL',
    'SELECT ''class_close_event rows without actor_id left unchanged'' AS note');
PREPARE stmt FROM @s4_ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

DROP PROCEDURE IF EXISTS mems_s4_add_col;
DROP PROCEDURE IF EXISTS mems_s4_add_index;
DROP PROCEDURE IF EXISTS mems_s4_add_constraint;

-- Verification queries (run manually):
-- DESCRIBE school_class;
-- SHOW TABLES LIKE 'staff_profile';
-- SHOW TABLES LIKE 'teacher_profile';
-- SELECT status, COUNT(*) FROM school_class GROUP BY status;
-- SELECT COUNT(*) FROM department_member;
-- SELECT COUNT(*) FROM staff_profile;
