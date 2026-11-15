-- MEMS / Identity Service / Phần 5: quyền học sinh + lớp học
-- Target DB: mems_identity_db (MySQL 8.0.16+)
--
-- Prerequisites: 01_identity_db.sql, 05_seed_admin.sql, 16_identity_permission_foundation.sql,
--                22_identity_transfer_permissions.sql.
-- Safe to run repeatedly: INSERT ... ON DUPLICATE KEY UPDATE; không xoá dữ liệu.
--
-- How to run:
--   mysql -h <host> -P <port> -u <user> -p < 24_identity_student_class_permissions.sql

USE mems_identity_db;

-- ---------------------------------------------------------------------------
-- 1. Quyền quản trị mới (bundle Quản lý đào tạo).
--    - student.create_account: tạo tài khoản đăng nhập cho hồ sơ học sinh.
--    - class.teacher.reassign: gán lại giáo viên cho lớp đang gắn nhãn.
-- ---------------------------------------------------------------------------
INSERT INTO permission(code, description, module_code, allowed_scopes) VALUES
('student.create_account', 'Create login accounts for student profiles', 'STUDENT_MANAGEMENT', 'ORGANIZATION'),
('class.teacher.reassign', 'Reassign a class to another teacher', 'STUDENT_MANAGEMENT', 'ORGANIZATION')
ON DUPLICATE KEY UPDATE
    description = VALUES(description),
    module_code = VALUES(module_code),
    allowed_scopes = VALUES(allowed_scopes);

-- ---------------------------------------------------------------------------
-- 2. Quyền SELF cho vai trò STUDENT: chỉ đọc dữ liệu của chính mình.
--    module_code = NULL vì đây là quyền theo vai trò, không gắn phòng ban.
-- ---------------------------------------------------------------------------
INSERT INTO permission(code, description, module_code, allowed_scopes) VALUES
('student.self_view', 'View own student profile', NULL, 'ORGANIZATION'),
('class.self_view', 'View own class', NULL, 'ORGANIZATION'),
('schedule.self_view', 'View own schedule', NULL, 'ORGANIZATION')
ON DUPLICATE KEY UPDATE
    description = VALUES(description),
    module_code = VALUES(module_code),
    allowed_scopes = VALUES(allowed_scopes);

-- ---------------------------------------------------------------------------
-- 3. Bổ sung bundle ACADEMIC_MANAGEMENT.
-- ---------------------------------------------------------------------------
INSERT INTO permission_bundle_item(bundle_id, permission_code)
SELECT b.id, m.code
FROM permission_bundle b
JOIN (
    SELECT 'student.create_account' AS code
    UNION ALL SELECT 'class.teacher.reassign'
) m ON 1 = 1
WHERE b.code = 'ACADEMIC_MANAGEMENT'
ON DUPLICATE KEY UPDATE permission_code = VALUES(permission_code);

-- ---------------------------------------------------------------------------
-- 4. Role hệ thống.
--    OWNER/ORG_OWNER/SUPER_ADMIN: toàn bộ quyền quản trị mới.
--    STUDENT: chỉ ba quyền SELF (không tự đăng ký, không đọc dữ liệu người khác).
-- ---------------------------------------------------------------------------
INSERT INTO role_permission(role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN ('student.create_account', 'class.teacher.reassign',
                                'student.self_view', 'class.self_view', 'schedule.self_view')
WHERE r.code IN ('OWNER', 'ORG_OWNER', 'SUPER_ADMIN')
ON DUPLICATE KEY UPDATE permission_id = VALUES(permission_id);

INSERT INTO role_permission(role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN ('student.self_view', 'class.self_view', 'schedule.self_view')
WHERE r.code = 'STUDENT'
ON DUPLICATE KEY UPDATE permission_id = VALUES(permission_id);

-- Verification queries (run manually):
-- SELECT code, module_code, allowed_scopes FROM permission
--   WHERE code IN ('student.create_account','class.teacher.reassign',
--                  'student.self_view','class.self_view','schedule.self_view');
-- SELECT r.code, p.code FROM role_permission rp
--   JOIN role r ON r.id=rp.role_id JOIN permission p ON p.id=rp.permission_id
--   WHERE r.code='STUDENT' ORDER BY p.code;
