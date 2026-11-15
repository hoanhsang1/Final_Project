-- MEMS / Identity Service / Phần 3: quyền chi tiết nhân sự & nghỉ việc
-- Target DB: mems_identity_db (MySQL 8.0.16+)
--
-- Prerequisites: 01_identity_db.sql, 05_seed_admin.sql, 16_identity_permission_foundation.sql,
--                18_identity_department_modules.sql.
-- Safe to run repeatedly: INSERT ... ON DUPLICATE KEY UPDATE; không xoá dữ liệu.
--
-- How to run:
--   mysql -h <host> -P <port> -u <user> -p < 20_identity_employee_workflows.sql

USE mems_identity_db;

-- ---------------------------------------------------------------------------
-- 1. Ba quyền mới cho Phần 3.
--    - employee.view_detail: xem trường nhạy cảm (email, số điện thoại).
--    - employee.resign: tạo yêu cầu nghỉ việc cho nhân viên trong phạm vi.
--    - employee.approve_resignation: duyệt/từ chối yêu cầu nghỉ việc.
--    module_code = NULL: quyền nhân sự dùng chung cho mọi phòng ban (quy tắc 9).
-- ---------------------------------------------------------------------------
INSERT INTO permission(code, description, module_code, allowed_scopes) VALUES
('employee.view_detail', 'View sensitive employee details', NULL, 'ORGANIZATION,DEPARTMENT'),
('employee.resign', 'Request employee resignation', NULL, 'ORGANIZATION,DEPARTMENT'),
('employee.approve_resignation', 'Approve or reject resignation requests', NULL, 'ORGANIZATION,DEPARTMENT')
ON DUPLICATE KEY UPDATE
    description = VALUES(description),
    module_code = VALUES(module_code),
    allowed_scopes = VALUES(allowed_scopes);

-- ---------------------------------------------------------------------------
-- 2. Bổ sung vào bundle HR_MANAGEMENT để chức danh HR đang dùng bundle có ngay
--    quyền mới mà không phải sửa từng chức danh.
-- ---------------------------------------------------------------------------
INSERT INTO permission_bundle_item(bundle_id, permission_code)
SELECT b.id, m.code
FROM permission_bundle b
JOIN (
    SELECT 'employee.view_detail' AS code
    UNION ALL SELECT 'employee.resign'
    UNION ALL SELECT 'employee.approve_resignation'
) m ON 1 = 1
WHERE b.code = 'HR_MANAGEMENT'
ON DUPLICATE KEY UPDATE permission_code = VALUES(permission_code);

-- ---------------------------------------------------------------------------
-- 3. Role hệ thống luôn có toàn bộ catalog mới (OWNER còn bypass ở tầng code).
-- ---------------------------------------------------------------------------
INSERT INTO role_permission(role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN (
    'employee.view_detail', 'employee.resign', 'employee.approve_resignation'
)
WHERE r.code IN ('OWNER', 'ORG_OWNER', 'SUPER_ADMIN')
ON DUPLICATE KEY UPDATE permission_id = VALUES(permission_id);

-- Verification queries (run manually):
-- SELECT code, module_code, allowed_scopes FROM permission
--   WHERE code IN ('employee.view_detail','employee.resign','employee.approve_resignation');
-- SELECT b.code, COUNT(i.permission_code) FROM permission_bundle b
--   LEFT JOIN permission_bundle_item i ON i.bundle_id=b.id
--   WHERE b.code='HR_MANAGEMENT' GROUP BY b.code;
