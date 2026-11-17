-- MEMS / migration 42 — quản lý môn học (Subject CRUD)
--
-- 1) People: bổ sung cột còn thiếu trên bảng `subject` để hỗ trợ mã môn, mô tả và
--    thời điểm cập nhật. Cột mới đều NULL-able nên dữ liệu cũ không bị đổi giá trị.
-- 2) People: backfill quyền môn học cho chức vụ đã có quyền lớp học tương ứng.
-- 3) Identity: đăng ký permission subject.view / subject.manage + gắn vào bundle
--    ACADEMIC_MANAGEMENT và role OWNER/ORG_OWNER/SUPER_ADMIN.
--
-- Idempotent, additive. Không xoá bảng/cột/dữ liệu.
USE mems_people_db;

DELIMITER $

DROP PROCEDURE IF EXISTS mems_m42_add_col$
CREATE PROCEDURE mems_m42_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64),
                                  IN p_ddl VARCHAR(500))
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = DATABASE() AND table_name = p_table)
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = DATABASE() AND table_name = p_table
                         AND column_name = p_col) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_col, '` ', p_ddl);
        PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
END$

DROP PROCEDURE IF EXISTS mems_m42_add_index$
CREATE PROCEDURE mems_m42_add_index(IN p_table VARCHAR(64), IN p_index VARCHAR(64),
                                    IN p_cols VARCHAR(255))
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = DATABASE() AND table_name = p_table)
       AND NOT EXISTS (SELECT 1 FROM information_schema.statistics
                       WHERE table_schema = DATABASE() AND table_name = p_table
                         AND index_name = p_index) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD INDEX `', p_index, '` (', p_cols, ')');
        PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
END$

DELIMITER ;

CALL mems_m42_add_col('subject', 'code', 'VARCHAR(50) DEFAULT NULL');
CALL mems_m42_add_col('subject', 'description', 'VARCHAR(500) DEFAULT NULL');
CALL mems_m42_add_col('subject', 'updated_by', 'CHAR(36) DEFAULT NULL');
CALL mems_m42_add_col('subject', 'updated_at', 'DATETIME(3) DEFAULT NULL');
CALL mems_m42_add_index('subject', 'uq_subject_org_code', '`org_id`, `code`');
CALL mems_m42_add_index('subject', 'idx_subject_org_active', '`org_id`, `is_active`');

DROP PROCEDURE IF EXISTS mems_m42_add_col;
DROP PROCEDURE IF EXISTS mems_m42_add_index;

-- Backfill: chức vụ tổ chức đã được xem lớp thì được xem môn học; chức vụ đã được
-- tạo lớp thì được quản lý môn học. Chỉ áp dụng cho chức vụ phạm vi ORGANIZATION và
-- chỉ thêm khi chưa có — không đụng chức vụ tự tạo có cấu hình khác.
INSERT INTO position_permission(position_id, permission_code)
SELECT p.id, 'subject.view'
FROM `position` p
WHERE p.scope = 'ORGANIZATION'
  AND EXISTS (SELECT 1 FROM position_permission x
              WHERE x.position_id = p.id AND x.permission_code = 'class.view')
  AND NOT EXISTS (SELECT 1 FROM position_permission y
                  WHERE y.position_id = p.id AND y.permission_code = 'subject.view');

INSERT INTO position_permission(position_id, permission_code)
SELECT p.id, 'subject.manage'
FROM `position` p
WHERE p.scope = 'ORGANIZATION'
  AND EXISTS (SELECT 1 FROM position_permission x
              WHERE x.position_id = p.id AND x.permission_code = 'class.create')
  AND NOT EXISTS (SELECT 1 FROM position_permission y
                  WHERE y.position_id = p.id AND y.permission_code = 'subject.manage');

USE mems_identity_db;

INSERT INTO permission(code, description, module_code, allowed_scopes)
VALUES ('subject.view', 'View subjects', 'STUDENT_MANAGEMENT', 'ORGANIZATION'),
       ('subject.manage', 'Create, update and activate/deactivate subjects',
        'STUDENT_MANAGEMENT', 'ORGANIZATION')
ON DUPLICATE KEY UPDATE
    description = VALUES(description),
    module_code = VALUES(module_code),
    allowed_scopes = VALUES(allowed_scopes);

INSERT INTO permission_bundle_item(bundle_id, permission_code)
SELECT b.id, x.code
FROM permission_bundle b
JOIN (SELECT 'subject.view' AS code UNION ALL SELECT 'subject.manage') x
WHERE b.code = 'ACADEMIC_MANAGEMENT'
ON DUPLICATE KEY UPDATE permission_code = VALUES(permission_code);

INSERT INTO role_permission(role_id, permission_id)
SELECT r.id, p.id
FROM role r JOIN permission p
  ON p.code IN ('subject.view', 'subject.manage')
WHERE r.code IN ('OWNER', 'ORG_OWNER', 'SUPER_ADMIN')
ON DUPLICATE KEY UPDATE permission_id = VALUES(permission_id);

-- Verification:
-- USE mems_people_db;
-- SHOW COLUMNS FROM subject;
-- SHOW INDEX FROM subject;
-- SELECT p.name, pp.permission_code FROM position_permission pp
--   JOIN `position` p ON p.id = pp.position_id
--  WHERE pp.permission_code IN ('subject.view','subject.manage');
-- USE mems_identity_db;
-- SELECT code, module_code, allowed_scopes FROM permission
--  WHERE code IN ('subject.view','subject.manage');
-- SELECT b.code, i.permission_code FROM permission_bundle_item i
--   JOIN permission_bundle b ON b.id = i.bundle_id
--  WHERE b.code = 'ACADEMIC_MANAGEMENT' AND i.permission_code LIKE 'subject.%';
