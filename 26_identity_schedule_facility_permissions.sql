-- MEMS / Identity Service / Phần 7: quyền chi tiết lịch học & cơ sở vật chất
-- Target DB: mems_identity_db (MySQL 8.0.16+)
--
-- Prerequisites: 01_identity_db.sql, 05_seed_admin.sql, 16_identity_permission_foundation.sql,
--                18_identity_department_modules.sql.
-- Safe to run repeatedly: INSERT ... ON DUPLICATE KEY UPDATE; không xoá dữ liệu.
--
-- How to run:
--   mysql -h <host> -P <port> -u <user> -p < 26_identity_schedule_facility_permissions.sql

USE mems_identity_db;

-- ---------------------------------------------------------------------------
-- 1. Mã quyền chi tiết. Giữ các mã cũ (schedule.edit, facility.view/manage)
--    để dữ liệu chức danh đã tạo không bị mất quyền.
-- ---------------------------------------------------------------------------
INSERT INTO permission(code, description, module_code, allowed_scopes) VALUES
('schedule.update', 'Update department schedules', 'SCHEDULE_MANAGEMENT', 'ORGANIZATION,DEPARTMENT'),
('schedule.cancel_session', 'Cancel a schedule session', 'SCHEDULE_MANAGEMENT', 'ORGANIZATION,DEPARTMENT'),
('facility.room.view', 'View rooms', 'FACILITY_MANAGEMENT', 'ORGANIZATION,DEPARTMENT'),
('facility.room.create', 'Create rooms', 'FACILITY_MANAGEMENT', 'ORGANIZATION,DEPARTMENT'),
('facility.room.update', 'Update rooms', 'FACILITY_MANAGEMENT', 'ORGANIZATION,DEPARTMENT'),
('facility.room.delete', 'Delete rooms', 'FACILITY_MANAGEMENT', 'ORGANIZATION,DEPARTMENT'),
('facility.equipment.view', 'View equipment', 'FACILITY_MANAGEMENT', 'ORGANIZATION,DEPARTMENT'),
('facility.equipment.create', 'Create equipment', 'FACILITY_MANAGEMENT', 'ORGANIZATION,DEPARTMENT'),
('facility.equipment.update', 'Update equipment', 'FACILITY_MANAGEMENT', 'ORGANIZATION,DEPARTMENT'),
('facility.equipment.delete', 'Delete equipment', 'FACILITY_MANAGEMENT', 'ORGANIZATION,DEPARTMENT'),
('facility.issue.report', 'Report facility issues', 'FACILITY_MANAGEMENT', 'ORGANIZATION,DEPARTMENT'),
('facility.issue.resolve', 'Resolve facility issues', 'FACILITY_MANAGEMENT', 'ORGANIZATION,DEPARTMENT')
ON DUPLICATE KEY UPDATE
    description = VALUES(description),
    module_code = VALUES(module_code),
    allowed_scopes = VALUES(allowed_scopes);

UPDATE permission SET module_code = 'SCHEDULE_MANAGEMENT'
WHERE code IN ('schedule.view', 'schedule.create', 'schedule.edit', 'schedule.update',
               'schedule.cancel_session', 'schedule.delete');

UPDATE permission SET module_code = 'FACILITY_MANAGEMENT'
WHERE code IN ('facility.view', 'facility.manage',
               'facility.room.view', 'facility.room.create', 'facility.room.update',
               'facility.room.delete', 'facility.equipment.view', 'facility.equipment.create',
               'facility.equipment.update', 'facility.equipment.delete',
               'facility.issue.report', 'facility.issue.resolve');

-- ---------------------------------------------------------------------------
-- 2. Bổ sung mã mới vào bundle tương ứng.
-- ---------------------------------------------------------------------------
INSERT INTO permission_bundle_item(bundle_id, permission_code)
SELECT b.id, m.code
FROM permission_bundle b
JOIN (
    SELECT 'schedule.update' AS code
    UNION ALL SELECT 'schedule.cancel_session'
) m ON 1 = 1
WHERE b.code = 'SCHEDULE_MANAGEMENT'
ON DUPLICATE KEY UPDATE permission_code = VALUES(permission_code);

INSERT INTO permission_bundle_item(bundle_id, permission_code)
SELECT b.id, m.code
FROM permission_bundle b
JOIN (
    SELECT 'facility.room.view' AS code
    UNION ALL SELECT 'facility.room.create'
    UNION ALL SELECT 'facility.room.update'
    UNION ALL SELECT 'facility.room.delete'
    UNION ALL SELECT 'facility.equipment.view'
    UNION ALL SELECT 'facility.equipment.create'
    UNION ALL SELECT 'facility.equipment.update'
    UNION ALL SELECT 'facility.equipment.delete'
    UNION ALL SELECT 'facility.issue.report'
    UNION ALL SELECT 'facility.issue.resolve'
) m ON 1 = 1
WHERE b.code = 'FACILITY_MANAGEMENT'
ON DUPLICATE KEY UPDATE permission_code = VALUES(permission_code);

-- ---------------------------------------------------------------------------
-- 3. Role hệ thống. Các role nghiệp vụ nhận quyền qua chức danh/bundle.
-- ---------------------------------------------------------------------------
INSERT INTO role_permission(role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN (
    'schedule.update', 'schedule.cancel_session',
    'facility.room.view', 'facility.room.create', 'facility.room.update', 'facility.room.delete',
    'facility.equipment.view', 'facility.equipment.create', 'facility.equipment.update',
    'facility.equipment.delete', 'facility.issue.report', 'facility.issue.resolve')
WHERE r.code IN ('OWNER', 'ORG_OWNER', 'SUPER_ADMIN')
ON DUPLICATE KEY UPDATE permission_id = VALUES(permission_id);

-- Verification queries (run manually):
-- SELECT code, module_code, allowed_scopes FROM permission
--   WHERE code LIKE 'schedule.%' OR code LIKE 'facility.%' ORDER BY code;
-- SELECT b.code, i.permission_code FROM permission_bundle b
--   JOIN permission_bundle_item i ON i.bundle_id=b.id
--   WHERE b.code IN ('SCHEDULE_MANAGEMENT','FACILITY_MANAGEMENT') ORDER BY b.code, i.permission_code;
