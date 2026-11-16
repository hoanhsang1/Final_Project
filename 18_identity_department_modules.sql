-- MEMS / Identity Service / Phần 2: module phòng ban cho quyền lịch học & cơ sở vật chất
-- Target DB: mems_identity_db (MySQL 8.0.16+)
--
-- Prerequisites: 01_identity_db.sql, 05_seed_admin.sql, 16_identity_permission_foundation.sql.
-- Safe to run repeatedly. Chỉ thêm module và cập nhật module_code của quyền;
-- KHÔNG xoá dữ liệu, KHÔNG tự bật module cho tổ chức nào.
--
-- How to run:
--   mysql -h <host> -P <port> -u <user> -p < 18_identity_department_modules.sql

USE mems_identity_db;

-- 1. Bổ sung module "Cơ sở vật chất" vào danh mục module hệ thống.
INSERT INTO module (code, name, is_active)
VALUES ('FACILITY_MANAGEMENT', 'Quản lý cơ sở vật chất', TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 2. Gắn quyền lịch học / cơ sở vật chất vào module tương ứng để phòng ban
--    chỉ dùng được khi module đó thuộc phòng (và tổ chức đang bật).
UPDATE permission SET module_code = 'SCHEDULE_MANAGEMENT'
WHERE code IN ('schedule.view', 'schedule.create', 'schedule.edit', 'schedule.delete');

UPDATE permission SET module_code = 'FACILITY_MANAGEMENT'
WHERE code IN ('facility.view', 'facility.manage');

-- Quyền nhân sự (employee.*, position.*, department.*) giữ module_code = NULL:
-- bundle HR_MANAGEMENT gán được cho chức danh của mọi phòng ban (quy tắc 9).

-- Verification queries (run manually):
-- SELECT code, module_code FROM permission
--   WHERE code LIKE 'schedule.%' OR code LIKE 'facility.%' ORDER BY code;
-- SELECT code, name, is_active FROM module ORDER BY code;
