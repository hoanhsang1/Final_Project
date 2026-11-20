-- MEMS / People Service / migration 47 — RBAC-02
-- Chính sách duyệt (trưởng phòng / tổng quản lý) trước đây khớp theo TÊN chức danh,
-- nên đổi tên hiển thị là mất quyền duyệt. Thêm mã hệ thống để ổn định.
--
-- Idempotent, additive, không xoá/đổi tên dòng nào. Query vẫn chấp nhận tên cũ
-- làm fallback cho dữ liệu chưa backfill kịp.
USE mems_people_db;

DELIMITER $

DROP PROCEDURE IF EXISTS mems_m47_add_col$
CREATE PROCEDURE mems_m47_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64),
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

CALL mems_m47_add_col('position', 'system_code', 'VARCHAR(50) NULL')$
DROP PROCEDURE mems_m47_add_col$

DELIMITER ;

-- Backfill các chức danh mặc định đã tồn tại. Chỉ điền khi còn trống.
UPDATE `position`
SET system_code = 'DEPT_HEAD'
WHERE system_code IS NULL
  AND scope = 'DEPARTMENT'
  AND name IN ('Trưởng phòng', 'Trưởng phòng ban')
  AND deleted_at IS NULL;

UPDATE `position`
SET system_code = 'GENERAL_MANAGER'
WHERE system_code IS NULL
  AND scope = 'ORGANIZATION'
  AND name = 'Tổng quản lý'
  AND deleted_at IS NULL;

-- Verification:
-- SELECT system_code, COUNT(*) FROM `position` WHERE deleted_at IS NULL GROUP BY system_code;
