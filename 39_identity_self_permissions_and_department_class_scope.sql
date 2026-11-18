-- MEMS / migration 39
-- Fixes role visibility for STUDENT/TEACHER and department-scoped class access.
--
-- 1) Identity: STUDENT and legacy TEACHER roles get the three SELF permissions even
--    on databases whose role_permission rows were never seeded. Self permissions are
--    allowed in both ORGANIZATION and DEPARTMENT scope so a department position can
--    carry them.
-- 2) Identity: class.view / class.reopen become DEPARTMENT-capable. PeopleService
--    filters class lists by the caller's department when the token only carries a
--    DEPARTMENT scope (SchoolClassService/ClassStatusService).
-- 3) People: default positions are corrected so teachers use the self contract while
--    department heads and department HR keep department-scoped class visibility.
--
-- Idempotent and additive. Does not touch custom (renamed) positions.
-- Apply AFTER 38. Not applied automatically by any service.
SET NAMES utf8mb4;

USE mems_identity_db;

INSERT IGNORE INTO role(code, name, scope, description)
VALUES ('STUDENT', 'STUDENT', 'organization', 'Department access: STUDENT'),
       ('TEACHER', 'TEACHER', 'organization', 'Department access: TEACHER');

INSERT INTO permission(code, description, module_code, allowed_scopes)
VALUES ('student.self_view', 'View own student profile', NULL, 'DEPARTMENT,ORGANIZATION'),
       ('class.self_view', 'View own class', NULL, 'DEPARTMENT,ORGANIZATION'),
       ('schedule.self_view', 'View own schedule', NULL, 'DEPARTMENT,ORGANIZATION')
ON DUPLICATE KEY UPDATE
    module_code = VALUES(module_code),
    allowed_scopes = VALUES(allowed_scopes);

UPDATE permission SET allowed_scopes = 'DEPARTMENT,ORGANIZATION'
WHERE code IN ('class.view', 'class.reopen');

INSERT IGNORE INTO role_permission(role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p
  ON p.code IN ('student.self_view', 'class.self_view', 'schedule.self_view')
WHERE r.code IN ('STUDENT', 'TEACHER');

USE mems_people_db;

-- Teacher: own profile/classes/schedule instead of organization-wide lists.
DELETE pp FROM position_permission pp
JOIN `position` p ON p.id = pp.position_id
WHERE LOWER(TRIM(p.name)) IN ('giáo viên', 'giao vien')
  AND pp.permission_code IN ('class.view', 'student.view', 'schedule.view');

INSERT IGNORE INTO position_permission(position_id, permission_code)
SELECT p.id, perms.code
FROM `position` p
JOIN (
    SELECT 'class.self_view' AS code
    UNION ALL SELECT 'schedule.self_view'
) perms ON 1 = 1
WHERE LOWER(TRIM(p.name)) IN ('giáo viên', 'giao vien');

-- Department head: department class view + schedule view + self contract.
INSERT IGNORE INTO position_permission(position_id, permission_code)
SELECT p.id, perms.code
FROM `position` p
JOIN (
    SELECT 'class.self_view' AS code
    UNION ALL SELECT 'schedule.view'
    UNION ALL SELECT 'schedule.self_view'
) perms ON 1 = 1
WHERE LOWER(TRIM(p.name)) IN ('trưởng phòng ban', 'truong phong ban');

-- Department HR: class view now surfaces class students; keep the self contract too.
DELETE pp FROM position_permission pp
JOIN `position` p ON p.id = pp.position_id
WHERE LOWER(TRIM(p.name)) IN ('nhân sự phòng ban', 'nhan su phong ban')
  AND pp.permission_code = 'student.view';

INSERT IGNORE INTO position_permission(position_id, permission_code)
SELECT p.id, perms.code
FROM `position` p
JOIN (
    SELECT 'class.self_view' AS code
    UNION ALL SELECT 'schedule.self_view'
) perms ON 1 = 1
WHERE LOWER(TRIM(p.name)) IN ('nhân sự phòng ban', 'nhan su phong ban');

-- Verification:
-- USE mems_identity_db;
-- SELECT code, allowed_scopes FROM permission
--  WHERE code IN ('class.view','class.reopen','class.self_view','schedule.self_view');
-- SELECT r.code, p.code FROM role_permission rp
--  JOIN role r ON r.id=rp.role_id JOIN permission p ON p.id=rp.permission_id
--  WHERE r.code IN ('STUDENT','TEACHER');
-- USE mems_people_db;
-- SELECT p.name, pp.permission_code FROM position_permission pp
--  JOIN `position` p ON p.id=pp.position_id
--  WHERE LOWER(TRIM(p.name)) IN ('giáo viên','trưởng phòng ban','nhân sự phòng ban')
--  ORDER BY p.name, pp.permission_code;
