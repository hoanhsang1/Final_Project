-- MEMS / Identity Service / BE-00.2: Owner module toggle + Super Admin lock
-- Target DB: mems_identity_db (MySQL 8.0.16+)
--
-- Prerequisites: 01_identity_db.sql, 05_seed_admin.sql, 18_identity_department_modules.sql,
--                28_identity_module_core_flag.sql.
-- Safe to run repeatedly: all ALTER TABLE guarded by procedures; INSERT uses ON DUPLICATE KEY.
-- No DROP TABLE / DROP DATABASE. No data destruction.
--
-- Changes:
--   1. organization_module: add locked_by_admin, locked_reason, locked_at columns.
--   2. ENUM status extended: add 'disabled' (Owner-off), 'locked' (SA-locked) alongside
--      existing 'requested', 'active', 'rejected'.
--   3. module_legacy_map: maps ROOM_MANAGEMENT, EQUIPMENT_MANAGEMENT → FACILITY_MANAGEMENT
--      for backward-compat (Q-03).
--   4. Seed FACILITY_MANAGEMENT into organization_module for all orgs that already have
--      ROOM_MANAGEMENT or EQUIPMENT_MANAGEMENT active, without removing the legacy rows.
--
-- How to run:
--   mysql -h <host> -P <port> -u <user> -p < 29_identity_module_owner_toggle.sql

USE mems_identity_db;

-- ---------------------------------------------------------------------------
-- 1. Extend organization_module status ENUM to include 'disabled' and 'locked'.
--    MySQL ALTER ENUM is additive and safe; existing rows keep their current value.
-- ---------------------------------------------------------------------------
DELIMITER $
DROP PROCEDURE IF EXISTS mems_extend_org_module_status$
CREATE PROCEDURE mems_extend_org_module_status()
BEGIN
    DECLARE col_type VARCHAR(500);
    SELECT COLUMN_TYPE INTO col_type
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'organization_module'
      AND COLUMN_NAME = 'status';

    IF col_type NOT LIKE '%disabled%' THEN
        ALTER TABLE organization_module
            MODIFY COLUMN status
                ENUM('requested','active','rejected','disabled','locked')
                NOT NULL DEFAULT 'requested';
    END IF;
END$
CALL mems_extend_org_module_status()$
DROP PROCEDURE IF EXISTS mems_extend_org_module_status$

-- ---------------------------------------------------------------------------
-- 2. Add locked_by_admin, locked_reason, locked_at to organization_module.
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS mems_add_org_module_lock_cols$
CREATE PROCEDURE mems_add_org_module_lock_cols()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'organization_module'
          AND COLUMN_NAME = 'locked_by_admin'
    ) THEN
        ALTER TABLE organization_module
            ADD COLUMN locked_by_admin  CHAR(36) NULL
                COMMENT 'Account ID of the SUPER_ADMIN who locked this module',
            ADD COLUMN locked_reason    VARCHAR(500) NULL
                COMMENT 'Mandatory reason when SUPER_ADMIN locks a module',
            ADD COLUMN locked_at        DATETIME(3) NULL,
            ADD COLUMN disabled_at      DATETIME(3) NULL
                COMMENT 'When the Owner last disabled this module',
            ADD CONSTRAINT fk_org_module_locked_by
                FOREIGN KEY (locked_by_admin) REFERENCES account(id)
                ON DELETE SET NULL;
    END IF;
END$
CALL mems_add_org_module_lock_cols()$
DROP PROCEDURE IF EXISTS mems_add_org_module_lock_cols$

DELIMITER ;

-- ---------------------------------------------------------------------------
-- 3. Module legacy map table (Q-03).
--    Maps old module codes to their canonical replacement; used by guard to
--    resolve legacy codes without deleting historical data.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS module_legacy_map (
    legacy_code     VARCHAR(60) NOT NULL,
    canonical_code  VARCHAR(60) NOT NULL,
    migrated_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (legacy_code),
    CONSTRAINT fk_module_legacy_canonical
        FOREIGN KEY (canonical_code) REFERENCES module(code)
) ENGINE=InnoDB COMMENT='Maps deprecated module codes to canonical ones (Q-03)';

INSERT INTO module_legacy_map (legacy_code, canonical_code) VALUES
    ('ROOM_MANAGEMENT',      'FACILITY_MANAGEMENT'),
    ('EQUIPMENT_MANAGEMENT', 'FACILITY_MANAGEMENT')
ON DUPLICATE KEY UPDATE canonical_code = VALUES(canonical_code);

-- ---------------------------------------------------------------------------
-- 4. Backfill: orgs that have an active ROOM_MANAGEMENT or EQUIPMENT_MANAGEMENT
--    row should also have an active FACILITY_MANAGEMENT row (additive, no deletion).
-- ---------------------------------------------------------------------------
INSERT INTO organization_module (org_id, module_code, status)
SELECT DISTINCT om.org_id, 'FACILITY_MANAGEMENT', 'active'
FROM organization_module om
WHERE om.module_code IN ('ROOM_MANAGEMENT', 'EQUIPMENT_MANAGEMENT')
  AND om.status = 'active'
  AND NOT EXISTS (
      SELECT 1 FROM organization_module x
      WHERE x.org_id = om.org_id AND x.module_code = 'FACILITY_MANAGEMENT'
  )
ON DUPLICATE KEY UPDATE status = 'active';

-- ---------------------------------------------------------------------------
-- Verification queries (run manually):
-- SELECT code, name, is_core, is_active FROM module ORDER BY is_core DESC, code;
-- SELECT org_id, module_code, status, locked_by_admin FROM organization_module ORDER BY org_id, module_code;
-- SELECT * FROM module_legacy_map;
-- ---------------------------------------------------------------------------
