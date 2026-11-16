-- MEMS / Identity Service / migration 29
-- OWNER toggle + SUPER_ADMIN lock support (DEC-01, DEC-11, BE-00.2).
-- Run AFTER migration 28. Idempotent: safe to run more than once.
--
-- Adds:
--   * organization_module status values: requested/active/rejected/disabled/locked
--   * organization_module.disabled_at, locked_by_admin, locked_reason, locked_at,
--     status_before_lock (so unlock restores the previous state instead of enabling)
--   * module_legacy_map (ROOM_MANAGEMENT / EQUIPMENT_MANAGEMENT -> FACILITY_MANAGEMENT)
--   * FACILITY_MANAGEMENT module row when missing
--
-- Deliberately does NOT rewrite or delete legacy organization_module rows:
-- merging ROOM/EQUIPMENT data into FACILITY_MANAGEMENT is still Q-03 (NEEDS_DECISION).
USE mems_identity_db;

DELIMITER $
DROP PROCEDURE IF EXISTS mems_m29_owner_toggle$
CREATE PROCEDURE mems_m29_owner_toggle()
BEGIN
    -- status was enum('requested','active','rejected'); widen it without losing data.
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'organization_module'
          AND column_name = 'status'
          AND data_type = 'enum'
    ) THEN
        ALTER TABLE organization_module
            MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'requested';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'organization_module'
          AND column_name = 'disabled_at'
    ) THEN
        ALTER TABLE organization_module ADD COLUMN disabled_at DATETIME(3) DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'organization_module'
          AND column_name = 'locked_by_admin'
    ) THEN
        ALTER TABLE organization_module ADD COLUMN locked_by_admin CHAR(36) DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'organization_module'
          AND column_name = 'locked_reason'
    ) THEN
        ALTER TABLE organization_module ADD COLUMN locked_reason VARCHAR(1000) DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'organization_module'
          AND column_name = 'locked_at'
    ) THEN
        ALTER TABLE organization_module ADD COLUMN locked_at DATETIME(3) DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'organization_module'
          AND column_name = 'status_before_lock'
    ) THEN
        ALTER TABLE organization_module ADD COLUMN status_before_lock VARCHAR(20) DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'organization_module'
          AND index_name = 'idx_org_module_status'
    ) THEN
        ALTER TABLE organization_module ADD INDEX idx_org_module_status (status);
    END IF;
END$
CALL mems_m29_owner_toggle()$
DROP PROCEDURE IF EXISTS mems_m29_owner_toggle$
DELIMITER ;

-- Canonical facility module (migration 18 may already have created it).
INSERT INTO module (code, name, is_active)
SELECT 'FACILITY_MANAGEMENT', 'Quản lý cơ sở vật chất', TRUE
WHERE NOT EXISTS (SELECT 1 FROM module WHERE code = 'FACILITY_MANAGEMENT');

CREATE TABLE IF NOT EXISTS module_legacy_map (
    legacy_code VARCHAR(60) NOT NULL,
    canonical_code VARCHAR(60) NOT NULL,
    PRIMARY KEY (legacy_code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

INSERT INTO module_legacy_map (legacy_code, canonical_code) VALUES
    ('ROOM_MANAGEMENT', 'FACILITY_MANAGEMENT'),
    ('EQUIPMENT_MANAGEMENT', 'FACILITY_MANAGEMENT')
ON DUPLICATE KEY UPDATE canonical_code = VALUES(canonical_code);

-- Verification:
-- SHOW COLUMNS FROM organization_module;
-- SELECT * FROM module_legacy_map;
