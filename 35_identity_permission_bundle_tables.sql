-- MEMS / Identity Service / migration 35
-- Restores the permission bundle tables from 16_identity_permission_foundation.sql,
-- which are missing from DB_11_16.sql. IdentityDataInitializer writes to these
-- tables at startup, so a database bootstrapped from the snapshot cannot boot
-- without them.
--
-- Bundle rows are seeded by IdentityDataInitializer from PermissionCatalog
-- (which already excludes class.approve_close from ACADEMIC_MANAGEMENT), so this
-- migration only creates the structure. Idempotent.
USE mems_identity_db;

CREATE TABLE IF NOT EXISTS permission_bundle (
    id CHAR(36) PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description VARCHAR(1000) NULL,
    allowed_scopes VARCHAR(200) NOT NULL DEFAULT 'ORGANIZATION,DEPARTMENT',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_permission_bundle_code (code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permission_bundle_item (
    bundle_id CHAR(36) NOT NULL,
    permission_code VARCHAR(100) NOT NULL,
    PRIMARY KEY (bundle_id, permission_code),
    CONSTRAINT fk_permission_bundle_item_bundle FOREIGN KEY (bundle_id)
        REFERENCES permission_bundle (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Verification:
-- SHOW TABLES LIKE 'permission_bundle%';
-- SELECT b.code, COUNT(i.permission_code) FROM permission_bundle b
--   LEFT JOIN permission_bundle_item i ON i.bundle_id=b.id GROUP BY b.code;
