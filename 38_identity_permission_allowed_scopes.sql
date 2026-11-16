-- MEMS / Identity Service / migration 38
-- Restores permission.allowed_scopes from 16_identity_permission_foundation.sql.
-- DB_11_16.sql predates that migration, and IdentityDataInitializer writes this
-- column on every startup, so the service cannot boot without it.
--
-- Idempotent and additive. Existing permission rows keep NULL (interpreted by the
-- services as "both scopes allowed").
USE mems_identity_db;

DELIMITER $
DROP PROCEDURE IF EXISTS mems_m38_add_allowed_scopes$
CREATE PROCEDURE mems_m38_add_allowed_scopes()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'permission'
          AND column_name = 'allowed_scopes'
    ) THEN
        ALTER TABLE permission ADD COLUMN allowed_scopes VARCHAR(200) NULL;
    END IF;
END$
CALL mems_m38_add_allowed_scopes()$
DROP PROCEDURE IF EXISTS mems_m38_add_allowed_scopes$
DELIMITER ;

-- Verification:
-- SHOW COLUMNS FROM permission LIKE 'allowed_scopes';
