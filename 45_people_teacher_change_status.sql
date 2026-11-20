-- MEMS / People Service / migration 45
-- Item 9: backfill `teacher.change_status` onto the existing default HR
-- positions. New organizations receive it from DefaultPositionSeeder; this
-- file only repairs databases seeded before the permission was introduced.
--
-- Idempotent and additive. No position, assignment or permission is removed.
-- Apply to mems_people_db after the Identity permission row exists (migration 44).
USE mems_people_db;

INSERT INTO position_permission(position_id, permission_code)
SELECT p.id, 'teacher.change_status'
FROM `position` p
WHERE p.deleted_at IS NULL
  AND p.name IN ('Quản trị viên tổ chức', 'Nhân sự phòng ban')
  AND NOT EXISTS (SELECT 1 FROM position_permission pp
                  WHERE pp.position_id = p.id
                    AND pp.permission_code = 'teacher.change_status');

-- Verification:
-- SELECT p.org_id, p.name, COUNT(*) FROM `position` p
-- JOIN position_permission pp ON pp.position_id=p.id
-- WHERE pp.permission_code='teacher.change_status' GROUP BY p.org_id, p.name;
