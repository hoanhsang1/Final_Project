-- MEMS / People Service / migration 41
-- Trưởng phòng ban thiếu `employee.view` nên mọi API nhân sự theo phòng ban trả 403
-- ("Missing permission in scope: employee.view"). DefaultPositionSeeder đã được sửa,
-- nhưng seeder chỉ chạy một lần qua bảng position_seed, nên các tổ chức đã tồn tại
-- cần backfill riêng.
--
-- Phạm vi cấp: DEPARTMENT (position.scope='DEPARTMENT'). Không cấp
-- employee.create/edit/delete và không đổi scope lên ORGANIZATION.
-- Idempotent: chỉ chèn khi chưa có bản ghi; không xoá/sửa quyền tự tuỳ chỉnh khác.
USE mems_people_db;

INSERT INTO position_permission(position_id, permission_code)
SELECT p.id, 'employee.view'
FROM `position` p
WHERE LOWER(TRIM(p.name)) IN ('trưởng phòng ban', 'truong phong ban')
  AND p.scope = 'DEPARTMENT'
  AND NOT EXISTS (
      SELECT 1 FROM position_permission pp
      WHERE pp.position_id = p.id AND pp.permission_code = 'employee.view'
  );

-- Identity: `employee.view` phải hỗ trợ cả DEPARTMENT (khớp PermissionCatalog).
USE mems_identity_db;

INSERT INTO permission(code, description, module_code, allowed_scopes)
VALUES ('employee.view', 'View employees', NULL, 'DEPARTMENT,ORGANIZATION')
ON DUPLICATE KEY UPDATE allowed_scopes = 'DEPARTMENT,ORGANIZATION';

-- Verification:
-- USE mems_people_db;
-- SELECT p.id, p.name, p.scope, pp.permission_code
--   FROM `position` p LEFT JOIN position_permission pp
--     ON pp.position_id = p.id AND pp.permission_code = 'employee.view'
--  WHERE LOWER(TRIM(p.name)) IN ('trưởng phòng ban','truong phong ban');
-- USE mems_identity_db;
-- SELECT code, allowed_scopes FROM permission WHERE code = 'employee.view';
