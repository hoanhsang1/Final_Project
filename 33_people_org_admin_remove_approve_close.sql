-- MEMS / People Service / migration 33
-- Removes the leftover class.approve_close grant from "Quản trị viên tổ chức".
--
-- Rationale: DEC-02 / kế hoạch v2 §0.3 — class closure is approved only by the
-- head of the responsible department, a delegated General Manager or the Owner
-- (ClassApprovalPolicy). Earlier seeding gave the organization-admin position the
-- whole catalog, so existing databases still carry the direct grant even though
-- DefaultPositionSeeder and PermissionCatalog were corrected.
--
-- Idempotent. Only the organization-admin position is touched: "Trưởng phòng ban"
-- keeps class.approve_close because ClassApprovalPolicy relies on that permission.
-- Migration 30 removes the same permission from the ACADEMIC_MANAGEMENT bundle in
-- mems_identity_db; both are required because the grant can arrive by either path.
USE mems_people_db;

DELIMITER $
DROP PROCEDURE IF EXISTS mems_m33_remove_org_admin_approve_close$
CREATE PROCEDURE mems_m33_remove_org_admin_approve_close()
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = DATABASE() AND table_name = 'position_permission')
       AND EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = DATABASE() AND table_name = 'position') THEN
        DELETE pp FROM position_permission pp
        JOIN `position` p ON p.id = pp.position_id
        WHERE LOWER(TRIM(p.name)) IN ('quản trị viên tổ chức', 'quan tri vien to chuc')
          AND pp.permission_code = 'class.approve_close';
    END IF;
END$
CALL mems_m33_remove_org_admin_approve_close()$
DROP PROCEDURE IF EXISTS mems_m33_remove_org_admin_approve_close$
DELIMITER ;

-- Verification (expect 0 rows):
-- SELECT p.name, pp.permission_code
--   FROM position_permission pp
--   JOIN `position` p ON p.id = pp.position_id
--  WHERE pp.permission_code = 'class.approve_close';
-- Expect only "Trưởng phòng ban" rows to remain.
