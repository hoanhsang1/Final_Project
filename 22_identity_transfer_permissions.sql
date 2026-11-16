-- MEMS / Identity Service / Phần 4: quyền chuyển phòng ban
-- Target DB: mems_identity_db (MySQL 8.0.16+)
--
-- Prerequisites: 01_identity_db.sql, 05_seed_admin.sql, 16_identity_permission_foundation.sql,
--                20_identity_employee_workflows.sql.
-- Safe to run repeatedly: INSERT ... ON DUPLICATE KEY UPDATE; không xoá dữ liệu.
--
-- How to run:
--   mysql -h <host> -P <port> -u <user> -p < 22_identity_transfer_permissions.sql

USE mems_identity_db;

-- ---------------------------------------------------------------------------
-- 1. Hai quyền mới cho Phần 4.
--    - employee.transfer: khởi tạo yêu cầu chuyển phòng ban.
--    - employee.approve_transfer: duyệt bước HR trong luồng chuyển phòng.
--    module_code = NULL: quyền nhân sự dùng chung cho mọi phòng ban (quy tắc 9).
-- ---------------------------------------------------------------------------
INSERT INTO permission(code, description, module_code, allowed_scopes) VALUES
('employee.transfer', 'Initiate department transfer requests', NULL, 'ORGANIZATION,DEPARTMENT'),
('employee.approve_transfer', 'Approve the HR step of department transfer requests', NULL,
 'ORGANIZATION,DEPARTMENT')
ON DUPLICATE KEY UPDATE
    description = VALUES(description),
    module_code = VALUES(module_code),
    allowed_scopes = VALUES(allowed_scopes);

-- ---------------------------------------------------------------------------
-- 2. Bổ sung vào bundle HR_MANAGEMENT để chức danh HR nhận quyền mới ngay.
-- ---------------------------------------------------------------------------
INSERT INTO permission_bundle_item(bundle_id, permission_code)
SELECT b.id, m.code
FROM permission_bundle b
JOIN (
    SELECT 'employee.transfer' AS code
    UNION ALL SELECT 'employee.approve_transfer'
) m ON 1 = 1
WHERE b.code = 'HR_MANAGEMENT'
ON DUPLICATE KEY UPDATE permission_code = VALUES(permission_code);

-- ---------------------------------------------------------------------------
-- 3. Role hệ thống luôn có toàn bộ catalog mới (OWNER còn bypass ở tầng code).
-- ---------------------------------------------------------------------------
INSERT INTO role_permission(role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN ('employee.transfer', 'employee.approve_transfer')
WHERE r.code IN ('OWNER', 'ORG_OWNER', 'SUPER_ADMIN')
ON DUPLICATE KEY UPDATE permission_id = VALUES(permission_id);

-- Verification queries (run manually):
-- SELECT code, module_code, allowed_scopes FROM permission
--   WHERE code IN ('employee.transfer','employee.approve_transfer');
