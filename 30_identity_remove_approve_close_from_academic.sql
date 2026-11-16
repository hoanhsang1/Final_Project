-- MEMS / Identity Service / migration 30
-- BE-00.3 / DEC-02: giáo vụ (ACADEMIC_MANAGEMENT) must not approve class closure.
-- Removes class.approve_close from the ACADEMIC_MANAGEMENT bundle.
-- Direct grants (OWNER, ORG_OWNER, SUPER_ADMIN, head positions) are untouched.
-- Idempotent and no-op when the bundle tables do not exist yet.
USE mems_identity_db;

DELIMITER $
DROP PROCEDURE IF EXISTS mems_m30_remove_approve_close$
CREATE PROCEDURE mems_m30_remove_approve_close()
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = 'permission_bundle_item'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = 'permission_bundle'
    ) THEN
        DELETE FROM permission_bundle_item
        WHERE permission_code = 'class.approve_close'
          AND bundle_id IN (
              SELECT id FROM permission_bundle WHERE code = 'ACADEMIC_MANAGEMENT'
          );
    END IF;
END$
CALL mems_m30_remove_approve_close()$
DROP PROCEDURE IF EXISTS mems_m30_remove_approve_close$
DELIMITER ;

-- Verification (0 rows expected):
-- SELECT pbi.* FROM permission_bundle_item pbi
-- JOIN permission_bundle pb ON pb.id = pbi.bundle_id
-- WHERE pb.code = 'ACADEMIC_MANAGEMENT' AND pbi.permission_code = 'class.approve_close';
