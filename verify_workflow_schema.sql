-- MEMS / read-only verification for migrations 28-33.
-- Run manually against the test environment AFTER applying the migrations.
-- Every query is SELECT-only; nothing here changes data.
--
-- Usage:
--   mysql -h <host> -P <port> -u <user> -p < verify_workflow_schema.sql

-- ===========================================================================
-- 1. mems_identity_db
-- ===========================================================================
USE mems_identity_db;

-- 1.1 module.is_core exists and has the DEC-01 values.
SELECT code, name, is_active, is_core
FROM module
ORDER BY is_core DESC, code;
-- Expected: STUDENT/TEACHER/CLASS/SCHEDULE_MANAGEMENT is_core=1;
--           FACILITY/ROOM/EQUIPMENT_MANAGEMENT is_core=0.

-- 1.2 organization_module supports disabled/locked and the lock bookkeeping.
SELECT column_name, column_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'organization_module'
  AND column_name IN ('status','disabled_at','locked_by_admin','locked_reason',
                      'locked_at','status_before_lock')
ORDER BY column_name;
-- Expected: 6 rows; status is varchar(20), the rest nullable.

-- 1.3 No organization_module row carries an unknown status.
SELECT status, COUNT(*) AS rows_count
FROM organization_module
GROUP BY status;
-- Expected statuses only: requested, active, rejected, disabled, locked.

-- 1.4 Legacy module mapping is present.
SELECT legacy_code, canonical_code
FROM module_legacy_map
ORDER BY legacy_code;
-- Expected: ROOM_MANAGEMENT and EQUIPMENT_MANAGEMENT -> FACILITY_MANAGEMENT.

-- 1.5 Orgs that still hold a legacy module but no canonical FACILITY_MANAGEMENT
--     row (Q-03 decision: rows are intentionally not merged).
SELECT DISTINCT om.org_id
FROM organization_module om
WHERE om.module_code IN ('ROOM_MANAGEMENT','EQUIPMENT_MANAGEMENT')
  AND NOT EXISTS (SELECT 1 FROM organization_module x
                  WHERE x.org_id = om.org_id
                    AND x.module_code = 'FACILITY_MANAGEMENT');

-- 1.6 The leftover class.approve_close must be gone from ACADEMIC_MANAGEMENT.
--     Guarded because databases bootstrapped from DB_11_16.sql have no bundle tables.
SET @has_bundles = (SELECT COUNT(*) FROM information_schema.tables
                    WHERE table_schema = DATABASE()
                      AND table_name IN ('permission_bundle','permission_bundle_item'));
SET @sql = IF(@has_bundles = 2,
  'SELECT b.code AS bundle_code, i.permission_code
     FROM permission_bundle b
     JOIN permission_bundle_item i ON i.bundle_id = b.id
    WHERE b.code = ''ACADEMIC_MANAGEMENT''
      AND i.permission_code = ''class.approve_close''',
  'SELECT ''permission_bundle absent on this database (expected 0 grants)'' AS note');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- Expected: 0 rows, or the "absent" note.

-- 1.7 class.approve_close still exists in the catalog.
SELECT code, module_code, allowed_scopes
FROM permission
WHERE code = 'class.approve_close';
-- Expected: 1 row.

-- 1.8 Permission bundle tables exist (35_identity_permission_bundle_tables.sql).
SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN ('permission_bundle','permission_bundle_item')
ORDER BY table_name;
-- Expected: 2 rows.

-- ===========================================================================
-- 2. mems_people_db
-- ===========================================================================
USE mems_people_db;

-- 2.1 Workflow tables exist.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN ('assignment','position_bundle','notification','transfer_request',
                     'transfer_approval','resignation_request','delegation',
                     'delegation_permission')
ORDER BY table_name;
-- Expected: 8 rows.

-- 2.2 Constraints created by migration 32.
SELECT table_name, constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE constraint_schema = DATABASE()
  AND table_name IN ('assignment','position_bundle','transfer_request','transfer_approval',
                     'resignation_request','delegation','delegation_permission')
  AND constraint_type IN ('CHECK','FOREIGN KEY')
ORDER BY table_name, constraint_name;
-- Expected: chk_assignment_scope/status, chk_transfer_status,
--           chk_transfer_step/decision, chk_resignation_status,
--           chk_delegation_status/scope/window and the four FKs.

-- 2.3 Indexes used by the workflow queries.
SELECT table_name, index_name, GROUP_CONCAT(column_name ORDER BY seq_in_index) AS cols
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND table_name IN ('assignment','notification','transfer_request','transfer_approval',
                     'resignation_request','delegation','school_class')
  AND index_name IN ('idx_assignment_user_org_status','idx_assignment_position',
                     'idx_notification_unread','idx_transfer_org_status','idx_transfer_user',
                     'idx_transfer_requester','idx_transfer_approval_pending',
                     'idx_resignation_user_status','idx_delegation_delegator',
                     'idx_school_class_reassignment')
GROUP BY table_name, index_name
ORDER BY table_name, index_name;
-- Expected: 10 rows.

-- 2.4 No orphan rows for the new foreign keys.
SELECT 'assignment.position_id' AS relation, COUNT(*) AS orphans
FROM assignment a LEFT JOIN `position` p ON p.id = a.position_id
WHERE a.position_id IS NOT NULL AND p.id IS NULL
UNION ALL
SELECT 'position_bundle.position_id', COUNT(*)
FROM position_bundle b LEFT JOIN `position` p ON p.id = b.position_id
WHERE b.position_id IS NOT NULL AND p.id IS NULL
UNION ALL
SELECT 'transfer_approval.request_id', COUNT(*)
FROM transfer_approval ta LEFT JOIN transfer_request tr ON tr.id = ta.request_id
WHERE ta.request_id IS NOT NULL AND tr.id IS NULL
UNION ALL
SELECT 'delegation_permission.delegation_id', COUNT(*)
FROM delegation_permission dp LEFT JOIN delegation d ON d.id = dp.delegation_id
WHERE dp.delegation_id IS NOT NULL AND d.id IS NULL;
-- Expected: 0 for all four rows.

-- 2.5 Duplicate transfer approval steps (unique key must prevent this).
SELECT request_id, step, COUNT(*) AS rows_count
FROM transfer_approval
GROUP BY request_id, step
HAVING COUNT(*) > 1;
-- Expected: 0 rows.

-- 2.6 More than one ACTIVE assignment for the same user/position.
SELECT org_id, user_id, position_id, COUNT(*) AS active_count
FROM assignment
WHERE status = 'ACTIVE'
GROUP BY org_id, user_id, position_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows.

-- 2.7 Delegations that are ACTIVE but already outside their window.
SELECT id, org_id, delegate_id, effective_from, effective_to
FROM delegation
WHERE status = 'ACTIVE'
  AND (effective_from > CURRENT_TIMESTAMP(3)
       OR (effective_to IS NOT NULL AND effective_to < CURRENT_TIMESTAMP(3)));
-- Expected: 0 rows (expired rows should be REVOKED by the service).

-- 2.8 class.approve_close must remain only on "Trưởng phòng ban".
SELECT p.name, pp.permission_code, COUNT(*) AS grants
FROM position_permission pp
JOIN `position` p ON p.id = pp.position_id
WHERE pp.permission_code = 'class.approve_close'
GROUP BY p.name, pp.permission_code;
-- Expected: only "Trưởng phòng ban"; no "Quản trị viên tổ chức".

-- 2.9 school_class columns required by the close/cancel workflow.
SELECT column_name, column_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'school_class'
  AND column_name IN ('cancel_state','cancel_request_reason','cancel_requested_by',
                      'close_requested_by','needs_reassignment','reassignment_reason')
ORDER BY column_name;
-- Expected: 6 rows; cancel_state default NONE, needs_reassignment default 0.

-- 2.10 class_close_event action check accepts the cancel workflow values.
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = DATABASE()
  AND constraint_name IN ('chk_class_close_event_action','chk_school_class_cancel_state');
-- Expected: both constraints, action list includes CANCEL_REQUESTED/APPROVED/REJECTED.

-- 2.11 Pending workflows that must block disabling STUDENT_MANAGEMENT.
SELECT 'transfer_request' AS source, COUNT(*) AS pending
FROM transfer_request WHERE status = 'PENDING'
UNION ALL
SELECT 'resignation_request', COUNT(*)
FROM resignation_request WHERE status = 'PENDING'
UNION ALL
SELECT 'school_class.cancel_state', COUNT(*)
FROM school_class WHERE cancel_state = 'PENDING';

-- 2.12 Prerequisite columns restored by migration 34.
SELECT table_name, column_name, column_type, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND ((table_name = 'position'
        AND column_name IN ('scope','department_id','deleted_at'))
    OR (table_name = 'department_member'
        AND column_name IN ('status','resigned_at')))
ORDER BY table_name, column_name;
-- Expected: 5 rows; position.scope default DEPARTMENT,
--           department_member.status default ACTIVE.

-- 2.13 Every existing member starts in a valid status.
SELECT status, COUNT(*) AS members
FROM department_member
GROUP BY status;
-- Expected: only ACTIVE or RESIGNED.
