-- Additive migration: nhóm chức năng của phòng ban, dùng để suy Gói chuẩn / Gói doanh nghiệp.
-- Chạy trên mems_people_db SAU KHI bảng department tồn tại.
-- Lưu ý: 07_people_department_access.sql hiện lỗi DDL; file này KHÔNG sửa file 07 và
--        cũng chưa được chạy. Phải sửa/chạy 07 ở đợt khác trước khi dùng file này.
-- Dữ liệu cũ mặc định OTHER: phòng ban chưa gán nhóm được coi là "khác" -> Gói doanh nghiệp.
USE mems_people_db;
DELIMITER $
DROP PROCEDURE IF EXISTS mems_people_department_functional_group_migration$
CREATE PROCEDURE mems_people_department_functional_group_migration()
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema=DATABASE() AND table_name='department' AND column_name='functional_group'
 ) THEN
  ALTER TABLE department
   ADD COLUMN functional_group ENUM('STUDENT','EQUIPMENT','ACADEMIC','OTHER')
   NOT NULL DEFAULT 'OTHER' COMMENT 'Nhóm chức năng phục vụ phân gói';
 END IF;
END$
CALL mems_people_department_functional_group_migration()$
DROP PROCEDURE mems_people_department_functional_group_migration$
DELIMITER ;
