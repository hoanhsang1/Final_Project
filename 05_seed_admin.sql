-- MEMS Identity bootstrap: roles, permissions and OPTIONAL platform administrator.
-- Execute AFTER 01_identity_db.sql. Do not use a shared default password.
USE mems_identity_db;

INSERT INTO role (code,name,scope,description) VALUES
 ('SUPER_ADMIN','System administrator','platform','Approves organizations and manages platform'),
 ('ORG_ADMIN','Organization manager','organization','Manages an organization'),
 ('ACADEMIC_STAFF','Academic staff','organization','Students, teachers, classes, schedules'),
 ('FACILITY_STAFF','Facility staff','organization','Rooms, equipment, incidents'),
 ('TEACHER','Teacher','organization','Teaching-related access'),
 ('STUDENT','Student','organization','Own learning-related access');

INSERT INTO permission (code,description) VALUES
 ('ORG_APPROVE','Approve/reject organizations'),
 ('ORG_MANAGE','Manage own organization'),
 ('ACCOUNT_MANAGE','Manage organization accounts and roles'),
 ('MODULE_MANAGE','Manage enabled modules'),
 ('PEOPLE_READ','Read people profiles'),
 ('PEOPLE_WRITE','Manage people profiles'),
 ('CLASS_READ','Read classes'),
 ('CLASS_WRITE','Manage classes and enrollment'),
 ('SCHEDULE_READ','Read schedules'),
 ('SCHEDULE_WRITE','Manage schedules and assignments'),
 ('FACILITY_READ','Read facilities and equipment'),
 ('FACILITY_WRITE','Manage facilities and equipment'),
 ('INCIDENT_CREATE','Report equipment incidents'),
 ('INCIDENT_MANAGE','Resolve equipment incidents'),
 ('REPORT_READ','Read management reports');

-- Platform admin gets all permissions. Service layer still applies tenant/module policies.
INSERT INTO role_permission (role_id,permission_id)
SELECT r.id,p.id FROM role r CROSS JOIN permission p WHERE r.code='SUPER_ADMIN';

-- Organization admin: all org-scoped permissions, excluding platform approval.
INSERT INTO role_permission (role_id,permission_id)
SELECT r.id,p.id FROM role r CROSS JOIN permission p
WHERE r.code='ORG_ADMIN' AND p.code<>'ORG_APPROVE';

INSERT INTO role_permission (role_id,permission_id)
SELECT r.id,p.id FROM role r JOIN permission p
ON p.code IN ('PEOPLE_READ','PEOPLE_WRITE','CLASS_READ','CLASS_WRITE','SCHEDULE_READ','SCHEDULE_WRITE','REPORT_READ')
WHERE r.code='ACADEMIC_STAFF';

INSERT INTO role_permission (role_id,permission_id)
SELECT r.id,p.id FROM role r JOIN permission p
ON p.code IN ('FACILITY_READ','FACILITY_WRITE','INCIDENT_CREATE','INCIDENT_MANAGE')
WHERE r.code='FACILITY_STAFF';

INSERT INTO role_permission (role_id,permission_id)
SELECT r.id,p.id FROM role r JOIN permission p
ON p.code IN ('CLASS_READ','SCHEDULE_READ','INCIDENT_CREATE')
WHERE r.code='TEACHER';

INSERT INTO role_permission (role_id,permission_id)
SELECT r.id,p.id FROM role r JOIN permission p
ON p.code IN ('CLASS_READ','SCHEDULE_READ','INCIDENT_CREATE')
WHERE r.code='STUDENT';

INSERT INTO role (code, name, scope)
VALUES ('ORG_OWNER', 'Organization Owner', 'organization');

INSERT INTO module (code, name, is_active)
VALUES
('STUDENT_MANAGEMENT', 'Quản lý học sinh', TRUE),
('TEACHER_MANAGEMENT', 'Quản lý giáo viên', TRUE),
('CLASS_MANAGEMENT', 'Quản lý lớp học', TRUE),
('SCHEDULE_MANAGEMENT', 'Quản lý lịch học', TRUE),
('ROOM_MANAGEMENT', 'Quản lý phòng học', TRUE),
('EQUIPMENT_MANAGEMENT', 'Quản lý thiết bị', TRUE)
ON DUPLICATE KEY UPDATE
    name = VALUES(name);

-- ADMIN BOOTSTRAP (optional):
-- 1. Generate a UNIQUE BCrypt hash with Spring Security BCryptPasswordEncoder.
-- 2. Replace the placeholder below with that hash and uncomment the statements.
-- 3. Use a strong unique password; rotate it after first login.
--    Do not commit a real password/hash into Git.
INSERT INTO account (id,org_id,username,email,password_hash,status)
 VALUES (UUID(),NULL,'platform_admin','admin@your-domain.example','$2a$10$UsjFg5cwZ4pju1rQprE03.BdbcZaRbB.zG0sZziwyYpo4WMpty5Ai','active');
INSERT INTO account_role (account_id,role_id)
 SELECT a.id,r.id FROM account a JOIN role r ON r.code='SUPER_ADMIN'
WHERE a.username='platform_admin';

-- For a demo organization, create an organization in 'pending' and an ORG_ADMIN
-- account scoped to it; approval should be done via the application workflow.
