-- MEMS / People Service / migration 43
-- Item 1 of the post-audit fix list: the menu and the department API disagreed.
-- Heads receive `employee.view`, so the menu shows "Phòng ban", but
-- GET /departments requires `department.view`. This backfills the missing
-- DEPARTMENT-scoped permission on existing head positions.
--
-- Idempotent and additive. No module state, role, assignment or row is removed.
-- Apply to mems_people_db.
USE mems_people_db;

INSERT INTO position_permission(position_id, permission_code)
SELECT p.id, 'department.view'
FROM `position` p
WHERE p.scope = 'DEPARTMENT'
  AND p.name IN ('Trưởng phòng', 'Trưởng phòng ban')
  AND EXISTS (SELECT 1 FROM `position` x
              WHERE x.id = p.id AND x.org_id = p.org_id AND x.deleted_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM position_permission pp
                  WHERE pp.position_id = p.id
                    AND pp.permission_code = 'department.view');

-- Verification:
-- SELECT p.org_id, p.name, COUNT(*) AS heads_with_department_view
-- FROM `position` p JOIN position_permission pp ON pp.position_id = p.id
-- WHERE p.scope = 'DEPARTMENT' AND p.name IN ('Trưởng phòng', 'Trưởng phòng ban')
--   AND pp.permission_code = 'department.view'
-- GROUP BY p.org_id, p.name;
