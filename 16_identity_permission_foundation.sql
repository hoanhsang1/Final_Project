-- MEMS / Identity Service / Phần 1: nền tảng phân quyền
-- Target DB: mems_identity_db (MySQL 8.0.16+)
--
-- Prerequisites: 01_identity_db.sql, 05_seed_admin.sql, 10_identity_permission_module.sql,
--                14_identity_sprint4_permissions.sql.
-- Safe to run repeatedly: existence checks + INSERT ... ON DUPLICATE KEY UPDATE.
-- No DROP TABLE / DROP DATABASE / data reset. Các mã quyền CŨ được giữ nguyên
-- (không xoá) để dữ liệu lịch sử và các role hệ thống cũ vẫn đọc được; hệ thống
-- chỉ dùng mã mới dạng <module>.<resource>.<action>.
--
-- How to run:
--   mysql -h <host> -P <port> -u <user> -p < 16_identity_permission_foundation.sql

USE mems_identity_db;

DELIMITER $

DROP PROCEDURE IF EXISTS mems_pf_identity_add_allowed_scopes$
CREATE PROCEDURE mems_pf_identity_add_allowed_scopes()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'permission'
          AND column_name = 'allowed_scopes'
    ) THEN
        ALTER TABLE permission ADD COLUMN allowed_scopes VARCHAR(200) NULL;
    END IF;
END$

CALL mems_pf_identity_add_allowed_scopes()$
DROP PROCEDURE IF EXISTS mems_pf_identity_add_allowed_scopes$

DELIMITER ;

-- ---------------------------------------------------------------------------
-- 1. Danh mục quyền dạng <module>.<resource>.<action>.
--    module_code = NULL giữ nguyên hành vi cũ (không bị chặn theo module phòng
--    ban). TODO(Phần module): tách HR_MANAGEMENT / SCHEDULE_MANAGEMENT /
--    FACILITY_MANAGEMENT thành module riêng và bật cho tổ chức/phòng ban.
-- ---------------------------------------------------------------------------
INSERT INTO permission(code, description, module_code, allowed_scopes) VALUES
-- Quản lý nhân sự
('employee.view', 'View employees', NULL, 'ORGANIZATION,DEPARTMENT'),
('employee.create', 'Create employees', NULL, 'ORGANIZATION,DEPARTMENT'),
('employee.edit', 'Edit employee profiles', NULL, 'ORGANIZATION,DEPARTMENT'),
('employee.delete', 'Remove employees', NULL, 'ORGANIZATION,DEPARTMENT'),
('employee.reset_password', 'Reset employee passwords', NULL, 'ORGANIZATION,DEPARTMENT'),
('employee.assign_position', 'Assign positions to employees', NULL, 'ORGANIZATION,DEPARTMENT'),
('position.view', 'View positions', NULL, 'ORGANIZATION,DEPARTMENT'),
('position.manage', 'Create, update and delete positions', NULL, 'ORGANIZATION,DEPARTMENT'),
('department.view', 'View departments', NULL, 'ORGANIZATION,DEPARTMENT'),
('department.manage', 'Create, update and delete departments', NULL, 'ORGANIZATION'),
-- Quản lý đào tạo học sinh / lớp
('student.view', 'View students', 'STUDENT_MANAGEMENT', 'ORGANIZATION'),
('student.create', 'Create students', 'STUDENT_MANAGEMENT', 'ORGANIZATION'),
('student.edit', 'Edit students', 'STUDENT_MANAGEMENT', 'ORGANIZATION'),
('student.delete', 'Delete students', 'STUDENT_MANAGEMENT', 'ORGANIZATION'),
('class.view', 'View classes', 'STUDENT_MANAGEMENT', 'ORGANIZATION'),
('class.create', 'Create classes', 'STUDENT_MANAGEMENT', 'ORGANIZATION'),
('class.edit', 'Edit classes', 'STUDENT_MANAGEMENT', 'ORGANIZATION'),
('class.delete', 'Delete classes', 'STUDENT_MANAGEMENT', 'ORGANIZATION'),
('class.assign_teacher', 'Assign teachers to classes', 'STUDENT_MANAGEMENT', 'ORGANIZATION'),
('class.cancel', 'Cancel classes', 'STUDENT_MANAGEMENT', 'ORGANIZATION'),
('class.request_close', 'Request class closure', 'STUDENT_MANAGEMENT', 'ORGANIZATION'),
('class.approve_close', 'Approve or reject class closure', 'STUDENT_MANAGEMENT', 'ORGANIZATION'),
('class.reopen', 'Reopen closed classes', 'STUDENT_MANAGEMENT', 'ORGANIZATION'),
-- Lịch học
('schedule.view', 'View department schedules', NULL, 'ORGANIZATION,DEPARTMENT'),
('schedule.create', 'Create department schedules', NULL, 'ORGANIZATION,DEPARTMENT'),
('schedule.edit', 'Edit department schedules', NULL, 'ORGANIZATION,DEPARTMENT'),
('schedule.delete', 'Delete department schedules', NULL, 'ORGANIZATION,DEPARTMENT'),
-- Cơ sở vật chất
('facility.view', 'View department facilities', NULL, 'ORGANIZATION,DEPARTMENT'),
('facility.manage', 'Manage department facilities', NULL, 'ORGANIZATION,DEPARTMENT')
ON DUPLICATE KEY UPDATE
    description = VALUES(description),
    module_code = VALUES(module_code),
    allowed_scopes = VALUES(allowed_scopes);

-- ---------------------------------------------------------------------------
-- 2. Chuyển grant của các role hệ thống cũ sang mã mới.
--    Đây là ánh xạ mã (migration), không phải xoá quyền của người dùng.
-- ---------------------------------------------------------------------------
INSERT INTO role_permission(role_id, permission_id)
SELECT rp.role_id, newp.id
FROM role_permission rp
JOIN permission oldp ON oldp.id = rp.permission_id
JOIN (
    SELECT 'PEOPLE_VIEW'           AS old_code, 'employee.view'            AS new_code
    UNION ALL SELECT 'STUDENT_VIEW',  'student.view'
    UNION ALL SELECT 'STUDENT_CREATE','student.create'
    UNION ALL SELECT 'STUDENT_EDIT',  'student.edit'
    UNION ALL SELECT 'STUDENT_DELETE','student.delete'
    UNION ALL SELECT 'CLASS_VIEW',    'class.view'
    UNION ALL SELECT 'CLASS_CREATE',  'class.create'
    UNION ALL SELECT 'CLASS_EDIT',    'class.edit'
    UNION ALL SELECT 'CLASS_DELETE',  'class.delete'
    UNION ALL SELECT 'CLASS_ASSIGN_TEACHER','class.assign_teacher'
    UNION ALL SELECT 'CLASS_CANCEL',  'class.cancel'
    UNION ALL SELECT 'CLASS_CLOSE_REQUEST','class.request_close'
    UNION ALL SELECT 'CLASS_CLOSE_APPROVE','class.approve_close'
    UNION ALL SELECT 'CLASS_REOPEN',  'class.reopen'
    UNION ALL SELECT 'SCHEDULE_VIEW', 'schedule.view'
    UNION ALL SELECT 'SCHEDULE_CREATE','schedule.create'
    UNION ALL SELECT 'FACILITY_MANAGE','facility.manage'
    UNION ALL SELECT 'FACILITY_MANAGE','facility.view'
) m ON m.old_code = oldp.code
JOIN permission newp ON newp.code = m.new_code
ON DUPLICATE KEY UPDATE permission_id = VALUES(permission_id);

-- PEOPLE_EDIT cũ tương đương toàn bộ nhóm thao tác nhân sự.
INSERT INTO role_permission(role_id, permission_id)
SELECT rp.role_id, newp.id
FROM role_permission rp
JOIN permission oldp ON oldp.id = rp.permission_id AND oldp.code = 'PEOPLE_EDIT'
JOIN (
    SELECT 'employee.view' AS new_code
    UNION ALL SELECT 'employee.create'
    UNION ALL SELECT 'employee.edit'
    UNION ALL SELECT 'employee.delete'
    UNION ALL SELECT 'employee.reset_password'
    UNION ALL SELECT 'employee.assign_position'
    UNION ALL SELECT 'position.view'
    UNION ALL SELECT 'position.manage'
    UNION ALL SELECT 'department.view'
) m ON 1 = 1
JOIN permission newp ON newp.code = m.new_code
ON DUPLICATE KEY UPDATE permission_id = VALUES(permission_id);

-- OWNER / ORG_OWNER / SUPER_ADMIN luôn có toàn bộ catalog mới ở tầng role.
INSERT INTO role_permission(role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN (
    'employee.view','employee.create','employee.edit','employee.delete',
    'employee.reset_password','employee.assign_position','position.view','position.manage',
    'department.view','department.manage',
    'student.view','student.create','student.edit','student.delete',
    'class.view','class.create','class.edit','class.delete','class.assign_teacher',
    'class.cancel','class.request_close','class.approve_close','class.reopen',
    'schedule.view','schedule.create','schedule.edit','schedule.delete',
    'facility.view','facility.manage'
)
WHERE r.code IN ('OWNER','ORG_OWNER','SUPER_ADMIN')
ON DUPLICATE KEY UPDATE permission_id = VALUES(permission_id);

-- ---------------------------------------------------------------------------
-- 3. Permission bundle — bộ quyền đặt tên, gắn được vào bất kỳ chức vụ nào.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permission_bundle (
    id CHAR(36) PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description VARCHAR(1000) NULL,
    allowed_scopes VARCHAR(200) NOT NULL DEFAULT 'ORGANIZATION,DEPARTMENT',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_permission_bundle_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permission_bundle_item (
    bundle_id CHAR(36) NOT NULL,
    permission_code VARCHAR(100) NOT NULL,
    PRIMARY KEY (bundle_id, permission_code),
    CONSTRAINT fk_permission_bundle_item_bundle FOREIGN KEY (bundle_id)
        REFERENCES permission_bundle (id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO permission_bundle(id, code, name, description, allowed_scopes, created_at)
SELECT UUID(), 'HR_MANAGEMENT', 'Quản lý nhân sự',
       'Quản lý nhân sự phạm vi tổ chức hoặc phòng ban', 'ORGANIZATION,DEPARTMENT', CURRENT_TIMESTAMP(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM permission_bundle WHERE code = 'HR_MANAGEMENT');

INSERT INTO permission_bundle(id, code, name, description, allowed_scopes, created_at)
SELECT UUID(), 'ACADEMIC_MANAGEMENT', 'Quản lý đào tạo học sinh',
       'Quản lý học sinh và lớp học', 'ORGANIZATION', CURRENT_TIMESTAMP(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM permission_bundle WHERE code = 'ACADEMIC_MANAGEMENT');

INSERT INTO permission_bundle(id, code, name, description, allowed_scopes, created_at)
SELECT UUID(), 'SCHEDULE_MANAGEMENT', 'Quản lý lịch học',
       'Quản lý lịch học của phòng ban', 'ORGANIZATION,DEPARTMENT', CURRENT_TIMESTAMP(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM permission_bundle WHERE code = 'SCHEDULE_MANAGEMENT');

INSERT INTO permission_bundle(id, code, name, description, allowed_scopes, created_at)
SELECT UUID(), 'FACILITY_MANAGEMENT', 'Quản lý cơ sở vật chất',
       'Quản lý phòng học và thiết bị', 'ORGANIZATION,DEPARTMENT', CURRENT_TIMESTAMP(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM permission_bundle WHERE code = 'FACILITY_MANAGEMENT');

INSERT INTO permission_bundle_item(bundle_id, permission_code)
SELECT b.id, p.code
FROM permission_bundle b
JOIN permission p ON p.code IN (
    'employee.view','employee.create','employee.edit','employee.delete',
    'employee.reset_password','employee.assign_position','position.view',
    'position.manage','department.view'
)
WHERE b.code = 'HR_MANAGEMENT'
ON DUPLICATE KEY UPDATE permission_code = VALUES(permission_code);

INSERT INTO permission_bundle_item(bundle_id, permission_code)
SELECT b.id, p.code
FROM permission_bundle b
JOIN permission p ON p.code IN (
    'student.view','student.create','student.edit','student.delete',
    'class.view','class.create','class.edit','class.delete','class.assign_teacher',
    'class.cancel','class.request_close','class.approve_close','class.reopen'
)
WHERE b.code = 'ACADEMIC_MANAGEMENT'
ON DUPLICATE KEY UPDATE permission_code = VALUES(permission_code);

INSERT INTO permission_bundle_item(bundle_id, permission_code)
SELECT b.id, p.code
FROM permission_bundle b
JOIN permission p ON p.code IN (
    'schedule.view','schedule.create','schedule.edit','schedule.delete'
)
WHERE b.code = 'SCHEDULE_MANAGEMENT'
ON DUPLICATE KEY UPDATE permission_code = VALUES(permission_code);

INSERT INTO permission_bundle_item(bundle_id, permission_code)
SELECT b.id, p.code
FROM permission_bundle b
JOIN permission p ON p.code IN ('facility.view','facility.manage')
WHERE b.code = 'FACILITY_MANAGEMENT'
ON DUPLICATE KEY UPDATE permission_code = VALUES(permission_code);

-- Verification queries (run manually):
-- SELECT code, module_code, allowed_scopes FROM permission ORDER BY code;
-- SELECT b.code, COUNT(i.permission_code) FROM permission_bundle b
--   LEFT JOIN permission_bundle_item i ON i.bundle_id=b.id GROUP BY b.code;
