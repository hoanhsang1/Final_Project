-- MEMS / People Service / Phần 2: xoá mềm chức danh
-- Target DB: mems_people_db (MySQL 8.0.16+)
--
-- Prerequisites: 13_people_sprint4.sql, 17_people_permission_foundation.sql.
-- Safe to run repeatedly. Chỉ thêm cột; KHÔNG xoá dữ liệu.
--
-- Lý do: bảng assignment giữ lịch sử bổ nhiệm (FK tới position, không cascade),
-- nên không thể xoá cứng chức danh đã từng được gán. Xoá chức danh = đánh dấu
-- deleted_at; danh sách/chi tiết bỏ qua các dòng đã đánh dấu.
--
-- How to run:
--   mysql -h <host> -P <port> -u <user> -p < 19_people_position_soft_delete.sql

USE mems_people_db;

DELIMITER $
DROP PROCEDURE IF EXISTS mems_pf_add_position_deleted_at$
CREATE PROCEDURE mems_pf_add_position_deleted_at()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'position'
          AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE `position` ADD COLUMN deleted_at DATETIME(3) NULL;
    END IF;
END$
CALL mems_pf_add_position_deleted_at()$
DROP PROCEDURE IF EXISTS mems_pf_add_position_deleted_at$
DELIMITER ;

-- Verification query (run manually):
-- SELECT id, name, deleted_at FROM `position` ORDER BY name;
