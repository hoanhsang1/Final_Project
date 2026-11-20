-- MEMS / Identity Service / migration 44
-- Item 9: the frontend already exposed `teacher.change_status`, but the
-- permission did not exist in the backend catalog, so the UI could not gate a
-- real API and unauthorized direct calls had nothing to reject.
--
-- This adds the canonical permission + HR bundle membership for databases that
-- are upgraded before the new Identity image starts. Idempotent.
USE mems_identity_db;

INSERT INTO permission(code, description, module_code, allowed_scopes)
VALUES ('teacher.change_status', 'Change a teacher''s teaching status', NULL,
        'DEPARTMENT,ORGANIZATION')
ON DUPLICATE KEY UPDATE description = VALUES(description),
    module_code = VALUES(module_code), allowed_scopes = VALUES(allowed_scopes);

INSERT INTO role_permission(role_id, permission_id)
SELECT r.id, p.id
FROM role r JOIN permission p ON p.code = 'teacher.change_status'
WHERE r.code IN ('OWNER', 'ORG_OWNER', 'SUPER_ADMIN')
  AND NOT EXISTS (SELECT 1 FROM role_permission rp
                  WHERE rp.role_id = r.id AND rp.permission_id = p.id);

INSERT INTO permission_bundle_item(bundle_id, permission_code)
SELECT b.id, 'teacher.change_status'
FROM permission_bundle b
WHERE b.code = 'HR_MANAGEMENT'
  AND NOT EXISTS (SELECT 1 FROM permission_bundle_item i
                  WHERE i.bundle_id = b.id AND i.permission_code = 'teacher.change_status');

-- Verification:
-- SELECT code, module_code, allowed_scopes FROM permission WHERE code='teacher.change_status';
-- SELECT b.code FROM permission_bundle b JOIN permission_bundle_item i ON i.bundle_id=b.id
--   WHERE i.permission_code='teacher.change_status';
